import type { AuditLog } from "@kynos/shared";
import {
  ArrowCounterClockwise,
  Brain,
  CaretLeft,
  CaretRight,
  ChatCircleText,
  ClockCounterClockwise,
  Code,
  Wrench,
} from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { siOllama, siOpenrouter } from "simple-icons";

import { Badge } from "./ui/badge";
import { SimpleIcon } from "./ui/simple-icon";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";

export type NavSection =
  | "gateway"
  | "ai_runtime"
  | "tools"
  | "skills"
  | "audit";

interface NavItem {
  badge?: string | number;
  dot?: boolean;
  icon: ReactNode;
  id: NavSection;
  label: string;
}

const providerGlyph = (provider: string): ReactNode => {
  if (provider === "ollama") {
    return <SimpleIcon icon={siOllama} className="h-3.5 w-3.5" />;
  }
  if (provider === "openrouter") {
    return <SimpleIcon icon={siOpenrouter} className="h-3.5 w-3.5" />;
  }
  return <Brain className="h-3.5 w-3.5" />;
};

export const SidebarNav = ({
  activeNav,
  collapsed,
  dotColor,
  logCount,
  model,
  onSelectNav,
  onToggleCollapsed,
  provider,
  skillCount,
  statusLabel,
  toolsCount,
}: {
  activeNav: NavSection;
  collapsed: boolean;
  dotColor: string;
  logCount: number;
  model: string;
  onSelectNav: (n: NavSection) => void;
  onToggleCollapsed: () => void;
  provider: string;
  skillCount: number;
  statusLabel: string;
  toolsCount: number;
}) => {
  const items: NavItem[] = [
    {
      badge: statusLabel,
      dot: true,
      icon: <ChatCircleText className="h-4 w-4" />,
      id: "gateway",
      label: "Gateway",
    },
    {
      badge: model ? model.split("/").pop() : undefined,
      icon: <Brain className="h-4 w-4" />,
      id: "ai_runtime",
      label: "AI Gateway",
    },
    {
      badge: toolsCount,
      icon: <Wrench className="h-4 w-4" />,
      id: "tools",
      label: "Tools",
    },
    {
      badge: skillCount,
      icon: <Code className="h-4 w-4" />,
      id: "skills",
      label: "Skills",
    },
    {
      badge: logCount,
      icon: <ClockCounterClockwise className="h-4 w-4" />,
      id: "audit",
      label: "Audit",
    },
  ];

  return (
    <>
      <div className="flex w-full items-center gap-1 overflow-x-auto border-b border-white/[0.07] bg-[#08080a] p-1.5 md:hidden">
        {items.map((item) => {
          const isActive = activeNav === item.id;
          return (
            <button
              className={`flex shrink-0 items-center gap-1.5 rounded-sm border px-2.5 py-1.5 text-[11px] font-medium transition-colors ${
                isActive
                  ? "border-white/20 bg-white/10 text-white"
                  : "border-transparent text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-200"
              }`}
              key={item.id}
              onClick={() => onSelectNav(item.id)}
              type="button"
            >
              <span className="[&_svg]:h-3.5 [&_svg]:w-3.5">{item.icon}</span>
              {item.label}
            </button>
          );
        })}
      </div>

      <aside
        className={`hidden shrink-0 flex-col justify-between border-r border-white/[0.07] bg-[#08080a] transition-[width] duration-150 ease-out md:flex ${
          collapsed ? "w-14" : "w-60"
        }`}
      >
        <div className="flex-1 p-2">
          <div
            className={`mb-2 flex items-center ${
              collapsed ? "justify-center" : "justify-between px-1"
            }`}
          >
            <div
              className={`flex items-center gap-2 overflow-hidden rounded-sm border border-white/[0.07] bg-white/[0.02] ${
                collapsed ? "h-7 w-7 justify-center p-0" : "px-2.5 py-1.5"
              }`}
              title={`${statusLabel} · WhatsApp gateway`}
            >
              <span className="relative flex h-2 w-2 shrink-0 items-center justify-center">
                <span className={`h-2 w-2 rounded-full ${dotColor}`} />
              </span>
              {!collapsed && (
                <span className="truncate font-mono text-[10px] font-medium text-zinc-300">
                  {statusLabel}
                </span>
              )}
            </div>
            <button
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-sm border border-transparent text-zinc-600 transition-colors hover:border-white/10 hover:bg-white/[0.04] hover:text-zinc-200"
              onClick={onToggleCollapsed}
              type="button"
            >
              {collapsed ? (
                <CaretRight className="h-3.5 w-3.5" />
              ) : (
                <CaretLeft className="h-3.5 w-3.5" />
              )}
            </button>
          </div>

          <nav className="space-y-0.5">
            {items.map((item) => {
              const isActive = activeNav === item.id;
              return (
                <button
                  className={`group relative flex w-full items-center gap-2.5 rounded-sm px-2 py-1.5 text-left transition-colors ${
                    isActive
                      ? "bg-white/[0.06] text-zinc-100"
                      : "text-zinc-500 hover:bg-white/[0.03] hover:text-zinc-200"
                  } ${collapsed ? "justify-center px-0" : ""}`}
                  key={item.id}
                  onClick={() => onSelectNav(item.id)}
                  title={collapsed ? item.label : undefined}
                  type="button"
                >
                  {isActive && (
                    <span className="absolute top-1 bottom-1 left-0 w-0.5 bg-zinc-100" />
                  )}
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-sm border transition-colors [&_svg]:h-3.5 [&_svg]:w-3.5 ${
                      isActive
                        ? "border-white/15 bg-white/[0.07] text-zinc-100"
                        : "border-white/[0.06] bg-white/[0.02] text-zinc-500 group-hover:text-zinc-300"
                    }`}
                  >
                    {item.icon}
                    {item.dot && collapsed && (
                      <span
                        className={`absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full ${dotColor}`}
                      />
                    )}
                  </span>
                  {!collapsed && (
                    <span className="truncate text-xs font-medium">
                      {item.label}
                    </span>
                  )}
                  {!collapsed &&
                    item.badge !== undefined &&
                    item.badge !== "" && (
                      <span className="ml-auto max-w-[80px] shrink-0 truncate rounded-xs border border-white/[0.07] bg-white/[0.03] px-1.5 py-0.5 font-mono text-[9.5px] text-zinc-500">
                        {item.badge}
                      </span>
                    )}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="border-t border-white/[0.07] p-2">
          <div
            className={`flex items-center gap-2 rounded-sm border border-white/[0.07] bg-white/[0.02] text-zinc-400 ${
              collapsed ? "h-8 justify-center" : "px-2 py-1.5"
            }`}
            title={model ? `${provider} · ${model}` : "No active model"}
          >
            {providerGlyph(provider)}
            {!collapsed && (
              <span className="truncate font-mono text-[10px] text-zinc-300">
                {model || "no model"}
              </span>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};

const LEVEL_VARIANT: Record<string, "destructive" | "secondary" | "warning"> = {
  error: "destructive",
  warn: "warning",
};

export const AuditSection = ({ logs }: { logs: AuditLog[] }) => (
  <div className="rounded-md border border-white/[0.07] bg-[#0a0a0d]">
    <div className="flex items-center justify-between border-b border-white/[0.07] px-4 py-3">
      <div className="flex items-center gap-2">
        <ArrowCounterClockwise className="h-4 w-4 text-zinc-500" />
        <h2 className="text-[13px] font-semibold tracking-tight text-zinc-100">
          Audit Trail
        </h2>
      </div>
      <div className="flex items-center gap-2">
        <span className="font-mono text-[10px] text-zinc-600">
          refresh 3s · sqlite
        </span>
        <Badge variant="secondary">{logs.length} rows</Badge>
      </div>
    </div>

    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="border-b border-white/[0.07] hover:bg-transparent">
            <TableHead className="w-20 font-mono text-[9.5px] tracking-[0.08em] text-zinc-600 uppercase">
              Level
            </TableHead>
            <TableHead className="w-28 font-mono text-[9.5px] tracking-[0.08em] text-zinc-600 uppercase">
              Category
            </TableHead>
            <TableHead className="font-mono text-[9.5px] tracking-[0.08em] text-zinc-600 uppercase">
              Message
            </TableHead>
            <TableHead className="w-28 text-right font-mono text-[9.5px] tracking-[0.08em] text-zinc-600 uppercase">
              Time
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.length === 0 ? (
            <TableRow>
              <TableCell
                className="py-10 text-center font-mono text-[11px] text-zinc-600"
                colSpan={4}
              >
                No logs recorded yet.
              </TableCell>
            </TableRow>
          ) : (
            logs.map((log) => {
              const variant = LEVEL_VARIANT[log.level] ?? "secondary";
              return (
                <TableRow
                  className="border-b border-white/[0.04] transition-colors last:border-0 hover:bg-white/[0.02]"
                  key={log.id}
                >
                  <TableCell className="py-2">
                    <Badge variant={variant}>{log.level}</Badge>
                  </TableCell>
                  <TableCell className="py-2 font-mono text-[10px] text-zinc-500">
                    {log.category}
                  </TableCell>
                  <TableCell className="max-w-0 py-2 text-[11px] text-zinc-300">
                    <span className="block truncate">{log.message}</span>
                  </TableCell>
                  <TableCell className="py-2 text-right font-mono text-[10px] text-zinc-600 tabular-nums">
                    {log.created_at
                      ? new Date(log.created_at).toLocaleTimeString()
                      : "-"}
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  </div>
);
