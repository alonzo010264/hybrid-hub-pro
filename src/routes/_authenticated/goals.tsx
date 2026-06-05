import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { listMemberGoals, listTrainers } from "@/lib/api/queries";
import { assignTrainer } from "@/lib/goals.functions";
import { toast } from "sonner";
import { Target, AlertCircle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/goals")({
  component: GoalsPage,
});

const priorityColors: Record<string, string> = {
  high: "bg-destructive/15 text-destructive",
  medium: "bg-warning/15 text-warning",
  low: "bg-muted text-muted-foreground",
};

function GoalsPage() {
  const qc = useQueryClient();
  const goalsQ = useQuery({ queryKey: ["member-goals"], queryFn: listMemberGoals });
  const trainersQ = useQuery({ queryKey: ["trainers"], queryFn: listTrainers });
  const assignFn = useServerFn(assignTrainer);

  const m = useMutation({
    mutationFn: (vars: { goal_id: string; trainer_id: string | null; status?: any }) => assignFn({ data: vars }),
    onSuccess: () => { toast.success("Actualizado"); qc.invalidateQueries({ queryKey: ["member-goals"] }); qc.invalidateQueries({ queryKey: ["dashboard-stats"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div>
      <PageHeader title="Objetivos de miembros"
        subtitle="Lo que el asistente IA recopiló de cada nuevo miembro. Asigna entrenador para que se acerque y le ayude." />
      <div className="space-y-3">
        {goalsQ.isLoading && <p className="text-sm text-muted-foreground">Cargando...</p>}
        {(goalsQ.data ?? []).length === 0 && !goalsQ.isLoading && (
          <div className="rounded-2xl border border-border bg-[var(--gradient-card)] p-10 text-center">
            <Target className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">Aún no hay objetivos registrados. Aparecerán cuando un miembro complete el asistente al ingresar al portal.</p>
          </div>
        )}
        {(goalsQ.data ?? []).map((g) => (
          <div key={g.id} className="rounded-2xl border border-border bg-[var(--gradient-card)] p-5">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-display font-bold text-lg">{g.primary_goal}</h3>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wide ${priorityColors[g.priority]}`}>{g.priority}</span>
                  {!g.assigned_trainer_id && <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-primary/15 text-primary inline-flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Sin asignar</span>}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {g.member?.full_name} · {g.member?.member_code} · {new Date(g.created_at).toLocaleDateString("es")}
                </p>
                <p className="text-sm mt-3">{g.summary}</p>
              </div>
              <div className="flex gap-2 items-center">
                <select value={g.assigned_trainer_id ?? ""} onChange={(e) => m.mutate({ goal_id: g.id, trainer_id: e.target.value || null })}
                  className="h-9 px-3 rounded-lg bg-surface-elevated border border-border text-xs">
                  <option value="">Asignar entrenador...</option>
                  {(trainersQ.data ?? []).filter((t) => t.is_active).map((t) => <option key={t.id} value={t.id}>{t.full_name}</option>)}
                </select>
                <select value={g.status} onChange={(e) => m.mutate({ goal_id: g.id, trainer_id: g.assigned_trainer_id, status: e.target.value })}
                  className="h-9 px-3 rounded-lg bg-surface-elevated border border-border text-xs">
                  <option value="new">Nuevo</option>
                  <option value="in_progress">En proceso</option>
                  <option value="done">Hecho</option>
                </select>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
