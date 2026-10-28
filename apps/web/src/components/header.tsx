import { Robot } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { siBun, siSqlite } from "simple-icons";

import { SimpleIcon } from "./ui/simple-icon";

export const Header = () => (
  <header className="shrink-0 border-b border-white/[0.07] bg-[#08080a]">
    <nav className="flex items-center justify-between px-3 py-2">
      <Link
        className="flex items-center gap-2 transition-opacity hover:opacity-80"
        to="/"
      >
        <span className="flex h-5.5 w-5.5 items-center justify-center rounded-sm border border-white/15 bg-white/[0.06] text-zinc-100">
          <Robot className="h-3.5 w-3.5" weight="fill" />
        </span>
        <span className="text-[13px] font-semibold tracking-tight text-zinc-100">
          kynos
        </span>
        <span className="hidden font-mono text-[10px] text-zinc-600 sm:inline">
          / agent console
        </span>
      </Link>

      <div className="flex items-center gap-1.5 text-[10px]">
        <span className="hidden items-center gap-1.5 rounded-sm border border-white/[0.07] bg-white/[0.02] px-2 py-1 font-mono text-zinc-400 md:flex">
          <SimpleIcon icon={siBun} className="h-3 w-3" />
          bun 1.4
        </span>
        <span className="hidden items-center gap-1.5 rounded-sm border border-white/[0.07] bg-white/[0.02] px-2 py-1 font-mono text-zinc-400 md:flex">
          <SimpleIcon icon={siSqlite} className="h-3 w-3" />
          sqlite · wal
        </span>
        <button
          aria-label="Open command palette"
          className="kbd cursor-pointer transition-colors hover:border-white/25 hover:text-zinc-200"
          onClick={() => window.dispatchEvent(new Event("kynos:palette-open"))}
          title="Command palette"
          type="button"
        >
          ⌘K
        </button>
      </div>
    </nav>
  </header>
);

export default Header;
