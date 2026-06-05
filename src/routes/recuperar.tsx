import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, ShieldCheck, KeyRound, Copy } from "lucide-react";
import { getSecurityQuestion, recoverCredentials } from "@/lib/recover.functions";
import logoAsset from "@/assets/adames-logo.png.asset.json";

export const Route = createFileRoute("/recuperar")({
  head: () => ({
    meta: [
      { title: "Recuperar credenciales — Adames Hybrid Gym" },
      { name: "description", content: "Recupera tu usuario y contraseña con tu PIN de 4 dígitos." },
    ],
  }),
  component: RecoverPage,
});

function RecoverPage() {
  const askFn = useServerFn(getSecurityQuestion);
  const recoverFn = useServerFn(recoverCredentials);
  const [pin, setPin] = useState("");
  const [question, setQuestion] = useState<string | null>(null);
  const [answer, setAnswer] = useState("");
  const [creds, setCreds] = useState<{ email: string; password: string; full_name: string } | null>(null);

  const askM = useMutation({
    mutationFn: () => askFn({ data: { pin } }),
    onSuccess: (res) => setQuestion(res.question),
    onError: (e: any) => toast.error(e.message),
  });
  const recM = useMutation({
    mutationFn: () => recoverFn({ data: { pin, answer } }),
    onSuccess: (res) => setCreds(res as any),
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="min-h-screen bg-background py-10 px-4 relative overflow-hidden flex items-center">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,oklch(0.62_0.21_26/0.18),transparent_60%)] pointer-events-none" />
      <div className="relative max-w-md w-full mx-auto">
        <div className="text-center mb-6">
          <img src={logoAsset.url} alt="Adames Hybrid Gym" className="w-20 h-20 mx-auto drop-shadow-[0_0_25px_rgba(229,57,53,0.4)]" />
          <h1 className="mt-4 font-display text-2xl font-bold">Recupera tu acceso</h1>
          <p className="text-muted-foreground mt-1 text-sm">Usa tu PIN de 4 dígitos y tu respuesta de seguridad.</p>
        </div>

        <div className="rounded-3xl border border-border bg-[var(--gradient-card)] p-6">
          {creds ? (
            <div>
              <div className="w-14 h-14 mx-auto rounded-full bg-success/15 flex items-center justify-center mb-3">
                <ShieldCheck className="w-7 h-7 text-success" />
              </div>
              <h2 className="text-center font-display text-lg font-bold">Hola {creds.full_name}</h2>
              <p className="text-center text-xs text-muted-foreground mb-4">Estas son tus credenciales actuales.</p>
              <div className="rounded-xl bg-surface-elevated border border-primary/30 p-4 space-y-2 font-mono text-sm">
                <div className="flex justify-between gap-2"><span className="text-muted-foreground">Email:</span><span className="text-right break-all">{creds.email}</span></div>
                <div className="flex justify-between gap-2"><span className="text-muted-foreground">Contraseña:</span><span className="text-primary font-bold">{creds.password ?? "—"}</span></div>
              </div>
              <button
                onClick={() => { navigator.clipboard.writeText(`${creds.email} / ${creds.password}`); toast.success("Copiado"); }}
                className="mt-3 w-full h-10 rounded-xl border border-border text-sm flex items-center justify-center gap-2">
                <Copy className="w-4 h-4" /> Copiar
              </button>
              <Link to="/auth" className="mt-2 w-full h-11 rounded-xl bg-gradient-to-r from-primary to-primary-glow text-primary-foreground font-semibold flex items-center justify-center">
                Iniciar sesión
              </Link>
            </div>
          ) : !question ? (
            <form onSubmit={(e) => { e.preventDefault(); if (!/^\d{4}$/.test(pin)) return toast.error("PIN inválido"); askM.mutate(); }}>
              <label className="text-xs font-semibold text-muted-foreground">PIN de 4 dígitos</label>
              <div className="mt-2 flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-muted-foreground" />
                <input
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  inputMode="numeric" maxLength={4} placeholder="1234"
                  className="flex-1 h-12 px-4 rounded-xl bg-surface-elevated border border-border focus:border-primary outline-none text-center text-xl tracking-[0.6em] font-mono"
                />
              </div>
              <button disabled={askM.isPending} className="mt-5 w-full h-12 rounded-xl bg-gradient-to-r from-primary to-primary-glow text-primary-foreground font-semibold flex items-center justify-center gap-2">
                {askM.isPending && <Loader2 className="w-4 h-4 animate-spin" />} Continuar
              </button>
              <p className="text-xs text-muted-foreground mt-3 text-center">
                ¿No tienes PIN? Pídelo en recepción.
              </p>
            </form>
          ) : (
            <form onSubmit={(e) => { e.preventDefault(); if (!answer.trim()) return toast.error("Escribe tu respuesta"); recM.mutate(); }}>
              <div className="rounded-xl bg-surface-elevated border border-border p-3 mb-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Pregunta de seguridad</p>
                <p className="text-sm font-semibold mt-1">{question}</p>
              </div>
              <label className="text-xs font-semibold text-muted-foreground">Tu respuesta</label>
              <input
                value={answer} onChange={(e) => setAnswer(e.target.value)} autoFocus
                className="mt-2 w-full h-12 px-4 rounded-xl bg-surface-elevated border border-border focus:border-primary outline-none text-sm"
              />
              <button disabled={recM.isPending} className="mt-5 w-full h-12 rounded-xl bg-gradient-to-r from-primary to-primary-glow text-primary-foreground font-semibold flex items-center justify-center gap-2">
                {recM.isPending && <Loader2 className="w-4 h-4 animate-spin" />} Ver credenciales
              </button>
              <button type="button" onClick={() => { setQuestion(null); setAnswer(""); }} className="mt-2 w-full h-10 rounded-xl border border-border text-sm">
                Cambiar PIN
              </button>
            </form>
          )}
        </div>

        <div className="text-center mt-5">
          <Link to="/auth" className="text-sm text-muted-foreground hover:text-primary">← Volver al inicio de sesión</Link>
        </div>
      </div>
    </div>
  );
}