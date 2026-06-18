import { Sheet } from "@/components/ui/primitives";
import { LAYERS } from "@/lib/layers";
import { Eye, EyeOff } from "lucide-react";

export function LayerSheet({
  open,
  onClose,
  visible,
  onToggle,
  counts,
}: {
  open: boolean;
  onClose: () => void;
  visible: Set<string>;
  onToggle: (id: string) => void;
  counts: Record<string, number>;
}) {
  return (
    <Sheet open={open} onClose={onClose} title="Layers" subtitle="Show or hide objects by type">
      <div className="space-y-1.5">
        {LAYERS.map((l) => {
          const on = visible.has(l.id);
          return (
            <button
              key={l.id}
              onClick={() => onToggle(l.id)}
              className="flex w-full items-center justify-between rounded-lg border border-border px-3 py-2.5 active:bg-accent"
            >
              <span className="flex items-center gap-2 text-sm font-medium">
                {l.label}
                <span className="tabular-nums text-xs text-muted-foreground">{counts[l.id] ?? 0}</span>
              </span>
              {on ? <Eye className="h-4 w-4 text-gold" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
            </button>
          );
        })}
      </div>
    </Sheet>
  );
}
