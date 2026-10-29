import * as React from "react";

import { cn } from "../../lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = ({ className, type = "text", ...props }: InputProps) => (
  <input
    type={type}
    className={cn(
      "border-input bg-card/60 text-foreground placeholder:text-muted-foreground hover:border-input/80 focus-visible:border-ring focus-visible:ring-ring/20 flex h-8 w-full rounded-lg border px-3 text-xs transition-colors file:border-0 file:bg-transparent file:text-xs file:font-medium focus-visible:ring-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40",
      className
    )}
    {...props}
  />
);
