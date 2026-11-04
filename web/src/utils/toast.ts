/** Thông báo ngắn 2,2 giây, giống app gốc. */
export function toast(t: string) {
  const d = document.createElement("div");
  d.className = "toast";
  d.textContent = t;
  document.body.appendChild(d);
  setTimeout(() => d.remove(), 2200);
}

export function copyText(txt: string, msg: string) {
  (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject())
    .then(() => toast(msg))
    .catch(() => {
      const a = document.createElement("textarea");
      a.value = txt;
      document.body.appendChild(a);
      a.select();
      try {
        document.execCommand("copy");
        toast(msg);
      } catch {
        prompt(msg, txt);
      }
      a.remove();
    });
}
