import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getInscriptionConfig, listPlans, type FormField, type FormStep } from "@/lib/api/queries";
import { toast } from "sonner";
import { Check, Loader2 } from "lucide-react";
import logoAsset from "@/assets/adames-logo.png.asset.json";

export const Route = createFileRoute("/inscripcion")({
  head: () => ({
    meta: [
      { title: "Inscripción — Adames Hybrid Gym" },
      { name: "description", content: "Inscríbete en Adames Hybrid Gym y elige tu plan." },
    ],
    links: [
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap" },
    ],
  }),
  component: PublicSignupPage,
});

function PublicSignupPage() {
  const cfgQ = useQuery({ queryKey: ["inscription-config-public"], queryFn: getInscriptionConfig });
  const plansQ = useQuery({ queryKey: ["public-plans"], queryFn: listPlans });
  const [step, setStep] = useState(0);
  const [values, setValues] = useState<Record<string, any>>({});
  const [done, setDone] = useState(false);

  const steps: FormStep[] = cfgQ.data?.config.steps ?? [];
  const totalSteps = steps.length;

  const submit = useMutation({
    mutationFn: async () => {
      const fullName = values["full_name"];
      const email = values["email"];
      if (!fullName || !email) throw new Error("Faltan datos esenciales");
      const phone = values["phone"] ?? null;
      const desired_plan_id = values["desired_plan_id"] ?? null;
      const security_question = values["security_question"] ?? null;
      const security_answer = values["security_answer"] ?? null;
      if (!security_question || !security_answer) throw new Error("Configura tu pregunta y respuesta de seguridad");
      // Build form_data without the fields stored as columns
      const reserved = new Set(["full_name", "email", "phone", "desired_plan_id", "security_question", "security_answer"]);
      const form_data: Record<string, any> = {};
      Object.entries(values).forEach(([k, v]) => { if (!reserved.has(k)) form_data[k] = v; });
      const { error } = await supabase.from("inscription_requests").insert({
        full_name: fullName, email, phone, desired_plan_id, form_data,
        security_question, security_answer,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Solicitud enviada"); setDone(true); },
    onError: (e: any) => toast.error(e.message),
  });

  function validateStep(idx: number) {
    const s = steps[idx];
    for (const f of s.fields) {
      if (f.required && !values[f.key]) {
        toast.error(`Completa: ${f.label}`);
        return false;
      }
    }
    return true;
  }

  if (cfgQ.isLoading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Cargando...</div>;
  if (!totalSteps) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Formulario no configurado.</div>;

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center p-5 bg-background">
        <div className="max-w-md w-full text-center rounded-3xl border border-border bg-[var(--gradient-card)] p-10">
          <div className="w-16 h-16 mx-auto rounded-full bg-success/15 flex items-center justify-center mb-4">
            <Check className="w-8 h-8 text-success" />
          </div>
          <h1 className="font-display text-2xl font-bold">¡Solicitud recibida!</h1>
          <p className="text-muted-foreground mt-3 text-sm">
            Tu solicitud está <span className="text-primary font-semibold">pendiente de aprobación</span>.
          </p>
          <p className="text-muted-foreground mt-2 text-sm">
            Por favor espera a que el equipo de Adames Hybrid Gym confirme tu inscripción y registre tu pago. Te contactaremos al correo y teléfono que registraste para entregarte tus credenciales de acceso.
          </p>
          <div className="mt-6 rounded-xl bg-surface-elevated/60 border border-border p-4 text-xs text-muted-foreground">
            Guarda tu <span className="text-foreground font-semibold">PIN de recuperación</span> y tu <span className="text-foreground font-semibold">pregunta de seguridad</span>: los necesitarás si pierdes tu contraseña.
          </div>
        </div>
      </div>
    );
  }

  const current = steps[step];

  return (
    <div className="min-h-screen bg-background py-10 px-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,oklch(0.62_0.21_26/0.18),transparent_60%)] pointer-events-none" />
      <div className="relative max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <img src={logoAsset.url} alt="Adames Hybrid Gym" className="w-24 h-24 mx-auto drop-shadow-[0_0_25px_rgba(229,57,53,0.4)]" />
          <h1 className="mt-4 font-display text-3xl lg:text-4xl font-bold">Únete a Adames Hybrid Gym</h1>
          <p className="text-muted-foreground mt-2">Inscripción rápida en {totalSteps} {totalSteps === 1 ? "paso" : "pasos"}</p>
        </div>

        <div className="flex items-center justify-center gap-2 mb-8">
          {steps.map((_, i) => (
            <div key={i} className={`h-1.5 w-16 rounded-full ${step >= i ? "bg-primary" : "bg-border"}`} />
          ))}
        </div>

        <div className="rounded-3xl border border-border bg-[var(--gradient-card)] p-6 lg:p-8">
          <h2 className="font-display text-xl font-bold">{current.title}</h2>
          {current.description && <p className="text-sm text-muted-foreground mt-1 mb-4">{current.description}</p>}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
            {current.fields.map((f) => (
              <DynamicField key={f.key} field={f} value={values[f.key]} onChange={(v) => setValues({ ...values, [f.key]: v })} plans={plansQ.data ?? []} />
            ))}
          </div>

          <div className="mt-6 flex gap-2">
            {step > 0 && <button onClick={() => setStep(step - 1)} className="flex-1 h-12 rounded-xl border border-border">Atrás</button>}
            {step < totalSteps - 1 ? (
              <button onClick={() => validateStep(step) && setStep(step + 1)}
                className="flex-1 h-12 rounded-xl bg-gradient-to-r from-primary to-primary-glow text-primary-foreground font-semibold">
                Continuar
              </button>
            ) : (
              <button onClick={() => validateStep(step) && submit.mutate()} disabled={submit.isPending}
                className="flex-1 h-12 rounded-xl bg-gradient-to-r from-primary to-primary-glow text-primary-foreground font-semibold flex items-center justify-center gap-2">
                {submit.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Enviar solicitud
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function DynamicField({ field, value, onChange, plans }: { field: FormField; value: any; onChange: (v: any) => void; plans: any[] }) {
  const span = field.type === "textarea" || field.type === "plan_select" ? "sm:col-span-2" : "";
  const label = `${field.label}${field.required ? " *" : ""}`;
  const base = "mt-1 w-full h-11 px-3 rounded-xl bg-surface-elevated border border-border focus:border-primary outline-none text-sm";

  if (field.type === "plan_select") {
    return (
      <div className={span}>
        <label className="text-xs font-semibold text-muted-foreground">{label}</label>
        <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
          {plans.filter((p) => p.is_active).map((p) => (
            <label key={p.id}
              className={`cursor-pointer rounded-xl border-2 p-3 transition-all ${value === p.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}>
              <input type="radio" name={field.key} className="sr-only" checked={value === p.id} onChange={() => onChange(p.id)} />
              <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full" style={{ background: p.color }} /><strong className="text-sm">{p.name}</strong></div>
              <p className="text-xs text-muted-foreground mt-1">${Number(p.price).toLocaleString()} · {p.duration_days}d</p>
            </label>
          ))}
        </div>
      </div>
    );
  }
  if (field.type === "select") {
    return (
      <div className={span}>
        <label className="text-xs font-semibold text-muted-foreground">{label}</label>
        <select value={value ?? ""} onChange={(e) => onChange(e.target.value)} className={base}>
          <option value="">Seleccionar...</option>
          {(field.options ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      </div>
    );
  }
  if (field.type === "textarea") {
    return (
      <div className={span}>
        <label className="text-xs font-semibold text-muted-foreground">{label}</label>
        <textarea value={value ?? ""} onChange={(e) => onChange(e.target.value)} rows={3}
          className="mt-1 w-full px-3 py-2 rounded-xl bg-surface-elevated border border-border focus:border-primary outline-none text-sm" />
      </div>
    );
  }
  if (field.type === "checkbox") {
    return (
      <label className={`${span} flex items-center gap-2 text-sm`}>
        <input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} />
        {label}
      </label>
    );
  }
  return (
    <div className={span}>
      <label className="text-xs font-semibold text-muted-foreground">{label}</label>
      <input type={field.type === "tel" ? "tel" : field.type} value={value ?? ""} onChange={(e) => onChange(e.target.value)} className={base} />
    </div>
  );
}
