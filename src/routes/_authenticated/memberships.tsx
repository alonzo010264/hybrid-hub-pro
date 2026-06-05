import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, X, Check } from "lucide-react";
import { listPlans, type MembershipPlan } from "@/lib/api/queries";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/layout/PageHeader";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/memberships")({
  component: MembershipsPage,
});

function MembershipsPage() {
  const qc = useQueryClient();
  const { data: plans = [] } = useQuery({ queryKey: ["plans"], queryFn: listPlans });
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<MembershipPlan | null>(null);

  const toggle = useMutation({
    mutationFn: async (p: MembershipPlan) => {
      const { error } = await supabase.from("membership_plans").update({ is_active: !p.is_active }).eq("id", p.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Plan actualizado"); qc.invalidateQueries({ queryKey: ["plans"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div>
      <PageHeader title="Membresías" subtitle="Planes y precios"
        action={
          <button onClick={() => { setEditing(null); setOpen(true); }}
            className="h-10 px-4 rounded-xl bg-gradient-to-r from-primary to-primary-glow text-primary-foreground font-semibold flex items-center gap-2">
            <Plus className="w-4 h-4" /> Nuevo Plan
          </button>
        } />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {plans.map((p) => (
          <div key={p.id} className="relative rounded-2xl border border-border bg-[var(--gradient-card)] p-6 overflow-hidden">
            <div className="absolute top-0 right-0 left-0 h-1" style={{ background: p.color ?? "#E53935" }} />
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-display text-xl font-bold">{p.name}</h3>
                <p className="text-sm text-muted-foreground mt-1">{p.description}</p>
              </div>
              <span className={`text-[10px] font-semibold px-2 py-1 rounded-md ${p.is_active ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>
                {p.is_active ? "Activo" : "Inactivo"}
              </span>
            </div>
            <div className="my-5">
              <span className="font-display text-4xl font-bold">${Number(p.price).toLocaleString()}</span>
              <span className="text-muted-foreground text-sm"> / {p.duration === "monthly" ? "mes" : p.duration === "quarterly" ? "3 meses" : p.duration === "biannual" ? "6 meses" : "año"}</span>
            </div>
            <ul className="space-y-2 mb-5">
              {(p.benefits ?? []).map((b, i) => (
                <li key={i} className="text-sm flex items-start gap-2"><Check className="w-4 h-4 text-success shrink-0 mt-0.5" />{b}</li>
              ))}
            </ul>
            <div className="flex gap-2">
              <button onClick={() => { setEditing(p); setOpen(true); }} className="flex-1 h-9 rounded-lg border border-border hover:bg-surface-elevated text-sm font-medium">Editar</button>
              <button onClick={() => toggle.mutate(p)} className="flex-1 h-9 rounded-lg border border-border hover:bg-surface-elevated text-sm font-medium">{p.is_active ? "Desactivar" : "Activar"}</button>
            </div>
          </div>
        ))}
      </div>

      {open && <PlanDialog plan={editing} onClose={() => setOpen(false)} />}
    </div>
  );
}

function PlanDialog({ plan, onClose }: { plan: MembershipPlan | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name: plan?.name ?? "",
    description: plan?.description ?? "",
    price: plan?.price ?? 0,
    duration: plan?.duration ?? "monthly",
    duration_days: plan?.duration_days ?? 30,
    color: plan?.color ?? "#E53935",
    benefits: (plan?.benefits ?? []).join("\n"),
  });

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name, description: form.description,
        price: Number(form.price), duration: form.duration as "monthly" | "quarterly" | "biannual" | "annual",
        duration_days: Number(form.duration_days),
        color: form.color, benefits: form.benefits.split("\n").map((s) => s.trim()).filter(Boolean),
      };
      if (plan) {
        const { error } = await supabase.from("membership_plans").update(payload).eq("id", plan.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("membership_plans").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { toast.success("Plan guardado"); qc.invalidateQueries({ queryKey: ["plans"] }); onClose(); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display text-xl font-bold">{plan ? "Editar Plan" : "Nuevo Plan"}</h2>
          <button onClick={onClose} className="w-9 h-9 rounded-lg hover:bg-surface-elevated flex items-center justify-center"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="space-y-3">
          <Inp label="Nombre" value={form.name} onChange={(v) => setForm({ ...form, name: v })} required />
          <Inp label="Descripción" value={form.description} onChange={(v) => setForm({ ...form, description: v })} />
          <div className="grid grid-cols-2 gap-3">
            <Inp label="Precio (RD$)" type="number" value={String(form.price)} onChange={(v) => setForm({ ...form, price: Number(v) })} />
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Duración</label>
              <select value={form.duration} onChange={(e) => {
                const map: Record<string, number> = { monthly: 30, quarterly: 90, biannual: 180, annual: 365 };
                setForm({ ...form, duration: e.target.value, duration_days: map[e.target.value] });
              }} className="mt-1 w-full h-10 px-3 rounded-xl bg-surface-elevated border border-border outline-none text-sm">
                <option value="monthly">Mensual</option>
                <option value="quarterly">Trimestral</option>
                <option value="biannual">Semestral</option>
                <option value="annual">Anual</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Color</label>
            <input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })}
              className="mt-1 w-full h-10 px-1 rounded-xl bg-surface-elevated border border-border" />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Beneficios (uno por línea)</label>
            <textarea value={form.benefits} onChange={(e) => setForm({ ...form, benefits: e.target.value })} rows={4}
              className="mt-1 w-full px-3 py-2 rounded-xl bg-surface-elevated border border-border outline-none text-sm" />
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <button type="button" onClick={onClose} className="h-10 px-4 rounded-xl border border-border">Cancelar</button>
            <button type="submit" disabled={save.isPending} className="h-10 px-5 rounded-xl bg-gradient-to-r from-primary to-primary-glow text-primary-foreground font-semibold">
              {save.isPending ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Inp({ label, value, onChange, type = "text", required }: { label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean }) {
  return (
    <div>
      <label className="text-xs font-semibold text-muted-foreground">{label}</label>
      <input type={type} value={value} required={required} onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full h-10 px-3 rounded-xl bg-surface-elevated border border-border focus:border-primary outline-none text-sm" />
    </div>
  );
}
