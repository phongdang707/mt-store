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

/** Hộp thư Page, mở đúng cuộc chat. `threadId` là id Graph trả về. */
export function pageInboxUrl(pageId: string, threadId: string) {
  const page = pageId.trim();
  const thread = threadId.trim();
  if (!page || !thread) return '';
  const url = new URL('https://business.facebook.com/latest/inbox/all');
  url.searchParams.set('asset_id', page);
  url.searchParams.set('selected_item_id', thread);
  return url.toString();
}

/** Id và link cuộc chat. Link chỉ nhận từ Facebook. */
export function threadOf(body: unknown) {
  const row = (body as { data?: { id?: string; link?: string }[] } | null)?.data?.[0];
  const id = row?.id?.trim() || '';
  const link = row?.link?.trim() || '';
  return {
    id: /^[\w.:-]{1,128}$/.test(id) ? id : '',
    link: /^https:\/\/(?:www\.facebook\.com|business\.facebook\.com)\//.test(link) ? link : '',
  };
}
