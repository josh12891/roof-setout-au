import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function read(rel: string) {
  return readFileSync(path.join(root, rel), "utf8");
}

describe("native Capacitor shells", () => {
  it("uses com.josh12891.roofsetout on Android and iOS", () => {
    expect(read("android/app/build.gradle")).toContain('applicationId "com.josh12891.roofsetout"');
    expect(read("android/app/src/main/res/values/strings.xml")).toContain("AU Roof Carpenter");
    expect(read("capacitor.config.json")).toContain('"appId": "com.josh12891.roofsetout"');
    expect(read("capacitor.config.json")).toContain('"appName": "AU Roof Carpenter"');
    expect(read("ios/App/App/Info.plist")).toContain("AU Roof Carpenter");
    expect(read("ios/App/App.xcodeproj/project.pbxproj")).toContain(
      "PRODUCT_BUNDLE_IDENTIFIER = com.josh12891.roofsetout;",
    );
  });

  it("declares Play Billing and targets API 36", () => {
    expect(read("android/app/src/main/AndroidManifest.xml")).toContain(
      "com.android.vending.BILLING",
    );
    expect(read("android/variables.gradle")).toContain("targetSdkVersion = 36");
    expect(read("android/variables.gradle")).toContain("minSdkVersion = 24");
  });

  it("wires the iOS Distribution plugin for TestFlight detection", () => {
    expect(existsSync(path.join(root, "ios/App/App/DistributionPlugin.swift"))).toBe(true);
    expect(existsSync(path.join(root, "ios/App/App/BridgeViewController.swift"))).toBe(true);
    const plugin = read("ios/App/App/DistributionPlugin.swift");
    const bridge = read("ios/App/App/BridgeViewController.swift");
    const storyboard = read("ios/App/App/Base.lproj/Main.storyboard");
    const pbx = read("ios/App/App.xcodeproj/project.pbxproj");
    expect(plugin).toContain('@objc(DistributionPlugin)');
    expect(plugin).toContain('public let jsName = "Distribution"');
    expect(bridge).toContain("registerPluginInstance(DistributionPlugin())");
    expect(storyboard).toContain('customClass="BridgeViewController"');
    expect(pbx).toContain("DistributionPlugin.swift");
    expect(pbx).toContain("IPHONEOS_DEPLOYMENT_TARGET = 15.0;");
    expect(pbx).not.toMatch(/IPHONEOS_DEPLOYMENT_TARGET = 1[0-4]\./);
    const podfile = read("ios/App/Podfile");
    expect(podfile).toContain("platform :ios, '15.0'");
    expect(podfile).not.toMatch(/platform :ios, '1[0-4]\./);
  });
});
