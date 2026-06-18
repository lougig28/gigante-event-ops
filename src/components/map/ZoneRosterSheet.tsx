import { Sheet } from "@/components/ui/primitives";
import type { SeedStaff } from "@/data/whiteParty";
import { Phone } from "lucide-react";

const fmt = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/New_York" });

export function ZoneRosterSheet({
  open,
  onClose,
  zoneName,
  staff,
}: {
  open: boolean;
  onClose: () => void;
  zoneName: string | null;
  staff: SeedStaff[];
}) {
  return (
    <Sheet open={open} onClose={onClose} title={zoneName ?? "Zone"} subtitle={`${staff.length} on roster`}>
      {staff.length === 0 ? (
        <p className="text-sm text-muted-foreground">No staff assigned to this area.</p>
      ) : (
        <div className="divide-y divide-border/60 overflow-hidden rounded-lg border border-border">
          {staff.map((s) => (
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
        </div>
      )}
    </Sheet>
  );
}
