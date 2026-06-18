import { useCallback, useEffect, useState } from "react";
import { Sheet, Pill } from "@/components/ui/primitives";
import { shareList, shareToggle, op } from "@/lib/api";
import { ROLE_LABELS, type Role } from "@/lib/types";
import { Copy, Check, Ban, RotateCcw } from "lucide-react";

const CREATE_ROLES: Role[] = ["manager", "captain", "bar_lead", "staff", "security", "readonly"];

const roleTone = (r: Role): "gold" | "pool" | "vip" | "ok" | "muted" =>
  r === "owner" || r === "manager" ? "gold" : r === "captain" ? "pool" : r === "bar_lead" ? "vip" : r === "security" ? "ok" : "muted";

export function ShareSheet({ open, onClose, token }: { open: boolean; onClose: () => void; token: string }) {
  const [links, setLinks] = useState<any[]>([]);
  const [copied, setCopied] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  const refresh = useCallback(async () => {
    try {
      setLinks(await shareList(token));
    } catch {
      setLinks([]);
    }
  }, [token]);

  useEffect(() => {
    if (open) void refresh();
  }, [open, refresh]);

  const copy = async (tok: string) => {
    try {
      await navigator.clipboard.writeText(`${origin}/?t=${tok}`);
      setCopied(tok);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      /* clipboard blocked */
    }
  };

  const create = async (role: Role) => {
    setBusy(true);
    try {
      await op(token, "share.create", { role, label: `${ROLE_LABELS[role]} link` });
      await refresh();
    } catch {
      /* ignore */
    }
    setBusy(false);
  };

  const toggle = async (id: string) => {
    setBusy(true);
    try {
      await shareToggle(token, id);
      await refresh();
    } catch {
      /* ignore */
    }
    setBusy(false);
  };

  return (
    <Sheet open={open} onClose={onClose} title="Role share links" subtitle="Each role gets its own scoped, revocable link">
      <div className="space-y-4">
        <div className="space-y-2">
          {links.length === 0 && <p className="text-sm text-muted-foreground">No links yet.</p>}
          {links.map((l) => (
            <div key={l.id} className="rounded-lg border border-border bg-card p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <Pill tone={roleTone(l.role)}>{ROLE_LABELS[l.role as Role] ?? l.role}</Pill>
                  <span className="truncate text-sm font-medium">{l.label}</span>
                </div>
                {l.revoked && <Pill tone="crit">revoked</Pill>}
              </div>
              <div className="mt-2 flex items-center gap-2">
                <code className="min-w-0 flex-1 truncate rounded bg-muted px-2 py-1 text-xs text-muted-foreground">
                  {origin}/?t={l.token}
                </code>
                <button
                  onClick={() => copy(l.token)}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border text-gold"
                  aria-label="Copy link"
                >
                  {copied === l.token ? <Check className="h-4 w-4 text-ok" /> : <Copy className="h-4 w-4" />}
                </button>
                <button
                  onClick={() => toggle(l.id)}
                  disabled={busy}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border"
                  aria-label={l.revoked ? "Restore" : "Revoke"}
                >
                  {l.revoked ? <RotateCcw className="h-4 w-4 text-ok" /> : <Ban className="h-4 w-4 text-crit" />}
                </button>
              </div>
            </div>
          ))}
        </div>

        <div>
          <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">New link</div>
          <div className="flex flex-wrap gap-1.5">
            {CREATE_ROLES.map((r) => (
              <button key={r} onClick={() => create(r)} disabled={busy}>
                <Pill tone="muted">+ {ROLE_LABELS[r]}</Pill>
              </button>
            ))}
          </div>
        </div>
      </div>
    </Sheet>
  );
}
