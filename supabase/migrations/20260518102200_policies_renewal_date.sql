-- Add renewal_date column to policies table if it does not exist
ALTER TABLE public.policies
  ADD COLUMN IF NOT EXISTS renewal_date DATE;
