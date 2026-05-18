-- Add texto_extraido column to policy_documents table to store frontend-extracted PDF transcription
ALTER TABLE public.policy_documents 
  ADD COLUMN IF NOT EXISTS texto_extraido TEXT;
