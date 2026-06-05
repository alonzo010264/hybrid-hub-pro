import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, X } from "lucide-react";
import { listPayments, listMembers, listPlans } from "@/lib/api/queries";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/layout/PageHeader";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/payments")({
  component: PaymentsPage,
});

const methodLabels: Record<string, string> = { cash: "Efectivo", transfer: "Transferencia", card: "Tarjeta", mobile: "Pago móvil" };

function PaymentsPage() {
  const { data: payments = [] } = useQuery({ queryKey: ["payments"], queryFn: listPayments });
  const [open, setOpen] = useState(false);
  const total = payments.filter((p) => p.status === "paid").reduce((s, p) => s + Number(p.amount), 0);

  return (
    <div>
      <PageHeader title="Pagos" subtitle={`Total recaudado: $${total.toLocaleString()}`}
        action={
          <button onClick={() => setOpen(true)}
            className="h-10 px-4 rounded-xl bg-gradient-to-r from-primary to-primary-glow text-primary-foreground font-semibold flex items-center gap-2">
            <Plus className="w-4 h-4" /> Registrar Pago
          </button>
        } />

      <div className="rounded-2xl border border-border bg-[var(--gradient-card)] overflow-hidden">
        {payments.length === 0 ? (
          <p className="p-10 text-center text-sm text-muted-foreground">Sin pagos registrados.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
                  <th className="text-left font-semibold px-5 py-3">Miembro</th>
                  <th className="text-left font-semibold px-3 py-3">Monto</th>
                  <th className="text-left font-semibold px-3 py-3">Método</th>
                  <th className="text-left font-semibold px-3 py-3">Estado</th>
                  <th className="text-left font-semibold px-3 py-3">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id} className="border-t border-border/60 hover:bg-surface-elevated/40">
                    <td className="px-5 py-3.5">
                      <p className="font-medium">{p.member?.full_name ?? "—"}</p>
                      <p className="text-xs text-muted-foreground">{p.member?.member_code}</p>
                    </td>
                    <td className="px-3 py-3.5 font-semibold">${Number(p.amount).toLocaleString()}</td>
                    <td className="px-3 py-3.5 text-muted-foreground">{methodLabels[p.method] ?? p.method}</td>
                    <td className="px-3 py-3.5">
                      <span className={`text-xs font-medium px-2 py-1 rounded-md ${p.status === "paid" ? "bg-success/15 text-success" : p.status === "pending" ? "bg-warning/15 text-warning" : "bg-muted text-muted-foreground"}`}>
                        {p.status === "paid" ? "Pagado" : p.status === "pending" ? "Pendiente" : "Reembolsado"}
                      </span>
                    </td>
                    <td className="px-3 py-3.5 text-muted-foreground">{new Date(p.paid_at).toLocaleDateString("es")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {open && <PaymentDialog onClose={() => setOpen(false)} />}
    </div>
  );
}

function PaymentDialog({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const { data: members = [] } = useQuery({ queryKey: ["members"], queryFn: listMembers });
  const { data: plans = [] } = useQuery({ queryKey: ["plans"], queryFn: listPlans });
  const [form, setForm] = useState({ member_id: "", amount: 0, method: "cash" as const, plan_id: "", reference: "" });

  const save = useMutation({
    mutationFn: async () => {
      if (!form.member_id) throw new Error("Selecciona un miembro");
      let membership_id: string | null = null;
      if (form.plan_id) {
        const plan = plans.find((p) => p.id === form.plan_id);
        if (plan) {
          const start = new Date();
          const end = new Date(); end.setDate(end.getDate() + plan.duration_days);
          const { data: mm, error: mmErr } = await supabase.from("member_memberships").insert({
            member_id: form.member_id, plan_id: plan.id,
            start_date: start.toISOString().slice(0, 10),
            end_date: end.toISOString().slice(0, 10),
            is_active: true,
          }).select().single();
          if (mmErr) throw mmErr;
          membership_id = mm.id;
          await supabase.from("members").update({ status: "active" }).eq("id", form.member_id);
        }
      }
      const { error } = await supabase.from("payments").insert({
        member_id: form.member_id, amount: Number(form.amount), method: form.method,
        reference: form.reference || null, membership_id, status: "paid",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Pago registrado");
      qc.invalidateQueries({ queryKey: ["payments"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      qc.invalidateQueries({ queryKey: ["upcoming-expirations"] });
      onClose();
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-lg rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display text-xl font-bold">Registrar Pago</h2>
          <button onClick={onClose} className="w-9 h-9 rounded-lg hover:bg-surface-elevated flex items-center justify-center"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Miembro *</label>
            <select required value={form.member_id} onChange={(e) => setForm({ ...form, member_id: e.target.value })}
              className="mt-1 w-full h-10 px-3 rounded-xl bg-surface-elevated border border-border outline-none text-sm">
              <option value="">Seleccionar...</option>
              {members.map((m) => <option key={m.id} value={m.id}>{m.full_name} · {m.member_code}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Plan (opcional, activa membresía)</label>
            <select value={form.plan_id} onChange={(e) => {
              const plan = plans.find((p) => p.id === e.target.value);
              setForm({ ...form, plan_id: e.target.value, amount: plan ? Number(plan.price) : form.amount });
            }} className="mt-1 w-full h-10 px-3 rounded-xl bg-surface-elevated border border-border outline-none text-sm">
              <option value="">Solo registrar pago</option>
              {plans.map((p) => <option key={p.id} value={p.id}>{p.name} — ${Number(p.price).toLocaleString()}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Monto</label>
              <input type="number" step="0.01" required value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })}
                className="mt-1 w-full h-10 px-3 rounded-xl bg-surface-elevated border border-border outline-none text-sm" />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Método</label>
              <select value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value as any })}
                className="mt-1 w-full h-10 px-3 rounded-xl bg-surface-elevated border border-border outline-none text-sm">
                <option value="cash">Efectivo</option>
                <option value="transfer">Transferencia</option>
                <option value="card">Tarjeta</option>
                <option value="mobile">Pago móvil</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Referencia / comprobante</label>
            <input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })}
              className="mt-1 w-full h-10 px-3 rounded-xl bg-surface-elevated border border-border outline-none text-sm" />
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <button type="button" onClick={onClose} className="h-10 px-4 rounded-xl border border-border">Cancelar</button>
            <button type="submit" disabled={save.isPending} className="h-10 px-5 rounded-xl bg-gradient-to-r from-primary to-primary-glow text-primary-foreground font-semibold">
              {save.isPending ? "Guardando..." : "Registrar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
