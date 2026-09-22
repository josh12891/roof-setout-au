import { describe, expect, it } from "vitest";
import {
  billingFootnote,
  createUnlockBilling,
  isAlreadyOwnedPurchase,
  isUserCancelledPurchase,
  purchasesGrantUnlock,
  shouldUseLocalUnlockStub,
  transactionGrantsUnlock,
  type NativeBillingClient,
} from "./billing.ts";
import {
  UNLOCK_PRICE_LABEL,
  UNLOCK_PRODUCT_ID,
  UNLOCK_STORAGE_KEY,
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
    expect(await billing.getPriceLabel()).toBe(UNLOCK_PRICE_LABEL);
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

  it("uses the store price string when the product is listed", async () => {
    const billing = createUnlockBilling({
      client: fakeClient({
        getProduct: async () => ({ product: { priceString: "A$9.99" } }),
      }),
      platform: { isNative: true, isDev: false, name: "android" },
      storage: memoryStorage(),
    });
    expect(await billing.getPriceLabel()).toBe("A$9.99");
    expect(billingFootnote("store", "android")).toMatch(/Google Play/i);
    expect(billingFootnote("store", "ios")).toMatch(/App Store/i);
  });
});
