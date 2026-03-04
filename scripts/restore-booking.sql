-- Restore deleted booking
-- Payment: 43d7f1b6-c570-4386-b4bf-d07b3e4cbbd8
-- User: 8c2579a9-b04d-4188-b889-fdf8a06cdf05
-- Box: 61ae44b3-549b-4b13-80fa-4f18fa403195
-- 10 days, 3000 SEK, box score NOT touched

-- Check if display_id 260220-001 exists; if so, change the sequence (e.g. 260220-002)
INSERT INTO public.bookings (
  id,
  box_id,
  payment_id,
  start_date,
  end_date,
  lock_pin,
  created_at,
  status,
  display_id
) VALUES (
  gen_random_uuid(),
  '61ae44b3-549b-4b13-80fa-4f18fa403195',
  '43d7f1b6-c570-4386-b4bf-d07b3e4cbbd8',
  '2026-02-20 10:00:00',
  '2026-03-02 10:00:00',
  616851381,
  '2026-02-20 09:44:55.933',
  'Upcoming',
  '260220-001'
)
ON CONFLICT (display_id) DO UPDATE SET
  box_id = EXCLUDED.box_id,
  payment_id = EXCLUDED.payment_id,
  start_date = EXCLUDED.start_date,
  end_date = EXCLUDED.end_date,
  lock_pin = EXCLUDED.lock_pin,
  status = EXCLUDED.status;
