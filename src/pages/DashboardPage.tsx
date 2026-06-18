import { useNow } from "@/hooks/useNow";
import { useEventData } from "@/hooks/useEventData";
import { pickNowNext } from "@/lib/runOfShow";
import { RunOfShowRibbon } from "@/components/RunOfShowRibbon";
import { EightySixBoard } from "@/components/EightySixBoard";
import { useEventStore } from "@/state/eventStore";
import { Card, Pill, ProgressBar, SectionTitle, SeedBadge } from "@/components/ui/primitives";
import { Wine, Users, ListChecks, Crown, Activity, Clock } from "lucide-react";
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
  const { runOfShow, metrics, connectors, counts, metricsLive } = useEventData();
  const { current, next } = pickNowNext(runOfShow, now);
  const token = useEventStore((s) => s.token);
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
            <span className="tabular-nums text-xs text-muted-foreground">{fmt(current.time)}</span>
          </div>
          <div className="px-4 py-3">
            <div className="text-lg font-semibold">{current.title}</div>
            <p className="mt-0.5 text-sm text-muted-foreground">{current.detail}</p>
            {next && (
              <div className="mt-3 flex items-center gap-2 border-t border-border/60 pt-3 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="tabular-nums font-medium text-foreground">{fmt(next.time)}</span>
                <span className="text-muted-foreground">· Next:</span>
                <span className="font-medium">{next.title}</span>
              </div>
            )}
          </div>
        </Card>
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
            sub={metrics.capacity ? `of ${metrics.capacity} cap` : "capacity —"}
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
