/** toJSON chung: đổi `_id` thành `id`, bỏ `__v`. */
export const toJSON = {
  versionKey: false,
  transform: (_doc: unknown, ret: Record<string, unknown>) => {
    ret.id = String(ret._id);
    delete ret._id;
    return ret;
  },
};

/** Bỏ dấu tiếng Việt, chữ thường, dùng cho tìm kiếm. */
export const norm = (s: unknown) =>
  String(s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd');

/** Mốc đầu/cuối tháng theo giờ Việt Nam (UTC+7). `month` dạng `2026-10`. */
export function monthRange(month: string): [Date, Date] {
  const [y, m] = month.split('-').map(Number);
  return [new Date(Date.UTC(y, m - 1, 1, -7)), new Date(Date.UTC(y, m, 1, -7))];
}
