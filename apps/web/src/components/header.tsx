import { Robot, SignOut } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { siBun, siSqlite } from "simple-icons";

import { logoutFn } from "../lib/server-api";
import { ThemeToggle } from "./theme-toggle";
import { SimpleIcon } from "./ui/simple-icon";

export const Header = () => (
  <header className="border-border bg-secondary shrink-0 border-b">
    <nav className="flex min-h-14 items-center justify-between gap-3 px-4 py-2">
      <Link
        className="flex items-center gap-2.5 transition-opacity hover:opacity-85"
        to="/"
      >
        <span className="bg-primary text-primary-foreground flex h-7 w-7 items-center justify-center rounded-full">
          <Robot className="h-4 w-4" weight="fill" />
        </span>
        <div className="flex items-baseline gap-1.5">
          <span className="text-foreground text-[14px] font-semibold tracking-tight">
            kynos
          </span>
          <span className="text-muted-foreground hidden font-mono text-[11px] sm:inline">
            / console
          </span>
        </div>
      </Link>

      <div className="flex items-center gap-2 text-xs">
        <span className="border-border bg-background/60 text-muted-foreground hidden items-center gap-1.5 rounded-full border px-3 py-1 font-sans text-[10px] md:flex">
          <SimpleIcon icon={siBun} className="h-3 w-3" />
          bun 1.4
        </span>
        <span className="border-border bg-background/60 text-muted-foreground hidden items-center gap-1.5 rounded-full border px-3 py-1 font-sans text-[10px] md:flex">
          <SimpleIcon icon={siSqlite} className="h-3 w-3" />
          sqlite · wal
        </span>
        <ThemeToggle />
        <button
          aria-label="Open command palette"
          className="kbd hover:border-muted-foreground/40 hover:text-foreground flex min-h-9 min-w-9 cursor-pointer items-center justify-center rounded-full transition-colors"
          onClick={() => window.dispatchEvent(new Event("kynos:palette-open"))}
          title="Command palette"
          type="button"
        >
          ⌘K
        </button>
        <button
          aria-label="Sign out"
          className="border-border bg-background/60 text-muted-foreground hover:border-destructive/30 hover:bg-destructive/10 hover:text-destructive flex min-h-9 items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors"
          onClick={async () => {
            await logoutFn();
            window.location.href = "/login";
          }}
          title="Logout"
          type="button"
        >
          <SignOut className="h-3.5 w-3.5" />
          <span className="hidden font-medium sm:inline">Logout</span>
        </button>
      </div>
    </nav>
  </header>
);

export default Header;
