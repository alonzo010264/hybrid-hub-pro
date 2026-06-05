import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

function randomPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789abcdefghijkmnpqrstuvwxyz!@#";
  let out = "";
  for (let i = 0; i < 12; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

function normalizeAnswer(s: string) {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

async function sha256(text: string) {
  const { createHash } = await import("crypto");
  return createHash("sha256").update(text).digest("hex");
}

async function generateUniquePin(admin: any) {
  for (let i = 0; i < 20; i++) {
    const pin = String(Math.floor(1000 + Math.random() * 9000));
    const { data } = await admin.from("members").select("id").eq("recovery_pin", pin).maybeSingle();
    if (!data) return pin;
  }
  throw new Error("No se pudo generar un PIN único");
}

/**
 * Approves an inscription request:
 * - Creates the member row (or reuses one linked)
 * - Creates an auth user with a temp password (member role)
 * - Activates the membership for the chosen plan
 * - Registers the payment with the chosen method
 * - Generates an invoice
 * Returns the temp credentials so the admin can hand them over.
 */
export const approveInscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      request_id: z.string().uuid(),
      plan_id: z.string().uuid(),
      amount: z.number().positive(),
      method: z.enum(["cash", "transfer", "card", "mobile"]),
      reference: z.string().max(200).optional().nullable(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 1. Load request and verify status
    const { data: req, error: reqErr } = await supabase
      .from("inscription_requests").select("*").eq("id", data.request_id).single();
    if (reqErr || !req) throw new Error("Solicitud no encontrada");
    if (req.status !== "pending") throw new Error("La solicitud ya fue procesada");

    const { data: plan, error: planErr } = await supabaseAdmin
      .from("membership_plans").select("*").eq("id", data.plan_id).single();
    if (planErr || !plan) throw new Error("Plan no encontrado");

    // 2. Create (or reuse) auth user
    const tempPassword = randomPassword();
    let newUserId: string | null = null;
    let createdNewAuthUser = false;
    const { data: created, error: authErr } = await supabaseAdmin.auth.admin.createUser({
      email: req.email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { full_name: req.full_name },
    });
    if (authErr || !created?.user) {
      // If the email is already registered, try to find and reuse that user
      const msg = (authErr?.message ?? "").toLowerCase();
      if (msg.includes("already") || msg.includes("registered") || msg.includes("exists")) {
        try {
          const { data: list } = await supabaseAdmin.auth.admin.listUsers();
          const existing = list?.users?.find((u: any) => (u.email ?? "").toLowerCase() === req.email.toLowerCase());
          if (!existing) throw new Error("El correo ya está registrado pero no se pudo localizar la cuenta");
          newUserId = existing.id;
          // reset password so we can hand over fresh credentials
          await supabaseAdmin.auth.admin.updateUserById(existing.id, { password: tempPassword, email_confirm: true });
        } catch (e: any) {
          throw new Error(`No se pudo reutilizar la cuenta existente: ${e.message ?? e}`);
        }
      } else {
        throw new Error(`No se pudo crear el usuario: ${authErr?.message ?? "error desconocido"}`);
      }
    } else {
      newUserId = created.user.id;
      createdNewAuthUser = true;
    }

    try {
      // Ensure member role (replace any default role inserted by trigger)
      await supabaseAdmin.from("user_roles").delete().eq("user_id", newUserId);
      await supabaseAdmin.from("user_roles").insert({ user_id: newUserId, role: "member" });

      // 3. Member record
      const fd: Record<string, any> = (req.form_data ?? {}) as any;
      const securityQuestion = (req as any).security_question ?? fd.security_question ?? null;
      const rawAnswer = (req as any).security_answer ?? fd.security_answer ?? null;
      const securityAnswerHash = rawAnswer ? await sha256(normalizeAnswer(String(rawAnswer))) : null;
      const recoveryPin = await generateUniquePin(supabaseAdmin);

      // Reuse member if one already exists for this auth user
      const { data: existingMember } = await supabaseAdmin
        .from("members").select("*").eq("auth_user_id", newUserId).maybeSingle();

      let member = existingMember;
      if (!member) {
        const memberPayload: any = {
          full_name: req.full_name,
          email: req.email,
          phone: req.phone,
          cedula: fd.cedula ?? null,
          birth_date: fd.birth_date || null,
          gender: fd.gender || null,
          address: fd.address || null,
          status: "active",
          auth_user_id: newUserId,
          recovery_pin: recoveryPin,
          security_question: securityQuestion,
          security_answer_hash: securityAnswerHash,
          temp_password: tempPassword,
        };
        const { data: inserted, error: memErr } = await supabaseAdmin
          .from("members").insert(memberPayload).select().single();
        if (memErr || !inserted) throw new Error(`Error creando miembro: ${memErr?.message ?? "desconocido"}`);
        member = inserted;
      } else {
        await supabaseAdmin.from("members").update({
          recovery_pin: recoveryPin,
          security_question: securityQuestion,
          security_answer_hash: securityAnswerHash,
          temp_password: tempPassword,
          status: "active",
        }).eq("id", member.id);
      }

      // 4. Membership
      const start = new Date();
      const end = new Date(); end.setDate(end.getDate() + plan.duration_days);
      const { data: mm, error: mmErr } = await supabaseAdmin.from("member_memberships").insert({
        member_id: member.id, plan_id: plan.id,
        start_date: start.toISOString().slice(0, 10),
        end_date: end.toISOString().slice(0, 10),
        is_active: true,
      }).select().single();
      if (mmErr) throw new Error(`Error activando membresía: ${mmErr.message}`);

      // 5. Payment
      const { data: payment, error: payErr } = await supabaseAdmin.from("payments").insert({
        member_id: member.id,
        membership_id: mm?.id ?? null,
        amount: data.amount,
        method: data.method,
        reference: data.reference ?? null,
        status: "paid",
        created_by: userId,
      }).select().single();
      if (payErr || !payment) throw new Error(`Error registrando pago: ${payErr?.message ?? "desconocido"}`);

      // 6. Invoice
      const { data: invoice, error: invErr } = await supabaseAdmin.from("invoices").insert({
        member_id: member.id,
        plan_id: plan.id,
        payment_id: payment.id,
        amount: data.amount,
        method: data.method,
        status: "paid",
        description: `Membresía ${plan.name}`,
      }).select().single();
      if (invErr) throw new Error(`Error generando factura: ${invErr.message}`);

      // 7. Mark request approved
      await supabaseAdmin.from("inscription_requests").update({
        status: "approved",
        member_id: member.id,
        payment_id: payment.id,
        decided_by: userId,
        decided_at: new Date().toISOString(),
      }).eq("id", req.id);

      return {
        ok: true,
        member_id: member.id,
        invoice_id: invoice?.id ?? null,
        invoice_number: invoice?.number ?? null,
        credentials: { email: req.email, password: tempPassword, recovery_pin: recoveryPin },
      };
    } catch (err: any) {
      // Rollback the freshly-created auth user so the admin can retry
      if (createdNewAuthUser && newUserId) {
        try { await supabaseAdmin.auth.admin.deleteUser(newUserId); } catch {}
      }
      throw new Error(err?.message ?? "Error aprobando la solicitud");
    }
  });

export const rejectInscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      request_id: z.string().uuid(),
      reason: z.string().max(500).optional(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("inscription_requests").update({
      status: "rejected",
      notes: data.reason ?? null,
      decided_by: userId,
      decided_at: new Date().toISOString(),
    }).eq("id", data.request_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
