import { Card, SectionTitle } from "@/components/ui/primitives";
import { useEventData } from "@/hooks/useEventData";
import { Phone } from "lucide-react";

const fmt = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/New_York" }) : "—";

// First name + last initial ("Alexandra Kuzian" → "Alexandra K."). Single names and
// placeholders (Additional Busser 1, TBD …) are left as-is.
const shortName = (name: string) => {
  const parts = name.trim().split(/\s+/);
  if (parts.length < 2) return name;
  const last = parts[parts.length - 1];
  if (/^\d+$/.test(last) || /^(additional|tbd)/i.test(parts[0])) return name;
  return `${parts[0]} ${last[0].toUpperCase()}.`;
};

/** Roster grouped by role (Sling 6/18). One headcount per person; dual-role staff
 *  appear under each of their roles. No live clock-in source yet. */
export function StaffingPage() {
  const { staff } = useEventData();
  const roles = [...new Set(staff.map((s) => s.position || "Unassigned"))];
  const headcount = new Set(staff.map((s) => s.name)).size;
  const onClock = staff.filter((s) => s.check === "checked_in").length;

  return (
    <div className="space-y-4">
      <div className="px-1">
        <div className="text-2xl font-bold tabular-nums">
          {headcount}
          <span className="text-base font-medium text-muted-foreground"> on the schedule</span>
        </div>
        <div className="text-xs text-muted-foreground">
          <span className="font-semibold text-ok">{onClock} clocked in</span> now · live from Toast · {staff.length} assignments · Sling 6/18
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
                    <div className="truncate text-sm font-medium">{shortName(s.name)}</div>
                    {s.notes && <div className="truncate text-xs text-muted-foreground">{s.notes}</div>}
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    {s.check === "checked_in" && (
                      <span className="flex items-center gap-1 rounded-full bg-ok/15 px-2 py-0.5 text-[11px] font-semibold text-ok">
                        <span className="h-1.5 w-1.5 rounded-full bg-ok" /> {s.checkInAt ? `in ${fmt(s.checkInAt)}` : "on"}
                      </span>
                    )}
                    {s.callTime && (
                      <div className="text-right">
                        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">call</div>
                        <div className="tabular-nums text-sm font-semibold">{fmt(s.callTime)}</div>
                      </div>
                    )}
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
