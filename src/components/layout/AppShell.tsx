import { useEffect } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { Activity, Map as MapIcon, Users, ListChecks, MoreHorizontal } from "lucide-react";
import { useNow } from "@/hooks/useNow";
import { useEventData } from "@/hooks/useEventData";
import { useEventStore } from "@/state/eventStore";
import { ROLE_LABELS } from "@/lib/types";
import { cn } from "@/lib/utils";

const tabs = [
  { to: "/", label: "Live", icon: Activity, end: true },
  { to: "/map", label: "Map", icon: MapIcon, end: false },
  { to: "/staff", label: "Staff", icon: Users, end: false },
  { to: "/sidework", label: "Side Work", icon: ListChecks, end: false },
  { to: "/more", label: "More", icon: MoreHorizontal, end: false },
];

export function AppShell() {
  const now = useNow();
  const { event, role, isLive, status } = useEventData();

  useEffect(() => {
    void useEventStore.getState().init();
  }, []);

  const time = now.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/New_York",
  });
  const dot = isLive ? "bg-ok" : status === "error" ? "bg-crit" : "bg-warn";
  const stateLabel = isLive ? "live" : status === "error" ? "offline" : "seed";

  return (
    <div className="mx-auto flex min-h-[100svh] max-w-md flex-col bg-background">
      <header className="safe-t sticky top-0 z-20 border-b border-border/70 bg-background/80 backdrop-blur-md">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-['Playfair_Display',serif] text-lg font-bold leading-none text-gold">G</span>
              <h1 className="truncate text-sm font-semibold">{event.name}</h1>
            </div>
            <p className="truncate text-xs text-muted-foreground">{event.venue}</p>
          </div>
          <div className="flex shrink-0 flex-col items-end">
            <span className="tabular-nums text-sm font-semibold leading-none">{time}</span>
            <span className="mt-1 flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
              <span className="font-semibold text-gold">{ROLE_LABELS[role]}</span>
              <span className={cn("inline-block h-1.5 w-1.5 rounded-full", dot)} />
              {stateLabel}
            </span>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-3 pb-28 pt-3">
        <Outlet />
      </main>

      <nav className="safe-b fixed inset-x-0 bottom-0 z-20 mx-auto flex max-w-md items-stretch justify-around border-t border-border/70 bg-background/90 backdrop-blur-md">
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
