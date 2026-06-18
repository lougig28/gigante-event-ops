import { OBJECT_CATALOG } from "./object-catalog";
import type { ObjectKind, ObjectCategory } from "./types";

export const CATALOG_BY_KIND: Record<string, ObjectKind> = Object.fromEntries(
  OBJECT_CATALOG.map((k) => [k.kind, k]),
);

export function kindOf(kind: string): ObjectKind | undefined {
  return CATALOG_BY_KIND[kind];
}

export const CATEGORY_LABELS: Record<ObjectCategory, string> = {
  seating: "Seating",
  bar: "Bars & Service",
  stage: "Stage / Dance / AV",
  structure: "Entry / Flow / Structure",
  decor: "Decor & Effects",
  pool: "Pool",
  boh: "BOH / Ops",
  markup: "Markup",
};

export const CATEGORY_ORDER: ObjectCategory[] = [
  "seating",
  "bar",
  "pool",
  "stage",
  "structure",
  "decor",
  "boh",
  "markup",
];

/** Token color name -> hex for Konva canvas fills (canvas can't read CSS vars). */
export const TOKEN_HEX: Record<string, string> = {
  gold: "#D4AF37",
  "gold-deep": "#B8860B",
  champagne: "#E8D9A0",
  pool: "#38BDF8",
  "pool-deep": "#0EA5E9",
  vip: "#E0A458",
  ok: "#34D399",
  warn: "#FBBF24",
  crit: "#F87171",
  muted: "#8A8A93",
};

export function tokenHex(token: string | null | undefined, fallback = "#9CA3AF"): string {
  if (!token) return fallback;
  if (token.startsWith("#")) return token;
  return TOKEN_HEX[token] ?? fallback;
}
