import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Konva from "konva";
import { Stage, Layer, Image as KonvaImage, Rect, Circle, Line, Text, Group, Transformer } from "react-konva";
import { Plus, Minus, Maximize2, RotateCw, Lock, Unlock, Trash2, Info, Download, Copy } from "lucide-react";
import { useImage } from "@/hooks/useImage";
import { kindOf, tokenHex } from "@/lib/catalogIndex";
import { ObjectPalette } from "./ObjectPalette";
import { ObjectShape } from "./ObjectShape";

export interface FloorMapObject {
  id: string;
  kind: string;
  category: string;
  label: string | null;
  x: number;
  y: number;
  width_ft: number;
  height_ft: number;
  rotation: number;
  locked: boolean;
  color: string | null;
  status: string;
  zone_id: string | null;
  [k: string]: unknown;
}
export interface FloorMapZone {
  id: string;
  name: string;
  color: string;
  points: { x: number; y: number }[];
}
interface FloorPlan {
  image_url: string | null;
  base_width: number;
  base_height: number;
  ft_per_unit: number;
}

interface Props {
  floorPlan: FloorPlan;
  objects: FloorMapObject[];
  zones: FloorMapZone[];
  canEdit: boolean;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onMove: (id: string, x: number, y: number) => void;
  onUpdate: (id: string, patch: Record<string, unknown>) => void;
  onDelete: (id: string) => void;
  onOpenDetails: (obj: FloorMapObject) => void;
  onCreate: (payload: Record<string, unknown>) => void;
  staffPins?: Array<{ id: string; x: number; y: number; total: number; checkedIn: number }>;
}

function ftIn(ft: number): string {
  const totalIn = Math.round(ft * 12);
  const f = Math.floor(totalIn / 12);
  const i = totalIn % 12;
  return i ? `${f}'${i}"` : `${f}'`;
}

export function FloorMap({
  floorPlan,
  objects,
  zones,
  canEdit,
  selectedId,
  onSelect,
  onMove,
  onUpdate,
  onDelete,
  onOpenDetails,
  onCreate,
  staffPins,
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const trRef = useRef<Konva.Transformer>(null);
  const nodeRefs = useRef<Record<string, Konva.Group>>({});
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [view, setView] = useState({ scale: 1, x: 0, y: 0 });
  const [pinching, setPinching] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [live, setLive] = useState<{ w: number; h: number } | null>(null);
  const [baseOpacity, setBaseOpacity] = useState(1);
  const interactedRef = useRef(false);
  const pinchRef = useRef<{ dist: number } | null>(null);

  const img = useImage(floorPlan.image_url ?? undefined);
  const baseW = floorPlan.base_width || 1000;
  const baseH = floorPlan.base_height || 1000;
  const ftPerUnit = floorPlan.ft_per_unit || 0.028;
  const ftToPlan = useCallback((ft: number) => ft / ftPerUnit, [ftPerUnit]);

  // Measure synchronously before paint so fit applies on the first frame (no flash).
  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      setSize({ w: r.width, h: r.height });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const fitScale = useMemo(() => {
    if (!size.w || !size.h) return 1;
    return Math.min((size.w - 24) / baseW, (size.h - 24) / baseH);
  }, [size, baseW, baseH]);

  const fit = useCallback(() => {
    const s = fitScale;
    setView({ scale: s, x: (size.w - baseW * s) / 2, y: (size.h - baseH * s) / 2 });
  }, [fitScale, size, baseW, baseH]);

  // Auto-fit on load and while the container settles, until the user pans/zooms.
  useLayoutEffect(() => {
    if (size.w && size.h && !interactedRef.current) fit();
  }, [size, fit]);

  const clampScale = useCallback(
    (s: number) => Math.max(fitScale * 0.5, Math.min(fitScale * 40, s)),
    [fitScale],
  );

  const zoomAt = useCallback(
    (px: number, py: number, nextScale: number) => {
      setView((v) => {
        const s = clampScale(nextScale);
        const wx = (px - v.x) / v.scale;
        const wy = (py - v.y) / v.scale;
        return { scale: s, x: px - wx * s, y: py - wy * s };
      });
    },
    [clampScale],
  );

  // Functional zoom (reads latest scale so rapid clicks compound correctly).
  const zoomByFactor = useCallback(
    (factor: number) => {
      interactedRef.current = true;
      setView((v) => {
        const s = clampScale(v.scale * factor);
        const px = size.w / 2;
        const py = size.h / 2;
        const wx = (px - v.x) / v.scale;
        const wy = (py - v.y) / v.scale;
        return { scale: s, x: px - wx * s, y: py - wy * s };
      });
    },
    [clampScale, size],
  );

  const exportPng = useCallback(() => {
    const url = stageRef.current?.toDataURL({ pixelRatio: 2 });
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = "white-party-floorplan.png";
    a.click();
  }, []);

  const onWheel = useCallback(
    (e: Konva.KonvaEventObject<WheelEvent>) => {
      e.evt.preventDefault();
      interactedRef.current = true;
      const pointer = stageRef.current?.getPointerPosition();
      if (!pointer) return;
      const dir = e.evt.deltaY > 0 ? 1 / 1.08 : 1.08;
      zoomAt(pointer.x, pointer.y, view.scale * dir);
    },
    [view.scale, zoomAt],
  );

  const onTouchMove = useCallback(
    (e: Konva.KonvaEventObject<TouchEvent>) => {
      const touches = e.evt.touches;
      if (touches.length !== 2) return;
      e.evt.preventDefault();
      interactedRef.current = true;
      setPinching(true);
      const [a, b] = [touches[0], touches[1]];
      const rect = stageRef.current?.container().getBoundingClientRect();
      const ox = rect?.left ?? 0;
      const oy = rect?.top ?? 0;
      const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      const cx = (a.clientX + b.clientX) / 2 - ox;
      const cy = (a.clientY + b.clientY) / 2 - oy;
      if (pinchRef.current) zoomAt(cx, cy, view.scale * (dist / pinchRef.current.dist));
      pinchRef.current = { dist };
    },
    [view.scale, zoomAt],
  );

  const endPinch = useCallback(() => {
    pinchRef.current = null;
    setPinching(false);
  }, []);

  // Attach transformer to the selected (editable, unlocked) node
  useEffect(() => {
    const tr = trRef.current;
    if (!tr) return;
    const sel = objects.find((o) => o.id === selectedId);
    const node = selectedId ? nodeRefs.current[selectedId] : null;
    if (node && canEdit && sel && !sel.locked) {
      tr.nodes([node]);
      tr.keepRatio(!!kindOf(sel.kind)?.keepAspect);
    } else {
      tr.nodes([]);
    }
    tr.getLayer()?.batchDraw();
  }, [selectedId, objects, canEdit, view.scale]);

  const addObject = (kind: string) => {
    const def = kindOf(kind);
    if (!def) return;
    const cx = (size.w / 2 - view.x) / view.scale;
    const cy = (size.h / 2 - view.y) / view.scale;
    onCreate({
      kind,
      category: def.category,
      label: def.label,
      width_ft: def.defaultWidthFt,
      height_ft: def.defaultHeightFt,
      color: def.color ?? null,
      x: Math.round(cx),
      y: Math.round(cy),
    });
  };

  const selected = objects.find((o) => o.id === selectedId) ?? null;
  const k = 1 / view.scale;

  return (
    <div
      ref={wrapRef}
      className="relative h-full w-full touch-none overflow-hidden"
      style={{ background: "radial-gradient(120% 90% at 50% 32%, #16161d 0%, #0a0a0c 72%)" }}
    >
      {size.w > 0 && (
        <Stage
          ref={stageRef}
          width={size.w}
          height={size.h}
          scaleX={view.scale}
          scaleY={view.scale}
          x={view.x}
          y={view.y}
          draggable={!pinching}
          onWheel={onWheel}
          onTouchMove={onTouchMove}
          onTouchEnd={endPinch}
          onDragEnd={(e) => {
            if (e.target === stageRef.current) {
              interactedRef.current = true;
              setView((v) => ({ ...v, x: e.target.x(), y: e.target.y() }));
            }
          }}
          onMouseDown={(e) => {
            if (e.target === e.target.getStage()) onSelect(null);
          }}
          onTouchStart={(e) => {
            if (e.target === e.target.getStage() && e.evt.touches.length === 1) onSelect(null);
          }}
        >
          <Layer>
            <Rect
              x={0}
              y={0}
              width={baseW}
              height={baseH}
              fill="#f5f4ef"
              cornerRadius={10 * k}
              shadowColor="#000"
              shadowBlur={40 * k}
              shadowOpacity={0.55}
              listening={false}
            />
            {img && <KonvaImage image={img} width={baseW} height={baseH} listening={false} opacity={baseOpacity} />}

            {zones.map((z) => {
              if (!z.points?.length) return null;
              const flat = z.points.flatMap((p) => [p.x, p.y]);
              const cx = z.points.reduce((s, p) => s + p.x, 0) / z.points.length;
              const cy = z.points.reduce((s, p) => s + p.y, 0) / z.points.length;
              const hex = tokenHex(z.color);
              return (
                <Group key={z.id} listening={false}>
                  <Line points={flat} closed fill={z.name === "Pool" ? "transparent" : hex + "14"} stroke={hex + "70"} strokeWidth={2.2 * k} dash={[10 * k, 8 * k]} />
                  <Text
                    text={z.name.toUpperCase()}
                    x={cx}
                    y={cy}
                    width={4000}
                    offsetX={2000}
                    offsetY={9 * k}
                    align="center"
                    fontSize={Math.min(12 * k, 200)}
                    fontStyle="bold"
                    letterSpacing={Math.min(2 * k, 26)}
                    fill={hex}
                    opacity={view.scale > fitScale * 2.4 ? 0.16 : 0.5}
                  />
                </Group>
              );
            })}

            {objects.map((o) => {
              const pw = ftToPlan(o.width_ft);
              const ph = ftToPlan(o.height_ft);
              return (
                <Group
                  key={o.id}
                  ref={(n) => {
                    if (n) nodeRefs.current[o.id] = n;
                    else delete nodeRefs.current[o.id];
                  }}
                  x={o.x}
                  y={o.y}
                  rotation={o.rotation || 0}
                  draggable={canEdit && !o.locked}
                  onClick={() => onSelect(o.id)}
                  onTap={() => onSelect(o.id)}
                  onDragEnd={(e) => {
                    const g = 0.5 / ftPerUnit; // snap to 6"
                    onMove(o.id, Math.round(e.target.x() / g) * g, Math.round(e.target.y() / g) * g);
                  }}
                  onTransform={(e) => {
                    const n = e.target;
                    setLive({ w: o.width_ft * Math.abs(n.scaleX()), h: o.height_ft * Math.abs(n.scaleY()) });
                  }}
                  onTransformEnd={(e) => {
                    const n = e.target;
                    const nw = Math.max(0.5, o.width_ft * Math.abs(n.scaleX()));
                    const nh = Math.max(0.5, o.height_ft * Math.abs(n.scaleY()));
                    const rot = n.rotation();
                    n.scaleX(1);
                    n.scaleY(1);
                    setLive(null);
                    onUpdate(o.id, {
                      width_ft: Math.round(nw * 10) / 10,
                      height_ft: Math.round(nh * 10) / 10,
                      rotation: Math.round(rot),
                      x: Math.round(n.x()),
                      y: Math.round(n.y()),
                    });
                  }}
                >
                  <ObjectShape
                    o={o}
                    pw={pw}
                    ph={ph}
                    upf={1 / ftPerUnit}
                    selected={o.id === selectedId}
                    rotation={o.rotation || 0}
                    showLabel={pw * view.scale > 46}
                  />
                </Group>
              );
            })}

            {/* Staff position pins (live check-in) */}
            {staffPins?.map((p) => {
              const color = p.checkedIn >= p.total ? "#34D399" : p.checkedIn > 0 ? "#FBBF24" : "#8A8A93";
              return (
                <Group key={p.id} x={p.x} y={p.y} listening={false}>
                  <Circle radius={15 * k} fill={color} stroke="#0b0b0d" strokeWidth={2 * k} shadowColor="#000" shadowBlur={6 * k} shadowOpacity={0.4} shadowOffsetY={3 * k} />
                  <Text text={`${p.checkedIn}/${p.total}`} fontSize={10.5 * k} fontStyle="bold" fill="#0b0b0d" align="center" width={80 * k} offsetX={40 * k} offsetY={5.5 * k} />
                </Group>
              );
            })}

            <Transformer
              ref={trRef}
              rotateEnabled
              anchorSize={11 * k}
              anchorStroke="#D4AF37"
              anchorFill="#ffffff"
              borderStroke="#D4AF37"
              borderStrokeWidth={1.5 * k}
              anchorStrokeWidth={1.5 * k}
              rotateAnchorOffset={22 * k}
              boundBoxFunc={(oldBox, newBox) => (newBox.width < 8 || newBox.height < 8 ? oldBox : newBox)}
            />
          </Layer>
        </Stage>
      )}

      {/* Zoom controls */}
      <div className="absolute right-3 top-3 z-10 flex flex-col gap-1.5">
        <button onClick={() => zoomByFactor(1.3)} className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background/85 backdrop-blur" aria-label="Zoom in">
          <Plus className="h-4 w-4" />
        </button>
        <button onClick={() => zoomByFactor(1 / 1.3)} className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background/85 backdrop-blur" aria-label="Zoom out">
          <Minus className="h-4 w-4" />
        </button>
        <button onClick={fit} className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background/85 backdrop-blur" aria-label="Fit to screen">
          <Maximize2 className="h-4 w-4" />
        </button>
        <button onClick={exportPng} className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background/85 backdrop-blur" aria-label="Export PNG">
          <Download className="h-4 w-4" />
        </button>
      </div>

      {/* Scale bar */}
      <div className="pointer-events-none absolute bottom-3 left-3 z-10 flex flex-col items-start gap-1">
        <div className="h-1.5 rounded-sm border border-white/70 bg-white/20" style={{ width: `${Math.max(20, ftToPlan(10) * view.scale)}px` }} />
        <span className="text-[10px] font-medium text-white/80">10 ft</span>
      </div>

      {/* Base plan opacity (ghost the reference) */}
      <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 rounded-full border border-border bg-background/85 px-3 py-1.5 backdrop-blur">
        <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">base</span>
        <input
          type="range"
          min={0.2}
          max={1}
          step={0.05}
          value={baseOpacity}
          onChange={(e) => setBaseOpacity(Number(e.target.value))}
          className="h-1 w-24 accent-[#D4AF37]"
        />
      </div>

      {/* Add FAB */}
      {canEdit && (
        <button
          onClick={() => setPaletteOpen(true)}
          className="absolute bottom-4 right-4 z-10 flex h-14 w-14 items-center justify-center rounded-full bg-gold text-background shadow-lg shadow-black/40 active:scale-95"
          aria-label="Add object"
        >
          <Plus className="h-6 w-6" strokeWidth={2.5} />
        </button>
      )}

      {/* Selected readout + toolbar */}
      {selected && (
        <div className="absolute inset-x-3 bottom-20 z-10 mx-auto flex max-w-sm items-center gap-2 rounded-xl border border-border bg-background/95 px-3 py-2 shadow-lg backdrop-blur">
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold">{selected.label ?? kindOf(selected.kind)?.label ?? selected.kind}</div>
            <div className="tabular-nums text-xs text-muted-foreground">
              {live ? ftIn(live.w) : ftIn(selected.width_ft)} × {live ? ftIn(live.h) : ftIn(selected.height_ft)} · {Math.round(selected.rotation || 0)}°
            </div>
          </div>
          <button onClick={() => onOpenDetails(selected)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-gold" aria-label="Details">
            <Info className="h-4 w-4" />
          </button>
          {canEdit && (
            <>
              <button
                onClick={() =>
                  onCreate({
                    kind: selected.kind,
                    category: selected.category,
                    label: selected.label,
                    width_ft: selected.width_ft,
                    height_ft: selected.height_ft,
                    rotation: selected.rotation,
                    color: selected.color,
                    status: selected.status,
                    x: selected.x + 60,
                    y: selected.y + 60,
                  })
                }
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-border"
                aria-label="Duplicate"
              >
                <Copy className="h-4 w-4" />
              </button>
              <button onClick={() => onUpdate(selected.id, { rotation: ((selected.rotation || 0) + 15) % 360 })} className="flex h-8 w-8 items-center justify-center rounded-lg border border-border" aria-label="Rotate">
                <RotateCw className="h-4 w-4" />
              </button>
              <button onClick={() => onUpdate(selected.id, { locked: !selected.locked })} className="flex h-8 w-8 items-center justify-center rounded-lg border border-border" aria-label="Lock">
                {selected.locked ? <Lock className="h-4 w-4 text-warn" /> : <Unlock className="h-4 w-4" />}
              </button>
              <button onClick={() => onDelete(selected.id)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-crit" aria-label="Delete">
                <Trash2 className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      )}

      <ObjectPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} onPick={addObject} />
    </div>
  );
}
