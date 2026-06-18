import { useEffect, useRef } from "react";
import type { RosCue } from "@/data/whiteParty";
import { cn } from "@/lib/utils";

const phaseColor: Record<string, string> = {
  setup: "border-border text-muted-foreground",
  doors: "border-pool/40 text-pool",
  service: "border-gold/40 text-gold",
  peak: "border-crit/50 text-crit",
  feature: "border-vip/50 text-vip",
  last_call: "border-warn/60 text-warn",
  close: "border-crit/50 text-crit",
  breakdown: "border-border text-muted-foreground",
};

const fmt = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/New_York" });

export function RunOfShowRibbon({ cues, now }: { cues: RosCue[]; now: Date }) {
  const ms = now.getTime();
  let cur = -1;
  cues.forEach((c, i) => {
    if (new Date(c.time).getTime() <= ms) cur = i;
  });
  const activeRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    activeRef.current?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [cur]);

  return (
    <div className="-mx-3 flex gap-2 overflow-x-auto px-3 pb-1" style={{ scrollbarWidth: "none" }}>
      {cues.map((c, i) => {
        const past = i < cur;
        const active = i === cur;
        return (
          <div
            key={c.id}
            ref={active ? activeRef : undefined}
            className={cn(
              "flex min-w-[116px] shrink-0 flex-col rounded-lg border px-2.5 py-1.5 transition-opacity",
              phaseColor[c.phase] ?? "border-border text-muted-foreground",
              active && "bg-gold/10 ring-1 ring-gold",
              past && "opacity-40",
            )}
          >
            <span className="tabular-nums text-[11px] font-bold leading-tight">{fmt(c.time)}</span>
            <span className="truncate text-xs font-medium leading-tight text-foreground">{c.title}</span>
          </div>
        );
      })}
    </div>
  );
}
