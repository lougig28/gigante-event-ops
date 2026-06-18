import { useState } from "react";
import { useEventData } from "@/hooks/useEventData";
import { FloorMap, type FloorMapObject, type FloorMapZone } from "@/components/map/FloorMap";
import { Card, Pill } from "@/components/ui/primitives";
import { Lock, Ruler, Maximize2 } from "lucide-react";

export function MapPage() {
  const { floorPlan, objects, zones, canEdit, isLive, mutate } = useEventData();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (!isLive || !floorPlan) {
    return (
      <div className="space-y-3">
        <div className="relative overflow-hidden rounded-xl border border-border bg-black">
          <img src="/floorplan.jpg" alt="Lake Isle poolside floor plan" className="h-[56vh] w-full object-contain" />
          <div className="absolute left-2 top-2 flex gap-1.5">
            <Pill tone="gold">
              <Lock className="h-3 w-3" /> base locked
            </Pill>
            <Pill tone="pool">
              <Ruler className="h-3 w-3" /> to-scale
            </Pill>
          </div>
        </div>
        <Card className="p-4 text-sm text-muted-foreground">
          Open with a share link to load the live, to-scale floor plan — drag-and-drop object library, ft/in readout,
          role-aware views, and tap-through detail sheets.
        </Card>
      </div>
    );
  }

  const ftPerUnit = floorPlan.ft_per_unit || 0.028;
  const footW = Math.round((floorPlan.base_width || 0) * ftPerUnit);
  const footH = Math.round((floorPlan.base_height || 0) * ftPerUnit);

  return (
    <div className="relative -mx-3 -mt-3 h-[calc(100svh-118px)] overflow-hidden">
      <div className="pointer-events-none absolute left-3 top-3 z-10 flex flex-wrap gap-1.5">
        <Pill tone="gold">
          <Lock className="h-3 w-3" /> base locked
        </Pill>
        <Pill tone="pool">
          <Maximize2 className="h-3 w-3" /> {footW} × {footH} ft
        </Pill>
      </div>

      <FloorMap
        floorPlan={floorPlan}
        objects={objects as FloorMapObject[]}
        zones={zones as FloorMapZone[]}
        canEdit={canEdit}
        selectedId={selectedId}
        onSelect={setSelectedId}
        onMove={(id, x, y) => void mutate("obj.upsert", { id, x, y })}
        onUpdate={(id, patch) => void mutate("obj.upsert", { id, ...patch })}
        onDelete={(id) => {
          void mutate("obj.delete", { id });
          setSelectedId(null);
        }}
        onOpenDetails={(o) => setSelectedId(o.id)}
      />
    </div>
  );
}
