/** Cửa sổ tin nhắn chuẩn của Page, kể từ lần khách nhắn. */
export const MESSENGER_WINDOW_MS = 24 * 60 * 60 * 1000;

export function messengerLink(page: string | undefined, customerId: string) {
  const name = page?.trim();
  if (!name || !customerId) return '';
  return `https://m.me/${encodeURIComponent(name)}?ref=${encodeURIComponent(customerId)}`;
}

export function messengerOpen(psid: string | undefined, lastAt?: Date | string | null, now = Date.now()) {
  if (!psid?.trim()) return false;
  const at = lastAt ? new Date(lastAt).getTime() : 0;
  return Number.isFinite(at) && at > 0 && now - at < MESSENGER_WINDOW_MS;
}
