import { useState } from "react";
import { useUnlock } from "@/components/unlock-provider";
import { canUseTool, type PaidToolId } from "@/lib/unlock";

/**
 * Commit a paid-tool calculation: live results while unlocked; one frozen
 * successful result while the free shot remains, then the unlock CTA.
 */
export function usePaidToolCommit<T>(
  toolId: PaidToolId,
  live: T | null,
  isSuccess: (value: T) => boolean,
) {
  const { unlocked, freeUsesConsumed, consumeToolFreeUse } = useUnlock();
  const [committed, setCommitted] = useState<T | null>(null);
  const [askedToUnlock, setAskedToUnlock] = useState(false);
  const [commitError, setCommitError] = useState<string | null>(null);

  const consumed = (freeUsesConsumed[toolId] ?? 0) > 0;
  const canCalculate = canUseTool(toolId, unlocked, freeUsesConsumed);
  const displayed = unlocked ? live : committed;
  const needsCommit = !unlocked;
  const showUnlockCta = !unlocked && (askedToUnlock || consumed);

  const calculate = (emptyMessage: string) => {
    if (unlocked) return;
    if (!canCalculate) {
      setAskedToUnlock(true);
      setCommitError(null);
      return;
    }
    if (live != null && isSuccess(live)) {
      setCommitted(live);
      consumeToolFreeUse(toolId);
      setAskedToUnlock(true);
      setCommitError(null);
      return;
    }
    setCommitError(emptyMessage);
  };

  return {
    displayed,
    needsCommit,
    showUnlockCta,
    commitError,
    calculate,
  };
}
