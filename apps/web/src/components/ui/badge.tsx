import { cva } from "class-variance-authority";
import type { VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "../../lib/utils";

export const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-xs border px-1.5 py-0.5 font-mono text-[9.5px] font-semibold tracking-[0.06em] uppercase transition-colors",
  {
    defaultVariants: {
      variant: "default",
    },
    variants: {
      variant: {
        default: "border-transparent bg-zinc-100 text-zinc-950",
        destructive: "border-rose-500/25 bg-rose-500/12 text-rose-300",
        info: "border-sky-500/25 bg-sky-500/12 text-sky-300",
        outline: "border-white/[0.12] text-zinc-300",
        secondary: "border-white/[0.07] bg-white/[0.05] text-zinc-400",
        success: "border-emerald-500/25 bg-emerald-500/12 text-emerald-300",
        warning: "border-amber-500/25 bg-amber-500/12 text-amber-300",
      },
    },
  }
);

export interface BadgeProps
  extends
    React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export const Badge = ({ className, variant, ...props }: BadgeProps) => (
  <div className={cn(badgeVariants({ variant }), className)} {...props} />
);
