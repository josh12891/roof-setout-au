import { useEffect, useMemo } from "react";
import { Link } from "react-router";
import { InputsPanel } from "@/components/roof/inputs-panel";
import { ResultsPanel } from "@/components/roof/results-panel";
import { RoofDiagram } from "@/components/roof/roof-diagram";
import { useUnlock } from "@/components/unlock-provider";
import { calculateRoof } from "@/lib/roof/geometry";
import { selectInputs, useRoofStore } from "@/store/roof-store";
import { useShallow } from "zustand/react/shallow";

export function RoofSetoutPage() {
  const inputs = useRoofStore(useShallow(selectInputs));
  const result = useMemo(() => calculateRoof(inputs), [inputs]);
  const { unlocked, priceLabel } = useUnlock();

  useEffect(() => {
    document.body.style.removeProperty("pointer-events");
    document.documentElement.style.removeProperty("pointer-events");
  }, []);

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-5 sm:flex-row sm:items-end sm:justify-between sm:px-6">
          <div>
            <p className="text-[11px] font-medium tracking-[0.2em] text-accent uppercase">
              Australian carpentry
            </p>
            <h1 className="mt-1 font-sans text-3xl font-medium tracking-tight sm:text-4xl">
              Roof Setout
            </h1>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">
              Length, width and pitch in. Rafters to the birdsmouth, hips, valleys and creeper
              bevels out — regular 45° geometry, millimetres, AS 1684.
            </p>
          </div>
          <div className="flex flex-col items-start gap-2 sm:items-end">
            <p className="text-xs text-muted-foreground sm:text-right">
              Guidance for set-out.
              <br />
              Check AS 1684 span tables on site.
            </p>
            <div className="flex flex-wrap items-center gap-2 text-xs no-print">
              {unlocked ? (
                <span className="rounded-full bg-ok-soft px-2.5 py-1 font-medium text-ok">
                  Pro unlocked
                </span>
              ) : (
                <a href="#cuts" className="rounded-full bg-accent px-2.5 py-1 font-medium text-accent-foreground">
                  Pro · {priceLabel}
                </a>
              )}
              <Link to="/about" className="font-medium text-accent underline-offset-2 hover:underline">
                About
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
        <InputsPanel />
        <div className="flex min-w-0 flex-col gap-6">
          <RoofDiagram inputs={inputs} result={result} />
          <div id="cuts">
            <ResultsPanel inputs={inputs} result={result} />
          </div>
        </div>
      </main>
    </div>
  );
}
