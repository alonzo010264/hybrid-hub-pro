import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/PageHeader";
import { listInvoices } from "@/lib/api/queries";
import { FileText } from "lucide-react";

export const Route = createFileRoute("/_authenticated/invoices")({
  component: InvoicesPage,
});

const methodLabels: Record<string, string> = { cash: "Efectivo", transfer: "Transferencia", card: "Tarjeta", mobile: "Pago móvil" };

function InvoicesPage() {
  const q = useQuery({ queryKey: ["invoices"], queryFn: listInvoices });
  const total = (q.data ?? []).filter((i) => i.status === "paid").reduce((s, i) => s + Number(i.amount), 0);
  return (
    <div>
      <PageHeader title="Facturas" subtitle={`Total facturado: $${total.toLocaleString()}`} />
      <div className="rounded-2xl border border-border bg-[var(--gradient-card)] overflow-hidden">
        {q.isLoading ? <p className="p-10 text-center text-sm text-muted-foreground">Cargando...</p> :
          (q.data ?? []).length === 0 ? <p className="p-10 text-center text-sm text-muted-foreground">Sin facturas aún.</p> :
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
                <th className="text-left font-semibold px-5 py-3">Nº</th>
                <th className="text-left font-semibold px-3 py-3">Cliente</th>
                <th className="text-left font-semibold px-3 py-3">Plan</th>
                <th className="text-left font-semibold px-3 py-3">Monto</th>
                <th className="text-left font-semibold px-3 py-3">Método</th>
                <th className="text-left font-semibold px-3 py-3">Fecha</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {(q.data ?? []).map((inv) => (
                <tr key={inv.id} className="border-t border-border/60 hover:bg-surface-elevated/40">
                  <td className="px-5 py-3 font-mono text-xs">{inv.number}</td>
                  <td className="px-3 py-3">{inv.member?.full_name ?? "—"}</td>
                  <td className="px-3 py-3 text-muted-foreground">{inv.plan?.name ?? "—"}</td>
                  <td className="px-3 py-3 font-semibold">${Number(inv.amount).toLocaleString()}</td>
                  <td className="px-3 py-3 text-muted-foreground">{methodLabels[inv.method] ?? inv.method}</td>
                  <td className="px-3 py-3 text-muted-foreground text-xs">{new Date(inv.issued_at).toLocaleDateString("es")}</td>
                  <td className="px-5 py-3 text-right">
                    <Link to="/invoices/$id" params={{ id: inv.id }}
                      className="inline-flex items-center gap-1 h-8 px-3 rounded-lg border border-primary/40 text-primary text-xs font-semibold">
                      <FileText className="w-3.5 h-3.5" /> Ver
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        }
      </div>
    </div>
  );
}
