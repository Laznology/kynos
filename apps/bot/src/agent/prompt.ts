import type { AppSettings, SkillRecord, UserFact } from "@kynos/shared";

import type { AgentContext } from "./types";

export const buildKynosSystemPrompt = (
  settings: AppSettings,
  context: AgentContext,
  userFacts: UserFact[],
  skills?: SkillRecord[]
): string => {
  const now = new Date();
  const dateStr = now.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    timeZone: "Asia/Jakarta",
    weekday: "long",
    year: "numeric",
  });
  const timeStr = now.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "Asia/Jakarta",
  });

  const memoryBlock =
    userFacts.length > 0
      ? `\n[KNOWN USER FACTS]\n${userFacts.map((f) => `- [${f.category}] ${f.fact}`).join("\n")}\n`
      : "";

  const activeSkills = skills?.filter((s) => s.enabled) || [];
  const skillsBlock =
    activeSkills.length > 0
      ? `\n[AVAILABLE PROCEDURAL SKILLS]
The following learned skills are available in your procedural memory:
${activeSkills.map((s) => `- ${s.name} (v${s.version}): ${s.description}`).join("\n")}
To read the complete procedure of any skill, call skill_manage with action 'read' and name.
When a task matches a skill, load and follow its procedure.
When you solve a novel multi-step task, or when the user teaches/corrects an approach, use skill_manage to create, update, or patch your skills.\n`
      : `\n[AUTONOMOUS SELF-EVOLUTION]
You have autonomous procedural self-evolution via skill_manage.
When you solve complex workflows or when the user provides procedural instructions, use skill_manage with action 'create' or 'patch' to save durable skills.\n`;

  const basePrompt = settings.ai_system_prompt.trim();

  return `${basePrompt}

[EXECUTION CONTEXT]
- Current Time: ${dateStr}, ${timeStr} WIB
- User JID: ${context.jid}
- Chat Type: ${context.isGroup ? "Group Chat" : "Private DM"}
${context.senderName ? `- Sender Name: ${context.senderName}` : ""}${memoryBlock}${skillsBlock}
[FORMATTING & OPERATIONAL DIRECTIVES]
1. Use WhatsApp styling: *bold* for emphasis and headings, _italic_ for metadata, bullet points for lists.
2. Do not output markdown tables as they break on mobile WhatsApp viewports.
3. Do not use emoji icons in replies. Keep tone clean, professional, and clear.
4. Prioritize concise answers. Strip conversational filler and unrequested disclaimers.
5. Reason inside <thought>...</thought> tags before responding or selecting a tool.
6. The <thought> block is your private reasoning trace. Your final reply must be outside <thought> tags.
7. When the user quotes or replies to a previous message, utilize the provided quoted message context to formulate an accurate and directly relevant response.`;
};

export const extractThoughts = (
  rawText: string
): {
  thoughts?: string;
  cleanText: string;
} => {
  const match = rawText.match(
    /<thought(?:ing)?>(?<thoughts>[\s\S]*?)<\/thought(?:ing)?>/iu
  );
  if (match?.groups?.thoughts) {
    const thoughts = match.groups.thoughts.trim();
    const cleanText = rawText
      .replace(/<thought(?:ing)?>[\s\S]*?<\/thought(?:ing)?>/iu, "")
      .trim();
    return { cleanText, thoughts };
  }
  return { cleanText: rawText.trim() };
};

export interface QuotedMessageContext {
  isAnimated?: boolean;
  isFromMe?: boolean;
  isSticker?: boolean;
  mimetype?: string;
  sender?: string;
  text?: string;
}

const resolveQuotedMediaType = (quoted: QuotedMessageContext): string => {
  if (quoted.isSticker) {
    return quoted.isAnimated ? "animated sticker" : "sticker";
  }
  const mime = quoted.mimetype || "";
  if (mime.startsWith("image/")) {
    return "image";
  }
  if (mime.startsWith("video/")) {
    return "video";
  }
  if (mime.startsWith("audio/")) {
    return "audio";
  }
  if (mime) {
    return "document";
  }
  return "";
};

const resolveSenderLabel = (quoted: QuotedMessageContext): string => {
  if (quoted.isFromMe) {
    return "Kynos (you)";
  }
  if (quoted.sender) {
    const [userPart] = quoted.sender.split("@");
    const [phonePart] = (userPart || "").split(":");
    return phonePart || "User";
  }
  return "User";
};

export const formatUserPrompt = (
  text: string,
  quoted?: QuotedMessageContext
): string => {
  const cleanText = text.trim();
  if (!quoted) {
    return cleanText;
  }

  const rawQuotedText = quoted.text?.trim();
  const maxQuotedLen = 3000;
  const quotedText =
    rawQuotedText && rawQuotedText.length > maxQuotedLen
      ? `${rawQuotedText.slice(0, maxQuotedLen)}... (truncated)`
      : rawQuotedText;

  const senderLabel = resolveSenderLabel(quoted);
  const mediaType = resolveQuotedMediaType(quoted);
  const mediaTag = mediaType ? ` [${mediaType}]` : "";
  const parts: string[] = [];

  if (quotedText) {
    parts.push(
      `[Quoted message from ${senderLabel}${mediaTag}]:\n"${quotedText}"`
    );
  } else if (mediaType) {
    parts.push(`[Quoted ${mediaType} from ${senderLabel}]`);
  }

  if (cleanText) {
    if (parts.length > 0) {
      parts.push(`\nUser message: ${cleanText}`);
    } else {
      parts.push(cleanText);
    }
  }

  return parts.join("\n").trim();
};
