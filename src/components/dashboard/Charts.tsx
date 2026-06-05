import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const tooltipStyle = {
  background: "oklch(0.18 0.006 20)",
  border: "1px solid oklch(0.27 0.008 20)",
  borderRadius: 12,
  color: "white",
  fontSize: 12,
};

const fallbackRev = [
  { d: "01", v: 0 }, { d: "02", v: 0 }, { d: "03", v: 0 },
];

export function RevenueChart({ data }: { data?: { d: string; v: number }[] }) {
  const series = data && data.length > 0 ? data : fallbackRev;
  return (
    <div className="rounded-2xl border border-border bg-[var(--gradient-card)] p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-lg font-semibold">Ingresos Mensuales</h3>
        <span className="text-xs px-2.5 py-1 rounded-md bg-surface-elevated border border-border text-muted-foreground">Últimos meses</span>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={series} margin={{ left: -10, right: 10, top: 10, bottom: 0 }}>
          <defs>
            <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="oklch(0.62 0.21 26)" stopOpacity={0.5} />
              <stop offset="100%" stopColor="oklch(0.62 0.21 26)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="oklch(0.27 0.008 20)" strokeDasharray="3 6" vertical={false} />
          <XAxis dataKey="d" stroke="oklch(0.68 0.01 20)" fontSize={11} tickLine={false} axisLine={false} />
          <YAxis stroke="oklch(0.68 0.01 20)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v >= 1000 ? `${v/1000}K` : v}`} />
          <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`$${v.toLocaleString()}`, "Ingresos"]} />
          <Area type="monotone" dataKey="v" stroke="oklch(0.62 0.21 26)" strokeWidth={2.5} fill="url(#rev)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function AttendanceChart({ data }: { data?: { d: string; v: number }[] }) {
  const series = data && data.length > 0 ? data : [{ d: "Lun", v: 0 }];
  return (
    <div className="rounded-2xl border border-border bg-[var(--gradient-card)] p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-lg font-semibold">Asistencias Semanales</h3>
        <span className="text-xs px-2.5 py-1 rounded-md bg-surface-elevated border border-border text-muted-foreground">Esta semana</span>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={series} margin={{ left: -15, right: 0, top: 10, bottom: 0 }}>
          <CartesianGrid stroke="oklch(0.27 0.008 20)" strokeDasharray="3 6" vertical={false} />
          <XAxis dataKey="d" stroke="oklch(0.68 0.01 20)" fontSize={11} tickLine={false} axisLine={false} />
          <YAxis stroke="oklch(0.68 0.01 20)" fontSize={11} tickLine={false} axisLine={false} />
          <Tooltip cursor={{ fill: "oklch(0.27 0.008 20 / 0.4)" }} contentStyle={tooltipStyle} />
          <Bar dataKey="v" fill="oklch(0.62 0.21 26)" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function PlansChart({ plans }: { plans?: { id: string; name: string; color: string | null }[] }) {
  const list = (plans ?? []).map((p, i) => ({ name: p.name, value: 100 / Math.max(1, (plans ?? []).length), color: p.color || ["oklch(0.62 0.21 26)", "oklch(0.78 0.17 70)", "oklch(0.65 0.20 300)"][i % 3] }));
  return (
    <div className="rounded-2xl border border-border bg-[var(--gradient-card)] p-5">
      <h3 className="font-display text-lg font-semibold mb-4">Distribución de Membresías</h3>
      <div className="flex items-center gap-4">
        <ResponsiveContainer width="50%" height={150}>
          <PieChart>
            <Pie data={list} dataKey="value" innerRadius={38} outerRadius={60} paddingAngle={3} strokeWidth={0}>
              {list.map((p) => <Cell key={p.name} fill={p.color} />)}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} />
          </PieChart>
        </ResponsiveContainer>
        <div className="flex-1 space-y-2.5">
          {list.length === 0 && <p className="text-xs text-muted-foreground">Sin planes</p>}
          {list.map((p) => (
            <div key={p.name} className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: p.color }} />
                {p.name}
              </span>
              <span className="font-semibold text-muted-foreground">{Math.round(p.value)}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
