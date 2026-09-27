import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  billingFootnote,
  catalogPriceLabels,
  createUnlockBilling,
  listenForUnlockTransactions,
  type BillingActionResult,
  type BillingKind,
  type PriceLabels,
} from "@/lib/billing";
import {
  detectDistribution,
  grantsComplimentaryUnlock,
  type DistributionChannel,
} from "@/lib/distribution";
import {
  canUseTool,
  readUnlockedFlag,
  type PaidToolId,
  type ProPlan,
  type ToolId,
} from "@/lib/unlock";

const listeners = new Set<() => void>();

function subscribe(onStoreChange: () => void) {
  listeners.add(onStoreChange);
  return () => {
    listeners.delete(onStoreChange);
  };
}

function emit() {
  listeners.forEach((listener) => listener());
}

function getUnlockSnapshot() {
  return readUnlockedFlag();
}

function getUnlockServerSnapshot() {
  return readUnlockedFlag();
}

type UnlockContextValue = {
  unlocked: boolean;
  purchased: boolean;
  complimentaryUnlock: boolean;
  distributionChannel: DistributionChannel;
  canCalculateTool: (id: ToolId) => boolean;
  /** Pro drawing or numbers. Locked until lifetime or annual purchase (or TestFlight). */
  isSectionOpen: (id: PaidToolId) => boolean;
  kind: BillingKind;
  priceLabels: PriceLabels;
  busy: boolean;
  footnote: string;
  purchaseUnlock: (plan: ProPlan) => Promise<BillingActionResult>;
  restorePurchases: () => Promise<BillingActionResult>;
};

const UnlockContext = createContext<UnlockContextValue | null>(null);

export function UnlockProvider({ children }: { children: ReactNode }) {
  const billing = useMemo(() => createUnlockBilling(), []);
  const purchased = useSyncExternalStore(subscribe, getUnlockSnapshot, getUnlockServerSnapshot);
  const [distributionChannel, setDistributionChannel] = useState<DistributionChannel>("unknown");
  const complimentaryUnlock = grantsComplimentaryUnlock(distributionChannel);
  const unlocked = purchased || complimentaryUnlock;
  const [kind, setKind] = useState<BillingKind>("stub");
  const [priceLabels, setPriceLabels] = useState<PriceLabels>(catalogPriceLabels);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void detectDistribution().then((snapshot) => {
      if (!cancelled) setDistributionChannel(snapshot.channel);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    let stopListening: (() => void) | undefined;
    void (async () => {
      const nextKind = await billing.resolveKind();
      const nextPrices = await billing.getPriceLabels();
      await billing.refreshFromStore();
      stopListening = await listenForUnlockTransactions(() => emit());
      if (cancelled) {
        stopListening();
        return;
      }
      setKind(nextKind);
      setPriceLabels(nextPrices);
      emit();
    })();
    return () => {
      cancelled = true;
      stopListening?.();
    };
  }, [billing]);

  const purchaseUnlock = useCallback(
    async (plan: ProPlan) => {
      setBusy(true);
      try {
        const result = await billing.purchase(plan);
        emit();
        return result;
      } finally {
        setBusy(false);
      }
    },
    [billing],
  );

  const restorePurchases = useCallback(async () => {
    setBusy(true);
    try {
      const result = await billing.restore();
      emit();
      return result;
    } finally {
      setBusy(false);
    }
  }, [billing]);

  const canCalculateTool = useCallback((id: ToolId) => canUseTool(id, unlocked), [unlocked]);

  const isSectionOpen = useCallback((_id: PaidToolId) => unlocked, [unlocked]);

  const footnote = billingFootnote(kind, billing.platformName);

  const value = useMemo(
    () => ({
      unlocked,
      purchased,
      complimentaryUnlock,
      distributionChannel,
      canCalculateTool,
      isSectionOpen,
      kind,
      priceLabels,
      busy,
      footnote,
      purchaseUnlock,
      restorePurchases,
    }),
    [
      busy,
      canCalculateTool,
      complimentaryUnlock,
      distributionChannel,
      isSectionOpen,
      footnote,
      kind,
      priceLabels,
      purchased,
      purchaseUnlock,
      restorePurchases,
      unlocked,
    ],
  );

  return <UnlockContext.Provider value={value}>{children}</UnlockContext.Provider>;
}

export function useUnlock() {
  const ctx = useContext(UnlockContext);
  if (!ctx) {
    throw new Error("useUnlock must be used within UnlockProvider");
  }
  return ctx;
}
