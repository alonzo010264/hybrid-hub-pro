
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public
AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

-- Anti-abuse limits on public inscription submissions
ALTER TABLE public.inscription_requests
  ADD CONSTRAINT inscription_requests_full_name_len CHECK (char_length(full_name) BETWEEN 1 AND 200),
  ADD CONSTRAINT inscription_requests_email_len CHECK (char_length(email) BETWEEN 3 AND 320),
  ADD CONSTRAINT inscription_requests_phone_len CHECK (phone IS NULL OR char_length(phone) <= 40),
  ADD CONSTRAINT inscription_requests_form_data_size CHECK (pg_column_size(form_data) < 16384);
