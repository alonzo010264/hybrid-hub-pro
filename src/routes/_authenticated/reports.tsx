import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/layout/PageHeader";
import { Download, Printer, Calendar as CalendarIcon } from "lucide-react";
import { downloadPdf } from "@/lib/pdf";
import logoAsset from "@/assets/adames-logo.png.asset.json";

export const Route = createFileRoute("/_authenticated/reports")({
  component: ReportsPage,
});

function todayISO() { return new Date().toISOString().slice(0, 10); }

function ReportsPage() {
  const [date, setDate] = useState(todayISO());
  const pdfRef = useRef<HTMLDivElement>(null);

  const q = useQuery({
    queryKey: ["attendance-report", date],
    queryFn: async () => {
      const start = new Date(date + "T00:00:00").toISOString();
      const end = new Date(date + "T23:59:59").toISOString();
      const { data, error } = await supabase
        .from("attendances")
        .select("id, check_in, method, member:members(full_name, member_code, photo_url)")
        .gte("check_in", start).lte("check_in", end)
        .order("check_in", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const rows = q.data ?? [];
  const total = rows.length;
  const byHour = useMemo(() => {
    const map: Record<number, number> = {};
    rows.forEach((r: any) => {
      const h = new Date(r.check_in).getHours();
      map[h] = (map[h] || 0) + 1;
    });
    return map;
  }, [rows]);
  const maxBar = Math.max(1, ...Object.values(byHour));
  const peakHour = Object.entries(byHour).sort((a, b) => b[1] - a[1])[0]?.[0];
  const fmtDateLong = new Date(date + "T00:00:00").toLocaleDateString("es", { day: "numeric", month: "long", year: "numeric" });
  const fmtDay = new Date(date + "T00:00:00").toLocaleDateString("es", { weekday: "long" });

  return (
    <div>
      <PageHeader title="Reportes" subtitle="Reporte diario de entradas — listo para imprimir o descargar en PDF" />

      <div className="flex flex-wrap gap-3 items-end mb-6">
        <div>
          <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1"><CalendarIcon className="w-3.5 h-3.5" /> Fecha</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
            className="mt-1 h-11 px-3 rounded-xl bg-surface-elevated border border-border outline-none text-sm" />
        </div>
        <div className="ml-auto flex gap-2">
          <button onClick={() => pdfRef.current && downloadPdf(pdfRef.current, `reporte-entradas-${date}.pdf`)}
            className="h-11 px-4 rounded-xl bg-gradient-to-r from-primary to-primary-glow text-primary-foreground font-semibold flex items-center gap-2">
            <Download className="w-4 h-4" /> Descargar PDF
          </button>
          <button onClick={() => window.print()} className="h-11 px-4 rounded-xl border border-border font-semibold flex items-center gap-2">
            <Printer className="w-4 h-4" /> Imprimir
          </button>
        </div>
      </div>

      <div ref={pdfRef} className="bg-white text-black mx-auto max-w-[820px] rounded-2xl overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="bg-black text-white flex items-center justify-between px-8 py-6 relative">
          <div className="flex items-center gap-4">
            <img src={logoAsset.url} alt="" className="w-16 h-16" />
          </div>
          <div className="text-right">
            <p className="text-xs tracking-widest text-white/70">REPORTE DE</p>
            <h1 className="font-display text-3xl font-bold text-[#E53935]">ENTRADAS DIARIAS</h1>
            <p className="text-xs text-white/70 mt-1">Resumen de asistencias del día</p>
          </div>
        </div>

        <div className="p-8">
          {/* Top info row */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <InfoBox title="Adames Hybrid Gym" lines={["Calle 123 #45-67, Santo Domingo", "809-123-4567", "info@adamesgym.com"]} />
            <InfoBox title="FECHA DEL REPORTE" lines={[fmtDateLong, `Día: ${fmtDay}`]} big />
            <InfoBox title="GENERADO POR" lines={["Admin", new Date().toLocaleString("es")]} />
          </div>

          {/* Stat cards */}
          <div className="grid grid-cols-4 gap-3 mb-6">
            <Stat color="#E53935" label="TOTAL ENTRADAS" value={String(total)} />
            <Stat color="#111" label="MIEMBROS" value={String(total)} />
            <Stat color="#E53935" label="INVITADOS" value="0" />
            <Stat color="#111" label="HORA PICO" value={peakHour ? `${peakHour}:00` : "—"} />
          </div>

          {/* Hourly chart */}
          <div className="border border-gray-200 rounded-xl p-5 mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-sm">ENTRADAS POR HORA</h3>
              {peakHour && <span className="text-xs">Hora pico <span className="text-[#E53935] font-bold ml-1">{peakHour}:00</span></span>}
            </div>
            <div className="flex items-end gap-1 h-32">
              {Array.from({ length: 18 }, (_, i) => i + 5).map((h) => {
                const v = byHour[h] || 0;
                return (
                  <div key={h} className="flex-1 flex flex-col items-center gap-1">
                    {v > 0 && <span className="text-[9px] font-bold">{v}</span>}
                    <div className="w-full bg-[#E53935] rounded-t" style={{ height: `${(v / maxBar) * 100}%`, minHeight: v ? 4 : 0 }} />
                    <span className="text-[9px] text-gray-500">{h}h</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Table */}
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <div className="bg-black text-white px-4 py-2 font-bold text-sm">LISTADO DE ENTRADAS</div>
            <table className="w-full text-xs">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-3 py-2">#</th>
                  <th className="text-left px-3 py-2">HORA</th>
                  <th className="text-left px-3 py-2">NOMBRE</th>
                  <th className="text-left px-3 py-2">CÓDIGO</th>
                  <th className="text-left px-3 py-2">MÉTODO</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr><td colSpan={5} className="text-center py-6 text-gray-500">Sin entradas registradas este día.</td></tr>
                )}
                {rows.map((r: any, i: number) => (
                  <tr key={r.id} className="border-t border-gray-100">
                    <td className="px-3 py-2">{i + 1}</td>
                    <td className="px-3 py-2">{new Date(r.check_in).toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" })}</td>
                    <td className="px-3 py-2 font-semibold">{r.member?.full_name ?? "—"}</td>
                    <td className="px-3 py-2 text-gray-600">{r.member?.member_code ?? "—"}</td>
                    <td className="px-3 py-2"><span className="inline-block px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-semibold">{r.method ?? "manual"}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-8 border-t-2 border-black pt-4 flex items-center justify-between text-xs">
            <div>
              <p className="font-bold">OBSERVACIONES</p>
              <p className="text-gray-600">Reporte generado automáticamente por el sistema Adames Hybrid Gym.</p>
            </div>
            <div className="text-center">
              <div className="w-40 border-b border-black mb-1" />
              <p className="font-bold">Admin</p>
              <p className="text-gray-600">Administrador</p>
            </div>
          </div>
        </div>

        <div className="bg-black text-white text-center py-3 text-xs tracking-widest">
          FUERZA · DISCIPLINA · RESULTADOS
        </div>
      </div>
    </div>
  );
}

function InfoBox({ title, lines, big }: { title: string; lines: string[]; big?: boolean }) {
  return (
    <div className="border border-gray-200 rounded-xl p-3">
      <p className="text-[10px] tracking-widest text-[#E53935] font-bold mb-1">{title}</p>
      {lines.map((l, i) => (
        <p key={i} className={i === 0 && big ? "font-bold text-lg" : "text-xs text-gray-700"}>{l}</p>
      ))}
    </div>
  );
}

function Stat({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <div className="border border-gray-200 rounded-xl p-3 flex items-center gap-3">
      <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold" style={{ background: color }}>•</div>
      <div>
        <p className="text-[10px] tracking-widest text-gray-500 font-bold">{label}</p>
        <p className="font-bold text-xl">{value}</p>
      </div>
    </div>
  );
}
