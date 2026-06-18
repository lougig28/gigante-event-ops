import { Card, Pill } from "@/components/ui/primitives";
import { useEventData } from "@/hooks/useEventData";
import type { SeedChecklist } from "@/data/whiteParty";

const kindTone: Record<SeedChecklist["kind"], "pool" | "gold" | "crit"> = {
  opening: "pool",
  running: "gold",
  closing: "crit",
};

/** Read-only reminders & standards by phase. The interactive layer is the Map —
 *  staff tap objects/zones for station-specific detail. No check-off (no logins). */
export function SideWorkPage() {
  const { checklists } = useEventData();
  return (
    <div className="space-y-4">
      <p className="px-1 text-sm text-muted-foreground">
        Reminders &amp; standards by phase. Tap any object or zone on the{" "}
        <span className="font-medium text-foreground">Map</span> for station-specific detail.
      </p>
      {checklists.map((cl) => (
        <div key={cl.id}>
          <div className="flex items-center justify-between px-1 pb-2">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold">{cl.name}</h2>
              <Pill tone={kindTone[cl.kind]}>{cl.kind}</Pill>
            </div>
            <span className="tabular-nums text-xs text-muted-foreground">{cl.items.length}</span>
          </div>
          <Card className="divide-y divide-border/60">
            {cl.items.map((item) => (
              <div key={item.id} className="flex items-start gap-3 px-3 py-2.5">
                <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
                <span className="min-w-0">
                  <span className="block text-sm font-medium">{item.title}</span>
                  {item.detail && <span className="block text-xs text-muted-foreground">{item.detail}</span>}
                </span>
              </div>
            ))}
          </Card>
        </div>
      ))}
    </div>
  );
}
