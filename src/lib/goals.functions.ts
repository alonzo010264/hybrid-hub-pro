import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const MessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(4000),
});

const SYSTEM_PROMPT = `Eres un asistente amable y motivador de Adames Hybrid Gym. Tu trabajo es entender en pocos turnos qué busca lograr el nuevo miembro para que su entrenador pueda ayudarle mejor.

Pregunta de forma natural (una pregunta clara por turno) sobre:
1. Objetivo principal (bajar de peso, ganar músculo, resistencia, rehabilitación, bienestar, etc.).
2. Nivel actual y experiencia previa con ejercicio.
3. Lesiones, condiciones médicas o limitaciones.
4. Disponibilidad semanal y horario preferido.
5. Algo personal que lo motive.

Cuando creas que tienes suficiente información (normalmente entre 4 y 6 turnos), termina TU mensaje SOLO con el token \`[[FIN]]\` (sin más texto después). No menciones el token al usuario.

Sé breve, cálido y en español dominicano informal pero respetuoso.`;

export const chatGoal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      messages: z.array(MessageSchema).min(0).max(40),
    }).parse(input),
  )
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY no configurada");

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...data.messages],
      }),
    });
    if (resp.status === 429) throw new Error("Demasiadas solicitudes, intenta más tarde.");
    if (resp.status === 402) throw new Error("Sin créditos en la pasarela de IA.");
    if (!resp.ok) throw new Error(`IA error ${resp.status}`);
    const json: any = await resp.json();
    const content: string = json.choices?.[0]?.message?.content ?? "";
    const done = content.includes("[[FIN]]");
    const cleaned = content.replace("[[FIN]]", "").trim();
    return { content: cleaned, done };
  });

const SUMMARIZE_SCHEMA = {
  name: "save_member_goals",
  description: "Resume los objetivos del miembro y prioridad sugerida.",
  parameters: {
    type: "object",
    properties: {
      primary_goal: { type: "string", description: "Objetivo principal en 2-4 palabras" },
      summary: { type: "string", description: "Resumen breve (1-2 oraciones) para el entrenador" },
      priority: { type: "string", enum: ["low", "medium", "high"] },
      details: {
        type: "object",
        properties: {
          experience: { type: "string" },
          limitations: { type: "string" },
          availability: { type: "string" },
          motivation: { type: "string" },
        },
      },
    },
    required: ["primary_goal", "summary", "priority"],
  },
};

export const finalizeGoal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      messages: z.array(MessageSchema).min(1).max(40),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY no configurada");

    // Resolve member from auth user
    const { data: member, error: mErr } = await supabase
      .from("members").select("id").eq("auth_user_id", userId).single();
    if (mErr || !member) throw new Error("No se encontró el miembro vinculado a tu cuenta");

    // Ask the model for a structured summary
    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "Resume la siguiente conversación de objetivos y llama a la función save_member_goals." },
          ...data.messages,
        ],
        tools: [{ type: "function", function: SUMMARIZE_SCHEMA }],
        tool_choice: { type: "function", function: { name: "save_member_goals" } },
      }),
    });
    if (!resp.ok) throw new Error(`IA error ${resp.status}`);
    const json: any = await resp.json();
    const args = json.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    let parsed: any = { primary_goal: "Por definir", summary: "", priority: "medium", details: {} };
    if (args) try { parsed = { ...parsed, ...JSON.parse(args) }; } catch {}

    const { error: insErr } = await supabase.from("member_goals").insert({
      member_id: member.id,
      primary_goal: parsed.primary_goal,
      summary: parsed.summary,
      priority: parsed.priority,
      details: parsed.details ?? {},
      raw_conversation: data.messages as any,
      status: "new",
    });
    if (insErr) throw new Error(insErr.message);
    return { ok: true, summary: parsed };
  });

export const assignTrainer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      goal_id: z.string().uuid(),
      trainer_id: z.string().uuid().nullable(),
      status: z.enum(["new", "in_progress", "done"]).optional(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const patch: any = { assigned_trainer_id: data.trainer_id };
    if (data.status) patch.status = data.status;
    const { error } = await supabase.from("member_goals").update(patch).eq("id", data.goal_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
