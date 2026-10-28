import type { proto } from "@whiskeysockets/baileys";

export const isGroupAllowed = (
  allowedGroups: string[],
  groupJid: string
): boolean => allowedGroups.length === 0 || allowedGroups.includes(groupJid);

export const isBotTriggered = (
  contextInfo: proto.IContextInfo | null | undefined,
  botUserId?: string
): boolean => {
  const botJid = `${botUserId?.split(":")[0]}@s.whatsapp.net`;
  if (contextInfo?.mentionedJid?.includes(botJid)) {
    return true;
  }
  return contextInfo?.participant === botJid;
};
