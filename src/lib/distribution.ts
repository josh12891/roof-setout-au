import { Capacitor, registerPlugin } from "@capacitor/core";

/** Runtime install channel. Complimentary unlock is TestFlight only. */
export type DistributionChannel = "testflight" | "app-store" | "ios-dev" | "play" | "web" | "unknown";

export type NativeDistributionInspect = {
  receiptLastPathComponent?: string | null;
  hasEmbeddedMobileProvision?: boolean;
};

export type DistributionSnapshot = {
  channel: DistributionChannel;
};

export type DistributionPluginApi = {
  inspect: () => Promise<NativeDistributionInspect>;
};

/**
 * Native receipt / provisioning inspect. Implemented on iOS only.
 * Android and web never grant complimentary unlock.
 */
export const Distribution = registerPlugin<DistributionPluginApi>("Distribution", {
  web: {
    inspect: async () => ({
      receiptLastPathComponent: "",
      hasEmbeddedMobileProvision: false,
    }),
  },
});

export const TESTFLIGHT_SCREENSHOT_NOTE =
  "TestFlight tester build — hip, creeper and skillion are unlocked for App Store screenshots. You do not need to buy. Restore purchases still works if you are testing the real IAP. App Store customers still pay $39.99 AUD.";

/**
 * TestFlight (and only TestFlight-shaped App Store distribution):
 * App Store-signed binary (no embedded.mobileprovision) + sandbox receipt.
 *
 * Production App Store uses `receipt` (not `sandboxReceipt`).
 * Xcode / Ad Hoc / Enterprise keep `embedded.mobileprovision`.
 */
export function classifyIosDistribution(
  native: NativeDistributionInspect,
): DistributionChannel {
  const receipt = native.receiptLastPathComponent ?? "";
  const sandboxReceipt = receipt === "sandboxReceipt";
  const provisioned = Boolean(native.hasEmbeddedMobileProvision);
  if (sandboxReceipt && !provisioned) return "testflight";
  if (sandboxReceipt && provisioned) return "ios-dev";
  if (receipt === "receipt" && !provisioned) return "app-store";
  return "unknown";
}

export function classifyDistribution(
  platformName: string,
  native: NativeDistributionInspect | null,
): DistributionChannel {
  if (platformName === "android") return "play";
  if (platformName === "web") return "web";
  if (platformName !== "ios") return "unknown";
  if (!native) return "unknown";
  return classifyIosDistribution(native);
}

/** Complimentary unlock never applies to Play or App Store customers. */
export function grantsComplimentaryUnlock(channel: DistributionChannel): boolean {
  return channel === "testflight";
}

export function effectiveUnlocked(
  purchased: boolean,
  channel: DistributionChannel,
): boolean {
  return purchased || grantsComplimentaryUnlock(channel);
}

export async function detectDistribution(
  options: {
    platformName?: string;
    inspect?: () => Promise<NativeDistributionInspect>;
  } = {},
): Promise<DistributionSnapshot> {
  const platformName = options.platformName ?? Capacitor.getPlatform();
  if (platformName !== "ios") {
    return { channel: classifyDistribution(platformName, null) };
  }
  try {
    const inspect = options.inspect ?? (() => Distribution.inspect());
    const native = await inspect();
    return { channel: classifyIosDistribution(native) };
  } catch {
    return { channel: "unknown" };
  }
}
