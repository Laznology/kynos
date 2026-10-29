import { Monitor, Moon, Sun } from "@phosphor-icons/react";
import { useEffect, useState } from "react";

type ThemeMode = "light" | "dark" | "auto";

const getInitialMode = (): ThemeMode => {
  if (typeof window === "undefined") {
    return "auto";
  }

  const stored = window.localStorage.getItem("theme");
  if (stored === "light" || stored === "dark" || stored === "auto") {
    return stored;
  }

  return "auto";
};

const applyThemeMode = (mode: ThemeMode) => {
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  let resolved: "light" | "dark" = "light";
  if (mode === "auto") {
    resolved = prefersDark ? "dark" : "light";
  } else {
    resolved = mode;
  }

  document.documentElement.classList.remove("light", "dark");
  document.documentElement.classList.add(resolved);

  if (mode === "auto") {
    delete document.documentElement.dataset.theme;
  } else {
    document.documentElement.dataset.theme = mode;
  }

  document.documentElement.style.colorScheme = resolved;
};

export const ThemeToggle = () => {
  const [mode, setMode] = useState<ThemeMode>(getInitialMode);

  useEffect(() => {
    applyThemeMode(mode);
  }, [mode]);

  useEffect(() => {
    if (mode !== "auto") {
      return;
    }

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyThemeMode("auto");

    media.addEventListener("change", onChange);
    return () => {
      media.removeEventListener("change", onChange);
    };
  }, [mode]);

  const toggleMode = () => {
    let nextMode: ThemeMode = "light";
    if (mode === "light") {
      nextMode = "dark";
    } else if (mode === "dark") {
      nextMode = "auto";
    }

    setMode(nextMode);
    applyThemeMode(nextMode);
    window.localStorage.setItem("theme", nextMode);
  };

  const label = `Theme: ${mode}. Click to switch mode.`;
  return (
    <button
      type="button"
      onClick={toggleMode}
      aria-label={label}
      title={label}
      className="border-border bg-background/60 text-muted-foreground hover:text-foreground focus-visible:ring-ring flex min-h-9 min-w-9 items-center justify-center rounded-full border transition-colors focus-visible:ring-2 focus-visible:outline-none"
    >
      {mode === "auto" && <Monitor aria-hidden="true" className="h-4 w-4" />}
      {mode === "dark" && <Moon aria-hidden="true" className="h-4 w-4" />}
      {mode === "light" && <Sun aria-hidden="true" className="h-4 w-4" />}
    </button>
  );
};
export default ThemeToggle;
