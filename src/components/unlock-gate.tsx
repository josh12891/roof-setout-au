import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useUnlock } from "@/components/unlock-provider";
import {
  ANNUAL_PRODUCT_ID,
  PUBLIC_PRIVACY_URL,
  PUBLIC_TERMS_URL,
  UNLOCK_PRODUCT_ID,
  type ProPlan,
} from "@/lib/unlock";

const legalLinkClass = "font-semibold text-accent underline underline-offset-2";

function PaywallLegalLinks() {
  return (
    <nav
      aria-label="Privacy and terms"
      className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm"
    >
      <a
        className={legalLinkClass}
        href={PUBLIC_PRIVACY_URL}
        target="_blank"
        rel="noopener noreferrer"
      >
        Privacy Policy
      </a>
      <a
        className={legalLinkClass}
        href={PUBLIC_TERMS_URL}
        target="_blank"
        rel="noopener noreferrer"
      >
        Terms of Use
      </a>
    </nav>
  );
}

export function UnlockActions({ compact = false }: { compact?: boolean }) {
  const { purchaseUnlock, restorePurchases, priceLabels, busy, footnote } = useUnlock();
  const [status, setStatus] = useState<string | null>(null);

  function buy(plan: ProPlan) {
    void purchaseUnlock(plan).then((result) => {
      if (!result.cancelled) setStatus(result.message || null);
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <Button
        type="button"
        size={compact ? "sm" : "lg"}
        className="w-full"
        disabled={busy}
        onClick={() => buy("annual")}
      >
        {busy ? "Working…" : `Annual · ${priceLabels.annual}`}
      </Button>
      <Button
        type="button"
        size={compact ? "sm" : "lg"}
        variant="secondary"
        className="w-full"
        disabled={busy}
        onClick={() => buy("lifetime")}
      >
        {busy ? "Working…" : `Lifetime · ${priceLabels.lifetime}`}
      </Button>
      <Button
        type="button"
        variant="outline"
        size={compact ? "sm" : "lg"}
        className="w-full"
        disabled={busy}
        onClick={() => {
          void restorePurchases().then((result) => setStatus(result.message));
        }}
      >
        Restore purchases
      </Button>
      {status ? (
        <p className="text-sm text-muted" role="status">
          {status}
        </p>
      ) : null}
      <PaywallLegalLinks />
      <p className={compact ? "text-xs leading-normal text-muted-foreground" : "text-xs leading-normal text-subtle"}>
        {footnote} Lifetime {UNLOCK_PRODUCT_ID}. Annual {ANNUAL_PRODUCT_ID} renews automatically
        each year until cancelled. Either one unlocks Pro. Privacy Policy and Terms of Use open in
        the browser.
      </p>
    </div>
  );
}

export function UnlockCta() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Unlock Pro set-out</CardTitle>
        <CardDescription>
          Annual or lifetime. Either purchase unlocks the same Pro set. Gable commons, birdsmouth
          and pitch stay free, and so does the flat roof.
        </CardDescription>
      </CardHeader>
      <ul className="mb-5 flex flex-col gap-1.5 text-sm text-ink">
        <li>— Isometric view</li>
        <li>— Cutting list and material order</li>
        <li>— Hip / valley set-out (lengths, backing, side cuts)</li>
        <li>— Creeper schedule with common difference</li>
        <li>— L / T plan junctions, including broken hips</li>
      </ul>
      <UnlockActions />
    </Card>
  );
}
