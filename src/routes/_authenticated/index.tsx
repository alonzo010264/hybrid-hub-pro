import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Users, DollarSign, Activity, CreditCard } from "lucide-react";
import { StatCard } from "@/components/dashboard/StatCard";
import { RevenueChart, AttendanceChart, PlansChart } from "@/components/dashboard/Charts";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { UpcomingExpirations } from "@/components/dashboard/UpcomingExpirations";
import { getDashboardStats, listMembers } from "@/lib/api/queries";
import { PageHeader } from "@/components/layout/PageHeader";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/")({
  component: Dashboard,
});

function Dashboard() {
  const stats = useQuery({ queryKey: ["dashboard-stats"], queryFn: getDashboardStats });
  const recent = useQuery({ queryKey: ["members-recent"], queryFn: listMembers });

  const recentList = (recent.data ?? []).slice(0, 5);

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" subtitle="Resumen general de Adames Hybrid Gym" />

      {((stats.data?.pendingRequests ?? 0) > 0 || (stats.data?.newGoals ?? 0) > 0) && (
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(stats.data?.pendingRequests ?? 0) > 0 && (
            <Link to="/requests" className="rounded-2xl border-2 border-primary/50 bg-primary/10 p-5 flex items-center gap-4 hover:bg-primary/15 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold">
                {stats.data?.pendingRequests}
              </div>
              <div className="flex-1">
                <p className="font-display font-bold">Solicitudes pendientes</p>
                <p className="text-xs text-muted-foreground">Nuevos clientes esperan aprobación</p>
              </div>
              <span className="text-primary font-semibold text-sm">Revisar →</span>
            </Link>
          )}
          {(stats.data?.newGoals ?? 0) > 0 && (
            <Link to="/goals" className="rounded-2xl border-2 border-warning/50 bg-warning/10 p-5 flex items-center gap-4 hover:bg-warning/15 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-warning text-warning-foreground flex items-center justify-center text-xl font-bold">
                {stats.data?.newGoals}
              </div>
              <div className="flex-1">
                <p className="font-display font-bold">Objetivos sin entrenador</p>
                <p className="text-xs text-muted-foreground">Miembros nuevos esperan orientación</p>
              </div>
              <span className="text-warning font-semibold text-sm">Asignar →</span>
            </Link>
          )}
        </section>
      )}

      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Miembros Activos" value={String(stats.data?.activeMembers ?? 0)} hint={`${stats.data?.totalMembers ?? 0} totales`} icon={Users} tone="primary" />
        <StatCard label="Ingresos Este Mes" value={`$${(stats.data?.monthlyRevenue ?? 0).toLocaleString()}`} hint="Mes actual" icon={DollarSign} tone="primary" />
        <StatCard label="Asistencias Hoy" value={String(stats.data?.todayAttendances ?? 0)} hint="Ver detalle" icon={Activity} tone="amber" />
        <StatCard label="Pagos Pendientes" value={String(stats.data?.pendingPayments ?? 0)} hint="Ver detalle" icon={CreditCard} tone="primary" />
      </section>


      <section className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <div className="rounded-2xl border border-border bg-[var(--gradient-card)] overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h3 className="font-display text-lg font-semibold">Miembros Recientes</h3>
              <Link to="/members" className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-primary/50 text-primary hover:bg-primary/10">Ver todos</Link>
            </div>
            {recentList.length === 0 ? (
              <div className="p-10 text-center text-sm text-muted-foreground">
                No hay miembros aún. <Link to="/members" className="text-primary font-semibold">Registra el primero →</Link>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
                    <th className="text-left font-semibold px-5 py-3">Miembro</th>
                    <th className="text-left font-semibold px-3 py-3">Código</th>
                    <th className="text-left font-semibold px-3 py-3">Estado</th>
                    <th className="text-left font-semibold px-3 py-3">Teléfono</th>
                  </tr>
                </thead>
                <tbody>
                  {recentList.map((m) => (
                    <tr key={m.id} className="border-t border-border/60 hover:bg-surface-elevated/40">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center text-xs font-bold text-white">
                            {m.full_name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
                          </div>
                          <p className="font-medium">{m.full_name}</p>
                        </div>
                      </td>
                      <td className="px-3 py-3.5 text-muted-foreground">{m.member_code}</td>
                      <td className="px-3 py-3.5">
                        <span className={`text-xs font-medium flex items-center gap-1.5 ${m.status === "active" ? "text-success" : "text-destructive"}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${m.status === "active" ? "bg-success" : "bg-destructive"}`} />
                          {m.status === "active" ? "Activo" : m.status === "expired" ? "Vencido" : m.status}
                        </span>
                      </td>
                      <td className="px-3 py-3.5 text-muted-foreground">{m.phone ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <RevenueChart data={stats.data?.monthlyArr ?? []} />
            <QuickActions />
          </div>
        </div>

        <div className="space-y-6">
          <AttendanceChart data={stats.data?.weekData ?? []} />
          <PlansChart plans={stats.data?.plans ?? []} />
          <UpcomingExpirations />
        </div>
      </section>
    </div>
  );
}
