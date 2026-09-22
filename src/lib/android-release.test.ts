import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { UNLOCK_PRICE_LABEL, UNLOCK_PRODUCT_ID } from "./unlock.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function read(rel: string) {
  return readFileSync(path.join(root, rel), "utf8");
}

describe("Play release AAB wiring", () => {
  it("keeps applicationId com.josh12891.roofsetout", () => {
    const gradle = read("android/app/build.gradle");
    const cap = JSON.parse(read("capacitor.config.json")) as { appId: string };
    const strings = read("android/app/src/main/res/values/strings.xml");
    const bundleScript = read("scripts/android-bundle-release.sh");
    expect(cap.appId).toBe("com.josh12891.roofsetout");
    expect(gradle).toContain('applicationId "com.josh12891.roofsetout"');
    expect(gradle).toContain('namespace "com.josh12891.roofsetout"');
    expect(strings).toContain("com.josh12891.roofsetout");
    expect(bundleScript).toContain('app_id = "com.josh12891.roofsetout"');
    expect(bundleScript).not.toContain("tradiestoolbox");
    expect(read("android/app/src/main/java/com/josh12891/roofsetout/MainActivity.java")).toContain(
      "package com.josh12891.roofsetout;",
    );
  });

  it("targets API 36", () => {
    const variables = read("android/variables.gradle");
    expect(variables).toMatch(/compileSdkVersion\s*=\s*36/);
    expect(variables).toMatch(/targetSdkVersion\s*=\s*36/);
  });

  it("declares Play Billing in the app manifest", () => {
    const manifest = read("android/app/src/main/AndroidManifest.xml");
    expect(manifest).toContain('android:name="com.android.vending.BILLING"');
  });

  it("wires release signing from Codemagic CM_* env or gitignored keystore.properties", () => {
    const gradle = read("android/app/build.gradle");
    const example = read("android/keystore.properties.example");
    const gitignore = read(".gitignore");
    const keystoreScript = read("scripts/generate-upload-keystore.sh");
    expect(gradle).toContain("signingConfigs");
    expect(gradle).toContain("keystore.properties");
    expect(gradle).toContain("CM_KEYSTORE_PATH");
    expect(gradle).toContain("CM_KEYSTORE_PASSWORD");
    expect(gradle).toContain("CM_KEY_ALIAS");
    expect(gradle).toContain("CM_KEY_PASSWORD");
    expect(gradle).toContain("signingConfig signingConfigs.release");
    expect(example).toContain("storeFile=upload-keystore.jks");
    expect(example).toContain("keyAlias=upload");
    expect(gitignore).toContain("android/keystore.properties");
    expect(gitignore).toContain("*.jks");
    expect(gitignore).toContain("UPLOAD_KEYSTORE.md");
    expect(keystoreScript).toContain("com.josh12891.roofsetout");
    expect(keystoreScript).toContain("AU Roof Carpenter");
    expect(keystoreScript).not.toMatch(/Joshua Pearson/i);
    expect(keystoreScript).not.toContain("tradiestoolbox");
  });

  it("documents Play upload then IAP create and freemium product id", () => {
    const readme = read("README.md");
    expect(UNLOCK_PRODUCT_ID).toBe("roof_setout_pro_unlock");
    expect(readme).toContain("com.josh12891.roofsetout");
    expect(readme).toContain("com.android.vending.BILLING");
    expect(readme).toContain("android-play");
    expect(readme).toContain("CM_KEYSTORE");
    expect(readme).toContain(UNLOCK_PRODUCT_ID);
    expect(readme).toContain(UNLOCK_PRICE_LABEL);
    expect(readme).toContain("keystore.properties");
    expect(readme).toContain("roof-setout-upload");
    expect(readme).toContain("do **not** invent a second upload key");
  });
});
