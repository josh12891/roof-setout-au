import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

describe("privacy docs", () => {
  it("keeps public/privacy.html and docs/privacy.html in sync after npm test", () => {
    const publicPath = path.join(root, "public", "privacy.html");
    const docsPath = path.join(root, "docs", "privacy.html");
    expect(existsSync(publicPath)).toBe(true);
    expect(existsSync(docsPath)).toBe(true);
    expect(readFileSync(docsPath, "utf8")).toBe(readFileSync(publicPath, "utf8"));
  });

  it("uses Australian Dynamics branding and the roof setout bundle id", () => {
    const html = readFileSync(path.join(root, "public", "privacy.html"), "utf8");
    expect(html).toContain("AU Roof Carpenter");
    expect(html).toContain("Australian Dynamics");
    expect(html).toContain("australiancomsnetwork@gmail.com");
    expect(html).toContain("com.josh12891.roofsetout");
    expect(html).toContain("roof_setout_pro_unlock");
    expect(html).not.toMatch(/josh@pearson|Joshua Pearson/i);
    expect(html).not.toMatch(/Roof Setout AU/i);
  });
});
