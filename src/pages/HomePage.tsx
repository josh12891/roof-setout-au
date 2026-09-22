import { Link } from "react-router";
import { ArrowRight, Lock } from "lucide-react";
import {
  BrandMark,
  CommonRafterIcon,
  CreeperIcon,
  HipIcon,
  SkillionIcon,
} from "@/components/brand-mark";
import { Badge } from "@/components/ui/badge";
import { useUnlock } from "@/components/unlock-provider";
import { paidToolHomeLabel, type ToolId } from "@/lib/unlock";
import { cn } from "@/lib/utils";

const TOOLS = [
  {
    id: "common" as const satisfies ToolId,
    to: "/common" as const,
    title: "Common rafter",
    copy: "Pitch, slope length and birdsmouth on the pattern rafter. Free forever.",
    icon: CommonRafterIcon,
  },
  {
    id: "hip" as const satisfies ToolId,
    to: "/hip" as const,
    title: "Hip / valley",
    copy: "Equal-pitch hip and valley lengths, backing bevel and side cuts.",
    icon: HipIcon,
  },
  {
    id: "creeper" as const satisfies ToolId,
    to: "/creeper" as const,
    title: "Creepers",
    copy: "Jack reductions, plate marks and lengths along the hip.",
    icon: CreeperIcon,
  },
  {
    id: "skillion" as const satisfies ToolId,
    to: "/skillion" as const,
    title: "Skillion / junctions",
    copy: "Lean-to rafters and advanced junctions (unequal pitch, skillion into pitch).",
    icon: SkillionIcon,
  },
];

export function HomePage() {
  const { unlocked, freeUsesConsumed } = useUnlock();

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col px-4 py-8 sm:px-6">
      <header className="mb-8">
        <div className="mb-5 flex items-center gap-3">
          <BrandMark className="size-12 animate-[fade-up_0.5s_var(--ease-out)_both]" />
          <p className="font-display text-xs font-semibold uppercase tracking-display text-muted">
            Australian Dynamics
          </p>
        </div>
        <h1 className="font-display text-4xl font-semibold leading-tight tracking-tight text-ink animate-[fade-up_0.55s_var(--ease-out)_0.05s_both] sm:text-5xl">
          Roof Setout AU
        </h1>
        <p className="mt-3 max-w-md text-base leading-normal text-muted animate-[fade-up_0.55s_var(--ease-out)_0.1s_both]">
          Common rafters, hips, creepers and skillions — metric set-out for the tape, offline on site.
        </p>
        <p className="mt-2 max-w-md text-sm leading-normal text-subtle">
          Common rafter / pitch / birdsmouth stay free. Hip, creeper and skillion each include one free
          calculation; unlock Pro forever for $39.99 AUD.
        </p>
      </header>

      <nav aria-label="Tools" className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {TOOLS.map((tool, index) => {
          const badge = paidToolHomeLabel(tool.id, unlocked, freeUsesConsumed);
          return (
            <Link
              key={tool.to}
              to={tool.to}
              style={{ animationDelay: `${120 + index * 40}ms` }}
              className={cn(
                "group flex items-stretch gap-4 rounded-xl border border-border bg-surface p-4 shadow-sheet",
                "animate-[fade-up_0.5s_var(--ease-out)_both]",
                "transition-[transform,box-shadow] duration-150 ease-out active:scale-[0.98]",
              )}
            >
              <div className="flex size-14 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-fg">
                <tool.icon className="size-6" />
              </div>
              <div className="min-w-0 flex-1 py-0.5">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-display text-xl font-semibold text-ink">{tool.title}</h2>
                  {badge === "try-once" ? <Badge>Try once</Badge> : null}
                  {badge === "unlock" ? (
                    <Badge variant="warn" className="gap-1">
                      <Lock className="size-3" /> Pro
                    </Badge>
                  ) : null}
                  {tool.id === "common" ? <Badge variant="ok">Free</Badge> : null}
                </div>
                <p className="mt-1 text-sm leading-snug text-muted">{tool.copy}</p>
              </div>
              <ArrowRight className="mt-1 size-5 shrink-0 text-subtle transition-transform duration-150 group-active:translate-x-0.5" />
            </Link>
          );
        })}
      </nav>

      <footer className="mt-auto flex flex-wrap gap-x-4 gap-y-2 pt-10 text-sm text-muted">
        <Link className="underline-offset-2 hover:underline" to="/about">
          About
        </Link>
        <Link className="underline-offset-2 hover:underline" to="/privacy">
          Privacy
        </Link>
        <a
          className="underline-offset-2 hover:underline"
          href="mailto:australiancomsnetwork@gmail.com"
        >
          Support
        </a>
      </footer>
    </div>
  );
}
