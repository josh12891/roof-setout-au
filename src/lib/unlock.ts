/** Lifetime non-consumable. Same Pro set as the annual subscription. */
export const UNLOCK_PRODUCT_ID = "roof_setout_pro_unlock";

/** Auto-renewable annual subscription. No monthly SKU. */
export const ANNUAL_PRODUCT_ID = "roof_setout_pro_annual";

/**
 * Google Play base plan id for `roof_setout_pro_annual`.
 * Required by Play Billing when purchasing a subscription. StoreKit ignores it.
 */
export const ANNUAL_BASE_PLAN_ID = "annual";

export const UNLOCK_STORAGE_KEY = "roof-setout-au.unlock.v1";

export const UNLOCK_PRICE_AUD = 39.99;
export const UNLOCK_PRICE_LABEL = "$39.99 AUD";

export const ANNUAL_PRICE_AUD = 14.99;
export const ANNUAL_PRICE_LABEL = "$14.99 AUD/year";

/** Play Billing / StoreKit product type for the lifetime unlock. */
export const UNLOCK_PRODUCT_TYPE = "inapp";

/** Play Billing / StoreKit product type for the annual subscription. */
export const ANNUAL_PRODUCT_TYPE = "subs";

export const PRO_PRODUCT_IDS = [UNLOCK_PRODUCT_ID, ANNUAL_PRODUCT_ID] as const;

export type ProPlan = "lifetime" | "annual";

export type ProPlanSpec = {
  id: string;
  type: typeof UNLOCK_PRODUCT_TYPE | typeof ANNUAL_PRODUCT_TYPE;
  priceAud: number;
  priceLabel: string;
  /** Android subscription base plan. Omitted for the lifetime in-app product. */
  planIdentifier?: string;
};

export const PRO_PLANS: Record<ProPlan, ProPlanSpec> = {
  lifetime: {
    id: UNLOCK_PRODUCT_ID,
    type: UNLOCK_PRODUCT_TYPE,
    priceAud: UNLOCK_PRICE_AUD,
    priceLabel: UNLOCK_PRICE_LABEL,
  },
  annual: {
    id: ANNUAL_PRODUCT_ID,
    type: ANNUAL_PRODUCT_TYPE,
    priceAud: ANNUAL_PRICE_AUD,
    priceLabel: ANNUAL_PRICE_LABEL,
    planIdentifier: ANNUAL_BASE_PLAN_ID,
  },
};

export const PUBLIC_PRIVACY_URL =
  "https://josh12891.github.io/roof-setout-au/privacy.html";

/**
 * Locked freemium:
 * Free — flat roof numbers, and pitched gable numbers (commons, birdsmouth, pitch).
 * Pro (either IAP) — isometric, cutting list, hip / valley / creeper / L·T set-out.
 * There is no free preview of a Pro feature.
 */
export type ToolId =
  | "gable"
  | "common"
  | "hip"
  | "creeper"
  | "junction"
  | "isometric"
  | "cutting";

export const FREE_TOOL_IDS = ["gable", "common"] as const satisfies readonly ToolId[];
export const PAID_TOOL_IDS = [
  "hip",
  "creeper",
  "junction",
  "isometric",
  "cutting",
] as const satisfies readonly ToolId[];

export type PaidToolId = (typeof PAID_TOOL_IDS)[number];

export type PaidToolHomeLabel = "unlock" | null;

export type UnlockStorage = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
};

export type GableShape = {
  leftEnd: "hip" | "gable";
  rightEnd: "hip" | "gable";
  junction: "none" | "L" | "T";
};

export function isPaidToolId(id: ToolId): id is PaidToolId {
  return (PAID_TOOL_IDS as readonly ToolId[]).includes(id);
}

export function toolRequiresUnlock(id: ToolId): boolean {
  return isPaidToolId(id);
}

/**
 * Whether this tool may show its numbers or drawing.
 * Gable ends and common rafter (including birdsmouth) stay free.
 * Hip, valley, creeper, L/T, isometric and the cutting list need Pro.
 */
export function canUseTool(id: ToolId, unlocked: boolean): boolean {
  if (!isPaidToolId(id) || unlocked) return true;
  return false;
}

export function paidToolHomeLabel(id: ToolId, unlocked: boolean): PaidToolHomeLabel {
  if (!isPaidToolId(id) || unlocked) return null;
  return "unlock";
}

/**
 * Free pitched set-out is a gable only. Hip ends and L/T junctions stay in the
 * stored job for after purchase, but the numbers on screen use this shape.
 */
export function pitchedShapeForTier<T extends GableShape>(inputs: T, unlocked: boolean): T {
  if (unlocked) return inputs;
  return {
    ...inputs,
    leftEnd: "gable",
    rightEnd: "gable",
    junction: "none",
  };
}

function browserStorage(): UnlockStorage | null {
  try {
    if (typeof localStorage === "undefined") return null;
    return localStorage;
  } catch {
    return null;
  }
}

export function readUnlockedFlag(storage: UnlockStorage | null = browserStorage()): boolean {
  if (!storage) return false;
  try {
    return storage.getItem(UNLOCK_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function writeUnlockedFlag(
  value: boolean,
  storage: UnlockStorage | null = browserStorage(),
): void {
  if (!storage) return;
  try {
    if (value) storage.setItem(UNLOCK_STORAGE_KEY, "1");
    else storage.removeItem(UNLOCK_STORAGE_KEY);
  } catch {
    // Private mode / quota — treat as still locked.
  }
}

export function restoreUnlockFlag(storage: UnlockStorage | null = browserStorage()): {
  unlocked: boolean;
  message: string;
} {
  const unlocked = readUnlockedFlag(storage);
  return {
    unlocked,
    message: unlocked
      ? "Unlock restored on this device."
      : "No purchase found on this device.",
  };
}
