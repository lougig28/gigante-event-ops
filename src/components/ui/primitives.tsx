import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn("rounded-xl border border-border bg-card text-card-foreground", className)}>
      {children}
    </div>
  );
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex items-center justify-between px-1 pb-2 pt-1">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{children}</h2>
      {right}
    </div>
  );
}

type Tone = "muted" | "gold" | "ok" | "warn" | "crit" | "pool" | "vip";
const toneClass: Record<Tone, string> = {
  muted: "bg-muted text-muted-foreground",
  gold: "bg-gold/15 text-gold",
  ok: "bg-ok/15 text-ok",
  warn: "bg-warn/15 text-warn",
  crit: "bg-crit/15 text-crit",
  pool: "bg-pool/15 text-pool",
  vip: "bg-vip/15 text-vip",
};

export function Pill({
  children,
  tone = "muted",
  className,
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium leading-tight",
        toneClass[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function ProgressBar({ value, tone = "gold" }: { value: number; tone?: "gold" | "ok" | "pool" }) {
  const bar = tone === "ok" ? "bg-ok" : tone === "pool" ? "bg-pool" : "bg-gold";
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
      <div
        className={cn("h-full rounded-full transition-all duration-500", bar)}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

export function SeedBadge({ className }: { className?: string }) {
  return (
    <Pill tone="warn" className={cn("uppercase tracking-wider", className)}>
      seed
    </Pill>
  );
}
