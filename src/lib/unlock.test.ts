import { describe, expect, it } from "vitest";
import {
  canUseTool,
  consumeFreeUse,
  emptyFreeUseCounts,
  FREE_TOOL_IDS,
  FREE_USES_PER_PAID_TOOL,
  FREE_USES_STORAGE_KEY,
  freeUsesRemaining,
  hasFreeUseRemaining,
  PAID_TOOL_IDS,
  paidToolHomeLabel,
  readFreeUsesConsumed,
  readUnlockedFlag,
  restoreUnlockFlag,
  toolRequiresUnlock,
  UNLOCK_PRICE_AUD,
  UNLOCK_PRODUCT_ID,
  UNLOCK_STORAGE_KEY,
  writeFreeUsesConsumed,
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

describe("unlock gate", () => {
  it("keeps gable ends and common rafter (birdsmouth) free forever", () => {
    const consumed = { hip: 1, creeper: 1, junction: 1 };
    expect(FREE_TOOL_IDS).toEqual(["gable", "common"]);
    expect(toolRequiresUnlock("gable")).toBe(false);
    expect(toolRequiresUnlock("common")).toBe(false);
    expect(canUseTool("gable", false)).toBe(true);
    expect(canUseTool("common", false)).toBe(true);
    expect(canUseTool("gable", false, consumed)).toBe(true);
    expect(canUseTool("common", false, consumed)).toBe(true);
    expect(paidToolHomeLabel("gable", false, consumed)).toBeNull();
    expect(paidToolHomeLabel("common", false, consumed)).toBeNull();
  });

  it("gates hip, creeper and L/T junctions as Pro tools with one free calc each", () => {
    expect(PAID_TOOL_IDS).toEqual(["hip", "creeper", "junction"]);
    expect(FREE_USES_PER_PAID_TOOL).toBe(1);
    expect(UNLOCK_PRODUCT_ID).toBe("roof_setout_pro_unlock");
    expect(UNLOCK_PRICE_AUD).toBe(39.99);

    const unused = emptyFreeUseCounts();
    for (const id of PAID_TOOL_IDS) {
      expect(toolRequiresUnlock(id)).toBe(true);
      expect(canUseTool(id, false, unused)).toBe(true);
      expect(hasFreeUseRemaining(id, unused)).toBe(true);
      expect(paidToolHomeLabel(id, false, unused)).toBe("try-once");
    }
  });

  it("does not include skillion in this build's tool ids", () => {
    expect(FREE_TOOL_IDS).not.toContain("skillion");
    expect(PAID_TOOL_IDS).not.toContain("skillion");
  });

  it("gates a paid tool after its own free use is consumed", () => {
    const hipUsed = { hip: 1, creeper: 0, junction: 0 };
    expect(canUseTool("hip", false, hipUsed)).toBe(false);
    expect(canUseTool("creeper", false, hipUsed)).toBe(true);
    expect(freeUsesRemaining("hip", hipUsed)).toBe(0);
    expect(paidToolHomeLabel("hip", false, hipUsed)).toBe("unlock");
    expect(paidToolHomeLabel("creeper", false, hipUsed)).toBe("try-once");
  });

  it("lets the one-time Pro unlock clear the gate for all paid tools", () => {
    const allUsed = { hip: 1, creeper: 1, junction: 1 };
    expect(canUseTool("hip", true, allUsed)).toBe(true);
    expect(canUseTool("creeper", true, allUsed)).toBe(true);
    expect(canUseTool("junction", true, allUsed)).toBe(true);
    expect(paidToolHomeLabel("hip", true, allUsed)).toBeNull();
  });

  it("persists a local unlock flag", () => {
    const storage = memoryStorage();
    expect(readUnlockedFlag(storage)).toBe(false);
    writeUnlockedFlag(true, storage);
    expect(storage.getItem(UNLOCK_STORAGE_KEY)).toBe("1");
    expect(readUnlockedFlag(storage)).toBe(true);
    writeUnlockedFlag(false, storage);
    expect(readUnlockedFlag(storage)).toBe(false);
  });

  it("persists per-tool free-use counts independently", () => {
    const storage = memoryStorage();
    expect(readFreeUsesConsumed(storage)).toEqual({ hip: 0, creeper: 0, junction: 0 });

    expect(consumeFreeUse("hip", storage)).toBe(true);
    expect(storage.getItem(FREE_USES_STORAGE_KEY)).toBe(
      JSON.stringify({ hip: 1, creeper: 0, junction: 0 }),
    );
    expect(canUseTool("hip", false, readFreeUsesConsumed(storage))).toBe(false);
    expect(canUseTool("creeper", false, readFreeUsesConsumed(storage))).toBe(true);

    expect(consumeFreeUse("hip", storage)).toBe(false);
    expect(consumeFreeUse("junction", storage)).toBe(true);
    expect(readFreeUsesConsumed(storage)).toEqual({ hip: 1, creeper: 0, junction: 1 });
  });

  it("treats invalid stored free-use JSON as unused", () => {
    const storage = memoryStorage({ [FREE_USES_STORAGE_KEY]: "not-json" });
    expect(readFreeUsesConsumed(storage)).toEqual({ hip: 0, creeper: 0, junction: 0 });
    writeFreeUsesConsumed({ hip: 9, creeper: -2, junction: 1 }, storage);
    expect(readFreeUsesConsumed(storage)).toEqual({ hip: 1, creeper: 0, junction: 1 });
  });

  it("restores from the local flag for the web/debug stub", () => {
    const empty = memoryStorage();
    expect(restoreUnlockFlag(empty)).toEqual({
      unlocked: false,
      message: "No purchase found on this device.",
    });
    const paid = memoryStorage({ [UNLOCK_STORAGE_KEY]: "1" });
    expect(restoreUnlockFlag(paid)).toEqual({
      unlocked: true,
      message: "Unlock restored on this device.",
    });
  });
});
