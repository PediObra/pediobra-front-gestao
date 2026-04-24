import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary/15 text-[oklch(0.35_0.1_60)] ring-1 ring-inset ring-primary/20 dark:bg-primary/12 dark:text-[oklch(0.84_0.15_78)] dark:ring-primary/35",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground",
        destructive:
          "border-transparent bg-destructive/10 text-destructive ring-1 ring-inset ring-destructive/20",
        success:
          "border-transparent bg-[color-mix(in_oklch,var(--success)_15%,transparent)] text-[color-mix(in_oklch,var(--success)_85%,black)] ring-1 ring-inset ring-[color-mix(in_oklch,var(--success)_30%,transparent)]",
        warning:
          "border-transparent bg-[color-mix(in_oklch,var(--warning)_15%,transparent)] text-[color-mix(in_oklch,var(--warning)_65%,black)] ring-1 ring-inset ring-[color-mix(in_oklch,var(--warning)_30%,transparent)] dark:bg-[color-mix(in_oklch,var(--warning)_16%,transparent)] dark:text-[oklch(0.86_0.16_85)] dark:ring-[color-mix(in_oklch,var(--warning)_38%,transparent)]",
        outline: "text-foreground",
        muted:
          "border-transparent bg-muted text-muted-foreground ring-1 ring-inset ring-border",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
