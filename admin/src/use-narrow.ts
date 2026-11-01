import { useEffect, useState } from "react";

const QUERY = "(max-width: 760px)";

/** Điện thoại (≤760px), cập nhật khi xoay máy hoặc đổi kích thước cửa sổ. */
export function useNarrow() {
  const [narrow, setNarrow] = useState(() => typeof matchMedia !== "undefined" && matchMedia(QUERY).matches);
  useEffect(() => {
    const mq = matchMedia(QUERY);
    const sync = () => setNarrow(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return narrow;
}
