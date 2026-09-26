import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function read(rel: string) {
  return readFileSync(path.join(root, rel), "utf8");
}

describe("single roof set-out workspace", () => {
  it("opens on a flat or pitched choice and does not restore the five-tool home", () => {
    const app = read("src/App.tsx");
    const choice = read("src/pages/RoofChoicePage.tsx");
    expect(app).toContain('path="/" element={<RoofChoicePage />}');
    expect(app).toContain('path="/flat" element={<FlatRoofPage />}');
    expect(app).toContain('path="/pitched" element={<RoofSetoutPage />}');
    expect(app).not.toContain("HomePage");
    expect(app).not.toContain("GableEndsTool");
    expect(app).not.toContain("CreeperTool");
    expect(app).not.toContain('path="/gable"');
    expect(app).not.toContain('path="/hip"');
    expect(app).not.toContain('path="/creeper"');
    expect(app).not.toContain('path="/junction"');
    expect(app).not.toContain('path="/common"');
    expect(choice).toContain("Flat roof");
    expect(choice).toContain("Pitched roof");
    expect(choice).toContain('to="/flat"');
    expect(choice).toContain('to="/pitched"');
    expect(choice).not.toContain("Gable ends");
    expect(choice).not.toContain("Creeper schedule");
    expect(choice).not.toContain("Hip set-out");
    expect(choice).not.toContain("Common rafter");
    expect(choice).not.toContain("L / T junctions");
  });

  it("keeps pitched set-out as the one Grok workspace", () => {
    const page = read("src/pages/RoofSetoutPage.tsx");
    expect(page).toContain("Roof Setout");
    expect(page).toContain("InputsPanel");
    expect(page).toContain("ResultsPanel");
    expect(page).toContain('to="/"');
    expect(read("src/components/roof/results-panel.tsx")).toContain("ProSection");
    expect(read("src/components/roof/inputs-panel.tsx")).toContain("L-shape");
    expect(read("src/components/roof/inputs-panel.tsx")).toContain("T-shape");
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
