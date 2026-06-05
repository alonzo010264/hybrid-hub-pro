import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ROLE_VALUES = ["admin", "reception", "trainer"] as const;

async function assertAdmin(supabase: any, userId: string) {
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
  if (!data) throw new Error("Solo administradores pueden gestionar usuarios");
}

export const listSystemUsers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: roles } = await supabaseAdmin.from("user_roles").select("user_id, role").in("role", ROLE_VALUES as any);
    const { data: profiles } = await supabaseAdmin.from("profiles").select("id, full_name");
    const profMap = new Map((profiles ?? []).map((p: any) => [p.id, p]));
    const ids = Array.from(new Set((roles ?? []).map((r: any) => r.user_id)));
    const { data: usersResp } = await supabaseAdmin.auth.admin.listUsers({ perPage: 200 });
    const userMap = new Map((usersResp?.users ?? []).map((u: any) => [u.id, u]));
    return ids.map((uid) => {
      const u = userMap.get(uid);
      const rs = (roles ?? []).filter((r: any) => r.user_id === uid).map((r: any) => r.role);
      return {
        user_id: uid,
        email: u?.email ?? "",
        full_name: profMap.get(uid)?.full_name ?? "",
        roles: rs,
        created_at: u?.created_at ?? null,
      };
    });
  });

export const createSystemUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      email: z.string().email().max(320),
      password: z.string().min(8).max(72),
      full_name: z.string().min(1).max(200),
      role: z.enum(ROLE_VALUES),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.full_name },
    });
    if (error || !created.user) throw new Error(error?.message ?? "Error creando usuario");
    // handle_new_user trigger assigned a default; replace with chosen role
    await supabaseAdmin.from("user_roles").delete().eq("user_id", created.user.id);
    await supabaseAdmin.from("user_roles").insert({ user_id: created.user.id, role: data.role });
    return { ok: true, user_id: created.user.id };
  });

export const deleteSystemUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ user_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (data.user_id === userId) throw new Error("No puedes eliminar tu propia cuenta");
    await assertAdmin(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.user_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ user_id: z.string().uuid(), role: z.enum(ROLE_VALUES) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.user_id);
    await supabaseAdmin.from("user_roles").insert({ user_id: data.user_id, role: data.role });
    return { ok: true };
  });

/** Used after login to figure out where to send the user. */
export const getMyRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
    const roles = (data ?? []).map((r: any) => r.role as string);
    let kind: "staff" | "member" | "none" = "none";
    if (roles.some((r) => r === "admin" || r === "reception" || r === "trainer")) kind = "staff";
    else if (roles.includes("member")) kind = "member";
    return { roles, kind };
  });
