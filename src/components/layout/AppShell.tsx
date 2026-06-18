import { useEffect } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { Activity, Map as MapIcon, Users, ListChecks, MoreHorizontal, Lock, LockOpen } from "lucide-react";
import { useNow } from "@/hooks/useNow";
import { useEventData } from "@/hooks/useEventData";
import { useEventStore } from "@/state/eventStore";
import { ROLE_LABELS } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Isolated so the per-second tick doesn't re-render the rest of the shell
 *  (which would reset the Konva map's pan/zoom mid-interaction). */
function HeaderClock() {
  const now = useNow();
  const time = now.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/New_York",
  });
  return <span className="tabular-nums text-sm font-semibold leading-none">{time}</span>;
}

const tabs = [
  { to: "/", label: "Live", icon: Activity, end: true },
  { to: "/map", label: "Map", icon: MapIcon, end: false },
  { to: "/staff", label: "Staff", icon: Users, end: false },
  { to: "/sidework", label: "Side Work", icon: ListChecks, end: false },
  { to: "/more", label: "More", icon: MoreHorizontal, end: false },
];

export function AppShell() {
  const { event, role, isLive, status } = useEventData();
  const { pathname } = useLocation();
  // The Map is a layout editor — let it use the full desktop width; the
  // card-based pages stay in the comfortable mobile column.
  const isMap = pathname.startsWith("/map");

  useEffect(() => {
    void useEventStore.getState().init();
  }, []);

  const editUnlocked = useEventStore((s) => s.editUnlocked);
  const unlock = useEventStore((s) => s.unlock);
  const lock = useEventStore((s) => s.lock);
  const toggleLock = async () => {
    if (editUnlocked) {
      lock();
      return;
    }
    const code = window.prompt("Manager passcode to enable editing:");
    if (code == null) return;
    const ok = await unlock(code.trim());
    if (!ok) window.alert("Incorrect passcode. Editing stays locked.");
  };

  const dot = isLive ? "bg-ok" : status === "error" ? "bg-crit" : "bg-warn";
  const stateLabel = isLive ? "live" : status === "error" ? "offline" : "seed";

  return (
    <div className={cn("mx-auto flex min-h-[100svh] flex-col bg-background", isMap ? "max-w-md lg:max-w-none" : "max-w-md")}>
      <header className="safe-t sticky top-0 z-20 border-b border-border/70 bg-background/80 backdrop-blur-md">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-['Playfair_Display',serif] text-lg font-bold leading-none text-gold">G</span>
              <h1 className="truncate font-['Playfair_Display',serif] text-base font-bold tracking-tight">{event.name}</h1>
            </div>
            <p className="truncate text-xs text-muted-foreground">{event.venue}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2.5">
            <button
              onClick={toggleLock}
              className={cn(
                "flex h-9 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold transition",
                editUnlocked ? "border-gold/50 bg-gold/10 text-gold" : "border-border bg-background/60 text-muted-foreground",
              )}
              aria-label={editUnlocked ? "Lock editing" : "Unlock editing with passcode"}
            >
              {editUnlocked ? <LockOpen className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
              <span className="hidden sm:inline">{editUnlocked ? "Editing" : "Unlock"}</span>
            </button>
            <div className="flex flex-col items-end">
              <HeaderClock />
              <span className="mt-1 flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                <span className="font-semibold text-gold">{ROLE_LABELS[role]}</span>
                <span className={cn("inline-block h-1.5 w-1.5 rounded-full", dot)} />
                {stateLabel}
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-3 pb-28 pt-3">
        <Outlet />
      </main>

      <nav className={cn("safe-b fixed inset-x-0 bottom-0 z-20 mx-auto flex items-stretch justify-around border-t border-border/70 bg-background/90 backdrop-blur-md", isMap ? "max-w-md lg:max-w-none" : "max-w-md")}>
        {tabs.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                "flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors",
                isActive ? "text-gold" : "text-muted-foreground hover:text-foreground",
              )
            }
          >
            <Icon className="h-5 w-5" strokeWidth={2} />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
