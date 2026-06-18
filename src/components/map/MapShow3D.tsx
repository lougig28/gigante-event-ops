import { Suspense, useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, ContactShadows, RoundedBox, Html } from "@react-three/drei";
import * as THREE from "three";
import { kindOf } from "@/lib/catalogIndex";
import type { FloorMapObject, FloorMapZone } from "./FloorMap";

/* ─────────────────────────────────────────────────────────────────────────────
 * Map — 3D "Show" view. A polished architectural-render of the SAME live data
 * the 2D konva editor uses (objects, pool, staff). To-scale extruded massing,
 * tilted-overhead camera, soft shadows. Read-only / tap-through for detail.
 * ───────────────────────────────────────────────────────────────────────────── */

interface FloorPlan {
  base_width: number;
  base_height: number;
  ft_per_unit: number;
  image_url: string | null;
}

export interface MapShow3DProps {
  floorPlan: FloorPlan;
  objects: FloorMapObject[];
  zones: FloorMapZone[];
  staffPins?: Array<{ id: string; x: number; y: number; total: number }>;
  onObjectTap?: (id: string) => void;
  onZoneTap?: (id: string) => void;
}

// Extrusion height (ft) per category, with per-kind overrides for character.
const H_CATEGORY: Record<string, number> = {
  seating: 2.4, bar: 3.7, stage: 2, structure: 6, decor: 3, pool: 1.4, boh: 3, markup: 0,
};
const H_KIND: Record<string, number> = {
  "cocktail-30": 3.6, "cocktail-36": 3.6, "chiavari-chair": 3, "lounge-sofa": 2.3,
  "lounge-chair": 2.5, "coffee-table": 1.4, "side-table": 1.7, "lounge-rug": 0.06,
  "back-bar": 4.2, "pos-stand": 3.4,
  "dj-booth": 4, "dance-floor-panel": 0.15, "dance-floor-area": 0.15, "speaker-main": 6,
  "speaker-sub": 2.2, "lighting-truss": 14, "photo-booth": 7, "screen-projector": 9,
  "monitor-wedge": 1.2, "foh-av-table": 3,
  "doorway-single": 0.12, "doorway-double": 0.12, "entrance-gate": 9, "stanchion-post": 3.2,
  "pipe-drape-10ft": 8, "wall-partition": 7, "tent-20x20": 12, "tent-20x40": 12,
  "pole-column": 11, "coat-check": 4, "box-office-table": 3.2, "ramp": 1, "stairs": 2,
  "balloon-arch": 8, "backdrop-step-repeat": 8, "plinth-pedestal": 3.5, "candelabra": 4.5,
  "planter-greenery": 3.5, "marquee-letters": 3.5, "neon-sign": 5, "floral-centerpiece": 2.5,
  "uplight": 0.6, "gobo-projection": 1.4,
  "cabana": 9, "patio-umbrella": 8, "pool-daybed": 2, "pool-lounge-chair": 1.1,
  "pool-side-table": 1.6, "pool-float": 0.4, "lifeguard-stand": 8, "towel-station": 3.5,
  "pool-edge-marker": 1.2,
  "dry-storage-rack": 6, "cooler-reach-in": 5, "first-aid-station": 4, "fire-extinguisher": 3.5,
};

// Architectural-render palette: white/gray base, blue pool, gold bar/VIP accents.
const COLOR_CATEGORY: Record<string, string> = {
  seating: "#e9e4d8", bar: "#cda24c", stage: "#3d4350", structure: "#cdd2d9",
  decor: "#dcc88e", pool: "#7cc4e6", boh: "#b7bcc5", markup: "#cccccc",
};
const COLOR_KIND: Record<string, string> = {
  cabana: "#bc8a33", "pool-daybed": "#8fb8d6", "transfer-station": "#bc8a33",
  "lounge-sofa": "#c9a14c", "lounge-chair": "#c9a14c", "lounge-rug": "#b8862f",
  "dance-floor-area": "#9d8cf0", "dance-floor-panel": "#9d8cf0",
  "dj-booth": "#caa14a", "screen-projector": "#2b303a", "photo-booth": "#caa14a",
  "lifeguard-stand": "#e05a4f", "pool-float": "#f3a8c8", "patio-umbrella": "#6fb6d8",
  "planter-greenery": "#7faa6b", "neon-sign": "#e0667e", "marquee-letters": "#d9b551",
};

const heightOf = (o: FloorMapObject) => H_KIND[o.kind] ?? H_CATEGORY[o.category] ?? 2.5;
const colorOf = (o: FloorMapObject) => COLOR_KIND[o.kind] ?? COLOR_CATEGORY[o.category] ?? "#c9cdd4";
const SKIP_SHAPES = new Set(["line", "polygon", "text"]);

function Massing({ o, wx, wz, onTap }: { o: FloorMapObject; wx: number; wz: number; onTap?: (id: string) => void }) {
  const [hover, setHover] = useState(false);
  const def = kindOf(o.kind);
  const h = heightOf(o);
  const w = Math.max(0.5, o.width_ft);
  const d = Math.max(0.5, o.height_ft);
  const color = o.status === "down" ? "#e0675c" : o.status === "attention" ? "#e6b84d" : colorOf(o);
  const rotY = -THREE.MathUtils.degToRad(o.rotation || 0);
  const emissive = hover ? color : "#000000";

  const common = {
    castShadow: true,
    receiveShadow: true,
    onPointerOver: (e: any) => { e.stopPropagation(); setHover(true); document.body.style.cursor = "pointer"; },
    onPointerOut: () => { setHover(false); document.body.style.cursor = "auto"; },
    onClick: (e: any) => { e.stopPropagation(); onTap?.(o.id); },
  };

  if (def?.shape === "circle") {
    const r = w / 2;
    return (
      <mesh position={[wx, h / 2, wz]} {...common}>
        <cylinderGeometry args={[r, r, h, 40]} />
        <meshStandardMaterial color={color} emissive={emissive} emissiveIntensity={hover ? 0.35 : 0} roughness={0.62} metalness={0.05} />
      </mesh>
    );
  }
  return (
    <group position={[wx, 0, wz]} rotation={[0, rotY, 0]}>
      <RoundedBox args={[w, h, d]} radius={Math.min(0.18, w / 2, d / 2, h / 2)} smoothness={3} position={[0, h / 2, 0]} {...common}>
        <meshStandardMaterial color={color} emissive={emissive} emissiveIntensity={hover ? 0.35 : 0} roughness={0.6} metalness={0.05} />
      </RoundedBox>
    </group>
  );
}

function PoolWater({ z, toWorld }: { z: FloorMapZone; toWorld: (x: number, y: number) => [number, number] }) {
  const shape = useMemo(() => {
    if (!z.points?.length) return null;
    const s = new THREE.Shape();
    z.points.forEach((p, i) => {
      const [x, zz] = toWorld(p.x, p.y);
      // ShapeGeometry is in XY; laid flat with rotX(-90°), local y → world -z.
      if (i === 0) s.moveTo(x, -zz);
      else s.lineTo(x, -zz);
    });
    s.closePath();
    return s;
  }, [z, toWorld]);
  if (!shape) return null;
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]} receiveShadow>
      <shapeGeometry args={[shape]} />
      <meshStandardMaterial color="#3a9fd4" roughness={0.12} metalness={0.55} transparent opacity={0.82} side={THREE.DoubleSide} />
    </mesh>
  );
}

function StaffPin({ id, wx, wz, total, onTap }: { id: string; wx: number; wz: number; total: number; onTap?: (id: string) => void }) {
  return (
    <group
      position={[wx, 0, wz]}
      onClick={(e) => { e.stopPropagation(); onTap?.(id); }}
      onPointerOver={() => (document.body.style.cursor = "pointer")}
      onPointerOut={() => (document.body.style.cursor = "auto")}
    >
      <mesh position={[0, 7, 0]} castShadow>
        <sphereGeometry args={[1.3, 24, 24]} />
        <meshStandardMaterial color="#c9a24b" roughness={0.35} metalness={0.4} emissive="#c9a24b" emissiveIntensity={0.2} />
      </mesh>
      <mesh position={[0, 3.5, 0]}>
        <cylinderGeometry args={[0.16, 0.16, 7, 8]} />
        <meshStandardMaterial color="#c9a24b" roughness={0.4} metalness={0.4} />
      </mesh>
      <Html position={[0, 10.5, 0]} center distanceFactor={130} occlude={false}>
        <div style={{
          background: "#241c08", color: "#f3e8c8", fontWeight: 700, fontSize: 13,
          padding: "1px 7px", borderRadius: 9, whiteSpace: "nowrap", boxShadow: "0 1px 4px rgba(0,0,0,.3)",
        }}>{total}</div>
      </Html>
    </group>
  );
}

export function MapShow3D({ floorPlan, objects, zones, staffPins, onObjectTap, onZoneTap }: MapShow3DProps) {
  const k = floorPlan.ft_per_unit || 0.028;
  const cx = (floorPlan.base_width * k) / 2;
  const cz = (floorPlan.base_height * k) / 2;
  const toWorld = useMemo(() => (x: number, y: number): [number, number] => [x * k - cx, y * k - cz], [k, cx, cz]);

  const renderObjs = useMemo(
    () => objects.filter((o) => o.category !== "markup" && !SKIP_SHAPES.has(kindOf(o.kind)?.shape ?? "rect")),
    [objects],
  );
  const poolZones = useMemo(() => zones.filter((z) => z.name.toLowerCase().includes("pool") && z.points?.length), [zones]);

  // Rough content center + size — only for sizing lights / ground / shadows.
  // The camera is auto-fit to the masses by drei <Bounds>.
  const { center, span } = useMemo(() => {
    const pts: Array<[number, number]> = [];
    // Frame to the event staging (objects); the pool reads as adjacent context.
    renderObjs.forEach((o) => {
      const [x, z] = toWorld(o.x, o.y);
      const r = Math.max(o.width_ft, o.height_ft) / 2;
      pts.push([x - r, z - r], [x + r, z + r]);
    });
    if (!pts.length) pts.push([0, 0]);
    const xs = pts.map((p) => p[0]);
    const zs = pts.map((p) => p[1]);
    const minX = Math.min(...xs), maxX = Math.max(...xs), minZ = Math.min(...zs), maxZ = Math.max(...zs);
    return {
      center: [(minX + maxX) / 2, 0, (minZ + maxZ) / 2] as [number, number, number],
      span: Math.max(maxX - minX, maxZ - minZ, 40),
    };
  }, [renderObjs, poolZones, toWorld]);

  return (
    <div className="absolute inset-0">
      <Canvas
        shadows
        dpr={[1, 2]}
        gl={{ antialias: true, preserveDrawingBuffer: true }}
        camera={{ position: [center[0], span * 3.05, center[2] + span * 0.92], fov: 30, near: 1, far: span * 18 }}
      >
        <color attach="background" args={["#f1ede4"]} />
        <hemisphereLight args={["#ffffff", "#d8d2c4", 0.92]} />
        <ambientLight intensity={0.22} />
        <directionalLight
          position={[center[0] + span * 0.55, span * 1.5, center[2] + span * 0.4]}
          intensity={1.18}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-near={1}
          shadow-camera-far={span * 5}
          shadow-camera-left={-span}
          shadow-camera-right={span}
          shadow-camera-top={span}
          shadow-camera-bottom={-span}
          shadow-bias={-0.0004}
        />

        {/* Ground */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[center[0], -0.02, center[2]]} receiveShadow>
          <planeGeometry args={[span * 6, span * 6]} />
          <meshStandardMaterial color="#efeae0" roughness={0.95} metalness={0} />
        </mesh>

        <Suspense fallback={null}>
          {poolZones.map((z) => (
            <PoolWater key={z.id} z={z} toWorld={toWorld} />
          ))}
          {renderObjs.map((o) => {
            const [wx, wz] = toWorld(o.x, o.y);
            return <Massing key={o.id} o={o} wx={wx} wz={wz} onTap={onObjectTap} />;
          })}
          {staffPins?.map((p) => {
            const [wx, wz] = toWorld(p.x, p.y);
            return <StaffPin key={p.id} id={p.id} wx={wx} wz={wz} total={p.total} onTap={onZoneTap} />;
          })}
        </Suspense>

        <ContactShadows
          position={[center[0], 0.01, center[2]]}
          scale={span * 2.6}
          resolution={1024}
          blur={2.6}
          opacity={0.42}
          far={span}
          color="#4a3f28"
        />

        <OrbitControls makeDefault target={center} enableDamping dampingFactor={0.08} maxPolarAngle={Math.PI * 0.49} />
      </Canvas>
    </div>
  );
}
