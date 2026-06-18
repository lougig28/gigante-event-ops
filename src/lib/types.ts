/* ─────────────────────────────────────────────────────────────────────────────
 * Gigante Event Ops — shared domain model
 * Event-agnostic, multi-venue. This is the contract the UI, the Supabase schema,
 * and the connectors all align to. DB columns are snake_case; these app types are
 * camelCase and mapped in the data layer.
 * ───────────────────────────────────────────────────────────────────────────── */

// ── Roles & access ───────────────────────────────────────────────────────────
export type Role =
  | "owner" // Lou / admin — full author + settings
  | "manager" // event manager — author timelines, staffing, tasks, bar/VIP
  | "captain" // floor captain — assign, fire food, update task/section state
  | "bar_lead" // bar manager — bars, VIP, inventory, bar staff
  | "staff" // line staff — read + complete own tasks / check in
  | "security" // door/security — capacity, entry, incidents
  | "readonly"; // share-link viewer — read-only, scoped

export const ROLE_LABELS: Record<Role, string> = {
  owner: "Owner",
  manager: "Manager",
  captain: "Captain",
  bar_lead: "Bar Lead",
  staff: "Staff",
  security: "Security",
  readonly: "Viewer",
};

/** Roles allowed to author/edit (vs. read-only). */
export const EDITOR_ROLES: Role[] = ["owner", "manager", "captain", "bar_lead", "security"];
export const canEdit = (r: Role) => EDITOR_ROLES.includes(r);

// ── Venue & event ────────────────────────────────────────────────────────────
export interface Venue {
  id: string;
  name: string; // "Lake Isle — Poolside", "Mulino's at Lake Isle", "Tulum"
  slug: string;
  timezone: string; // IANA, e.g. "America/New_York"
}

export type EventStatus = "draft" | "scheduled" | "live" | "closed" | "archived";

export interface EventRecord {
  id: string;
  venueId: string;
  name: string; // "White Party 2026"
  slug: string; // "white-party-2026"
  status: EventStatus;
  startsAt: string; // ISO — doors / event start
  endsAt: string; // ISO — hard close
  date: string; // YYYY-MM-DD (local)
  capacity: number | null; // pool/venue capacity (§7)
  notes: string | null;
  floorPlanId: string | null;
}

// ── Floor plan & calibration ─────────────────────────────────────────────────
/** The locked base diagram. Calibrate ftPerUnit ONCE, lock it; everything is an
 *  overlay rendered in plan-unit coordinates (the SVG/image native space). */
export interface FloorPlan {
  id: string;
  venueId: string;
  name: string;
  imageUrl: string; // rendered base PNG (Storage)
  baseWidth: number; // native plan units (== SVG viewBox width)
  baseHeight: number; // native plan units
  /** Real-world feet per 1 plan unit. The single calibration constant. */
  ftPerUnit: number;
  calibrationNote: string | null; // how it was derived / reference dimension
  locked: boolean;
}

// ── Object library (§10) ─────────────────────────────────────────────────────
export type ObjectCategory =
  | "seating" // tables / chairs / lounge
  | "bar" // bars & service
  | "stage" // stage / dance / AV
  | "structure" // entry / flow / walls / tents
  | "decor" // decor / effects
  | "pool" // pool-specific
  | "boh" // BOH / ops
  | "markup"; // text / arrows / zones / dimensions

/** Shape used to render & hit-test an object on the canvas. */
export type ObjectShape = "rect" | "circle" | "polygon" | "icon" | "line" | "text";

/** A library entry: a placeable object kind with a real-world default size. */
export interface ObjectKind {
  kind: string; // stable id, e.g. "round-60", "bar-station", "dj-booth"
  category: ObjectCategory;
  label: string;
  shape: ObjectShape;
  /** Real-world default footprint in feet. */
  defaultWidthFt: number;
  defaultHeightFt: number;
  /** Default seat count where relevant (tables). */
  seats?: number;
  color?: string; // token name or hex; overridable per instance
  icon?: string; // lucide icon name for icon-shape objects
  resizable?: boolean; // default true
  keepAspect?: boolean; // lock aspect on resize (e.g. round tables)
  description?: string;
}

export type ObjectOpsStatus = "ok" | "setup" | "attention" | "down" | "vip";

/** A placed instance on a floor plan. Position/size in plan units + feet. */
export interface LayoutObject {
  id: string;
  eventId: string;
  floorPlanId: string;
  kind: string; // -> ObjectKind.kind
  category: ObjectCategory;
  label: string | null;
  /** Center position in plan units. */
  x: number;
  y: number;
  /** Real-world size in feet (authoritative); pixel size derived via ftPerUnit. */
  widthFt: number;
  heightFt: number;
  rotation: number; // degrees
  z: number; // stack order
  locked: boolean;
  zoneId: string | null;
  color: string | null; // per-instance override
  status: ObjectOpsStatus;
  /** Per-kind structured props (table number, seats, bar station #, vip min, etc). */
  props: Record<string, unknown>;
  /** Staff assigned to this object (server, bartender, captain…). */
  assignedStaffIds: string[];
  updatedAt: string;
  updatedBy: string | null;
}

// ── Zones ────────────────────────────────────────────────────────────────────
export interface Zone {
  id: string;
  eventId: string;
  floorPlanId: string;
  name: string; // "VIP Deck", "Poolside Bar", "Dance Floor", "Entry / Transfer"
  /** Polygon in plan units. */
  points: Array<{ x: number; y: number }>;
  color: string;
  capacity: number | null;
  managerId: string | null;
  notes: string | null;
}

// ── Staffing ─────────────────────────────────────────────────────────────────
export type CheckInState = "scheduled" | "checked_in" | "on_break" | "clocked_out" | "no_show";

export interface Position {
  id: string;
  name: string; // "Station Lead", "Barback", "Glass Runner", "Transfer Station"
  category: ObjectCategory | "service" | "support" | "security" | "management";
  color?: string;
}

export interface StaffMember {
  id: string;
  eventId: string;
  name: string;
  positionId: string | null;
  positionName: string | null; // denormalized for display
  phone: string | null;
  /** Scheduled call/arrival time (ISO). From Sling/seed. */
  callTime: string | null;
  /** Live clock-in from Toast (via Sling↔Toast). */
  checkIn: CheckInState;
  checkInAt: string | null;
  /** Station / object / zone they're assigned to. */
  stationLabel: string | null;
  zoneId: string | null;
  slingId: string | null; // source id when Sling integration lands
  toastEmployeeId: string | null;
  notes: string | null;
}

// ── Run of show ──────────────────────────────────────────────────────────────
export type RunOfShowPhase =
  | "setup"
  | "doors"
  | "service"
  | "peak"
  | "feature" // fireworks / CO2 shows
  | "last_call"
  | "close"
  | "breakdown";

export interface RunOfShowItem {
  id: string;
  eventId: string;
  time: string; // ISO timestamp for the cue
  title: string; // "Doors open", "Fireworks", "CO2 shows", "Hard close — no drinks"
  phase: RunOfShowPhase;
  detail: string | null;
  ownerRole: Role | null; // who runs it
  zoneId: string | null;
  done: boolean;
  sort: number;
}

// ── Tasks / side-work / checklists ───────────────────────────────────────────
export type ChecklistKind = "opening" | "running" | "closing" | "admin";
export type TaskStatus = "todo" | "in_progress" | "done" | "blocked";

export interface Checklist {
  id: string;
  eventId: string;
  name: string; // "Poolside Bar — Opening", "Transfer Station — Running"
  kind: ChecklistKind;
  zoneId: string | null;
  ownerRole: Role | null;
  sort: number;
}

export interface TaskItem {
  id: string;
  eventId: string;
  checklistId: string | null;
  title: string;
  detail: string | null;
  status: TaskStatus;
  /** Optional scheduled/cue time. */
  dueTime: string | null;
  assignedStaffId: string | null;
  assignedRole: Role | null;
  zoneId: string | null;
  objectId: string | null; // tie a task to a map object (e.g. a bar station)
  completedAt: string | null;
  completedBy: string | null;
  sort: number;
}

// ── Bars & VIP ───────────────────────────────────────────────────────────────
export interface Bar {
  id: string;
  eventId: string;
  name: string; // "Poolside Bar", "Indoor Bar"
  zoneId: string | null;
  stationCount: number;
  staffCount: number;
  notes: string | null;
}

export interface VipTable {
  id: string;
  eventId: string;
  tableNumber: string; // "VIP 1"
  objectId: string | null; // linked map object
  hostName: string | null;
  serverStaffId: string | null;
  minimumSpend: number | null;
  partySize: number | null;
  status: "open" | "seated" | "spending" | "closed";
  currentSpend: number | null;
  notes: string | null;
}

// ── Live metrics (dashboard) ─────────────────────────────────────────────────
export interface LiveMetrics {
  eventId: string;
  asOf: string;
  netSales: number | null; // Toast
  drinkCount: number | null;
  guestsIn: number | null; // SevenRooms arrivals / door
  capacity: number | null;
  staffScheduled: number;
  staffCheckedIn: number;
  tasksDone: number;
  tasksTotal: number;
  vipSpend: number | null;
}

// ── Reservations (SevenRooms) ────────────────────────────────────────────────
export interface Reservation {
  id: string;
  eventId: string;
  guestName: string;
  partySize: number;
  arrivalTime: string | null;
  tableAssignment: string | null;
  status: string; // booked / arrived / seated / no-show
  tags: string[];
  vip: boolean;
  notes: string | null;
  source: "sevenrooms" | "manual";
  externalId: string | null;
}

// ── Sharing & audit ──────────────────────────────────────────────────────────
export interface ShareLink {
  id: string;
  eventId: string;
  token: string;
  role: Role;
  label: string; // "Bartenders — read only", "Captains"
  zoneScope: string[] | null; // limit to zones, null = all
  expiresAt: string | null;
  revoked: boolean;
  createdBy: string;
  createdAt: string;
}

export interface AuditEvent {
  id: string;
  eventId: string;
  at: string;
  actor: string; // user id or share-link label
  actorRole: Role;
  action: string; // "object.move", "task.complete", "ros.edit", "vip.update"
  entity: string; // table/entity name
  entityId: string;
  summary: string; // human-readable
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
}

// ── Connector sync status (shown in UI; honesty about live vs seed) ──────────
export type ConnectorId = "toast" | "sevenrooms" | "sling" | "tripleseat";
export type SyncState = "live" | "polling" | "stale" | "stubbed" | "error" | "off";

export interface ConnectorStatus {
  id: ConnectorId;
  state: SyncState;
  lastSyncAt: string | null;
  message: string | null;
}
