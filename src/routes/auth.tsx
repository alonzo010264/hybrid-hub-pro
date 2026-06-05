import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import logoAsset from "@/assets/adames-logo.png.asset.json";
import { Loader2 } from "lucide-react";
import { getMyRole } from "@/lib/users.functions";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [{ title: "Acceso — Adames Hybrid Gym" }],
    links: [
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const fetchRole = useServerFn(getMyRole);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function routeByRole() {
    try {
      const { kind } = await fetchRole({ data: {} as any });
      if (kind === "member") navigate({ to: "/portal", replace: true });
      else navigate({ to: "/", replace: true });
    } catch {
      navigate({ to: "/", replace: true });
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) routeByRole();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      await routeByRole();
    } catch (err: any) {
      toast.error(err.message ?? "Error de autenticación");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-5 bg-background relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,oklch(0.62_0.21_26/0.18),transparent_60%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_80%,oklch(0.78_0.16_70/0.10),transparent_55%)] pointer-events-none" />

      <div className="relative w-full max-w-md rounded-3xl border border-border bg-[var(--gradient-card)] p-8 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.7)]">
        <div className="flex flex-col items-center mb-6">
          <img src={logoAsset.url} alt="Adames Hybrid Gym" className="w-24 h-24 object-contain drop-shadow-[0_0_25px_rgba(229,57,53,0.4)]" />
          <h1 className="mt-3 font-display text-2xl font-bold">Bienvenido</h1>
          <p className="text-sm text-muted-foreground">Inicia sesión para continuar</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Correo electrónico</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
              className="mt-1 w-full h-11 px-3 rounded-xl bg-surface-elevated border border-border focus:border-primary outline-none text-sm" />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Contraseña</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6}
              className="mt-1 w-full h-11 px-3 rounded-xl bg-surface-elevated border border-border focus:border-primary outline-none text-sm" />
          </div>

          <button disabled={loading} type="submit"
            className="w-full h-11 rounded-xl bg-gradient-to-r from-primary to-primary-glow text-primary-foreground font-semibold flex items-center justify-center gap-2 hover:opacity-95 transition-opacity disabled:opacity-60">
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Iniciar sesión
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Las cuentas del sistema las crea un administrador desde el panel.
        </p>

        <div className="mt-6 pt-6 border-t border-border text-center">
          <p className="text-sm text-muted-foreground mb-3">¿Eres nuevo en el gym?</p>
          <Link to="/inscripcion"
            className="inline-flex items-center justify-center h-11 px-6 rounded-xl border-2 border-primary text-primary font-semibold hover:bg-primary hover:text-primary-foreground transition-colors">
            Inscribirme →
          </Link>
        </div>
      </div>
    </div>
  );
}
