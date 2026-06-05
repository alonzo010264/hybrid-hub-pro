
-- Add credential recovery fields to members
ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS recovery_pin text,
  ADD COLUMN IF NOT EXISTS security_question text,
  ADD COLUMN IF NOT EXISTS security_answer_hash text,
  ADD COLUMN IF NOT EXISTS temp_password text;

CREATE UNIQUE INDEX IF NOT EXISTS members_recovery_pin_unique ON public.members(recovery_pin) WHERE recovery_pin IS NOT NULL;

-- Add captured security question/answer to inscription requests
ALTER TABLE public.inscription_requests
  ADD COLUMN IF NOT EXISTS security_question text,
  ADD COLUMN IF NOT EXISTS security_answer text;
