import { useState } from "react";
import { Card, Pill, SectionTitle } from "@/components/ui/primitives";
import { useEventData } from "@/hooks/useEventData";
import { useEventStore } from "@/state/eventStore";
import { ShareSheet } from "@/components/ShareSheet";
import { VipSheet } from "@/components/VipSheet";
import { ROLE_LABELS } from "@/lib/types";
import { Share2, Shield, Ruler, Wine, Crown, Settings, ChevronRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";

function Row({
  icon: Icon,
  label,
  hint,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  hint?: string;
  onClick?: () => void;
}) {
  return (
    <button onClick={onClick} disabled={!onClick} className="flex w-full items-center gap-3 px-3 py-3 text-left disabled:opacity-100">
      <Icon className="h-4 w-4 text-gold" />
      <div className="flex-1">
        <div className="text-sm font-medium">{label}</div>
        {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
      </div>
      {onClick && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
    </button>
  );
}

export function MorePage() {
  const { event, role, isLive, metrics, vipTables, canEdit, mutate } = useEventData();
  const token = useEventStore((s) => s.token);
  const [shareOpen, setShareOpen] = useState(false);
  const [vipOpen, setVipOpen] = useState(false);
  const canManage = role === "owner" || role === "manager";

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="text-lg font-semibold">{event.name}</div>
        <div className="text-sm text-muted-foreground">{event.venue}</div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <Pill tone="gold">Thu Jun 18, 2026</Pill>
          <Pill tone="pool">Doors 8:00 PM</Pill>
          <Pill tone="crit">Hard close 1:00 AM</Pill>
        </div>
      </Card>

      <Card className="flex items-center justify-between p-4">
        <div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Your access</div>
          <div className="text-base font-semibold text-gold">{ROLE_LABELS[role]}</div>
        </div>
        <Pill tone={isLive ? "ok" : "warn"}>{isLive ? "live" : "offline / seed"}</Pill>
      </Card>

      <div>
        <SectionTitle>Manage</SectionTitle>
        <Card className="divide-y divide-border/60">
          {canManage && token && (
            <Row icon={Share2} label="Role share links" hint="Bartenders, captains, security — scoped + revocable" onClick={() => setShareOpen(true)} />
          )}
          <Row icon={Ruler} label="Floor plan calibration" hint="Locked · 0.028 ft/unit · 336 × 184 ft" />
          <Row icon={Wine} label="Bars & inventory" hint="4 poolside stations + indoor" />
          <Row
            icon={Crown}
            label="VIP tables"
            hint={metrics.vipSpend != null ? `$${metrics.vipSpend.toLocaleString()} tracked` : "Minimums, hosts, spend"}
            onClick={() => setVipOpen(true)}
          />
          <Row icon={Shield} label="Roles & access" hint="owner / manager / captain / bar_lead / staff / security" />
          <Row icon={Settings} label="Event settings" hint="Capacity, timeline, connectors" />
        </Card>
      </div>

      <p className="px-1 text-center text-xs text-muted-foreground">Gigante Event Ops · multi-venue platform · v0.1</p>

      {token && <ShareSheet open={shareOpen} onClose={() => setShareOpen(false)} token={token} />}
      <VipSheet open={vipOpen} onClose={() => setVipOpen(false)} tables={vipTables} canEdit={canEdit} mutate={mutate} />
    </div>
  );
}
