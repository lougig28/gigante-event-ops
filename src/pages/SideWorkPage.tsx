import { useState } from "react";
import { Card, Pill, ProgressBar } from "@/components/ui/primitives";
import { useEventData } from "@/hooks/useEventData";
import type { SeedChecklist } from "@/data/whiteParty";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const kindTone: Record<SeedChecklist["kind"], "pool" | "gold" | "crit"> = {
  opening: "pool",
  running: "gold",
  closing: "crit",
};

export function SideWorkPage() {
  const { checklists, isLive, mutate } = useEventData();
  const [optimistic, setOptimistic] = useState<Record<string, boolean>>({});

  const doneOf = (id: string, fallback: boolean) => optimistic[id] ?? fallback;

  const toggle = (id: string, current: boolean) => {
    const nextDone = !current;
    setOptimistic((o) => ({ ...o, [id]: nextDone }));
    if (isLive) void mutate("task.status", { id, status: nextDone ? "done" : "todo" });
  };

  return (
    <div className="space-y-4">
      {checklists.map((cl) => {
        const total = cl.items.length;
        const complete = cl.items.filter((i) => doneOf(i.id, i.done)).length;
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
              <ProgressBar value={total ? (complete / total) * 100 : 0} tone={cl.kind === "opening" ? "pool" : "gold"} />
            </div>
            <Card className="divide-y divide-border/60">
              {cl.items.map((item) => {
                const isDone = doneOf(item.id, item.done);
                return (
                  <button
                    key={item.id}
                    onClick={() => toggle(item.id, isDone)}
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
