import { Card, SectionTitle } from "@/components/ui/primitives";
import { useEventData } from "@/hooks/useEventData";
import { Phone } from "lucide-react";

const fmt = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/New_York" }) : "—";

/** Roster grouped by role (Sling 6/18). One headcount per person; dual-role staff
 *  appear under each of their roles. No live clock-in source yet. */
export function StaffingPage() {
  const { staff } = useEventData();
  const roles = [...new Set(staff.map((s) => s.position || "Unassigned"))];
  const headcount = new Set(staff.map((s) => s.name)).size;

  return (
    <div className="space-y-4">
      <div className="px-1">
        <div className="text-2xl font-bold tabular-nums">
          {headcount}
          <span className="text-base font-medium text-muted-foreground"> on the schedule</span>
        </div>
        <div className="text-xs text-muted-foreground">
          {staff.length} assignments · Sling roster, Thu 6/18 · live clock-in pending
        </div>
      </div>

      {roles.map((role) => {
        const members = staff.filter((s) => (s.position || "Unassigned") === role);
        return (
          <div key={role}>
            <SectionTitle right={<span className="text-xs text-muted-foreground">{members.length}</span>}>{role}</SectionTitle>
            <Card className="divide-y divide-border/60">
              {members.map((s) => (
                <div key={s.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{s.name}</div>
                    {s.notes && <div className="truncate text-xs text-muted-foreground">{s.notes}</div>}
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <div className="text-right">
                      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">call</div>
                      <div className="tabular-nums text-sm font-semibold">{fmt(s.callTime)}</div>
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
