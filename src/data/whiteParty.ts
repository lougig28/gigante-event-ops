/* ─────────────────────────────────────────────────────────────────────────────
 * White Party 2026 — preview seed
 * Derived from the 2026 Bar & VIP Briefing + 2025 Poolside Bar Management Guide.
 * Used as (a) offline fallback on the floor and (b) the source for the DB seed.
 * Live connector data overrides these values when available.
 * ───────────────────────────────────────────────────────────────────────────── */

export const EVENT_DATE = "2026-06-18";
/** Build an ISO timestamp at a given HH:mm in event-local time (ET / EDT = -04:00). */
const t = (hhmm: string) => `${EVENT_DATE}T${hhmm}:00-04:00`;

export const wpEvent = {
  id: "white-party-2026",
  name: "White Party 2026",
  venue: "Lake Isle Country Club · Poolside",
  date: EVENT_DATE,
  doors: t("20:00"),
  hardClose: t("01:00"),
  released: t("02:00"),
  capacity: null as number | null, // §7 — pool capacity not yet provided (see SETUP.md)
  status: "scheduled" as const,
};

export type RosPhase =
  | "setup"
  | "doors"
  | "service"
  | "peak"
  | "feature"
  | "last_call"
  | "close"
  | "breakdown";

export interface RosCue {
  id: string;
  time: string;
  title: string;
  phase: RosPhase;
  detail: string;
  owner: string;
}

export const wpRunOfShow: RosCue[] = [
  { id: "ros-1400", time: t("14:00"), title: "Setup crew on site", phase: "setup", detail: "6–8 stage catering patio. Indoor bar prep begins.", owner: "Bar Manager" },
  { id: "ros-1500", time: t("15:00"), title: "Inventory check-in", phase: "setup", detail: "Bar manager + leads count 52 bottles / 31 cases, assign stations.", owner: "Bar Manager" },
  { id: "ros-1600", time: t("16:00"), title: "First wave bar prep", phase: "setup", detail: "2 leads + 2 barbacks: garnish (8 cases limes), batch 150 margaritas.", owner: "Station Leads" },
  { id: "ros-1800", time: t("18:00"), title: "Pool closes — bar moves in", phase: "setup", detail: "Rental relocates bar in 15 min. ALL hands. Critical window 17:30–20:00.", owner: "All Staff" },
  { id: "ros-1900", time: t("19:00"), title: "Transfer station live", phase: "setup", detail: "Glass→plastic at main entrance. NO GLASS AT POOL enforced.", owner: "Transfer Station" },
  { id: "ros-1930", time: t("19:30"), title: "Final team + security", phase: "setup", detail: "Cup transfer staff, security, last adds. Uniform check.", owner: "Security" },
  { id: "ros-2000", time: t("20:00"), title: "Doors open", phase: "doors", detail: "Launch. 0→95 drinks fast. Never leave the rail.", owner: "All Staff" },
  { id: "ros-2130", time: t("21:30"), title: "Fireworks", phase: "feature", detail: "Build phase. ~321 drinks 9–10pm.", owner: "Captain" },
  { id: "ros-2215", time: t("22:15"), title: "CO₂ shows (~15 min)", phase: "feature", detail: "Use the window to re-ice + restock all stations.", owner: "Barbacks" },
  { id: "ros-2230", time: t("22:30"), title: "Peak crush", phase: "peak", detail: "10:30–11:30 is the crush. ~506 drinks/hr. 84% of sales land 9pm–1am.", owner: "All Staff" },
  { id: "ros-0045", time: `2026-06-19T00:45:00-04:00`, title: "Last call", phase: "last_call", detail: "Announce clearly, multiple times, all bartenders.", owner: "Bar Manager" },
  { id: "ros-0100", time: `2026-06-19T01:00:00-04:00`, title: "Hard close — no drinks", phase: "close", detail: "Lights up, music down. Close stations 2 & 3.", owner: "Bar Manager" },
  { id: "ros-0130", time: `2026-06-19T01:30:00-04:00`, title: "Count + reconcile", phase: "close", detail: "Count drawers, reconcile handhelds, inventory tie-out, tips divided.", owner: "Bar Manager" },
  { id: "ros-0200", time: `2026-06-19T02:00:00-04:00`, title: "Staff released", phase: "breakdown", detail: "Bar secured, final walkthrough.", owner: "Bar Manager" },
];

export type CheckState = "scheduled" | "checked_in" | "on_break" | "clocked_out";

export interface SeedStaff {
  id: string;
  name: string;
  position: string;
  zone: string;
  callTime: string;
  endTime?: string | null;
  notes?: string | null;
  check: CheckState;
}

const groups: Array<{ position: string; count: number; call: string; zone: string; check: CheckState }> = [
  { position: "Bar Manager", count: 1, call: t("15:00"), zone: "Poolside Bar", check: "checked_in" },
  { position: "Station Lead", count: 4, call: t("16:00"), zone: "Poolside Bar", check: "checked_in" },
  { position: "Bartender · Floater", count: 2, call: t("18:00"), zone: "Poolside Bar", check: "scheduled" },
  { position: "Bartender · Flex", count: 1, call: t("14:00"), zone: "Indoor Bar", check: "checked_in" },
  { position: "Barback", count: 4, call: t("16:00"), zone: "Poolside Bar", check: "scheduled" },
  { position: "Glass Runner", count: 2, call: t("18:00"), zone: "Pool Deck", check: "scheduled" },
  { position: "Transfer Station", count: 2, call: t("19:30"), zone: "Entry / Transfer", check: "scheduled" },
  { position: "Indoor Bartender", count: 4, call: t("14:00"), zone: "Indoor Bar", check: "checked_in" },
  { position: "Indoor Barback", count: 1, call: t("14:00"), zone: "Indoor Bar", check: "checked_in" },
  { position: "VIP Server", count: 1, call: t("18:00"), zone: "VIP Deck", check: "scheduled" },
  { position: "Security", count: 2, call: t("19:30"), zone: "Entry / Transfer", check: "scheduled" },
  { position: "Setup Crew", count: 7, call: t("14:00"), zone: "Pool Deck", check: "clocked_out" },
];

export const wpStaff: SeedStaff[] = groups.flatMap((g) =>
  Array.from({ length: g.count }, (_, i) => ({
    id: `${g.position.toLowerCase().replace(/[^a-z]+/g, "-")}-${i + 1}`,
    name: g.count > 1 ? `${g.position} ${i + 1}` : g.position,
    position: g.position,
    zone: g.zone,
    callTime: g.call,
    check: g.check,
  })),
);

export interface SeedTask {
  id: string;
  title: string;
  detail?: string;
  done: boolean;
  completedBy?: string;
  completedAt?: string;
}
export interface SeedChecklist {
  id: string;
  name: string;
  kind: "opening" | "running" | "closing" | "admin";
  zone: string;
  zoneId?: string | null;
  items: SeedTask[];
}

export const wpChecklists: SeedChecklist[] = [
  {
    id: "cl-pool-open",
    name: "Poolside Bar — Opening",
    kind: "opening",
    zone: "Poolside Bar",
    items: [
      { id: "po-1", title: "Stage all poolside supplies", detail: "Cups (5,000), napkins, straws, mixers staged on patio 2–6pm.", done: true },
      { id: "po-2", title: "Prep garnishes", detail: "8 cases limes, 3 cases lemons.", done: true },
      { id: "po-3", title: "Batch 150 margaritas", detail: "6 gal margarita mix.", done: true },
      { id: "po-4", title: "Count inventory", detail: "52 bottles spirits, 31 cases beer — tie to sheet.", done: true },
      { id: "po-5", title: "Position bar + lay bar mats", detail: "6:00–6:20 after pool clears.", done: false },
      { id: "po-6", title: "Speed-stock 4 stations + ice wells", detail: "All hands 6:20–7:00. Identical stations.", done: false },
      { id: "po-7", title: "Test handhelds", done: false },
      { id: "po-8", title: "Set cash drawers", detail: "$250/station ($50 ones / $100 fives / $100 tens).", done: false },
      { id: "po-9", title: "Place NO GLASS AT POOL signage", detail: "Every entrance.", done: false },
    ],
  },
  {
    id: "cl-pool-run",
    name: "Poolside Bar — Running",
    kind: "running",
    zone: "Poolside Bar",
    items: [
      { id: "pr-1", title: "Transfer station: glass→plastic", detail: "Active 7pm–close at main entrance.", done: false },
      { id: "pr-2", title: "Re-ice + restock during CO₂ shows", detail: "~10:15–10:30pm window.", done: false },
      { id: "pr-3", title: "Hourly VIP spend checks", detail: "Track names + minimums; VIP bottles ring VIP button every time.", done: false },
      { id: "pr-4", title: "21+ wristband checks", detail: "Band + face must match. If not, don't serve.", done: false },
      { id: "pr-5", title: "No comps/voids without manager + POS log", done: false },
    ],
  },
  {
    id: "cl-pool-close",
    name: "Poolside Bar — Closing",
    kind: "closing",
    zone: "Poolside Bar",
    items: [
      { id: "pc-1", title: "12:30 scale down Station 4", detail: "If slow; move bartender to support, clean closed station.", done: false },
      { id: "pc-2", title: "12:45 last call announced", done: false },
      { id: "pc-3", title: "1:00 hard close — lights up", detail: "No drinks after 1am.", done: false },
      { id: "pc-4", title: "Count drawers + reconcile handhelds", done: false },
      { id: "pc-5", title: "Inventory tie-out", detail: "Must tie exactly.", done: false },
      { id: "pc-6", title: "Tips divided", done: false },
      { id: "pc-7", title: "2:00 secure bar + walkthrough", done: false },
    ],
  },
];

/** External-only metrics (Toast / SevenRooms) — seeded illustratively until connectors are live. */
export const wpMetricsSeed = {
  netSales: 18450,
  drinkCount: 642,
  guestsIn: 410,
  vipSpend: 8600,
  drinkTarget: 1426, // briefing target poolside
};

export const wpConnectors = [
  { id: "toast", label: "Toast", state: "stubbed" as const, note: "Awaiting creds — pattern reused from md-dashboard" },
  { id: "sevenrooms", label: "SevenRooms", state: "stubbed" as const, note: "Awaiting creds — direct 2_4 REST ready" },
  { id: "sling", label: "Sling", state: "stubbed" as const, note: "No API yet — roster seeded from briefing" },
  { id: "tripleseat", label: "Tripleseat", state: "off" as const, note: "Optional for this event" },
];

// ── Derived helpers ──────────────────────────────────────────────────────────
export const staffScheduled = wpStaff.length;
export const staffCheckedIn = wpStaff.filter((s) => s.check === "checked_in").length;
export const allTasks = wpChecklists.flatMap((c) => c.items);
export const tasksDone = allTasks.filter((x) => x.done).length;
export const tasksTotal = allTasks.length;

/** Returns the current + next run-of-show cue relative to `now`. Pre-event,
 *  "current" is the first cue and "next" is the second (never equal). */
export function nowNextCue(now: Date) {
  const ms = now.getTime();
  let idx = -1;
  for (let i = 0; i < wpRunOfShow.length; i++) {
    if (new Date(wpRunOfShow[i].time).getTime() <= ms) idx = i;
  }
  const preEvent = idx < 0;
  const current = preEvent ? wpRunOfShow[0] : wpRunOfShow[idx];
  const next = preEvent ? wpRunOfShow[1] : (wpRunOfShow[idx + 1] ?? null);
  return { current, next, preEvent };
}
