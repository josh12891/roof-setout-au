import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import { UnlockProvider } from "../components/unlock-provider.tsx";
import { FlatRoofPage } from "../pages/FlatRoofPage.tsx";
import { RoofSetoutPage } from "../pages/RoofSetoutPage.tsx";

function pitchedHtml() {
  return renderToStaticMarkup(
    createElement(
      MemoryRouter,
      null,
      createElement(UnlockProvider, null, createElement(RoofSetoutPage)),
    ),
  );
}

describe("locked flat set-out", () => {
  it("keeps rafter numbers and the 2D plan, and gates the isometric", () => {
    const html = renderToStaticMarkup(
      createElement(
        MemoryRouter,
        null,
        createElement(UnlockProvider, null, createElement(FlatRoofPage)),
      ),
    );
    expect(html).toContain("Calculated rafter length");
    expect(html).toContain("2D plan");
    expect(html).toContain("Isometric");
    expect(html).toContain("Annual ·");
    expect(html).toContain("Lifetime ·");
    expect(html).not.toContain("Isometric of one roof plane");
  });
});

describe("locked pitched set-out", () => {
  it("shows gable numbers and gates iso, cutting list, hip and L/T", () => {
    const html = pitchedHtml();
    expect(html).toContain("Gable roof");
    expect(html).toContain("Common rafter");
    expect(html).toContain("Birdsmouth");
    expect(html).toContain("Isometric");
    expect(html).toContain("Cutting list");
    expect(html).toContain("L-shape");
    expect(html).toContain("T-shape");
    expect(html).toContain("Annual ·");
    expect(html).toContain("Lifetime ·");
    expect(html).toContain("roof_setout_pro_unlock");
    expect(html).toContain("roof_setout_pro_annual");
    expect(html).not.toContain("Hip rafter to birdsmouth");
    expect(html).not.toContain("Valley rafter to birdsmouth");
    expect(html).not.toContain('fill="#6e746b"');
  });
});
