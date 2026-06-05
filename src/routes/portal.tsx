import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { chatGoal, finalizeGoal } from "@/lib/goals.functions";
import { toast } from "sonner";
import { Send, LogOut, Sparkles, Check, Loader2 } from "lucide-react";
import logoAsset from "@/assets/adames-logo.png.asset.json";

export const Route = createFileRoute("/portal")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: PortalPage,
});

type Msg = { role: "user" | "assistant"; content: string };

function PortalPage() {
  const router = useRouter();
  const chat = useServerFn(chatGoal);
  const finalize = useServerFn(finalizeGoal);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [doneFlag, setDoneFlag] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<any>(null);
  const [member, setMember] = useState<{ full_name: string; goals: number } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { scrollRef.current?.scrollTo({ top: 9e9, behavior: "smooth" }); }, [messages, thinking]);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data: m } = await supabase.from("members").select("id, full_name").eq("auth_user_id", u.user.id).maybeSingle();
      if (m) {
        const { count } = await supabase.from("member_goals").select("id", { count: "exact", head: true }).eq("member_id", m.id);
        setMember({ full_name: m.full_name, goals: count ?? 0 });
      }
      // Start the conversation
      askAI([]);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function askAI(history: Msg[]) {
    setThinking(true);
    try {
      const res = await chat({ data: { messages: history } });
      setMessages((prev) => [...prev, { role: "assistant", content: res.content }]);
      if (res.done) setDoneFlag(true);
    } catch (e: any) { toast.error(e.message); }
    finally { setThinking(false); }
  }

  async function send() {
    if (!input.trim()) return;
    const next: Msg[] = [...messages, { role: "user", content: input.trim() }];
    setMessages(next);
    setInput("");
    await askAI(next);
  }

  async function handleFinalize() {
    if (messages.length < 2) return;
    setSaving(true);
    try {
      const res = await finalize({ data: { messages } });
      setSaved(res.summary);
      toast.success("¡Objetivos guardados! Un entrenador te contactará pronto.");
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  }

  async function signOut() {
    await supabase.auth.signOut();
    router.navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="max-w-3xl mx-auto px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logoAsset.url} alt="" className="w-10 h-10" />
            <div>
              <p className="font-display font-bold leading-tight">Portal del Miembro</p>
              <p className="text-xs text-muted-foreground">Hola{member ? `, ${member.full_name.split(" ")[0]}` : ""} 👋</p>
            </div>
          </div>
          <button onClick={signOut} className="text-xs text-muted-foreground hover:text-destructive inline-flex items-center gap-1"><LogOut className="w-4 h-4" /> Salir</button>
        </div>
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full px-5 py-6">
        {saved ? (
          <div className="rounded-2xl border border-success/30 bg-success/5 p-8 text-center">
            <div className="w-14 h-14 mx-auto rounded-full bg-success/15 flex items-center justify-center mb-4">
              <Check className="w-7 h-7 text-success" />
            </div>
            <h2 className="font-display text-2xl font-bold">¡Listo, {member?.full_name.split(" ")[0] ?? ""}!</h2>
            <p className="text-sm text-muted-foreground mt-2">Tus objetivos llegaron al equipo de Adames Hybrid Gym. Un entrenador se acercará a ti para ayudarte a lograr <span className="text-primary font-semibold">{saved.primary_goal}</span>.</p>
            <button onClick={signOut} className="mt-6 h-11 px-6 rounded-xl bg-gradient-to-r from-primary to-primary-glow text-primary-foreground font-semibold">Cerrar sesión</button>
          </div>
        ) : (
          <>
            <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 mb-4 flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-primary mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold">Cuéntanos tus objetivos</p>
                <p className="text-muted-foreground text-xs">Conversa con nuestro asistente. Esta información ayuda a tu entrenador a diseñar el plan ideal para ti.</p>
              </div>
            </div>

            <div ref={scrollRef} className="rounded-2xl border border-border bg-[var(--gradient-card)] p-4 h-[58vh] overflow-y-auto space-y-3">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-surface-elevated border border-border"}`}>
                    {m.content}
                  </div>
                </div>
              ))}
              {thinking && (
                <div className="flex justify-start">
                  <div className="bg-surface-elevated border border-border rounded-2xl px-4 py-2.5 text-sm inline-flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" /> Escribiendo...
                  </div>
                </div>
              )}
            </div>

            {doneFlag ? (
              <button onClick={handleFinalize} disabled={saving}
                className="mt-4 w-full h-12 rounded-xl bg-gradient-to-r from-primary to-primary-glow text-primary-foreground font-semibold flex items-center justify-center gap-2">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />} Enviar mis objetivos al equipo
              </button>
            ) : (
              <form onSubmit={(e) => { e.preventDefault(); send(); }} className="mt-4 flex gap-2">
                <input value={input} onChange={(e) => setInput(e.target.value)} disabled={thinking} placeholder="Escribe tu respuesta..."
                  className="flex-1 h-12 px-4 rounded-xl bg-surface-elevated border border-border focus:border-primary outline-none text-sm" />
                <button type="submit" disabled={thinking || !input.trim()}
                  className="h-12 px-5 rounded-xl bg-gradient-to-r from-primary to-primary-glow text-primary-foreground font-semibold flex items-center gap-2 disabled:opacity-60">
                  <Send className="w-4 h-4" />
                </button>
              </form>
            )}
          </>
        )}
      </main>
    </div>
  );
}
