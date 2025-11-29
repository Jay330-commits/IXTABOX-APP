-- Direct SQL to check and fix the enum
-- First, check what values exist
SELECT 
    t.typname AS enum_name,
    e.enumlabel AS enum_value
FROM pg_type t 
JOIN pg_enum e ON t.oid = e.enumtypid  
WHERE t.typname = 'BookingStatus'
ORDER BY e.enumsortorder;

