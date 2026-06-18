import { useState } from "react";
import { Card, Pill, SectionTitle, SeedBadge } from "@/components/ui/primitives";
import { useEventData } from "@/hooks/useEventData";
import type { SeedStaff, CheckState } from "@/data/whiteParty";
import { Phone } from "lucide-react";

const checkTone: Record<CheckState, "ok" | "warn" | "muted" | "pool"> = {
  checked_in: "ok",
  scheduled: "warn",
  on_break: "pool",
  clocked_out: "muted",
};
const checkLabel: Record<CheckState, string> = {
  checked_in: "checked in",
  scheduled: "scheduled",
  on_break: "on break",
  clocked_out: "clocked out",
};

function byCall(a: SeedStaff, b: SeedStaff) {
  return new Date(a.callTime).getTime() - new Date(b.callTime).getTime();
}

export function StaffingPage() {
  const { staff, isLive, canEdit, mutate } = useEventData();
  const [optimistic, setOptimistic] = useState<Record<string, CheckState>>({});

  const stateOf = (s: SeedStaff): CheckState => optimistic[s.id] ?? s.check;
  const zones = [...new Set(staff.map((s) => s.zone))];
  const fmt = (iso: string) =>
    new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/New_York" });

  const toggle = (s: SeedStaff) => {
    if (!isLive || !canEdit) return;
    const nextState: CheckState = stateOf(s) === "checked_in" ? "scheduled" : "checked_in";
    setOptimistic((o) => ({ ...o, [s.id]: nextState }));
    void mutate("staff.check", { id: s.id, state: nextState });
  };

  const checkedIn = staff.filter((s) => stateOf(s) === "checked_in").length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <div>
          <div className="text-2xl font-bold tabular-nums">
            {checkedIn}
            <span className="text-base font-medium text-muted-foreground"> / {staff.length} in</span>
          </div>
          <div className="text-xs text-muted-foreground">
            {isLive ? "Tap a status to check in · Sling sync pending" : "Roster from briefing · Sling sync pending"}
          </div>
        </div>
        {!isLive && <SeedBadge />}
      </div>

      {zones.map((zone) => {
        const members = staff.filter((s) => s.zone === zone).sort(byCall);
        return (
          <div key={zone}>
            <SectionTitle right={<span className="text-xs text-muted-foreground">{members.length}</span>}>
              {zone}
            </SectionTitle>
            <Card className="divide-y divide-border/60">
              {members.map((s) => {
                const st = stateOf(s);
                return (
                  <div key={s.id} className="flex items-center justify-between px-3 py-2.5">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{s.name}</div>
                      <div className="truncate text-xs text-muted-foreground">{s.position}</div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <div className="text-right">
                        <div className="tabular-nums text-xs font-medium">{s.callTime ? fmt(s.callTime) : "—"}</div>
                        <button onClick={() => toggle(s)} disabled={!isLive || !canEdit}>
                          <Pill tone={checkTone[st]}>{checkLabel[st]}</Pill>
                        </button>
                      </div>
                      <a
                        href={s.callTime ? "tel:" : undefined}
                        className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-muted-foreground"
                        aria-label="Call"
                      >
                        <Phone className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  </div>
                );
              })}
            </Card>
          </div>
        );
      })}
    </div>
  );
}
