-- Remove Confirmed from BookingStatus enum and update existing bookings
-- Run this SQL directly in your database if Prisma CLI can't connect

-- Step 1: Drop triggers that depend on the status column
DROP TRIGGER IF EXISTS check_booking_start_time_on_insert ON public.bookings;
DROP TRIGGER IF EXISTS check_booking_start_time_on_update ON public.bookings;

-- Step 2: Update any existing Confirmed bookings:
-- - If start_date is in the future → Pending
-- - If start_date is in the past/now → Active
UPDATE public.bookings
SET status = CASE
  WHEN start_date > NOW() THEN 'Pending'::public."BookingStatus"
  ELSE 'Active'::public."BookingStatus"
END
WHERE status = 'Confirmed'::public."BookingStatus";

-- Step 3: Remove Confirmed from the enum
-- Note: PostgreSQL doesn't support removing enum values directly
-- We need to recreate the enum without Confirmed
DO $$ 
BEGIN
  -- Drop the default value temporarily
  ALTER TABLE public.bookings ALTER COLUMN status DROP DEFAULT;
  
  -- Create new enum without Confirmed
  CREATE TYPE public."BookingStatus_new" AS ENUM ('Pending', 'Active', 'Completed', 'Cancelled');
  
  -- Update the bookings table to use the new enum
  ALTER TABLE public.bookings 
    ALTER COLUMN status TYPE public."BookingStatus_new" 
    USING status::text::public."BookingStatus_new";
  
  -- Restore the default value
  ALTER TABLE public.bookings ALTER COLUMN status SET DEFAULT 'Pending'::public."BookingStatus_new";
  
  -- Drop old enum and rename new one
  DROP TYPE public."BookingStatus";
  ALTER TYPE public."BookingStatus_new" RENAME TO "BookingStatus";
END $$;

-- Step 4: Recreate the triggers (updated to not reference Confirmed)
CREATE TRIGGER check_booking_start_time_on_insert
  AFTER INSERT ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.activate_bookings_on_start_time();

CREATE TRIGGER check_booking_start_time_on_update
  AFTER UPDATE ON public.bookings
  FOR EACH ROW
  WHEN (OLD.start_date IS DISTINCT FROM NEW.start_date OR OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.activate_bookings_on_start_time();

