import { Card, Pill } from "@/components/ui/primitives";
import { Maximize2, Ruler, Lock } from "lucide-react";

const categories = [
  { label: "Seating", tone: "gold" as const },
  { label: "Bars", tone: "gold" as const },
  { label: "Stage / AV", tone: "muted" as const },
  { label: "Structure", tone: "muted" as const },
  { label: "Decor", tone: "muted" as const },
  { label: "Pool", tone: "pool" as const },
  { label: "BOH", tone: "muted" as const },
  { label: "VIP", tone: "vip" as const },
];

export function MapPage() {
  return (
    <div className="space-y-3">
      <div className="relative overflow-hidden rounded-xl border border-border bg-black">
        <img
          src="/floorplan.jpg"
          alt="Lake Isle poolside floor plan"
          className="h-[58vh] w-full object-contain"
        />
        <div className="absolute left-2 top-2 flex gap-1.5">
          <Pill tone="gold">
            <Lock className="h-3 w-3" /> base locked
          </Pill>
          <Pill tone="pool">
            <Ruler className="h-3 w-3" /> to-scale
          </Pill>
        </div>
        <button className="absolute bottom-2 right-2 flex items-center gap-1 rounded-lg bg-background/80 px-2.5 py-1.5 text-xs font-medium backdrop-blur">
          <Maximize2 className="h-3.5 w-3.5" /> Full editor
        </button>
      </div>

      <Card className="p-3">
        <div className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Object library
        </div>
        <div className="flex flex-wrap gap-1.5">
          {categories.map((c) => (
            <Pill key={c.label} tone={c.tone}>
              {c.label}
            </Pill>
          ))}
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          Interactive drag-and-drop floor plan with a true-to-scale object library, live ft/in readout,
          role-aware views, and tap-through detail sheets — wiring the react-konva canvas next.
        </p>
      </Card>
    </div>
  );
}
