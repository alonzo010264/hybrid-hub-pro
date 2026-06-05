import { TrendingUp, type LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string;
  delta?: string;
  hint?: string;
  icon: LucideIcon;
  tone?: "primary" | "amber" | "success" | "violet";
}

const tones: Record<string, string> = {
  primary: "bg-gradient-to-br from-primary to-primary-glow text-primary-foreground shadow-[0_10px_30px_-12px_oklch(0.62_0.21_26/0.7)]",
  amber: "bg-gradient-to-br from-amber-400 to-orange-500 text-black shadow-[0_10px_30px_-12px_oklch(0.78_0.17_70/0.6)]",
  success: "bg-gradient-to-br from-emerald-400 to-teal-500 text-black",
  violet: "bg-gradient-to-br from-fuchsia-500 to-rose-500 text-white",
};

export function StatCard({ label, value, delta, hint, icon: Icon, tone = "primary" }: StatCardProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-[var(--gradient-card)] p-5 transition-all hover:border-primary/40 hover:-translate-y-0.5 hover:shadow-[var(--shadow-card)] group">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <p className="text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">{label}</p>
          <p className="font-display text-3xl font-bold tracking-tight">{value}</p>
          {delta && (
            <p className="text-xs flex items-center gap-1 text-success">
              <TrendingUp className="w-3 h-3" /> {delta}
            </p>
          )}
          {hint && !delta && <p className="text-xs text-muted-foreground">{hint}</p>}
        </div>
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${tones[tone]}`}>
          <Icon className="w-5 h-5" strokeWidth={2.4} />
        </div>
      </div>
      <div className="pointer-events-none absolute -right-10 -top-10 w-40 h-40 rounded-full bg-primary/5 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );
}
