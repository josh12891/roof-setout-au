import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function read(rel: string) {
  return readFileSync(path.join(root, rel), "utf8");
}

describe("single roof set-out workspace", () => {
  it("keeps the home route on one Roof Setout screen", () => {
    const app = read("src/App.tsx");
    expect(app).toContain("RoofSetoutPage");
    expect(app).not.toContain("HomePage");
    expect(app).not.toContain("GableEndsTool");
    expect(app).not.toContain("CreeperTool");
    expect(app).not.toContain('path="/gable"');
    expect(app).not.toContain('path="/hip"');
    expect(app).not.toContain('path="/creeper"');
    expect(app).not.toContain('path="/junction"');
    expect(app).not.toContain('path="/common"');
  });

  it("keeps store identity and the Pro product id", () => {
    const cap = read("capacitor.config.json");
    expect(cap).toContain('"appId": "com.josh12891.roofsetout"');
    expect(cap).toContain('"appName": "AU Roof Carpenter"');
    expect(read("src/lib/unlock.ts")).toContain('UNLOCK_PRODUCT_ID = "roof_setout_pro_unlock"');
    expect(read("src/pages/RoofSetoutPage.tsx")).toContain("Roof Setout");
  });

  it("names the L/T wing fields width/span and length", () => {
    const inputs = read("src/components/roof/inputs-panel.tsx");
    expect(inputs).toContain('label="Wing width/span"');
    expect(inputs).toContain('label="Wing length"');
    expect(inputs).not.toContain('label="Wing span"');
    expect(inputs).not.toContain('label="Wing projection"');
    expect(read("src/components/roof/results-panel.tsx")).toContain("Main roof members");
    expect(read("src/components/roof/results-panel.tsx")).toContain("wing roof members");
  });
});
