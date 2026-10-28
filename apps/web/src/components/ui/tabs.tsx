import * as TabsPrimitive from "@radix-ui/react-tabs";
import * as React from "react";

import { cn } from "../../lib/utils";

export const Tabs = TabsPrimitive.Root;

export const TabsList = ({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>) => (
  <TabsPrimitive.List
    className={cn(
      "inline-flex h-9 items-center justify-start rounded-none border-b border-zinc-800 bg-transparent p-0 text-zinc-400",
      className
    )}
    {...props}
  />
);

export const TabsTrigger = ({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>) => (
  <TabsPrimitive.Trigger
    className={cn(
      "ring-offset-background inline-flex items-center justify-center border-b-2 border-transparent px-4 py-2 text-xs font-medium whitespace-nowrap transition-all hover:text-zinc-200 focus-visible:ring-1 focus-visible:ring-zinc-400 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 data-[state=active]:border-zinc-100 data-[state=active]:font-semibold data-[state=active]:text-zinc-100",
      className
    )}
    {...props}
  />
);

export const TabsContent = ({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>) => (
  <TabsPrimitive.Content
    className={cn(
      "ring-offset-background mt-4 focus-visible:ring-1 focus-visible:ring-zinc-400 focus-visible:outline-none",
      className
    )}
    {...props}
  />
);
