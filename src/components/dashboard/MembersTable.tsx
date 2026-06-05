import { MoreHorizontal } from "lucide-react";

const members = [
  { name: "Carlos Martínez", phone: "809-123-4567", plan: "Premium", status: "Activo", lastPay: "15/05/2024", attendance: 18, initials: "CM", tone: "from-rose-500 to-red-600" },
  { name: "Laura Gómez", phone: "809-987-6543", plan: "Clásica", status: "Activo", lastPay: "14/05/2024", attendance: 12, initials: "LG", tone: "from-fuchsia-500 to-pink-600" },
  { name: "Miguel Ángel", phone: "809-456-7890", plan: "VIP", status: "Activo", lastPay: "15/05/2024", attendance: 22, initials: "MA", tone: "from-amber-400 to-orange-500" },
  { name: "Ana Rodríguez", phone: "809-321-9876", plan: "Clásica", status: "Vencido", lastPay: "10/04/2024", attendance: 7, initials: "AR", tone: "from-violet-500 to-indigo-600" },
  { name: "José Pérez", phone: "809-654-3210", plan: "Premium", status: "Activo", lastPay: "15/05/2024", attendance: 15, initials: "JP", tone: "from-emerald-500 to-teal-600" },
];

export function MembersTable() {
  return (
    <div className="rounded-2xl border border-border bg-[var(--gradient-card)] overflow-hidden">
      <div className="flex items-center justify-between p-5 border-b border-border">
        <h3 className="font-display text-lg font-semibold">Miembros Recientes</h3>
        <button className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-primary/50 text-primary hover:bg-primary/10 transition-colors">
          Ver todos
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
              <th className="text-left font-semibold px-5 py-3">Miembro</th>
              <th className="text-left font-semibold px-3 py-3">Membresía</th>
              <th className="text-left font-semibold px-3 py-3">Estado</th>
              <th className="text-left font-semibold px-3 py-3">Último Pago</th>
              <th className="text-left font-semibold px-3 py-3">Asist.</th>
              <th className="text-right font-semibold px-5 py-3">Acción</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.name} className="border-t border-border/60 hover:bg-surface-elevated/40 transition-colors">
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${m.tone} flex items-center justify-center text-xs font-bold text-white`}>{m.initials}</div>
                    <div>
                      <p className="font-medium">{m.name}</p>
                      <p className="text-xs text-muted-foreground">{m.phone}</p>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-3.5">{m.plan}</td>
                <td className="px-3 py-3.5">
                  <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${m.status === "Activo" ? "text-success" : "text-destructive"}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${m.status === "Activo" ? "bg-success" : "bg-destructive"}`} />
                    {m.status}
                  </span>
                </td>
                <td className="px-3 py-3.5 text-muted-foreground">{m.lastPay}</td>
                <td className="px-3 py-3.5 font-medium">{m.attendance}</td>
                <td className="px-5 py-3.5 text-right">
                  <button className="w-8 h-8 inline-flex items-center justify-center rounded-lg border border-border hover:bg-surface-elevated transition-colors">
                    <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
