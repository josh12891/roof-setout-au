import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { useUnlock } from "@/components/unlock-provider";
import { UNLOCK_PRODUCT_ID, type PaidToolId } from "@/lib/unlock";

const COPY: Record<PaidToolId, { title: string; detail: string }> = {
  hip: {
    title: "Hip set-out",
    detail:
      "Hip length, plumb, cheek, backing and the hip set-out drawing. Stays on this screen.",
  },
  creeper: {
    title: "Creeper schedule",
    detail: "Common difference, hip jacks and the cutting list.",
  },
  junction: {
    title: "L / T junction",
    detail: "Valley lengths and the intersecting-roof counts.",
  },
};

export function ProSection({
  tool,
  title,
  detail,
  note = false,
  children,
}: {
  tool: PaidToolId;
  title?: string;
  detail?: string;
  note?: boolean;
  children?: ReactNode;
}) {
  const {
    unlocked,
    isSectionOpen,
    previewSection,
    canCalculateTool,
    priceLabel,
    busy,
    footnote,
    purchaseUnlock,
    restorePurchases,
  } = useUnlock();
  const [status, setStatus] = useState<string | null>(null);
  const open = isSectionOpen(tool);
  const heading = title ?? COPY[tool].title;
  const body = detail ?? COPY[tool].detail;

  if (open) {
    return (
      <div className="flex min-w-0 flex-col gap-3">
        {children}
        {!unlocked && note ? (
          <p className="text-xs text-muted-foreground">
            Preview stays while this app is open. Unlock Pro ({priceLabel}) to keep it next time.
          </p>
        ) : null}
      </div>
    );
  }

  const canPreview = canCalculateTool(tool);

  return (
    <section className="flex h-full min-w-0 flex-col gap-3 rounded-[var(--radius-lg)] border border-accent/30 bg-ok-soft px-4 py-4">
      <div>
        <p className="text-[11px] font-medium tracking-[0.14em] text-accent uppercase">Pro</p>
        <h3 className="mt-1 text-base font-medium tracking-tight">{heading}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{body}</p>
      </div>
      <div className="flex flex-col gap-2">
        {canPreview ? (
          <Button type="button" variant="accent" size="sm" onClick={() => previewSection(tool)}>
            Preview once
          </Button>
        ) : (
          <p className="text-sm text-foreground">
            That free preview is used. Unlock Pro to open this section again.
          </p>
        )}
        <Button
          type="button"
          size="sm"
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
          size="sm"
          disabled={busy}
          onClick={() => {
            void restorePurchases().then((result) => setStatus(result.message));
          }}
        >
          Restore purchases
        </Button>
      </div>
      {status ? (
        <p className="text-sm text-muted-foreground" role="status">
          {status}
        </p>
      ) : null}
      <p className="text-xs leading-normal text-muted-foreground">
        {footnote} Product id {UNLOCK_PRODUCT_ID}.
      </p>
    </section>
  );
}
