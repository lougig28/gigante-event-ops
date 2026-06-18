import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Konva from "konva";
import { Stage, Layer, Image as KonvaImage, Rect, Circle, Line, Text, Group } from "react-konva";
import { Plus, Minus, Maximize2, RotateCw, Lock, Unlock, Trash2, Info } from "lucide-react";
import { useImage } from "@/hooks/useImage";
import { kindOf, tokenHex } from "@/lib/catalogIndex";

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
}

const STATUS_STROKE: Record<string, string> = {
  ok: "#D4AF37",
  setup: "#FBBF24",
  attention: "#FB923C",
  down: "#F87171",
  vip: "#E0A458",
};

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
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [view, setView] = useState({ scale: 1, x: 0, y: 0 });
  const [pinching, setPinching] = useState(false);
  const fittedRef = useRef(false);
  const pinchRef = useRef<{ dist: number; cx: number; cy: number } | null>(null);

  const img = useImage(floorPlan.image_url ?? undefined);
  const baseW = floorPlan.base_width || 1000;
  const baseH = floorPlan.base_height || 1000;
  const ftPerUnit = floorPlan.ft_per_unit || 0.0280;
  const ftToPlan = useCallback((ft: number) => ft / ftPerUnit, [ftPerUnit]);

  // Measure container
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const cr = entries[0].contentRect;
      setSize({ w: cr.width, h: cr.height });
    });
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

  useEffect(() => {
    if (size.w && size.h && !fittedRef.current) {
      fit();
      fittedRef.current = true;
    }
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

  const onWheel = useCallback(
    (e: Konva.KonvaEventObject<WheelEvent>) => {
      e.evt.preventDefault();
      const stage = stageRef.current;
      if (!stage) return;
      const pointer = stage.getPointerPosition();
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
      setPinching(true);
      const [a, b] = [touches[0], touches[1]];
      const rect = stageRef.current?.container().getBoundingClientRect();
      const ox = rect?.left ?? 0;
      const oy = rect?.top ?? 0;
      const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      const cx = (a.clientX + b.clientX) / 2 - ox;
      const cy = (a.clientY + b.clientY) / 2 - oy;
      if (pinchRef.current) {
        const factor = dist / pinchRef.current.dist;
        zoomAt(cx, cy, view.scale * factor);
      }
      pinchRef.current = { dist, cx, cy };
    },
    [view.scale, zoomAt],
  );

  const endPinch = useCallback(() => {
    pinchRef.current = null;
    setPinching(false);
  }, []);

  const selected = objects.find((o) => o.id === selectedId) ?? null;

  return (
    <div ref={wrapRef} className="relative h-full w-full touch-none overflow-hidden bg-[#0b0b0d]">
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
            if (e.target === stageRef.current) setView((v) => ({ ...v, x: e.target.x(), y: e.target.y() }));
          }}
          onMouseDown={(e) => {
            if (e.target === e.target.getStage()) onSelect(null);
          }}
          onTouchStart={(e) => {
            if (e.target === e.target.getStage() && e.evt.touches.length === 1) onSelect(null);
          }}
        >
          <Layer>
            {/* White "paper" so the plan (dark linework on transparent) is legible */}
            <Rect
              x={0}
              y={0}
              width={baseW}
              height={baseH}
              fill="#f5f4ef"
              cornerRadius={10 / view.scale}
              shadowColor="#000"
              shadowBlur={40 / view.scale}
              shadowOpacity={0.55}
              listening={false}
            />
            {img && <KonvaImage image={img} width={baseW} height={baseH} listening={false} />}

            {/* Zones */}
            {zones.map((z) => {
              if (!z.points?.length) return null;
              const flat = z.points.flatMap((p) => [p.x, p.y]);
              const cx = z.points.reduce((s, p) => s + p.x, 0) / z.points.length;
              const cy = z.points.reduce((s, p) => s + p.y, 0) / z.points.length;
              const hex = tokenHex(z.color);
              return (
                <Group key={z.id} listening={false}>
                  <Line points={flat} closed fill={hex} opacity={0.1} stroke={hex} strokeWidth={3 / view.scale} dash={[12 / view.scale, 8 / view.scale]} />
                  <Text
                    text={z.name.toUpperCase()}
                    x={cx}
                    y={cy}
                    width={4000}
                    offsetX={2000}
                    offsetY={7 / view.scale}
                    align="center"
                    fontSize={Math.min(13 / view.scale, 240)}
                    fontStyle="bold"
                    letterSpacing={Math.min(2 / view.scale, 30)}
                    fill={hex}
                    opacity={0.7}
                  />
                </Group>
              );
            })}

            {/* Objects */}
            {objects.map((o) => {
              const def = kindOf(o.kind);
              const pw = ftToPlan(o.width_ft);
              const ph = ftToPlan(o.height_ft);
              const isSel = o.id === selectedId;
              const fill = tokenHex(o.color ?? def?.color);
              const stroke = isSel ? "#FFFFFF" : STATUS_STROKE[o.status] ?? "#D4AF37";
              const round = def?.shape === "circle" || def?.keepAspect;
              const screenW = pw * view.scale;
              const showLabel = screenW > 46 && o.label;
              return (
                <Group
                  key={o.id}
                  x={o.x}
                  y={o.y}
                  rotation={o.rotation || 0}
                  draggable={canEdit && !o.locked}
                  onClick={() => onSelect(o.id)}
                  onTap={() => onSelect(o.id)}
                  onDragEnd={(e) => onMove(o.id, Math.round(e.target.x()), Math.round(e.target.y()))}
                >
                  {round ? (
                    <Circle
                      radius={pw / 2}
                      fill={fill}
                      opacity={0.85}
                      stroke={stroke}
                      strokeWidth={(isSel ? 3 : 1.5) / view.scale}
                    />
                  ) : (
                    <Rect
                      x={-pw / 2}
                      y={-ph / 2}
                      width={pw}
                      height={ph}
                      cornerRadius={Math.min(pw, ph) * 0.08}
                      fill={fill}
                      opacity={0.85}
                      stroke={stroke}
                      strokeWidth={(isSel ? 3 : 1.5) / view.scale}
                    />
                  )}
                  {showLabel && (
                    <Text
                      text={o.label ?? ""}
                      fontSize={12 / view.scale}
                      fontStyle="bold"
                      fill="#0b0b0d"
                      align="center"
                      width={pw * 1.6}
                      offsetX={pw * 0.8}
                      offsetY={6 / view.scale}
                      listening={false}
                    />
                  )}
                </Group>
              );
            })}
          </Layer>
        </Stage>
      )}

      {/* Zoom controls */}
      <div className="absolute right-3 top-3 flex flex-col gap-1.5">
        <button
          onClick={() => zoomAt(size.w / 2, size.h / 2, view.scale * 1.3)}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background/85 backdrop-blur"
          aria-label="Zoom in"
        >
          <Plus className="h-4 w-4" />
        </button>
        <button
          onClick={() => zoomAt(size.w / 2, size.h / 2, view.scale / 1.3)}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background/85 backdrop-blur"
          aria-label="Zoom out"
        >
          <Minus className="h-4 w-4" />
        </button>
        <button
          onClick={fit}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background/85 backdrop-blur"
          aria-label="Fit to screen"
        >
          <Maximize2 className="h-4 w-4" />
        </button>
      </div>

      {/* Scale bar */}
      <div className="pointer-events-none absolute bottom-3 left-3 flex flex-col items-start gap-1">
        <div
          className="h-1.5 rounded-sm border border-white/70 bg-white/20"
          style={{ width: `${Math.max(20, ftToPlan(10) * view.scale)}px` }}
        />
        <span className="text-[10px] font-medium text-white/80">10 ft</span>
      </div>

      {/* Selected readout + toolbar */}
      {selected && (
        <div className="absolute inset-x-3 bottom-3 mx-auto flex max-w-sm items-center gap-2 rounded-xl border border-border bg-background/95 px-3 py-2 shadow-lg backdrop-blur">
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold">{selected.label ?? kindOf(selected.kind)?.label ?? selected.kind}</div>
            <div className="tabular-nums text-xs text-muted-foreground">
              {ftIn(selected.width_ft)} × {ftIn(selected.height_ft)} · {Math.round(selected.rotation || 0)}°
            </div>
          </div>
          <button
            onClick={() => onOpenDetails(selected)}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-gold"
            aria-label="Details"
          >
            <Info className="h-4 w-4" />
          </button>
          {canEdit && (
            <>
              <button
                onClick={() => onUpdate(selected.id, { rotation: ((selected.rotation || 0) + 15) % 360 })}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-border"
                aria-label="Rotate"
              >
                <RotateCw className="h-4 w-4" />
              </button>
              <button
                onClick={() => onUpdate(selected.id, { locked: !selected.locked })}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-border"
                aria-label="Lock"
              >
                {selected.locked ? <Lock className="h-4 w-4 text-warn" /> : <Unlock className="h-4 w-4" />}
              </button>
              <button
                onClick={() => onDelete(selected.id)}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-crit"
                aria-label="Delete"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
