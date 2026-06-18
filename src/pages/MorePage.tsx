import { Card, Pill, SectionTitle } from "@/components/ui/primitives";
import { wpEvent } from "@/data/whiteParty";
import { Share2, Shield, Ruler, Wine, Crown, Settings, ChevronRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";

function Row({ icon: Icon, label, hint }: { icon: LucideIcon; label: string; hint?: string }) {
  return (
    <div className="flex items-center gap-3 px-3 py-3">
      <Icon className="h-4 w-4 text-gold" />
      <div className="flex-1">
        <div className="text-sm font-medium">{label}</div>
        {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </div>
  );
}

export function MorePage() {
  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="text-lg font-semibold">{wpEvent.name}</div>
        <div className="text-sm text-muted-foreground">{wpEvent.venue}</div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <Pill tone="gold">Thu Jun 18, 2026</Pill>
          <Pill tone="pool">Doors 8:00 PM</Pill>
          <Pill tone="crit">Hard close 1:00 AM</Pill>
        </div>
      </Card>

      <div>
        <SectionTitle>Manage</SectionTitle>
        <Card className="divide-y divide-border/60">
          <Row icon={Share2} label="Role share links" hint="Bartenders, captains, security — read-only" />
          <Row icon={Ruler} label="Floor plan calibration" hint="Locked · ft-per-unit from dimensioned base" />
          <Row icon={Wine} label="Bars & inventory" hint="4 poolside stations + indoor" />
          <Row icon={Crown} label="VIP tables" hint="Minimums, hosts, spend" />
          <Row icon={Shield} label="Roles & access" hint="Owner / manager / captain / staff" />
          <Row icon={Settings} label="Event settings" hint="Capacity, timeline, connectors" />
        </Card>
      </div>

      <p className="px-1 text-center text-xs text-muted-foreground">
        Gigante Event Ops · multi-venue platform · v0.1
      </p>
    </div>
  );
}
