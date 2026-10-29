import * as React from "react";

import { cn } from "../../lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = ({ className, type = "text", ...props }: InputProps) => (
  <input
    type={type}
    className={cn(
      "flex h-8 w-full rounded-lg border border-input bg-card/60 px-3 text-xs text-foreground transition-colors file:border-0 file:bg-transparent file:text-xs file:font-medium placeholder:text-muted-foreground hover:border-input/80 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40",
      className
    )}
    {...props}
  />
);
