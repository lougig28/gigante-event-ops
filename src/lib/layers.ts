import type { Role } from "./types";

export interface LayerDef {
  id: string;
  label: string;
}

/** Map layers (spec §2A): toggle what's shown; role-scoped defaults. */
export const LAYERS: LayerDef[] = [
  { id: "bars", label: "Bars" },
  { id: "vip", label: "VIP" },
  { id: "seating", label: "Seating" },
  { id: "stage", label: "Stage / AV" },
  { id: "pool", label: "Pool" },
  { id: "structure", label: "Entry / Door" },
  { id: "decor", label: "Decor" },
  { id: "boh", label: "BOH" },
];

const LAYER_IDS = LAYERS.map((l) => l.id);

/** Which layer an object belongs to (VIP status wins over category). */
export function layerOf(o: { category: string; status: string }): string {
  if (o.status === "vip") return "vip";
  switch (o.category) {
    case "bar":
      return "bars";
    case "seating":
      return "seating";
    case "stage":
      return "stage";
    case "pool":
      return "pool";
    case "structure":
      return "structure";
    case "decor":
      return "decor";
    default:
      return "boh"; // boh + markup fall here so nothing silently vanishes
  }
}

/** Default visible layers per role (the role-filtered view). */
export function defaultLayers(role: Role): Set<string> {
  switch (role) {
    case "bar_lead":
      return new Set(["bars", "vip", "structure"]);
    case "security":
      return new Set(["structure", "pool"]);
    case "captain":
      return new Set(["bars", "vip", "seating", "stage", "structure"]);
    default:
      return new Set(LAYER_IDS); // owner / manager / staff / readonly see all
  }
}
