import { Link, useLocation, useRouter } from "@tanstack/react-router";
import { Home, Users, CreditCard, Receipt, ClipboardCheck, UserCog, Settings as SettingsIcon, Bell, Search, Menu, LogOut, Inbox, Target, FileText, BarChart3 } from "lucide-react";
import { useEffect, useState } from "react";
import logoAsset from "@/assets/adames-logo.png.asset.json";
import { supabase } from "@/integrations/supabase/client";

const nav = [
  { icon: Home, label: "Dashboard", to: "/" },
  { icon: Inbox, label: "Solicitudes", to: "/requests" },
  { icon: Users, label: "Miembros", to: "/members" },
  { icon: Target, label: "Objetivos", to: "/goals" },
  { icon: CreditCard, label: "Membresías", to: "/memberships" },
  { icon: Receipt, label: "Pagos", to: "/payments" },
  { icon: FileText, label: "Facturas", to: "/invoices" },
  { icon: ClipboardCheck, label: "Asistencias", to: "/attendances" },
  { icon: BarChart3, label: "Reportes", to: "/reports" },
  { icon: UserCog, label: "Entrenadores", to: "/trainers" },
  { icon: SettingsIcon, label: "Configuración", to: "/settings" },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const router = useRouter();
  const [email, setEmail] = useState<string>("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      setEmail(data.user?.email ?? "");
      if (data.user) {
        // Redirect members to their portal
        const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", data.user.id);
        const list = (roles ?? []).map((r: any) => r.role);
        const isStaff = list.some((r: string) => r === "admin" || r === "reception" || r === "trainer");
        if (!isStaff && list.includes("member")) router.navigate({ to: "/portal", replace: true });
      }
    })();
  }, [router]);
  useEffect(() => { setOpen(false); }, [location.pathname]);

  async function signOut() {
    await supabase.auth.signOut();
    router.navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      <aside className={`${open ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0 fixed lg:sticky top-0 z-40 flex flex-col w-[260px] shrink-0 bg-sidebar border-r border-border h-screen transition-transform`}>
        <div className="flex flex-col items-center pt-8 pb-6 px-6">
          <img src={logoAsset.url} alt="Adames Hybrid Gym" className="w-28 h-28 object-contain drop-shadow-[0_0_25px_rgba(229,57,53,0.35)]" />
        </div>
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
          {nav.map(({ icon: Icon, label, to }) => {
            const active = location.pathname === to || (to !== "/" && location.pathname.startsWith(to));
            return (
              <Link
                key={to}
                to={to}
                className={`group w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  active
                    ? "bg-gradient-to-r from-primary to-primary-glow text-primary-foreground shadow-[0_8px_24px_-8px_oklch(0.62_0.21_26/0.6)]"
                    : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                }`}
              >
                <Icon className="w-[18px] h-[18px]" strokeWidth={active ? 2.4 : 2} />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="m-3 p-3 rounded-xl bg-sidebar-accent/60 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center font-display font-bold text-primary-foreground">
            {(email[0] || "A").toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{email.split("@")[0] || "Admin"}</p>
            <p className="text-xs text-muted-foreground truncate">{email || "Administrador"}</p>
          </div>
          <button onClick={signOut} title="Salir" className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {open && <div className="lg:hidden fixed inset-0 bg-black/60 z-30" onClick={() => setOpen(false)} />}

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="flex items-center gap-3 px-5 lg:px-8 py-4 border-b border-border bg-background/80 backdrop-blur-xl sticky top-0 z-20">
          <button onClick={() => setOpen(true)} className="lg:hidden p-2 rounded-lg hover:bg-surface-elevated">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex-1" />
          <div className="hidden md:flex items-center gap-2 px-4 h-10 w-72 rounded-xl bg-surface-elevated border border-border focus-within:border-primary/60 transition-colors">
            <Search className="w-4 h-4 text-muted-foreground" />
            <input placeholder="Buscar..." className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground" />
          </div>
          <button className="relative w-10 h-10 rounded-xl bg-surface-elevated border border-border flex items-center justify-center hover:border-primary/60">
            <Bell className="w-[18px] h-[18px]" />
          </button>
        </header>
        <main className="flex-1 p-5 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
