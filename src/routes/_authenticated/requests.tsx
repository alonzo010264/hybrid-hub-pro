import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { listInscriptionRequests, listPlans, type InscriptionRequest } from "@/lib/api/queries";
import { approveInscription, rejectInscription } from "@/lib/inscription.functions";
import { toast } from "sonner";
import { Check, X, Eye, FileText, Clock, Loader2, Copy } from "lucide-react";

export const Route = createFileRoute("/_authenticated/requests")({
  component: RequestsPage,
});

function RequestsPage() {
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected">("pending");
  const q = useQuery({
    queryKey: ["inscription-requests", filter],
    queryFn: () => listInscriptionRequests(filter),
  });
  const [selected, setSelected] = useState<InscriptionRequest | null>(null);
  const [approving, setApproving] = useState<InscriptionRequest | null>(null);

  return (
    <div>
      <PageHeader title="Solicitudes de inscripción" subtitle="Aprueba o rechaza nuevas inscripciones, registra el pago y genera factura." />

      <div className="flex gap-2 mb-5">
        {(["pending", "approved", "rejected"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 h-9 rounded-lg text-sm font-semibold ${filter === f ? "bg-primary text-primary-foreground" : "bg-surface-elevated text-muted-foreground hover:text-foreground"}`}>
            {f === "pending" ? "Pendientes" : f === "approved" ? "Aprobadas" : "Rechazadas"}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-[var(--gradient-card)] overflow-hidden">
        {q.isLoading ? <p className="p-8 text-center text-sm text-muted-foreground">Cargando...</p> :
          (q.data ?? []).length === 0 ? <p className="p-10 text-center text-sm text-muted-foreground">No hay solicitudes en esta categoría.</p> :
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
                <th className="text-left font-semibold px-5 py-3">Cliente</th>
                <th className="text-left font-semibold px-3 py-3">Contacto</th>
                <th className="text-left font-semibold px-3 py-3">Plan deseado</th>
                <th className="text-left font-semibold px-3 py-3">Fecha</th>
                <th className="text-right font-semibold px-5 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {(q.data ?? []).map((r) => (
                <tr key={r.id} className="border-t border-border/60 hover:bg-surface-elevated/40">
                  <td className="px-5 py-3.5">
                    <p className="font-medium">{r.full_name}</p>
                    <p className="text-xs text-muted-foreground">{(r.form_data as any)?.goal ?? ""}</p>
                  </td>
                  <td className="px-3 py-3.5 text-xs text-muted-foreground">
                    <p>{r.email}</p><p>{r.phone}</p>
                  </td>
                  <td className="px-3 py-3.5">
                    {r.plan ? <span className="text-sm font-semibold" style={{ color: r.plan.color }}>{r.plan.name}</span> : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-3 py-3.5 text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString("es")}</td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="inline-flex gap-1">
                      <button onClick={() => setSelected(r)} className="w-9 h-9 rounded-lg hover:bg-surface-elevated inline-flex items-center justify-center" title="Ver detalles">
                        <Eye className="w-4 h-4" />
                      </button>
                      {r.status === "pending" && <>
                        <button onClick={() => setApproving(r)} className="h-9 px-3 rounded-lg bg-success/15 text-success text-xs font-semibold inline-flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" /> Aprobar
                        </button>
                        <RejectButton id={r.id} />
                      </>}
                      {r.status === "approved" && r.member_id && (
                        <Link to="/invoices" className="h-9 px-3 rounded-lg bg-primary/10 text-primary text-xs font-semibold inline-flex items-center gap-1">
                          <FileText className="w-3.5 h-3.5" /> Factura
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        }
      </div>

      {selected && <DetailsDialog req={selected} onClose={() => setSelected(null)} />}
      {approving && <ApproveDialog req={approving} onClose={() => setApproving(null)} />}
    </div>
  );
}

function RejectButton({ id }: { id: string }) {
  const qc = useQueryClient();
  const rejectFn = useServerFn(rejectInscription);
  const m = useMutation({
    mutationFn: (reason: string) => rejectFn({ data: { request_id: id, reason } }),
    onSuccess: () => { toast.success("Solicitud rechazada"); qc.invalidateQueries({ queryKey: ["inscription-requests"] }); qc.invalidateQueries({ queryKey: ["dashboard-stats"] }); },
    onError: (e: any) => toast.error(e.message),
  });
  return (
    <button onClick={() => { const r = prompt("Motivo (opcional):") ?? ""; m.mutate(r); }}
      className="h-9 px-3 rounded-lg bg-destructive/15 text-destructive text-xs font-semibold inline-flex items-center gap-1">
      <X className="w-3.5 h-3.5" /> Rechazar
    </button>
  );
}

function DetailsDialog({ req, onClose }: { req: InscriptionRequest; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-lg bg-card rounded-2xl border border-border p-6 max-h-[85vh] overflow-y-auto">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="font-display text-xl font-bold">{req.full_name}</h3>
            <p className="text-xs text-muted-foreground">{new Date(req.created_at).toLocaleString("es")}</p>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-lg hover:bg-surface-elevated"><X className="w-4 h-4 mx-auto" /></button>
        </div>
        <div className="space-y-2 text-sm">
          <Field label="Correo" value={req.email} />
          <Field label="Teléfono" value={req.phone ?? "—"} />
          <Field label="Plan deseado" value={req.plan?.name ?? "—"} />
          <Field label="Estado" value={req.status} />
          {Object.entries((req.form_data as any) ?? {}).map(([k, v]) => (
            <Field key={k} label={k} value={String(v)} />
          ))}
          {req.notes && <Field label="Notas" value={req.notes} />}
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2 border-b border-border pb-1.5">
      <span className="text-muted-foreground text-xs uppercase tracking-wide">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}

function ApproveDialog({ req, onClose }: { req: InscriptionRequest; onClose: () => void }) {
  const qc = useQueryClient();
  const approveFn = useServerFn(approveInscription);
  const plansQ = useQuery({ queryKey: ["plans"], queryFn: listPlans });
  const initialPlanId = req.desired_plan_id ?? "";
  const [planId, setPlanId] = useState(initialPlanId);
  const selectedPlan = plansQ.data?.find((p) => p.id === planId);
  const [amount, setAmount] = useState<number>(0);
  const [method, setMethod] = useState<"cash" | "transfer" | "card" | "mobile">("cash");
  const [reference, setReference] = useState("");
  const [creds, setCreds] = useState<{ email: string; password: string } | null>(null);
  const [pin, setPin] = useState<string | null>(null);

  const m = useMutation({
    mutationFn: async () => {
      const finalAmount = amount || (selectedPlan ? Number(selectedPlan.price) : 0);
      return approveFn({ data: { request_id: req.id, plan_id: planId, amount: finalAmount, method, reference: reference || null } });
    },
    onSuccess: (res) => {
      toast.success("Inscripción aprobada");
      setCreds(res.credentials);
      setPin((res.credentials as any).recovery_pin ?? null);
      qc.invalidateQueries({ queryKey: ["inscription-requests"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["members"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md bg-card rounded-2xl border border-border p-6">
        {creds ? (
          <>
            <h3 className="font-display text-xl font-bold mb-1">Credenciales generadas</h3>
            <p className="text-xs text-muted-foreground mb-4">Entrega estos datos al miembro. Si los pierde, podrá recuperarlos en <span className="text-primary font-semibold">/recuperar</span> con su PIN y pregunta de seguridad.</p>
            <div className="rounded-xl bg-surface-elevated border border-primary/30 p-4 space-y-2 font-mono text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Email:</span> <span>{creds.email}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Contraseña:</span> <span className="text-primary font-bold">{creds.password}</span></div>
              {pin && <div className="flex justify-between"><span className="text-muted-foreground">PIN recuperación:</span> <span className="text-primary font-bold tracking-[0.4em]">{pin}</span></div>}
            </div>
            <button onClick={() => { navigator.clipboard.writeText(`${creds.email} / ${creds.password}`); toast.success("Copiado"); }}
              className="mt-3 w-full h-10 rounded-xl border border-border text-sm flex items-center justify-center gap-2"><Copy className="w-4 h-4" /> Copiar</button>
            <button onClick={onClose} className="mt-2 w-full h-10 rounded-xl bg-gradient-to-r from-primary to-primary-glow text-primary-foreground font-semibold">Cerrar</button>
          </>
        ) : (
          <>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-display text-xl font-bold">Aprobar & registrar pago</h3>
              <button onClick={onClose} className="w-9 h-9 rounded-lg hover:bg-surface-elevated"><X className="w-4 h-4 mx-auto" /></button>
            </div>
            <p className="text-sm text-muted-foreground mb-4">Confirma plan y pago. Se creará el miembro, su acceso al portal, factura y membresía activa.</p>
            <form onSubmit={(e) => { e.preventDefault(); if (!planId) return toast.error("Selecciona un plan"); m.mutate(); }} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Plan</label>
                <select value={planId} onChange={(e) => { setPlanId(e.target.value); const p = plansQ.data?.find((x) => x.id === e.target.value); if (p) setAmount(Number(p.price)); }}
                  className="mt-1 w-full h-10 px-3 rounded-xl bg-surface-elevated border border-border text-sm" required>
                  <option value="">Seleccionar...</option>
                  {(plansQ.data ?? []).map((p) => <option key={p.id} value={p.id}>{p.name} — ${Number(p.price).toLocaleString()}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Monto</label>
                  <input type="number" step="0.01" value={amount || (selectedPlan ? Number(selectedPlan.price) : 0)} onChange={(e) => setAmount(Number(e.target.value))}
                    className="mt-1 w-full h-10 px-3 rounded-xl bg-surface-elevated border border-border text-sm" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Método</label>
                  <select value={method} onChange={(e) => setMethod(e.target.value as any)}
                    className="mt-1 w-full h-10 px-3 rounded-xl bg-surface-elevated border border-border text-sm">
                    <option value="cash">Efectivo</option>
                    <option value="transfer">Transferencia</option>
                    <option value="card">Tarjeta</option>
                    <option value="mobile">Pago móvil</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Referencia (opcional)</label>
                <input value={reference} onChange={(e) => setReference(e.target.value)}
                  className="mt-1 w-full h-10 px-3 rounded-xl bg-surface-elevated border border-border text-sm" />
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button type="button" onClick={onClose} className="h-10 px-4 rounded-xl border border-border">Cancelar</button>
                <button type="submit" disabled={m.isPending} className="h-10 px-5 rounded-xl bg-gradient-to-r from-primary to-primary-glow text-primary-foreground font-semibold flex items-center gap-2">
                  {m.isPending && <Loader2 className="w-4 h-4 animate-spin" />} Confirmar
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
