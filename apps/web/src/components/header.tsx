import { Robot, SignOut } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { siBun, siSqlite } from "simple-icons";

import { logoutFn } from "../lib/server-api";
import { SimpleIcon } from "./ui/simple-icon";

export const Header = () => (
  <header className="shrink-0 border-b border-border bg-card/80 backdrop-blur-md">
    <nav className="flex items-center justify-between px-4 py-2.5">
      <Link
        className="flex items-center gap-2.5 transition-opacity hover:opacity-85"
        to="/"
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
          <Robot className="h-4 w-4" weight="fill" />
        </span>
        <div className="flex items-baseline gap-1.5">
          <span className="text-[14px] font-semibold tracking-tight text-foreground">
            kynos
          </span>
          <span className="hidden font-mono text-[11px] text-muted-foreground sm:inline">
            / console
          </span>
        </div>
      </Link>

      <div className="flex items-center gap-2 text-xs">
        <span className="hidden items-center gap-1.5 rounded-full border border-border bg-secondary/60 px-3 py-1 font-mono text-[10px] text-muted-foreground md:flex">
          <SimpleIcon icon={siBun} className="h-3 w-3" />
          bun 1.4
        </span>
        <span className="hidden items-center gap-1.5 rounded-full border border-border bg-secondary/60 px-3 py-1 font-mono text-[10px] text-muted-foreground md:flex">
          <SimpleIcon icon={siSqlite} className="h-3 w-3" />
          sqlite · wal
        </span>
        <button
          aria-label="Open command palette"
          className="kbd cursor-pointer transition-colors hover:border-muted-foreground/40 hover:text-foreground"
          onClick={() => window.dispatchEvent(new Event("kynos:palette-open"))}
          title="Command palette"
          type="button"
        >
          ⌘K
        </button>
        <button
          aria-label="Sign out"
          className="flex items-center gap-1.5 rounded-full border border-border bg-secondary/40 px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
          onClick={async () => {
            await logoutFn();
            window.location.href = "/login";
          }}
          title="Logout"
          type="button"
        >
          <SignOut className="h-3.5 w-3.5" />
          <span className="hidden sm:inline font-medium">Logout</span>
        </button>
      </div>
    </nav>
  </header>
);

export default Header;
