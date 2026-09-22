import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { UNLOCK_PRODUCT_ID } from "./unlock.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function read(rel: string) {
  return readFileSync(path.join(root, rel), "utf8");
}

describe("Codemagic iOS CI", () => {
  it("builds a signed App Store IPA on mac_mini_m2 from the Capacitor ios/ project", () => {
    const yaml = read("codemagic.yaml");
    expect(yaml).toContain("ios-app-store:");
    expect(yaml).toContain("instance_type: mac_mini_m2");
    expect(yaml).toMatch(/^    triggering:\n      events:\n        - push$/m);
    expect(yaml).toContain("pattern: main");
    expect(yaml).toContain("npm ci");
    expect(yaml).toContain("npm run build");
    expect(yaml).toContain("npx cap sync ios");
    expect(yaml).toContain("distribution_type: app_store");
    expect(yaml).toContain("bundle_identifier: com.josh12891.roofsetout");
    expect(yaml).toContain("BUNDLE_ID: com.josh12891.roofsetout");
    expect(yaml).toContain("xcode-project build-ipa");
    expect(yaml).toContain("XCODE_WORKSPACE: App.xcworkspace");
    expect(yaml).toContain("XCODE_SCHEME: App");
    expect(yaml).toContain("agvtool new-version -all");
    expect(yaml).toContain("get-latest-testflight-build-number");
    expect(yaml).toContain("xcode-project use-profiles");
    expect(yaml).toContain("app-store-connect fetch-signing-files");
    expect(yaml).toContain("app-store-connect publish");
    const pbx = read("ios/App/App.xcodeproj/project.pbxproj");
    expect(pbx).toContain("PRODUCT_BUNDLE_IDENTIFIER = com.josh12891.roofsetout;");
  });

  it("guards TestFlight and uses tradies-toolbox-asc-2 without committing Apple secrets", () => {
    const yaml = read("codemagic.yaml");
    const gitignore = read(".gitignore");
    expect(yaml).toMatch(/^    integrations:\n      app_store_connect: tradies-toolbox-asc-2$/m);
    expect(yaml).toContain('PUBLISH_TESTFLIGHT: "true"');
    expect(yaml).toContain("No App Store Connect API key in this environment - skip TestFlight.");
    expect(yaml).toContain("app-store-connect publish --path");
    expect(yaml).toContain("au-roof-carpenter-asc");
    expect(yaml).toMatch(/#\s*app_store_connect:\s*$/m);
    expect(yaml).toMatch(/#\s*auth: integration/);
    expect(yaml).not.toMatch(/-----BEGIN PRIVATE KEY-----/);
    expect(yaml).not.toMatch(/AUTHKEY_[A-Z0-9]{10}/i);
    expect(yaml).not.toMatch(/Issuer ID:\s*[0-9a-f-]{20,}/i);
    expect(gitignore).toContain("*.p8");
    expect(gitignore).toContain("*.p12");
    expect(gitignore).toContain("*.mobileprovision");
    expect(gitignore).toContain("AuthKey_*.p8");
  });

  it("documents Codemagic signup, signing, TestFlight, and cost", () => {
    const docs = read("docs/ios-codemagic.md");
    const readme = read("README.md");
    expect(docs).toContain("push to `main`");
    expect(docs).toContain("codemagic.io");
    expect(docs).toContain("josh12891/roof-setout-au");
    expect(docs).toContain("com.josh12891.roofsetout");
    expect(docs).toContain(UNLOCK_PRODUCT_ID);
    expect(docs).toContain("500");
    expect(docs).toContain("$0.095");
    expect(docs).toContain("App Store Connect API");
    expect(docs).toContain("tradies-toolbox-asc-2");
    expect(docs).toContain("integrations.app_store_connect: tradies-toolbox-asc-2");
    expect(docs).toContain("must match the Team integrations Developer Portal key name");
    expect(docs).toContain("Application variable");
    expect(docs).toContain("Code signing identities");
    expect(docs).toContain("TestFlight");
    expect(docs).toContain("Never commit");
    expect(docs).toContain("sandboxReceipt");
    expect(docs).toContain("App Store customers still pay");
    expect(docs).toContain("lozzpearson@gmail.com");
    expect(readme).toContain("docs/ios-codemagic.md");
    expect(readme).toContain("ios-app-store");
    expect(readme).toContain("android-play");
    expect(readme).toContain("codemagic.yaml");
    expect(readme).toContain("tradies-toolbox-asc-2");
  });
});

describe("Codemagic Android Play CI", () => {
  it("builds a signed AAB with BILLING for com.josh12891.roofsetout", () => {
    const yaml = read("codemagic.yaml");
    expect(yaml).toContain("android-play:");
    expect(yaml).toContain("PACKAGE_NAME: com.josh12891.roofsetout");
    expect(yaml).toContain("npx cap sync android");
    expect(yaml).toContain("./gradlew :app:bundleRelease");
    expect(yaml).toContain("roof-setout-upload");
    expect(yaml).toContain("CM_KEYSTORE");
    expect(yaml).toContain("CM_KEYSTORE_PATH");
    expect(yaml).toContain("CM_KEYSTORE_PASSWORD");
    expect(yaml).toContain("CM_KEY_ALIAS");
    expect(yaml).toContain("CM_KEY_PASSWORD");
    expect(yaml).toContain("com.android.vending.BILLING");
    expect(yaml).toContain("Do not generate a new upload keystore");
  });
});
