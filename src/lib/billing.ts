import { Capacitor } from "@capacitor/core";
import { NativePurchases, PURCHASE_TYPE } from "@capgo/native-purchases";
import {
  ANNUAL_PRODUCT_ID,
  PRO_PLANS,
  PRO_PRODUCT_IDS,
  readUnlockedFlag,
  restoreUnlockFlag,
  writeUnlockedFlag,
  type ProPlan,
  type UnlockStorage,
} from "./unlock";

export type BillingKind = "store" | "stub";

export type BillingTransaction = {
  productIdentifier?: string;
  purchaseState?: string;
  revocationDate?: string | null;
  expirationDate?: string | null;
  isActive?: boolean;
};

export type BillingProduct = {
  priceString?: string;
  title?: string;
};

export type NativeBillingClient = {
  isBillingSupported: () => Promise<{ isBillingSupported: boolean }>;
  getProduct: (options: {
    productIdentifier: string;
    productType: string;
  }) => Promise<{ product: BillingProduct }>;
  purchaseProduct: (options: {
    productIdentifier: string;
    productType: string;
    isConsumable: boolean;
    planIdentifier?: string;
  }) => Promise<BillingTransaction>;
  restorePurchases: () => Promise<void>;
  getPurchases: (options: {
    productType: string;
  }) => Promise<{ purchases: BillingTransaction[] }>;
};

export type BillingPlatform = {
  isNative: boolean;
  isDev: boolean;
  name: string;
};

export type BillingActionResult = {
  unlocked: boolean;
  message: string;
  cancelled?: boolean;
};

export type PriceLabels = Record<ProPlan, string>;

const PURCHASE_QUERY_TYPES = ["inapp", "subs"] as const;

function errorCode(error: unknown): string {
  if (error && typeof error === "object" && "code" in error) {
    const code = (error as { code?: unknown }).code;
    if (typeof code === "string") return code;
    if (typeof code === "number") return String(code);
  }
  return "";
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string") return message;
  }
  return String(error);
}

export function isUserCancelledPurchase(error: unknown): boolean {
  const code = errorCode(error).toUpperCase().replace(/-/g, "_");
  const message = errorMessage(error).toLowerCase();
  return (
    code === "USER_CANCELLED" ||
    code === "USER_CANCELED" ||
    message.includes("user cancelled") ||
    message.includes("user canceled") ||
    message.includes("cancelled by the user") ||
    message.includes("canceled by the user")
  );
}

export function isAlreadyOwnedPurchase(error: unknown): boolean {
  const code = errorCode(error).toUpperCase().replace(/-/g, "_");
  const message = errorMessage(error).toLowerCase();
  return (
    code === "ITEM_ALREADY_OWNED" ||
    code === "PRODUCT_ALREADY_PURCHASED" ||
    message.includes("already owned") ||
    message.includes("already purchased")
  );
}

function annualEntitlementActive(transaction: BillingTransaction): boolean {
  if (transaction.isActive === true) return true;
  if (transaction.isActive === false) return false;
  if (transaction.expirationDate) {
    const expires = Date.parse(transaction.expirationDate);
    if (Number.isFinite(expires)) return expires > Date.now();
  }
  // Android subscriptions are returned only while Play still entitles them.
  return true;
}

export function transactionGrantsUnlock(
  transaction: BillingTransaction,
  productIds: readonly string[] = PRO_PRODUCT_IDS,
): boolean {
  const productId = transaction.productIdentifier;
  if (!productId || !productIds.includes(productId)) return false;
  if (transaction.revocationDate) return false;
  if (productId === ANNUAL_PRODUCT_ID && !annualEntitlementActive(transaction)) return false;
  if (transaction.isActive === false) return false;
  const state = transaction.purchaseState;
  if (state == null || state === "") return true;
  const normalized = String(state).toUpperCase();
  return normalized === "1" || normalized === "PURCHASED";
}

export function purchasesGrantUnlock(
  purchases: BillingTransaction[],
  productIds: readonly string[] = PRO_PRODUCT_IDS,
): boolean {
  return purchases.some((purchase) => transactionGrantsUnlock(purchase, productIds));
}

export function shouldUseLocalUnlockStub(
  platform: BillingPlatform,
  billingSupported: boolean,
): boolean {
  if (!platform.isNative) return true;
  if (billingSupported) return false;
  return platform.isDev;
}

export function billingFootnote(kind: BillingKind, platformName: string): string {
  if (kind === "stub") {
    return "Web/debug: this unlock is a local flag and is not billed. Android and iOS store builds charge through Google Play or the App Store.";
  }
  if (platformName === "android") {
    return "Google Play bills the lifetime unlock or the annual subscription. Restore checks both on your Play account.";
  }
  if (platformName === "ios") {
    return "The App Store bills the lifetime unlock or the annual subscription. Restore checks both on your Apple ID.";
  }
  return "Purchases go through the App Store or Google Play.";
}

export function catalogPriceLabels(): PriceLabels {
  return {
    lifetime: PRO_PLANS.lifetime.priceLabel,
    annual: PRO_PLANS.annual.priceLabel,
  };
}

/**
 * Currencies other than the locked AUD catalog. A bare "$" is not enough:
 * Australian storefronts often format AUD as "$14.99".
 */
const NON_AUD_CURRENCY =
  /\b(?:USD|EUR|GBP|CAD|NZD|JPY|CNY|INR|SGD|HKD|CHF|KRW)\b|US\$|CA\$|C\$|NZ\$|HK\$|S\$|€|£|¥|₩/i;

function firstPriceAmount(priceString: string): number | null {
  const normalized = priceString.replace(/,(?=\d{3}(?:\D|$))/g, "");
  const match = normalized.match(/(\d+(?:\.\d+)?)/);
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isFinite(value) ? value : null;
}

/**
 * Label for a custom paywall button. The App Store / Play sheet stays
 * authoritative. The button keeps `priceString` only when that string is the
 * locked catalog AUD amount (`$14.99` annual, `$39.99` lifetime). A missing
 * string, another currency, or a non-AUD fallback such as "$9.99" / "$24.99"
 * uses `PRO_PLANS` (`$14.99 AUD/year`, `$39.99 AUD`).
 */
export function paywallPriceLabel(plan: ProPlan, priceString?: string | null): string {
  const catalog = PRO_PLANS[plan].priceLabel;
  const store = priceString?.trim() ?? "";
  if (!store || NON_AUD_CURRENCY.test(store)) return catalog;
  const amount = firstPriceAmount(store);
  if (amount == null) return catalog;
  if (Math.abs(amount - PRO_PLANS[plan].priceAud) >= 0.001) return catalog;
  return store;
}

function friendlyPurchaseMessage(error: unknown): string {
  const code = errorCode(error).toUpperCase().replace(/-/g, "_");
  const message = errorMessage(error).toLowerCase();
  if (code === "ITEM_UNAVAILABLE" || message.includes("unavailable")) {
    return "This unlock is not available yet. Confirm the product is active in Play Console or App Store Connect.";
  }
  if (code === "NETWORK_ERROR" || message.includes("network")) {
    return "Network error. Check your connection and try again.";
  }
  if (code === "BILLING_UNAVAILABLE" || message.includes("billing")) {
    return "Store billing is not available on this device.";
  }
  return "Purchase failed. Please try again.";
}

function toPurchaseType(productType: string) {
  return productType === "subs" ? PURCHASE_TYPE.SUBS : PURCHASE_TYPE.INAPP;
}

export function createCapgoBillingClient(): NativeBillingClient {
  return {
    isBillingSupported: () => NativePurchases.isBillingSupported(),
    getProduct: (options) =>
      NativePurchases.getProduct({
        productIdentifier: options.productIdentifier,
        productType: toPurchaseType(options.productType),
      }),
    purchaseProduct: (options) =>
      NativePurchases.purchaseProduct({
        productIdentifier: options.productIdentifier,
        productType: toPurchaseType(options.productType),
        isConsumable: options.isConsumable,
        planIdentifier: options.planIdentifier,
      }),
    restorePurchases: () => NativePurchases.restorePurchases(),
    getPurchases: (options) =>
      NativePurchases.getPurchases({
        productType: toPurchaseType(options.productType),
      }),
  };
}

export function detectBillingPlatform(): BillingPlatform {
  return {
    isNative: Capacitor.isNativePlatform(),
    isDev: import.meta.env.DEV,
    name: Capacitor.getPlatform(),
  };
}

export type UnlockBilling = {
  platformName: string;
  resolveKind: () => Promise<BillingKind>;
  getPriceLabels: () => Promise<PriceLabels>;
  refreshFromStore: () => Promise<{ unlocked: boolean; queried: boolean }>;
  purchase: (plan?: ProPlan) => Promise<BillingActionResult>;
  restore: () => Promise<BillingActionResult>;
};

export async function listenForUnlockTransactions(
  onOwned: () => void,
): Promise<() => void> {
  if (!Capacitor.isNativePlatform()) return () => {};
  try {
    const handle = await NativePurchases.addListener(
      "transactionUpdated",
      (transaction) => {
        if (transactionGrantsUnlock(transaction)) {
          writeUnlockedFlag(true);
          onOwned();
        }
      },
    );
    return () => {
      void handle.remove();
    };
  } catch {
    return () => {};
  }
}

export function createUnlockBilling(
  options: {
    client?: NativeBillingClient;
    platform?: BillingPlatform;
    storage?: UnlockStorage | null;
  } = {},
): UnlockBilling {
  const platform = options.platform ?? detectBillingPlatform();
  const client = options.client ?? createCapgoBillingClient();
  const storage = options.storage;
  let kindPromise: Promise<BillingKind> | undefined;

  async function storeSupported(): Promise<boolean> {
    if (!platform.isNative) return false;
    try {
      const { isBillingSupported } = await client.isBillingSupported();
      return Boolean(isBillingSupported);
    } catch {
      return false;
    }
  }

  function resolveKind(): Promise<BillingKind> {
    kindPromise ??= (async () => {
      const supported = await storeSupported();
      return shouldUseLocalUnlockStub(platform, supported) ? "stub" : "store";
    })();
    return kindPromise;
  }

  async function queryOwned(): Promise<boolean> {
    const collected: BillingTransaction[] = [];
    let failures = 0;
    for (const productType of PURCHASE_QUERY_TYPES) {
      try {
        const { purchases } = await client.getPurchases({ productType });
        collected.push(...purchases);
      } catch {
        failures += 1;
      }
    }
    if (purchasesGrantUnlock(collected)) return true;
    if (failures > 0) throw new Error("incomplete store query");
    return false;
  }

  async function applyOwned(owned: boolean, message: string): Promise<BillingActionResult> {
    writeUnlockedFlag(owned, storage);
    return { unlocked: owned, message };
  }

  async function restoreFromStore(): Promise<BillingActionResult> {
    try {
      await client.restorePurchases();
    } catch {
      try {
        const owned = await queryOwned();
        if (owned) {
          return applyOwned(true, "Unlock restored from your store account.");
        }
      } catch {
        // Fall through to the restore error.
      }
      return {
        unlocked: readUnlockedFlag(storage),
        message: "Could not restore purchases. Check your connection and try again.",
      };
    }

    try {
      const owned = await queryOwned();
      return applyOwned(
        owned,
        owned
          ? "Unlock restored from your store account."
          : "No purchase found for this store account.",
      );
    } catch {
      return {
        unlocked: readUnlockedFlag(storage),
        message: "Could not restore purchases. Check your connection and try again.",
      };
    }
  }

  return {
    platformName: platform.name,
    resolveKind,
    async getPriceLabels() {
      if ((await resolveKind()) === "stub") return catalogPriceLabels();
      const labels = catalogPriceLabels();
      for (const plan of ["lifetime", "annual"] as const) {
        const spec = PRO_PLANS[plan];
        try {
          const { product } = await client.getProduct({
            productIdentifier: spec.id,
            productType: spec.type,
          });
          labels[plan] = paywallPriceLabel(plan, product.priceString);
        } catch {
          // Keep the catalog price for this plan.
        }
      }
      return labels;
    },
    async refreshFromStore() {
      if ((await resolveKind()) === "stub") {
        return { unlocked: readUnlockedFlag(storage), queried: false };
      }
      try {
        const owned = await queryOwned();
        writeUnlockedFlag(owned, storage);
        return { unlocked: owned, queried: true };
      } catch {
        return { unlocked: readUnlockedFlag(storage), queried: false };
      }
    },
    async purchase(plan: ProPlan = "lifetime") {
      if ((await resolveKind()) === "stub") {
        writeUnlockedFlag(true, storage);
        return {
          unlocked: true,
          message: "Unlocked on this device (web/debug stub — not billed).",
        };
      }

      const spec = PRO_PLANS[plan];
      try {
        const transaction = await client.purchaseProduct({
          productIdentifier: spec.id,
          productType: spec.type,
          isConsumable: false,
          planIdentifier: spec.planIdentifier,
        });
        const owned = transactionGrantsUnlock(transaction) || (await queryOwned());
        if (owned) {
          return applyOwned(true, "Pro set-out unlocked.");
        }
        return {
          unlocked: readUnlockedFlag(storage),
          message: "Purchase did not complete. Try Restore purchases.",
        };
      } catch (error) {
        if (isUserCancelledPurchase(error)) {
          return { unlocked: readUnlockedFlag(storage), cancelled: true, message: "" };
        }
        if (isAlreadyOwnedPurchase(error)) {
          return restoreFromStore();
        }
        return {
          unlocked: readUnlockedFlag(storage),
          message: friendlyPurchaseMessage(error),
        };
      }
    },
    async restore() {
      if ((await resolveKind()) === "stub") {
        return restoreUnlockFlag(storage);
      }
      return restoreFromStore();
    },
  };
}
