import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, X, Trash2 } from "lucide-react";
import { listTrainers, type Trainer } from "@/lib/api/queries";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/layout/PageHeader";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/trainers")({
  component: TrainersPage,
});

function TrainersPage() {
  const qc = useQueryClient();
  const { data: trainers = [] } = useQuery({ queryKey: ["trainers"], queryFn: listTrainers });
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Trainer | null>(null);

  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("trainers").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("Entrenador eliminado"); qc.invalidateQueries({ queryKey: ["trainers"] }); },
  });

  return (
    <div>
      <PageHeader title="Entrenadores" subtitle={`${trainers.length} entrenadores`}
        action={
          <button onClick={() => { setEditing(null); setOpen(true); }}
            className="h-10 px-4 rounded-xl bg-gradient-to-r from-primary to-primary-glow text-primary-foreground font-semibold flex items-center gap-2">
            <Plus className="w-4 h-4" /> Nuevo
          </button>
        } />

      {trainers.length === 0 ? (
        <div className="rounded-2xl border border-border bg-[var(--gradient-card)] p-10 text-center text-sm text-muted-foreground">
          Sin entrenadores registrados.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {trainers.map((t) => (
            <div key={t.id} className="rounded-2xl border border-border bg-[var(--gradient-card)] p-5">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center text-lg font-bold text-white">
                  {t.full_name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold truncate">{t.full_name}</h3>
                  <p className="text-xs text-primary font-medium">{t.specialty ?? "Sin especialidad"}</p>
                  <p className="text-xs text-muted-foreground mt-1 truncate">{t.email ?? t.phone ?? ""}</p>
                </div>
              </div>
              {t.schedule && <p className="mt-3 text-xs text-muted-foreground">⏰ {t.schedule}</p>}
              <div className="mt-4 flex gap-2">
                <button onClick={() => { setEditing(t); setOpen(true); }} className="flex-1 h-8 rounded-lg border border-border hover:bg-surface-elevated text-xs font-medium">Editar</button>
                <button onClick={() => { if (confirm(`Eliminar a ${t.full_name}?`)) del.mutate(t.id); }} className="w-8 h-8 rounded-lg border border-border hover:bg-destructive/10 hover:border-destructive flex items-center justify-center"><Trash2 className="w-3.5 h-3.5 text-destructive" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {open && <TrainerDialog trainer={editing} onClose={() => setOpen(false)} />}
    </div>
  );
}

function TrainerDialog({ trainer, onClose }: { trainer: Trainer | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    full_name: trainer?.full_name ?? "",
    specialty: trainer?.specialty ?? "",
    schedule: trainer?.schedule ?? "",
    phone: trainer?.phone ?? "",
    email: trainer?.email ?? "",
  });

  const save = useMutation({
    mutationFn: async () => {
      if (trainer) {
        const { error } = await supabase.from("trainers").update(form).eq("id", trainer.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("trainers").insert(form);
        if (error) throw error;
      }
    },
    onSuccess: () => { toast.success("Entrenador guardado"); qc.invalidateQueries({ queryKey: ["trainers"] }); onClose(); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-lg rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display text-xl font-bold">{trainer ? "Editar Entrenador" : "Nuevo Entrenador"}</h2>
          <button onClick={onClose} className="w-9 h-9 rounded-lg hover:bg-surface-elevated flex items-center justify-center"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="space-y-3">
          {[
            { k: "full_name", l: "Nombre completo *", req: true },
            { k: "specialty", l: "Especialidad" },
            { k: "schedule", l: "Horario" },
            { k: "phone", l: "Teléfono" },
            { k: "email", l: "Correo", type: "email" },
          ].map((f) => (
            <div key={f.k}>
              <label className="text-xs font-semibold text-muted-foreground">{f.l}</label>
              <input type={f.type ?? "text"} required={f.req} value={(form as any)[f.k]} onChange={(e) => setForm({ ...form, [f.k]: e.target.value })}
                className="mt-1 w-full h-10 px-3 rounded-xl bg-surface-elevated border border-border outline-none text-sm" />
            </div>
          ))}
          <div className="flex gap-2 justify-end pt-2">
            <button type="button" onClick={onClose} className="h-10 px-4 rounded-xl border border-border">Cancelar</button>
            <button type="submit" disabled={save.isPending} className="h-10 px-5 rounded-xl bg-gradient-to-r from-primary to-primary-glow text-primary-foreground font-semibold">
              {save.isPending ? "..." : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
