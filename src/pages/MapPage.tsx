import { useEffect, useState } from "react";
import { useEventData } from "@/hooks/useEventData";
import { FloorMap, type FloorMapObject, type FloorMapZone } from "@/components/map/FloorMap";
import { ObjectSheet } from "@/components/map/ObjectSheet";
import { LayerSheet } from "@/components/map/LayerSheet";
import { ZoneRosterSheet } from "@/components/map/ZoneRosterSheet";
import { LAYERS, layerOf, defaultLayers } from "@/lib/layers";
import { Card, Pill } from "@/components/ui/primitives";
import { Lock, Ruler, Maximize2, Layers as LayersIcon } from "lucide-react";

export function MapPage() {
  const { floorPlan, objects, zones, staff, canEdit, isLive, mutate, role } = useEventData();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [layerOpen, setLayerOpen] = useState(false);
  const [rosterZoneId, setRosterZoneId] = useState<string | null>(null);
  const [visible, setVisible] = useState<Set<string>>(() => defaultLayers(role));
  useEffect(() => {
    setVisible(defaultLayers(role));
  }, [role]);

  if (!isLive || !floorPlan) {
    return (
      <div className="space-y-3">
        <div className="relative overflow-hidden rounded-xl border border-border bg-black">
          <img src="/floorplan.png" alt="Lake Isle poolside floor plan" className="h-[56vh] w-full bg-[#f5f4ef] object-contain" />
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

  const objs = objects as FloorMapObject[];
  const layerCounts: Record<string, number> = {};
  for (const l of LAYERS) layerCounts[l.id] = 0;
  objs.forEach((o) => {
    const id = layerOf(o);
    layerCounts[id] = (layerCounts[id] ?? 0) + 1;
  });
  const shownObjects = objs.filter((o) => visible.has(layerOf(o)));

  layerCounts.staff = staff.length;
  const zoneByName: Record<string, FloorMapZone> = {};
  (zones as FloorMapZone[]).forEach((z) => {
    zoneByName[z.name] = z;
  });
  const staffPins = visible.has("staff")
    ? Object.values(
        staff.reduce(
          (acc: Record<string, { id: string; x: number; y: number; total: number; checkedIn: number }>, s) => {
            const z = zoneByName[s.zone];
            if (!z || !z.points?.length) return acc;
            if (!acc[z.id]) {
              const cx = z.points.reduce((a, p) => a + p.x, 0) / z.points.length;
              const cy = z.points.reduce((a, p) => a + p.y, 0) / z.points.length;
              acc[z.id] = { id: z.id, x: cx, y: cy, total: 0, checkedIn: 0 };
            }
            acc[z.id].total++;
            if (s.check === "checked_in") acc[z.id].checkedIn++;
            return acc;
          },
          {},
        ),
      )
    : [];

  const rosterZoneName = rosterZoneId
    ? (zones as FloorMapZone[]).find((z) => z.id === rosterZoneId)?.name ?? null
    : null;
  const rosterStaff = rosterZoneName ? staff.filter((s) => s.zone === rosterZoneName) : [];
  const detailObj = objs.find((o) => o.id === detailId) ?? null;
  const detailZone = detailObj ? zones.find((z) => z.id === detailObj.zone_id)?.name ?? null : null;
  const staffInZone = detailZone ? staff.filter((s) => s.zone === detailZone) : [];

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

      <button
        onClick={() => setLayerOpen(true)}
        className="absolute left-3 top-12 z-10 flex items-center gap-1.5 rounded-lg border border-border bg-background/85 px-2.5 py-1.5 text-xs font-medium backdrop-blur"
      >
        <LayersIcon className="h-3.5 w-3.5 text-gold" /> Layers
      </button>

      <FloorMap
        floorPlan={floorPlan}
        objects={shownObjects}
        zones={zones as FloorMapZone[]}
        canEdit={canEdit}
        selectedId={selectedId}
        onSelect={setSelectedId}
        onMove={(id, x, y) => void mutate("obj.upsert", { id, x, y })}
        onUpdate={(id, patch) => void mutate("obj.upsert", { id, ...patch })}
        onDelete={(id) => {
          void mutate("obj.delete", { id });
          setSelectedId(null);
          if (detailId === id) setDetailId(null);
        }}
        onOpenDetails={(o) => setDetailId(o.id)}
        onCreate={(p) => void mutate("obj.upsert", p)}
        staffPins={staffPins}
        onStaffPinTap={(zid) => setRosterZoneId(zid)}
      />

      <ObjectSheet
        obj={detailObj}
        zoneName={detailZone}
        staffInZone={staffInZone}
        canEdit={canEdit}
        onClose={() => setDetailId(null)}
        onStatus={(status) => detailObj && void mutate("obj.upsert", { id: detailObj.id, status })}
      />

      <LayerSheet
        open={layerOpen}
        onClose={() => setLayerOpen(false)}
        visible={visible}
        counts={layerCounts}
        onToggle={(id) =>
          setVisible((v) => {
            const n = new Set(v);
            if (n.has(id)) n.delete(id);
            else n.add(id);
            return n;
          })
        }
      />

      <ZoneRosterSheet
        open={!!rosterZoneId}
        onClose={() => setRosterZoneId(null)}
        zoneName={rosterZoneName}
        staff={rosterStaff}
      />
    </div>
  );
}
