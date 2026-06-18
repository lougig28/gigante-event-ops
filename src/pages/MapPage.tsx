import { lazy, Suspense, useEffect, useState } from "react";
import { useEventData } from "@/hooks/useEventData";
import { useEventStore } from "@/state/eventStore";
import { FloorMap, type FloorMapObject, type FloorMapZone } from "@/components/map/FloorMap";
import { ObjectSheet } from "@/components/map/ObjectSheet";
import { LayerSheet } from "@/components/map/LayerSheet";
import { ZoneRosterSheet } from "@/components/map/ZoneRosterSheet";
import { LAYERS, layerOf, defaultLayers } from "@/lib/layers";
import { Card, Pill } from "@/components/ui/primitives";
import { Lock, Ruler, Maximize2, Layers as LayersIcon, Box, SquarePen, Check, Loader2, CircleAlert } from "lucide-react";

const MapShow3D = lazy(() => import("@/components/map/MapShow3D").then((m) => ({ default: m.MapShow3D })));

/** Live save status for the editor — every drag/resize/add/delete persists immediately. */
function SaveStatus() {
  const saving = useEventStore((s) => s.saving);
  const lastSaved = useEventStore((s) => s.lastSaved);
  const saveError = useEventStore((s) => s.saveError);
  if (saving)
    return (
      <span className="flex items-center gap-1.5 rounded-full border border-border bg-background/85 px-2.5 py-1 text-xs font-medium text-muted-foreground shadow-sm backdrop-blur">
        <Loader2 className="h-3.5 w-3.5 animate-spin text-gold" /> Saving…
      </span>
    );
  if (saveError)
    return (
      <span className="flex items-center gap-1.5 rounded-full border border-crit/40 bg-crit/10 px-2.5 py-1 text-xs font-medium text-crit shadow-sm backdrop-blur">
        <CircleAlert className="h-3.5 w-3.5" /> Save failed
      </span>
    );
  if (lastSaved)
    return (
      <span className="flex items-center gap-1.5 rounded-full border border-ok/40 bg-ok/10 px-2.5 py-1 text-xs font-medium text-ok shadow-sm backdrop-blur">
        <Check className="h-3.5 w-3.5" /> Saved
      </span>
    );
  return null;
}

export function MapPage() {
  const { floorPlan, objects, zones, staff, canEdit, isLive, mutate, role } = useEventData();
  const [mode, setMode] = useState<"edit" | "show">("edit");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
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
          (acc: Record<string, { id: string; x: number; y: number; total: number }>, s) => {
            const z = zoneByName[s.zone];
            if (!z || !z.points?.length) return acc;
            if (!acc[z.id]) {
              const cx = z.points.reduce((a, p) => a + p.x, 0) / z.points.length;
              const cy = z.points.reduce((a, p) => a + p.y, 0) / z.points.length;
              acc[z.id] = { id: z.id, x: cx, y: cy, total: 0 };
            }
            acc[z.id].total++;
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

      {/* Edit (2D, to-scale) ⇄ 3D Show toggle */}
      <div className="absolute left-1/2 top-3 z-20 flex -translate-x-1/2 overflow-hidden rounded-lg border border-border bg-background/85 text-xs font-semibold backdrop-blur">
        <button
          onClick={() => setMode("edit")}
          className={`flex items-center gap-1.5 px-3 py-1.5 ${mode === "edit" ? "bg-gold text-white" : "text-muted-foreground"}`}
        >
          <SquarePen className="h-3.5 w-3.5" /> {canEdit ? "Edit" : "Plan"}
        </button>
        <button
          onClick={() => setMode("show")}
          className={`flex items-center gap-1.5 px-3 py-1.5 ${mode === "show" ? "bg-gold text-white" : "text-muted-foreground"}`}
        >
          <Box className="h-3.5 w-3.5" /> 3D
        </button>
      </div>

      {canEdit && mode === "edit" && (
        <div className="absolute left-1/2 top-14 z-20 -translate-x-1/2">
          <SaveStatus />
        </div>
      )}

      {mode === "edit" ? (
        <FloorMap
          floorPlan={floorPlan}
          objects={shownObjects}
          zones={zones as FloorMapZone[]}
          canEdit={canEdit}
          selectedId={selectedId}
          onSelect={(id) => {
            setSelectedId(id);
            if (id) setSelectedZoneId(null);
          }}
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
          selectedZoneId={selectedZoneId}
          onSelectZone={(id) => {
            setSelectedZoneId(id);
            if (id) setSelectedId(null);
          }}
          onZoneChange={(id, points) => void mutate("zone.upsert", { id, points })}
          onZoneUpdate={(id, patch) => void mutate("zone.upsert", { id, ...patch })}
          onZoneDelete={(id) => {
            void mutate("zone.delete", { id });
            setSelectedZoneId(null);
          }}
          onAddZone={async () => {
            const u = floorPlan.ft_per_unit || 0.028;
            const cx = (floorPlan.base_width || 1000) / 2;
            const cy = (floorPlan.base_height || 1000) / 2;
            const half = 10 / u; // 20 ft square
            const res = await mutate("zone.upsert", {
              name: "New Area",
              color: "vip",
              points: [
                { x: cx - half, y: cy - half },
                { x: cx + half, y: cy - half },
                { x: cx + half, y: cy + half },
                { x: cx - half, y: cy + half },
              ],
            });
            if (res?.id) {
              setSelectedId(null);
              setSelectedZoneId(res.id);
            }
          }}
        />
      ) : (
        <Suspense
          fallback={
            <div className="absolute inset-0 grid place-items-center bg-[#f1ede4] text-sm text-muted-foreground">
              Rendering 3D…
            </div>
          }
        >
          <MapShow3D
            floorPlan={floorPlan}
            objects={shownObjects}
            zones={zones as FloorMapZone[]}
            staffPins={staffPins}
            onObjectTap={(id) => setDetailId(id)}
            onZoneTap={(zid) => setRosterZoneId(zid)}
          />
        </Suspense>
      )}

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
