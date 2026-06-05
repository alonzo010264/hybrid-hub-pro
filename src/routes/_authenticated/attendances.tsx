import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, X, LogOut } from "lucide-react";
import { listAttendances, listMembers } from "@/lib/api/queries";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/layout/PageHeader";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/attendances")({
  component: AttendancesPage,
});

function AttendancesPage() {
  const qc = useQueryClient();
  const { data: attendances = [] } = useQuery({ queryKey: ["attendances"], queryFn: listAttendances });
  const [open, setOpen] = useState(false);

  const checkout = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("attendances").update({ check_out: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Salida registrada"); qc.invalidateQueries({ queryKey: ["attendances"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div>
      <PageHeader title="Asistencias" subtitle={`${attendances.length} registros recientes`}
        action={
          <button onClick={() => setOpen(true)}
            className="h-10 px-4 rounded-xl bg-gradient-to-r from-primary to-primary-glow text-primary-foreground font-semibold flex items-center gap-2">
            <Plus className="w-4 h-4" /> Registrar entrada
          </button>
        } />

      <div className="rounded-2xl border border-border bg-[var(--gradient-card)] overflow-hidden">
        {attendances.length === 0 ? (
          <p className="p-10 text-center text-sm text-muted-foreground">Sin asistencias.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
                  <th className="text-left font-semibold px-5 py-3">Miembro</th>
                  <th className="text-left font-semibold px-3 py-3">Entrada</th>
                  <th className="text-left font-semibold px-3 py-3">Salida</th>
                  <th className="text-left font-semibold px-3 py-3">Duración</th>
                  <th className="text-right font-semibold px-5 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {attendances.map((a) => {
                  const dur = a.check_out
                    ? Math.round((new Date(a.check_out).getTime() - new Date(a.check_in).getTime()) / 60000)
                    : null;
                  return (
                    <tr key={a.id} className="border-t border-border/60 hover:bg-surface-elevated/40">
                      <td className="px-5 py-3.5">
                        <p className="font-medium">{a.member?.full_name ?? "—"}</p>
                        <p className="text-xs text-muted-foreground">{a.member?.member_code}</p>
                      </td>
                      <td className="px-3 py-3.5 text-muted-foreground">{new Date(a.check_in).toLocaleString("es")}</td>
                      <td className="px-3 py-3.5 text-muted-foreground">{a.check_out ? new Date(a.check_out).toLocaleTimeString("es") : "—"}</td>
                      <td className="px-3 py-3.5">{dur ? `${dur} min` : <span className="text-success text-xs">En curso</span>}</td>
                      <td className="px-5 py-3.5 text-right">
                        {!a.check_out && (
                          <button onClick={() => checkout.mutate(a.id)} className="text-xs px-3 py-1.5 rounded-lg border border-border hover:bg-surface-elevated inline-flex items-center gap-1">
                            <LogOut className="w-3 h-3" /> Salida
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {open && <CheckInDialog onClose={() => setOpen(false)} />}
    </div>
  );
}

function CheckInDialog({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const { data: members = [] } = useQuery({ queryKey: ["members"], queryFn: listMembers });
  const [memberId, setMemberId] = useState("");

  const save = useMutation({
    mutationFn: async () => {
      if (!memberId) throw new Error("Selecciona un miembro");
      const { error } = await supabase.from("attendances").insert({ member_id: memberId, method: "manual" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Entrada registrada");
      qc.invalidateQueries({ queryKey: ["attendances"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      onClose();
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display text-xl font-bold">Registrar Entrada</h2>
          <button onClick={onClose} className="w-9 h-9 rounded-lg hover:bg-surface-elevated flex items-center justify-center"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Miembro</label>
            <select required value={memberId} onChange={(e) => setMemberId(e.target.value)}
              className="mt-1 w-full h-10 px-3 rounded-xl bg-surface-elevated border border-border outline-none text-sm">
              <option value="">Seleccionar...</option>
              {members.map((m) => <option key={m.id} value={m.id}>{m.full_name} · {m.member_code}</option>)}
            </select>
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <button type="button" onClick={onClose} className="h-10 px-4 rounded-xl border border-border">Cancelar</button>
            <button type="submit" disabled={save.isPending} className="h-10 px-5 rounded-xl bg-gradient-to-r from-primary to-primary-glow text-primary-foreground font-semibold">
              {save.isPending ? "..." : "Registrar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
