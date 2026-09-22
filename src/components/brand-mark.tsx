import { cn } from "@/lib/utils";

export function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={cn("text-primary", className)}
      aria-hidden="true"
    >
      <rect x="2" y="2" width="28" height="28" rx="6" fill="currentColor" />
      <path
        d="M6 22 L16 8 L26 22 Z"
        fill="none"
        stroke="var(--color-primary-fg)"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M16 8 V22"
        fill="none"
        stroke="var(--color-primary-fg)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function CommonRafterIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 18 L12 6 L21 18" />
      <path d="M7 18 V14 H10" />
      <path d="M12 6 V18" />
    </svg>
  );
}

export function HipIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 19 L12 5 L21 19" />
      <path d="M12 5 L12 19" />
      <path d="M7 19 L12 12 L17 19" />
    </svg>
  );
}

export function CreeperIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 20 L12 6 L20 20" />
      <path d="M12 6 L20 20" />
      <path d="M8 20 L12 12" />
      <path d="M11 20 L14 14" />
      <path d="M14 20 L16 16" />
    </svg>
  );
}

export function SkillionIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 18 L21 8" />
      <path d="M3 18 V14 H6" />
      <path d="M21 8 V14" />
      <path d="M3 18 H21" />
    </svg>
  );
}
