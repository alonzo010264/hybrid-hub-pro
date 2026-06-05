import { UserPlus, CreditCard, ClipboardCheck, UserCog, Receipt, Inbox, Target, FileText, type LucideIcon } from "lucide-react";
import { Link } from "@tanstack/react-router";

const actions: { icon: LucideIcon; label: string; to: any }[] = [
  { icon: Inbox, label: "Solicitudes", to: "/requests" },
  { icon: UserPlus, label: "Nuevo Miembro", to: "/members" },
  { icon: CreditCard, label: "Registrar Pago", to: "/payments" },
  { icon: FileText, label: "Facturas", to: "/invoices" },
  { icon: Target, label: "Objetivos", to: "/goals" },
  { icon: ClipboardCheck, label: "Asistencias", to: "/attendances" },
  { icon: UserCog, label: "Entrenadores", to: "/trainers" },
  { icon: Receipt, label: "Membresías", to: "/memberships" },
];

export function QuickActions() {
  return (
    <div className="rounded-2xl border border-border bg-[var(--gradient-card)] p-5">
      <h3 className="font-display text-lg font-semibold mb-4">Accesos Rápidos</h3>
      <div className="grid grid-cols-3 gap-3">
        {actions.map(({ icon: Icon, label, to }) => (
          <Link key={label} to={to}
            className="group flex flex-col items-center justify-center gap-2 p-4 rounded-xl bg-surface-elevated border border-border hover:border-primary/60 hover:bg-primary/5 transition-all">
            <div className="w-10 h-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
              <Icon className="w-[18px] h-[18px]" />
            </div>
            <span className="text-[11px] font-medium text-center leading-tight">{label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
