import { useCallback, useEffect, useState } from "react";
import { Sheet } from "@/components/ui/primitives";
import { list86, add86, toggle86 } from "@/lib/api";
import { Ban, Check, Plus, RotateCcw } from "lucide-react";

/** Self-contained 86 board: a live-count card on the dashboard that opens the
 *  add/resolve sheet. Any role can 86 an item; it's audited + visible to all. */
export function EightySixBoard({ token }: { token: string }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const [item, setItem] = useState("");
  const [station, setStation] = useState("");

  const refresh = useCallback(async () => {
    try {
      setItems(await list86(token));
    } catch {
      /* ignore */
    }
  }, [token]);

  useEffect(() => {
    void refresh();
    const id = setInterval(refresh, open ? 4000 : 12000);
    return () => clearInterval(id);
  }, [refresh, open]);

  const active = items.filter((x) => !x.resolved);
  const done = items.filter((x) => x.resolved);

  const add = async () => {
    if (!item.trim()) return;
    await add86(token, item.trim(), station.trim() || undefined);
    setItem("");
    setStation("");
    await refresh();
  };
  const toggle = async (id: string) => {
    await toggle86(token, id);
    await refresh();
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-between rounded-xl border border-border bg-card p-3 text-left active:bg-accent"
      >
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-crit/15 text-crit">
            <Ban className="h-4 w-4" />
          </span>
          <div>
            <div className="text-sm font-semibold">86 Board</div>
            <div className="text-xs text-muted-foreground">Out of stock / cut off</div>
          </div>
        </div>
        <span className={`tabular-nums text-2xl font-bold ${active.length ? "text-crit" : "text-ok"}`}>{active.length}</span>
      </button>

      <Sheet open={open} onClose={() => setOpen(false)} title="86 Board" subtitle="Live to every station — audited">
        <div className="space-y-4">
          <div className="flex gap-2">
            <input
              value={item}
              onChange={(e) => setItem(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && add()}
              placeholder="Item (e.g. Casamigos Blanco)"
              className="min-w-0 flex-1 rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-gold"
            />
            <input
              value={station}
              onChange={(e) => setStation(e.target.value)}
              placeholder="Station"
              className="w-20 shrink-0 rounded-lg border border-border bg-card px-2 py-2 text-sm outline-none"
            />
            <button onClick={add} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-crit text-white">
              <Plus className="h-5 w-5" />
            </button>
          </div>

          {active.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">Nothing 86'd right now. 🎉</p>
          ) : (
            <div className="space-y-1.5">
              {active.map((x) => (
                <div key={x.id} className="flex items-center justify-between rounded-lg border border-crit/40 bg-crit/10 px-3 py-2">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-crit">{x.item}</div>
                    {x.station && <div className="text-xs text-muted-foreground">{x.station}</div>}
                  </div>
                  <button onClick={() => toggle(x.id)} className="flex h-8 shrink-0 items-center gap-1 rounded-lg border border-border px-2 text-xs">
                    <Check className="h-3.5 w-3.5 text-ok" /> back
                  </button>
                </div>
              ))}
            </div>
          )}

          {done.length > 0 && (
            <div>
              <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Recently back</div>
              <div className="space-y-0.5">
                {done.slice(0, 8).map((x) => (
                  <div key={x.id} className="flex items-center justify-between px-1 py-1 text-sm text-muted-foreground">
                    <span className="truncate line-through">{x.item}</span>
                    <button onClick={() => toggle(x.id)} className="flex shrink-0 items-center gap-1 text-xs text-gold">
                      <RotateCcw className="h-3 w-3" /> 86
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Sheet>
    </>
  );
}
