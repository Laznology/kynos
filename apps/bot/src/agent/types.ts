export interface AgentContext {
  jid: string;
  senderName?: string;
  isGroup?: boolean;
}

export interface AgentRunResult {
  reply: string;
  thoughts?: string;
  toolCallsExecuted: {
    name: string;
    arguments: Record<string, unknown>;
    result: string;
  }[];
}
