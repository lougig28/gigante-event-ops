import { Group, Rect, Circle, Ellipse, Line, Text, Wedge } from "react-konva";
import type { ReactNode } from "react";
import { kindOf } from "@/lib/catalogIndex";
import type { FloorMapObject } from "./FloorMap";

/* ─────────────────────────────────────────────────────────────────────────────
 * Realistic 2.5D object rendering — extruded slabs, contact shadows, tables with
 * chairs, wood bars, water, lounge/pool furniture. Light comes from top-left;
 * every object casts a soft contact shadow + has a darker "side" offset down for
 * an almost-3D, AllSeated/Prismm-class look. Drawn centered at (0,0); the parent
 * Group supplies position/rotation/drag.
 * ───────────────────────────────────────────────────────────────────────────── */

const SHADOW = { shadowColor: "#000000", shadowOpacity: 0.28, shadowBlur: 6, shadowOffsetX: 2, shadowOffsetY: 5 };

// palette
const LINEN_TOP = "#f7f3ea";
const LINEN_EDGE = "#ddd2bd";
const CHAIR = "#cdbfa6";
const WOOD_TOP = "#4a3f31";
const WOOD_TOP2 = "#2f2619";
const WOOD_SIDE = "#221b11";
const GOLD = "#d4af37";
const DARK_TOP = "#2c313a";
const DARK_SIDE = "#181b21";
const WATER = "#54c2e6";
const GREEN = "#5f9e58";

function lift(kind: string, category: string): number {
  if (category === "bar") return 0.7;
  if (kind.includes("stage") || kind.includes("riser") || kind === "dj-booth") return 0.55;
  if (kind === "cabana") return 0.9;
  if (kind === "pool-daybed" || kind.includes("lounge") || kind.includes("sofa")) return 0.4;
  if (category === "seating") return 0.32;
  if (kind.includes("planter") || kind.includes("greenery")) return 0.5;
  if (category === "boh" || category === "structure") return 0.45;
  return 0.25;
}

/** Chair positions around a table footprint (plan units), facing the table. */
function chairs(
  shape: "round" | "rect",
  pw: number,
  ph: number,
  seats: number,
  upf: number,
): { x: number; y: number; rot: number; cw: number; cd: number }[] {
  const cw = 1.45 * upf; // chair width ~17"
  const cd = 1.25 * upf;
  const out: { x: number; y: number; rot: number }[] = [];
  if (seats <= 0) return [];
  if (shape === "round") {
    const r = Math.max(pw, ph) / 2 + cd * 0.62;
    for (let i = 0; i < seats; i++) {
      const a = (-90 + (360 / seats) * i) * (Math.PI / 180);
      out.push({ x: Math.cos(a) * r, y: Math.sin(a) * r, rot: (a * 180) / Math.PI + 90 });
    }
  } else {
    const perSide = Math.ceil(seats / 2);
    const y = ph / 2 + cd * 0.62;
    for (let i = 0; i < perSide; i++) {
      const x = -pw / 2 + (pw / (perSide + 1)) * (i + 1);
      out.push({ x, y, rot: 180 });
    }
    for (let i = 0; i < seats - perSide; i++) {
      const x = -pw / 2 + (pw / (seats - perSide + 1)) * (i + 1);
      out.push({ x, y: -y, rot: 0 });
    }
  }
  return out.map((c) => ({ ...c, cw, cd }));
}

function Chair({ x, y, rot, cw, cd }: { x: number; y: number; rot: number; cw: number; cd: number }) {
  return (
    <Group x={x} y={y} rotation={rot} listening={false}>
      <Rect x={-cw / 2} y={-cd / 2} width={cw} height={cd} cornerRadius={cd * 0.35} fill={CHAIR} stroke="#0000001f" strokeWidth={cd * 0.06} />
      <Rect x={-cw / 2} y={-cd / 2} width={cw} height={cd * 0.3} cornerRadius={cd * 0.2} fill="#00000016" />
    </Group>
  );
}

export function ObjectShape({
  o,
  pw,
  ph,
  upf,
  selected,
  rotation,
  showLabel,
}: {
  o: FloorMapObject;
  pw: number;
  ph: number;
  upf: number; // plan units per foot
  selected: boolean;
  rotation: number;
  showLabel: boolean;
}) {
  const def = kindOf(o.kind);
  const cat = o.category;
  const isVip = o.status === "vip";
  const L = lift(o.kind, cat) * Math.min(pw, ph) * 0.16; // extrusion depth
  const sh = { ...SHADOW, shadowBlur: 4 + L * 0.8, shadowOffsetY: 3 + L * 0.7, shadowOffsetX: 1 + L * 0.3 };
  const selStroke = selected ? <Rect x={-pw / 2 - 3} y={-ph / 2 - 3} width={pw + 6} height={ph + 6} cornerRadius={6} stroke={GOLD} strokeWidth={2.5} dash={[8, 5]} listening={false} /> : null;

  const hit = <Rect x={-pw / 2} y={-ph / 2} width={pw} height={ph} fill="transparent" />;

  const label = showLabel && o.label ? (
    <Group rotation={-rotation} listening={false}>
      <Text text={o.label} fontSize={Math.min(pw, ph) * 0.22} fontStyle="700" fill={cat === "bar" || cat === "stage" ? "#f3ead4" : "#2a2118"} align="center" width={pw * 1.8} offsetX={pw * 0.9} offsetY={Math.min(pw, ph) * 0.11} />
    </Group>
  ) : null;

  // ── Text label / note (markup) — transparent, text only, no box ──────────
  if (def?.shape === "text") {
    return (
      <>
        {hit}
        <Text
          text={o.label || def.label || ""}
          fontSize={Math.max(6, ph * 0.8)}
          fontStyle="bold"
          fill="#241c08"
          align="center"
          verticalAlign="middle"
          width={pw * 1.5}
          height={ph}
          offsetX={pw * 0.75}
          offsetY={ph / 2}
          wrap="none"
          listening={false}
        />
        {selStroke}
      </>
    );
  }

  // ── Round tables ─────────────────────────────────────────────────────────
  const round = def?.shape === "circle" || def?.keepAspect;
  if (cat === "seating" && round) {
    const r = pw / 2;
    const seatPos = chairs("round", pw, ph, def?.seats ?? 0, upf);
    return (
      <>
        {hit}
        {seatPos.map((c, i) => (<Chair key={i} {...c} />))}
        <Ellipse radiusX={r} radiusY={r} y={L} fill={LINEN_EDGE} listening={false} />
        <Circle radius={r} fillRadialGradientStartPoint={{ x: -r * 0.3, y: -r * 0.3 }} fillRadialGradientStartRadius={0} fillRadialGradientEndRadius={r * 1.3} fillRadialGradientColorStops={[0, "#fffdf8", 1, LINEN_TOP]} stroke={isVip ? GOLD : "#0000001a"} strokeWidth={isVip ? 2.5 : 1} {...sh} listening={false} />
        <Circle radius={r * 0.62} stroke="#00000010" strokeWidth={1} listening={false} />
        {label}
        {selStroke}
      </>
    );
  }

  // ── Rect / banquet tables ────────────────────────────────────────────────
  if (cat === "seating" && !round && o.kind !== "lounge-sofa" && !o.kind.includes("lounge") && o.kind !== "coffee-table" && o.kind !== "lounge-rug") {
    const seatPos = chairs("rect", pw, ph, def?.seats ?? 0, upf);
    return (
      <>
        {hit}
        {seatPos.map((c, i) => (<Chair key={i} {...c} />))}
        <Rect x={-pw / 2} y={-ph / 2 + L} width={pw} height={ph} cornerRadius={3} fill={LINEN_EDGE} listening={false} />
        <Rect x={-pw / 2} y={-ph / 2} width={pw} height={ph} cornerRadius={3} fillLinearGradientStartPoint={{ x: 0, y: -ph / 2 }} fillLinearGradientEndPoint={{ x: 0, y: ph / 2 }} fillLinearGradientColorStops={[0, "#fffdf8", 1, LINEN_TOP]} stroke={isVip ? GOLD : "#0000001a"} strokeWidth={isVip ? 2.5 : 1} {...sh} listening={false} />
        {label}
        {selStroke}
      </>
    );
  }

  // ── Bars (wood counter, extruded, bottle step + sections) ────────────────
  if (cat === "bar") {
    const sections = Math.max(1, Math.round((o.width_ft || 6) / 2));
    const topColor = isVip ? GOLD : WOOD_TOP;
    return (
      <>
        {hit}
        {/* side / front face */}
        <Rect x={-pw / 2} y={-ph / 2 + L} width={pw} height={ph} cornerRadius={2} fill={WOOD_SIDE} listening={false} />
        {/* top */}
        <Rect x={-pw / 2} y={-ph / 2} width={pw} height={ph} cornerRadius={2} fillLinearGradientStartPoint={{ x: 0, y: -ph / 2 }} fillLinearGradientEndPoint={{ x: 0, y: ph / 2 }} fillLinearGradientColorStops={[0, topColor, 1, WOOD_TOP2]} stroke="#00000030" strokeWidth={1} {...sh} listening={false} />
        {/* bottle step (gold rail along back) */}
        <Rect x={-pw / 2} y={-ph / 2} width={pw} height={ph * 0.16} cornerRadius={1} fill={GOLD} opacity={0.85} listening={false} />
        {/* section dividers */}
        {Array.from({ length: sections - 1 }, (_, i) => (
          <Line key={i} points={[-pw / 2 + (pw / sections) * (i + 1), -ph / 2, -pw / 2 + (pw / sections) * (i + 1), ph / 2]} stroke="#0000002e" strokeWidth={0.8} listening={false} />
        ))}
        {label}
        {selStroke}
      </>
    );
  }

  // ── Stage / riser / DJ (raised dark platform) ────────────────────────────
  if (o.kind.includes("stage") || o.kind.includes("riser") || o.kind === "dj-booth" || o.kind === "foh-av-table") {
    return (
      <>
        {hit}
        <Rect x={-pw / 2} y={-ph / 2 + L * 1.4} width={pw} height={ph} cornerRadius={2} fill={DARK_SIDE} listening={false} />
        <Rect x={-pw / 2} y={-ph / 2} width={pw} height={ph} cornerRadius={2} fillLinearGradientStartPoint={{ x: 0, y: -ph / 2 }} fillLinearGradientEndPoint={{ x: 0, y: ph / 2 }} fillLinearGradientColorStops={[0, "#363b45", 1, DARK_TOP]} stroke={GOLD} strokeWidth={1.2} {...sh} listening={false} />
        {o.kind === "dj-booth" && <Rect x={-pw * 0.35} y={-ph * 0.1} width={pw * 0.7} height={ph * 0.35} cornerRadius={2} fill="#11141a" stroke={GOLD} strokeWidth={0.8} listening={false} />}
        {label}
        {selStroke}
      </>
    );
  }

  // ── Dance floor (parquet) ────────────────────────────────────────────────
  if (o.kind.includes("dance")) {
    const n = Math.max(3, Math.round((o.width_ft || 16) / 4));
    const m = Math.max(3, Math.round((o.height_ft || 16) / 4));
    const cells: ReactNode[] = [];
    for (let i = 0; i < n; i++)
      for (let j = 0; j < m; j++)
        cells.push(<Rect key={`${i}-${j}`} x={-pw / 2 + (pw / n) * i} y={-ph / 2 + (ph / m) * j} width={pw / n} height={ph / m} fill={(i + j) % 2 ? "#c79a55" : "#a87f3a"} listening={false} />);
    return (
      <>
        {hit}
        <Rect x={-pw / 2} y={-ph / 2} width={pw} height={ph} cornerRadius={2} fill="#a87f3a" {...sh} listening={false} />
        {cells}
        <Rect x={-pw / 2} y={-ph / 2} width={pw} height={ph} cornerRadius={2} stroke={GOLD} strokeWidth={1.5} listening={false} />
        {label}
        {selStroke}
      </>
    );
  }

  // ── Cabana (canopy + bed + posts) ────────────────────────────────────────
  if (o.kind === "cabana") {
    return (
      <>
        {hit}
        <Rect x={-pw / 2} y={-ph / 2 + L} width={pw} height={ph} cornerRadius={3} fill="#0000002a" listening={false} />
        <Rect x={-pw / 2} y={-ph / 2} width={pw} height={ph} cornerRadius={3} fill="#efe7d6" stroke={GOLD} strokeWidth={2} {...sh} listening={false} />
        <Rect x={-pw * 0.32} y={-ph * 0.18} width={pw * 0.64} height={ph * 0.5} cornerRadius={3} fill="#e6c98a" listening={false} />
        {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sy], i) => (<Circle key={i} x={(sx * pw) / 2} y={(sy * ph) / 2} radius={Math.min(pw, ph) * 0.05} fill={GOLD} listening={false} />))}
        {label}
        {selStroke}
      </>
    );
  }

  // ── Daybed / lounge sofa / chaise ────────────────────────────────────────
  if (o.kind === "pool-daybed" || o.kind.includes("lounge") || o.kind.includes("sofa") || o.kind.includes("chaise") || o.kind === "lounge-chair") {
    const cushion = isVip ? "#e7cf96" : "#dcd3c2";
    return (
      <>
        {hit}
        <Rect x={-pw / 2} y={-ph / 2 + L} width={pw} height={ph} cornerRadius={ph * 0.25} fill="#00000024" listening={false} />
        <Rect x={-pw / 2} y={-ph / 2} width={pw} height={ph} cornerRadius={ph * 0.22} fill={cushion} stroke={isVip ? GOLD : "#00000018"} strokeWidth={isVip ? 2 : 1} {...sh} listening={false} />
        <Rect x={-pw / 2 + ph * 0.08} y={-ph / 2 + ph * 0.08} width={pw - ph * 0.16} height={ph * 0.34} cornerRadius={ph * 0.14} fill="#ffffff55" listening={false} />
        {label}
        {selStroke}
      </>
    );
  }

  // ── Umbrella (radial canopy) ─────────────────────────────────────────────
  if (o.kind.includes("umbrella")) {
    const r = pw / 2;
    return (
      <>
        {hit}
        <Circle radius={r} y={L} fill="#0000002a" listening={false} />
        {Array.from({ length: 8 }, (_, i) => (<Wedge key={i} radius={r} angle={45} rotation={i * 45} fill={i % 2 ? "#f2ede2" : "#e4d8bf"} stroke="#00000018" strokeWidth={0.6} listening={false} {...(i === 0 ? sh : {})} />))}
        <Circle radius={Math.max(1.5, r * 0.08)} fill={GOLD} listening={false} />
        {selStroke}
      </>
    );
  }

  // ── Pool float / decor (fun) ─────────────────────────────────────────────
  if (o.kind.includes("float")) {
    return (<>{hit}<Circle radius={pw / 2} fill="#ffffff" stroke={WATER} strokeWidth={pw * 0.12} {...sh} listening={false} /><Circle radius={pw * 0.22} stroke={WATER} strokeWidth={1} listening={false} />{selStroke}</>);
  }

  // ── Planter / greenery ───────────────────────────────────────────────────
  if (o.kind.includes("planter") || o.kind.includes("greenery") || o.kind.includes("floral")) {
    return (
      <>
        {hit}
        <Circle radius={Math.max(pw, ph) / 2} y={L} fill="#00000022" listening={false} />
        {[[0, 0, 0.55], [-0.3, -0.2, 0.4], [0.3, -0.15, 0.42], [0.1, 0.28, 0.38], [-0.25, 0.2, 0.34]].map(([dx, dy, s], i) => (<Circle key={i} x={dx * pw} y={dy * ph} radius={Math.min(pw, ph) * (s as number)} fill={i % 2 ? GREEN : "#4b7a44"} {...(i === 0 ? sh : {})} listening={false} />))}
        {selStroke}
      </>
    );
  }

  // ── Stanchion / rope ─────────────────────────────────────────────────────
  if (o.kind.includes("stanchion") || o.kind.includes("rope")) {
    return (<>{hit}<Line points={[-pw / 2, 0, pw / 2, 0]} stroke={GOLD} strokeWidth={Math.max(1, ph * 0.18)} lineCap="round" listening={false} /><Circle x={-pw / 2} radius={Math.max(2, ph * 0.4)} fill="#2b2b2b" {...sh} listening={false} /><Circle x={pw / 2} radius={Math.max(2, ph * 0.4)} fill="#2b2b2b" {...sh} listening={false} />{selStroke}</>);
  }

  // ── Pipe & drape ─────────────────────────────────────────────────────────
  if (o.kind.includes("drape") || o.kind.includes("backdrop")) {
    return (<>{hit}<Rect x={-pw / 2} y={-ph / 2} width={pw} height={ph} fill="#6a5b7a" cornerRadius={1} {...sh} listening={false} />{Array.from({ length: Math.max(2, Math.round(pw / (ph || 1))) }, (_, i) => (<Line key={i} points={[-pw / 2 + (pw / 8) * i, -ph / 2, -pw / 2 + (pw / 8) * i, ph / 2]} stroke="#00000022" strokeWidth={0.6} listening={false} />))}{selStroke}</>);
  }

  // ── Transfer / glass-swap station ────────────────────────────────────────
  if (o.kind === "transfer-station" || cat === "structure" && o.kind.includes("door")) {
    return (<>{hit}<Rect x={-pw / 2} y={-ph / 2 + L} width={pw} height={ph} cornerRadius={2} fill="#0000002a" listening={false} /><Rect x={-pw / 2} y={-ph / 2} width={pw} height={ph} cornerRadius={2} fill="#5aa5c2" stroke="#2f7d99" strokeWidth={1.2} {...sh} listening={false} />{label}{selStroke}</>);
  }

  // ── Default: clean raised slab with bevel (still reads 3D) ────────────────
  const base = isVip ? "#b8902f" : cat === "pool" ? "#3f9fc0" : cat === "boh" ? "#5f656f" : cat === "decor" ? "#946690" : "#7e848f";
  const fill = isVip ? GOLD : cat === "pool" ? "#6cc3df" : cat === "boh" ? "#7d8590" : cat === "decor" ? "#b487b0" : "#9aa0ab";
  return (
    <>
      {hit}
      <Rect x={-pw / 2} y={-ph / 2 + L} width={pw} height={ph} cornerRadius={3} fill="#0000002a" listening={false} />
      <Rect x={-pw / 2} y={-ph / 2} width={pw} height={ph} cornerRadius={3} fillLinearGradientStartPoint={{ x: 0, y: -ph / 2 }} fillLinearGradientEndPoint={{ x: 0, y: ph / 2 }} fillLinearGradientColorStops={[0, fill, 1, base]} stroke="#00000026" strokeWidth={1} {...sh} listening={false} />
      {label}
      {selStroke}
    </>
  );
}
