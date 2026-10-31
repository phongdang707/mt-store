import { useEffect, useRef, useState } from "react";
import { api } from "@/api";
import { toast, useApp } from "@/app-state";
import { CloseX, Search } from "@/components/ui";
import { MobileHead, Shell } from "@/components/shell";
import { CN, dots, dotsInput, norm, parseMoney, relUpdated } from "@/format";
import { sx } from "@/sx";
import type { Product } from "@/types";

/** Ảnh tự căn vuông, nền trắng (giống app gốc), JPEG để tải lên. */
function squareBlob(file: Blob, S = 640): Promise<Blob> {
  return new Promise((res, rej) => {
    const u = URL.createObjectURL(file);
    const im = new Image();
    im.onload = () => {
      const sc = Math.min((S * 0.92) / im.width, (S * 0.92) / im.height),
        w = im.width * sc,
        h = im.height * sc;
      const c = document.createElement("canvas");
      c.width = S;
      c.height = S;
      const x = c.getContext("2d")!;
      x.fillStyle = "#fff";
      x.fillRect(0, 0, S, S);
      x.drawImage(im, (S - w) / 2, (S - h) / 2, w, h);
      URL.revokeObjectURL(u);
      c.toBlob((b) => (b ? res(b) : rej(new Error("Không đọc được ảnh"))), "image/jpeg", 0.88);
    };
    im.onerror = () => {
      URL.revokeObjectURL(u);
      rej(new Error("Không đọc được ảnh này"));
    };
    im.src = u;
  });
}
const uploadSquare = async (f: Blob) => (await api.upload(await squareBlob(f))).url;
const toneName = (file: string, n: number) => {
  const s = file.replace(/\.[^.]+$/, "");
  return s && s.length <= 24 && !/^(img|image|dsc|photo|screenshot)/i.test(s) ? s : "Tone " + n;
};

type Filter = string;
const LABEL = "font-size: 13px; font-weight: 600; color: #6f5a55";
const FIELD = "box-sizing: border-box; width: 100%; border: 1px solid #efd9d3; background: #ffffff; border-radius: 12px; padding: 11px 12px; font: inherit; color: #3d3530";

interface Draft extends Product {
  priceInput: string;
  marketInput: string;
}
const toDraft = (p: Product): Draft => ({ ...p, variants: p.variants.map((v) => ({ ...v })), priceInput: p.price ? dots(p.price) : "", marketInput: p.market ? dots(p.market) : "" });

export default function Products() {
  const { settings, tick, refresh } = useApp();
  const [products, setProducts] = useState<Product[] | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [sure, setSure] = useState(false);
  const [drop, setDrop] = useState(false);
  const [uploading, setUploading] = useState(0);
  const mainFile = useRef<HTMLInputElement>(null);
  const toneFile = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api
      .products()
      .then((l) => {
        setProducts(l);
        if (!sel && l.length && !matchMedia("(max-width: 760px)").matches) pick(l[0]);
      })
      .catch((e) => toast((e as Error).message));
  }, [tick]);

  const dirty = (() => {
    const p = products?.find((x) => x.id === draft?.id);
    if (!p || !draft) return false;
    const n = { ...draft, price: parseMoney(draft.priceInput), market: parseMoney(draft.marketInput) };
    return (["name", "price", "market", "country", "cat", "img", "link", "hot", "best", "soldout"] as const).some((k) => n[k] !== p[k]) || JSON.stringify(n.variants) !== JSON.stringify(p.variants);
  })();

  function pick(p: Product) {
    setSel(p.id);
    setDraft(toDraft(p));
    setSure(false);
  }
  const trySelect = (p: Product) => {
    if (dirty && !confirm("Sản phẩm đang sửa chưa lưu. Bỏ thay đổi?")) return;
    pick(p);
  };

  /** Lưới hiển thị theo bản đang sửa (giá, cờ đổi ngay khi gõ). */
  const live = (products ?? []).map((p) => (draft && p.id === draft.id ? { ...draft, price: parseMoney(draft.priceInput), market: parseMoney(draft.marketInput) } : p));
  const countries = settings?.countries?.length ? settings.countries : [...new Set(live.map((p) => p.country))];
  const F: [string, string, (p: Product) => boolean][] = [
    ["all", "Tất cả", () => true],
    ...countries.map((c) => [c, CN[c] || c, (p: Product) => p.country === c] as [string, string, (p: Product) => boolean]),
    ["noprice", "Chưa có giá", (p) => !p.price && !p.link],
    ["soldout", "Hết hàng", (p) => p.soldout],
  ];
  const cur = F.find((f) => f[0] === filter) ?? F[0];
  const searched = q ? live.filter((p) => norm(p.name + " " + p.cat).includes(norm(q))) : live;
  const grid = searched.filter(cur[2]);
  const noPrice = live.filter((p) => !p.price && !p.link).length;

  const set = (patch: Partial<Draft>) => setDraft((d) => (d ? { ...d, ...patch } : d));

  const upMain = async (f?: File | null) => {
    if (!f || !draft || !/^image\//.test(f.type)) return;
    setUploading((n) => n + 1);
    try {
      set({ img: await uploadSquare(f) });
      toast("Đã cập nhật ảnh · bấm Lưu để khách thấy");
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setUploading((n) => n - 1);
    }
  };
  const upTones = async (fs: File[]) => {
    if (!draft) return;
    const imgs = fs.filter((f) => /^image\//.test(f.type)).slice(0, 12);
    if (!imgs.length) return;
    setUploading((n) => n + 1);
    try {
      const urls = await Promise.all(imgs.map((f) => uploadSquare(f).catch(() => "")));
      setDraft((d) => {
        if (!d) return d;
        const vs = [...d.variants];
        urls.forEach((u, i) => u && vs.push({ name: toneName(imgs[i].name, vs.length + 1), img: u }));
        return { ...d, variants: vs };
      });
      toast("Đã thêm " + urls.filter(Boolean).length + " ảnh tone");
    } finally {
      setUploading((n) => n - 1);
    }
  };

  // Dán ảnh từ máy khi đang mở sản phẩm.
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const f = [...(e.clipboardData?.files || [])].find((x) => /^image\//.test(x.type));
      if (f && draft && !(e.target as HTMLElement)?.closest?.("input,textarea")) {
        e.preventDefault();
        upMain(f);
      }
    };
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, [draft?.id]);

  const save = async () => {
    if (!draft) return;
    if (!draft.name.trim()) return toast("Bạn nhập tên sản phẩm nhé");
    setSaving(true);
    try {
      const { id, name, cat, country, img, variants, vlabel, link, hot, best, soldout } = draft;
      const u = await api.updateProduct(id, { name: name.trim(), cat, country, img, variants, vlabel, link: link.trim(), hot, best, soldout, price: parseMoney(draft.priceInput), market: parseMoney(draft.marketInput) });
      setProducts((l) => l && l.map((p) => (p.id === u.id ? u : p)));
      setDraft(toDraft(u));
      toast("Đã lưu · khách thấy ngay trên trang bán hàng");
      refresh();
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setSaving(false);
    }
  };
  const remove = async () => {
    if (!draft) return;
    if (!sure) return setSure(true);
    try {
      await api.deleteProduct(draft.id);
      toast(`Đã xoá “${draft.name}”`);
      const rest = (products ?? []).filter((p) => p.id !== draft.id);
      setProducts(rest);
      setDraft(null);
      setSel(null);
      if (rest[0]) pick(rest[0]);
      refresh();
    } catch (e) {
      toast((e as Error).message);
    }
  };
  const add = async () => {
    if (dirty && !confirm("Sản phẩm đang sửa chưa lưu. Bỏ thay đổi?")) return;
    try {
      const p = await api.createProduct({ name: "Món mới", country: ["all", "noprice", "soldout"].includes(filter) ? countries[0] || "Nhật" : filter });
      setProducts((l) => [p, ...(l ?? [])]);
      setFilter("all");
      setQ("");
      pick(p);
      refresh();
      setTimeout(() => (document.getElementById("p-name") as HTMLInputElement | null)?.select(), 50);
    } catch (e) {
      toast((e as Error).message);
    }
  };

  const d = draft;
  const priceN = d ? parseMoney(d.priceInput) : 0;
  const cats = [...new Set([...(settings?.cats ?? []), ...(d ? [d.cat] : [])])];

  return (
    <Shell fixed>
      <main className="main-pad" style={sx("flex: 1 1 auto; min-width: 0; height: 100%; box-sizing: border-box; padding: 28px 32px 24px; display: flex; flex-direction: column; gap: 20px")}>
        <MobileHead title="Sản phẩm" sub={live.length + " món"} />
        <div style={sx("display: flex; flex-wrap: wrap; gap: 14px; align-items: flex-end; justify-content: space-between")}>
          <div style={sx("display: flex; flex-direction: column; gap: 2px")}>
            <h1 className="only-desktop" style={sx("margin: 0; font-family: Quicksand, sans-serif; font-weight: 700; font-size: 30px; color: #a3546a; letter-spacing: 0.3px")}>
              Sản phẩm
            </h1>
            <span style={sx("color: #7d6862; font-size: 14px")}>
              {live.length} món · {noPrice} món chưa có giá (khách thấy “Đang cập nhật”)
            </span>
          </div>
          <button onClick={add} style={sx("display: inline-flex; align-items: center; gap: 8px; border: 0; background: #b3566f; color: #ffffff; border-radius: 999px; padding: 12px 20px; font-weight: 700; box-shadow: 0 8px 20px rgba(150, 90, 100, 0.22)")}>
            <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
              <path d="M12 5v14M5 12h14"></path>
            </svg>
            Thêm sản phẩm
          </button>
        </div>

        <div style={sx("display: flex; flex-wrap: wrap; gap: 10px; align-items: center")}>
          <Search label="Tìm sản phẩm" placeholder="Tìm sản phẩm…" value={q} onChange={setQ} flex="1 1 260px" minWidth="200px" />
          {F.map(([id, l, f]) => (
            <button
              key={id}
              onClick={() => setFilter(id)}
              style={sx(
                "box-sizing: border-box; border-radius: 999px; padding: 10px 16px; font-weight: 600; font-size: 14px; white-space: nowrap; " +
                  (id === filter ? "border: 1.5px solid #b3566f; background: #b3566f; color: #ffffff" : "border: 1px solid #efd9d3; background: #fffaf7; color: #6f5a55"),
              )}
            >
              {l + " · " + searched.filter(f).length}
            </button>
          ))}
        </div>

        <div className="prod-body" style={sx("flex: 1 1 auto; min-height: 0; display: flex; gap: 20px; align-items: stretch")}>
          <section
            aria-label="Danh sách sản phẩm"
            className="prod-grid"
            style={sx("flex: 1 1 auto; min-width: 0; min-height: 0; overflow-y: auto; box-sizing: border-box; padding: 4px 8px 24px 4px; align-content: start; display: grid; grid-template-columns: repeat(auto-fill, minmax(176px, 1fr)); gap: 14px")}
          >
            {grid.map((p) => {
              const flag = p.soldout ? "Hết hàng" : p.hot ? "Hot" : p.best ? "Bán chạy" : "";
              return (
                <button
                  key={p.id}
                  onClick={() => trySelect(p)}
                  style={sx(
                    "box-sizing: border-box; display: flex; flex-direction: column; gap: 8px; padding: 10px; border-radius: 20px; font: inherit; color: inherit; text-align: left; background: rgba(255, 250, 247, 0.9); box-shadow: 0 6px 18px rgba(150, 90, 100, 0.10); " +
                      (p.id === sel ? "border: 2px solid #b3566f" : "border: 2px solid #efd9d3") +
                      (p.soldout ? "; opacity: 0.6" : ""),
                  )}
                >
                  <span style={sx("position: relative; display: block; aspect-ratio: 1; border-radius: 14px; background: #ffffff; overflow: hidden")}>
                    {p.img ? <img src={p.img} alt="" loading="lazy" style={sx("width: 100%; height: 100%; object-fit: contain; display: block")} /> : null}
                    {p.variants.length ? (
                      <span style={sx("position: absolute; left: 8px; bottom: 8px; background: rgba(61, 53, 48, 0.72); color: #ffffff; font-size: 11.5px; font-weight: 600; border-radius: 999px; padding: 2px 9px")}>
                        {p.variants.length} {p.vlabel || "tone"}
                      </span>
                    ) : null}
                    {flag ? <span style={sx("position: absolute; right: 8px; top: 8px; background: #b3566f; color: #ffffff; font-size: 11px; font-weight: 700; border-radius: 999px; padding: 2px 9px")}>{flag}</span> : null}
                  </span>
                  <span style={sx("font-size: 14px; font-weight: 600; line-height: 1.3; text-align: left; min-height: 2.6em")}>{p.name}</span>
                  <span style={sx("display: flex; align-items: center; justify-content: space-between; gap: 6px")}>
                    <span
                      style={sx(
                        "box-sizing: border-box; " +
                          (p.link
                            ? "font-size: 12px; font-weight: 700; color: #8f4459; background: #f6e1dc; border-radius: 999px; padding: 2px 9px"
                            : p.price
                              ? "font-weight: 700; color: #a3546a; font-size: 15px"
                              : "font-size: 12px; font-weight: 700; color: #7a4f00; background: #fdecc8; border-radius: 999px; padding: 2px 9px"),
                      )}
                    >
                      {p.link ? "Link chính hãng" : p.price ? dots(p.price) + "đ" : "Chưa có giá"}
                    </span>
                    <span style={sx("font-size: 12px; color: #7d6862")}>{p.country}</span>
                  </span>
                </button>
              );
            })}
            {products && !grid.length ? <p style={sx("grid-column: 1 / -1; margin: 0; padding: 40px 16px; text-align: center; color: #7d6862")}>Không có sản phẩm nào phù hợp.</p> : null}
            {!products ? <p style={sx("grid-column: 1 / -1; margin: 0; padding: 40px 16px; text-align: center; color: #7d6862")}>Đang tải sản phẩm…</p> : null}
          </section>

          {d ? (
            <section
              aria-label="Sửa sản phẩm"
              className="prod-editor detail-sheet"
              onDragOver={(e) => {
                e.preventDefault();
                setDrop(true);
              }}
              onDragLeave={() => setDrop(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDrop(false);
                upMain(e.dataTransfer.files?.[0]);
              }}
              style={sx("flex: 0 0 420px; min-width: 0; max-height: 100%; overflow-y: auto; box-sizing: border-box; background: #fffaf7; border: 1px solid #efd9d3; border-radius: 22px; box-shadow: 0 10px 26px rgba(150, 90, 100, 0.14); display: flex; flex-direction: column")}
            >
              <div style={sx("padding: 16px 20px; border-bottom: 1px solid #efd9d3; display: flex; align-items: center; gap: 10px")}>
                <span style={sx("flex: 1; font-family: Quicksand, sans-serif; font-weight: 700; font-size: 18px; color: #a3546a; letter-spacing: 0.3px")}>Sửa sản phẩm</span>
                <span style={sx("font-size: 12.5px; color: #7d6862")}>{uploading ? "Đang tải ảnh…" : dirty ? "Chưa lưu" : relUpdated(products?.find((p) => p.id === d.id)?.updatedAt)}</span>
                <span className="only-mobile">
                  <CloseX
                    label="Đóng"
                    onClick={() => {
                      if (dirty && !confirm("Sản phẩm đang sửa chưa lưu. Bỏ thay đổi?")) return;
                      setDraft(null);
                      setSel(null);
                    }}
                  />
                </span>
              </div>
              <div style={sx("padding: 18px 20px; display: flex; flex-direction: column; gap: 16px")}>
                <div style={sx("display: flex; gap: 14px")}>
                  <div className={drop ? "drop-on" : undefined} style={sx("position: relative; width: 132px; height: 132px; flex: 0 0 132px; border-radius: 16px; background: #ffffff; border: 1px solid #efd9d3; overflow: hidden")}>
                    {d.img ? <img src={d.img} alt={d.name} style={sx("width: 100%; height: 100%; object-fit: contain; display: block")} /> : null}
                  </div>
                  <div style={sx("flex: 1; display: flex; flex-direction: column; gap: 8px; justify-content: center")}>
                    <button
                      onClick={() => mainFile.current?.click()}
                      style={sx("display: flex; align-items: center; justify-content: center; gap: 8px; border: 1.5px solid #b3566f; background: #ffffff; color: #a3546a; border-radius: 12px; padding: 10px; font-weight: 700; font-size: 14px")}
                    >
                      <svg aria-hidden="true" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 8h3l2-3h6l2 3h3v11H4z"></path>
                        <circle cx="12" cy="13" r="3.5"></circle>
                      </svg>
                      {d.img ? "Đổi ảnh chính" : "Thêm ảnh chính"}
                    </button>
                    <input
                      ref={mainFile}
                      type="file"
                      accept="image/*"
                      hidden
                      onChange={(e) => {
                        upMain(e.target.files?.[0]);
                        e.target.value = "";
                      }}
                    />
                    <span style={sx("font-size: 12.5px; color: #7d6862; line-height: 1.4")}>Kéo thả ảnh vào đây hoặc dán ảnh từ máy. Ảnh tự căn vuông, nền trắng.</span>
                  </div>
                </div>

                {d.link ? null : (
                  <div style={sx("display: flex; flex-direction: column; gap: 8px")}>
                    <span style={sx(LABEL)}>
                      Ảnh {d.vlabel || "tone"} / màu · {d.variants.length} <span style={sx("font-weight: 400; color: #7d6862")}>— khách chọn {d.vlabel || "tone"} khi mua</span>
                    </span>
                    <div style={sx("display: flex; gap: 8px; flex-wrap: wrap")}>
                      {d.variants.map((t, k) => (
                        <div key={k} className="tone" style={sx("position: relative; width: 64px; display: flex; flex-direction: column; gap: 4px; align-items: center")}>
                          {t.img ? (
                            <img src={t.img} alt={"Tone " + t.name} style={sx("width: 64px; height: 64px; border-radius: 12px; border: 1px solid #efd9d3; background: #ffffff; object-fit: cover")} />
                          ) : (
                            <span style={sx("width: 64px; height: 64px; border-radius: 12px; border: 1.5px dashed #d9b8b0; background: #ffffff; display: flex; align-items: center; justify-content: center; font-size: 11px; color: #7d6862")}>[ảnh]</span>
                          )}
                          <input
                            aria-label="Tên tone"
                            value={t.name}
                            onChange={(e) => set({ variants: d.variants.map((v, i) => (i === k ? { ...v, name: e.target.value } : v)) })}
                            style={sx("box-sizing: border-box; width: 64px; border: 0; background: transparent; font: inherit; font-size: 11.5px; color: #3d3530; text-align: center; line-height: 1.25; padding: 0; text-overflow: ellipsis")}
                          />
                          <button
                            className="tone-x"
                            aria-label={"Xoá tone " + t.name}
                            onClick={() => set({ variants: d.variants.filter((_, i) => i !== k) })}
                            style={sx("position: absolute; top: -6px; right: -6px; width: 22px; height: 22px; border-radius: 50%; border: 0; background: #8f4459; color: #fff; font-size: 11px; display: flex; align-items: center; justify-content: center; padding: 0")}
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={() => toneFile.current?.click()}
                        aria-label="Thêm ảnh tone"
                        style={sx("width: 64px; height: 64px; border-radius: 12px; border: 1.5px dashed #b3566f; background: #fdf3f5; color: #a3546a; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; font-size: 11px; font-weight: 700")}
                      >
                        <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                          <path d="M12 5v14M5 12h14"></path>
                        </svg>
                        Thêm
                      </button>
                      <input
                        ref={toneFile}
                        type="file"
                        accept="image/*"
                        multiple
                        hidden
                        onChange={(e) => {
                          upTones([...(e.target.files || [])]);
                          e.target.value = "";
                        }}
                      />
                    </div>
                  </div>
                )}

                <label style={sx("display: flex; flex-direction: column; gap: 6px")}>
                  <span style={sx(LABEL)}>Tên sản phẩm</span>
                  <input id="p-name" value={d.name} onChange={(e) => set({ name: e.target.value })} style={sx(FIELD)} />
                </label>

                {d.link ? (
                  <label style={sx("display: flex; flex-direction: column; gap: 6px")}>
                    <span style={sx(LABEL)}>Link cửa hàng chính hãng</span>
                    <input value={d.link} onChange={(e) => set({ link: e.target.value })} placeholder="https://" style={sx(FIELD)} />
                    <span style={sx("font-size: 12px; color: #7d6862")}>Sản phẩm dạng link: khách xem giá tại cửa hàng chính hãng</span>
                  </label>
                ) : null}

                <div style={sx("display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px")}>
                  {d.link ? null : (
                    <>
                      <label style={sx("display: flex; flex-direction: column; gap: 6px")}>
                        <span style={sx(LABEL)}>Giá thị trường</span>
                        <span style={sx("position: relative; display: block")}>
                          <input
                            inputMode="numeric"
                            placeholder="vd 350.000"
                            value={d.marketInput}
                            onChange={(e) => set({ marketInput: dotsInput(e.target.value) })}
                            style={sx("box-sizing: border-box; width: 100%; border: 1px solid #efd9d3; background: #ffffff; border-radius: 12px; padding: 11px 28px 11px 12px; font: inherit; color: #3d3530")}
                          />
                          <span style={sx("position: absolute; right: 12px; top: 50%; transform: translateY(-50%); color: #7d6862; font-size: 13px")}>đ</span>
                        </span>
                      </label>
                      <label style={sx("display: flex; flex-direction: column; gap: 6px")}>
                        <span style={sx("font-size: 13px; font-weight: 700; color: #a3546a")}>Giá bán</span>
                        <span style={sx("position: relative; display: block")}>
                          <input
                            inputMode="numeric"
                            placeholder="Nhập giá"
                            value={d.priceInput}
                            onChange={(e) => set({ priceInput: dotsInput(e.target.value) })}
                            style={sx("box-sizing: border-box; width: 100%; border: 1.5px solid #b3566f; background: #ffffff; border-radius: 12px; padding: 11px 28px 11px 12px; font: inherit; font-weight: 700; font-size: 16px; color: #a3546a")}
                          />
                          <span style={sx("position: absolute; right: 12px; top: 50%; transform: translateY(-50%); color: #7d6862; font-size: 13px")}>đ</span>
                        </span>
                        <span style={sx("font-size: 12px; color: #7d6862")}>{priceN ? "Khách thấy: " + dots(priceN) + "đ" : "Để trống: khách thấy “Đang cập nhật”"}</span>
                      </label>
                    </>
                  )}
                  <label style={sx("display: flex; flex-direction: column; gap: 6px")}>
                    <span style={sx(LABEL)}>Nước</span>
                    <select value={d.country} onChange={(e) => set({ country: e.target.value })} style={sx(FIELD)}>
                      {[...new Set([...countries, d.country])].map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label style={sx("display: flex; flex-direction: column; gap: 6px")}>
                    <span style={sx(LABEL)}>Nhóm hàng</span>
                    <select value={d.cat} onChange={(e) => set({ cat: e.target.value })} style={sx(FIELD)}>
                      {cats.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                {d.link ? null : (
                  <div style={sx("display: flex; flex-wrap: wrap; gap: 8px")}>
                    {(
                      [
                        ["hot", "Hot"],
                        ["best", "Bán chạy"],
                        ["soldout", "Hết hàng"],
                      ] as const
                    ).map(([k, l]) => {
                      const on = d[k];
                      return (
                        <button
                          key={k}
                          onClick={() => set({ [k]: !on })}
                          aria-pressed={on}
                          style={sx(
                            "box-sizing: border-box; border-radius: 999px; padding: 9px 16px; font-weight: 600; font-size: 14px; " +
                              (on ? "border: 1.5px solid #b3566f; background: #fbe7ec; color: #8f4459" : "border: 1px solid #efd9d3; background: #ffffff; color: #6f5a55"),
                          )}
                        >
                          {(on ? "✓ " : "") + l}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
              <div style={sx("padding: 14px 20px 20px; border-top: 1px solid #efd9d3; display: flex; gap: 10px; align-items: center; margin-top: auto")}>
                <button
                  onClick={remove}
                  onBlur={() => setSure(false)}
                  style={sx(
                    "border: 0; font-weight: 600; font-size: 14px; display: flex; align-items: center; gap: 6px; " +
                      (sure ? "background: #c0392b; color: #ffffff; border-radius: 999px; padding: 10px 14px" : "background: transparent; color: #8f4459; padding: 10px 6px"),
                  )}
                >
                  <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 7h16"></path>
                    <path d="M9 7V4h6v3"></path>
                    <path d="M6 7l1 13h10l1-13"></path>
                  </svg>
                  {sure ? "Bấm lần nữa để xoá" : "Xoá"}
                </button>
                <span style={{ flex: 1 }}></span>
                <button
                  disabled={!dirty}
                  onClick={() => {
                    const p = products?.find((x) => x.id === d.id);
                    if (p) setDraft(toDraft(p));
                  }}
                  style={sx("border: 1px solid #efd9d3; background: #ffffff; color: #6f5a55; border-radius: 14px; padding: 12px 16px; font-weight: 600" + (dirty ? "" : "; opacity: 0.6"))}
                >
                  Huỷ
                </button>
                <button
                  disabled={saving || !!uploading || !dirty}
                  onClick={save}
                  style={sx("border: 0; background: #b3566f; color: #ffffff; border-radius: 14px; padding: 12px 20px; font-weight: 700" + (saving || uploading || !dirty ? "; opacity: 0.6" : ""))}
                >
                  {saving ? "Đang lưu…" : "Lưu thay đổi"}
                </button>
              </div>
            </section>
          ) : null}
        </div>
      </main>
    </Shell>
  );
}
