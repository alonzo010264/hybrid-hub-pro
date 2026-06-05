
-- 1. Add 'member' role (for gym clients with portal access)
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'member';

-- 2. Link members to their auth user (for portal login)
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS auth_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS members_auth_user_idx ON public.members(auth_user_id);

-- 3. Update is_staff to EXCLUDE the new 'member' role so member portal users don't get staff access
CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin','reception','trainer')
  )
$$;

-- 4. Inscription form configuration (single active row)
CREATE TABLE IF NOT EXISTS public.inscription_form_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version integer NOT NULL DEFAULT 1,
  config jsonb NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.inscription_form_config TO anon, authenticated;
GRANT ALL ON public.inscription_form_config TO service_role;
GRANT INSERT, UPDATE, DELETE ON public.inscription_form_config TO authenticated;
ALTER TABLE public.inscription_form_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads active form config" ON public.inscription_form_config FOR SELECT USING (true);
CREATE POLICY "Admins manage form config" ON public.inscription_form_config FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- 5. Inscription requests
CREATE TABLE IF NOT EXISTS public.inscription_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  full_name text NOT NULL,
  email text NOT NULL,
  phone text,
  desired_plan_id uuid REFERENCES public.membership_plans(id) ON DELETE SET NULL,
  form_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  payment_id uuid REFERENCES public.payments(id) ON DELETE SET NULL,
  member_id uuid REFERENCES public.members(id) ON DELETE SET NULL,
  notes text,
  decided_by uuid REFERENCES auth.users(id),
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS inscription_requests_status_idx ON public.inscription_requests(status, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inscription_requests TO authenticated;
GRANT INSERT ON public.inscription_requests TO anon;
GRANT ALL ON public.inscription_requests TO service_role;
ALTER TABLE public.inscription_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can submit inscription" ON public.inscription_requests FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Staff view requests" ON public.inscription_requests FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff update requests" ON public.inscription_requests FOR UPDATE TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff delete requests" ON public.inscription_requests FOR DELETE TO authenticated USING (public.is_staff(auth.uid()));

-- 6. Member goals (from AI assistant)
CREATE TABLE IF NOT EXISTS public.member_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  primary_goal text NOT NULL,
  summary text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  raw_conversation jsonb NOT NULL DEFAULT '[]'::jsonb,
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high')),
  assigned_trainer_id uuid REFERENCES public.trainers(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','in_progress','done')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS member_goals_member_idx ON public.member_goals(member_id);
CREATE INDEX IF NOT EXISTS member_goals_status_idx ON public.member_goals(status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.member_goals TO authenticated;
GRANT ALL ON public.member_goals TO service_role;
ALTER TABLE public.member_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff view goals" ON public.member_goals FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff manage goals" ON public.member_goals FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Members view own goals" ON public.member_goals FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.members m WHERE m.id = member_goals.member_id AND m.auth_user_id = auth.uid()));
CREATE POLICY "Members insert own goals" ON public.member_goals FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.members m WHERE m.id = member_goals.member_id AND m.auth_user_id = auth.uid()));

-- 7. Invoices
CREATE SEQUENCE IF NOT EXISTS public.invoice_number_seq START 1000;
CREATE TABLE IF NOT EXISTS public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number text NOT NULL UNIQUE DEFAULT ('FAC-' || lpad(nextval('public.invoice_number_seq')::text, 6, '0')),
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  plan_id uuid REFERENCES public.membership_plans(id) ON DELETE SET NULL,
  payment_id uuid REFERENCES public.payments(id) ON DELETE SET NULL,
  amount numeric(10,2) NOT NULL,
  method public.payment_method NOT NULL,
  status text NOT NULL DEFAULT 'paid' CHECK (status IN ('paid','pending','void')),
  description text,
  issued_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS invoices_member_idx ON public.invoices(member_id);
CREATE INDEX IF NOT EXISTS invoices_issued_idx ON public.invoices(issued_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoices TO authenticated;
GRANT ALL ON public.invoices TO service_role;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage invoices" ON public.invoices FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Members view own invoices" ON public.invoices FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.members m WHERE m.id = invoices.member_id AND m.auth_user_id = auth.uid()));

-- 8. Updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;
CREATE TRIGGER inscription_form_config_updated_at BEFORE UPDATE ON public.inscription_form_config FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER inscription_requests_updated_at BEFORE UPDATE ON public.inscription_requests FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER member_goals_updated_at BEFORE UPDATE ON public.member_goals FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 9. Seed default form config
INSERT INTO public.inscription_form_config (config, is_active)
SELECT
  jsonb_build_object(
    'steps', jsonb_build_array(
      jsonb_build_object(
        'title','Datos personales',
        'description','Cuéntanos quién eres',
        'fields', jsonb_build_array(
          jsonb_build_object('key','full_name','label','Nombre completo','type','text','required',true),
          jsonb_build_object('key','cedula','label','Cédula / Documento','type','text','required',false),
          jsonb_build_object('key','birth_date','label','Fecha de nacimiento','type','date','required',false),
          jsonb_build_object('key','gender','label','Género','type','select','required',false,'options', jsonb_build_array('Masculino','Femenino','Otro'))
        )
      ),
      jsonb_build_object(
        'title','Contacto y plan',
        'description','¿Cómo te contactamos y qué membresía quieres?',
        'fields', jsonb_build_array(
          jsonb_build_object('key','email','label','Correo electrónico','type','email','required',true),
          jsonb_build_object('key','phone','label','Teléfono / WhatsApp','type','tel','required',true),
          jsonb_build_object('key','address','label','Dirección','type','text','required',false),
          jsonb_build_object('key','desired_plan_id','label','Plan deseado','type','plan_select','required',true)
        )
      ),
      jsonb_build_object(
        'title','Tu objetivo',
        'description','¿Qué buscas lograr en el gym?',
        'fields', jsonb_build_array(
          jsonb_build_object('key','goal','label','Objetivo principal','type','select','required',true,
            'options', jsonb_build_array('Bajar de peso','Ganar músculo','Mejorar resistencia','Rehabilitación','Bienestar general','Otro')),
          jsonb_build_object('key','experience','label','Nivel de experiencia','type','select','required',false,
            'options', jsonb_build_array('Principiante','Intermedio','Avanzado')),
          jsonb_build_object('key','notes','label','Notas (lesiones, condiciones, etc.)','type','textarea','required',false)
        )
      )
    )
  ),
  true
WHERE NOT EXISTS (SELECT 1 FROM public.inscription_form_config WHERE is_active = true);
