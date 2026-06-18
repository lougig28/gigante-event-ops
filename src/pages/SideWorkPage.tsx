import { Card, Pill } from "@/components/ui/primitives";
import { useEventData } from "@/hooks/useEventData";
import type { SeedChecklist } from "@/data/whiteParty";
import { Plus, Pencil, Trash2, MapPin } from "lucide-react";

const kindTone: Record<SeedChecklist["kind"], "pool" | "gold" | "crit" | "muted"> = {
  opening: "pool",
  running: "gold",
  closing: "crit",
  admin: "muted",
};

/** Side work = reminders/standards by section. Read-only for staff; management
 *  (passcode-unlocked) can add/rename/delete items + sections and tag a section
 *  to a map area. */
export function SideWorkPage() {
  const { checklists, zones, canEdit, mutate } = useEventData();

  const addItem = (checklistId: string) => {
    const title = window.prompt("New side-work item:");
    if (title && title.trim()) void mutate("task.upsert", { checklist_id: checklistId, title: title.trim() });
  };
  const editItem = (id: string, current: string) => {
    const title = window.prompt("Rename item:", current);
    if (title != null && title.trim()) void mutate("task.upsert", { id, title: title.trim() });
  };
  const delItem = (id: string) => {
    if (window.confirm("Delete this item?")) void mutate("task.delete", { id });
  };
  const addSection = () => {
    const name = window.prompt("New section name (e.g. “DJ Booth — Setup”):");
    if (name && name.trim()) void mutate("checklist.upsert", { name: name.trim(), kind: "running" });
  };
  const renameSection = (id: string, current: string) => {
    const name = window.prompt("Rename section:", current);
    if (name != null && name.trim()) void mutate("checklist.upsert", { id, name: name.trim() });
  };
  const delSection = (id: string) => {
    if (window.confirm("Delete this whole section and all its items?")) void mutate("checklist.delete", { id });
  };

  const iconBtn = "flex h-7 w-7 items-center justify-center rounded-md border border-border text-muted-foreground";

  return (
    <div className="space-y-4">
      <p className="px-1 text-sm text-muted-foreground">
        {canEdit
          ? "Add or rename items and sections; tag a section to a map area. Changes save instantly."
          : "Reminders & standards by section. Tap any object or zone on the Map for station detail."}
      </p>

      {checklists.map((cl) => (
        <div key={cl.id}>
          <div className="flex items-center justify-between gap-2 px-1 pb-2">
            <div className="flex min-w-0 items-center gap-2">
              <h2 className="truncate text-sm font-semibold">{cl.name}</h2>
              <Pill tone={kindTone[cl.kind] ?? "muted"}>{cl.kind}</Pill>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {canEdit && (
                <>
                  <button onClick={() => renameSection(cl.id, cl.name)} className={iconBtn} aria-label="Rename section">
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => delSection(cl.id)} className={`${iconBtn} text-crit`} aria-label="Delete section">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </>
              )}
              <span className="tabular-nums text-xs text-muted-foreground">{cl.items.length}</span>
            </div>
          </div>

          {canEdit && zones.length > 0 && (
            <div className="mb-2 flex items-center gap-2 px-1">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <select
                value={cl.zoneId ?? ""}
                onChange={(e) => void mutate("checklist.upsert", { id: cl.id, zone_id: e.target.value })}
                className="min-w-0 flex-1 rounded-md border border-border bg-card px-2 py-1 text-xs outline-none focus:border-gold"
              >
                <option value="">— not linked to a map area —</option>
                {zones.map((z: any) => (
                  <option key={z.id} value={z.id}>
                    {z.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <Card className="divide-y divide-border/60">
            {cl.items.map((item) => (
              <div key={item.id} className="flex items-start gap-3 px-3 py-2.5">
                <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{item.title}</span>
                  {item.detail && <span className="block text-xs text-muted-foreground">{item.detail}</span>}
                </span>
                {canEdit && (
                  <span className="flex shrink-0 items-center gap-1">
                    <button onClick={() => editItem(item.id, item.title)} className={iconBtn} aria-label="Rename item">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => delItem(item.id)} className={`${iconBtn} text-crit`} aria-label="Delete item">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </span>
                )}
              </div>
            ))}
            {canEdit && (
              <button onClick={() => addItem(cl.id)} className="flex w-full items-center gap-2 px-3 py-2.5 text-sm font-medium text-gold active:opacity-70">
                <Plus className="h-4 w-4" /> Add item
              </button>
            )}
          </Card>
        </div>
      ))}

      {canEdit && (
        <button
          onClick={addSection}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border py-3 text-sm font-semibold text-gold active:opacity-70"
        >
          <Plus className="h-4 w-4" /> Add section
        </button>
      )}
    </div>
  );
}
