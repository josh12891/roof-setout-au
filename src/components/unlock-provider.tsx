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
  createUnlockBilling,
  listenForUnlockTransactions,
  type BillingActionResult,
  type BillingKind,
} from "@/lib/billing";
import {
  detectDistribution,
  grantsComplimentaryUnlock,
  type DistributionChannel,
} from "@/lib/distribution";
import {
  canUseTool,
  consumeFreeUse,
  emptyFreeUseCounts,
  readFreeUsesConsumed,
  readUnlockedFlag,
  UNLOCK_PRICE_LABEL,
  type FreeUseCounts,
  type PaidToolId,
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
  return false;
}

function snapshotFreeUses(counts: FreeUseCounts): string {
  return `${counts.hip}:${counts.creeper}:${counts.junction}`;
}

function parseFreeUsesSnapshot(raw: string): FreeUseCounts {
  const [hipRaw, creeperRaw, junctionRaw] = raw.split(":");
  const hip = Number(hipRaw);
  const creeper = Number(creeperRaw);
  const junction = Number(junctionRaw);
  return {
    hip: Number.isFinite(hip) ? hip : 0,
    creeper: Number.isFinite(creeper) ? creeper : 0,
    junction: Number.isFinite(junction) ? junction : 0,
  };
}

function getFreeUsesSnapshot() {
  return snapshotFreeUses(readFreeUsesConsumed());
}

function getFreeUsesServerSnapshot() {
  return snapshotFreeUses(emptyFreeUseCounts());
}

type UnlockContextValue = {
  unlocked: boolean;
  purchased: boolean;
  complimentaryUnlock: boolean;
  distributionChannel: DistributionChannel;
  freeUsesConsumed: FreeUseCounts;
  canCalculateTool: (id: ToolId) => boolean;
  consumeToolFreeUse: (id: PaidToolId) => boolean;
  /** Paid section is visible: purchased, TestFlight, or this session's one preview. */
  isSectionOpen: (id: PaidToolId) => boolean;
  /** Spend the one free preview and keep that section open until the app reloads. */
  previewSection: (id: PaidToolId) => boolean;
  kind: BillingKind;
  priceLabel: string;
  busy: boolean;
  footnote: string;
  purchaseUnlock: () => Promise<BillingActionResult>;
  restorePurchases: () => Promise<BillingActionResult>;
};

const UnlockContext = createContext<UnlockContextValue | null>(null);

export function UnlockProvider({ children }: { children: ReactNode }) {
  const billing = useMemo(() => createUnlockBilling(), []);
  const purchased = useSyncExternalStore(subscribe, getUnlockSnapshot, getUnlockServerSnapshot);
  const [distributionChannel, setDistributionChannel] = useState<DistributionChannel>("unknown");
  const complimentaryUnlock = grantsComplimentaryUnlock(distributionChannel);
  const unlocked = purchased || complimentaryUnlock;
  const freeUsesKey = useSyncExternalStore(
    subscribe,
    getFreeUsesSnapshot,
    getFreeUsesServerSnapshot,
  );
  const freeUsesConsumed = useMemo(() => parseFreeUsesSnapshot(freeUsesKey), [freeUsesKey]);
  const [kind, setKind] = useState<BillingKind>("stub");
  const [priceLabel, setPriceLabel] = useState(UNLOCK_PRICE_LABEL);
  const [busy, setBusy] = useState(false);
  const [sessionPreview, setSessionPreview] = useState<Partial<Record<PaidToolId, boolean>>>({});

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
      const nextPrice = await billing.getPriceLabel();
      await billing.refreshFromStore();
      stopListening = await listenForUnlockTransactions(() => emit());
      if (cancelled) {
        stopListening();
        return;
      }
      setKind(nextKind);
      setPriceLabel(nextPrice);
      emit();
    })();
    return () => {
      cancelled = true;
      stopListening?.();
    };
  }, [billing]);

  const purchaseUnlock = useCallback(async () => {
    setBusy(true);
    try {
      const result = await billing.purchase();
      emit();
      return result;
    } finally {
      setBusy(false);
    }
  }, [billing]);

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

  const canCalculateTool = useCallback(
    (id: ToolId) => canUseTool(id, unlocked, freeUsesConsumed),
    [freeUsesConsumed, unlocked],
  );

  const consumeToolFreeUse = useCallback((id: PaidToolId) => {
    const consumed = consumeFreeUse(id);
    emit();
    return consumed;
  }, []);

  const isSectionOpen = useCallback(
    (id: PaidToolId) => unlocked || Boolean(sessionPreview[id]),
    [sessionPreview, unlocked],
  );

  const previewSection = useCallback(
    (id: PaidToolId) => {
      if (unlocked || sessionPreview[id]) return true;
      if (!canUseTool(id, false, freeUsesConsumed)) return false;
      const consumed = consumeFreeUse(id);
      emit();
      if (!consumed) return false;
      setSessionPreview((current) => ({ ...current, [id]: true }));
      return true;
    },
    [freeUsesConsumed, sessionPreview, unlocked],
  );

  const footnote = billingFootnote(kind, billing.platformName);

  const value = useMemo(
    () => ({
      unlocked,
      purchased,
      complimentaryUnlock,
      distributionChannel,
      freeUsesConsumed,
      canCalculateTool,
      consumeToolFreeUse,
      isSectionOpen,
      previewSection,
      kind,
      priceLabel,
      busy,
      footnote,
      purchaseUnlock,
      restorePurchases,
    }),
    [
      busy,
      canCalculateTool,
      complimentaryUnlock,
      consumeToolFreeUse,
      distributionChannel,
      isSectionOpen,
      previewSection,
      footnote,
      freeUsesConsumed,
      kind,
      priceLabel,
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
