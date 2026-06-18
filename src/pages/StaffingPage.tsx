import { Card, Pill, SectionTitle, SeedBadge } from "@/components/ui/primitives";
import { wpStaff, type SeedStaff, type CheckState } from "@/data/whiteParty";
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
  const zones = [...new Set(wpStaff.map((s) => s.zone))];
  const fmt = (iso: string) =>
    new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/New_York" });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <div>
          <div className="text-2xl font-bold tabular-nums">
            {wpStaff.filter((s) => s.check === "checked_in").length}
            <span className="text-base font-medium text-muted-foreground"> / {wpStaff.length} in</span>
          </div>
          <div className="text-xs text-muted-foreground">Roster from briefing · Sling sync pending</div>
        </div>
        <SeedBadge />
      </div>

      {zones.map((zone) => {
        const members = wpStaff.filter((s) => s.zone === zone).sort(byCall);
        return (
          <div key={zone}>
            <SectionTitle right={<span className="text-xs text-muted-foreground">{members.length}</span>}>
              {zone}
            </SectionTitle>
            <Card className="divide-y divide-border/60">
              {members.map((s) => (
                <div key={s.id} className="flex items-center justify-between px-3 py-2.5">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{s.name}</div>
                    <div className="truncate text-xs text-muted-foreground">{s.position}</div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <div className="text-right">
                      <div className="tabular-nums text-xs font-medium">{fmt(s.callTime)}</div>
                      <Pill tone={checkTone[s.check]}>{checkLabel[s.check]}</Pill>
                    </div>
                    <a
                      href="tel:"
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-muted-foreground"
                      aria-label="Call"
                    >
                      <Phone className="h-3.5 w-3.5" />
                    </a>
                  </div>
                </div>
              ))}
            </Card>
          </div>
        );
      })}
    </div>
  );
}
