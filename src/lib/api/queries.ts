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

export async function getDashboardStats() {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  const [membersRes, plansRes, attendsRes, paymentsRes, monthlyRes, pendingReqRes, newGoalsRes] = await Promise.all([
    supabase.from("members").select("status", { count: "exact" }),
    supabase.from("membership_plans").select("id,name,color"),
    supabase.from("attendances").select("id, check_in").gte("check_in", today.toISOString()),
    supabase.from("payments").select("amount, paid_at, status").gte("paid_at", monthStart.toISOString()),
    supabase.from("payments").select("amount, paid_at").gte("paid_at", new Date(today.getFullYear(), today.getMonth() - 5, 1).toISOString()),
    supabase.from("inscription_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("member_goals").select("id", { count: "exact", head: true }).eq("status", "new").is("assigned_trainer_id", null),
  ]);

  const members = membersRes.data ?? [];
  const activeMembers = members.filter((m: any) => m.status === "active").length;
  const expiredMembers = members.filter((m: any) => m.status === "expired").length;
  const monthlyRevenue = (paymentsRes.data ?? []).filter((p: any) => p.status === "paid").reduce((s: number, p: any) => s + Number(p.amount), 0);
  const pendingPayments = (paymentsRes.data ?? []).filter((p: any) => p.status === "pending").length;
  const todayAttendances = (attendsRes.data ?? []).length;

  const weekData: { d: string; v: number }[] = [];
  const days = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today); d.setDate(d.getDate() - i);
    weekData.push({ d: days[d.getDay()], v: 0 });
  }
  const monthly: Record<string, number> = {};
  (monthlyRes.data ?? []).forEach((p: any) => {
    const d = new Date(p.paid_at);
    const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthly[k] = (monthly[k] ?? 0) + Number(p.amount);
  });
  const monthlyArr = Object.entries(monthly).sort().map(([k, v]) => ({ d: k.slice(5), v }));

  return {
    activeMembers, expiredMembers, monthlyRevenue, pendingPayments, todayAttendances,
    totalMembers: members.length, weekData, monthlyArr,
    plans: plansRes.data ?? [],
    pendingRequests: pendingReqRes.count ?? 0,
    newGoals: newGoalsRes.count ?? 0,
  };
}
