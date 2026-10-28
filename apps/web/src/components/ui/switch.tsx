import * as SwitchPrimitives from "@radix-ui/react-switch";
import * as React from "react";

import { cn } from "../../lib/utils";

export const Switch = ({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>) => (
  <SwitchPrimitives.Root
    className={cn(
      "group peer inline-flex h-4.5 w-8 shrink-0 cursor-pointer items-center rounded-sm border border-white/[0.09] bg-white/[0.04] transition-colors focus-visible:ring-1 focus-visible:ring-zinc-400 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40 data-[state=checked]:border-zinc-300 data-[state=checked]:bg-zinc-100",
      className
    )}
    {...props}
  >
    <SwitchPrimitives.Thumb
      className={cn(
        "pointer-events-none block h-3 w-3 translate-x-0.5 rounded-xs bg-zinc-500 shadow-none ring-0 transition-transform group-data-[state=checked]:bg-zinc-950 data-[state=checked]:translate-x-4 data-[state=checked]:bg-zinc-950"
      )}
    />
  </SwitchPrimitives.Root>
);
