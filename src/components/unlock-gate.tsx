import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useUnlock } from "@/components/unlock-provider";
import { UNLOCK_PRODUCT_ID } from "@/lib/unlock";

export function UnlockCta({
  afterWin = false,
  toolLabel,
}: {
  afterWin?: boolean;
  toolLabel?: string;
}) {
  const { purchaseUnlock, restorePurchases, priceLabel, busy, footnote } = useUnlock();
  const [status, setStatus] = useState<string | null>(null);
  const winLine = toolLabel
    ? `That's your free ${toolLabel}. Unlock Pro once for hip/valley, creepers and skillion.`
    : "That's your free calculation. Unlock Pro once for hip/valley, creepers and skillion.";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Unlock Pro set-out</CardTitle>
        <CardDescription>
          {afterWin
            ? winLine
            : `One-time ${priceLabel}. Unlocks hip/valley, creepers and skillion forever.`}
        </CardDescription>
      </CardHeader>
      <ul className="mb-5 flex flex-col gap-1.5 text-sm text-ink">
        <li>— Hip and valley lengths, backing and side cuts</li>
        <li>— Creeper (jack) reductions and plate marks</li>
        <li>— Skillion / lean-to and advanced junctions</li>
      </ul>
      <p className="mb-5 text-sm text-muted">
        Common rafter, pitch and birdsmouth stay free on this device.
      </p>
      <div className="flex flex-col gap-2">
        <Button
          type="button"
          size="lg"
          className="w-full"
          disabled={busy}
          onClick={() => {
            void purchaseUnlock().then((result) => {
              if (!result.cancelled) setStatus(result.message || null);
            });
          }}
        >
          {busy ? "Working…" : `Unlock Pro · ${priceLabel}`}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="w-full"
          disabled={busy}
          onClick={() => {
            void restorePurchases().then((result) => setStatus(result.message));
          }}
        >
          Restore purchases
        </Button>
      </div>
      {status ? (
        <p className="mt-3 text-sm text-muted" role="status">
          {status}
        </p>
      ) : null}
      <p className="mt-4 text-xs leading-normal text-subtle">
        {footnote} Product id {UNLOCK_PRODUCT_ID}.
      </p>
    </Card>
  );
}
