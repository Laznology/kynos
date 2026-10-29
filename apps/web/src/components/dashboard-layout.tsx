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
      <div className="flex w-full items-center gap-1.5 overflow-x-auto border-b border-border bg-card p-2 md:hidden">
        {items.map((item) => {
          const isActive = activeNav === item.id;
          return (
            <button
              className={`flex shrink-0 items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-secondary/60 text-muted-foreground hover:bg-secondary hover:text-foreground"
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
        className={`hidden shrink-0 flex-col justify-between border-r border-border bg-card transition-[width] duration-150 ease-out md:flex ${
          collapsed ? "w-16" : "w-64"
        }`}
      >
        <div className="flex-1 p-3">
          <div
            className={`mb-3 flex items-center ${
              collapsed ? "justify-center" : "justify-between px-1"
            }`}
          >
            <div
              className={`flex items-center gap-2 overflow-hidden rounded-full border border-border bg-secondary/60 ${
                collapsed ? "h-8 w-8 justify-center p-0" : "px-3 py-1"
              }`}
              title={`${statusLabel} · WhatsApp gateway`}
            >
              <span className="relative flex h-2 w-2 shrink-0 items-center justify-center">
                <span className={`h-2 w-2 rounded-full ${dotColor}`} />
              </span>
              {!collapsed && (
                <span className="truncate font-mono text-[11px] font-medium text-foreground">
                  {statusLabel}
                </span>
              )}
            </div>
            <button
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
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

          <nav className="space-y-1">
            {items.map((item) => {
              const isActive = activeNav === item.id;
              return (
                <button
                  className={`group relative flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-xs font-medium transition-all ${
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  } ${collapsed ? "justify-center px-0" : ""}`}
                  key={item.id}
                  onClick={() => onSelectNav(item.id)}
                  title={collapsed ? item.label : undefined}
                  type="button"
                >
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors [&_svg]:h-4 [&_svg]:w-4 ${
                      isActive
                        ? "text-primary-foreground"
                        : "bg-secondary text-muted-foreground group-hover:text-foreground"
                    }`}
                  >
                    {item.icon}
                  </span>
                  {!collapsed && (
                    <>
                      <span className="truncate">{item.label}</span>
                      {item.badge !== undefined && item.badge !== "" && (
                        <span
                          className={`ml-auto max-w-[80px] shrink-0 truncate rounded-full px-2 py-0.5 font-mono text-[10px] ${
                            isActive
                              ? "bg-white/20 text-white"
                              : "border border-border bg-secondary/80 text-muted-foreground"
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="border-t border-border p-3">
          <div
            className={`flex items-center gap-2 rounded-xl border border-border bg-secondary/50 text-muted-foreground ${
              collapsed ? "h-9 justify-center" : "px-3 py-2"
            }`}
            title={model ? `${provider} · ${model}` : "No active model"}
          >
            {providerGlyph(provider)}
            {!collapsed && (
              <span className="truncate font-mono text-[11px] text-foreground">
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
  <div className="rounded-2xl border border-border bg-card shadow-sm">
    <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
      <div className="flex items-center gap-2.5">
        <ArrowCounterClockwise className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold tracking-tight text-foreground">
          Audit Trail
        </h2>
      </div>
      <div className="flex items-center gap-2.5">
        <span className="font-mono text-[11px] text-muted-foreground">
          refresh 3s · sqlite
        </span>
        <Badge variant="secondary">{logs.length} rows</Badge>
      </div>
    </div>

    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="border-b border-border hover:bg-transparent">
            <TableHead className="w-20 font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
              Level
            </TableHead>
            <TableHead className="w-28 font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
              Category
            </TableHead>
            <TableHead className="font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
              Message
            </TableHead>
            <TableHead className="w-28 text-right font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
              Time
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.length === 0 ? (
            <TableRow>
              <TableCell
                className="py-12 text-center font-mono text-xs text-muted-foreground"
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
                  className="border-b border-border/50 transition-colors last:border-0 hover:bg-secondary/40"
                  key={log.id}
                >
                  <TableCell className="py-2.5">
                    <Badge variant={variant}>{log.level}</Badge>
                  </TableCell>
                  <TableCell className="py-2.5 font-mono text-[11px] text-muted-foreground">
                    {log.category}
                  </TableCell>
                  <TableCell className="max-w-0 py-2.5 text-xs text-foreground">
                    <span className="block truncate">{log.message}</span>
                  </TableCell>
                  <TableCell className="py-2.5 text-right font-mono text-[11px] text-muted-foreground tabular-nums">
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
