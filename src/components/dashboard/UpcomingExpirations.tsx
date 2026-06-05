import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function UpcomingExpirations() {
  const { data } = useQuery({
    queryKey: ["upcoming-expirations"],
    queryFn: async () => {
      const in14 = new Date(); in14.setDate(in14.getDate() + 14);
      const { data, error } = await supabase
        .from("member_memberships")
        .select("end_date, member:members(full_name)")
        .gte("end_date", new Date().toISOString().slice(0, 10))
        .lte("end_date", in14.toISOString().slice(0, 10))
        .order("end_date")
        .limit(5);
      if (error) throw error;
      return data as any[];
    },
  });

  return (
    <div className="rounded-2xl border border-border bg-[var(--gradient-card)] p-5">
      <h3 className="font-display text-lg font-semibold mb-4">Próximos Vencimientos</h3>
      {(!data || data.length === 0) ? (
        <p className="text-sm text-muted-foreground py-4 text-center">Sin vencimientos en 14 días</p>
      ) : (
        <ul className="space-y-3">
          {data.map((i: any, idx: number) => {
            const days = Math.max(0, Math.ceil((new Date(i.end_date).getTime() - Date.now()) / 86400000));
            const name = i.member?.full_name ?? "—";
            const initials = name.split(" ").map((p: string) => p[0]).slice(0, 2).join("");
            return (
              <li key={idx} className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center text-xs font-bold text-white">{initials}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{name}</p>
                  <p className="text-xs text-muted-foreground">Vence el {new Date(i.end_date).toLocaleDateString("es")}</p>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-primary/15 text-primary border border-primary/30">{days} días</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
