import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Search, X, Pencil, Trash2 } from "lucide-react";
import { listMembers, type Member } from "@/lib/api/queries";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/layout/PageHeader";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/members")({
  component: MembersPage,
});

function MembersPage() {
  const qc = useQueryClient();
  const { data: members = [], isLoading } = useQuery({ queryKey: ["members"], queryFn: listMembers });
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Member | null>(null);

  const filtered = members.filter((m) =>
    m.full_name.toLowerCase().includes(q.toLowerCase()) ||
    (m.cedula ?? "").includes(q) ||
    m.member_code.toLowerCase().includes(q.toLowerCase())
  );

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("members").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Miembro eliminado"); qc.invalidateQueries({ queryKey: ["members"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div>
      <PageHeader title="Miembros" subtitle={`${members.length} miembros registrados`}
        action={
          <button onClick={() => { setEditing(null); setOpen(true); }}
            className="h-10 px-4 rounded-xl bg-gradient-to-r from-primary to-primary-glow text-primary-foreground font-semibold flex items-center gap-2 hover:opacity-95">
            <Plus className="w-4 h-4" /> Nuevo Miembro
          </button>
        } />

      <div className="mb-4 flex items-center gap-2 px-4 h-11 rounded-xl bg-surface-elevated border border-border focus-within:border-primary max-w-md">
        <Search className="w-4 h-4 text-muted-foreground" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nombre, cédula o código..."
          className="flex-1 bg-transparent outline-none text-sm" />
      </div>

      <div className="rounded-2xl border border-border bg-[var(--gradient-card)] overflow-hidden">
        {isLoading ? (
          <p className="p-10 text-center text-sm text-muted-foreground">Cargando...</p>
        ) : filtered.length === 0 ? (
          <p className="p-10 text-center text-sm text-muted-foreground">No hay miembros{q && " que coincidan"}.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
                  <th className="text-left font-semibold px-5 py-3">Miembro</th>
                  <th className="text-left font-semibold px-3 py-3">Código</th>
                  <th className="text-left font-semibold px-3 py-3">Cédula</th>
                  <th className="text-left font-semibold px-3 py-3">Teléfono</th>
                  <th className="text-left font-semibold px-3 py-3">Estado</th>
                  <th className="text-right font-semibold px-5 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((m) => (
                  <tr key={m.id} className="border-t border-border/60 hover:bg-surface-elevated/40">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center text-xs font-bold text-white">
                          {m.full_name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
                        </div>
                        <div>
                          <p className="font-medium">{m.full_name}</p>
                          <p className="text-xs text-muted-foreground">{m.email ?? "—"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3.5 text-muted-foreground">{m.member_code}</td>
                    <td className="px-3 py-3.5 text-muted-foreground">{m.cedula ?? "—"}</td>
                    <td className="px-3 py-3.5 text-muted-foreground">{m.phone ?? "—"}</td>
                    <td className="px-3 py-3.5">
                      <span className={`text-xs font-medium flex items-center gap-1.5 ${m.status === "active" ? "text-success" : m.status === "expired" ? "text-destructive" : "text-muted-foreground"}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${m.status === "active" ? "bg-success" : m.status === "expired" ? "bg-destructive" : "bg-muted-foreground"}`} />
                        {m.status === "active" ? "Activo" : m.status === "expired" ? "Vencido" : m.status === "suspended" ? "Suspendido" : "Pendiente"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="inline-flex gap-1">
                        <button onClick={() => { setEditing(m); setOpen(true); }} className="w-8 h-8 rounded-lg border border-border hover:bg-surface-elevated flex items-center justify-center"><Pencil className="w-3.5 h-3.5" /></button>
                        <button onClick={() => { if (confirm(`Eliminar a ${m.full_name}?`)) del.mutate(m.id); }} className="w-8 h-8 rounded-lg border border-border hover:bg-destructive/10 hover:border-destructive flex items-center justify-center"><Trash2 className="w-3.5 h-3.5 text-destructive" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {open && <MemberFormDialog member={editing} onClose={() => setOpen(false)} />}
    </div>
  );
}

function MemberFormDialog({ member, onClose }: { member: Member | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    full_name: member?.full_name ?? "",
    cedula: member?.cedula ?? "",
    birth_date: member?.birth_date ?? "",
    gender: member?.gender ?? "",
    phone: member?.phone ?? "",
    email: member?.email ?? "",
    address: member?.address ?? "",
    emergency_contact: member?.emergency_contact ?? "",
    notes: member?.notes ?? "",
    status: member?.status ?? "active",
  });

  const save = useMutation({
    mutationFn: async () => {
      const payload = { ...form, birth_date: form.birth_date || null };
      if (member) {
        const { error } = await supabase.from("members").update(payload).eq("id", member.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("members").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(member ? "Miembro actualizado" : "Miembro creado");
      qc.invalidateQueries({ queryKey: ["members"] });
      qc.invalidateQueries({ queryKey: ["members-recent"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      onClose();
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display text-xl font-bold">{member ? "Editar Miembro" : "Nuevo Miembro"}</h2>
          <button onClick={onClose} className="w-9 h-9 rounded-lg hover:bg-surface-elevated flex items-center justify-center"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Nombre completo *" required value={form.full_name} onChange={(v) => setForm({ ...form, full_name: v })} className="md:col-span-2" />
          <Field label="Cédula" value={form.cedula} onChange={(v) => setForm({ ...form, cedula: v })} />
          <Field label="Fecha de nacimiento" type="date" value={form.birth_date} onChange={(v) => setForm({ ...form, birth_date: v })} />
          <Select label="Sexo" value={form.gender} onChange={(v) => setForm({ ...form, gender: v })} options={[["", "Seleccionar..."], ["male", "Masculino"], ["female", "Femenino"], ["other", "Otro"]]} />
          <Field label="Teléfono" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
          <Field label="Correo" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} className="md:col-span-2" />
          <Field label="Dirección" value={form.address} onChange={(v) => setForm({ ...form, address: v })} className="md:col-span-2" />
          <Field label="Contacto de emergencia" value={form.emergency_contact} onChange={(v) => setForm({ ...form, emergency_contact: v })} className="md:col-span-2" />
          <Select label="Estado" value={form.status} onChange={(v) => setForm({ ...form, status: v as any })}
            options={[["active", "Activo"], ["suspended", "Suspendido"], ["expired", "Vencido"], ["pending", "Pendiente"]]} />
          <div className="md:col-span-2">
            <label className="text-xs font-semibold text-muted-foreground">Observaciones</label>
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="mt-1 w-full px-3 py-2 rounded-xl bg-surface-elevated border border-border focus:border-primary outline-none text-sm" rows={3} />
          </div>
          <div className="md:col-span-2 flex gap-2 justify-end pt-2">
            <button type="button" onClick={onClose} className="h-10 px-4 rounded-xl border border-border hover:bg-surface-elevated">Cancelar</button>
            <button type="submit" disabled={save.isPending}
              className="h-10 px-5 rounded-xl bg-gradient-to-r from-primary to-primary-glow text-primary-foreground font-semibold disabled:opacity-60">
              {save.isPending ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", className = "", required }: { label: string; value: string; onChange: (v: string) => void; type?: string; className?: string; required?: boolean }) {
  return (
    <div className={className}>
      <label className="text-xs font-semibold text-muted-foreground">{label}</label>
      <input type={type} value={value} required={required} onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full h-10 px-3 rounded-xl bg-surface-elevated border border-border focus:border-primary outline-none text-sm" />
    </div>
  );
}

function Select({ label, value, onChange, options, className = "" }: { label: string; value: string; onChange: (v: string) => void; options: [string, string][]; className?: string }) {
  return (
    <div className={className}>
      <label className="text-xs font-semibold text-muted-foreground">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full h-10 px-3 rounded-xl bg-surface-elevated border border-border focus:border-primary outline-none text-sm">
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </div>
  );
}
