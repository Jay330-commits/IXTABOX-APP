-- =====================================================
-- Auto-Activate Bookings Trigger
-- =====================================================
-- This creates database triggers that automatically update
-- booking status from Pending/Confirmed to Active when
-- the booking start time arrives.
--
-- Run this SQL in your database to enable automatic activation.
-- =====================================================

-- Create function to automatically activate bookings when start time arrives
CREATE OR REPLACE FUNCTION public.activate_bookings_on_start_time()
RETURNS TRIGGER AS $$
BEGIN
  -- Update booking status to Active if start_date has arrived and status is Pending
  UPDATE public.bookings
  SET status = 'Active'
  WHERE status = 'Pending'
    AND start_date <= NOW()
    AND id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger that runs on INSERT to check and activate bookings
DROP TRIGGER IF EXISTS check_booking_start_time_on_insert ON public.bookings;
CREATE TRIGGER check_booking_start_time_on_insert
  AFTER INSERT ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.activate_bookings_on_start_time();

-- Create trigger that runs on UPDATE to check and activate bookings
DROP TRIGGER IF EXISTS check_booking_start_time_on_update ON public.bookings;
CREATE TRIGGER check_booking_start_time_on_update
  AFTER UPDATE ON public.bookings
  FOR EACH ROW
  WHEN (OLD.start_date IS DISTINCT FROM NEW.start_date OR OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.activate_bookings_on_start_time();

-- Create function to periodically check and activate all pending/confirmed bookings
-- This function can be called by pg_cron or a scheduled job
CREATE OR REPLACE FUNCTION public.activate_due_bookings()
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  -- Update all bookings that should be active
  UPDATE public.bookings
  SET status = 'Active'
  WHERE status = 'Pending'
    AND start_date <= NOW();
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- Optional: Set up pg_cron job (if pg_cron extension is available)
-- =====================================================
-- Uncomment the following to run the activation check every minute:
--
-- SELECT cron.schedule(
--   'activate-due-bookings',
--   '* * * * *', -- Every minute
--   $$SELECT public.activate_due_bookings();$$
-- );
--
-- To check if pg_cron is available:
-- SELECT * FROM pg_extension WHERE extname = 'pg_cron';
--
-- To enable pg_cron (if you have superuser access):
-- CREATE EXTENSION IF NOT EXISTS pg_cron;
-- =====================================================

