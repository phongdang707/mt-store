import { useEffect, useState, type ReactNode } from "react";
import { api } from "@/api";
import { toast, useApp } from "@/app-state";
import { MobileHead, Shell } from "@/components/shell";
import { dots, dotsInput, parseMoney } from "@/format";
import { sx } from "@/sx";
import type { Settings as S } from "@/types";

const FIELD = "box-sizing: border-box; width: 100%; border: 1px solid #efd9d3; background: #ffffff; border-radius: 12px; padding: 11px 12px; font: inherit; color: #3d3530";
const CARD = "background: #fffaf7; border: 1px solid #efd9d3; border-radius: 22px; box-shadow: 0 6px 18px rgba(150, 90, 100, 0.10); padding: 18px 20px; display: flex; flex-direction: column; gap: 14px";

const Field = ({ label, hint, children, wide }: { label: string; hint?: string; children: ReactNode; wide?: boolean }) => (
  <label style={sx("display: flex; flex-direction: column; gap: 6px" + (wide ? "; grid-column: 1 / -1" : ""))}>
    <span style={sx("font-size: 13px; font-weight: 600; color: #6f5a55")}>{label}</span>
    {children}
    {hint ? <span style={sx("font-size: 12px; color: #7d6862")}>{hint}</span> : null}
  </label>
);
const H2 = ({ children }: { children: ReactNode }) => <h2 style={sx("margin: 0; font-family: Quicksand, sans-serif; font-weight: 700; font-size: 18px; color: #a3546a")}>{children}</h2>;

export default function Settings() {
  const { settings, setSettings } = useApp();
  const [f, setF] = useState<(S & { shipInput: string; catsInput: string; countriesInput: string }) | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings && !f) setF({ ...settings, bank: { ...settings.bank }, shipInput: settings.shippingFee ? dots(settings.shippingFee) : "", catsInput: settings.cats.join(", "), countriesInput: settings.countries.join(", ") });
  }, [settings]);

  if (!f)
    return (
      <Shell>
        <main className="main-pad" style={sx("flex: 999 1 560px; padding: 28px 32px 48px")}>Đang tải…</main>
      </Shell>
    );
  const set = (p: Partial<typeof f>) => setF({ ...f, ...p });
  const setBank = (k: keyof S["bank"], v: string) => setF({ ...f, bank: { ...f.bank, [k]: v } });
  const list = (s: string) => [...new Set(s.split(",").map((x) => x.trim()).filter(Boolean))];

  const save = async () => {
    setSaving(true);
    try {
      const u = await api.saveSettings({
        store: f.store.trim(),
        subtitle: f.subtitle.trim(),
        tagline: f.tagline.trim(),
        zalo: f.zalo.replace(/[^\d+]/g, ""),
        messenger: f.messenger.trim(),
        storefrontUrl: f.storefrontUrl.trim(),
        shippingFee: parseMoney(f.shipInput),
        cats: list(f.catsInput),
        countries: list(f.countriesInput),
        bank: { bank: f.bank.bank.trim(), bin: f.bank.bin.replace(/\D/g, ""), acc: f.bank.acc.replace(/\s/g, ""), name: f.bank.name.trim().toUpperCase() },
      });
      setSettings(u);
      setF({ ...u, bank: { ...u.bank }, shipInput: u.shippingFee ? dots(u.shippingFee) : "", catsInput: u.cats.join(", "), countriesInput: u.countries.join(", ") });
      toast("Đã lưu cài đặt · trang bán hàng cập nhật ngay");
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Shell>
      <main className="main-pad" style={sx("flex: 999 1 560px; min-width: 0; box-sizing: border-box; padding: 28px 32px 48px; display: flex; flex-direction: column; gap: 20px; max-width: 980px")}>
        <MobileHead title="Cài đặt cửa hàng" />
        <div className="only-desktop" style={sx("display: flex; flex-direction: column; gap: 2px")}>
          <h1 style={sx("margin: 0; font-family: Quicksand, sans-serif; font-weight: 700; font-size: 30px; color: #a3546a; letter-spacing: 0.3px")}>Cài đặt cửa hàng</h1>
          <span style={sx("color: #7d6862; font-size: 14px")}>Thông tin hiện trên trang bán hàng, hoá đơn và mã QR chuyển khoản</span>
        </div>

        <section style={sx(CARD)}>
          <H2>Cửa hàng</H2>
          <div style={sx("display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 12px")}>
            <Field label="Tên shop">
              <input value={f.store} onChange={(e) => set({ store: e.target.value })} style={sx(FIELD)} />
            </Field>
            <Field label="Dòng dưới logo (trang bán hàng)">
              <input value={f.subtitle} onChange={(e) => set({ subtitle: e.target.value })} style={sx(FIELD)} />
            </Field>
            <Field label="Dòng giới thiệu trên hoá đơn" wide>
              <input value={f.tagline} onChange={(e) => set({ tagline: e.target.value })} style={sx(FIELD)} />
            </Field>
            <Field label="Số Zalo của shop" hint="Khách bấm “Nhắn Zalo” sẽ mở số này">
              <input inputMode="tel" value={f.zalo} onChange={(e) => set({ zalo: e.target.value })} placeholder="09xx xxx xxx" style={sx(FIELD)} />
            </Field>
            <Field label="Link Messenger (không bắt buộc)">
              <input value={f.messenger} onChange={(e) => set({ messenger: e.target.value })} placeholder="https://m.me/…" style={sx(FIELD)} />
            </Field>
            <Field label="Link trang bán hàng" hint="Nút “Xem trang bán hàng” ở thanh bên" wide>
              <input value={f.storefrontUrl} onChange={(e) => set({ storefrontUrl: e.target.value })} placeholder="https://zalo.me/s/…" style={sx(FIELD)} />
            </Field>
          </div>
        </section>

        <section style={sx(CARD)}>
          <H2>Thanh toán & giao hàng</H2>
          <div style={sx("display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 12px")}>
            <Field label="Ngân hàng">
              <input value={f.bank.bank} onChange={(e) => setBank("bank", e.target.value)} placeholder="Vietcombank" style={sx(FIELD)} />
            </Field>
            <Field label="Mã BIN ngân hàng" hint="Dùng tạo VietQR, ví dụ Vietcombank 970436">
              <input inputMode="numeric" value={f.bank.bin} onChange={(e) => setBank("bin", e.target.value)} style={sx(FIELD)} />
            </Field>
            <Field label="Số tài khoản">
              <input inputMode="numeric" value={f.bank.acc} onChange={(e) => setBank("acc", e.target.value)} style={sx(FIELD)} />
            </Field>
            <Field label="Chủ tài khoản">
              <input value={f.bank.name} onChange={(e) => setBank("name", e.target.value)} placeholder="NGUYEN VAN A" style={sx(FIELD)} />
            </Field>
            <Field label="Phí giao hàng" hint={parseMoney(f.shipInput) ? "Cộng vào mỗi đơn có giá và mã QR" : "Để trống: không thu phí giao, ẩn dòng phí giao"}>
              <span style={sx("position: relative; display: block")}>
                <input inputMode="numeric" value={f.shipInput} onChange={(e) => set({ shipInput: dotsInput(e.target.value) })} placeholder="vd 30.000" style={sx(FIELD + "; padding-right: 28px")} />
                <span style={sx("position: absolute; right: 12px; top: 50%; transform: translateY(-50%); color: #7d6862; font-size: 13px")}>đ</span>
              </span>
            </Field>
          </div>
        </section>

        <section style={sx(CARD)}>
          <H2>Danh mục</H2>
          <div style={sx("display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 12px")}>
            <Field label="Nước (cách nhau bằng dấu phẩy)" hint="Thứ tự này là thứ tự tab trên trang bán hàng">
              <input value={f.countriesInput} onChange={(e) => set({ countriesInput: e.target.value })} style={sx(FIELD)} />
            </Field>
            <Field label="Nhóm hàng (cách nhau bằng dấu phẩy)">
              <input value={f.catsInput} onChange={(e) => set({ catsInput: e.target.value })} style={sx(FIELD)} />
            </Field>
          </div>
        </section>

        <div style={sx("display: flex; justify-content: flex-end")}>
          <button onClick={save} disabled={saving} style={sx("border: 0; background: #b3566f; color: #ffffff; border-radius: 14px; padding: 13px 24px; font-weight: 700; font-size: 15px; box-shadow: 0 8px 20px rgba(150, 90, 100, 0.22)" + (saving ? "; opacity: 0.7" : ""))}>
            {saving ? "Đang lưu…" : "Lưu cài đặt"}
          </button>
        </div>
      </main>
    </Shell>
  );
}
