import { Card, SectionTitle } from "@/components/ui/primitives";
import { useEventData } from "@/hooks/useEventData";
import type { SeedStaff } from "@/data/whiteParty";
import { Phone } from "lucide-react";

function byCall(a: SeedStaff, b: SeedStaff) {
  return new Date(a.callTime).getTime() - new Date(b.callTime).getTime();
}

/** Informational roster by zone + call times. No live clock-in source yet
 *  (Sling not wired), so no check-in status is shown. */
export function StaffingPage() {
  const { staff } = useEventData();
  const zones = [...new Set(staff.map((s) => s.zone))];
  const fmt = (iso: string) =>
    new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/New_York" });

  return (
    <div className="space-y-4">
      <div className="px-1">
        <div className="text-2xl font-bold tabular-nums">
          {staff.length}
          <span className="text-base font-medium text-muted-foreground"> on the schedule</span>
        </div>
        <div className="text-xs text-muted-foreground">Roster + call times from the briefing · live Sling/Toast clock-in pending</div>
      </div>

      {zones.map((zone) => {
        const members = staff.filter((s) => s.zone === zone).sort(byCall);
        return (
          <div key={zone}>
            <SectionTitle right={<span className="text-xs text-muted-foreground">{members.length}</span>}>{zone}</SectionTitle>
            <Card className="divide-y divide-border/60">
              {members.map((s) => (
                <div key={s.id} className="flex items-center justify-between px-3 py-2.5">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{s.name}</div>
                    <div className="truncate text-xs text-muted-foreground">{s.position}</div>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <div className="text-right">
                      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">call</div>
                      <div className="tabular-nums text-sm font-semibold">{s.callTime ? fmt(s.callTime) : "—"}</div>
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
