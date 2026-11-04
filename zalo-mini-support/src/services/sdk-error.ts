/** Lỗi SDK là object `{ code, message }` chứ không phải Error, lấy ra để nhân viên chụp màn hình gửi lại. */
export function sdkReason(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  if (!error || typeof error !== "object") return String(error ?? "");
  const e = error as { code?: unknown; error?: unknown; message?: unknown; errorMessage?: unknown };
  const message = String(e.message ?? e.errorMessage ?? "").trim();
  const code = e.code ?? e.error;
  if (message && code != null) return `${message} (mã ${String(code)})`;
  return message || (code != null ? `mã ${String(code)}` : "");
}
