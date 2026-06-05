import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useRef } from "react";
import { getInvoice } from "@/lib/api/queries";
import { Printer, ArrowLeft, Download } from "lucide-react";
import logoAsset from "@/assets/adames-logo.png.asset.json";
import { downloadPdf } from "@/lib/pdf";

export const Route = createFileRoute("/_authenticated/invoices/$id")({
  component: InvoicePage,
});

const methodLabels: Record<string, string> = { cash: "Efectivo", transfer: "Transferencia", card: "Tarjeta", mobile: "Pago móvil" };

function InvoicePage() {
  const { id } = Route.useParams();
  const q = useQuery({ queryKey: ["invoice", id], queryFn: () => getInvoice(id) });
  const pdfRef = useRef<HTMLDivElement>(null);
  if (q.isLoading) return <p className="p-10 text-sm text-muted-foreground">Cargando...</p>;
  if (q.error || !q.data) return <p className="p-10 text-sm text-destructive">No se encontró la factura.</p>;
  const inv = q.data;
  return (
    <div>
      <div className="flex items-center justify-between mb-5 print:hidden gap-2 flex-wrap">
        <Link to="/invoices" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"><ArrowLeft className="w-4 h-4" /> Facturas</Link>
        <div className="flex gap-2">
          <button onClick={() => pdfRef.current && downloadPdf(pdfRef.current, `${inv.number}.pdf`)}
            className="h-10 px-4 rounded-xl bg-gradient-to-r from-primary to-primary-glow text-primary-foreground font-semibold flex items-center gap-2">
            <Download className="w-4 h-4" /> Descargar PDF
          </button>
          <button onClick={() => window.print()} className="h-10 px-4 rounded-xl border border-border font-semibold flex items-center gap-2">
            <Printer className="w-4 h-4" /> Imprimir
          </button>
        </div>
      </div>
      <div ref={pdfRef} className="bg-white text-black mx-auto max-w-3xl rounded-2xl p-10 print:rounded-none print:p-12 print:max-w-none shadow-2xl">
        <div className="flex items-start justify-between border-b-2 border-black pb-6">
          <div className="flex items-center gap-3">
            <img src={logoAsset.url} alt="" className="w-16 h-16" />
            <div>
              <h1 className="font-display text-2xl font-bold">Adames Hybrid Gym</h1>
              <p className="text-xs">Sistema de gestión integral</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-widest text-gray-600">Factura</p>
            <p className="font-mono text-lg font-bold">{inv.number}</p>
            <p className="text-xs text-gray-600 mt-1">{new Date(inv.issued_at).toLocaleDateString("es")}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-6 mt-6 text-sm">
          <div>
            <p className="text-xs uppercase text-gray-500 font-semibold mb-2">Facturado a</p>
            <p className="font-bold">{inv.member?.full_name}</p>
            <p>{inv.member?.email}</p>
            <p>{(inv.member as any)?.phone}</p>
            <p className="text-xs text-gray-600">Código: {inv.member?.member_code}</p>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase text-gray-500 font-semibold mb-2">Estado</p>
            <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800 uppercase">{inv.status === "paid" ? "Pagado" : inv.status}</span>
          </div>
        </div>
        <table className="w-full mt-8 text-sm">
          <thead>
            <tr className="border-b-2 border-black">
              <th className="text-left py-2 text-xs uppercase text-gray-600">Concepto</th>
              <th className="text-right py-2 text-xs uppercase text-gray-600">Monto</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-gray-200">
              <td className="py-3">
                <p className="font-semibold">{inv.plan?.name ?? "Membresía"}</p>
                <p className="text-xs text-gray-600">{inv.description}</p>
              </td>
              <td className="py-3 text-right font-semibold">${Number(inv.amount).toLocaleString()}</td>
            </tr>
            <tr>
              <td className="py-3 text-right text-xs uppercase text-gray-600">Método</td>
              <td className="py-3 text-right text-xs">{methodLabels[inv.method] ?? inv.method}</td>
            </tr>
            <tr className="border-t-2 border-black">
              <td className="py-3 font-bold text-lg">TOTAL</td>
              <td className="py-3 text-right font-bold text-lg">${Number(inv.amount).toLocaleString()}</td>
            </tr>
          </tbody>
        </table>
        <p className="mt-10 text-xs text-gray-500 text-center">Gracias por tu confianza — ¡Bienvenido a la familia Adames Hybrid Gym!</p>
      </div>
    </div>
  );
}
