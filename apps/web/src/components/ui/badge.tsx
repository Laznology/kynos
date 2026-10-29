import { cva } from "class-variance-authority";
import type { VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "../../lib/utils";

export const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[9.5px] font-semibold tracking-[0.04em] uppercase transition-colors",
  {
    defaultVariants: {
      variant: "default",
    },
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        destructive:
          "border-destructive/30 bg-destructive/15 text-destructive",
        info: "border-primary/30 bg-primary/15 text-primary",
        outline: "border-border text-foreground",
        secondary: "border-border bg-secondary text-secondary-foreground",
        success: "border-emerald-500/30 bg-emerald-500/15 text-emerald-400",
        warning: "border-amber-500/30 bg-amber-500/15 text-amber-400",
      },
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export const Badge = ({ className, variant, ...props }: BadgeProps) => (
  <div className={cn(badgeVariants({ variant }), className)} {...props} />
);
