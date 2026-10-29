import { jidNormalizedUser } from "@whiskeysockets/baileys";
import type { proto } from "@whiskeysockets/baileys";

const DENIAL_WINDOW_MS = 10 * 60 * 1000;
const lastDenialAt = new Map<string, number>();

export const isGroupAllowed = (
  allowedGroups: string[],
  groupJid: string
): boolean => allowedGroups.includes(groupJid);

export const isUserAllowed = (
  allowedUsers: string[],
  userJid: string
): boolean => allowedUsers.includes(userJid);

export const isPrivateChatAllowed = (
  allowedUsers: string[],
  chatJid: string,
  alternateJid?: string
): boolean => {
  if (isUserAllowed(allowedUsers, jidNormalizedUser(chatJid))) {
    return true;
  }
  return (
    !!alternateJid &&
    isUserAllowed(allowedUsers, jidNormalizedUser(alternateJid))
  );
};

export const shouldSendDenial = (jid: string, now = Date.now()): boolean => {
  const last = lastDenialAt.get(jid);
  if (last !== undefined && now - last < DENIAL_WINDOW_MS) {
    return false;
  }
  lastDenialAt.set(jid, now);
  return true;
};

export const buildAccessDeniedReply = (
  ownerJid: string,
  jid: string,
  sender: string,
  isGroup: boolean
): string => {
  const target = isGroup
    ? `JID grup ini:\n${jid}`
    : `nomor ini:\n${sender.replace("@s.whatsapp.net", "")}`;
  return [
    "Bot ini belum diizinkan menjawab di chat ini.",
    `Minta ${ownerJid} menambahkan ${target} ke allowlist dashboard Kynos.`,
  ].join(" ");
};

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
