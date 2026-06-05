import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/layout/PageHeader";
import { getInscriptionConfig, type FormField, type FormStep, type InscriptionConfig } from "@/lib/api/queries";
import { listSystemUsers, createSystemUser, deleteSystemUser, updateUserRole } from "@/lib/users.functions";
import { toast } from "sonner";
import { Plus, Trash2, ChevronUp, ChevronDown, X, User, Settings as Cog, FileEdit } from "lucide-react";

export const Route = createFileRoute("/_authenticated/settings")({
  component: SettingsPage,
});

type Tab = "cuenta" | "usuarios" | "inscripcion";

function SettingsPage() {
  const [tab, setTab] = useState<Tab>("cuenta");
  const signupUrl = typeof window !== "undefined" ? `${window.location.origin}/inscripcion` : "";

  return (
    <div>
      <PageHeader title="Configuración" subtitle="Cuenta, usuarios del sistema y formulario de inscripción" />

      <div className="flex gap-2 mb-6 border-b border-border">
        <TabBtn active={tab === "cuenta"} onClick={() => setTab("cuenta")} icon={<User className="w-4 h-4" />}>Mi cuenta</TabBtn>
        <TabBtn active={tab === "usuarios"} onClick={() => setTab("usuarios")} icon={<Cog className="w-4 h-4" />}>Usuarios del sistema</TabBtn>
        <TabBtn active={tab === "inscripcion"} onClick={() => setTab("inscripcion")} icon={<FileEdit className="w-4 h-4" />}>Formulario de inscripción</TabBtn>
      </div>

      {tab === "cuenta" && <AccountTab signupUrl={signupUrl} />}
      {tab === "usuarios" && <UsersTab />}
      {tab === "inscripcion" && <InscriptionConfigTab />}
    </div>
  );
}

function TabBtn({ active, onClick, children, icon }: { active: boolean; onClick: () => void; children: React.ReactNode; icon: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className={`px-4 py-2.5 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors -mb-px ${active ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
      {icon}{children}
    </button>
  );
}

function AccountTab({ signupUrl }: { signupUrl: string }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      setEmail(data.user.email ?? "");
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", data.user.id);
      setRole((roles ?? []).map((r: any) => r.role).join(", "));
    });
  }, []);
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="rounded-2xl border border-border bg-[var(--gradient-card)] p-6">
        <h3 className="font-display text-lg font-semibold mb-4">Mi cuenta</h3>
        <div className="space-y-3 text-sm">
          <Row label="Correo" value={email} />
          <Row label="Rol" value={role || "—"} mono />
        </div>
      </div>
      <div className="rounded-2xl border border-border bg-[var(--gradient-card)] p-6">
        <h3 className="font-display text-lg font-semibold mb-2">Autoinscripción por QR</h3>
        <p className="text-sm text-muted-foreground mb-4">Comparte este enlace o QR para que nuevos clientes envíen su solicitud.</p>
        <div className="rounded-xl bg-surface-elevated border border-border p-3 text-xs break-all font-mono">{signupUrl}</div>
        <div className="mt-4 flex justify-center">
          <img alt="QR" className="rounded-xl border border-border bg-white p-3"
            src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&bgcolor=ffffff&color=0A0A0A&data=${encodeURIComponent(signupUrl)}`} />
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between border-b border-border pb-2">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-medium ${mono ? "uppercase text-xs tracking-wide text-primary" : ""}`}>{value}</span>
    </div>
  );
}

function UsersTab() {
  const qc = useQueryClient();
  const listFn = useServerFn(listSystemUsers);
  const createFn = useServerFn(createSystemUser);
  const deleteFn = useServerFn(deleteSystemUser);
  const updateFn = useServerFn(updateUserRole);

  const q = useQuery({ queryKey: ["system-users"], queryFn: () => listFn({ data: {} as any }) });
  const [open, setOpen] = useState(false);

  const del = useMutation({
    mutationFn: (user_id: string) => deleteFn({ data: { user_id } }),
    onSuccess: () => { toast.success("Usuario eliminado"); qc.invalidateQueries({ queryKey: ["system-users"] }); },
    onError: (e: any) => toast.error(e.message),
  });
  const upd = useMutation({
    mutationFn: ({ user_id, role }: { user_id: string; role: any }) => updateFn({ data: { user_id, role } }),
    onSuccess: () => { toast.success("Rol actualizado"); qc.invalidateQueries({ queryKey: ["system-users"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="rounded-2xl border border-border bg-[var(--gradient-card)]">
      <div className="flex items-center justify-between p-5 border-b border-border">
        <div>
          <h3 className="font-display text-lg font-semibold">Usuarios del sistema</h3>
          <p className="text-xs text-muted-foreground">Solo administradores. Aquí defines quién puede entrar (admin, recepción, entrenador).</p>
        </div>
        <button onClick={() => setOpen(true)}
          className="h-10 px-4 rounded-xl bg-gradient-to-r from-primary to-primary-glow text-primary-foreground font-semibold flex items-center gap-2">
          <Plus className="w-4 h-4" /> Nuevo usuario
        </button>
      </div>
      {q.error && <p className="p-6 text-sm text-destructive">{(q.error as any).message}</p>}
      <table className="w-full text-sm">
        <thead>
          <tr className="text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
            <th className="text-left font-semibold px-5 py-3">Usuario</th>
            <th className="text-left font-semibold px-3 py-3">Correo</th>
            <th className="text-left font-semibold px-3 py-3">Rol</th>
            <th className="text-right font-semibold px-5 py-3">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {(q.data ?? []).map((u) => (
            <tr key={u.user_id} className="border-t border-border/60">
              <td className="px-5 py-3 font-medium">{u.full_name || "—"}</td>
              <td className="px-3 py-3 text-muted-foreground">{u.email}</td>
              <td className="px-3 py-3">
                <select value={u.roles[0] ?? ""} onChange={(e) => upd.mutate({ user_id: u.user_id, role: e.target.value })}
                  className="h-9 px-2 rounded-lg bg-surface-elevated border border-border text-xs">
                  <option value="admin">admin</option>
                  <option value="reception">recepción</option>
                  <option value="trainer">entrenador</option>
                </select>
              </td>
              <td className="px-5 py-3 text-right">
                <button onClick={() => { if (confirm("¿Eliminar este usuario?")) del.mutate(u.user_id); }}
                  className="w-9 h-9 rounded-lg hover:bg-destructive/15 text-destructive inline-flex items-center justify-center">
                  <Trash2 className="w-4 h-4" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {open && <NewUserDialog onClose={() => setOpen(false)} onSave={async (v) => {
        try { await createFn({ data: v }); toast.success("Usuario creado"); qc.invalidateQueries({ queryKey: ["system-users"] }); setOpen(false); }
        catch (e: any) { toast.error(e.message); }
      }} />}
    </div>
  );
}

function NewUserDialog({ onClose, onSave }: { onClose: () => void; onSave: (v: any) => void }) {
  const [v, setV] = useState({ email: "", password: "", full_name: "", role: "reception" as const });
  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md bg-card rounded-2xl border border-border p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-display text-xl font-bold">Nuevo usuario</h3>
          <button onClick={onClose} className="w-9 h-9 rounded-lg hover:bg-surface-elevated"><X className="w-4 h-4 mx-auto" /></button>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); onSave(v); }} className="space-y-3">
          <Field label="Nombre completo" value={v.full_name} onChange={(x) => setV({ ...v, full_name: x })} />
          <Field label="Correo" type="email" value={v.email} onChange={(x) => setV({ ...v, email: x })} />
          <Field label="Contraseña inicial" type="password" value={v.password} onChange={(x) => setV({ ...v, password: x })} />
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Rol</label>
            <select value={v.role} onChange={(e) => setV({ ...v, role: e.target.value as any })}
              className="mt-1 w-full h-10 px-3 rounded-xl bg-surface-elevated border border-border text-sm">
              <option value="admin">Administrador</option>
              <option value="reception">Recepción</option>
              <option value="trainer">Entrenador</option>
            </select>
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <button type="button" onClick={onClose} className="h-10 px-4 rounded-xl border border-border">Cancelar</button>
            <button type="submit" className="h-10 px-5 rounded-xl bg-gradient-to-r from-primary to-primary-glow text-primary-foreground font-semibold">Crear</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <label className="text-xs font-semibold text-muted-foreground">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} required
        className="mt-1 w-full h-10 px-3 rounded-xl bg-surface-elevated border border-border text-sm" />
    </div>
  );
}

function InscriptionConfigTab() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["inscription-config"], queryFn: getInscriptionConfig });
  const [draft, setDraft] = useState<InscriptionConfig | null>(null);

  useEffect(() => {
    if (q.data && !draft) setDraft(q.data.config);
  }, [q.data, draft]);

  const save = useMutation({
    mutationFn: async () => {
      if (!draft || !q.data) throw new Error("Sin cambios");
      const { error } = await supabase
        .from("inscription_form_config")
        .update({ config: draft as any, version: (q.data.version ?? 1) + 1 })
        .eq("id", q.data.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Formulario guardado"); qc.invalidateQueries({ queryKey: ["inscription-config"] }); qc.invalidateQueries({ queryKey: ["inscription-config-public"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  if (!draft) return <p className="text-sm text-muted-foreground">Cargando...</p>;

  function updateStep(i: number, patch: Partial<FormStep>) {
    const steps = [...draft!.steps]; steps[i] = { ...steps[i], ...patch };
    setDraft({ ...draft!, steps });
  }
  function addStep() { setDraft({ ...draft!, steps: [...draft!.steps, { title: "Nuevo paso", description: "", fields: [] }] }); }
  function removeStep(i: number) { const steps = draft!.steps.filter((_, j) => j !== i); setDraft({ ...draft!, steps }); }
  function move(i: number, dir: -1 | 1) {
    const j = i + dir; if (j < 0 || j >= draft!.steps.length) return;
    const steps = [...draft!.steps]; [steps[i], steps[j]] = [steps[j], steps[i]]; setDraft({ ...draft!, steps });
  }
  function addField(i: number) {
    const steps = [...draft!.steps];
    steps[i] = { ...steps[i], fields: [...steps[i].fields, { key: `campo_${Date.now()}`, label: "Nuevo campo", type: "text", required: false }] };
    setDraft({ ...draft!, steps });
  }
  function updateField(si: number, fi: number, patch: Partial<FormField>) {
    const steps = [...draft!.steps];
    const fields = [...steps[si].fields]; fields[fi] = { ...fields[fi], ...patch } as FormField;
    steps[si] = { ...steps[si], fields }; setDraft({ ...draft!, steps });
  }
  function removeField(si: number, fi: number) {
    const steps = [...draft!.steps];
    steps[si] = { ...steps[si], fields: steps[si].fields.filter((_, j) => j !== fi) };
    setDraft({ ...draft!, steps });
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-[var(--gradient-card)] p-4 flex items-center justify-between">
        <div>
          <h3 className="font-display text-lg font-semibold">Pasos del formulario</h3>
          <p className="text-xs text-muted-foreground">Edita lo que pides en /inscripcion. Los cambios afectan a nuevas solicitudes.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={addStep} className="h-10 px-4 rounded-xl border border-border text-sm flex items-center gap-2"><Plus className="w-4 h-4" /> Paso</button>
          <button onClick={() => save.mutate()} disabled={save.isPending} className="h-10 px-5 rounded-xl bg-gradient-to-r from-primary to-primary-glow text-primary-foreground font-semibold text-sm">
            {save.isPending ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>
      </div>

      {draft.steps.map((s, i) => (
        <div key={i} className="rounded-2xl border border-border bg-[var(--gradient-card)] p-5">
          <div className="flex items-start gap-3">
            <span className="w-8 h-8 rounded-lg bg-primary/15 text-primary text-sm font-bold flex items-center justify-center">{i + 1}</span>
            <div className="flex-1 space-y-2">
              <input value={s.title} onChange={(e) => updateStep(i, { title: e.target.value })}
                className="w-full h-9 px-3 rounded-lg bg-surface-elevated border border-border text-sm font-semibold" />
              <input value={s.description ?? ""} onChange={(e) => updateStep(i, { description: e.target.value })} placeholder="Descripción opcional"
                className="w-full h-9 px-3 rounded-lg bg-surface-elevated border border-border text-xs text-muted-foreground" />
            </div>
            <div className="flex gap-1">
              <button onClick={() => move(i, -1)} className="w-8 h-8 rounded-lg hover:bg-surface-elevated"><ChevronUp className="w-4 h-4 mx-auto" /></button>
              <button onClick={() => move(i, 1)} className="w-8 h-8 rounded-lg hover:bg-surface-elevated"><ChevronDown className="w-4 h-4 mx-auto" /></button>
              <button onClick={() => removeStep(i)} className="w-8 h-8 rounded-lg hover:bg-destructive/15 text-destructive"><Trash2 className="w-4 h-4 mx-auto" /></button>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            {s.fields.map((f, fi) => (
              <div key={fi} className="rounded-lg border border-border bg-surface-elevated/40 p-3 grid grid-cols-12 gap-2 items-center">
                <input value={f.label} onChange={(e) => updateField(i, fi, { label: e.target.value })} placeholder="Etiqueta"
                  className="col-span-12 sm:col-span-4 h-9 px-2 rounded-md bg-surface-elevated border border-border text-sm" />
                <input value={f.key} onChange={(e) => updateField(i, fi, { key: e.target.value.replace(/[^a-z0-9_]/gi, "_") })} placeholder="clave"
                  className="col-span-6 sm:col-span-2 h-9 px-2 rounded-md bg-surface-elevated border border-border text-xs font-mono" />
                <select value={f.type} onChange={(e) => updateField(i, fi, { type: e.target.value as any })}
                  className="col-span-6 sm:col-span-2 h-9 px-2 rounded-md bg-surface-elevated border border-border text-xs">
                  <option value="text">Texto</option>
                  <option value="email">Email</option>
                  <option value="tel">Teléfono</option>
                  <option value="number">Número</option>
                  <option value="date">Fecha</option>
                  <option value="select">Selección</option>
                  <option value="textarea">Área de texto</option>
                  <option value="checkbox">Checkbox</option>
                  <option value="plan_select">Seleccionar plan</option>
                </select>
                {f.type === "select" && (
                  <input value={(f.options ?? []).join(", ")} onChange={(e) => updateField(i, fi, { options: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
                    placeholder="opcion1, opcion2"
                    className="col-span-12 sm:col-span-3 h-9 px-2 rounded-md bg-surface-elevated border border-border text-xs" />
                )}
                <label className={`col-span-6 ${f.type === "select" ? "sm:col-span-1" : "sm:col-span-3"} flex items-center gap-2 text-xs`}>
                  <input type="checkbox" checked={!!f.required} onChange={(e) => updateField(i, fi, { required: e.target.checked })} />
                  Obligatorio
                </label>
                <button onClick={() => removeField(i, fi)} className="col-span-6 sm:col-span-1 w-9 h-9 rounded-lg hover:bg-destructive/15 text-destructive justify-self-end">
                  <Trash2 className="w-4 h-4 mx-auto" />
                </button>
              </div>
            ))}
            <button onClick={() => addField(i)} className="w-full h-9 rounded-lg border border-dashed border-border text-xs text-muted-foreground hover:border-primary hover:text-primary flex items-center justify-center gap-1">
              <Plus className="w-3 h-3" /> Agregar campo
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
