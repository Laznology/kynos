import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";
import type { VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "../../lib/utils";

export const buttonVariants = cva(
  "focus-visible:ring-ring inline-flex items-center justify-center gap-1.5 rounded-full text-[11px] font-semibold whitespace-nowrap transition-colors transition-transform focus-visible:ring-2 focus-visible:outline-none active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:size-3.5 [&_svg]:shrink-0",
  {
    defaultVariants: {
      size: "default",
      variant: "default",
    },
    variants: {
      size: {
        default: "h-7.5 px-3.5",
        icon: "h-7.5 w-7.5 p-0",
        lg: "h-9 px-4.5 text-xs",
        sm: "h-6.5 px-2.5 text-[10px]",
      },
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-sm hover:bg-[#0457cb]",
        commerce:
          "bg-primary text-primary-foreground shadow-sm hover:bg-[#0457cb]",
        marketing: "bg-foreground text-background hover:opacity-90",
        destructive:
          "border-destructive/30 bg-destructive text-destructive-foreground hover:bg-destructive/90 border",
        ghost:
          "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        outline:
          "border-border text-foreground hover:bg-accent hover:text-accent-foreground border bg-transparent",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
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
