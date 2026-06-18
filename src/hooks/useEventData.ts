import { useEventStore } from "@/state/eventStore";
import { canEdit, type Role } from "@/lib/types";
import * as seed from "@/data/whiteParty";
import type { SeedStaff, SeedChecklist, RosCue, CheckState } from "@/data/whiteParty";

const CONNECTOR_LABELS: Record<string, string> = {
  toast: "Toast",
  sevenrooms: "SevenRooms",
  sling: "Sling",
  tripleseat: "Tripleseat",
};

export interface EventData {
  isLive: boolean;
  status: string;
  role: Role;
  canEdit: boolean;
  metricsLive: boolean;
  event: { name: string; venue: string; doors: string | null; hardClose: string | null; capacity: number | null };
  staff: SeedStaff[];
  checklists: SeedChecklist[];
  runOfShow: RosCue[];
  metrics: {
    netSales: number | null;
    drinkCount: number | null;
    guestsIn: number | null;
    vipSpend: number | null;
    drinkTarget: number;
    capacity: number | null;
  };
  connectors: { id: string; label: string; state: string; note: string }[];
  counts: { staffScheduled: number; staffCheckedIn: number; tasksDone: number; tasksTotal: number };
  floorPlan: any | null;
  zones: any[];
  objects: any[];
  vipTables: any[];
  reservations: any[];
  mutate: (action: string, payload?: Record<string, unknown>) => Promise<any>;
  lastSync: number | null;
}

export function useEventData(): EventData {
  const snapshot = useEventStore((s) => s.snapshot);
  const status = useEventStore((s) => s.status);
  const role = useEventStore((s) => s.role);
  const mutate = useEventStore((s) => s.mutate);
  const lastSync = useEventStore((s) => s.lastSync);

  const isLive = status === "live" && !!snapshot;

  if (!isLive || !snapshot) {
    const conns = seed.wpConnectors.map((c) => ({ id: c.id, label: c.label, state: c.state, note: c.note }));
    return {
      isLive: false,
      status,
      role: "owner",
      canEdit: true,
      metricsLive: false,
      event: {
        name: seed.wpEvent.name,
        venue: seed.wpEvent.venue,
        doors: seed.wpEvent.doors,
        hardClose: seed.wpEvent.hardClose,
        capacity: seed.wpEvent.capacity,
      },
      staff: seed.wpStaff,
      checklists: seed.wpChecklists,
      runOfShow: seed.wpRunOfShow,
      metrics: { ...seed.wpMetricsSeed, capacity: seed.wpEvent.capacity },
      connectors: conns,
      counts: {
        staffScheduled: seed.staffScheduled,
        staffCheckedIn: seed.staffCheckedIn,
        tasksDone: seed.tasksDone,
        tasksTotal: seed.tasksTotal,
      },
      floorPlan: null,
      zones: [],
      objects: [],
      vipTables: [],
      reservations: [],
      mutate,
      lastSync,
    };
  }

  const zonesById: Record<string, string> = {};
  for (const z of snapshot.zones) zonesById[z.id] = z.name;

  const staff: SeedStaff[] = snapshot.staff.map((s: any) => ({
    id: s.id,
    name: s.name,
    position: s.position_name ?? "",
    zone: zonesById[s.zone_id] ?? "—",
    callTime: s.call_time,
    check: (s.check_in ?? "scheduled") as CheckState,
  }));

  const checklists: SeedChecklist[] = [...snapshot.checklists]
    .sort((a: any, b: any) => a.sort - b.sort)
    .map((c: any) => ({
      id: c.id,
      name: c.name,
      kind: c.kind,
      zone: zonesById[c.zone_id] ?? "",
      items: snapshot.tasks
        .filter((t: any) => t.checklist_id === c.id)
        .sort((a: any, b: any) => a.sort - b.sort)
        .map((t: any) => ({ id: t.id, title: t.title, detail: t.detail ?? undefined, done: t.status === "done" })),
    }));

  const runOfShow: RosCue[] = snapshot.run_of_show.map((r: any) => ({
    id: r.id,
    time: r.time,
    title: r.title,
    phase: r.phase,
    detail: r.detail ?? "",
    owner: "",
  }));

  const m = snapshot.metrics ?? {};
  const metrics = {
    netSales: m.net_sales ?? null,
    drinkCount: m.drink_count ?? null,
    guestsIn: m.guests_in ?? null,
    vipSpend: m.vip_spend ?? null,
    drinkTarget: 1426,
    capacity: m.capacity ?? snapshot.event?.capacity ?? null,
  };

  const connectors = snapshot.connectors.map((c: any) => ({
    id: c.connector,
    label: CONNECTOR_LABELS[c.connector] ?? c.connector,
    state: c.state,
    note: c.message ?? "",
  }));
  const metricsLive = connectors.some(
    (c) => ["toast", "sevenrooms"].includes(c.id) && ["live", "polling"].includes(c.state),
  );

  const staffCheckedIn = staff.filter((s) => s.check === "checked_in").length;
  const allTasks = checklists.flatMap((c) => c.items);

  const r: Role = (role ?? "readonly") as Role;
  return {
    isLive: true,
    status,
    role: r,
    canEdit: canEdit(r),
    metricsLive,
    event: {
      name: snapshot.event?.name ?? "Event",
      venue: snapshot.venue?.name ?? "Lake Isle Country Club",
      doors: snapshot.event?.starts_at ?? null,
      hardClose: snapshot.event?.ends_at ?? null,
      capacity: snapshot.event?.capacity ?? null,
    },
    staff,
    checklists,
    runOfShow,
    metrics,
    connectors,
    counts: {
      staffScheduled: staff.length,
      staffCheckedIn,
      tasksDone: allTasks.filter((t) => t.done).length,
      tasksTotal: allTasks.length,
    },
    floorPlan: snapshot.floor_plan,
    zones: snapshot.zones,
    objects: snapshot.objects,
    vipTables: snapshot.vip_tables,
    reservations: snapshot.reservations,
    mutate,
    lastSync,
  };
}
