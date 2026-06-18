import { useState } from "react";
import { Sheet, Pill } from "@/components/ui/primitives";
import { Crown } from "lucide-react";

const statusTone: Record<string, "muted" | "pool" | "ok" | "warn"> = {
  open: "muted",
  seated: "pool",
  spending: "ok",
  closed: "warn",
};

type Mutate = (action: string, payload?: Record<string, unknown>) => Promise<any>;

function VipRow({ t, canEdit, mutate }: { t: any; canEdit: boolean; mutate: Mutate }) {
  const [spend, setSpend] = useState<number>(Number(t.current_spend ?? 0));
  const min = Number(t.minimum_spend ?? 0);
  const pct = min ? Math.min(100, (spend / min) * 100) : 0;
  return (
    <div className="rounded-lg border border-vip/30 bg-vip/5 p-3">
      <div className="flex items-center justify-between">
        <div className="flex min-w-0 items-center gap-2">
          <Crown className="h-4 w-4 shrink-0 text-vip" />
          <span className="font-semibold">{t.table_number}</span>
          {t.host_name && <span className="truncate text-sm text-muted-foreground">· {t.host_name}</span>}
        </div>
        <Pill tone={statusTone[t.status] ?? "muted"}>{t.status}</Pill>
      </div>
      <div className="mt-2 flex items-center justify-between text-sm">
        <span className="text-muted-foreground">min ${min.toLocaleString()}</span>
        <span className="tabular-nums font-semibold">${spend.toLocaleString()}</span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-vip transition-all" style={{ width: `${pct}%` }} />
      </div>
      {canEdit && (
        <div className="mt-2 flex gap-2">
          <input
            type="number"
            value={spend}
            onChange={(e) => setSpend(Number(e.target.value))}
            onBlur={() => void mutate("vip.update", { id: t.id, current_spend: spend })}
            className="w-28 rounded-lg border border-border bg-card px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-gold"
            placeholder="spend $"
          />
          <select
            value={t.status}
            onChange={(e) => void mutate("vip.update", { id: t.id, status: e.target.value })}
            className="flex-1 rounded-lg border border-border bg-card px-2 py-1.5 text-sm outline-none"
          >
            <option value="open">open</option>
            <option value="seated">seated</option>
            <option value="spending">spending</option>
            <option value="closed">closed</option>
          </select>
        </div>
      )}
    </div>
  );
}

export function VipSheet({
  open,
  onClose,
  tables,
  canEdit,
  mutate,
}: {
  open: boolean;
  onClose: () => void;
  tables: any[];
  canEdit: boolean;
  mutate: Mutate;
}) {
  const totalSpend = tables.reduce((s, t) => s + Number(t.current_spend ?? 0), 0);
  return (
    <Sheet open={open} onClose={onClose} title="VIP Tables" subtitle={`${tables.length} tables · $${totalSpend.toLocaleString()} tracked`}>
      {tables.length === 0 ? (
        <p className="text-sm text-muted-foreground">No VIP tables yet.</p>
      ) : (
        <div className="space-y-2">
          {tables.map((t) => (
            <VipRow key={t.id} t={t} canEdit={canEdit} mutate={mutate} />
          ))}
        </div>
      )}
    </Sheet>
  );
}
