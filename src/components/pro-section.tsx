import type { ReactNode } from "react";
import { UnlockActions } from "@/components/unlock-gate";
import { useUnlock } from "@/components/unlock-provider";
import type { PaidToolId } from "@/lib/unlock";

const COPY: Record<PaidToolId, { title: string; detail: string }> = {
  hip: {
    title: "Hip set-out",
    detail: "Hip length, plumb, cheek, backing and the hip set-out drawing unlock with Pro.",
  },
  creeper: {
    title: "Creeper schedule",
    detail: "Common difference, hip jacks and the cutting list unlock with Pro.",
  },
  junction: {
    title: "L / T junction",
    detail: "Valley lengths, broken hips and the intersecting-roof counts unlock with Pro.",
  },
  isometric: {
    title: "Isometric",
    detail: "The 3D roof unlocks with Pro. Plan and section stay available for a gable.",
  },
  cutting: {
    title: "Cutting list",
    detail: "Member counts, lengths to the birdsmouth and stock sizes unlock with Pro.",
  },
};

export function ProSection({
  tool,
  title,
  detail,
  children,
}: {
  tool: PaidToolId;
  title?: string;
  detail?: string;
  children?: ReactNode;
}) {
  const { isSectionOpen } = useUnlock();
  const open = isSectionOpen(tool);
  const heading = title ?? COPY[tool].title;
  const body = detail ?? COPY[tool].detail;

  if (open) {
    return <div className="flex min-w-0 flex-col gap-3">{children}</div>;
  }

  return (
    <section className="flex h-full min-w-0 flex-col gap-3 rounded-[var(--radius-lg)] border border-accent/30 bg-ok-soft px-4 py-4">
      <div>
        <p className="text-[11px] font-medium tracking-[0.14em] text-accent uppercase">Pro</p>
        <h3 className="mt-1 text-base font-medium tracking-tight">{heading}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{body}</p>
      </div>
      <UnlockActions compact />
    </section>
  );
}
