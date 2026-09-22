import { Capacitor } from "@capacitor/core";
import { NativePurchases, PURCHASE_TYPE } from "@capgo/native-purchases";
import {
  readUnlockedFlag,
  restoreUnlockFlag,
  UNLOCK_PRICE_LABEL,
  UNLOCK_PRODUCT_ID,
  UNLOCK_PRODUCT_TYPE,
  writeUnlockedFlag,
  type UnlockStorage,
} from "./unlock";

export type BillingKind = "store" | "stub";

export type BillingTransaction = {
  productIdentifier?: string;
  purchaseState?: string;
  revocationDate?: string | null;
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

export function transactionGrantsUnlock(
  transaction: BillingTransaction,
  productId = UNLOCK_PRODUCT_ID,
): boolean {
  if (transaction.productIdentifier !== productId) return false;
  if (transaction.revocationDate) return false;
  if (transaction.isActive === false) return false;
  const state = transaction.purchaseState;
  if (state == null || state === "") return true;
  const normalized = String(state).toUpperCase();
  return normalized === "1" || normalized === "PURCHASED";
}

export function purchasesGrantUnlock(
  purchases: BillingTransaction[],
  productId = UNLOCK_PRODUCT_ID,
): boolean {
  return purchases.some((purchase) => transactionGrantsUnlock(purchase, productId));
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
    return "Google Play bills this one-time unlock. Restore uses your Play account.";
  }
  if (platformName === "ios") {
    return "The App Store bills this one-time unlock. Restore uses your Apple ID.";
  }
  return "Purchases go through the App Store or Google Play.";
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
  getPriceLabel: () => Promise<string>;
  refreshFromStore: () => Promise<{ unlocked: boolean; queried: boolean }>;
  purchase: () => Promise<BillingActionResult>;
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
    const { purchases } = await client.getPurchases({
      productType: UNLOCK_PRODUCT_TYPE,
    });
    return purchasesGrantUnlock(purchases);
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
    async getPriceLabel() {
      if ((await resolveKind()) === "stub") return UNLOCK_PRICE_LABEL;
      try {
        const { product } = await client.getProduct({
          productIdentifier: UNLOCK_PRODUCT_ID,
          productType: UNLOCK_PRODUCT_TYPE,
        });
        const label = product.priceString?.trim();
        return label || UNLOCK_PRICE_LABEL;
      } catch {
        return UNLOCK_PRICE_LABEL;
      }
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
    async purchase() {
      if ((await resolveKind()) === "stub") {
        writeUnlockedFlag(true, storage);
        return {
          unlocked: true,
          message: "Unlocked on this device (web/debug stub — not billed).",
        };
      }

      try {
        const transaction = await client.purchaseProduct({
          productIdentifier: UNLOCK_PRODUCT_ID,
          productType: UNLOCK_PRODUCT_TYPE,
          isConsumable: false,
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
