-- Run this in Supabase Dashboard → SQL Editor (only touches public schema; avoids "must be owner of table flow_state").
-- 1) Drop redundant columns from public.bookings
ALTER TABLE public.bookings
  DROP COLUMN IF EXISTS extension_count,
  DROP COLUMN IF EXISTS is_extended,
  DROP COLUMN IF EXISTS original_end_date,
  DROP COLUMN IF EXISTS returned_at;

-- 2) Add returned_at to public.box_returns
ALTER TABLE public.box_returns
  ADD COLUMN IF NOT EXISTS returned_at TIMESTAMP(6);

-- 3) Optional: backfill returned_at from created_at for existing rows
UPDATE public.box_returns
SET returned_at = created_at
WHERE returned_at IS NULL AND created_at IS NOT NULL;
