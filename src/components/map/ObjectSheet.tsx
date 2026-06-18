import { Sheet, Pill } from "@/components/ui/primitives";
import { kindOf, CATEGORY_LABELS } from "@/lib/catalogIndex";
import type { FloorMapObject } from "./FloorMap";
import type { SeedStaff, CheckState } from "@/data/whiteParty";
import { Phone, Ruler, Lock, MapPin, Check, Flag } from "lucide-react";

const STATUS_TONE: Record<string, "ok" | "warn" | "crit" | "vip" | "muted"> = {
  ok: "ok",
  setup: "warn",
  attention: "warn",
  down: "crit",
  vip: "vip",
};
const STATUSES = ["ok", "setup", "attention", "down", "vip"] as const;

const checkTone: Record<CheckState, "ok" | "warn" | "muted" | "pool"> = {
  checked_in: "ok",
  scheduled: "warn",
  on_break: "pool",
  clocked_out: "muted",
};

function ftIn(ft: number): string {
  const totalIn = Math.round(ft * 12);
  const f = Math.floor(totalIn / 12);
  const i = totalIn % 12;
  return i ? `${f}'${i}"` : `${f}'`;
}

function rulesFor(o: FloorMapObject): { title: string; items: string[] } | null {
  const k = o.kind;
  if (o.status === "vip" || k === "cabana" || k === "pool-daybed") {
    return {
      title: "VIP service",
      items: [
        "VIP bottles ring the VIP button — every time",
        "Hourly spend checks vs. minimum",
        "Managed tab through the VIP server",
      ],
    };
  }
  if (o.category === "bar") {
    return {
      title: "Bar rules",
      items: [
        "Speed first — never leave the rail",
        "21+ wristband: band + face must match, or don't serve",
        "No comps/voids without a manager + POS log",
        "Close every round on the spot — card/tap, no cash",
      ],
    };
  }
  if (o.category === "pool" || k === "transfer-station") {
    return {
      title: "Pool rules",
      items: [
        "NO GLASS AT POOL — zero tolerance",
        "All drinks in plastic cups; beer from cans only",
        "Transfer station (glass→plastic) active 7pm–close",
      ],
    };
  }
  if (o.category === "stage") {
    return {
      title: "Stage / AV",
      items: ["Cue with the captain", "Re-ice + restock during CO₂ shows (~10:15pm)"],
    };
  }
  return null;
}

interface Props {
  obj: FloorMapObject | null;
  zoneName: string | null;
  staffInZone: SeedStaff[];
  canEdit: boolean;
  onClose: () => void;
  onStatus: (status: string) => void;
}

export function ObjectSheet({ obj, zoneName, staffInZone, canEdit, onClose, onStatus }: Props) {
  if (!obj) return null;
  const def = kindOf(obj.kind);
  const rules = rulesFor(obj);
  const title = obj.label ?? def?.label ?? obj.kind;

  return (
    <Sheet
      open={!!obj}
      onClose={onClose}
      title={title}
      subtitle={`${def?.label ?? obj.kind} · ${CATEGORY_LABELS[obj.category as keyof typeof CATEGORY_LABELS] ?? obj.category}`}
    >
      <div className="space-y-4">
        {/* Status + facts */}
        <div className="flex flex-wrap items-center gap-1.5">
          <Pill tone={STATUS_TONE[obj.status] ?? "muted"}>{obj.status}</Pill>
          {zoneName && (
            <Pill tone="muted">
              <MapPin className="h-3 w-3" /> {zoneName}
            </Pill>
          )}
          <Pill tone="muted">
            <Ruler className="h-3 w-3" /> {ftIn(obj.width_ft)} × {ftIn(obj.height_ft)}
          </Pill>
          {obj.locked && (
            <Pill tone="warn">
              <Lock className="h-3 w-3" /> locked
            </Pill>
          )}
        </div>

        {canEdit && (
          <div className="flex gap-2">
            <button
              onClick={() => onStatus("ok")}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-ok/40 bg-ok/10 py-2.5 text-sm font-semibold text-ok active:opacity-80"
            >
              <Check className="h-4 w-4" /> Ready
            </button>
            <button
              onClick={() => onStatus("attention")}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-warn/40 bg-warn/10 py-2.5 text-sm font-semibold text-warn active:opacity-80"
            >
              <Flag className="h-4 w-4" /> Flag
            </button>
          </div>
        )}

        {/* Editor: status changer */}
        {canEdit && (
          <div>
            <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Set status</div>
            <div className="flex flex-wrap gap-1.5">
              {STATUSES.map((s) => (
                <button key={s} onClick={() => onStatus(s)}>
                  <Pill tone={obj.status === s ? STATUS_TONE[s] : "muted"} className={obj.status === s ? "ring-1 ring-current" : ""}>
                    {s}
                  </Pill>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Rules */}
        {rules && (
          <div className="rounded-lg border border-border bg-card p-3">
            <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gold">{rules.title}</div>
            <ul className="space-y-1">
              {rules.items.map((r) => (
                <li key={r} className="flex gap-2 text-sm text-muted-foreground">
                  <span className="text-gold">·</span>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Staff in zone */}
        <div>
          <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {zoneName ? `Staff · ${zoneName}` : "Staff"}
          </div>
          {staffInZone.length === 0 ? (
            <p className="text-sm text-muted-foreground">No staff assigned to this area yet.</p>
          ) : (
            <div className="divide-y divide-border/60 overflow-hidden rounded-lg border border-border">
              {staffInZone.slice(0, 10).map((s) => (
                <div key={s.id} className="flex items-center justify-between px-3 py-2">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{s.name}</div>
                    <div className="truncate text-xs text-muted-foreground">{s.position}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Pill tone={checkTone[s.check]}>{s.check.replace("_", " ")}</Pill>
                    <a
                      href="tel:"
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-muted-foreground"
                      aria-label="Call"
                    >
                      <Phone className="h-3.5 w-3.5" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Sheet>
  );
}
