import { useEffect, useState } from "react";

/** True on desktop-width screens. Map/object editing is gated to desktop so the
 *  app is read-only/informational on phones (no per-staff logins), while edits
 *  made on the desktop still propagate live to every client. */
export function useIsDesktop(minWidth = 1024): boolean {
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== "undefined" && window.matchMedia(`(min-width: ${minWidth}px)`).matches,
  );
  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${minWidth}px)`);
    const on = () => setIsDesktop(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, [minWidth]);
  return isDesktop;
}
