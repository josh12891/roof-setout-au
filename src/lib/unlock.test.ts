import { describe, expect, it } from "vitest";
import {
  ANNUAL_BASE_PLAN_ID,
  ANNUAL_PRICE_AUD,
  ANNUAL_PRICE_LABEL,
  ANNUAL_PRODUCT_ID,
  ANNUAL_PRODUCT_TYPE,
  canUseTool,
  FREE_TOOL_IDS,
  PAID_TOOL_IDS,
  paidToolHomeLabel,
  pitchedShapeForTier,
  PRO_PLANS,
  PRO_PRODUCT_IDS,
  readUnlockedFlag,
  restoreUnlockFlag,
  toolRequiresUnlock,
  PUBLIC_PRIVACY_URL,
  PUBLIC_TERMS_URL,
  UNLOCK_PRICE_AUD,
  UNLOCK_PRICE_LABEL,
  UNLOCK_PRODUCT_ID,
  UNLOCK_PRODUCT_TYPE,
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

describe("unlock gate", () => {
  it("keeps gable ends and common rafter (birdsmouth) free", () => {
    expect(FREE_TOOL_IDS).toEqual(["gable", "common"]);
    expect(toolRequiresUnlock("gable")).toBe(false);
    expect(toolRequiresUnlock("common")).toBe(false);
    expect(canUseTool("gable", false)).toBe(true);
    expect(canUseTool("common", false)).toBe(true);
    expect(paidToolHomeLabel("gable", false)).toBeNull();
    expect(paidToolHomeLabel("common", false)).toBeNull();
  });

  it("locks hip, creeper, L/T, isometric and cutting list until Pro", () => {
    expect(PAID_TOOL_IDS).toEqual(["hip", "creeper", "junction", "isometric", "cutting"]);
    expect(UNLOCK_PRODUCT_ID).toBe("roof_setout_pro_unlock");
    expect(ANNUAL_PRODUCT_ID).toBe("roof_setout_pro_annual");
    expect(PRO_PRODUCT_IDS).toEqual([UNLOCK_PRODUCT_ID, ANNUAL_PRODUCT_ID]);
    expect(UNLOCK_PRICE_AUD).toBe(39.99);
    expect(UNLOCK_PRICE_LABEL).toBe("$39.99 AUD");
    expect(ANNUAL_PRICE_AUD).toBe(14.99);
    expect(ANNUAL_PRICE_LABEL).toBe("$14.99 AUD/year");
    expect(PRO_PLANS.lifetime).toMatchObject({
      id: UNLOCK_PRODUCT_ID,
      type: UNLOCK_PRODUCT_TYPE,
      priceAud: 39.99,
    });
    expect(PRO_PLANS.annual).toMatchObject({
      id: ANNUAL_PRODUCT_ID,
      type: ANNUAL_PRODUCT_TYPE,
      priceAud: 14.99,
      planIdentifier: ANNUAL_BASE_PLAN_ID,
    });
    expect(ANNUAL_BASE_PLAN_ID).toBe("annual");
    expect(PUBLIC_PRIVACY_URL).toBe(
      "https://josh12891.github.io/roof-setout-au/privacy.html",
    );
    expect(PUBLIC_TERMS_URL).toBe(
      "https://www.apple.com/legal/internet-services/itunes/dev/stdeula/",
    );

    for (const id of PAID_TOOL_IDS) {
      expect(toolRequiresUnlock(id)).toBe(true);
      expect(canUseTool(id, false)).toBe(false);
      expect(paidToolHomeLabel(id, false)).toBe("unlock");
      expect(canUseTool(id, true)).toBe(true);
      expect(paidToolHomeLabel(id, true)).toBeNull();
    }
  });

  it("does not include skillion in this build's tool ids", () => {
    expect(FREE_TOOL_IDS).not.toContain("skillion");
    expect(PAID_TOOL_IDS).not.toContain("skillion");
  });

  it("shows pitched gable numbers while Pro shapes stay stored for later", () => {
    const hipJob = {
      leftEnd: "hip" as const,
      rightEnd: "hip" as const,
      junction: "L" as const,
      lengthMm: 12000,
    };
    expect(pitchedShapeForTier(hipJob, false)).toEqual({
      leftEnd: "gable",
      rightEnd: "gable",
      junction: "none",
      lengthMm: 12000,
    });
    expect(pitchedShapeForTier(hipJob, true)).toBe(hipJob);
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
