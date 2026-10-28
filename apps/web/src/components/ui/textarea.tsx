import * as React from "react";

import { cn } from "../../lib/utils";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = ({ className, ...props }: TextareaProps) => (
  <textarea
    className={cn(
      "flex min-h-16 w-full rounded-sm border border-white/10 bg-white/[0.03] px-2.5 py-2 text-xs text-zinc-100 transition-colors placeholder:text-zinc-600 hover:border-white/[0.16] focus-visible:border-white/25 focus-visible:ring-1 focus-visible:ring-zinc-400/40 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40",
      className
    )}
    {...props}
  />
);
