import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

function normalizeAnswer(s: string) {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}
async function sha256(text: string) {
  const { createHash } = await import("crypto");
  return createHash("sha256").update(text).digest("hex");
}

/** Step 1: client submits PIN, we return the security question (no answer yet). */
export const getSecurityQuestion = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({ pin: z.string().regex(/^\d{4}$/, "El PIN debe tener 4 dígitos") }).parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: member } = await supabaseAdmin
      .from("members")
      .select("id, security_question")
      .eq("recovery_pin", data.pin)
      .maybeSingle();
    if (!member || !member.security_question) {
      throw new Error("PIN no válido o sin pregunta de seguridad configurada.");
    }
    return { question: member.security_question as string };
  });

/** Step 2: client submits PIN + answer, we verify and return credentials. */
export const recoverCredentials = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({
      pin: z.string().regex(/^\d{4}$/),
      answer: z.string().min(1).max(200),
    }).parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: member } = await supabaseAdmin
      .from("members")
      .select("id, full_name, email, temp_password, security_answer_hash")
      .eq("recovery_pin", data.pin)
      .maybeSingle();
    if (!member) throw new Error("PIN no válido.");
    if (!member.security_answer_hash) throw new Error("Este miembro no tiene pregunta de seguridad. Contacta a recepción.");
    const submitted = await sha256(normalizeAnswer(data.answer));
    if (submitted !== member.security_answer_hash) throw new Error("La respuesta no coincide.");
    return {
      full_name: member.full_name,
      email: member.email,
      password: member.temp_password,
    };
  });