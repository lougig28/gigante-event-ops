import { useNow } from "@/hooks/useNow";
import { useEventData } from "@/hooks/useEventData";
import { pickNowNext } from "@/lib/runOfShow";
import { RunOfShowRibbon } from "@/components/RunOfShowRibbon";
import { WeatherWidget } from "@/components/WeatherWidget";
import { EightySixBoard } from "@/components/EightySixBoard";
import { useEventStore } from "@/state/eventStore";
import { Card, Pill, ProgressBar, SectionTitle, SeedBadge } from "@/components/ui/primitives";
import { Wine, Users, ListChecks, Crown, Activity, Clock, AlertTriangle } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const money = (n: number | null) => (n == null ? "—" : `$${n.toLocaleString()}`);
const num = (n: number | null) => (n == null ? "—" : n.toLocaleString());

function Stat({
  icon: Icon,
  label,
  value,
  sub,
  tone = "gold",
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  sub?: string;
  tone?: "gold" | "pool" | "ok" | "vip";
}) {
  const ring = tone === "pool" ? "text-pool" : tone === "ok" ? "text-ok" : tone === "vip" ? "text-vip" : "text-gold";
  return (
    <Card className="p-3">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <Icon className={`h-4 w-4 ${ring}`} />
        <span className="text-[11px] font-medium uppercase tracking-wide">{label}</span>
      </div>
      <div className="mt-1 text-2xl font-bold tabular-nums">{value}</div>
      {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
    </Card>
  );
}

const connTone = (state: string) =>
  state === "live" || state === "polling" ? "ok" : state === "error" ? "crit" : state === "off" ? "muted" : "warn";

export function DashboardPage() {
  const now = useNow(15_000);
  const { runOfShow, metrics, connectors, counts, metricsLive, staff, reservations } = useEventData();
  const bookedCovers = reservations.reduce((s: number, r: any) => s + (Number(r.party_size) || 0), 0);
  const { current, next, preEvent } = pickNowNext(runOfShow, now);
  const token = useEventStore((s) => s.token);

  const PHASE_LABEL: Record<string, string> = {
    setup: "Setup", doors: "Doors", service: "Service", feature: "Show",
    peak: "Peak", last_call: "Last Call", close: "Close", breakdown: "Breakdown",
  };
  const PHASE_TONE: Record<string, "muted" | "pool" | "gold" | "vip" | "crit" | "warn"> = {
    setup: "muted", doors: "pool", service: "gold", feature: "vip",
    peak: "crit", last_call: "warn", close: "crit", breakdown: "muted",
  };
  const phase = preEvent ? "setup" : (current?.phase ?? "setup");

  const nowMs = now.getTime();
  const alerts: { id: string; tone: "warn" | "crit"; text: string }[] = [];
  if (!preEvent) {
    const overdue = staff.filter((s) => s.check === "scheduled" && s.callTime && new Date(s.callTime).getTime() < nowMs);
    if (overdue.length) alerts.push({ id: "cov", tone: "warn", text: `${overdue.length} staff past call time, not checked in` });
    if (counts.tasksTotal && counts.tasksDone / counts.tasksTotal < 0.5)
      alerts.push({ id: "sw", tone: "warn", text: `Side work ${Math.round((counts.tasksDone / counts.tasksTotal) * 100)}% — ${counts.tasksTotal - counts.tasksDone} tasks open` });
  }
  const peakCue = runOfShow.find((c) => c.phase === "peak");
  if (peakCue) {
    const m = (new Date(peakCue.time).getTime() - nowMs) / 60000;
    if (m > 0 && m < 60) alerts.push({ id: "pk", tone: "warn", text: `Peak crush in ${Math.round(m)} min — all hands to the rail` });
  }
  const lcCue = runOfShow.find((c) => c.phase === "last_call");
  if (lcCue) {
    const m = (new Date(lcCue.time).getTime() - nowMs) / 60000;
    if (m > 0 && m < 90) alerts.push({ id: "lc", tone: "crit", text: `Last call in ${Math.round(m)} min` });
  }
  const fmt = (iso: string) =>
    new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/New_York" });

  return (
    <div className="space-y-4">
      {current && (
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between bg-gold/10 px-4 py-2">
            <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-gold">
              <Activity className="h-3.5 w-3.5" /> Now
            </span>
            <div className="flex items-center gap-2">
              <Pill tone={PHASE_TONE[phase]}>{PHASE_LABEL[phase]}</Pill>
              <span className="tabular-nums text-xs text-muted-foreground">{fmt(current.time)}</span>
            </div>
          </div>
          <div className="px-4 py-3">
            <div className="text-lg font-semibold">{current.title}</div>
            <p className="mt-0.5 text-sm text-muted-foreground">{current.detail}</p>
            {next && (
              <div className="mt-3 flex items-center gap-2 border-t border-border/60 pt-3 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="tabular-nums font-medium text-foreground">{fmt(next.time)}</span>
                <span className="text-muted-foreground">· Next:</span>
                <span className="truncate font-medium">{next.title}</span>
                <span className="ml-auto shrink-0 tabular-nums text-xs text-muted-foreground">
                  in{" "}
                  {(() => {
                    const m = Math.max(0, Math.round((new Date(next.time).getTime() - now.getTime()) / 60000));
                    return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`;
                  })()}
                </span>
              </div>
            )}
          </div>
        </Card>
      )}

      <WeatherWidget />

      {alerts.length > 0 && (
        <div>
          <SectionTitle right={<Pill tone="crit">{alerts.length}</Pill>}>Alerts</SectionTitle>
          <div className="space-y-1.5">
            {alerts.map((a) => (
              <div
                key={a.id}
                className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${a.tone === "crit" ? "border-crit/40 bg-crit/10" : "border-warn/40 bg-warn/10"}`}
              >
                <AlertTriangle className={`h-4 w-4 shrink-0 ${a.tone === "crit" ? "text-crit" : "text-warn"}`} />
                <span className="text-foreground">{a.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {runOfShow.length > 0 && (
        <div>
          <SectionTitle>Run of show</SectionTitle>
          <RunOfShowRibbon cues={runOfShow} now={now} />
        </div>
      )}

      <div>
        <SectionTitle right={!metricsLive ? <SeedBadge /> : <Pill tone="ok">live</Pill>}>Live numbers</SectionTitle>
        <div className="grid grid-cols-2 gap-2">
          <Stat icon={Wine} label="Net sales" value={money(metrics.netSales)} sub="Toast · poolside + indoor" />
          <Stat
            icon={Activity}
            label="Drinks"
            value={num(metrics.drinkCount)}
            sub={`of ${metrics.drinkTarget.toLocaleString()} target`}
            tone="pool"
          />
          <Stat
            icon={Users}
            label="Guests in"
            value={num(metrics.guestsIn)}
            sub={bookedCovers ? `of ${bookedCovers} booked` : metrics.capacity ? `of ${metrics.capacity} cap` : "capacity —"}
            tone="pool"
          />
          <Stat icon={Crown} label="VIP spend" value={money(metrics.vipSpend)} sub="across VIP tables" tone="vip" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Card className="p-3">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Users className="h-4 w-4 text-ok" />
            <span className="text-[11px] font-medium uppercase tracking-wide">Checked in</span>
          </div>
          <div className="mt-1 text-2xl font-bold tabular-nums">
            {counts.staffCheckedIn}
            <span className="text-base font-medium text-muted-foreground"> / {counts.staffScheduled}</span>
          </div>
          <div className="mt-2">
            <ProgressBar value={counts.staffScheduled ? (counts.staffCheckedIn / counts.staffScheduled) * 100 : 0} tone="ok" />
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <ListChecks className="h-4 w-4 text-gold" />
            <span className="text-[11px] font-medium uppercase tracking-wide">Side work</span>
          </div>
          <div className="mt-1 text-2xl font-bold tabular-nums">
            {counts.tasksDone}
            <span className="text-base font-medium text-muted-foreground"> / {counts.tasksTotal}</span>
          </div>
          <div className="mt-2">
            <ProgressBar value={counts.tasksTotal ? (counts.tasksDone / counts.tasksTotal) * 100 : 0} tone="gold" />
          </div>
        </Card>
      </div>

      {token && (
        <div>
          <SectionTitle>Operations</SectionTitle>
          <EightySixBoard token={token} />
        </div>
      )}

      <div>
        <SectionTitle>Connectors</SectionTitle>
        <Card className="divide-y divide-border/60">
          {connectors.map((c) => (
            <div key={c.id} className="flex items-center justify-between px-3 py-2.5">
              <div className="min-w-0">
                <div className="text-sm font-medium">{c.label}</div>
                <div className="truncate text-xs text-muted-foreground">{c.note}</div>
              </div>
              <Pill tone={connTone(c.state)}>{c.state}</Pill>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}
