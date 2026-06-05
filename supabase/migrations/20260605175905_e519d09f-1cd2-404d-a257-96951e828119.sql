
-- Roles enum
CREATE TYPE public.app_role AS ENUM ('admin', 'reception', 'trainer');
CREATE TYPE public.member_status AS ENUM ('active', 'suspended', 'expired', 'pending');
CREATE TYPE public.payment_method AS ENUM ('cash', 'transfer', 'card', 'mobile');
CREATE TYPE public.payment_status AS ENUM ('paid', 'pending', 'refunded');
CREATE TYPE public.plan_duration AS ENUM ('monthly', 'quarterly', 'biannual', 'annual');

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles viewable by authenticated" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- User roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "Users view own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Auto-create profile + default admin role for first user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  user_count INT;
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), NEW.raw_user_meta_data->>'avatar_url');

  SELECT count(*) INTO user_count FROM auth.users;
  IF user_count = 1 THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'reception');
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Helper: is_staff (any signed-in staff user)
CREATE OR REPLACE FUNCTION public.is_staff(_user_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id)
$$;

-- Membership plans
CREATE TABLE public.membership_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  duration public.plan_duration NOT NULL DEFAULT 'monthly',
  duration_days INT NOT NULL DEFAULT 30,
  benefits TEXT[] DEFAULT '{}',
  color TEXT DEFAULT '#E53935',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.membership_plans TO authenticated;
GRANT ALL ON public.membership_plans TO service_role;
ALTER TABLE public.membership_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff view plans" ON public.membership_plans FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Admins manage plans" ON public.membership_plans FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Members
CREATE TABLE public.members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_code TEXT UNIQUE NOT NULL DEFAULT ('AH-' || lpad((floor(random()*100000))::text, 5, '0')),
  full_name TEXT NOT NULL,
  cedula TEXT,
  birth_date DATE,
  gender TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  emergency_contact TEXT,
  notes TEXT,
  photo_url TEXT,
  status public.member_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX members_status_idx ON public.members(status);
CREATE INDEX members_name_idx ON public.members(full_name);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.members TO authenticated;
GRANT ALL ON public.members TO service_role;
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage members" ON public.members FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- Member memberships
CREATE TABLE public.member_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.membership_plans(id),
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX mm_member_idx ON public.member_memberships(member_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.member_memberships TO authenticated;
GRANT ALL ON public.member_memberships TO service_role;
ALTER TABLE public.member_memberships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage memberships" ON public.member_memberships FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- Payments
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  membership_id UUID REFERENCES public.member_memberships(id) ON DELETE SET NULL,
  amount NUMERIC(10,2) NOT NULL,
  method public.payment_method NOT NULL DEFAULT 'cash',
  status public.payment_status NOT NULL DEFAULT 'paid',
  reference TEXT,
  paid_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX payments_member_idx ON public.payments(member_id);
CREATE INDEX payments_paid_at_idx ON public.payments(paid_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage payments" ON public.payments FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- Attendances
CREATE TABLE public.attendances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  check_in TIMESTAMPTZ NOT NULL DEFAULT now(),
  check_out TIMESTAMPTZ,
  method TEXT DEFAULT 'manual',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX attendances_member_idx ON public.attendances(member_id);
CREATE INDEX attendances_checkin_idx ON public.attendances(check_in DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendances TO authenticated;
GRANT ALL ON public.attendances TO service_role;
ALTER TABLE public.attendances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage attendances" ON public.attendances FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- Trainers
CREATE TABLE public.trainers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  specialty TEXT,
  schedule TEXT,
  phone TEXT,
  email TEXT,
  photo_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trainers TO authenticated;
GRANT ALL ON public.trainers TO service_role;
ALTER TABLE public.trainers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage trainers" ON public.trainers FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- Seed plans
INSERT INTO public.membership_plans (name, description, price, duration, duration_days, benefits, color) VALUES
  ('Básica', 'Acceso al área de pesas y cardio', 1200, 'monthly', 30, ARRAY['Acceso al gimnasio','Vestidores','Horario regular'], '#F59E0B'),
  ('Premium', 'Acceso completo + clases grupales', 2200, 'monthly', 30, ARRAY['Todo lo de Básica','Clases grupales','Sauna'], '#E53935'),
  ('VIP', 'Acceso total + entrenador personal', 4500, 'monthly', 30, ARRAY['Todo lo de Premium','Entrenador personal','Plan nutricional','Acceso 24/7'], '#A78BFA');
