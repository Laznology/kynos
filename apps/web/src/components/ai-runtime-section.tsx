import { AI_MODEL_PRESETS } from "@kynos/shared";
import type { AIProvider, AppSettings, ReasoningEffort } from "@kynos/shared";
import {
  ArrowsClockwise,
  Brain,
  CaretDown,
  Check,
  Key,
  Lightning,
  MagnifyingGlass,
  Plugs,
  SlidersHorizontal,
  Sparkle,
} from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { siAnthropic, siOllama, siOpenrouter } from "simple-icons";

import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { SimpleIcon } from "../components/ui/simple-icon";
import { Textarea } from "../components/ui/textarea";
import type { ModelOption } from "../lib/server-api";

const vendorOf = (m: ModelOption): string => {
  const by = m.owned_by?.trim().toLowerCase();
  if (by) {
    return by;
  }
  const prefix = m.id.split("/")[0]?.toLowerCase();
  return prefix || "unknown";
};

const vendorGlyph = (vendor: string): ReactNode => {
  if (vendor.includes("openrouter")) {
    return <SimpleIcon icon={siOpenrouter} className="h-3 w-3" />;
  }
  if (vendor.includes("ollama")) {
    return <SimpleIcon icon={siOllama} className="h-3 w-3" />;
  }
  if (vendor.includes("anthropic")) {
    return <SimpleIcon icon={siAnthropic} className="h-3 w-3" />;
  }
  if (vendor.includes("groq")) {
    return <Lightning className="h-3 w-3" />;
  }
  return <Brain className="h-3 w-3" />;
};

const ModelBrowser = ({
  availableModels,
  error,
  isFetching,
  model,
  onSelectModel,
}: {
  availableModels: ModelOption[];
  error: string | null;
  isFetching: boolean;
  model: string;
  onSelectModel: (id: string) => void;
}) => {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [vendor, setVendor] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  const facets = useMemo(() => {
    const counts = new Map<string, number>();
    for (const m of availableModels) {
      const v = vendorOf(m);
      counts.set(v, (counts.get(v) ?? 0) + 1);
    }
    return [...counts.entries()].toSorted((a, b) => b[1] - a[1]).slice(0, 7);
  }, [availableModels]);

  const groups = useMemo(() => {
    const tokens = query.toLowerCase().split(/\s+/u).filter(Boolean);
    const matched = availableModels.filter((m) => {
      if (vendor && vendorOf(m) !== vendor) {
        return false;
      }
      const hay = `${m.id} ${m.name ?? ""} ${m.owned_by ?? ""}`.toLowerCase();
      return tokens.every((t) => hay.includes(t));
    });
    const map = new Map<string, ModelOption[]>();
    for (const m of matched) {
      const v = vendorOf(m);
      const list = map.get(v);
      if (list) {
        list.push(m);
      } else {
        map.set(v, [m]);
      }
    }
    return [...map.entries()].toSorted((a, b) => b[1].length - a[1].length);
  }, [availableModels, query, vendor]);

  const ordered = useMemo(() => groups.flatMap(([, list]) => list), [groups]);

  const active = ordered.some((m) => m.id === activeId)
    ? activeId
    : (ordered[0]?.id ?? null);

  useEffect(() => {
    if (!isOpen || !active) {
      return;
    }
    const el = panelRef.current?.querySelector(
      `[data-model="${CSS.escape(active)}"]`
    );
    el?.scrollIntoView({ block: "nearest" });
  }, [active, isOpen]);

  const pick = (id: string) => {
    onSelectModel(id);
    setIsOpen(false);
  };

  const move = (delta: number) => {
    if (ordered.length === 0) {
      return;
    }
    const idx = ordered.findIndex((m) => m.id === active);
    const next = Math.min(ordered.length - 1, Math.max(0, idx + delta));
    setActiveId(ordered[next]?.id ?? null);
  };

  return (
    <div className="relative" ref={panelRef}>
      <div className="mb-1.5 flex items-center justify-between">
        <Label htmlFor="model_browser_trigger">Active model</Label>
        <button
          className="font-mono text-[10px] text-zinc-600 transition-colors hover:text-zinc-300"
          onClick={() => setIsOpen((v) => !v)}
          type="button"
        >
          {isOpen ? "close" : "browse models"}
        </button>
      </div>

      <button
        className="flex w-full cursor-pointer items-center gap-2.5 rounded-sm border border-white/10 bg-white/[0.03] px-2.5 py-2 text-left transition-colors hover:border-white/20"
        id="model_browser_trigger"
        onClick={() => setIsOpen((v) => !v)}
        type="button"
      >
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-xs border border-white/[0.08] bg-white/[0.03] text-zinc-400">
          <Brain className="h-3.5 w-3.5" />
        </span>
        <span className="min-w-0 flex-1 truncate font-mono text-xs text-zinc-100">
          {model || "no model selected"}
        </span>
        {availableModels.length > 0 && (
          <span className="shrink-0 font-mono text-[10px] text-zinc-500 tabular-nums">
            {availableModels.length}
          </span>
        )}
        <CaretDown
          className={`h-3.5 w-3.5 shrink-0 text-zinc-500 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {error && !isOpen && (
        <p className="mt-1.5 font-mono text-[10px] text-rose-300">{error}</p>
      )}

      {isOpen && (
        <div className="animate-fade-in absolute top-full right-0 left-0 z-40 mt-1.5 overflow-hidden rounded-md border border-white/10 bg-[#0b0b0e] shadow-[0_24px_60px_-12px_rgba(0,0,0,0.85)]">
          <div className="flex items-center gap-2 border-b border-white/[0.07] px-3">
            <MagnifyingGlass className="h-3.5 w-3.5 shrink-0 text-zinc-600" />
            <input
              aria-label="Search models"
              autoFocus
              className="h-9 w-full bg-transparent font-mono text-xs text-zinc-100 outline-none placeholder:text-zinc-600"
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setIsOpen(false);
                }
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  move(1);
                }
                if (e.key === "ArrowUp") {
                  e.preventDefault();
                  move(-1);
                }
                if (e.key === "Enter" && active) {
                  e.preventDefault();
                  pick(active);
                }
              }}
              placeholder="Filter id / vendor..."
              value={query}
            />
          </div>

          <div className="flex gap-1 overflow-x-auto border-b border-white/[0.07] px-2 py-1.5">
            <button
              className={`shrink-0 rounded-sm px-2 py-1 font-mono text-[10px] transition-colors ${
                vendor === null
                  ? "bg-white/10 text-zinc-100"
                  : "text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-200"
              }`}
              onClick={() => setVendor(null)}
              type="button"
            >
              all · {availableModels.length}
            </button>
            {facets.map(([v, count]) => (
              <button
                className={`shrink-0 rounded-sm px-2 py-1 font-mono text-[10px] transition-colors ${
                  vendor === v
                    ? "bg-white/10 text-zinc-100"
                    : "text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-200"
                }`}
                key={v}
                onClick={() => setVendor(v)}
                type="button"
              >
                {v} · {count}
              </button>
            ))}
          </div>

          <div className="max-h-[280px] overflow-y-auto py-1">
            {isFetching && (
              <div className="flex items-center gap-2 px-3 py-6 font-mono text-[11px] text-zinc-500">
                <ArrowsClockwise className="h-3.5 w-3.5 animate-spin" />
                fetching /models...
              </div>
            )}
            {!isFetching && error && (
              <p className="px-3 py-4 font-mono text-[11px] text-rose-300">
                {error} — check Base URL / API Key, then click Sync.
              </p>
            )}
            {!isFetching && !error && ordered.length === 0 && (
              <p className="px-3 py-6 text-center font-mono text-[11px] text-zinc-600">
                No models match.
              </p>
            )}
            {!isFetching &&
              groups.map(([v, list]) => (
                <div key={v}>
                  <p className="sticky top-0 z-10 flex items-center gap-1.5 bg-[#0b0b0e] px-3 pt-1.5 pb-1 font-mono text-[9.5px] tracking-[0.08em] text-zinc-600 uppercase">
                    {vendorGlyph(v)}
                    {v}
                    <span className="tabular-nums">· {list.length}</span>
                  </p>
                  {list.map((m) => {
                    const isSelected = model === m.id;
                    const isActive = active === m.id;
                    return (
                      <button
                        className={`flex w-full items-center gap-2 rounded-xs px-3 py-1.5 text-left transition-colors ${
                          isActive ? "bg-white/[0.07]" : "hover:bg-white/[0.04]"
                        }`}
                        data-model={m.id}
                        key={m.id}
                        onClick={() => pick(m.id)}
                        onMouseEnter={() => setActiveId(m.id)}
                        type="button"
                      >
                        <span
                          className={`min-w-0 flex-1 truncate font-mono text-[11px] ${
                            isSelected ? "text-zinc-100" : "text-zinc-300"
                          }`}
                        >
                          {m.id}
                        </span>
                        {m.context_length ? (
                          <span className="shrink-0 rounded-xs border border-white/[0.07] px-1.5 py-0.5 font-mono text-[9px] text-zinc-500 tabular-nums">
                            {Math.round(m.context_length / 1000)}k ctx
                          </span>
                        ) : null}
                        {isSelected && (
                          <Check className="h-3.5 w-3.5 shrink-0 text-zinc-100" />
                        )}
                      </button>
                    );
                  })}
                </div>
              ))}
          </div>

          <div className="flex items-center justify-between border-t border-white/[0.07] px-3 py-1.5">
            <span className="font-mono text-[10px] text-zinc-600 tabular-nums">
              {ordered.length} / {availableModels.length} model
            </span>
            <span className="flex items-center gap-1.5">
              <span className="kbd">↑↓</span>
              <span className="kbd">↵</span>
              <span className="kbd">esc</span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

const Segmented = <T extends string>({
  onChange,
  options,
  value,
}: {
  onChange: (v: T) => void;
  options: { icon?: ReactNode; label: string; value: T }[];
  value: T;
}) => (
  <div className="flex flex-wrap gap-1">
    {options.map((o) => (
      <button
        aria-pressed={o.value === value}
        className={`flex items-center gap-1.5 rounded-sm border px-2.5 py-1.5 font-mono text-[10px] transition-colors ${
          o.value === value
            ? "border-white/20 bg-white/[0.08] text-zinc-100"
            : "border-white/[0.07] bg-white/[0.02] text-zinc-500 hover:border-white/15 hover:text-zinc-200"
        }`}
        key={o.value}
        onClick={() => onChange(o.value)}
        type="button"
      >
        {o.icon && <span className="[&_svg]:h-3 [&_svg]:w-3">{o.icon}</span>}
        {o.label}
      </button>
    ))}
  </div>
);

export const AiRuntimeSection = ({
  availableModels,
  isFetchingModels,
  modelsFetchError,
  onFetchModels,
  onPresetSelect,
  onProviderChange,
  setSettings,
  settings,
}: {
  availableModels: ModelOption[];
  isFetchingModels: boolean;
  modelsFetchError: string | null;
  onFetchModels: () => void;
  onPresetSelect: (id: string) => void;
  onProviderChange: (p: AIProvider) => void;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
  settings: AppSettings;
}) => (
  <div className="space-y-4">
    <Card>
      <CardHeader className="flex-row items-center justify-between border-b border-white/[0.07]">
        <div className="flex items-center gap-2">
          <Sparkle className="h-4 w-4 text-zinc-500" />
          <div>
            <h2 className="text-[13px] font-semibold tracking-tight text-zinc-100">
              Model &amp; Routing
            </h2>
            <p className="mt-0.5 text-[11px] text-zinc-500">
              Model inventory synced from the endpoint{" "}
              <code className="rounded-xs bg-white/[0.06] px-1 py-0.5 font-mono text-[10px] text-zinc-300">
                /models
              </code>{" "}
              upstream.
            </p>
          </div>
        </div>
        <Button
          disabled={isFetchingModels}
          onClick={onFetchModels}
          size="sm"
          variant="outline"
        >
          <ArrowsClockwise className={isFetchingModels ? "animate-spin" : ""} />
          Sync
        </Button>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        <ModelBrowser
          availableModels={availableModels}
          error={modelsFetchError}
          isFetching={isFetchingModels}
          model={settings.ai_model}
          onSelectModel={(id) =>
            setSettings((prev) => ({ ...prev, ai_model: id }))
          }
        />

        <div>
          <p className="mb-1.5 font-mono text-[9.5px] tracking-[0.08em] text-zinc-600 uppercase">
            preset
          </p>
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
            {AI_MODEL_PRESETS.slice(0, 4).map((preset) => {
              const isSelected = settings.ai_model === preset.id;
              return (
                <button
                  className={`flex flex-col rounded-sm border px-2.5 py-2 text-left transition-colors ${
                    isSelected
                      ? "border-white/20 bg-white/[0.06]"
                      : "border-white/[0.07] bg-white/[0.02] hover:border-white/15"
                  }`}
                  key={preset.id}
                  onClick={() => onPresetSelect(preset.id)}
                  type="button"
                >
                  <span className="truncate text-[11px] font-medium text-zinc-200">
                    {preset.name}
                  </span>
                  <span className="mt-0.5 truncate font-mono text-[9.5px] text-zinc-600">
                    {preset.provider}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="border-b border-white/[0.07]">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-zinc-500" />
          <h2 className="text-[13px] font-semibold tracking-tight text-zinc-100">
            Endpoint &amp; Parameter
          </h2>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        <div className="space-y-1.5">
          <p className="text-[11px] leading-none font-medium text-zinc-400">
            Provider
          </p>
          <Segmented
            onChange={onProviderChange}
            options={[
              {
                icon: <SimpleIcon icon={siOpenrouter} className="h-3 w-3" />,
                label: "openrouter",
                value: "openrouter" as AIProvider,
              },
              {
                icon: <Sparkle />,
                label: "openai",
                value: "openai" as AIProvider,
              },
              {
                icon: <Lightning />,
                label: "groq",
                value: "groq" as AIProvider,
              },
              {
                icon: <SimpleIcon icon={siOllama} className="h-3 w-3" />,
                label: "ollama",
                value: "ollama" as AIProvider,
              },
              {
                icon: <Plugs />,
                label: "custom",
                value: "custom" as AIProvider,
              },
            ]}
            value={settings.ai_provider}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="base_url">Base URL</Label>
            <Input
              className="font-mono text-[11px]"
              id="base_url"
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  ai_base_url: e.target.value,
                }))
              }
              value={settings.ai_base_url}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="api_key">
              <Key className="h-3 w-3" />
              API Key
            </Label>
            <Input
              className="font-mono text-[11px]"
              id="api_key"
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  ai_api_key: e.target.value,
                }))
              }
              placeholder="sk-..."
              type="password"
              value={settings.ai_api_key}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="model_id">Model ID (manual override)</Label>
            <Input
              className="font-mono text-[11px]"
              id="model_id"
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  ai_model: e.target.value,
                }))
              }
              value={settings.ai_model}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="max_tokens">Max output tokens</Label>
            <Input
              className="font-mono text-[11px]"
              id="max_tokens"
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  ai_max_tokens: Number(e.target.value),
                }))
              }
              type="number"
              value={settings.ai_max_tokens}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 border-t border-white/[0.07] pt-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <p className="text-[11px] leading-none font-medium text-zinc-400">
              Reasoning effort
            </p>
            <Segmented
              onChange={(v) =>
                setSettings((prev) => ({
                  ...prev,
                  ai_reasoning_effort: v,
                }))
              }
              options={[
                { label: "none", value: "none" as ReasoningEffort },
                { label: "low", value: "low" as ReasoningEffort },
                { label: "medium", value: "medium" as ReasoningEffort },
                { label: "high", value: "high" as ReasoningEffort },
              ]}
              value={settings.ai_reasoning_effort}
            />
          </div>
          <div className="space-y-1.5">
            <p className="text-[11px] leading-none font-medium text-zinc-400">
              Group access
            </p>
            <p className="text-[10px] leading-relaxed text-zinc-600">
              Groups and DMs are both restricted: only JIDs listed in the
              Gateway panel allowlist are served. In an allowed group the bot
              answers only when mentioned or its message is quoted.
            </p>
          </div>
        </div>

        <div className="space-y-1.5 border-t border-white/[0.07] pt-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="system_prompt">System persona prompt</Label>
            <span className="font-mono text-[10px] text-zinc-600 tabular-nums">
              {settings.ai_system_prompt.length} chars
            </span>
          </div>
          <Textarea
            className="font-mono text-[11px]"
            id="system_prompt"
            onChange={(e) =>
              setSettings((prev) => ({
                ...prev,
                ai_system_prompt: e.target.value,
              }))
            }
            rows={4}
            value={settings.ai_system_prompt}
          />
        </div>
      </CardContent>
    </Card>
  </div>
);
