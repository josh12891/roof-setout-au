import { Link } from "react-router";

export function RoofChoicePage() {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-3xl flex-col gap-3 px-4 py-5 sm:flex-row sm:items-end sm:justify-between sm:px-6">
          <div>
            <p className="text-[11px] font-medium tracking-[0.2em] text-accent uppercase">
              Australian carpentry
            </p>
            <h1 className="mt-1 font-sans text-3xl font-medium tracking-tight sm:text-4xl">
              AU Roof Carpenter
            </h1>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">
              Flat roof or pitched roof. Pick one, then set it out.
            </p>
          </div>
          <Link to="/about" className="text-xs font-medium text-accent underline-offset-2 hover:underline">
            About
          </Link>
        </div>
      </header>

      <main className="mx-auto grid max-w-3xl gap-4 px-4 py-6 sm:px-6">
        <Link
          to="/flat"
          className="rounded-[var(--radius-xl)] border border-border bg-surface p-6 shadow-sheet transition-[transform,border-color] duration-[var(--motion-quick)] ease-[var(--ease-out)] active:scale-[0.99] hover:border-accent"
        >
          <p className="text-[11px] font-medium tracking-[0.16em] text-muted-foreground uppercase">
            One plane
          </p>
          <h2 className="mt-1 text-2xl font-medium tracking-tight">Flat roof</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Length, width and pitch. Rafter length is calculated from the plan. No hips, valleys or
            wings.
          </p>
        </Link>
        <Link
          to="/pitched"
          className="rounded-[var(--radius-xl)] border border-border bg-surface p-6 shadow-sheet transition-[transform,border-color] duration-[var(--motion-quick)] ease-[var(--ease-out)] active:scale-[0.99] hover:border-accent"
        >
          <p className="text-[11px] font-medium tracking-[0.16em] text-muted-foreground uppercase">
            Roof Setout
          </p>
          <h2 className="mt-1 text-2xl font-medium tracking-tight">Pitched roof</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Hips, valleys, creepers and L/T junctions on the one set-out screen, with the cutting
            list.
          </p>
        </Link>
      </main>
    </div>
  );
}
