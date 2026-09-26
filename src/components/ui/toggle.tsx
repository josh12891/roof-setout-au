import * as TogglePrimitive from "@radix-ui/react-toggle";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "@/lib/utils";

const toggleVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-[var(--radius-sm)] text-sm font-medium transition-[background-color,color] duration-[var(--motion-quick)] hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground [&_svg]:size-4",
  {
    variants: {
      variant: {
        default: "bg-transparent",
        outline: "border border-border bg-surface",
      },
      size: {
        default: "h-11 px-3 min-w-11",
        sm: "h-9 px-2.5 text-xs",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

const Toggle = React.forwardRef<
  React.ComponentRef<typeof TogglePrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof TogglePrimitive.Root> &
    VariantProps<typeof toggleVariants>
>(({ className, variant, size, ...props }, ref) => (
  <TogglePrimitive.Root
    ref={ref}
    className={cn(toggleVariants({ variant, size, className }))}
    {...props}
  />
));
Toggle.displayName = TogglePrimitive.Root.displayName;

export { Toggle, toggleVariants };
