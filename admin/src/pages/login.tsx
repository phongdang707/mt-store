import { useState, type FormEvent } from "react";
import { toast, useApp } from "@/app-state";
import LOGO from "@/logo.svg";
import { sx } from "@/sx";

const INPUT = "box-sizing: border-box; width: 100%; border: 1px solid #efd9d3; background: #ffffff; border-radius: 12px; padding: 13px 14px; font: inherit; color: #3d3530";

export default function Login() {
  const { login } = useApp();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      await login(email, password, remember);
    } catch (x) {
      setErr((x as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={sx("min-height: 100vh; box-sizing: border-box; padding: 48px 20px; display: flex; align-items: center; justify-content: center; background: linear-gradient(180deg, #fcf8f0 0%, #f8efe8 40%, #f2d5d3 100%); font-family: 'Be Vietnam Pro', system-ui, sans-serif; color: #3d3530; font-size: 15px; line-height: 1.45")}>
      <div style={sx("width: 100%; max-width: 420px; display: flex; flex-direction: column; align-items: center; gap: 26px")}>
        <div style={sx("display: flex; flex-direction: column; align-items: center; gap: 10px")}>
          <img src={LOGO} alt="MT store" style={sx("width: 190px; height: auto")} />
          <span style={sx("font-family: Quicksand, sans-serif; font-weight: 600; font-size: 15px; letter-spacing: 6px; color: #6f5a55; padding-left: 6px")}>TRANG QUẢN LÝ</span>
        </div>
        <form onSubmit={submit} style={sx("width: 100%; box-sizing: border-box; background: rgba(255, 250, 247, 0.92); border: 1px solid #efd9d3; border-radius: 24px; padding: 28px; box-shadow: 0 14px 34px rgba(150, 90, 100, 0.16); display: flex; flex-direction: column; gap: 16px")}>
          <div style={sx("display: flex; flex-direction: column; gap: 4px")}>
            <h1 style={sx("margin: 0; font-family: Quicksand, sans-serif; font-weight: 700; font-size: 24px; color: #a3546a")}>Chào mừng trở lại</h1>
            <p style={sx("margin: 0; font-size: 14px; color: #7d6862")}>Đăng nhập để quản lý đơn hàng và sản phẩm.</p>
          </div>
          <label style={sx("display: flex; flex-direction: column; gap: 6px")}>
            <span style={sx("font-size: 13px; font-weight: 600; color: #6f5a55")}>Email</span>
            <input type="email" required autoComplete="username" placeholder="ban@gmail.com" value={email} onChange={(e) => setEmail(e.target.value)} style={sx(INPUT)} />
          </label>
          <label style={sx("display: flex; flex-direction: column; gap: 6px")}>
            <span style={sx("font-size: 13px; font-weight: 600; color: #6f5a55")}>Mật khẩu</span>
            <input type="password" required autoComplete="current-password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} style={sx(INPUT)} />
          </label>
          <label style={sx("display: flex; align-items: center; gap: 8px; font-size: 14px; color: #6f5a55")}>
            <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} style={sx("width: 18px; height: 18px; accent-color: #b3566f")} />
            Ghi nhớ đăng nhập trên máy này
          </label>
          {err ? <p role="alert" style={sx("margin: 0; font-size: 14px; background: #fbe7ec; color: #8f4459; border-radius: 12px; padding: 10px 12px")}>{err}</p> : null}
          <button type="submit" disabled={busy} style={sx("display: block; text-align: center; border: 0; background: #b3566f; color: #ffffff; border-radius: 14px; padding: 14px; font-weight: 700; font-size: 15.5px; box-shadow: 0 8px 20px rgba(150, 90, 100, 0.22)" + (busy ? "; opacity: 0.75" : ""))}>
            {busy ? "Đang đăng nhập…" : "Đăng nhập"}
          </button>
          <button type="button" onClick={() => toast("Đổi mật khẩu bằng ADMIN_PASSWORD trên server rồi khởi động lại")} style={sx("align-self: center; border: 0; background: transparent; color: #a3546a; font-size: 14px; font-weight: 600; text-decoration: underline; padding: 0")}>
            Quên mật khẩu?
          </button>
        </form>
        <p style={sx("margin: 0; font-size: 13px; color: #7d6862; text-align: center")}>Chỉ chủ shop có tài khoản. Khách mua hàng dùng trang bán hàng.</p>
      </div>
    </div>
  );
}
