import { useMemo } from "react";
import { useNow } from "@/hooks/useNow";
import { useEventData } from "@/hooks/useEventData";
import { useEventStore } from "@/state/eventStore";
import { pickNowNext } from "@/lib/runOfShow";
import { WeatherWidget } from "@/components/WeatherWidget";
import { EightySixBoard } from "@/components/EightySixBoard";
import { Card, Pill, SectionTitle } from "@/components/ui/primitives";
import {
  DollarSign, Users, Wine, UserCheck, Crown, CalendarCheck,
  DoorOpen, Activity, Clock, Radio, Sparkles,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

/* Owner-only live feed: the financials staff/managers' operational views don't lead with,
 * plus a real-time activity stream (clock-ins, arrivals, run-of-show, milestones). */

const money = (n: number | null | undefined) => (n == null ? "—" : `$${Number(n).toLocaleString()}`);
const num = (n: number | null | undefined) => (n == null ? "—" : Number(n).toLocaleString());
const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/New_York" });
const shortName = (name: string) => {
  const p = name.trim().split(/\s+/);
  if (p.length < 2) return name;
  const last = p[p.length - 1];
  if (/^\d+$/.test(last) || /^(additional|tbd)/i.test(p[0])) return name;
  return `${p[0]} ${last[0].toUpperCase()}.`;
};

type Tone = "ok" | "pool" | "gold" | "vip" | "crit" | "warn" | "muted";
// Literal class strings so Tailwind's JIT keeps them (no dynamic `bg-${tone}` interpolation).
const TONE: Record<Tone, { chip: string; text: string }> = {
  ok: { chip: "bg-ok/12", text: "text-ok" },
  pool: { chip: "bg-pool/12", text: "text-pool" },
  gold: { chip: "bg-gold/12", text: "text-gold" },
  vip: { chip: "bg-vip/12", text: "text-vip" },
  crit: { chip: "bg-crit/12", text: "text-crit" },
  warn: { chip: "bg-warn/12", text: "text-warn" },
  muted: { chip: "bg-muted/40", text: "text-muted-foreground" },
};

const PHASE_LABEL: Record<string, string> = {
  setup: "Setup", doors: "Doors", service: "Service", feature: "Show",
  peak: "Peak", last_call: "Last Call", close: "Close", breakdown: "Breakdown",
};
const PHASE_TONE: Record<string, Tone> = {
  setup: "muted", doors: "pool", service: "gold", feature: "vip",
  peak: "crit", last_call: "warn", close: "crit", breakdown: "muted",
};

interface FeedItem {
  id: string;
  ts: number;
  icon: LucideIcon;
  tone: Tone;
  title: string;
  sub?: string;
}

function Kpi({ icon: Icon, label, value, sub, tone }: {
  icon: LucideIcon; label: string; value: string; sub?: string; tone: Tone;
}) {
  return (
    <Card className="p-3">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <Icon className={`h-4 w-4 ${TONE[tone].text}`} />
        <span className="text-[11px] font-medium uppercase tracking-wide">{label}</span>
      </div>
      <div className="mt-1 text-2xl font-bold tabular-nums lg:text-3xl">{value}</div>
      {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
    </Card>
  );
}

export function FeedPage() {
  const now = useNow(15_000);
  const nowMs = now.getTime();
  const { metrics, reservations, staff, runOfShow } = useEventData();
  const token = useEventStore((s) => s.token);
  const bookedCovers = reservations.reduce((s: number, r: any) => s + (Number(r.party_size) || 0), 0);
  // Distinct people (a dual-role person has two assignment rows but is one body).
  const peopleCount = new Set(staff.map((s) => s.name)).size;
  const onClockCount = new Set(staff.filter((s) => s.check === "checked_in").map((s) => s.name)).size;
  const { current, next, preEvent } = pickNowNext(runOfShow, now);
  const phase = preEvent ? "setup" : (current?.phase ?? "setup");

  const items = useMemo(() => {
    const out: FeedItem[] = [];
    const seenClockIn = new Set<string>();
    for (const s of staff) {
      if (s.check === "checked_in" && s.checkInAt && !seenClockIn.has(s.name)) {
        seenClockIn.add(s.name);
        out.push({
          id: `ci-${s.id}`, ts: new Date(s.checkInAt).getTime(), icon: UserCheck, tone: "ok",
          title: `${shortName(s.name)} clocked in`, sub: s.position || undefined,
        });
      }
    }
    for (const r of reservations as any[]) {
      const st = String(r.status || "").toLowerCase();
      if ((st.includes("arriv") || st.includes("seat")) && r.arrival_time) {
        out.push({
          id: `res-${r.id ?? r.external_id}`, ts: new Date(r.arrival_time).getTime(), icon: DoorOpen, tone: "pool",
          title: `${r.guest_name || "Guest"} arrived`,
          sub: `party of ${r.party_size || "?"}${r.vip ? " · VIP" : ""}`,
        });
      }
    }
    for (const c of runOfShow) {
      const ts = new Date(c.time).getTime();
      if (ts <= nowMs) {
        out.push({
          id: `ros-${c.id}`, ts, icon: c.phase === "feature" ? Sparkles : Activity,
          tone: PHASE_TONE[c.phase] ?? "gold", title: c.title, sub: c.detail || undefined,
        });
      }
    }
    return out.sort((a, b) => b.ts - a.ts);
  }, [staff, reservations, runOfShow, nowMs]);

  const upcoming = runOfShow
    .filter((c) => new Date(c.time).getTime() > nowMs)
    .sort((a, b) => +new Date(a.time) - +new Date(b.time))
    .slice(0, 4);

  const rel = (ts: number) => {
    const m = Math.round((nowMs - ts) / 60000);
    if (m < 1) return "just now";
    if (m < 60) return `${m}m ago`;
    return `${Math.floor(m / 60)}h ${m % 60}m ago`;
  };
  const countdown = (iso: string) => {
    const m = Math.max(0, Math.round((new Date(iso).getTime() - nowMs) / 60000));
    return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`;
  };

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      {/* Now / phase banner */}
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between bg-gold/10 px-4 py-2">
          <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-gold">
            <Radio className="h-3.5 w-3.5" /> Owner feed · live
          </span>
          <div className="flex items-center gap-2">
            <Pill tone={PHASE_TONE[phase]}>{PHASE_LABEL[phase]}</Pill>
            {current && <span className="tabular-nums text-xs text-muted-foreground">{fmtTime(current.time)}</span>}
          </div>
        </div>
        <div className="px-4 py-3">
          {current ? (
            <>
              <div className="text-lg font-semibold">{current.title}</div>
              {current.detail && <p className="mt-0.5 text-sm text-muted-foreground">{current.detail}</p>}
            </>
          ) : (
            <div className="text-sm text-muted-foreground">Pre-event — setup underway.</div>
          )}
          {next && (
            <div className="mt-3 flex items-center gap-2 border-t border-border/60 pt-3 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="tabular-nums font-medium">{fmtTime(next.time)}</span>
              <span className="text-muted-foreground">· Next:</span>
              <span className="truncate font-medium">{next.title}</span>
              <span className="ml-auto shrink-0 tabular-nums text-xs text-muted-foreground">in {countdown(next.time)}</span>
            </div>
          )}
        </div>
      </Card>

      {/* Live KPIs */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <Kpi icon={DollarSign} label="Net sales" value={money(metrics.netSales)} sub="Toast · live" tone="gold" />
        <Kpi
          icon={Users}
          label="Guests in"
          value={num(metrics.guestsIn)}
          sub={bookedCovers ? `of ${bookedCovers} booked` : "—"}
          tone="pool"
        />
        <Kpi icon={Wine} label="Drinks" value={num(metrics.drinkCount)} sub={`of ${metrics.drinkTarget.toLocaleString()}`} tone="pool" />
        <Kpi icon={UserCheck} label="On the clock" value={num(onClockCount)} sub={`of ${peopleCount}`} tone="ok" />
        <Kpi icon={Crown} label="VIP spend" value={money(metrics.vipSpend)} sub="across tables" tone="vip" />
        <Kpi icon={CalendarCheck} label="Reservations" value={num(bookedCovers)} sub={`${reservations.length} parties`} tone="gold" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Activity stream */}
        <div className="space-y-2 lg:col-span-2">
          <SectionTitle right={<Pill tone="ok">live</Pill>}>Activity</SectionTitle>
          {items.length === 0 ? (
            <Card className="p-4 text-sm text-muted-foreground">
              No activity yet — clock-ins, arrivals, and run-of-show cues will stream in here as the night moves.
            </Card>
          ) : (
            <Card className="divide-y divide-border/60">
              {items.map((it) => {
                const Icon = it.icon;
                return (
                  <div key={it.id} className="flex items-start gap-3 px-3 py-2.5">
                    <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${TONE[it.tone].chip} ${TONE[it.tone].text}`}>
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium leading-snug">{it.title}</div>
                      {it.sub && <div className="truncate text-xs text-muted-foreground">{it.sub}</div>}
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="tabular-nums text-xs font-medium text-foreground">{fmtTime(new Date(it.ts).toISOString())}</div>
                      <div className="text-[10px] text-muted-foreground">{rel(it.ts)}</div>
                    </div>
                  </div>
                );
              })}
            </Card>
          )}
        </div>

        {/* Side rail */}
        <div className="space-y-4">
          {upcoming.length > 0 && (
            <div>
              <SectionTitle>Coming up</SectionTitle>
              <Card className="divide-y divide-border/60">
                {upcoming.map((c) => (
                  <div key={c.id} className="flex items-center gap-3 px-3 py-2.5">
                    <span className={`flex h-2 w-2 shrink-0 rounded-full ${TONE[PHASE_TONE[c.phase] ?? "gold"].chip.replace("/12", "")}`} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{c.title}</div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="tabular-nums text-xs font-semibold">{fmtTime(c.time)}</div>
                      <div className="text-[10px] text-muted-foreground">in {countdown(c.time)}</div>
                    </div>
                  </div>
                ))}
              </Card>
            </div>
          )}

          <WeatherWidget />

          {token && (
            <div>
              <SectionTitle>86 board</SectionTitle>
              <EightySixBoard token={token} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
