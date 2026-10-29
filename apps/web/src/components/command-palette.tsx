import { MagnifyingGlass } from "@phosphor-icons/react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";

export interface PaletteCommand {
  action: () => void;
  group: string;
  hint?: string;
  icon?: ReactNode;
  id: string;
  keywords?: string;
  label: string;
}

export const CommandPalette = ({
  commands,
}: {
  commands: PaletteCommand[];
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    const handleCustomOpen = () => setOpen(true);

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("kynos:palette-open", handleCustomOpen);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("kynos:palette-open", handleCustomOpen);
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return commands;
    }
    return commands.filter((c) => {
      const hay = `${c.label} ${c.group} ${c.hint ?? ""} ${c.keywords ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [commands, query]);

  const active = Math.min(Math.max(0, activeIdx), Math.max(0, filtered.length - 1));

  useEffect(() => {
    if (!open) {
      setQuery("");
      setActiveIdx(0);
    }
  }, [open]);

  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-row="${active}"]`);
    if (el && typeof el.scrollIntoView === "function") {
      el.scrollIntoView({ block: "nearest" });
    }
  }, [active]);

  const runAt = (idx: number) => {
    const target = filtered[idx];
    if (target) {
      setOpen(false);
      target.action();
    }
  };

  if (!open) {
    return null;
  }

  return (
    <dialog
      aria-label="Command palette"
      aria-modal="true"
      className="fixed inset-0 z-50 flex h-full w-full items-start justify-center bg-transparent p-4 outline-none"
      open
    >
      <button
        aria-label="Close command palette"
        className="animate-overlay-in absolute inset-0 h-full w-full cursor-default bg-black/70 backdrop-blur-sm"
        onClick={() => setOpen(false)}
        tabIndex={-1}
        type="button"
      />
      <div className="animate-palette-in relative mt-[10vh] w-[calc(100vw-2rem)] max-w-[540px] overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
        <div className="flex items-center gap-2.5 border-b border-border px-4 py-3">
          <MagnifyingGlass className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            aria-label="Search commands"
            autoFocus
            className="h-7 w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIdx(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.preventDefault();
                setOpen(false);
              }
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActiveIdx((i) => Math.min(filtered.length - 1, i + 1));
              }
              if (e.key === "ArrowUp") {
                e.preventDefault();
                setActiveIdx((i) => Math.max(0, i - 1));
              }
              if (e.key === "Enter") {
                e.preventDefault();
                runAt(active);
              }
            }}
            placeholder="Type a command, section, model, or tool..."
            value={query}
          />
        </div>

        <div className="max-h-[46vh] overflow-y-auto p-2" ref={listRef}>
          {filtered.length === 0 && (
            <p className="px-3 py-8 text-center text-xs text-muted-foreground">
              No matching commands.
            </p>
          )}
          {filtered.map((c, idx) => {
            const showHeader = idx === 0 || filtered[idx - 1].group !== c.group;
            return (
              <div key={`${c.group}-${c.id}`}>
                {showHeader && (
                  <p className="sticky top-0 z-10 bg-card px-3 pt-2 pb-1 font-mono text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                    {c.group}
                  </p>
                )}
                <button
                  className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs transition-colors ${
                    idx === active
                      ? "bg-primary text-primary-foreground font-medium"
                      : "text-foreground hover:bg-secondary/60"
                  }`}
                  data-row={idx}
                  onClick={() => runAt(idx)}
                  onMouseEnter={() => setActiveIdx(idx)}
                  type="button"
                >
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg ${
                      idx === active ? "text-primary-foreground" : "text-muted-foreground"
                    } [&_svg]:h-3.5 [&_svg]:w-3.5`}
                  >
                    {c.icon ?? "›"}
                  </span>
                  <span className="truncate">{c.label}</span>
                  {c.hint && (
                    <span
                      className={`ml-auto shrink-0 font-mono text-[10px] ${
                        idx === active ? "text-primary-foreground/80" : "text-muted-foreground"
                      }`}
                    >
                      {c.hint}
                    </span>
                  )}
                </button>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between border-t border-border px-4 py-2.5 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="kbd">↑↓</span>
            <span>navigate</span>
            <span className="kbd">↵</span>
            <span>select</span>
            <span className="kbd">esc</span>
            <span>close</span>
          </div>
          <span className="font-mono text-[10px] tabular-nums">
            {filtered.length} / {commands.length}
          </span>
        </div>
      </div>
    </dialog>
  );
};

export default CommandPalette;
