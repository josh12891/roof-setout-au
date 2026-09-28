import { Link } from "react-router";
import { AppShell } from "@/components/app-shell";
import { UnlockCta } from "@/components/unlock-gate";
import { useUnlock } from "@/components/unlock-provider";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TESTFLIGHT_SCREENSHOT_NOTE } from "@/lib/distribution";
import { ANNUAL_PRODUCT_ID, PUBLIC_PRIVACY_URL, UNLOCK_PRODUCT_ID } from "@/lib/unlock";

export function AboutPage() {
  const { unlocked, distributionChannel, restorePurchases, busy, priceLabels } = useUnlock();

  return (
    <AppShell title="About" subtitle="Metric set-out — rafters, hips, creepers" back>
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>AU Roof Carpenter</CardTitle>
          <CardDescription>
            Metric set-out — rafters, hips, creepers. Published by Australian Dynamics.
          </CardDescription>
        </CardHeader>
        <div className="space-y-3 text-sm text-muted">
          <p>
            Choose flat or pitched first. Flat is one plane — length, width and pitch, with the
            rafter length calculated from the plan. Pitched gable commons, birdsmouth and pitch are
            free. Isometric, cutting list, and hip / valley / creeper / L·T set-out need Pro. No
            login, no cloud database, no ads. Calculations stay on this device.
          </p>
          <p>
            Bundle id <code className="text-ink">com.josh12891.roofsetout</code>. Lifetime{" "}
            <code className="text-ink">{UNLOCK_PRODUCT_ID}</code> ({priceLabels.lifetime}). Annual{" "}
            <code className="text-ink">{ANNUAL_PRODUCT_ID}</code> ({priceLabels.annual}). Either
            purchase unlocks the same Pro set.
          </p>
          <p>
            Support:{" "}
            <a className="font-semibold text-primary" href="mailto:australiancomsnetwork@gmail.com">
              australiancomsnetwork@gmail.com
            </a>
          </p>
        </div>
      </Card>

      {unlocked ? (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>Pro unlocked</CardTitle>
            <CardDescription>
              Isometric, cutting list, and hip / valley / creeper / L·T set-out are open on this
              screen, offline.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="mb-4 space-y-3">
          {distributionChannel === "testflight" ? (
            <p className="text-sm text-muted">{TESTFLIGHT_SCREENSHOT_NOTE}</p>
          ) : null}
          <UnlockCta />
        </div>
      )}

      <div className="flex flex-col gap-2">
        <Button
          type="button"
          variant="outline"
          size="lg"
          disabled={busy}
          onClick={() => {
            void restorePurchases();
          }}
        >
          Restore purchases
        </Button>
        <Button asChild variant="ghost" size="lg">
          <Link to="/privacy">Privacy policy</Link>
        </Button>
        <a
          className="text-center text-sm text-muted underline-offset-2 hover:underline"
          href={PUBLIC_PRIVACY_URL}
          target="_blank"
          rel="noreferrer"
        >
          Public privacy URL (GitHub Pages)
        </a>
      </div>
    </AppShell>
  );
}

export function PrivacyPage() {
  return (
    <AppShell title="Privacy" subtitle="What stays on your device." back>
      <Card>
        <CardHeader>
          <CardTitle>On-device only</CardTitle>
          <CardDescription>
            AU Roof Carpenter does not create accounts or sync measurements to our servers.
          </CardDescription>
        </CardHeader>
        <div className="space-y-3 text-sm text-muted">
          <p>
            Lengths, pitches and unlock flags stay on this device. Optional Pro unlock is billed by
            Apple or Google — we never see your card number.
          </p>
          <p>
            Full policy (for store listings):{" "}
            <a className="font-semibold text-primary" href="./privacy.html">
              privacy.html
            </a>{" "}
            ·{" "}
            <a
              className="font-semibold text-primary"
              href={PUBLIC_PRIVACY_URL}
              target="_blank"
              rel="noreferrer"
            >
              GitHub Pages
            </a>
          </p>
          <p>
            Contact:{" "}
            <a className="font-semibold text-primary" href="mailto:australiancomsnetwork@gmail.com">
              australiancomsnetwork@gmail.com
            </a>
          </p>
        </div>
      </Card>
    </AppShell>
  );
}
