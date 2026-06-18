import { useNow } from "@/hooks/useNow";
import { Card, Pill, ProgressBar, SectionTitle, SeedBadge } from "@/components/ui/primitives";
import {
  wpMetricsSeed,
  wpConnectors,
  staffScheduled,
  staffCheckedIn,
  tasksDone,
  tasksTotal,
  nowNextCue,
} from "@/data/whiteParty";
import { Wine, Users, ListChecks, Crown, Activity, Clock } from "lucide-react";
import type { LucideIcon } from "lucide-react";

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
  const ring =
    tone === "pool" ? "text-pool" : tone === "ok" ? "text-ok" : tone === "vip" ? "text-vip" : "text-gold";
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

export function DashboardPage() {
  const now = useNow(15_000);
  const { current, next } = nowNextCue(now);
  const fmt = (iso: string) =>
    new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/New_York" });

  return (
    <div className="space-y-4">
      {/* Now / Next run-of-show */}
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

      {/* Live metrics */}
      <div>
        <SectionTitle right={<SeedBadge />}>Live numbers</SectionTitle>
        <div className="grid grid-cols-2 gap-2">
          <Stat icon={Wine} label="Net sales" value={`$${wpMetricsSeed.netSales.toLocaleString()}`} sub="Toast · poolside + indoor" />
          <Stat
            icon={Activity}
            label="Drinks"
            value={wpMetricsSeed.drinkCount.toLocaleString()}
            sub={`of ${wpMetricsSeed.drinkTarget.toLocaleString()} target`}
            tone="pool"
          />
          <Stat icon={Users} label="Guests in" value={wpMetricsSeed.guestsIn.toLocaleString()} sub="capacity —" tone="pool" />
          <Stat icon={Crown} label="VIP spend" value={`$${wpMetricsSeed.vipSpend.toLocaleString()}`} sub="across VIP tables" tone="vip" />
        </div>
      </div>

      {/* Staff + tasks roll-up */}
      <div className="grid grid-cols-2 gap-2">
        <Card className="p-3">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Users className="h-4 w-4 text-ok" />
            <span className="text-[11px] font-medium uppercase tracking-wide">Checked in</span>
          </div>
          <div className="mt-1 text-2xl font-bold tabular-nums">
            {staffCheckedIn}
            <span className="text-base font-medium text-muted-foreground"> / {staffScheduled}</span>
          </div>
          <div className="mt-2">
            <ProgressBar value={(staffCheckedIn / staffScheduled) * 100} tone="ok" />
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <ListChecks className="h-4 w-4 text-gold" />
            <span className="text-[11px] font-medium uppercase tracking-wide">Side work</span>
          </div>
          <div className="mt-1 text-2xl font-bold tabular-nums">
            {tasksDone}
            <span className="text-base font-medium text-muted-foreground"> / {tasksTotal}</span>
          </div>
          <div className="mt-2">
            <ProgressBar value={(tasksDone / tasksTotal) * 100} tone="gold" />
          </div>
        </Card>
      </div>

      {/* Connectors honesty row */}
      <div>
        <SectionTitle>Connectors</SectionTitle>
        <Card className="divide-y divide-border/60">
          {wpConnectors.map((c) => (
            <div key={c.id} className="flex items-center justify-between px-3 py-2.5">
              <div className="min-w-0">
                <div className="text-sm font-medium">{c.label}</div>
                <div className="truncate text-xs text-muted-foreground">{c.note}</div>
              </div>
              <Pill tone={c.state === "stubbed" ? "warn" : "muted"}>{c.state}</Pill>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}
