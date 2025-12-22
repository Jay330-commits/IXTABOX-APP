-- Fix bookings display_id constraint to allow YYMMDD-XXX format (10 characters)
-- The constraint likely limits display_id to 6 characters, but we need 10 for the new format

-- Step 1: Check what the constraint currently does
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.bookings'::regclass
AND conname LIKE '%display_id%';

-- Step 2: Drop the existing constraint (if it exists)
ALTER TABLE public.bookings 
DROP CONSTRAINT IF EXISTS bookings_display_id_check;

-- Step 3: Optionally add a new constraint that allows YYMMDD-XXX format
-- Format: 6 digits (YYMMDD) + hyphen + 3 digits (XXX) = 10 characters total
-- Pattern: ^\d{6}-\d{3}$
ALTER TABLE public.bookings
ADD CONSTRAINT bookings_display_id_check 
CHECK (
    display_id ~ '^\d{6}-\d{3}$' 
    AND length(display_id) = 10
);

-- Verify the constraint was created
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.bookings'::regclass
AND conname = 'bookings_display_id_check';

