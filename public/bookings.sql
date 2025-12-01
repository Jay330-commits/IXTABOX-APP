-- Create payments
INSERT INTO public.payments (id, amount, currency, status, stripe_payment_intent_id, created_at, completed_at) VALUES
  (gen_random_uuid(), 900.00, 'SEK', 'Completed', 'pi_' || gen_random_uuid()::text, NOW(), NOW()),
  (gen_random_uuid(), 1200.00, 'SEK', 'Completed', 'pi_' || gen_random_uuid()::text, NOW(), NOW()),
  (gen_random_uuid(), 1500.00, 'SEK', 'Completed', 'pi_' || gen_random_uuid()::text, NOW(), NOW()),
  (gen_random_uuid(), 600.00, 'SEK', 'Completed', 'pi_' || gen_random_uuid()::text, NOW(), NOW()),
  (gen_random_uuid(), 1800.00, 'SEK', 'Completed', 'pi_' || gen_random_uuid()::text, NOW(), NOW()),
  (gen_random_uuid(), 2100.00, 'SEK', 'Completed', 'pi_' || gen_random_uuid()::text, NOW(), NOW()),
  (gen_random_uuid(), 2400.00, 'SEK', 'Completed', 'pi_' || gen_random_uuid()::text, NOW(), NOW()),
  (gen_random_uuid(), 2700.00, 'SEK', 'Completed', 'pi_' || gen_random_uuid()::text, NOW(), NOW()),
  (gen_random_uuid(), 3000.00, 'SEK', 'Completed', 'pi_' || gen_random_uuid()::text, NOW(), NOW()),
  (gen_random_uuid(), 3300.00, 'SEK', 'Completed', 'pi_' || gen_random_uuid()::text, NOW(), NOW());

-- Create bookings (get payment IDs from above)
WITH payments AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as rn FROM public.payments WHERE stripe_payment_intent_id LIKE 'pi_%' ORDER BY created_at LIMIT 10
)
INSERT INTO public.bookings (id, box_id, payment_id, start_date, end_date, total_amount, lock_pin, status, created_at)
SELECT
  gen_random_uuid(),
  'cfe3c547-6edf-4752-a868-a36ec50a9e4b'::uuid,
  (SELECT id FROM payments WHERE rn = 1),
  NOW() - INTERVAL '2 days',
  NOW() + INTERVAL '1 day',
  900.00,
  (1000 + floor(random() * 998999)::int),
  'Active'::public."BookingStatus",
  NOW()
UNION ALL
SELECT gen_random_uuid(), '39660c8d-a411-4cb7-823e-50d944003050'::uuid, (SELECT id FROM payments WHERE rn = 2), NOW() + INTERVAL '1 day', NOW() + INTERVAL '4 days', 1200.00, (1000 + floor(random() * 998999)::int), 'Pending'::public."BookingStatus", NOW()
UNION ALL
SELECT gen_random_uuid(), '8e543014-0500-479b-9c20-13682b328577'::uuid, (SELECT id FROM payments WHERE rn = 3), NOW() + INTERVAL '5 days', NOW() + INTERVAL '8 days', 1500.00, (1000 + floor(random() * 998999)::int), 'Pending'::public."BookingStatus", NOW()
UNION ALL
SELECT gen_random_uuid(), '97ab8597-a2eb-4373-bc0c-2e6719d22864'::uuid, (SELECT id FROM payments WHERE rn = 4), NOW() + INTERVAL '10 days', NOW() + INTERVAL '12 days', 600.00, (1000 + floor(random() * 998999)::int), 'Pending'::public."BookingStatus", NOW()
UNION ALL
SELECT gen_random_uuid(), 'd35d5128-f23a-4c6f-ae4b-d2450b1a0be6'::uuid, (SELECT id FROM payments WHERE rn = 5), NOW() - INTERVAL '1 day', NOW() + INTERVAL '5 days', 1800.00, (1000 + floor(random() * 998999)::int), 'Active'::public."BookingStatus", NOW()
UNION ALL
SELECT gen_random_uuid(), 'eb6d6162-dfcb-4168-a574-9b3a3a3c9365'::uuid, (SELECT id FROM payments WHERE rn = 6), NOW() + INTERVAL '15 days', NOW() + INTERVAL '18 days', 2100.00, (1000 + floor(random() * 998999)::int), 'Pending'::public."BookingStatus", NOW()
UNION ALL
SELECT gen_random_uuid(), '46263e3c-eb1f-4d9d-b0bc-6bf0c05f394c'::uuid, (SELECT id FROM payments WHERE rn = 7), NOW() + INTERVAL '20 days', NOW() + INTERVAL '23 days', 2400.00, (1000 + floor(random() * 998999)::int), 'Pending'::public."BookingStatus", NOW()
UNION ALL
SELECT gen_random_uuid(), '3cd6d32a-39ff-40d9-b9f4-d9143f4a15de'::uuid, (SELECT id FROM payments WHERE rn = 8), NOW() + INTERVAL '25 days', NOW() + INTERVAL '28 days', 2700.00, (1000 + floor(random() * 998999)::int), 'Pending'::public."BookingStatus", NOW()
UNION ALL
SELECT gen_random_uuid(), '6dd3c714-8ba9-4e9c-9392-3935940fd3dc'::uuid, (SELECT id FROM payments WHERE rn = 9), NOW() + INTERVAL '30 days', NOW() + INTERVAL '33 days', 3000.00, (1000 + floor(random() * 998999)::int), 'Pending'::public."BookingStatus", NOW()
UNION ALL
SELECT gen_random_uuid(), 'c58e6d57-07b8-4bc8-920f-bd419056921f'::uuid, (SELECT id FROM payments WHERE rn = 10), NOW() + INTERVAL '35 days', NOW() + INTERVAL '38 days', 3300.00, (1000 + floor(random() * 998999)::int), 'Pending'::public."BookingStatus", NOW();
