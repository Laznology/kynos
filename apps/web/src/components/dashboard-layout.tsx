import type { AuditLog } from "@kynos/shared";
import {
  ArrowCounterClockwise,
  Brain,
  CaretLeft,
  CaretRight,
  ChatCircleText,
  ClockCounterClockwise,
  Code,
  MagnifyingGlass,
  Wrench,
  X,
} from "@phosphor-icons/react";
import { useCallback, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { siOllama, siOpenrouter } from "simple-icons";

import { AuditTraceDrawer } from "./audit-trace-drawer";
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
      <nav
        aria-label="Dashboard sections"
        className="border-border bg-secondary flex w-full flex-wrap items-center gap-1.5 border-b p-2 md:hidden"
      >
        {items.map((item) => {
          const isActive = activeNav === item.id;
          return (
            <button
              className={`flex min-h-11 items-center gap-2 rounded-full px-3.5 py-2 text-xs font-medium transition-colors ${
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
      </nav>

      <aside
        className={`border-border bg-card hidden shrink-0 flex-col justify-between border-r transition-[width] duration-150 ease-out md:flex ${
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
              className={`border-border bg-secondary/60 flex items-center gap-2 overflow-hidden rounded-full border ${
                collapsed ? "h-8 w-8 justify-center p-0" : "px-3 py-1"
              }`}
              title={`${statusLabel} · WhatsApp gateway`}
            >
              <span className="relative flex h-2 w-2 shrink-0 items-center justify-center">
                <span className={`h-2 w-2 rounded-full ${dotColor}`} />
              </span>
              {!collapsed && (
                <span className="text-foreground truncate font-mono text-[11px] font-medium">
                  {statusLabel}
                </span>
              )}
            </div>
            <button
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              className="text-muted-foreground hover:bg-secondary hover:text-foreground flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors"
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
                              : "border-border bg-secondary/80 text-muted-foreground border"
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

        <div className="border-border border-t p-3">
          <div
            className={`border-border bg-secondary/50 text-muted-foreground flex items-center gap-2 rounded-xl border ${
              collapsed ? "h-9 justify-center" : "px-3 py-2"
            }`}
            title={model ? `${provider} · ${model}` : "No active model"}
          >
            {providerGlyph(provider)}
            {!collapsed && (
              <span className="text-foreground truncate font-mono text-[11px]">
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

const extractRowPills = (log: AuditLog) => {
  const pills: {
    label: string;
    variant: "destructive" | "info" | "outline" | "secondary";
  }[] = [];
  const statusMatch = log.message.match(/\[(?<code>\d{3})\]/u);
  if (statusMatch?.groups?.code) {
    pills.push({
      label: `HTTP ${statusMatch.groups.code}`,
      variant: "destructive",
    });
  }

  if (log.metadata) {
    try {
      const parsed = JSON.parse(log.metadata);
      if (parsed && typeof parsed === "object") {
        if (
          "modelConfig" in parsed &&
          parsed.modelConfig &&
          typeof parsed.modelConfig === "object" &&
          "model" in parsed.modelConfig
        ) {
          pills.push({
            label: String(parsed.modelConfig.model),
            variant: "outline",
          });
        }
        if (
          "error" in parsed &&
          parsed.error &&
          typeof parsed.error === "object" &&
          "statusCode" in parsed.error &&
          !statusMatch
        ) {
          pills.push({
            label: `HTTP ${parsed.error.statusCode}`,
            variant: "destructive",
          });
        }
      }
    } catch {
      // ignore malformed metadata
    }
  }

  return pills;
};

export const AuditSection = ({ logs }: { logs: AuditLog[] }) => {
  const [selectedLogId, setSelectedLogId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [levelFilter, setLevelFilter] = useState<
    "all" | "error" | "warn" | "info"
  >("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const errorCount = useMemo(
    () => logs.filter((l) => l.level === "error").length,
    [logs]
  );
  const warnCount = useMemo(
    () => logs.filter((l) => l.level === "warn").length,
    [logs]
  );
  const infoCount = useMemo(
    () => logs.filter((l) => l.level === "info").length,
    [logs]
  );

  const filteredLogs = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return logs.filter((log) => {
      if (levelFilter !== "all" && log.level !== levelFilter) {
        return false;
      }
      if (categoryFilter !== "all" && log.category !== categoryFilter) {
        return false;
      }
      if (q) {
        const msgMatch = log.message.toLowerCase().includes(q);
        const catMatch = log.category.toLowerCase().includes(q);
        const metaMatch = log.metadata?.toLowerCase().includes(q);
        if (!msgMatch && !catMatch && !metaMatch) {
          return false;
        }
      }
      return true;
    });
  }, [logs, levelFilter, categoryFilter, searchQuery]);

  const selectedIndex = useMemo(
    () => filteredLogs.findIndex((l) => l.id === selectedLogId),
    [filteredLogs, selectedLogId]
  );

  const selectedLog = useMemo(
    () => (selectedIndex >= 0 ? filteredLogs[selectedIndex] : null),
    [filteredLogs, selectedIndex]
  );

  const handleNavigate = useCallback(
    (direction: "prev" | "next") => {
      if (selectedIndex < 0) {
        return;
      }
      if (direction === "prev" && selectedIndex > 0) {
        setSelectedLogId(filteredLogs[selectedIndex - 1].id);
      } else if (
        direction === "next" &&
        selectedIndex < filteredLogs.length - 1
      ) {
        setSelectedLogId(filteredLogs[selectedIndex + 1].id);
      }
    },
    [selectedIndex, filteredLogs]
  );

  return (
    <div className="border-border bg-card rounded-2xl border shadow-sm">
      {/* Header bar */}
      <div className="border-border flex flex-col gap-3 border-b px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <ArrowCounterClockwise className="text-muted-foreground h-4 w-4" />
            <h2 className="text-foreground text-sm font-semibold tracking-tight">
              Audit & Trace Logs
            </h2>
            <Badge variant="secondary">{logs.length} traces</Badge>
          </div>
          <p className="text-muted-foreground mt-1 font-mono text-[11px]">
            Click any row to open the full execution trace and metadata drawer.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-muted-foreground font-mono text-[11px]">
            refresh 3s · sqlite wal
          </span>
        </div>
      </div>

      {/* Filter and Search Toolbar */}
      <div className="border-border/70 bg-secondary/20 flex flex-col gap-3 border-b p-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Search input */}
        <div className="relative flex-1">
          <MagnifyingGlass className="text-muted-foreground absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2" />
          <input
            className="border-border/80 bg-background/60 text-foreground placeholder:text-muted-foreground focus:border-primary h-8 w-full rounded-lg border pr-7 pl-8 text-xs focus:outline-none"
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search message, model, error code, prompt..."
            type="text"
            value={searchQuery}
          />
          {searchQuery && (
            <button
              aria-label="Clear search"
              className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2 -translate-y-1/2"
              onClick={() => setSearchQuery("")}
              type="button"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* Level Filters */}
        <div className="flex flex-wrap items-center gap-1.5 font-mono text-[11px]">
          <button
            className={`cursor-pointer rounded-md px-2.5 py-1 transition-colors ${
              levelFilter === "all"
                ? "bg-foreground text-background font-semibold"
                : "bg-secondary/60 text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setLevelFilter("all")}
            type="button"
          >
            All ({logs.length})
          </button>
          <button
            className={`flex cursor-pointer items-center gap-1 rounded-md px-2.5 py-1 transition-colors ${
              levelFilter === "error"
                ? "bg-red-500 font-semibold text-white"
                : "bg-red-500/10 text-red-400 hover:bg-red-500/20"
            }`}
            onClick={() => setLevelFilter("error")}
            type="button"
          >
            Errors ({errorCount})
          </button>
          <button
            className={`cursor-pointer rounded-md px-2.5 py-1 transition-colors ${
              levelFilter === "warn"
                ? "bg-amber-500 font-semibold text-white"
                : "bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
            }`}
            onClick={() => setLevelFilter("warn")}
            type="button"
          >
            Warn ({warnCount})
          </button>
          <button
            className={`cursor-pointer rounded-md px-2.5 py-1 transition-colors ${
              levelFilter === "info"
                ? "bg-primary font-semibold text-white"
                : "bg-secondary/60 text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setLevelFilter("info")}
            type="button"
          >
            Info ({infoCount})
          </button>

          {/* Category Dropdown */}
          <select
            aria-label="Filter by category"
            className="border-border/80 bg-background/60 text-foreground h-7 rounded-md border px-2 font-mono text-[11px] focus:outline-none"
            onChange={(e) => setCategoryFilter(e.target.value)}
            value={categoryFilter}
          >
            <option value="all">All Categories</option>
            <option value="agent">agent</option>
            <option value="bot">bot</option>
            <option value="command">command</option>
            <option value="media">media</option>
            <option value="system">system</option>
          </select>
        </div>
      </div>

      {/* Table view */}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-border border-b hover:bg-transparent">
              <TableHead className="text-muted-foreground w-20 font-mono text-[10px] tracking-wider uppercase">
                Level
              </TableHead>
              <TableHead className="text-muted-foreground w-24 font-mono text-[10px] tracking-wider uppercase">
                Category
              </TableHead>
              <TableHead className="text-muted-foreground font-mono text-[10px] tracking-wider uppercase">
                Message & Trace Info
              </TableHead>
              <TableHead className="text-muted-foreground w-28 text-right font-mono text-[10px] tracking-wider uppercase">
                Time
              </TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLogs.length === 0 ? (
              <TableRow>
                <TableCell
                  className="text-muted-foreground py-12 text-center font-mono text-xs"
                  colSpan={5}
                >
                  {searchQuery ||
                  levelFilter !== "all" ||
                  categoryFilter !== "all"
                    ? "No logs match the selected search and filter criteria."
                    : "No logs recorded yet."}
                </TableCell>
              </TableRow>
            ) : (
              filteredLogs.map((log) => {
                const variant = LEVEL_VARIANT[log.level] ?? "secondary";
                const isSelected = selectedLogId === log.id;
                const pills = extractRowPills(log);

                return (
                  <TableRow
                    className={`group border-border/50 cursor-pointer border-b transition-colors last:border-0 ${
                      isSelected
                        ? "bg-primary/10 border-primary/40"
                        : "hover:bg-secondary/50"
                    }`}
                    key={log.id}
                    onClick={() => setSelectedLogId(log.id)}
                  >
                    <TableCell className="py-2.5">
                      <Badge variant={variant}>{log.level}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground py-2.5 font-mono text-[11px]">
                      {log.category}
                    </TableCell>
                    <TableCell className="text-foreground max-w-0 py-2.5 text-xs">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className="truncate font-mono"
                          title={log.message}
                        >
                          {log.message}
                        </span>
                        {pills.map((pill, pIdx) => (
                          <Badge
                            className="h-4 shrink-0 px-1.5 py-0 font-mono text-[9px]"
                            key={`p-${log.id}-${pIdx}`}
                            variant={pill.variant}
                          >
                            {pill.label}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground py-2.5 text-right font-mono text-[11px] tabular-nums">
                      {log.created_at
                        ? new Date(log.created_at).toLocaleTimeString()
                        : "-"}
                    </TableCell>
                    <TableCell className="py-2.5 text-right">
                      <CaretRight className="text-muted-foreground/50 group-hover:text-foreground h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Trace Drawer */}
      <AuditTraceDrawer
        hasNext={selectedIndex >= 0 && selectedIndex < filteredLogs.length - 1}
        hasPrev={selectedIndex > 0}
        log={selectedLog}
        onClose={() => setSelectedLogId(null)}
        onNavigate={handleNavigate}
      />
    </div>
  );
};
