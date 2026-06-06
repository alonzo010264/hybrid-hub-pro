import { supabase } from "@/integrations/supabase/client";

export type MemberStatus = "active" | "suspended" | "expired" | "pending";
export type PaymentMethod = "cash" | "transfer" | "card" | "mobile";

export interface Member {
  id: string;
  member_code: string;
  full_name: string;
  cedula: string | null;
  birth_date: string | null;
  gender: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  emergency_contact: string | null;
  notes: string | null;
  photo_url: string | null;
  status: MemberStatus;
  auth_user_id: string | null;
  created_at: string;
}

export interface MembershipPlan {
  id: string;
  name: string;
  description: string | null;
  price: number;
  duration: string;
  duration_days: number;
  benefits: string[];
  color: string;
  is_active: boolean;
}

export interface Payment {
  id: string;
  member_id: string;
  amount: number;
  method: PaymentMethod;
  status: "paid" | "pending" | "refunded";
  reference: string | null;
  paid_at: string;
  member?: { full_name: string; member_code: string };
}

export interface Attendance {
  id: string;
  member_id: string;
  check_in: string;
  check_out: string | null;
  method: string | null;
  member?: { full_name: string; member_code: string };
}

export interface Trainer {
  id: string;
  full_name: string;
  specialty: string | null;
  schedule: string | null;
  phone: string | null;
  email: string | null;
  photo_url: string | null;
  is_active: boolean;
}

export interface FormField {
  key: string;
  label: string;
  type: "text" | "email" | "tel" | "number" | "date" | "select" | "textarea" | "checkbox" | "plan_select";
  required?: boolean;
  options?: string[];
}
export interface FormStep {
  title: string;
  description?: string;
  fields: FormField[];
}
export interface InscriptionConfig { steps: FormStep[] }

export interface InscriptionRequest {
  id: string;
  status: "pending" | "approved" | "rejected";
  full_name: string;
  email: string;
  phone: string | null;
  desired_plan_id: string | null;
  form_data: Record<string, any>;
  payment_id: string | null;
  member_id: string | null;
  notes: string | null;
  created_at: string;
  decided_at: string | null;
  plan?: { name: string; price: number; color: string };
}

export interface InvoiceItem {
  description: string;
  detail?: string;
  qty: number;
  unit_price: number;
}

export interface Invoice {
  id: string;
  number: string;
  member_id: string | null;
  customer_name: string | null;
  kind: string;
  items: InvoiceItem[];
  amount: number;
  method: PaymentMethod;
  status: "paid" | "pending" | "void";
  description: string | null;
  issued_at: string;
  member?: { full_name: string; member_code: string; email: string | null };
  plan?: { name: string };
}

export interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  category: string | null;
  stock: number;
  is_active: boolean;
  created_at: string;
}

export interface ProductSale {
  id: string;
  product_id: string | null;
  product_name: string;
  member_id: string | null;
  customer_name: string | null;
  quantity: number;
  unit_price: number;
  amount: number;
  method: PaymentMethod;
  status: "paid" | "pending" | "refunded";
  reference: string | null;
  sold_at: string;
  member?: { full_name: string; member_code: string } | null;
}

export interface MemberGoal {
  id: string;
  member_id: string;
  primary_goal: string;
  summary: string;
  priority: "low" | "medium" | "high";
  status: "new" | "in_progress" | "done";
  assigned_trainer_id: string | null;
  created_at: string;
  member?: { full_name: string; member_code: string };
  trainer?: { full_name: string };
}

export async function listMembers() {
  const { data, error } = await supabase.from("members").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return data as Member[];
}

export async function listPlans() {
  const { data, error } = await supabase.from("membership_plans").select("*").order("price");
  if (error) throw error;
  return data as MembershipPlan[];
}

export async function listPayments() {
  const { data, error } = await supabase
    .from("payments")
    .select("*, member:members(full_name, member_code)")
    .order("paid_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return data as Payment[];
}

export async function listAttendances() {
  const { data, error } = await supabase
    .from("attendances")
    .select("*, member:members(full_name, member_code)")
    .order("check_in", { ascending: false })
    .limit(100);
  if (error) throw error;
  return data as Attendance[];
}

export async function listTrainers() {
  const { data, error } = await supabase.from("trainers").select("*").order("full_name");
  if (error) throw error;
  return data as Trainer[];
}

export async function getInscriptionConfig() {
  const { data, error } = await supabase
    .from("inscription_form_config")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data as { id: string; config: InscriptionConfig; version: number } | null;
}

export async function listInscriptionRequests(status?: "pending" | "approved" | "rejected") {
  let q = supabase
    .from("inscription_requests")
    .select("*, plan:membership_plans(name, price, color)")
    .order("created_at", { ascending: false });
  if (status) q = q.eq("status", status);
  const { data, error } = await q;
  if (error) throw error;
  return data as InscriptionRequest[];
}

export async function listInvoices() {
  const { data, error } = await supabase
    .from("invoices")
    .select("*, member:members(full_name, member_code, email), plan:membership_plans(name)")
    .order("issued_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return data as unknown as Invoice[];
}

export async function getInvoice(id: string) {
  const { data, error } = await supabase
    .from("invoices")
    .select("*, member:members(full_name, member_code, email, phone), plan:membership_plans(name, description)")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data as unknown as Invoice & { member: any; plan: any };
}

export async function listMemberGoals() {
  const { data, error } = await supabase
    .from("member_goals")
    .select("*, member:members(full_name, member_code), trainer:trainers(full_name)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as MemberGoal[];
}

export async function listProducts() {
  const { data, error } = await supabase.from("products").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return data as Product[];
}

export async function listProductSales() {
  const { data, error } = await supabase
    .from("product_sales")
    .select("*, member:members(full_name, member_code)")
    .order("sold_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return data as unknown as ProductSale[];
}

export async function listPendingPayments() {
  const { data, error } = await supabase
    .from("payments")
    .select("*, member:members(full_name, member_code)")
    .eq("status", "pending")
    .order("paid_at", { ascending: false });
  if (error) throw error;
  return data as Payment[];
}

export async function getDashboardStats() {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  const [membersRes, plansRes, attendsRes, paymentsRes, monthlyRes, pendingReqRes, newGoalsRes, salesRes] = await Promise.all([
    supabase.from("members").select("status", { count: "exact" }),
    supabase.from("membership_plans").select("id,name,color"),
    supabase.from("attendances").select("id, check_in").gte("check_in", today.toISOString()),
    supabase.from("payments").select("amount, paid_at, status").gte("paid_at", monthStart.toISOString()),
    supabase.from("payments").select("amount, paid_at, status").gte("paid_at", new Date(today.getFullYear(), today.getMonth() - 5, 1).toISOString()),
    supabase.from("inscription_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("member_goals").select("id", { count: "exact", head: true }).eq("status", "new").is("assigned_trainer_id", null),
    supabase.from("product_sales").select("amount, sold_at, status").gte("sold_at", monthStart.toISOString()),
  ]);

  const members = membersRes.data ?? [];
  const activeMembers = members.filter((m: any) => m.status === "active").length;
  const expiredMembers = members.filter((m: any) => m.status === "expired").length;
  const paymentRevenue = (paymentsRes.data ?? []).filter((p: any) => p.status === "paid").reduce((s: number, p: any) => s + Number(p.amount), 0);
  const salesRevenue = (salesRes.data ?? []).filter((p: any) => p.status === "paid").reduce((s: number, p: any) => s + Number(p.amount), 0);
  const monthlyRevenue = paymentRevenue + salesRevenue;
  const pendingPayments = (paymentsRes.data ?? []).filter((p: any) => p.status === "pending").length;
  const todayAttendances = (attendsRes.data ?? []).length;
  const todayRevenue = (paymentsRes.data ?? [])
    .filter((p: any) => p.status === "paid" && new Date(p.paid_at) >= today)
    .reduce((s: number, p: any) => s + Number(p.amount), 0)
    + (salesRes.data ?? []).filter((p: any) => p.status === "paid" && new Date(p.sold_at) >= today).reduce((s: number, p: any) => s + Number(p.amount), 0);

  const weekData: { d: string; v: number }[] = [];
  const days = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today); d.setDate(d.getDate() - i);
    weekData.push({ d: days[d.getDay()], v: 0 });
  }
  const monthly: Record<string, number> = {};
  (monthlyRes.data ?? []).filter((p: any) => p.status === "paid").forEach((p: any) => {
    const d = new Date(p.paid_at);
    const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthly[k] = (monthly[k] ?? 0) + Number(p.amount);
  });
  (salesRes.data ?? []).filter((p: any) => p.status === "paid").forEach((p: any) => {
    const d = new Date(p.sold_at);
    const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthly[k] = (monthly[k] ?? 0) + Number(p.amount);
  });
  const monthlyArr = Object.entries(monthly).sort().map(([k, v]) => ({ d: k.slice(5), v }));

  return {
    activeMembers, expiredMembers, monthlyRevenue, pendingPayments, todayAttendances, todayRevenue,
    totalMembers: members.length, weekData, monthlyArr,
    plans: plansRes.data ?? [],
    pendingRequests: pendingReqRes.count ?? 0,
    newGoals: newGoalsRes.count ?? 0,
  };
}

// Member portal data: their payments + invoices
export async function getMemberPortal() {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("No autenticado");
  const { data: member } = await supabase.from("members").select("*").eq("auth_user_id", u.user.id).maybeSingle();
  if (!member) return { member: null, payments: [] as Payment[], invoices: [] as Invoice[], membership: null as any };
  const [payRes, invRes, mmRes] = await Promise.all([
    supabase.from("payments").select("*").eq("member_id", member.id).order("paid_at", { ascending: false }),
    supabase.from("invoices").select("*, plan:membership_plans(name)").eq("member_id", member.id).order("issued_at", { ascending: false }),
    supabase.from("member_memberships").select("*, plan:membership_plans(name, color)").eq("member_id", member.id).eq("is_active", true).order("end_date", { ascending: false }).limit(1).maybeSingle(),
  ]);
  return {
    member: member as unknown as Member,
    payments: (payRes.data ?? []) as Payment[],
    invoices: (invRes.data ?? []) as unknown as Invoice[],
    membership: mmRes.data as any,
  };
}

// Default inscription form used when no custom config exists in the DB.
export const DEFAULT_INSCRIPTION_CONFIG: InscriptionConfig = {
  steps: [
    {
      title: "Tus datos",
      description: "Cuéntanos quién eres para crear tu perfil.",
      fields: [
        { key: "full_name", label: "Nombre completo", type: "text", required: true },
        { key: "email", label: "Correo electrónico", type: "email", required: true },
        { key: "phone", label: "Teléfono / WhatsApp", type: "tel", required: true },
        { key: "birth_date", label: "Fecha de nacimiento", type: "date" },
        { key: "gender", label: "Sexo", type: "select", options: ["Masculino", "Femenino", "Otro"] },
        { key: "address", label: "Dirección", type: "text" },
      ],
    },
    {
      title: "Elige tu plan",
      description: "Selecciona el plan que más te conviene. El pago se confirma en recepción.",
      fields: [
        { key: "desired_plan_id", label: "Plan de membresía", type: "plan_select", required: true },
        { key: "goal", label: "¿Cuál es tu objetivo principal?", type: "textarea" },
      ],
    },
    {
      title: "Seguridad de tu cuenta",
      description: "Esto te permitirá recuperar el acceso si olvidas tu contraseña.",
      fields: [
        { key: "security_question", label: "Pregunta de seguridad", type: "select", required: true, options: ["¿Nombre de tu primera mascota?", "¿Ciudad donde naciste?", "¿Comida favorita?", "¿Nombre de tu mejor amigo de la infancia?"] },
        { key: "security_answer", label: "Respuesta de seguridad", type: "text", required: true },
      ],
    },
  ],
};
