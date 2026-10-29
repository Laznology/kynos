import type { AuditLog } from "@kynos/shared";
import {
  Brain,
  CaretDown,
  CaretUp,
  Check,
  Clock,
  Code,
  Copy,
  Cpu,
  FileText,
  Image,
  Info,
  Terminal,
  Warning,
  WarningCircle,
  X,
} from "@phosphor-icons/react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Badge } from "./ui/badge";
import { Button } from "./ui/button";

export interface AuditTraceDrawerProps {
  hasNext?: boolean;
  hasPrev?: boolean;
  log: AuditLog | null;
  onClose: () => void;
  onNavigate?: (direction: "prev" | "next") => void;
}

interface ParsedMetadata {
  error?: {
    apiError?: unknown;
    message?: string;
    name?: string;
    stack?: string;
    statusCode?: number;
  };
  modelConfig?: {
    baseUrl?: string | null;
    maxTokens?: number;
    model?: string;
    provider?: string;
    reasoningEffort?: string;
    temperature?: number;
  };
  rawObj?: Record<string, unknown>;
  request?: {
    historyCount?: number;
    isGroup?: boolean;
    jid?: string;
    prompt?: string;
    senderName?: string;
    toolCallsExecuted?: {
      arguments?: Record<string, unknown>;
      name: string;
      result?: string;
    }[];
    tools?: string[];
  };
  stats?: {
    hasThoughts?: boolean;
    replyLength?: number;
  };
}

const formatRelativeTime = (timestamp?: number): string => {
  if (!timestamp) {
    return "-";
  }
  const diff = Date.now() - timestamp;
  if (diff < 1000) {
    return "just now";
  }
  const sec = Math.floor(diff / 1000);
  if (sec < 60) {
    return `${sec}s ago`;
  }
  const min = Math.floor(sec / 60);
  if (min < 60) {
    return `${min}m ago`;
  }
  const hr = Math.floor(min / 60);
  if (hr < 24) {
    return `${hr}h ago`;
  }
  const days = Math.floor(hr / 24);
  return `${days}d ago`;
};

const formatExactTime = (timestamp?: number): string => {
  if (!timestamp) {
    return "-";
  }
  return new Date(timestamp).toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "medium",
  });
};

const getLevelVariant = (level: string) => {
  if (level === "error") {
    return "destructive";
  }
  if (level === "warn") {
    return "warning";
  }
  return "info";
};

const categoryIcon = (category: string) => {
  switch (category) {
    case "agent": {
      return <Brain className="h-3.5 w-3.5" />;
    }
    case "bot": {
      return <Info className="h-3.5 w-3.5" />;
    }
    case "command": {
      return <Terminal className="h-3.5 w-3.5" />;
    }
    case "media": {
      return <Image className="h-3.5 w-3.5" />;
    }
    case "system": {
      return <Cpu className="h-3.5 w-3.5" />;
    }
    default: {
      return <FileText className="h-3.5 w-3.5" />;
    }
  }
};

const safeParseMetadata = (raw?: string | null): ParsedMetadata => {
  if (!raw) {
    return {};
  }
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return {};
    }

    const res: ParsedMetadata = { rawObj: parsed };
    if ("modelConfig" in parsed && typeof parsed.modelConfig === "object") {
      res.modelConfig = parsed.modelConfig as ParsedMetadata["modelConfig"];
    }
    if ("request" in parsed && typeof parsed.request === "object") {
      res.request = parsed.request as ParsedMetadata["request"];
    }
    if ("error" in parsed && typeof parsed.error === "object") {
      res.error = parsed.error as ParsedMetadata["error"];
    }
    if ("stats" in parsed && typeof parsed.stats === "object") {
      res.stats = parsed.stats as ParsedMetadata["stats"];
    }
    return res;
  } catch {
    return {};
  }
};

const getDiagnosticHint = (statusCode?: number, message?: string) => {
  const msgLower = (message || "").toLowerCase();
  if (statusCode === 400 || msgLower.includes("invalid_argument")) {
    return "Request contains an invalid argument. Often caused by an unsupported model parameter (e.g. temperature out of range, reasoning_effort not supported, or invalid tools schema). Check your AI Runtime configuration.";
  }
  if (
    statusCode === 401 ||
    msgLower.includes("unauthorized") ||
    msgLower.includes("api key")
  ) {
    return "Authentication failed. Check if your API Key in Settings is valid and active.";
  }
  if (
    statusCode === 403 ||
    msgLower.includes("forbidden") ||
    msgLower.includes("restricted")
  ) {
    return "Upstream account or region restricted by AI provider. Switch model or check provider billing.";
  }
  if (statusCode === 404 || msgLower.includes("not found")) {
    return "Model not found or deleted by provider. Check exact model ID string in AI Runtime settings.";
  }
  if (
    statusCode === 429 ||
    msgLower.includes("rate limit") ||
    msgLower.includes("quota")
  ) {
    return "Rate limit or quota exceeded. Wait a few moments or switch to an alternate model.";
  }
  if (statusCode && statusCode >= 500) {
    return "Upstream model provider encountered an internal server error. Try again shortly.";
  }
  return null;
};

const getStatusCodeFromError = (
  errorObj?: ParsedMetadata["error"]
): number | undefined => {
  if (!errorObj) {
    return undefined;
  }
  if (errorObj.statusCode) {
    return errorObj.statusCode;
  }
  if (
    errorObj.apiError &&
    typeof errorObj.apiError === "object" &&
    "code" in errorObj.apiError &&
    typeof errorObj.apiError.code === "number"
  ) {
    return errorObj.apiError.code;
  }
  return undefined;
};

const DiagnosticBanner = ({
  diagnosticHint,
  errorObj,
  logMessage,
  statusCode,
}: {
  diagnosticHint: string | null;
  errorObj?: ParsedMetadata["error"];
  logMessage: string;
  statusCode?: number;
}) => (
  <div className="rounded-xl border border-red-500/25 bg-red-500/[0.07] p-4 text-xs">
    <div className="flex items-start gap-2.5">
      <WarningCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-red-300">Execution Failure</span>
          {statusCode && <Badge variant="destructive">HTTP {statusCode}</Badge>}
          {errorObj?.name && <Badge variant="outline">{errorObj.name}</Badge>}
        </div>
        <p className="font-mono break-all text-zinc-300">
          {errorObj?.message || logMessage}
        </p>
        {diagnosticHint && (
          <div className="mt-2.5 rounded-lg border border-red-500/20 bg-black/40 p-3 text-[11px] text-zinc-300">
            <span className="font-semibold text-red-400">
              Diagnostic Hint:{" "}
            </span>
            {diagnosticHint}
          </div>
        )}
      </div>
    </div>
  </div>
);

const BentoGrid = ({
  modelConfig,
  requestObj,
}: {
  modelConfig?: ParsedMetadata["modelConfig"];
  requestObj?: ParsedMetadata["request"];
}) => {
  const modelName = modelConfig?.model ?? "Standard";
  const provider = modelConfig?.provider ?? "agent";
  const jidDisplay = requestObj?.jid ? requestObj.jid.split("@")[0] : "-";
  const chatType = requestObj?.isGroup ? "Group Chat" : "Private DM";
  const toolsActive = requestObj?.tools?.length ?? 0;
  const toolsExec = requestObj?.toolCallsExecuted?.length ?? 0;
  const historyCount = requestObj?.historyCount ?? 0;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3">
        <div className="font-mono text-[10px] text-zinc-500 uppercase">
          Model
        </div>
        <div
          className="mt-1 truncate font-mono text-xs font-semibold text-zinc-200"
          title={modelName}
        >
          {modelName}
        </div>
        <div className="mt-0.5 text-[10px] text-zinc-500">{provider}</div>
      </div>

      <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3">
        <div className="font-mono text-[10px] text-zinc-500 uppercase">
          Target JID
        </div>
        <div
          className="mt-1 truncate font-mono text-xs font-semibold text-zinc-200"
          title={requestObj?.jid || "N/A"}
        >
          {jidDisplay}
        </div>
        <div className="mt-0.5 text-[10px] text-zinc-500">{chatType}</div>
      </div>

      <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3">
        <div className="font-mono text-[10px] text-zinc-500 uppercase">
          Tools
        </div>
        <div className="mt-1 font-mono text-xs font-semibold text-zinc-200">
          {toolsActive} active
        </div>
        <div className="mt-0.5 text-[10px] text-zinc-500">
          {toolsExec} executed
        </div>
      </div>

      <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3">
        <div className="font-mono text-[10px] text-zinc-500 uppercase">
          History
        </div>
        <div className="mt-1 font-mono text-xs font-semibold text-zinc-200">
          {historyCount} msgs
        </div>
        <div className="mt-0.5 text-[10px] text-zinc-500">in memory</div>
      </div>
    </div>
  );
};

const PromptCard = ({
  copied,
  onCopy,
  prompt,
}: {
  copied: boolean;
  onCopy: () => void;
  prompt: string;
}) => (
  <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
    <div className="mb-2 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Code className="h-3.5 w-3.5 text-zinc-400" />
        <span className="font-mono text-xs font-semibold tracking-wider text-zinc-300 uppercase">
          Input Prompt
        </span>
        <span className="font-mono text-[10px] text-zinc-500">
          ({prompt.length} chars)
        </span>
      </div>
      <Button
        className="h-6 px-2 text-[10px]"
        onClick={onCopy}
        size="sm"
        variant="ghost"
      >
        {copied ? (
          <>
            <Check className="h-3 w-3 text-emerald-400" />
            Copied
          </>
        ) : (
          <>
            <Copy className="h-3 w-3" />
            Copy
          </>
        )}
      </Button>
    </div>
    <pre className="max-h-48 overflow-y-auto rounded-lg border border-white/[0.06] bg-black/40 p-3 font-mono text-[11px] leading-relaxed whitespace-pre-wrap text-zinc-200">
      {prompt}
    </pre>
  </div>
);

const ToolTimeline = ({
  toolCalls,
}: {
  toolCalls: NonNullable<ParsedMetadata["request"]>["toolCallsExecuted"];
}) => {
  if (!toolCalls || toolCalls.length === 0) {
    return null;
  }
  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
      <div className="mb-3 flex items-center gap-2">
        <Terminal className="h-3.5 w-3.5 text-zinc-400" />
        <span className="font-mono text-xs font-semibold tracking-wider text-zinc-300 uppercase">
          Tool Executions ({toolCalls.length})
        </span>
      </div>
      <div className="space-y-2.5">
        {toolCalls.map((tc, idx) => (
          <div
            className="rounded-lg border border-white/[0.06] bg-black/30 p-3 text-xs"
            key={`tc-${tc.name}-${idx}`}
          >
            <div className="text-primary flex items-center justify-between font-mono font-medium">
              <span>
                #{idx + 1} {tc.name}
              </span>
            </div>
            {tc.arguments && Object.keys(tc.arguments).length > 0 && (
              <div className="mt-2">
                <span className="font-mono text-[10px] text-zinc-500 uppercase">
                  Arguments:
                </span>
                <pre className="mt-1 overflow-x-auto rounded bg-black/40 p-2 font-mono text-[10.5px] text-zinc-300">
                  {JSON.stringify(tc.arguments, null, 2)}
                </pre>
              </div>
            )}
            {tc.result && (
              <div className="mt-2">
                <span className="font-mono text-[10px] text-zinc-500 uppercase">
                  Result:
                </span>
                <pre className="mt-1 max-h-32 overflow-y-auto rounded bg-black/40 p-2 font-mono text-[10.5px] text-zinc-300">
                  {tc.result}
                </pre>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

const UpstreamErrorCard = ({
  apiError,
  copied,
  onCopy,
}: {
  apiError: unknown;
  copied: boolean;
  onCopy: () => void;
}) => (
  <div className="rounded-xl border border-red-500/20 bg-red-500/[0.03] p-4">
    <div className="mb-2 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Warning className="h-3.5 w-3.5 text-red-400" />
        <span className="font-mono text-xs font-semibold tracking-wider text-red-300 uppercase">
          Upstream API Error Payload
        </span>
      </div>
      <Button
        className="h-6 px-2 text-[10px]"
        onClick={onCopy}
        size="sm"
        variant="ghost"
      >
        {copied ? (
          <>
            <Check className="h-3 w-3 text-emerald-400" />
            Copied
          </>
        ) : (
          <>
            <Copy className="h-3 w-3" />
            Copy
          </>
        )}
      </Button>
    </div>
    <pre className="max-h-60 overflow-y-auto rounded-lg border border-red-500/20 bg-black/60 p-3 font-mono text-[11px] leading-relaxed text-red-200">
      {JSON.stringify(apiError, null, 2)}
    </pre>
  </div>
);

const ModelConfigCard = ({
  modelConfig,
}: {
  modelConfig: ParsedMetadata["modelConfig"];
}) => {
  if (!modelConfig) {
    return null;
  }
  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 text-xs">
      <div className="mb-2.5 font-mono text-xs font-semibold tracking-wider text-zinc-300 uppercase">
        Model Runtime Settings
      </div>
      <div className="grid grid-cols-2 gap-2 font-mono text-[11px] sm:grid-cols-3">
        <div className="rounded bg-black/30 p-2">
          <span className="text-zinc-500">Provider:</span>{" "}
          <span className="text-zinc-200">{modelConfig.provider || "-"}</span>
        </div>
        <div className="rounded bg-black/30 p-2">
          <span className="text-zinc-500">Temperature:</span>{" "}
          <span className="text-zinc-200">
            {modelConfig.temperature ?? "-"}
          </span>
        </div>
        <div className="rounded bg-black/30 p-2">
          <span className="text-zinc-500">Max Tokens:</span>{" "}
          <span className="text-zinc-200">{modelConfig.maxTokens ?? "-"}</span>
        </div>
        {modelConfig.reasoningEffort && (
          <div className="rounded bg-black/30 p-2">
            <span className="text-zinc-500">Reasoning:</span>{" "}
            <span className="text-zinc-200">{modelConfig.reasoningEffort}</span>
          </div>
        )}
        <div className="col-span-2 truncate rounded bg-black/30 p-2">
          <span className="text-zinc-500">Base URL:</span>{" "}
          <span
            className="text-zinc-200"
            title={modelConfig.baseUrl || "Default"}
          >
            {modelConfig.baseUrl || "Default API URL"}
          </span>
        </div>
      </div>
    </div>
  );
};

const TraceOverviewTab = ({
  copiedKey,
  copyToClipboard,
  diagnosticHint,
  errorObj,
  logLevel,
  logMessage,
  modelConfig,
  parsedMeta,
  requestObj,
  statusCode,
}: {
  copiedKey: string | null;
  copyToClipboard: (text: string, key: string) => void;
  diagnosticHint: string | null;
  errorObj?: ParsedMetadata["error"];
  logLevel: string;
  logMessage: string;
  modelConfig?: ParsedMetadata["modelConfig"];
  parsedMeta: ParsedMetadata;
  requestObj?: ParsedMetadata["request"];
  statusCode?: number;
}) => (
  <>
    {logLevel === "error" && (
      <DiagnosticBanner
        diagnosticHint={diagnosticHint}
        errorObj={errorObj}
        logMessage={logMessage}
        statusCode={statusCode}
      />
    )}

    {(modelConfig || requestObj) && (
      <BentoGrid modelConfig={modelConfig} requestObj={requestObj} />
    )}

    {requestObj?.prompt && (
      <PromptCard
        copied={copiedKey === "prompt"}
        onCopy={() => copyToClipboard(requestObj.prompt || "", "prompt")}
        prompt={requestObj.prompt}
      />
    )}

    {requestObj?.toolCallsExecuted && (
      <ToolTimeline toolCalls={requestObj.toolCallsExecuted} />
    )}

    {errorObj?.apiError && (
      <UpstreamErrorCard
        apiError={errorObj.apiError}
        copied={copiedKey === "api-error"}
        onCopy={() =>
          copyToClipboard(
            JSON.stringify(errorObj.apiError, null, 2),
            "api-error"
          )
        }
      />
    )}

    {modelConfig && <ModelConfigCard modelConfig={modelConfig} />}

    {!modelConfig &&
      !requestObj &&
      !errorObj &&
      parsedMeta.rawObj &&
      Object.keys(parsedMeta.rawObj).length > 0 && (
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
          <div className="mb-2 font-mono text-xs font-semibold tracking-wider text-zinc-300 uppercase">
            Payload Attributes
          </div>
          <pre className="overflow-x-auto rounded-lg border border-white/[0.06] bg-black/40 p-3 font-mono text-[11px] text-zinc-200">
            {JSON.stringify(parsedMeta.rawObj, null, 2)}
          </pre>
        </div>
      )}
  </>
);

const RawJsonTab = ({
  copied,
  onCopy,
  rawJsonFormatted,
}: {
  copied: boolean;
  onCopy: () => void;
  rawJsonFormatted: string;
}) => (
  <div className="space-y-3">
    <div className="flex items-center justify-between">
      <span className="font-mono text-xs text-zinc-400">
        Complete Structured Audit Log Record
      </span>
      <Button
        className="h-6 px-2.5 text-[10px]"
        onClick={onCopy}
        size="sm"
        variant="outline"
      >
        {copied ? (
          <>
            <Check className="h-3 w-3 text-emerald-400" />
            Copied
          </>
        ) : (
          <>
            <Copy className="h-3 w-3" />
            Copy JSON
          </>
        )}
      </Button>
    </div>
    <pre className="overflow-x-auto rounded-xl border border-white/[0.08] bg-black/60 p-4 font-mono text-[11px] leading-relaxed text-zinc-200">
      {rawJsonFormatted}
    </pre>
  </div>
);

const StackTraceTab = ({
  copied,
  onCopy,
  stack,
}: {
  copied: boolean;
  onCopy: () => void;
  stack: string;
}) => (
  <div className="space-y-3">
    <div className="flex items-center justify-between">
      <span className="font-mono text-xs text-zinc-400">
        Exception Stack Trace
      </span>
      <Button
        className="h-6 px-2.5 text-[10px]"
        onClick={onCopy}
        size="sm"
        variant="outline"
      >
        {copied ? (
          <>
            <Check className="h-3 w-3 text-emerald-400" />
            Copied
          </>
        ) : (
          <>
            <Copy className="h-3 w-3" />
            Copy Stack
          </>
        )}
      </Button>
    </div>
    <pre className="overflow-x-auto rounded-xl border border-red-500/20 bg-black/60 p-4 font-mono text-[11px] leading-relaxed whitespace-pre text-red-300">
      {stack}
    </pre>
  </div>
);

const DrawerTopBar = ({
  copiedKey,
  copyToClipboard,
  hasNext,
  hasPrev,
  log,
  onClose,
  onNavigate,
  rawJsonFormatted,
}: {
  copiedKey: string | null;
  copyToClipboard: (text: string, key: string) => void;
  hasNext?: boolean;
  hasPrev?: boolean;
  log: AuditLog;
  onClose: () => void;
  onNavigate?: (direction: "prev" | "next") => void;
  rawJsonFormatted: string;
}) => (
  <div className="flex shrink-0 items-center justify-between border-b border-white/[0.08] bg-[#10151c] px-5 py-3.5">
    <div className="flex items-center gap-2.5">
      <span className="font-mono text-xs font-semibold tracking-wide text-zinc-400">
        TRACE #{log.id}
      </span>
      <Badge variant={getLevelVariant(log.level)}>{log.level}</Badge>
      <Badge className="flex items-center gap-1" variant="outline">
        {categoryIcon(log.category)}
        {log.category}
      </Badge>
    </div>

    <div className="flex items-center gap-1.5">
      {onNavigate && (
        <div className="mr-1 flex items-center rounded-md border border-white/10 bg-white/[0.03]">
          <button
            aria-label="Previous log"
            className="px-2 py-1 text-zinc-400 transition-colors hover:bg-white/10 hover:text-zinc-100 disabled:opacity-30"
            disabled={!hasPrev}
            onClick={() => onNavigate("prev")}
            title="Previous trace (Arrow Up or k)"
            type="button"
          >
            <CaretUp className="h-3.5 w-3.5" />
          </button>
          <button
            aria-label="Next log"
            className="px-2 py-1 text-zinc-400 transition-colors hover:bg-white/10 hover:text-zinc-100 disabled:opacity-30"
            disabled={!hasNext}
            onClick={() => onNavigate("next")}
            title="Next trace (Arrow Down or j)"
            type="button"
          >
            <CaretDown className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <Button
        className="h-7 px-2.5 text-[10px]"
        onClick={() => copyToClipboard(rawJsonFormatted, "all-json")}
        size="sm"
        variant="outline"
      >
        {copiedKey === "all-json" ? (
          <>
            <Check className="h-3 w-3 text-emerald-400" />
            Copied
          </>
        ) : (
          <>
            <Copy className="h-3 w-3" />
            Copy Trace
          </>
        )}
      </Button>

      <button
        aria-label="Close drawer"
        className="rounded-md p-1.5 text-zinc-400 transition-colors hover:bg-white/10 hover:text-zinc-100"
        onClick={onClose}
        title="Close (Esc)"
        type="button"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  </div>
);

export const AuditTraceDrawer = ({
  hasNext,
  hasPrev,
  log,
  onClose,
  onNavigate,
}: AuditTraceDrawerProps) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "raw" | "stack">(
    "overview"
  );

  const copyToClipboard = useCallback((text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey((curr) => (curr === key ? null : curr));
    }, 2000);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if ((e.key === "ArrowUp" || e.key === "k") && hasPrev && onNavigate) {
        e.preventDefault();
        onNavigate("prev");
        return;
      }
      if ((e.key === "ArrowDown" || e.key === "j") && hasNext && onNavigate) {
        e.preventDefault();
        onNavigate("next");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [hasNext, hasPrev, onNavigate, onClose]);

  const parsedMeta = useMemo(
    () => safeParseMetadata(log?.metadata),
    [log?.metadata]
  );

  if (!log) {
    return null;
  }

  const { error: errorObj, modelConfig, request: requestObj } = parsedMeta;

  const statusCode = getStatusCodeFromError(errorObj);

  const diagnosticHint = getDiagnosticHint(statusCode, log.message);

  const rawJsonFormatted = JSON.stringify(
    {
      category: log.category,
      created_at: log.created_at,
      id: log.id,
      level: log.level,
      message: log.message,
      metadata: parsedMeta.rawObj ?? log.metadata,
    },
    null,
    2
  );

  return (
    <>
      <div
        aria-hidden="true"
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      <aside
        aria-label={`Trace details for log #${log.id}`}
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-2xl flex-col border-l border-white/[0.08] bg-[#0c1015] text-zinc-100 shadow-2xl transition-transform duration-200 ease-out"
      >
        <DrawerTopBar
          copiedKey={copiedKey}
          copyToClipboard={copyToClipboard}
          hasNext={hasNext}
          hasPrev={hasPrev}
          log={log}
          onClose={onClose}
          onNavigate={onNavigate}
          rawJsonFormatted={rawJsonFormatted}
        />

        <div className="shrink-0 border-b border-white/[0.06] bg-[#0e1319] px-6 py-4">
          <h3 className="font-mono text-sm leading-snug font-medium break-words text-zinc-100">
            {log.message}
          </h3>
          <div className="mt-2.5 flex flex-wrap items-center gap-3 font-mono text-[11px] text-zinc-500">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatExactTime(log.created_at)}
            </span>
            <span>·</span>
            <span>{formatRelativeTime(log.created_at)}</span>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 border-b border-white/[0.06] bg-[#0c1015] px-6 pt-2">
          <button
            className={`cursor-pointer pb-2 font-mono text-xs font-medium transition-colors ${
              activeTab === "overview"
                ? "border-primary border-b-2 text-zinc-100"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
            onClick={() => setActiveTab("overview")}
            type="button"
          >
            Trace Overview
          </button>
          <button
            className={`cursor-pointer pb-2 font-mono text-xs font-medium transition-colors ${
              activeTab === "raw"
                ? "border-primary border-b-2 text-zinc-100"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
            onClick={() => setActiveTab("raw")}
            type="button"
          >
            Raw JSON
          </button>
          {errorObj?.stack && (
            <button
              className={`cursor-pointer pb-2 font-mono text-xs font-medium transition-colors ${
                activeTab === "stack"
                  ? "border-primary border-b-2 text-zinc-100"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
              onClick={() => setActiveTab("stack")}
              type="button"
            >
              Stack Trace
            </button>
          )}
        </div>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-6">
          {activeTab === "overview" && (
            <TraceOverviewTab
              copiedKey={copiedKey}
              copyToClipboard={copyToClipboard}
              diagnosticHint={diagnosticHint}
              errorObj={errorObj}
              logLevel={log.level}
              logMessage={log.message}
              modelConfig={modelConfig}
              parsedMeta={parsedMeta}
              requestObj={requestObj}
              statusCode={statusCode}
            />
          )}

          {activeTab === "raw" && (
            <RawJsonTab
              copied={copiedKey === "tab-json"}
              onCopy={() => copyToClipboard(rawJsonFormatted, "tab-json")}
              rawJsonFormatted={rawJsonFormatted}
            />
          )}

          {activeTab === "stack" && errorObj?.stack && (
            <StackTraceTab
              copied={copiedKey === "tab-stack"}
              onCopy={() => copyToClipboard(errorObj.stack || "", "tab-stack")}
              stack={errorObj.stack}
            />
          )}
        </div>
      </aside>
    </>
  );
};
