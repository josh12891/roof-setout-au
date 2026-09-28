import { describe, expect, it } from "vitest";
import {
  billingFootnote,
  createUnlockBilling,
  isAlreadyOwnedPurchase,
  isUserCancelledPurchase,
  paywallPriceLabel,
  purchasesGrantUnlock,
  shouldUseLocalUnlockStub,
  transactionGrantsUnlock,
  type NativeBillingClient,
} from "./billing.ts";
import {
  ANNUAL_BASE_PLAN_ID,
  ANNUAL_PRICE_LABEL,
  ANNUAL_PRODUCT_ID,
  UNLOCK_PRICE_LABEL,
  UNLOCK_PRODUCT_ID,
  UNLOCK_STORAGE_KEY,
  writeUnlockedFlag,
  type UnlockStorage,
} from "./unlock.ts";

function memoryStorage(initial: Record<string, string> = {}): UnlockStorage {
  const data = { ...initial };
  return {
    getItem: (key) => (key in data ? data[key] : null),
    setItem: (key, value) => {
      data[key] = value;
    },
    removeItem: (key) => {
      delete data[key];
    },
  };
}

function fakeClient(overrides: Partial<NativeBillingClient> = {}): NativeBillingClient {
  return {
    isBillingSupported: async () => ({ isBillingSupported: true }),
    getProduct: async () => ({ product: { priceString: "$9.99" } }),
    purchaseProduct: async () => ({
      productIdentifier: UNLOCK_PRODUCT_ID,
      purchaseState: "1",
    }),
    restorePurchases: async () => undefined,
    getPurchases: async () => ({ purchases: [] }),
    ...overrides,
  };
}

describe("transaction entitlement", () => {
  it("accepts a Play Billing purchased state for the set-out product", () => {
    expect(
      transactionGrantsUnlock({
        productIdentifier: UNLOCK_PRODUCT_ID,
        purchaseState: "1",
      }),
    ).toBe(true);
    expect(
      transactionGrantsUnlock({
        productIdentifier: UNLOCK_PRODUCT_ID,
        purchaseState: "PURCHASED",
      }),
    ).toBe(true);
  });

  it("rejects pending, refunded, or other product ids", () => {
    expect(
      transactionGrantsUnlock({
        productIdentifier: UNLOCK_PRODUCT_ID,
        purchaseState: "0",
      }),
    ).toBe(false);
    expect(
      transactionGrantsUnlock({
        productIdentifier: UNLOCK_PRODUCT_ID,
        revocationDate: "2026-09-16T00:00:00.000Z",
      }),
    ).toBe(false);
    expect(
      transactionGrantsUnlock({
        productIdentifier: "something_else",
        purchaseState: "1",
      }),
    ).toBe(false);
    expect(
      transactionGrantsUnlock({
        productIdentifier: ANNUAL_PRODUCT_ID,
        purchaseState: "PURCHASED",
        isActive: true,
      }),
    ).toBe(true);
    expect(
      transactionGrantsUnlock({
        productIdentifier: ANNUAL_PRODUCT_ID,
        purchaseState: "PURCHASED",
        isActive: false,
      }),
    ).toBe(false);
    expect(
      transactionGrantsUnlock({
        productIdentifier: ANNUAL_PRODUCT_ID,
        purchaseState: "1",
        expirationDate: "2000-01-01T00:00:00.000Z",
      }),
    ).toBe(false);
    expect(
      purchasesGrantUnlock([
        { productIdentifier: UNLOCK_PRODUCT_ID, purchaseState: "1" },
      ]),
    ).toBe(true);
  });

  it("detects cancel and already-owned billing errors", () => {
    expect(isUserCancelledPurchase({ code: "USER_CANCELLED" })).toBe(true);
    expect(isUserCancelledPurchase({ message: "User cancelled the purchase" })).toBe(
      true,
    );
    expect(isAlreadyOwnedPurchase({ code: "ITEM_ALREADY_OWNED" })).toBe(true);
    expect(isAlreadyOwnedPurchase({ message: "item already owned" })).toBe(true);
  });
});

describe("stub vs store selection", () => {
  it("uses the local stub on web", () => {
    expect(
      shouldUseLocalUnlockStub({ isNative: false, isDev: false, name: "web" }, false),
    ).toBe(true);
  });

  it("uses store billing on native when Play/StoreKit is available", () => {
    expect(
      shouldUseLocalUnlockStub({ isNative: true, isDev: false, name: "android" }, true),
    ).toBe(false);
  });

  it("falls back to the stub on native only in dev when billing is missing", () => {
    expect(
      shouldUseLocalUnlockStub({ isNative: true, isDev: true, name: "android" }, false),
    ).toBe(true);
    expect(
      shouldUseLocalUnlockStub({ isNative: true, isDev: false, name: "android" }, false),
    ).toBe(false);
  });
});

describe("unlock billing adapter", () => {
  it("purchases and restores through the local stub on web", async () => {
    const storage = memoryStorage();
    const billing = createUnlockBilling({
      client: fakeClient(),
      platform: { isNative: false, isDev: true, name: "web" },
      storage,
    });

    expect(await billing.resolveKind()).toBe("stub");
    expect(await billing.getPriceLabels()).toEqual({
      lifetime: UNLOCK_PRICE_LABEL,
      annual: ANNUAL_PRICE_LABEL,
    });
    expect(billingFootnote("stub", "web")).toMatch(/not billed/i);

    const purchased = await billing.purchase();
    expect(purchased.unlocked).toBe(true);
    expect(storage.getItem(UNLOCK_STORAGE_KEY)).toBe("1");
    expect(purchased.message).toMatch(/stub/i);

    const restored = await billing.restore();
    expect(restored).toEqual({
      unlocked: true,
      message: "Unlock restored on this device.",
    });
  });

  it("purchases the Android/iOS product id through the native client", async () => {
    const storage = memoryStorage();
    let purchasedId = "";
    const billing = createUnlockBilling({
      client: fakeClient({
        purchaseProduct: async (options) => {
          purchasedId = options.productIdentifier;
          expect(options.productType).toBe("inapp");
          expect(options.isConsumable).toBe(false);
          return {
            productIdentifier: options.productIdentifier,
            purchaseState: "1",
          };
        },
      }),
      platform: { isNative: true, isDev: false, name: "android" },
      storage,
    });

    expect(await billing.resolveKind()).toBe("store");
    const result = await billing.purchase();
    expect(purchasedId).toBe(UNLOCK_PRODUCT_ID);
    expect(result).toEqual({ unlocked: true, message: "Pro set-out unlocked." });
    expect(storage.getItem(UNLOCK_STORAGE_KEY)).toBe("1");
  });

  it("restores Android purchases from Play Billing history", async () => {
    const storage = memoryStorage();
    let restored = false;
    const billing = createUnlockBilling({
      client: fakeClient({
        restorePurchases: async () => {
          restored = true;
        },
        getPurchases: async () => ({
          purchases: [
            { productIdentifier: UNLOCK_PRODUCT_ID, purchaseState: "1" },
          ],
        }),
      }),
      platform: { isNative: true, isDev: false, name: "android" },
      storage,
    });

    const result = await billing.restore();
    expect(restored).toBe(true);
    expect(result).toEqual({
      unlocked: true,
      message: "Unlock restored from your store account.",
    });
  });

  it("reports no store purchase without clearing an offline cache on query failure", async () => {
    const storage = memoryStorage({ [UNLOCK_STORAGE_KEY]: "1" });
    const billing = createUnlockBilling({
      client: fakeClient({
        getPurchases: async () => {
          throw new Error("Network");
        },
      }),
      platform: { isNative: true, isDev: false, name: "android" },
      storage,
    });

    const refresh = await billing.refreshFromStore();
    expect(refresh).toEqual({ unlocked: true, queried: false });
    expect(storage.getItem(UNLOCK_STORAGE_KEY)).toBe("1");
  });

  it("locks again when the store query succeeds and the product is gone", async () => {
    const storage = memoryStorage({ [UNLOCK_STORAGE_KEY]: "1" });
    const billing = createUnlockBilling({
      client: fakeClient({
        getPurchases: async () => ({ purchases: [] }),
      }),
      platform: { isNative: true, isDev: false, name: "ios" },
      storage,
    });

    const refresh = await billing.refreshFromStore();
    expect(refresh).toEqual({ unlocked: false, queried: true });
    expect(storage.getItem(UNLOCK_STORAGE_KEY)).toBeNull();
  });

  it("swallows user-cancelled purchases and restores when already owned", async () => {
    const storage = memoryStorage();
    const cancelled = createUnlockBilling({
      client: fakeClient({
        purchaseProduct: async () => {
          throw { code: "USER_CANCELLED", message: "User cancelled" };
        },
      }),
      platform: { isNative: true, isDev: false, name: "android" },
      storage,
    });
    const cancelResult = await cancelled.purchase();
    expect(cancelResult.cancelled).toBe(true);
    expect(cancelResult.unlocked).toBe(false);

    const owned = createUnlockBilling({
      client: fakeClient({
        purchaseProduct: async () => {
          throw { code: "ITEM_ALREADY_OWNED" };
        },
        getPurchases: async () => ({
          purchases: [{ productIdentifier: UNLOCK_PRODUCT_ID, purchaseState: "1" }],
        }),
      }),
      platform: { isNative: true, isDev: false, name: "android" },
      storage,
    });
    const ownedResult = await owned.purchase();
    expect(ownedResult.unlocked).toBe(true);
    expect(ownedResult.message).toMatch(/restored/i);
  });

  it("keeps the store price string when it is the locked AUD amount", async () => {
    const billing = createUnlockBilling({
      client: fakeClient({
        getProduct: async (options) => ({
          product: {
            priceString:
              options.productIdentifier === ANNUAL_PRODUCT_ID ? "A$14.99" : "A$39.99",
          },
        }),
      }),
      platform: { isNative: true, isDev: false, name: "android" },
      storage: memoryStorage(),
    });
    expect(await billing.getPriceLabels()).toEqual({
      lifetime: "A$39.99",
      annual: "A$14.99",
    });
    expect(billingFootnote("store", "android")).toMatch(/Google Play/i);
    expect(billingFootnote("store", "ios")).toMatch(/App Store/i);
    expect(billingFootnote("store", "android")).toMatch(/annual/i);
  });

  it("uses catalog AUD labels when the store price is missing or a non-AUD fallback", async () => {
    expect(paywallPriceLabel("annual", "$9.99")).toBe(ANNUAL_PRICE_LABEL);
    expect(paywallPriceLabel("lifetime", "$24.99")).toBe(UNLOCK_PRICE_LABEL);
    expect(paywallPriceLabel("annual", "  ")).toBe(ANNUAL_PRICE_LABEL);
    expect(paywallPriceLabel("annual", null)).toBe(ANNUAL_PRICE_LABEL);
    expect(paywallPriceLabel("annual", "$14.99 USD")).toBe(ANNUAL_PRICE_LABEL);
    expect(paywallPriceLabel("lifetime", "CA$39.99")).toBe(UNLOCK_PRICE_LABEL);
    expect(paywallPriceLabel("annual", "$14.99")).toBe("$14.99");
    expect(paywallPriceLabel("annual", "A$14.99")).toBe("A$14.99");
    expect(paywallPriceLabel("lifetime", "$39.99")).toBe("$39.99");

    const billing = createUnlockBilling({
      client: fakeClient({
        getProduct: async (options) => ({
          product: {
            priceString:
              options.productIdentifier === ANNUAL_PRODUCT_ID ? "$9.99" : "$24.99",
          },
        }),
      }),
      platform: { isNative: true, isDev: false, name: "ios" },
      storage: memoryStorage(),
    });
    expect(await billing.getPriceLabels()).toEqual({
      lifetime: UNLOCK_PRICE_LABEL,
      annual: ANNUAL_PRICE_LABEL,
    });
  });

  it("purchases the annual subscription and restores either product", async () => {
    const storage = memoryStorage();
    let purchased: { id: string; type: string; plan?: string } | null = null;
    const billing = createUnlockBilling({
      client: fakeClient({
        purchaseProduct: async (options) => {
          purchased = {
            id: options.productIdentifier,
            type: options.productType,
            plan: options.planIdentifier,
          };
          return {
            productIdentifier: options.productIdentifier,
            purchaseState: "1",
            isActive: true,
          };
        },
        getPurchases: async (options) => {
          if (options.productType === "subs") {
            return {
              purchases: [
                {
                  productIdentifier: ANNUAL_PRODUCT_ID,
                  purchaseState: "1",
                  isActive: true,
                },
              ],
            };
          }
          return { purchases: [] };
        },
      }),
      platform: { isNative: true, isDev: false, name: "ios" },
      storage,
    });

    const result = await billing.purchase("annual");
    expect(purchased).toEqual({
      id: ANNUAL_PRODUCT_ID,
      type: "subs",
      plan: ANNUAL_BASE_PLAN_ID,
    });
    expect(result).toEqual({ unlocked: true, message: "Pro set-out unlocked." });

    writeUnlockedFlag(false, storage);
    const restored = await billing.restore();
    expect(restored.unlocked).toBe(true);
    expect(restored.message).toMatch(/restored/i);
  });
});
