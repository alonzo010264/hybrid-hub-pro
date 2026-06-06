-- PRODUCTS
CREATE TABLE public.products (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  price numeric NOT NULL DEFAULT 0,
  image_url text,
  category text,
  stock integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage products" ON public.products FOR ALL
  USING (is_staff(auth.uid())) WITH CHECK (is_staff(auth.uid()));
CREATE POLICY "Authenticated view active products" ON public.products FOR SELECT
  TO authenticated USING (is_active OR is_staff(auth.uid()));

CREATE TRIGGER set_products_updated_at BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- PRODUCT SALES
CREATE TABLE public.product_sales (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  member_id uuid,
  customer_name text,
  quantity integer NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  amount numeric NOT NULL DEFAULT 0,
  method payment_method NOT NULL DEFAULT 'cash',
  status payment_status NOT NULL DEFAULT 'paid',
  reference text,
  created_by uuid,
  sold_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_sales TO authenticated;
GRANT ALL ON public.product_sales TO service_role;
ALTER TABLE public.product_sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage product sales" ON public.product_sales FOR ALL
  USING (is_staff(auth.uid())) WITH CHECK (is_staff(auth.uid()));

-- INVOICES extensions
ALTER TABLE public.invoices ALTER COLUMN member_id DROP NOT NULL;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS customer_name text;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'membership';
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS items jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS product_sale_id uuid;

-- MEMBERS can view their own payments
CREATE POLICY "Members view own payments" ON public.payments FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM public.members m WHERE m.id = payments.member_id AND m.auth_user_id = auth.uid())
  );