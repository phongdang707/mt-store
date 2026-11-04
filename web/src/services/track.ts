import { ApiError, api, deviceInfo, zaloProfile, type ProductEventInput } from "@/services/api";

type Kind = ProductEventInput["type"];

const seen: Record<Kind, Set<string>> = { view: new Set(), open: new Set(), cart: new Set() };
const queue: ProductEventInput[] = [];
let flushTimer = 0;

/** Mỗi sản phẩm, mỗi loại, một lần trong lần mở trang. Lượt xem chỉ ghi khi bấm + hoặc −. */
export function track(type: Kind, productId: string) {
  if (!productId || seen[type].has(productId)) return;
  seen[type].add(productId);
  queue.push({ type, productId });
  if (queue.length >= 20) void flushEvents();
  else if (!flushTimer) flushTimer = window.setTimeout(() => void flushEvents(), 5000);
}

export async function flushEvents() {
  if (flushTimer) {
    window.clearTimeout(flushTimer);
    flushTimer = 0;
  }
  if (!queue.length) return;
  const events = queue.splice(0, 30);
  try {
    await api.events(events);
  } catch (e) {
    if (e instanceof ApiError && e.status < 500) return;
    queue.unshift(...events);
    if (!flushTimer) flushTimer = window.setTimeout(() => void flushEvents(), 8000);
  }
}

let since = 0;
let carry = 0;
let presenceOn = false;

/** Số giây từ nhịp trước, tối đa 45. App đang ẩn thì dừng đồng hồ. */
function takeSeconds() {
  const now = Date.now();
  let sec = carry;
  carry = 0;
  if (since) sec += Math.round((now - since) / 1000);
  since = document.visibilityState === "visible" ? now : 0;
  return Math.min(45, Math.max(0, sec));
}

function pause(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

async function beat() {
  const seconds = takeSeconds();
  const device = deviceInfo();
  const ready = zaloProfile(false);
  const quick = await Promise.race([
    ready.then((p) => ({ settled: true as const, p })),
    pause(1500).then(() => ({ settled: false as const, p: { name: "", avatar: "" } })),
  ]);
  try {
    await api.visit({
      zaloName: quick.p.name || undefined,
      avatar: quick.p.avatar || undefined,
      ...device,
      seconds,
    });
  } catch {
    carry = Math.min(45, seconds);
  }
  if (quick.settled) return;
  try {
    const who = await ready;
    if (!who.name && !who.avatar) return;
    await api.visit({
      zaloName: who.name || undefined,
      avatar: who.avatar || undefined,
      ...device,
      seconds: 0,
    });
  } catch {
    /* tên và ảnh vẫn nằm trong bộ nhớ, nhịp sau gửi lại */
  }
}

/** Đồng bộ hồ sơ lúc mở app, rồi cứ 30 giây và khi app bị ẩn. */
export function startPresence() {
  if (presenceOn) return;
  presenceOn = true;
  if (document.visibilityState === "visible") since = Date.now();
  void beat();
  window.setInterval(() => {
    if (document.visibilityState === "visible") void beat();
  }, 30_000);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      void beat();
      void flushEvents();
    } else {
      since = Date.now();
      void beat();
    }
  });
  window.addEventListener("pagehide", () => {
    void beat();
    void flushEvents();
  });
}
