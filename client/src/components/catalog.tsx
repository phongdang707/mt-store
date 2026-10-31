import { Fragment } from "react";
import LOGO from "@/static/logo.svg?raw";
import { useStore, type Sort } from "@/state/store";
import type { Product } from "@/types";
import { CAT_ICON, FLAG, LABEL, fmt, norm } from "@/utils/format";

export const Logo = () => <span style={{ display: "contents" }} dangerouslySetInnerHTML={{ __html: LOGO }} />;

/** Ảnh sản phẩm, hoặc chữ cái đầu khi chưa có ảnh. */
export function Ph({ p }: { p: Product }) {
  return p.img ? <img src={p.img} alt={p.name} loading="lazy" /> : <span>{(p.name || "?").trim().charAt(0).toUpperCase()}</span>;
}

export function Header() {
  const { D, MY, setOpen } = useStore();
  const n = MY.filter((o) => o.status !== "confirmed" && !o.paid).length;
  return (
    <>
      <header className="bar">
        <div className="bar-in">
          <button className="ordbtn" onClick={() => setOpen("orders")}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M6 3h12v18l-3-2-3 2-3-2-3 2z" />
              <path d="M9 8h6M9 12h6" />
            </svg>
            Đơn của bạn
            <b id="ocnt" hidden={!n}>
              {n}
            </b>
          </button>
          <div style={{ flex: 1 }} />
        </div>
      </header>
      <div className="wrap top-wrap">
        <section className="hero">
          <Logo />
          <h1>{D?.subtitle}</h1>
        </section>
      </div>
    </>
  );
}

const SORT_LABEL: Record<string, string> = { default: "Nổi bật", asc: "Giá thấp → cao", best: "Sản phẩm bán chạy" };
const Badge = ({ p }: { p: Product }) =>
  p.soldout ? (
    <div className="tagx out">Hết hàng</div>
  ) : p.hot || p.best ? (
    <div className="tagx">
      {p.hot ? "🔥 Hot" : ""}
      {p.hot && p.best ? " · " : ""}
      {p.best ? "Bán chạy" : ""}
    </div>
  ) : null;

/** Sản phẩm dạng link: xem mẫu, màu, giá tại cửa hàng chính hãng Việt Nam. */
function LinkCard({ p }: { p: Product }) {
  const u = /^https:\/\//.test(String(p.link)) ? p.link : "#";
  return (
    <div className="card">
      <Badge p={p} />
      <a className="ph" href={u} target="_blank" rel="noopener" aria-label={`Xem ${p.name} tại cửa hàng Việt Nam`}>
        <Ph p={p} />
      </a>
      <div className="nm">{p.name}</div>
      <div className="mk">Xem mẫu và màu tại cửa hàng chính hãng Việt Nam</div>
      <div className="act">
        <a className="add lnk" href={u} target="_blank" rel="noopener">
          Xem màu & giá
        </a>
      </div>
    </div>
  );
}

function Prices({ p }: { p: Product }) {
  return (
    <>
      <div className="mk">Thị trường: {p.market ? <s>{fmt(p.market)}</s> : "—"}</div>
      <div className="pr">
        <small>Giá dự kiến bán</small>
        {p.price ? fmt(p.price) : <span className="tbd">Đang cập nhật</span>}
      </div>
    </>
  );
}

function VariantCard({ p }: { p: Product }) {
  const { prodCount, startPick } = useStore();
  const n = prodCount(p.id);
  const vs = p.variants;
  const save = p.market > p.price && p.price ? Math.round((1 - p.price / p.market) * 100) : 0;
  return (
    <div className={`card${p.soldout ? " soldout" : ""}`}>
      {save ? <div className="save">−{save}%</div> : null}
      <Badge p={p} />
      <button className="ph phb" disabled={p.soldout} onClick={() => startPick(p.id)} aria-label={`Xem tone màu ${p.name}`}>
        <Ph p={p} />
        <span className="tones">
          {vs.length} {p.vlabel || "tone"}
        </span>
      </button>
      <div className="nm">{p.name}</div>
      <div className="sw">
        {vs.slice(0, 6).map((v, i) => (
          <img key={i} src={v.img} alt={v.name} />
        ))}
        {vs.length > 6 && <em>+{vs.length - 6}</em>}
      </div>
      <Prices p={p} />
      <div className="act">
        {p.soldout ? (
          <button className="add" disabled>
            Hết hàng
          </button>
        ) : (
          <button className={`add plus ${n ? "has" : ""}`} onClick={() => startPick(p.id)} aria-label={`Chọn ${p.name}`}>
            +{n ? <small>{n}</small> : null}
          </button>
        )}
      </div>
    </div>
  );
}

export function Card({ p }: { p: Product }) {
  const { cart, setQty } = useStore();
  if (p.link) return <LinkCard p={p} />;
  if (p.variants?.length) return <VariantCard p={p} />;
  const q = cart[p.id] || 0;
  const save = p.market > p.price ? Math.round((1 - p.price / p.market) * 100) : 0;
  return (
    <div className={`card${p.soldout ? " soldout" : ""}`}>
      {save ? <div className="save">−{save}%</div> : null}
      <Badge p={p} />
      <div className="ph">
        <Ph p={p} />
      </div>
      <div className="nm">{p.name}</div>
      <Prices p={p} />
      <div className="act">
        {q ? (
          <div className="step">
            <button onClick={() => setQty(p.id, q - 1)} aria-label="Bớt">
              −
            </button>
            <span>{q}</span>
            <button onClick={() => setQty(p.id, q + 1)} aria-label="Thêm">
              +
            </button>
          </div>
        ) : p.soldout ? (
          <button className="add" disabled>
            Hết hàng
          </button>
        ) : (
          <button className="add plus" onClick={() => setQty(p.id, 1)} aria-label={`Chọn ${p.name}`}>
            +
          </button>
        )}
      </div>
    </div>
  );
}

const Grid = ({ ps }: { ps: Product[] }) => (
  <div className="grid">
    {ps.map((p) => (
      <Card key={p.id} p={p} />
    ))}
  </div>
);

function catsOf(D: { products: Product[]; cats: string[] }, c: string) {
  const set = new Set(D.products.filter((p) => (p.country || "Nhật") === c).map((p) => p.cat));
  return [...D.cats.filter((x) => set.has(x)), ...[...set].filter((x) => !D.cats.includes(x))];
}

function List() {
  const { D, q, country, cat, sort } = useStore();
  if (!D) return null;
  if (q) {
    const hits = D.products.filter((p) => {
      let s = norm(p.name + " " + p.cat + " " + (p.country || ""));
      if (s.includes("mat na")) s += " mask";
      if (s.includes("mask")) s += " mat na";
      if (s.includes("nho mat")) s += " eye drop";
      return s.includes(norm(q));
    });
    if (!hits.length) return <div className="empty">Không tìm thấy món nào phù hợp “{q}”.</div>;
    return (
      <>
        {D.countries.map((c) => {
          const g = hits.filter((p) => (p.country || "Nhật") === c);
          return g.length ? (
            <Fragment key={c}>
              <div className="sec-t">
                <i></i>
                {FLAG[c] || ""} {LABEL[c] || c}
                <i></i>
              </div>
              <Grid ps={g} />
            </Fragment>
          ) : null;
        })}
      </>
    );
  }
  const inC = D.products.filter((p) => (p.country || "Nhật") === country);
  if (!inC.length)
    return (
      <div className="empty">
        <div style={{ fontSize: 40 }}>{FLAG[country] || "🌸"}</div>Hàng từ {LABEL[country] || country} đang về, bạn quay lại sau nhé!
      </div>
    );
  let ps = inC.filter((p) => cat === "Tất cả" || p.cat === cat);
  if (sort === "hot") ps = ps.filter((p) => p.hot);
  if (sort === "best") ps = ps.filter((p) => p.best);
  if (sort === "asc") ps = [...ps].sort((a, b) => (a.price || 1e12) - (b.price || 1e12));
  if (sort === "desc") ps = [...ps].sort((a, b) => b.price - a.price);
  if (sort === "default") ps = [...ps].sort((a, b) => (b.hot ? 2 : 0) + (b.best ? 1 : 0) - ((a.hot ? 2 : 0) + (a.best ? 1 : 0)));
  ps = [...ps].sort((a, b) => (a.soldout ? 1 : 0) - (b.soldout ? 1 : 0));
  if (!ps.length && (sort === "hot" || sort === "best"))
    return <div className="empty">Chưa có món {sort === "hot" ? "đang hot" : "bán chạy"} trong mục này.</div>;
  if (!ps.length) return <div className="empty">Không tìm thấy món nào phù hợp “{q}”.</div>;
  if (cat === "Tất cả" && sort === "default")
    return (
      <>
        {catsOf(D, country).map((c) => {
          const g = ps.filter((p) => p.cat === c);
          if (!g.length) return null;
          return (
            <Fragment key={c}>
              <div className="sec-t">
                <i></i>
                <span>
                  <b className="ci" aria-hidden="true">
                    {CAT_ICON[c] || "🌸"}
                  </b>
                  {c} <small>{g.length} món</small>
                </span>
                <i></i>
              </div>
              <Grid ps={g} />
            </Fragment>
          );
        })}
      </>
    );
  return <Grid ps={ps} />;
}

export function Catalog() {
  const { D, q, setQ, country, setCountry, cat, setCat, sort, setSort, setOpen } = useStore();
  if (!D) return null;
  return (
    <main className="wrap">
      <nav className="ctabs" aria-label="Chọn nước">
        {D.countries.map((c) => (
          <button key={c} className={`ctab ${c === country && !q ? "on" : ""}`} onClick={() => setCountry(c)}>
            <span>{FLAG[c] || ""}</span>
            {LABEL[c] || c}
            <small>{D.products.filter((p) => (p.country || "Nhật") === c).length} món</small>
          </button>
        ))}
      </nav>
      <div className="search big">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <input id="q" type="search" placeholder="Tìm món: giày, thuốc, mỹ phẩm…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Tìm món" />
      </div>
      <div className="need">
        <button className="needbtn" onClick={() => setOpen("photo")}>
          <i aria-hidden="true">📷</i>
          <span>
            <em>Bạn đang cần gì?</em>
          </span>
        </button>
      </div>
      <div className="tools" hidden={!!q}>
        <div className="chips">
          {["Tất cả", ...catsOf(D, country)].map((c) => (
            <button key={c} className={`chip ${c === cat ? "on" : ""}`} onClick={() => setCat(c)}>
              {c}
            </button>
          ))}
        </div>
        <label className="sortw">
          <span className="sv">{SORT_LABEL[sort] || "Nổi bật"}</span>
          <svg className="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 7h16M7 12h10M10 17h4" />
          </svg>
          <select className="sort" id="sort" aria-label="Sắp xếp" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
            <option value="default">Nổi bật</option>
            <option value="best">Sản phẩm bán chạy</option>
            <option value="asc">Giá thấp → cao</option>
          </select>
          <svg className="cv" viewBox="0 0 12 12" aria-hidden="true">
            <path d="M3 4.5 6 7.5l3-3" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </label>
      </div>
      <div id="list">
        <List />
      </div>
    </main>
  );
}

export function Dock() {
  const { cartCount, cartTotal, setOpen } = useStore();
  return (
    <div className="dock">
      <button onClick={() => setOpen("cart")} aria-label="Giỏ hàng">
        <span>
          🛒 Giỏ hàng<b>{cartCount}</b>
        </span>
        <span>{cartCount ? fmt(cartTotal) : "Chưa có món"}</span>
      </button>
    </div>
  );
}
