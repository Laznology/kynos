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
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [vendor, setVendor] = useState<string | null>(null);
  const [activeIdx, setActiveIdx] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleOutside);
      return () => document.removeEventListener("mousedown", handleOutside);
    }
  }, [isOpen]);

  const vendors = useMemo(() => {
    const set = new Set<string>();
    for (const m of availableModels) {
      set.add(vendorOf(m));
    }
    return [...set].toSorted();
  }, [availableModels]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return availableModels.filter((m) => {
      const matchVendor = vendor === null || vendorOf(m) === vendor;
      if (!matchVendor) {
        return false;
      }
      if (!q) {
        return true;
      }
      return (
        m.id.toLowerCase().includes(q) ||
        (m.name && m.name.toLowerCase().includes(q)) ||
        (m.description && m.description.toLowerCase().includes(q))
      );
    });
  }, [availableModels, query, vendor]);

  const grouped = useMemo(() => {
    const map = new Map<string, ModelOption[]>();
    for (const m of filtered) {
      const v = vendorOf(m);
      const list = map.get(v) || [];
      list.push(m);
      map.set(v, list);
    }
    return map;
  }, [filtered]);

  const ordered = useMemo(() => {
    const out: ModelOption[] = [];
    for (const list of grouped.values()) {
      for (const m of list) {
        out.push(m);
      }
    }
    return out;
  }, [grouped]);

  const active = ordered[activeIdx];

  const pick = (m: ModelOption) => {
    onSelectModel(m.id);
    setIsOpen(false);
  };

  const move = (delta: number) => {
    setActiveIdx((prev) => {
      const next = prev + delta;
      if (next < 0) {
        return 0;
      }
      if (next >= ordered.length) {
        return Math.max(0, ordered.length - 1);
      }
      return next;
    });
  };

  return (
    <div className="relative" ref={containerRef}>
      <div className="mb-2 flex items-center justify-between">
        <label
          className="text-foreground text-xs font-semibold"
          htmlFor="model_browser_trigger"
        >
          Model Selection
        </label>
        <button
          className="text-muted-foreground hover:text-foreground font-mono text-[11px] transition-colors"
          onClick={() => setIsOpen((v) => !v)}
          type="button"
        >
          {isOpen ? "close" : "browse catalog"}
        </button>
      </div>

      <button
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className="border-input bg-card hover:border-primary/50 flex w-full cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-2.5 text-left transition-colors"
        id="model_browser_trigger"
        onClick={() => setIsOpen((v) => !v)}
        type="button"
      >
        <span className="bg-secondary text-primary flex h-7 w-7 shrink-0 items-center justify-center rounded-lg">
          <Brain className="h-4 w-4" />
        </span>
        <span className="text-foreground min-w-0 flex-1 truncate font-mono text-xs font-medium">
          {model || "no model selected"}
        </span>
        {availableModels.length > 0 && (
          <span className="border-border bg-secondary/80 text-muted-foreground shrink-0 rounded-full border px-2.5 py-0.5 font-mono text-[10px] tabular-nums">
            {availableModels.length} models
          </span>
        )}
        <CaretDown
          className={`text-muted-foreground h-4 w-4 shrink-0 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {error && !isOpen && (
        <p className="text-destructive mt-1.5 font-mono text-xs">{error}</p>
      )}

      {isOpen && (
        <div className="animate-fade-in border-border bg-card absolute top-full right-0 left-0 z-40 mt-2 overflow-hidden rounded-2xl border shadow-2xl">
          <div className="border-border flex items-center gap-2.5 border-b px-4 py-2.5">
            <MagnifyingGlass className="text-muted-foreground h-4 w-4 shrink-0" />
            <input
              aria-label="Search models"
              autoFocus
              className="text-foreground placeholder:text-muted-foreground h-8 w-full bg-transparent text-xs outline-none"
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
              placeholder="Filter id or vendor..."
              value={query}
            />
          </div>

          <div className="border-border flex gap-1.5 overflow-x-auto border-b px-3 py-2">
            <button
              className={`shrink-0 rounded-full px-3 py-1 font-mono text-[10px] transition-colors ${
                vendor === null
                  ? "bg-primary text-primary-foreground font-medium"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setVendor(null)}
              type="button"
            >
              all
            </button>
            {vendors.map((v) => (
              <button
                className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 font-mono text-[10px] transition-colors ${
                  vendor === v
                    ? "bg-primary text-primary-foreground font-medium"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
                key={v}
                onClick={() => setVendor(v)}
                type="button"
              >
                {vendorGlyph(v)}
                {v}
              </button>
            ))}
          </div>

          <div className="max-h-72 overflow-y-auto p-1.5" ref={listRef}>
            {isFetching && (
              <div className="text-muted-foreground flex items-center gap-2.5 px-4 py-8 font-mono text-xs">
                <ArrowsClockwise className="text-primary h-4 w-4 animate-spin" />
                syncing model catalog...
              </div>
            )}
            {error && (
              <p className="text-destructive px-4 py-6 font-mono text-xs">
                {error}
              </p>
            )}
            {!isFetching && !error && ordered.length === 0 && (
              <p className="text-muted-foreground px-4 py-8 text-center text-xs">
                No models match your query.
              </p>
            )}

            {[...grouped.entries()].map(([v, list]) => (
              <div key={v}>
                <p className="bg-card text-muted-foreground sticky top-0 z-10 flex items-center gap-2 px-3 pt-2 pb-1 font-mono text-[10px] font-semibold tracking-wider uppercase">
                  {vendorGlyph(v)}
                  {v}
                  <span className="tabular-nums">· {list.length}</span>
                </p>
                <div className="space-y-0.5">
                  {list.map((m) => {
                    const isSelected = m.id === model;
                    const isActive = active?.id === m.id;
                    const getItemStyle = () => {
                      if (isSelected) {
                        return "bg-primary/10 text-primary font-medium";
                      }
                      if (isActive) {
                        return "bg-secondary text-foreground";
                      }
                      return "text-foreground hover:bg-secondary/60";
                    };
                    return (
                      <button
                        className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left transition-colors ${getItemStyle()}`}
                        key={m.id}
                        onClick={() => pick(m)}
                        type="button"
                      >
                        <span className="min-w-0 flex-1 truncate font-mono text-xs">
                          {m.id}
                        </span>
                        {m.context_length ? (
                          <span className="border-border bg-secondary/80 text-muted-foreground shrink-0 rounded-full border px-2 py-0.5 font-mono text-[10px] tabular-nums">
                            {Math.round(m.context_length / 1000)}k ctx
                          </span>
                        ) : null}
                        {isSelected && (
                          <Check className="text-primary h-4 w-4 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="border-border flex items-center justify-between border-t px-4 py-2">
            <span className="text-muted-foreground font-mono text-[10px] tabular-nums">
              {ordered.length} / {availableModels.length} models
            </span>
            <span className="flex items-center gap-2">
              <span className="kbd">↵</span>
              <span className="text-muted-foreground text-[10px]">select</span>
              <span className="kbd">esc</span>
              <span className="text-muted-foreground text-[10px]">close</span>
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
  <div className="flex flex-wrap gap-1.5">
    {options.map((o) => (
      <button
        className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition-all ${
          o.value === value
            ? "bg-primary text-primary-foreground shadow-sm"
            : "border-border bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground border"
        }`}
        key={o.value}
        onClick={() => onChange(o.value)}
        type="button"
      >
        {o.icon}
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
  onPresetSelect: (preset: {
    baseUrl: string;
    model: string;
    provider: AIProvider;
  }) => void;
  onProviderChange: (p: AIProvider) => void;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
  settings: AppSettings;
}) => (
  <div className="space-y-5">
    <Card>
      <CardHeader className="border-border flex-row items-center justify-between border-b px-5 py-4">
        <div className="flex items-center gap-2.5">
          <Sparkle className="text-primary h-4 w-4" />
          <div>
            <h2 className="text-foreground text-sm font-semibold tracking-tight">
              Model & Routing
            </h2>
            <p className="text-muted-foreground mt-0.5 text-xs">
              Dynamic model inventory from upstream endpoint.
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
          Sync Models
        </Button>
      </CardHeader>
      <CardContent className="space-y-5 p-5">
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
          <p className="text-muted-foreground mb-2 font-mono text-[10px] font-semibold tracking-wider uppercase">
            Recommended Presets
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {AI_MODEL_PRESETS.slice(0, 4).map((preset) => {
              const isSelected = settings.ai_model === preset.model;
              return (
                <button
                  className={`flex flex-col rounded-xl border p-3 text-left transition-all ${
                    isSelected
                      ? "border-primary bg-primary/10 text-primary shadow-sm"
                      : "border-border bg-card hover:border-primary/40 hover:bg-secondary/40"
                  }`}
                  key={preset.id}
                  onClick={() => onPresetSelect(preset)}
                  type="button"
                >
                  <span className="text-foreground font-mono text-xs font-semibold">
                    {preset.name}
                  </span>
                  <span className="text-muted-foreground mt-1 line-clamp-1 font-mono text-[10px]">
                    {preset.model}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="border-border border-b px-5 py-4">
        <div className="flex items-center gap-2.5">
          <SlidersHorizontal className="text-primary h-4 w-4" />
          <h2 className="text-foreground text-sm font-semibold tracking-tight">
            Endpoint & Parameters
          </h2>
        </div>
      </CardHeader>
      <CardContent className="space-y-5 p-5">
        <div className="space-y-2">
          <span className="text-foreground text-xs font-medium">
            AI Provider
          </span>
          <Segmented
            onChange={onProviderChange}
            options={[
              {
                icon: <SimpleIcon icon={siOpenrouter} className="h-3 w-3" />,
                label: "openrouter",
                value: "openrouter" as AIProvider,
              },
              {
                icon: <Sparkle className="h-3 w-3" />,
                label: "openai",
                value: "openai" as AIProvider,
              },
              {
                icon: <Lightning className="h-3 w-3" />,
                label: "groq",
                value: "groq" as AIProvider,
              },
              {
                icon: <SimpleIcon icon={siOllama} className="h-3 w-3" />,
                label: "ollama",
                value: "ollama" as AIProvider,
              },
              {
                icon: <Plugs className="h-3 w-3" />,
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
              className="font-mono text-xs"
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
              className="font-mono text-xs"
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
            <Label htmlFor="model_id">Model ID (Manual Override)</Label>
            <Input
              className="font-mono text-xs"
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
            <Label htmlFor="max_tokens">Max Output Tokens</Label>
            <Input
              className="font-mono text-xs"
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

        <div className="border-border grid grid-cols-1 gap-4 border-t pt-5 sm:grid-cols-2">
          <div className="space-y-2">
            <span className="text-foreground text-xs font-medium">
              Reasoning Effort
            </span>
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
            <span className="text-foreground text-xs font-medium">
              Access Boundary
            </span>
            <p className="text-muted-foreground text-xs leading-relaxed">
              Bot operates only in authorized groups and DMs listed in the
              Gateway panel. In groups, bot requires explicit mention or quote.
            </p>
          </div>
        </div>

        <div className="border-border space-y-2 border-t pt-5">
          <div className="flex items-center justify-between">
            <Label htmlFor="system_prompt">System Persona Prompt</Label>
            <span className="text-muted-foreground font-mono text-xs tabular-nums">
              {settings.ai_system_prompt.length} chars
            </span>
          </div>
          <Textarea
            className="font-mono text-xs"
            id="system_prompt"
            onChange={(e) =>
              setSettings((prev) => ({
                ...prev,
                ai_system_prompt: e.target.value,
              }))
            }
            rows={5}
            value={settings.ai_system_prompt}
          />
        </div>
      </CardContent>
    </Card>
  </div>
);
