import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";
import type { VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "../../lib/utils";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 rounded-sm text-[11px] font-medium whitespace-nowrap ring-offset-[#050505] transition-colors transition-transform focus-visible:ring-1 focus-visible:ring-zinc-400 focus-visible:outline-none active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:size-3.5 [&_svg]:shrink-0",
  {
    defaultVariants: {
      size: "default",
      variant: "default",
    },
    variants: {
      size: {
        default: "h-7.5 px-2.5",
        icon: "h-7.5 w-7.5 p-0",
        lg: "h-8.5 px-3.5",
        sm: "h-6.5 px-2 text-[10px]",
      },
      variant: {
        default: "bg-zinc-100 text-zinc-950 hover:bg-white",
        destructive:
          "border border-rose-500/25 bg-rose-950/60 text-rose-200 hover:bg-rose-900/60",
        ghost: "text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-100",
        link: "text-zinc-300 underline-offset-4 hover:underline",
        outline:
          "border border-white/10 bg-white/[0.02] text-zinc-200 hover:border-white/20 hover:bg-white/[0.06]",
        secondary: "bg-white/[0.07] text-zinc-100 hover:bg-white/[0.12]",
      },
    },
  }
);

export interface ButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = ({
  asChild = false,
  className,
  size,
  variant,
  type = "button",
  ...props
}: ButtonProps) => {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      type={asChild ? undefined : type}
      className={cn(buttonVariants({ className, size, variant }))}
      {...props}
    />
  );
};
