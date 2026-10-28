import { MagnifyingGlass } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

export interface PaletteCommand {
  group: string;
  hint?: string;
  icon?: ReactNode;
  id: string;
  keywords?: string;
  label: string;
  run: () => void;
}

const OPEN_EVENT = "kynos:palette-open";

export const CommandPalette = ({
  commands,
}: {
  commands: PaletteCommand[];
}) => {
  const [activeIdx, setActiveIdx] = useState(0);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const openRef = useRef(false);

  useEffect(() => {
    openRef.current = open;
  }, [open]);
  const filtered = useMemo(() => {
    const tokens = query.toLowerCase().split(/\s+/u).filter(Boolean);
    if (tokens.length === 0) {
      return commands;
    }
    const scored = commands
      .map((c, i) => {
        const hay = `${c.label} ${c.keywords ?? ""} ${c.group}`.toLowerCase();
        const hit = tokens.every((t) => hay.includes(t));
        return hit
          ? {
              c,
              i,
              lead: c.label.toLowerCase().startsWith(tokens[0]) ? 0 : 1,
            }
          : null;
      })
      .filter((x): x is { c: PaletteCommand; i: number; lead: number } =>
        Boolean(x)
      );
    return scored
      .toSorted((a, b) => a.lead - b.lead || a.i - b.i)
      .map((s) => s.c);
  }, [commands, query]);

  const active = Math.min(activeIdx, Math.max(0, filtered.length - 1));

  useEffect(() => {
    const show = () => {
      setQuery("");
      setActiveIdx(0);
      setOpen(true);
    };
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (openRef.current) {
          setOpen(false);
        } else {
          show();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener(OPEN_EVENT, show);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(OPEN_EVENT, show);
    };
  }, []);

  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-row="${active}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const runAt = (idx: number) => {
    const cmd = filtered[idx];
    if (cmd) {
      setOpen(false);
      cmd.run();
    }
  };

  if (!open) {
    return null;
  }

  return (
    <dialog
      aria-label="Command palette"
      className="fixed inset-0 z-50 m-0 flex h-full w-full max-w-none items-start justify-center border-0 bg-transparent p-0 open:flex"
      open
    >
      <button
        aria-label="Close command palette"
        className="animate-overlay-in absolute inset-0 h-full w-full cursor-default bg-black/60 backdrop-blur-[3px]"
        onClick={() => setOpen(false)}
        tabIndex={-1}
        type="button"
      />
      <div className="animate-palette-in relative mt-[10vh] w-[calc(100vw-2rem)] max-w-[540px] overflow-hidden rounded-md border border-white/10 bg-[#0b0b0e] shadow-[0_24px_60px_-12px_rgba(0,0,0,0.85)]">
        <div className="flex items-center gap-2 border-b border-white/[0.07] px-3">
          <MagnifyingGlass className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
          <input
            aria-label="Search commands"
            autoFocus
            className="h-10 w-full bg-transparent font-mono text-xs text-zinc-100 outline-none placeholder:text-zinc-600"
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

        <div className="max-h-[46vh] overflow-y-auto py-1" ref={listRef}>
          {filtered.length === 0 && (
            <p className="px-3 py-8 text-center font-mono text-[11px] text-zinc-500">
              No matching commands.
            </p>
          )}
          {filtered.map((c, idx) => {
            const showHeader = idx === 0 || filtered[idx - 1].group !== c.group;
            return (
              <div key={`${c.group}-${c.id}`}>
                {showHeader && (
                  <p className="sticky top-0 z-10 bg-[#0b0b0e] px-3 pt-1.5 pb-1 font-mono text-[9.5px] font-semibold tracking-[0.08em] text-zinc-600 uppercase">
                    {c.group}
                  </p>
                )}
                <button
                  className={`flex w-full items-center gap-2.5 rounded-xs px-3 py-1.5 text-left transition-colors ${
                    idx === active
                      ? "bg-white/[0.07] text-zinc-100"
                      : "text-zinc-400 hover:bg-white/[0.04]"
                  }`}
                  data-row={idx}
                  onClick={() => runAt(idx)}
                  onMouseEnter={() => setActiveIdx(idx)}
                  type="button"
                >
                  <span className="flex h-5.5 w-5.5 shrink-0 items-center justify-center rounded-xs border border-white/[0.08] bg-white/[0.03] text-zinc-400 [&_svg]:h-3 [&_svg]:w-3">
                    {c.icon ?? "›"}
                  </span>
                  <span className="truncate text-xs">{c.label}</span>
                  {c.hint && (
                    <span className="ml-auto shrink-0 font-mono text-[10px] text-zinc-600">
                      {c.hint}
                    </span>
                  )}
                </button>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between border-t border-white/[0.07] px-3 py-2">
          <div className="flex items-center gap-2 text-zinc-500">
            <span className="kbd">↑↓</span>
            <span className="text-[10px]">pilih</span>
            <span className="kbd">↵</span>
            <span className="text-[10px]">jalankan</span>
            <span className="kbd">esc</span>
            <span className="text-[10px]">tutup</span>
          </div>
          <span className="font-mono text-[10px] text-zinc-600 tabular-nums">
            {filtered.length} / {commands.length}
          </span>
        </div>
      </div>
    </dialog>
  );
};
