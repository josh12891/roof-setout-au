/** One-time non-consumable IAP for Pro roof set-out. */
export const UNLOCK_PRODUCT_ID = "roof_setout_pro_unlock";

export const UNLOCK_STORAGE_KEY = "roof-setout-au.unlock.v1";

/** Consumed free-calculation counts for paid tools. */
export const FREE_USES_STORAGE_KEY = "roof-setout-au.free-uses.v1";

export const FREE_USES_PER_PAID_TOOL = 1;

export const UNLOCK_PRICE_AUD = 39.99;
export const UNLOCK_PRICE_LABEL = "$39.99 AUD";

/** Play Billing / StoreKit product type: managed one-time (non-consumable). */
export const UNLOCK_PRODUCT_TYPE = "inapp";

export const PUBLIC_PRIVACY_URL =
  "https://josh12891.github.io/roof-setout-au/privacy.html";

/**
 * Team freemium lock (this build):
 * Free forever — gable ends, common rafter, birdsmouth.
 * Pro — hip set-out, creeper schedule (common difference, cutting list,
 * material order), L/T junctions. Skillion is not in this build.
 */
export type ToolId = "gable" | "common" | "hip" | "creeper" | "junction";

export const FREE_TOOL_IDS = ["gable", "common"] as const satisfies readonly ToolId[];
export const PAID_TOOL_IDS = ["hip", "creeper", "junction"] as const satisfies readonly ToolId[];

export type PaidToolId = (typeof PAID_TOOL_IDS)[number];

export type FreeUseCounts = Record<PaidToolId, number>;

export type PaidToolHomeLabel = "try-once" | "unlock" | null;

export type UnlockStorage = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
};

export function isPaidToolId(id: ToolId): id is PaidToolId {
  return (PAID_TOOL_IDS as readonly ToolId[]).includes(id);
}

export function toolRequiresUnlock(id: ToolId): boolean {
  return isPaidToolId(id);
}

export function emptyFreeUseCounts(): FreeUseCounts {
  return { hip: 0, creeper: 0, junction: 0 };
}

export function freeUsesRemaining(id: PaidToolId, consumed: FreeUseCounts): number {
  return Math.max(0, FREE_USES_PER_PAID_TOOL - (consumed[id] ?? 0));
}

export function hasFreeUseRemaining(id: PaidToolId, consumed: FreeUseCounts): boolean {
  return freeUsesRemaining(id, consumed) > 0;
}

/**
 * Whether this tool may run a calculation now.
 * Gable ends + common rafter (incl. birdsmouth) stay free. Hip set-out,
 * creeper schedule and L/T junctions each get one free real calculation;
 * after that they need Pro (includes common difference, cutting list and
 * material order on the creeper tool).
 */
export function canUseTool(
  id: ToolId,
  unlocked: boolean,
  consumed: FreeUseCounts = emptyFreeUseCounts(),
): boolean {
  if (!isPaidToolId(id) || unlocked) return true;
  return hasFreeUseRemaining(id, consumed);
}

export function paidToolHomeLabel(
  id: ToolId,
  unlocked: boolean,
  consumed: FreeUseCounts,
): PaidToolHomeLabel {
  if (!isPaidToolId(id) || unlocked) return null;
  return hasFreeUseRemaining(id, consumed) ? "try-once" : "unlock";
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

export function readFreeUsesConsumed(
  storage: UnlockStorage | null = browserStorage(),
): FreeUseCounts {
  const empty = emptyFreeUseCounts();
  if (!storage) return empty;
  try {
    const raw = storage.getItem(FREE_USES_STORAGE_KEY);
    if (!raw) return empty;
    const parsed = JSON.parse(raw) as Partial<FreeUseCounts>;
    return {
      hip: clampConsumed(parsed.hip),
      creeper: clampConsumed(parsed.creeper),
      junction: clampConsumed(parsed.junction),
    };
  } catch {
    return empty;
  }
}

export function writeFreeUsesConsumed(
  counts: FreeUseCounts,
  storage: UnlockStorage | null = browserStorage(),
): void {
  if (!storage) return;
  try {
    storage.setItem(
      FREE_USES_STORAGE_KEY,
      JSON.stringify({
        hip: clampConsumed(counts.hip),
        creeper: clampConsumed(counts.creeper),
        junction: clampConsumed(counts.junction),
      }),
    );
  } catch {
    // Private mode / quota — treat as not persisted.
  }
}

export function consumeFreeUse(
  id: PaidToolId,
  storage: UnlockStorage | null = browserStorage(),
): boolean {
  const current = readFreeUsesConsumed(storage);
  if (!hasFreeUseRemaining(id, current)) return false;
  writeFreeUsesConsumed({ ...current, [id]: current[id] + 1 }, storage);
  return true;
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

function clampConsumed(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(FREE_USES_PER_PAID_TOOL, Math.floor(n));
}
