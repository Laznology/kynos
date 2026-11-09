export interface AgentContext {
  jid: string;
  groupParticipants?: {
    jid: string;
    name: string;
  }[];
  mediaBuffer?: Buffer;
  mediaMimetype?: string;
  senderName?: string;
  isGroup?: boolean;
  sendEvent?: (event: {
    description?: string;
    endDate?: Date;
    isCancelled?: boolean;
    location?: { degreesLatitude: number; degreesLongitude: number; name?: string };
    name: string;
    startDate: Date;
  }) => Promise<void>;
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
