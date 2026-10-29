import { AVAILABLE_TOOLS } from "@kynos/shared";
import type {
  AppSettings,
  AuditLog,
  BotState,
  BotStatus,
  SkillRecord,
} from "@kynos/shared";
import {
  ArrowCounterClockwise,
  ArrowsClockwise,
  Brain,
  ChatCircleText,
  CheckCircle,
  ClockCounterClockwise,
  Code,
  FloppyDisk,
  Plus,
  ShieldCheck,
  SidebarSimple,
  SlidersHorizontal,
  Terminal,
  TerminalWindow,
  Trash,
  UsersThree,
  Wrench,
} from "@phosphor-icons/react";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useCallback, useEffect, useState, useTransition } from "react";
import type { ReactNode } from "react";
import { siWhatsapp } from "simple-icons";

import { AiRuntimeSection } from "../components/ai-runtime-section";
import { CommandPalette } from "../components/command-palette";
import type { PaletteCommand } from "../components/command-palette";
import { AuditSection, SidebarNav } from "../components/dashboard-layout";
import type { NavSection } from "../components/dashboard-layout";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { SimpleIcon } from "../components/ui/simple-icon";
import { Switch } from "../components/ui/switch";
import { Textarea } from "../components/ui/textarea";
import {
  createSkillFn,
  deleteSkillFn,
  fetchAvailableModels,
  fetchDashboardData,
  saveSettingsFn,
  toggleSkillFn,
  triggerBotRestartFn,
} from "../lib/server-api";
import type { DashboardData, ModelOption } from "../lib/server-api";

const NAV_SECTIONS: { id: NavSection; keywords: string; label: string }[] = [
  {
    id: "gateway",
    keywords: "pairing qr code session status whatsapp connection",
    label: "Gateway",
  },
  {
    id: "ai_runtime",
    keywords: "model provider endpoint api key routing",
    label: "AI Gateway",
  },
  {
    id: "tools",
    keywords: "agent tools calculator weather reminder memory",
    label: "Tools",
  },
  { id: "skills", keywords: "skill expertise workflow", label: "Skills" },
  { id: "audit", keywords: "log history event execution", label: "Audit" },
];

const getStatusVisual = (status: BotStatus) => {
  if (status === "connected") {
    return {
      dot: "bg-emerald-400",
      label: "connected",
      variant: "success" as const,
    };
  }
  if (status === "connecting") {
    return {
      dot: "bg-amber-400",
      label: "connecting",
      variant: "warning" as const,
    };
  }
  if (status === "qr_ready") {
    return { dot: "bg-primary", label: "qr ready", variant: "info" as const };
  }
  return {
    dot: "bg-destructive",
    label: "offline",
    variant: "destructive" as const,
  };
};

const COMMAND_REF = [
  {
    name: "/s",
    desc: "Convert image, video (max 10s), or GIF into a WebP sticker.",
  },
  {
    name: "/toimg",
    desc: "Extract a WhatsApp sticker back into PNG or GIF.",
  },
  {
    name: "/smeme [top]|[bottom]",
    desc: "Meme sticker with heavy Impact typography stroke.",
  },
  { name: "/status", desc: "Bot diagnostics, chat memory, runtime health." },
];

const GatewaySection = ({
  setSettings,
  settings,
  state,
}: {
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
  settings: AppSettings;
  state: BotState;
}) => {
  let content: React.ReactNode = null;

  if (state.status === "qr_ready" && state.qr_code) {
    content = (
      <div className="flex flex-col items-center gap-4 py-6 text-center">
        <div className="w-fit rounded-2xl border border-white/20 bg-white p-4 shadow-xl">
          <img
            alt="WhatsApp pairing QR code"
            className="h-56 w-56 sm:h-64 sm:w-64"
            src={`https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(
              state.qr_code
            )}`}
          />
        </div>
        <div className="space-y-1">
          <p className="text-xs font-medium text-foreground">
            WhatsApp › Linked Devices › Link a Device
          </p>
          <p className="text-xs text-muted-foreground">
            Scan the QR code with your camera to authenticate the session.
          </p>
        </div>
      </div>
    );
  } else if (state.status === "connected") {
    content = (
      <div className="flex flex-col items-center gap-4 py-8 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400">
          <CheckCircle className="h-7 w-7" weight="fill" />
        </span>
        <div className="space-y-1.5">
          <p className="text-base font-semibold tracking-tight text-foreground">
            Gateway Online
          </p>
          <p className="max-w-md text-xs leading-relaxed text-muted-foreground">
            Baileys socket is verified and stable. The daemon receives incoming WhatsApp
            events and executes the AI pipeline.
          </p>
        </div>
        {state.phone_number && (
          <span className="flex items-center gap-2 rounded-full border border-border bg-secondary/60 px-3.5 py-1.5 font-mono text-xs text-foreground">
            <SimpleIcon
              icon={siWhatsapp}
              className="h-3.5 w-3.5 text-emerald-400"
            />
            +{state.phone_number}
          </span>
        )}
      </div>
    );
  } else {
    content = (
      <div className="flex flex-col items-center gap-4 py-8 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary text-muted-foreground">
          <TerminalWindow className="h-6 w-6" />
        </span>
        <div className="space-y-1.5">
          <p className="text-sm font-medium text-foreground">
            Daemon Not Running
          </p>
          <p className="max-w-md text-xs text-muted-foreground">
            Start the bot process in your terminal to open the WhatsApp connection:
          </p>
        </div>
        <code className="kbd text-xs">bun run dev:all</code>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Top Main Pairing Panel */}
      <div className="rounded-2xl border border-border bg-card shadow-sm">
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <SimpleIcon
              icon={siWhatsapp}
              className="h-4 w-4 text-emerald-400"
            />
            <h2 className="text-sm font-semibold tracking-tight text-foreground">
              WhatsApp Pairing
            </h2>
          </div>
          <Badge variant="secondary">baileys v7</Badge>
        </div>
        <div className="p-6">{content}</div>
      </div>

      {/* Balanced 2-Column Bento Grid */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {/* Left Column: Group Access */}
        <div className="rounded-2xl border border-border bg-card shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
              <div className="flex items-center gap-2.5">
                <UsersThree className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-semibold tracking-tight text-foreground">
                  Group Access
                </h2>
              </div>
              <Badge variant="secondary">
                {settings.allowed_groups.length} groups
              </Badge>
            </div>
            <div className="space-y-3 p-5">
              <Textarea
                className="font-mono text-xs"
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    allowed_groups: e.target.value
                      .split("\n")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  }))
                }
                placeholder={"12036xxxxx@g.us\n12036yyyyy@g.us"}
                rows={4}
                value={settings.allowed_groups.join("\n")}
              />
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                One group JID per line. Empty = no group is served. Bot answers when mentioned or quoted.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Private Access & Owner */}
        <div className="rounded-2xl border border-border bg-card shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-semibold tracking-tight text-foreground">
                  Private Access
                </h2>
              </div>
              <Badge variant="secondary">
                {settings.allowed_users.length} users
              </Badge>
            </div>
            <div className="space-y-3.5 p-5">
              <Textarea
                className="font-mono text-xs"
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    allowed_users: e.target.value
                      .split("\n")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  }))
                }
                placeholder={"6281234567890\n+62 812-3456-7890"}
                rows={2}
                value={settings.allowed_users.join("\n")}
              />
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground" htmlFor="owner_jid">
                  Owner Handle
                </Label>
                <Input
                  className="font-mono text-xs"
                  id="owner_jid"
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      owner_jid: e.target.value,
                    }))
                  }
                  placeholder="@ilazer"
                  value={settings.owner_jid}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Grid: Runtime Parameters & Command Reference */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {/* Runtime Parameters */}
        <div className="rounded-2xl border border-border bg-card shadow-sm">
          <div className="flex items-center gap-2.5 border-b border-border px-5 py-3.5">
            <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold tracking-tight text-foreground">
              Runtime Parameters
            </h2>
          </div>
          <dl className="divide-y divide-border/60">
            {[
              ["Command prefix", settings.bot_prefix],
              ["Group access", `${settings.allowed_groups.length} allowed`],
              ["Private access", `${settings.allowed_users.length} allowed`],
              ["Sticker pack", settings.sticker_pack_name],
              ["Reasoning effort", settings.ai_reasoning_effort],
            ].map(([k, v]) => (
              <div
                className="flex items-center justify-between px-5 py-2.5 text-xs"
                key={k}
              >
                <dt className="text-muted-foreground">{k}</dt>
                <dd className="max-w-[60%] truncate font-mono text-foreground font-medium">
                  {v}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        {/* Command Reference */}
        <div className="rounded-2xl border border-border bg-card shadow-sm">
          <div className="flex items-center gap-2.5 border-b border-border px-5 py-3.5">
            <Terminal className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold tracking-tight text-foreground">
              Command Reference
            </h2>
          </div>
          <div className="divide-y divide-border/60">
            {COMMAND_REF.map((c) => (
              <div
                className="px-5 py-2.5 transition-colors hover:bg-secondary/40"
                key={c.name}
              >
                <p className="font-mono text-xs font-semibold text-primary">
                  {c.name}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
                  {c.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const SkillsSection = ({
  handleCreateSkillSubmit,
  handleDeleteSkill,
  handleToggleSkill,
  isPending,
  newSkillBody,
  newSkillDesc,
  newSkillName,
  setNewSkillBody,
  setNewSkillDesc,
  setNewSkillName,
  setShowSkillForm,
  showSkillForm,
  skills,
}: {
  handleCreateSkillSubmit: (e: React.FormEvent) => void;
  handleDeleteSkill: (name: string) => void;
  handleToggleSkill: (name: string, current: boolean) => void;
  isPending: boolean;
  newSkillBody: string;
  newSkillDesc: string;
  newSkillName: string;
  setNewSkillBody: (v: string) => void;
  setNewSkillDesc: (v: string) => void;
  setNewSkillName: (v: string) => void;
  setShowSkillForm: (v: boolean) => void;
  showSkillForm: boolean;
  skills: SkillRecord[];
}) => (
  <div className="rounded-2xl border border-border bg-card shadow-sm">
    <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
      <div className="flex items-center gap-2.5">
        <Code className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold tracking-tight text-foreground">
          Skills
        </h2>
        <Badge variant="secondary">{skills.length}</Badge>
      </div>
      <Button
        onClick={() => setShowSkillForm(!showSkillForm)}
        size="sm"
        variant="secondary"
      >
        <Plus className="h-3.5 w-3.5" />
        New skill
      </Button>
    </div>

    {showSkillForm && (
      <form
        className="animate-fade-in space-y-3.5 border-b border-border bg-secondary/30 p-5"
        onSubmit={handleCreateSkillSubmit}
      >
        <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="skill_name">Name (kebab-case)</Label>
            <Input
              id="skill_name"
              onChange={(e) => setNewSkillName(e.target.value)}
              placeholder="e.g. summarize-pdf"
              required
              value={newSkillName}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="skill_desc">When to use</Label>
            <Input
              id="skill_desc"
              onChange={(e) => setNewSkillDesc(e.target.value)}
              placeholder="Skill trigger condition"
              value={newSkillDesc}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="skill_body">Instructions (markdown)</Label>
          <Textarea
            className="font-mono text-xs"
            id="skill_body"
            onChange={(e) => setNewSkillBody(e.target.value)}
            placeholder="# Steps..."
            required
            rows={3}
            value={newSkillBody}
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button
            onClick={() => setShowSkillForm(false)}
            size="sm"
            type="button"
            variant="ghost"
          >
            Cancel
          </Button>
          <Button disabled={isPending} size="sm" type="submit">
            Create skill
          </Button>
        </div>
      </form>
    )}

    <div className="divide-y divide-border/60">
      {skills.length === 0 ? (
        <div className="py-12 text-center font-mono text-xs text-muted-foreground">
          No skills registered.
        </div>
      ) : (
        skills.map((skill) => (
          <div
            className="flex items-center justify-between gap-4 p-4 transition-colors hover:bg-secondary/40"
            key={skill.name}
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-semibold text-foreground">
                  {skill.name}
                </span>
                <Badge variant={skill.enabled ? "success" : "secondary"}>
                  {skill.enabled ? "active" : "disabled"}
                </Badge>
              </div>
              {skill.description && (
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                  {skill.description}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={skill.enabled}
                onCheckedChange={() =>
                  handleToggleSkill(skill.name, skill.enabled)
                }
              />
              <Button
                aria-label={`Delete ${skill.name}`}
                className="h-8 w-8 rounded-full text-muted-foreground hover:bg-destructive/15 hover:text-destructive"
                onClick={() => handleDeleteSkill(skill.name)}
                size="icon"
                variant="ghost"
              >
                <Trash className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))
      )}
    </div>
  </div>
);

const ToolsSection = ({
  enabledTools,
  onToggleTool,
}: {
  enabledTools: string[];
  onToggleTool: (toolId: string) => void;
}) => (
  <div className="rounded-2xl border border-border bg-card shadow-sm">
    <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
      <div className="flex items-center gap-2.5">
        <Wrench className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold tracking-tight text-foreground">
          Tools
        </h2>
      </div>
      <Badge variant="secondary">
        {enabledTools.length} / {AVAILABLE_TOOLS.length} active
      </Badge>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-border/60">
      {AVAILABLE_TOOLS.map((tool) => {
        const isEnabled = enabledTools.includes(tool.id);
        return (
          <div
            className={`flex items-start justify-between gap-3.5 p-4 transition-colors border-b border-border/60 ${
              isEnabled ? "bg-secondary/30" : ""
            }`}
            key={tool.name}
          >
            <div className="min-w-0">
              <p
                className={`font-mono text-xs font-semibold ${
                  isEnabled ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {tool.name}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {tool.description}
              </p>
            </div>
            <Switch
              checked={isEnabled}
              onCheckedChange={() => onToggleTool(tool.id)}
            />
          </div>
        );
      })}
    </div>
  </div>
);

const DashboardPage = () => {
  const initialData = Route.useLoaderData();
  const [activeNav, setActiveNav] = useState<NavSection>("gateway");

  const [settings, setSettings] = useState<AppSettings>(initialData.settings);
  const [state, setState] = useState<BotState>(initialData.state);
  const [skills, setSkills] = useState<SkillRecord[]>(initialData.skills);
  const [logs, setLogs] = useState<AuditLog[]>(initialData.logs);

  const [isPending, startTransition] = useTransition();
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const [collapsed, setCollapsed] = useState(false);

  const [showSkillForm, setShowSkillForm] = useState(false);
  const [newSkillBody, setNewSkillBody] = useState("");
  const [newSkillDesc, setNewSkillDesc] = useState("");
  const [newSkillName, setNewSkillName] = useState("");

  const [availableModels, setAvailableModels] = useState<ModelOption[]>([]);
  const [isFetchingModels, setIsFetchingModels] = useState(false);
  const [modelsFetchError, setModelsFetchError] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("kynos.nav.collapsed");
    if (saved === "1") {
      setTimeout(() => setCollapsed(true), 0);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("kynos.nav.collapsed", collapsed ? "1" : "0");
  }, [collapsed]);

  useEffect(() => {
    const timer = setInterval(() => {
      fetchDashboardData()
        .then((fresh) => {
          setState(fresh.state);
          setLogs(fresh.logs);
          return fresh;
        })
        .catch(() => null);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  const loadModels = useCallback(
    async (baseUrl?: string, apiKey?: string) => {
      setIsFetchingModels(true);
      setModelsFetchError(null);
      try {
        const fetched = await fetchAvailableModels(
          baseUrl || settings.ai_base_url,
          apiKey === undefined ? settings.ai_api_key : apiKey
        );
        setAvailableModels(fetched);
      } catch (error) {
        setModelsFetchError(
          error instanceof Error ? error.message : "Failed to load model list"
        );
      }
      setIsFetchingModels(false);
    },
    [settings.ai_api_key, settings.ai_base_url]
  );

  const notify = (msg: string) => {
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(null), 3000);
  };

  const handleSaveSettings = () => {
    startTransition(async () => {
      try {
        const updated = await saveSettingsFn({ data: settings });
        setSettings(updated);
        notify("Settings saved");
      } catch (error) {
        notify(
          `Save failed: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    });
  };

  const handleRestartBot = () => {
    startTransition(async () => {
      try {
        const res = await triggerBotRestartFn();
        notify(res.message);
      } catch (error) {
        notify(
          `Restart failed: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    });
  };

  const handleToggleTool = (toolId: string) => {
    const current = settings.tools_enabled || [];
    const next = current.includes(toolId)
      ? current.filter((id) => id !== toolId)
      : [...current, toolId];
    setSettings((prev) => ({ ...prev, tools_enabled: next }));
  };

  const handleToggleSkill = (name: string, currentEnabled: boolean) => {
    startTransition(async () => {
      try {
        const res = await toggleSkillFn({
          data: { currentEnabled, name },
        });
        setSkills((prev) =>
          prev.map((s) => (s.name === name ? { ...s, enabled: res.enabled } : s))
        );
        notify(`Skill "${name}" ${res.enabled ? "activated" : "disabled"}`);
      } catch (error) {
        notify(
          `Toggle failed: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    });
  };

  const handleCreateSkillSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSkillName.trim() || !newSkillBody.trim()) {
      return;
    }
    startTransition(async () => {
      try {
        const created = await createSkillFn({
          data: {
            body: newSkillBody,
            description: newSkillDesc,
            name: newSkillName.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
          },
        });
        setSkills((prev) => [...prev, created]);
        setNewSkillName("");
        setNewSkillDesc("");
        setNewSkillBody("");
        setShowSkillForm(false);
        notify(`Skill "${created.name}" created`);
      } catch (error) {
        notify(
          `Create failed: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    });
  };

  const handleDeleteSkill = (name: string) => {
    if (!confirm(`Delete skill "${name}"?`)) {
      return;
    }
    startTransition(async () => {
      try {
        await deleteSkillFn({ data: { name } });
        setSkills((prev) => prev.filter((s) => s.name !== name));
        notify(`Skill "${name}" deleted`);
      } catch (error) {
        notify(
          `Delete failed: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    });
  };

  const handleProviderChange = (p: AIProvider) => {
    setSettings((prev) => ({ ...prev, ai_provider: p }));
    const match = availableModels.find((m) =>
      m.id.toLowerCase().includes(p.toLowerCase())
    );
    if (match) {
      setSettings((prev) => ({ ...prev, ai_model: match.id }));
    }
  };

  const handlePresetSelect = (preset: {
    baseUrl: string;
    model: string;
    provider: AIProvider;
  }) => {
    setSettings((prev) => ({
      ...prev,
      ai_base_url: preset.baseUrl,
      ai_model: preset.model,
      ai_provider: preset.provider,
    }));
    notify(`Loaded preset: ${preset.model}`);
  };

  const paletteCommands: PaletteCommand[] = [
    {
      action: () => setActiveNav("gateway"),
      group: "Navigation",
      hint: "navigate",
      id: "nav-gateway",
      label: "Go to Gateway",
    },
    {
      action: () => setActiveNav("ai_runtime"),
      group: "Navigation",
      hint: "navigate",
      id: "nav-ai",
      label: "Go to AI Gateway",
    },
    {
      action: () => setActiveNav("tools"),
      group: "Navigation",
      hint: "navigate",
      id: "nav-tools",
      label: "Go to Tools",
    },
    {
      action: () => setActiveNav("skills"),
      group: "Navigation",
      hint: "navigate",
      id: "nav-skills",
      label: "Go to Skills",
    },
    {
      action: () => setActiveNav("audit"),
      group: "Navigation",
      hint: "navigate",
      id: "nav-audit",
      label: "Go to Audit",
    },
    {
      action: handleSaveSettings,
      group: "Actions",
      hint: "save",
      icon: <FloppyDisk />,
      id: "act-save",
      label: "Save Settings",
    },
    {
      action: handleRestartBot,
      group: "Actions",
      hint: "restart",
      icon: <ArrowCounterClockwise />,
      id: "act-restart",
      label: "Restart Bot",
    },
  ];

  const visual = getStatusVisual(state.status);

  return (
    <div className="flex min-h-0 w-full flex-1 overflow-hidden">
      <SidebarNav
        activeNav={activeNav}
        collapsed={collapsed}
        dotColor={visual.dot}
        logCount={logs.length}
        model={settings.ai_model}
        onSelectNav={setActiveNav}
        onToggleCollapsed={() => setCollapsed((v) => !v)}
        provider={settings.ai_provider}
        skillCount={skills.length}
        statusLabel={visual.label}
        toolsCount={settings.tools_enabled?.length || 0}
      />

      <main className="flex-1 overflow-y-auto p-5 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-5xl space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-5">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold tracking-tight text-foreground">
                {NAV_SECTIONS.find((s) => s.id === activeNav)?.label}
              </h1>
              <span className="flex items-center gap-1.5 rounded-full border border-border bg-secondary/60 px-3 py-1 font-mono text-xs text-foreground">
                <span
                  className={`h-2 w-2 rounded-full ${visual.dot} ${state.status === "connecting" || state.status === "qr_ready" ? "animate-pulse" : ""}`}
                />
                {visual.label}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                disabled={isPending}
                onClick={handleRestartBot}
                variant="outline"
              >
                <ArrowCounterClockwise className="h-3.5 w-3.5" />
                Reload
              </Button>
              <Button disabled={isPending} onClick={handleSaveSettings}>
                <FloppyDisk className="h-3.5 w-3.5" />
                Save Changes
              </Button>
            </div>
          </div>

          {activeNav === "gateway" && (
            <GatewaySection
              setSettings={setSettings}
              settings={settings}
              state={state}
            />
          )}
          {activeNav === "ai_runtime" && (
            <AiRuntimeSection
              availableModels={availableModels}
              isFetchingModels={isFetchingModels}
              modelsFetchError={modelsFetchError}
              onFetchModels={() => {
                loadModels();
              }}
              onPresetSelect={handlePresetSelect}
              onProviderChange={handleProviderChange}
              setSettings={setSettings}
              settings={settings}
            />
          )}
          {activeNav === "tools" && (
            <ToolsSection
              enabledTools={settings.tools_enabled || []}
              onToggleTool={handleToggleTool}
            />
          )}
          {activeNav === "skills" && (
            <SkillsSection
              handleCreateSkillSubmit={handleCreateSkillSubmit}
              handleDeleteSkill={handleDeleteSkill}
              handleToggleSkill={handleToggleSkill}
              isPending={isPending}
              newSkillBody={newSkillBody}
              newSkillDesc={newSkillDesc}
              newSkillName={newSkillName}
              setNewSkillBody={setNewSkillBody}
              setNewSkillDesc={setNewSkillDesc}
              setNewSkillName={setNewSkillName}
              setShowSkillForm={setShowSkillForm}
              showSkillForm={showSkillForm}
              skills={skills}
            />
          )}
          {activeNav === "audit" && <AuditSection logs={logs} />}
        </div>
      </main>

      <CommandPalette commands={paletteCommands} />

      {feedbackMsg && (
        <div className="animate-fade-in fixed right-4 bottom-4 z-40 rounded-full border border-border bg-card px-4 py-2 text-xs font-medium text-foreground shadow-xl">
          {feedbackMsg}
        </div>
      )}
    </div>
  );
};

export const Route = createFileRoute("/")({
  loader: async (): Promise<DashboardData> => {
    try {
      return await fetchDashboardData();
    } catch {
      throw redirect({ to: "/login" });
    }
  },
  component: DashboardPage,
});
