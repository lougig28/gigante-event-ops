import { useState } from "react";
import { Card, Pill, ProgressBar } from "@/components/ui/primitives";
import { wpChecklists, type SeedChecklist } from "@/data/whiteParty";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const kindTone: Record<SeedChecklist["kind"], "pool" | "gold" | "crit"> = {
  opening: "pool",
  running: "gold",
  closing: "crit",
};

export function SideWorkPage() {
  // Local optimistic toggle for the preview; persists to Supabase + Realtime once live.
  const [done, setDone] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(wpChecklists.flatMap((c) => c.items.map((i) => [i.id, i.done]))),
  );

  return (
    <div className="space-y-4">
      {wpChecklists.map((cl) => {
        const total = cl.items.length;
        const complete = cl.items.filter((i) => done[i.id]).length;
        return (
          <div key={cl.id}>
            <div className="flex items-center justify-between px-1 pb-2">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold">{cl.name}</h2>
                <Pill tone={kindTone[cl.kind]}>{cl.kind}</Pill>
              </div>
              <span className="tabular-nums text-xs text-muted-foreground">
                {complete}/{total}
              </span>
            </div>
            <div className="mb-2 px-1">
              <ProgressBar value={(complete / total) * 100} tone={cl.kind === "opening" ? "pool" : "gold"} />
            </div>
            <Card className="divide-y divide-border/60">
              {cl.items.map((item) => {
                const isDone = done[item.id];
                return (
                  <button
                    key={item.id}
                    onClick={() => setDone((d) => ({ ...d, [item.id]: !d[item.id] }))}
                    className="flex w-full items-start gap-3 px-3 py-2.5 text-left"
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border",
                        isDone ? "border-ok bg-ok text-background" : "border-border",
                      )}
                    >
                      {isDone && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                    </span>
                    <span className="min-w-0">
                      <span className={cn("block text-sm font-medium", isDone && "text-muted-foreground line-through")}>
                        {item.title}
                      </span>
                      {item.detail && <span className="block text-xs text-muted-foreground">{item.detail}</span>}
                    </span>
                  </button>
                );
              })}
            </Card>
          </div>
        );
      })}
    </div>
  );
}
