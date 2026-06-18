import { useState } from "react";
import { Sheet, Pill } from "@/components/ui/primitives";
import { OBJECT_CATALOG } from "@/lib/object-catalog";
import { CATEGORY_ORDER, CATEGORY_LABELS } from "@/lib/catalogIndex";
import type { ObjectCategory } from "@/lib/types";

export function ObjectPalette({
  open,
  onClose,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (kind: string) => void;
}) {
  const [cat, setCat] = useState<ObjectCategory>("bar");
  const items = OBJECT_CATALOG.filter((o) => o.category === cat);

  return (
    <Sheet open={open} onClose={onClose} title="Add object" subtitle="To-scale event library">
      <div className="space-y-3">
        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
          {CATEGORY_ORDER.map((c) => (
            <button key={c} onClick={() => setCat(c)} className="shrink-0">
              <Pill tone={cat === c ? "gold" : "muted"}>{CATEGORY_LABELS[c]}</Pill>
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          {items.map((o) => (
            <button
              key={o.kind}
              onClick={() => {
                onPick(o.kind);
                onClose();
              }}
              className="rounded-lg border border-border bg-card p-3 text-left transition-colors active:bg-accent"
            >
              <div className="truncate text-sm font-medium">{o.label}</div>
              <div className="text-xs text-muted-foreground">
                {o.defaultWidthFt}×{o.defaultHeightFt} ft{o.seats ? ` · ${o.seats} seats` : ""}
              </div>
            </button>
          ))}
        </div>
      </div>
    </Sheet>
  );
}
