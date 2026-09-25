import type { ReactNode } from "react";
import { Link } from "react-router";
import { ArrowLeft } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";

export function AppShell({
  title,
  subtitle,
  back,
  children,
}: {
  title: string;
  subtitle?: string;
  back?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto min-h-dvh w-full max-w-3xl px-4 pb-16 pt-6 sm:px-6">
      <header className="mb-6 flex items-start gap-3">
        {back ? (
          <Link
            to="/"
            aria-label="Back to roof set-out"
            className="mt-0.5 flex size-12 shrink-0 items-center justify-center rounded-lg border border-border bg-surface text-ink shadow-sheet transition-transform duration-150 ease-out active:scale-[0.96]"
          >
            <ArrowLeft className="size-5" />
          </Link>
        ) : (
          <BrandMark className="mt-0.5 size-12" />
        )}
        <div className="min-w-0 pt-1">
          <p className="font-display text-xs font-semibold uppercase tracking-display text-muted">
            AU Roof Carpenter
          </p>
          <h1 className="font-display text-3xl font-semibold leading-tight tracking-tight text-ink">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-1 text-sm text-muted">{subtitle}</p>
          ) : null}
        </div>
      </header>
      {children}
    </div>
  );
}
