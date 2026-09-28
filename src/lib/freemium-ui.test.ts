import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import { ProSection } from "../components/pro-section.tsx";
import { UnlockCta } from "../components/unlock-gate.tsx";
import { UnlockProvider } from "../components/unlock-provider.tsx";
import { PUBLIC_PRIVACY_URL, PUBLIC_TERMS_URL } from "../lib/unlock.ts";
import { AboutPage } from "../pages/AboutPage.tsx";
import { FlatRoofPage } from "../pages/FlatRoofPage.tsx";
import { RoofSetoutPage } from "../pages/RoofSetoutPage.tsx";

function expectPaywallLegal(html: string) {
  expect(html).toContain("Privacy Policy");
  expect(html).toContain("Terms of Use");
  expect(html).toContain(`href="${PUBLIC_PRIVACY_URL}"`);
  expect(html).toContain(`href="${PUBLIC_TERMS_URL}"`);
  expect(html).toContain('target="_blank"');
  expect(html).toContain("$14.99 AUD/year");
  expect(html).toContain("$39.99 AUD");
  expect(html).toContain("renews automatically");
  expect(html).toContain("open in the browser");
}

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
    expectPaywallLegal(html);
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
    expectPaywallLegal(html);
    expect(html).toContain("roof_setout_pro_unlock");
    expect(html).toContain("roof_setout_pro_annual");
    expect(html).not.toContain("Hip rafter to birdsmouth");
    expect(html).not.toContain("Valley rafter to birdsmouth");
    expect(html).not.toContain('fill="#6e746b"');
  });
});

describe("paywall legal links", () => {
  it("shows Privacy Policy and Terms of Use on the about unlock card and inline Pro sections", () => {
    const about = renderToStaticMarkup(
      createElement(
        MemoryRouter,
        null,
        createElement(UnlockProvider, null, createElement(AboutPage)),
      ),
    );
    expect(about).toContain("Unlock Pro set-out");
    expectPaywallLegal(about);

    const inline = renderToStaticMarkup(
      createElement(UnlockProvider, null, createElement(ProSection, { tool: "hip" }, null)),
    );
    expect(inline).toContain("Hip set-out");
    expectPaywallLegal(inline);

    const cta = renderToStaticMarkup(
      createElement(UnlockProvider, null, createElement(UnlockCta)),
    );
    expect(cta).toContain("Unlock Pro set-out");
    expectPaywallLegal(cta);
  });
});
