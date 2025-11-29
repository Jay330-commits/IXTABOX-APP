-- SQL query to populate locations table
-- Using distributor_id: e503a6e1-6bf1-4c1f-94e1-323222272ca1
e503a6e1-6bf1-4c1f-94e1-323222272ca1
INSERT INTO public.locations (distributor_id, name, address, coordinates, status)
VALUES
  ('e503a6e1-6bf1-4c1f-94e1-323222272ca1', 'Stockholm Central Station', 'Centralplan 15, 111 20 Stockholm, Sweden', '{"lat": 59.3300, "lng": 18.0589}'::jsonb, 'Available'),
  ('e503a6e1-6bf1-4c1f-94e1-323222272ca1', 'Gothenburg Central Station', 'Drottningtorget 1, 411 03 Göteborg, Sweden', '{"lat": 57.7089, "lng": 11.9746}'::jsonb, 'Available'),
  ('e503a6e1-6bf1-4c1f-94e1-323222272ca1', 'Malmö Central Station', 'Centralplan 1, 211 20 Malmö, Sweden', '{"lat": 55.6098, "lng": 13.0007}'::jsonb, 'Available'),
  ('e503a6e1-6bf1-4c1f-94e1-323222272ca1', 'Uppsala Central Station', 'Järnvägsgatan 2, 753 21 Uppsala, Sweden', '{"lat": 59.8586, "lng": 17.6389}'::jsonb, 'Available'),
  ('e503a6e1-6bf1-4c1f-94e1-323222272ca1', 'Linköping Central Station', 'Järnvägsgatan 1, 582 22 Linköping, Sweden', '{"lat": 58.4108, "lng": 15.6214}'::jsonb, 'Available'),
  ('e503a6e1-6bf1-4c1f-94e1-323222272ca1', 'Örebro Central Station', 'Järntorgsgatan 1, 702 11 Örebro, Sweden', '{"lat": 59.2741, "lng": 15.2066}'::jsonb, 'Available'),
  ('e503a6e1-6bf1-4c1f-94e1-323222272ca1', 'Västerås Central Station', 'Järnvägsgatan 1, 722 12 Västerås, Sweden', '{"lat": 59.6099, "lng": 16.5448}'::jsonb, 'Available'),
  ('e503a6e1-6bf1-4c1f-94e1-323222272ca1', 'Norrköping Central Station', 'Drottninggatan 1, 602 24 Norrköping, Sweden', '{"lat": 58.5942, "lng": 16.1925}'::jsonb, 'Available'),
  ('e503a6e1-6bf1-4c1f-94e1-323222272ca1', 'Jönköping Central Station', 'Järnvägsgatan 1, 553 18 Jönköping, Sweden', '{"lat": 57.7826, "lng": 14.1618}'::jsonb, 'Available'),
  ('e503a6e1-6bf1-4c1f-94e1-323222272ca1', 'Helsingborg Central Station', 'Järnvägsgatan 1, 252 25 Helsingborg, Sweden', '{"lat": 56.0465, "lng": 12.6945}'::jsonb, 'Available');

-- SQL query to populate stands table
-- Each location has at least one stand, some have multiple

INSERT INTO public.stands (location_id, name, capacity, features)
VALUES
  -- Location: 10e67628-6e68-49c0-a592-cf1041410155
  ('10e67628-6e68-49c0-a592-cf1041410155', 'Stand A1', 5, '{"hasShelter": true, "hasLighting": true, "accessibility": "wheelchair-accessible"}'::jsonb),
  ('10e67628-6e68-49c0-a592-cf1041410155', 'Stand A2', 3, '{"hasShelter": true, "hasLighting": true}'::jsonb),
  ('10e67628-6e68-49c0-a592-cf1041410155', 'Stand A3', 4, '{"hasShelter": false, "hasLighting": true}'::jsonb),
  
  -- Location: 17352af4-24fb-47bd-a6d1-f96802a195a9
  ('17352af4-24fb-47bd-a6d1-f96802a195a9', 'Stand B1', 6, '{"hasShelter": true, "hasLighting": true, "accessibility": "wheelchair-accessible"}'::jsonb),
  ('17352af4-24fb-47bd-a6d1-f96802a195a9', 'Stand B2', 4, '{"hasShelter": true, "hasLighting": true}'::jsonb),
  
  -- Location: 2ac39df0-a6e8-4a8a-8db7-d9959891e2f1
  ('2ac39df0-a6e8-4a8a-8db7-d9959891e2f1', 'Stand C1', 5, '{"hasShelter": true, "hasLighting": true, "accessibility": "wheelchair-accessible"}'::jsonb),
  ('2ac39df0-a6e8-4a8a-8db7-d9959891e2f1', 'Stand C2', 3, '{"hasShelter": false, "hasLighting": true}'::jsonb),
  ('2ac39df0-a6e8-4a8a-8db7-d9959891e2f1', 'Stand C3', 4, '{"hasShelter": true, "hasLighting": true}'::jsonb),
  
  -- Location: 667344e4-b293-4b99-92a5-c76d08d01793
  ('667344e4-b293-4b99-92a5-c76d08d01793', 'Stand D1', 4, '{"hasShelter": true, "hasLighting": true}'::jsonb),
  ('667344e4-b293-4b99-92a5-c76d08d01793', 'Stand D2', 5, '{"hasShelter": true, "hasLighting": true, "accessibility": "wheelchair-accessible"}'::jsonb),
  
  -- Location: 6879d698-a64a-45ac-9f47-f94d1c0023ef
  ('6879d698-a64a-45ac-9f47-f94d1c0023ef', 'Stand E1', 6, '{"hasShelter": true, "hasLighting": true, "accessibility": "wheelchair-accessible"}'::jsonb),
  ('6879d698-a64a-45ac-9f47-f94d1c0023ef', 'Stand E2', 3, '{"hasShelter": false, "hasLighting": true}'::jsonb),
  
  -- Location: d0b6b05d-9cab-4915-aca1-70a6812ddbb5 (Helsingborg Central Station)
  ('d0b6b05d-9cab-4915-aca1-70a6812ddbb5', 'Stand F1', 5, '{"hasShelter": true, "hasLighting": true}'::jsonb),
  ('d0b6b05d-9cab-4915-aca1-70a6812ddbb5', 'Stand F2', 4, '{"hasShelter": true, "hasLighting": true, "accessibility": "wheelchair-accessible"}'::jsonb),
  ('d0b6b05d-9cab-4915-aca1-70a6812ddbb5', 'Stand F3', 3, '{"hasShelter": false, "hasLighting": true}'::jsonb),
  
  -- Location: fbbf2e83-6fee-4dd5-8577-09fc3f3ab7ba (Örebro Central Station)
  ('fbbf2e83-6fee-4dd5-8577-09fc3f3ab7ba', 'Stand G1', 4, '{"hasShelter": true, "hasLighting": true}'::jsonb),
  ('fbbf2e83-6fee-4dd5-8577-09fc3f3ab7ba', 'Stand G2', 5, '{"hasShelter": true, "hasLighting": true, "accessibility": "wheelchair-accessible"}'::jsonb),
  
  -- Location: 8bb25acd-8320-4a36-bd8d-46808f619474 (Uppsala Central Station)
  ('8bb25acd-8320-4a36-bd8d-46808f619474', 'Stand H1', 6, '{"hasShelter": true, "hasLighting": true, "accessibility": "wheelchair-accessible"}'::jsonb),
  ('8bb25acd-8320-4a36-bd8d-46808f619474', 'Stand H2', 4, '{"hasShelter": true, "hasLighting": true}'::jsonb),
  ('8bb25acd-8320-4a36-bd8d-46808f619474', 'Stand H3', 3, '{"hasShelter": false, "hasLighting": true}'::jsonb),
  
  -- Location: fb95dfa6-f5f6-403d-878c-c44f0beb16de (Gothenburg Central Station)
  ('fb95dfa6-f5f6-403d-878c-c44f0beb16de', 'Stand I1', 5, '{"hasShelter": true, "hasLighting": true}'::jsonb),
  ('fb95dfa6-f5f6-403d-878c-c44f0beb16de', 'Stand I2', 4, '{"hasShelter": true, "hasLighting": true, "accessibility": "wheelchair-accessible"}'::jsonb),
  
  -- Location: f55437ed-fea0-42f5-b907-ae4f65dba885 (Malmö Central Station)
  ('f55437ed-fea0-42f5-b907-ae4f65dba885', 'Stand J1', 4, '{"hasShelter": true, "hasLighting": true}'::jsonb),
  ('f55437ed-fea0-42f5-b907-ae4f65dba885', 'Stand J2', 5, '{"hasShelter": true, "hasLighting": true, "accessibility": "wheelchair-accessible"}'::jsonb),
  ('f55437ed-fea0-42f5-b907-ae4f65dba885', 'Stand J3', 3, '{"hasShelter": false, "hasLighting": true}'::jsonb);

-- SQL query to populate boxes table
-- Each stand has at least 2 boxes, with a mix of Classic and Pro models

INSERT INTO public.boxes (stand_id, model, status)
VALUES
  -- Stand A1 (0e8cf409-d8be-46f0-9c32-747357d6c334) - capacity 5
  ('0e8cf409-d8be-46f0-9c32-747357d6c334', 'Classic'::public."BoxModel", 'Available'::public.status),
  ('0e8cf409-d8be-46f0-9c32-747357d6c334', 'Pro'::public."BoxModel", 'Available'::public.status),
  ('0e8cf409-d8be-46f0-9c32-747357d6c334', 'Classic'::public."BoxModel", 'Available'::public.status),
  ('0e8cf409-d8be-46f0-9c32-747357d6c334', 'Pro'::public."BoxModel", 'Available'::public.status),
  ('0e8cf409-d8be-46f0-9c32-747357d6c334', 'Classic'::public."BoxModel", 'Available'::public.status),
  
  -- Stand A2 (8825c63f-40f9-4cb3-8e4a-f6762304ba6d) - capacity 3
  ('8825c63f-40f9-4cb3-8e4a-f6762304ba6d', 'Classic'::public."BoxModel", 'Available'::public.status),
  ('8825c63f-40f9-4cb3-8e4a-f6762304ba6d', 'Pro'::public."BoxModel", 'Available'::public.status),
  ('8825c63f-40f9-4cb3-8e4a-f6762304ba6d', 'Classic'::public."BoxModel", 'Available'::public.status),
  
  -- Stand A3 (7f03e514-b475-46aa-a98a-e297a2f7dd94) - capacity 4
  ('7f03e514-b475-46aa-a98a-e297a2f7dd94', 'Classic'::public."BoxModel", 'Available'::public.status),
  ('7f03e514-b475-46aa-a98a-e297a2f7dd94', 'Pro'::public."BoxModel", 'Available'::public.status),
  ('7f03e514-b475-46aa-a98a-e297a2f7dd94', 'Classic'::public."BoxModel", 'Available'::public.status),
  ('7f03e514-b475-46aa-a98a-e297a2f7dd94', 'Pro'::public."BoxModel", 'Available'::public.status),
  
  -- Stand B1 (14cd1985-b18e-4fb1-af08-d9148da090af) - capacity 6
  ('14cd1985-b18e-4fb1-af08-d9148da090af', 'Classic'::public."BoxModel", 'Available'::public.status),
  ('14cd1985-b18e-4fb1-af08-d9148da090af', 'Pro'::public."BoxModel", 'Available'::public.status),
  ('14cd1985-b18e-4fb1-af08-d9148da090af', 'Classic'::public."BoxModel", 'Available'::public.status),
  ('14cd1985-b18e-4fb1-af08-d9148da090af', 'Pro'::public."BoxModel", 'Available'::public.status),
  ('14cd1985-b18e-4fb1-af08-d9148da090af', 'Classic'::public."BoxModel", 'Available'::public.status),
  ('14cd1985-b18e-4fb1-af08-d9148da090af', 'Pro'::public."BoxModel", 'Available'::public.status),
  
  -- Stand B2 (2d603bf6-70bf-48b5-b2e1-009c73fc551d) - capacity 4
  ('2d603bf6-70bf-48b5-b2e1-009c73fc551d', 'Classic'::public."BoxModel", 'Available'::public.status),
  ('2d603bf6-70bf-48b5-b2e1-009c73fc551d', 'Pro'::public."BoxModel", 'Available'::public.status),
  ('2d603bf6-70bf-48b5-b2e1-009c73fc551d', 'Classic'::public."BoxModel", 'Available'::public.status),
  ('2d603bf6-70bf-48b5-b2e1-009c73fc551d', 'Pro'::public."BoxModel", 'Available'::public.status),
  
  -- Stand C1 (acc64cce-e005-4fec-9dc9-dd31643e9a5a) - capacity 5
  ('acc64cce-e005-4fec-9dc9-dd31643e9a5a', 'Classic'::public."BoxModel", 'Available'::public.status),
  ('acc64cce-e005-4fec-9dc9-dd31643e9a5a', 'Pro'::public."BoxModel", 'Available'::public.status),
  ('acc64cce-e005-4fec-9dc9-dd31643e9a5a', 'Classic'::public."BoxModel", 'Available'::public.status),
  ('acc64cce-e005-4fec-9dc9-dd31643e9a5a', 'Pro'::public."BoxModel", 'Available'::public.status),
  ('acc64cce-e005-4fec-9dc9-dd31643e9a5a', 'Classic'::public."BoxModel", 'Available'::public.status),
  
  -- Stand C2 (05ddb9db-9716-4fdb-b6e6-a23ecbd5aaae) - capacity 3
  ('05ddb9db-9716-4fdb-b6e6-a23ecbd5aaae', 'Classic'::public."BoxModel", 'Available'::public.status),
  ('05ddb9db-9716-4fdb-b6e6-a23ecbd5aaae', 'Pro'::public."BoxModel", 'Available'::public.status),
  ('05ddb9db-9716-4fdb-b6e6-a23ecbd5aaae', 'Classic'::public."BoxModel", 'Available'::public.status),
  
  -- Stand C3 (27f23701-8a41-4d3f-bf63-3e200d091a16) - capacity 4
  ('27f23701-8a41-4d3f-bf63-3e200d091a16', 'Classic'::public."BoxModel", 'Available'::public.status),
  ('27f23701-8a41-4d3f-bf63-3e200d091a16', 'Pro'::public."BoxModel", 'Available'::public.status),
  ('27f23701-8a41-4d3f-bf63-3e200d091a16', 'Classic'::public."BoxModel", 'Available'::public.status),
  ('27f23701-8a41-4d3f-bf63-3e200d091a16', 'Pro'::public."BoxModel", 'Available'::public.status),
  
  -- Stand D1 (41ac18f1-3906-4ac8-b4de-3bc0da7957ea) - capacity 4
  ('41ac18f1-3906-4ac8-b4de-3bc0da7957ea', 'Classic'::public."BoxModel", 'Available'::public.status),
  ('41ac18f1-3906-4ac8-b4de-3bc0da7957ea', 'Pro'::public."BoxModel", 'Available'::public.status),
  ('41ac18f1-3906-4ac8-b4de-3bc0da7957ea', 'Classic'::public."BoxModel", 'Available'::public.status),
  ('41ac18f1-3906-4ac8-b4de-3bc0da7957ea', 'Pro'::public."BoxModel", 'Available'::public.status),
  
  -- Stand D2 (9732faf2-0590-4b55-8c5e-f8e848bc47fc) - capacity 5
  ('9732faf2-0590-4b55-8c5e-f8e848bc47fc', 'Classic'::public."BoxModel", 'Available'::public.status),
  ('9732faf2-0590-4b55-8c5e-f8e848bc47fc', 'Pro'::public."BoxModel", 'Available'::public.status),
  ('9732faf2-0590-4b55-8c5e-f8e848bc47fc', 'Classic'::public."BoxModel", 'Available'::public.status),
  ('9732faf2-0590-4b55-8c5e-f8e848bc47fc', 'Pro'::public."BoxModel", 'Available'::public.status),
  ('9732faf2-0590-4b55-8c5e-f8e848bc47fc', 'Classic'::public."BoxModel", 'Available'::public.status),
  
  -- Stand E1 (f86505d8-4751-43ae-8991-6ba65ce9af42) - capacity 6
  ('f86505d8-4751-43ae-8991-6ba65ce9af42', 'Classic'::public."BoxModel", 'Available'::public.status),
  ('f86505d8-4751-43ae-8991-6ba65ce9af42', 'Pro'::public."BoxModel", 'Available'::public.status),
  ('f86505d8-4751-43ae-8991-6ba65ce9af42', 'Classic'::public."BoxModel", 'Available'::public.status),
  ('f86505d8-4751-43ae-8991-6ba65ce9af42', 'Pro'::public."BoxModel", 'Available'::public.status),
  ('f86505d8-4751-43ae-8991-6ba65ce9af42', 'Classic'::public."BoxModel", 'Available'::public.status),
  ('f86505d8-4751-43ae-8991-6ba65ce9af42', 'Pro'::public."BoxModel", 'Available'::public.status),
  
  -- Stand E2 (e420e1ec-8e04-427f-8e55-9c31994630e1) - capacity 3
  ('e420e1ec-8e04-427f-8e55-9c31994630e1', 'Classic'::public."BoxModel", 'Available'::public.status),
  ('e420e1ec-8e04-427f-8e55-9c31994630e1', 'Pro'::public."BoxModel", 'Available'::public.status),
  ('e420e1ec-8e04-427f-8e55-9c31994630e1', 'Classic'::public."BoxModel", 'Available'::public.status),
  
  -- Stand F1 (043d24c5-89f9-4aaa-aeea-ee2a6328fdf1) - capacity 5
  ('043d24c5-89f9-4aaa-aeea-ee2a6328fdf1', 'Classic'::public."BoxModel", 'Available'::public.status),
  ('043d24c5-89f9-4aaa-aeea-ee2a6328fdf1', 'Pro'::public."BoxModel", 'Available'::public.status),
  ('043d24c5-89f9-4aaa-aeea-ee2a6328fdf1', 'Classic'::public."BoxModel", 'Available'::public.status),
  ('043d24c5-89f9-4aaa-aeea-ee2a6328fdf1', 'Pro'::public."BoxModel", 'Available'::public.status),
  ('043d24c5-89f9-4aaa-aeea-ee2a6328fdf1', 'Classic'::public."BoxModel", 'Available'::public.status),
  
  -- Stand F2 (33c479f3-ab5f-4a60-a691-c74f527563bb) - capacity 4
  ('33c479f3-ab5f-4a60-a691-c74f527563bb', 'Classic'::public."BoxModel", 'Available'::public.status),
  ('33c479f3-ab5f-4a60-a691-c74f527563bb', 'Pro'::public."BoxModel", 'Available'::public.status),
  ('33c479f3-ab5f-4a60-a691-c74f527563bb', 'Classic'::public."BoxModel", 'Available'::public.status),
  ('33c479f3-ab5f-4a60-a691-c74f527563bb', 'Pro'::public."BoxModel", 'Available'::public.status),
  
  -- Stand F3 (a24b0aea-c9da-41a8-b984-9cd70893dc1d) - capacity 3
  ('a24b0aea-c9da-41a8-b984-9cd70893dc1d', 'Classic'::public."BoxModel", 'Available'::public.status),
  ('a24b0aea-c9da-41a8-b984-9cd70893dc1d', 'Pro'::public."BoxModel", 'Available'::public.status),
  ('a24b0aea-c9da-41a8-b984-9cd70893dc1d', 'Classic'::public."BoxModel", 'Available'::public.status),
  
  -- Stand G1 (0dc52896-6d67-4c84-8618-3f41ed7f4417) - capacity 4
  ('0dc52896-6d67-4c84-8618-3f41ed7f4417', 'Classic'::public."BoxModel", 'Available'::public.status),
  ('0dc52896-6d67-4c84-8618-3f41ed7f4417', 'Pro'::public."BoxModel", 'Available'::public.status),
  ('0dc52896-6d67-4c84-8618-3f41ed7f4417', 'Classic'::public."BoxModel", 'Available'::public.status),
  ('0dc52896-6d67-4c84-8618-3f41ed7f4417', 'Pro'::public."BoxModel", 'Available'::public.status),
  
  -- Stand G2 (2fb3f85e-839f-40ec-8721-73c750be2e65) - capacity 5
  ('2fb3f85e-839f-40ec-8721-73c750be2e65', 'Classic'::public."BoxModel", 'Available'::public.status),
  ('2fb3f85e-839f-40ec-8721-73c750be2e65', 'Pro'::public."BoxModel", 'Available'::public.status),
  ('2fb3f85e-839f-40ec-8721-73c750be2e65', 'Classic'::public."BoxModel", 'Available'::public.status),
  ('2fb3f85e-839f-40ec-8721-73c750be2e65', 'Pro'::public."BoxModel", 'Available'::public.status),
  ('2fb3f85e-839f-40ec-8721-73c750be2e65', 'Classic'::public."BoxModel", 'Available'::public.status),
  
  -- Stand H1 (a4f5760c-1824-4542-aa24-cae708f751af) - capacity 6
  ('a4f5760c-1824-4542-aa24-cae708f751af', 'Classic'::public."BoxModel", 'Available'::public.status),
  ('a4f5760c-1824-4542-aa24-cae708f751af', 'Pro'::public."BoxModel", 'Available'::public.status),
  ('a4f5760c-1824-4542-aa24-cae708f751af', 'Classic'::public."BoxModel", 'Available'::public.status),
  ('a4f5760c-1824-4542-aa24-cae708f751af', 'Pro'::public."BoxModel", 'Available'::public.status),
  ('a4f5760c-1824-4542-aa24-cae708f751af', 'Classic'::public."BoxModel", 'Available'::public.status),
  ('a4f5760c-1824-4542-aa24-cae708f751af', 'Pro'::public."BoxModel", 'Available'::public.status),
  
  -- Stand H2 (23908d91-e734-46c0-85cf-d0209f7aa783) - capacity 4
  ('23908d91-e734-46c0-85cf-d0209f7aa783', 'Classic'::public."BoxModel", 'Available'::public.status),
  ('23908d91-e734-46c0-85cf-d0209f7aa783', 'Pro'::public."BoxModel", 'Available'::public.status),
  ('23908d91-e734-46c0-85cf-d0209f7aa783', 'Classic'::public."BoxModel", 'Available'::public.status),
  ('23908d91-e734-46c0-85cf-d0209f7aa783', 'Pro'::public."BoxModel", 'Available'::public.status),
  
  -- Stand H3 (f123f0da-3321-49dd-8dd3-be3e61a79692) - capacity 3
  ('f123f0da-3321-49dd-8dd3-be3e61a79692', 'Classic'::public."BoxModel", 'Available'::public.status),
  ('f123f0da-3321-49dd-8dd3-be3e61a79692', 'Pro'::public."BoxModel", 'Available'::public.status),
  ('f123f0da-3321-49dd-8dd3-be3e61a79692', 'Classic'::public."BoxModel", 'Available'::public.status),
  
  -- Stand I1 (a0ae6824-3227-4157-95b3-f6b4504514a7) - capacity 5
  ('a0ae6824-3227-4157-95b3-f6b4504514a7', 'Classic'::public."BoxModel", 'Available'::public.status),
  ('a0ae6824-3227-4157-95b3-f6b4504514a7', 'Pro'::public."BoxModel", 'Available'::public.status),
  ('a0ae6824-3227-4157-95b3-f6b4504514a7', 'Classic'::public."BoxModel", 'Available'::public.status),
  ('a0ae6824-3227-4157-95b3-f6b4504514a7', 'Pro'::public."BoxModel", 'Available'::public.status),
  ('a0ae6824-3227-4157-95b3-f6b4504514a7', 'Classic'::public."BoxModel", 'Available'::public.status),
  
  -- Stand I2 (3a28de35-48b0-4278-888a-c46daf000581) - capacity 4
  ('3a28de35-48b0-4278-888a-c46daf000581', 'Classic'::public."BoxModel", 'Available'::public.status),
  ('3a28de35-48b0-4278-888a-c46daf000581', 'Pro'::public."BoxModel", 'Available'::public.status),
  ('3a28de35-48b0-4278-888a-c46daf000581', 'Classic'::public."BoxModel", 'Available'::public.status),
  ('3a28de35-48b0-4278-888a-c46daf000581', 'Pro'::public."BoxModel", 'Available'::public.status),
  
  -- Stand J1 (69763652-75a4-4222-8358-4d642acb27a6) - capacity 4
  ('69763652-75a4-4222-8358-4d642acb27a6', 'Classic'::public."BoxModel", 'Available'::public.status),
  ('69763652-75a4-4222-8358-4d642acb27a6', 'Pro'::public."BoxModel", 'Available'::public.status),
  ('69763652-75a4-4222-8358-4d642acb27a6', 'Classic'::public."BoxModel", 'Available'::public.status),
  ('69763652-75a4-4222-8358-4d642acb27a6', 'Pro'::public."BoxModel", 'Available'::public.status),
  
  -- Stand J2 (7b3943d9-2172-4740-a230-524dffd89d0a) - capacity 5
  ('7b3943d9-2172-4740-a230-524dffd89d0a', 'Classic'::public."BoxModel", 'Available'::public.status),
  ('7b3943d9-2172-4740-a230-524dffd89d0a', 'Pro'::public."BoxModel", 'Available'::public.status),
  ('7b3943d9-2172-4740-a230-524dffd89d0a', 'Classic'::public."BoxModel", 'Available'::public.status),
  ('7b3943d9-2172-4740-a230-524dffd89d0a', 'Pro'::public."BoxModel", 'Available'::public.status),
  ('7b3943d9-2172-4740-a230-524dffd89d0a', 'Classic'::public."BoxModel", 'Available'::public.status),
  
  -- Stand J3 (75956011-7371-4c9b-80cf-4063ebbb2c86) - capacity 3
  ('75956011-7371-4c9b-80cf-4063ebbb2c86', 'Classic'::public."BoxModel", 'Available'::public.status),
  ('75956011-7371-4c9b-80cf-4063ebbb2c86', 'Pro'::public."BoxModel", 'Available'::public.status),
  ('75956011-7371-4c9b-80cf-4063ebbb2c86', 'Classic'::public."BoxModel", 'Available'::public.status);

-- SQL query to populate locks table
-- All boxes get a lock from ilgoohome with device_id SP2X24ec23e1

INSERT INTO public.locks (device_id, box_id, company)
VALUES
  ('SP2X24ec23e1', '00cacceb-9abc-4a2d-87b3-2ae62d755203', 'ilgoohome'),
  ('SP2X24ec23e1', '056a3faa-33aa-4a6a-900a-0e01eba9b874', 'ilgoohome'),
  ('SP2X24ec23e1', '06d1b97b-f3e0-47a0-847d-3b99ecbd90e4', 'ilgoohome'),
  ('SP2X24ec23e1', '0a48073d-508f-4889-857a-e9b50f836b54', 'ilgoohome'),
  ('SP2X24ec23e1', '0b001877-e0db-40a6-9017-99c998ac3509', 'ilgoohome'),
  ('SP2X24ec23e1', '0b76ff2b-741c-47b4-91dc-31e96d17dd49', 'ilgoohome'),
  ('SP2X24ec23e1', '0c489d63-65bd-422d-9425-923860af24f5', 'ilgoohome'),
  ('SP2X24ec23e1', '0cf80b13-66f6-4b7e-9711-e50173050948', 'ilgoohome'),
  ('SP2X24ec23e1', '0e184b41-c003-4417-a129-188c1120b51e', 'ilgoohome'),
  ('SP2X24ec23e1', '10e778d2-72f8-40b9-b770-c8096a28b130', 'ilgoohome'),
  ('SP2X24ec23e1', '12223dac-a188-4f45-87c5-f6d69f533c95', 'ilgoohome'),
  ('SP2X24ec23e1', '134eb422-d409-497f-ab08-e684f5a1bcab', 'ilgoohome'),
  ('SP2X24ec23e1', '15567083-fdec-476b-8b7e-ebaf68f931bb', 'ilgoohome'),
  ('SP2X24ec23e1', '17dbe837-9ef9-45b6-9a40-4b3129ff8ea4', 'ilgoohome'),
  ('SP2X24ec23e1', '19c6ef57-c08d-4c99-bc07-5d01f9d77fb9', 'ilgoohome'),
  ('SP2X24ec23e1', '1a122907-4149-4dac-9298-d516822afbc1', 'ilgoohome'),
  ('SP2X24ec23e1', '1a257dd4-1047-455e-816b-35c1172b811e', 'ilgoohome'),
  ('SP2X24ec23e1', '1f2bc9c4-c193-4fb9-9fd5-2c99d2f74296', 'ilgoohome'),
  ('SP2X24ec23e1', '1f6fbd6d-c01c-44b6-ab5e-16d7e80cc6ef', 'ilgoohome'),
  ('SP2X24ec23e1', '241713d8-8ea3-4f22-bf37-0ea14e8d5ce6', 'ilgoohome'),
  ('SP2X24ec23e1', '2467e788-44b3-4999-844f-2f0c18b75d51', 'ilgoohome'),
  ('SP2X24ec23e1', '24ecc6ca-bcd1-47d6-ac38-e1fe8f16f32a', 'ilgoohome'),
  ('SP2X24ec23e1', '24f0bc6b-1512-4ed9-8e4b-5cfc6091e1ab', 'ilgoohome'),
  ('SP2X24ec23e1', '2658f5be-25fe-4b89-95b5-88f2cd6047d3', 'ilgoohome'),
  ('SP2X24ec23e1', '2b00ec3e-4518-4380-aa0a-ead6dbf8f5bc', 'ilgoohome'),
  ('SP2X24ec23e1', '30a5db6f-1c6f-4577-916f-d454ee1b0adb', 'ilgoohome'),
  ('SP2X24ec23e1', '34c1886e-fddb-4c7e-8987-75c47c54fd5c', 'ilgoohome'),
  ('SP2X24ec23e1', '39660c8d-a411-4cb7-823e-50d944003050', 'ilgoohome'),
  ('SP2X24ec23e1', '3b7e0610-3714-44e3-81b5-58dcf354136c', 'ilgoohome'),
  ('SP2X24ec23e1', '3cd6d32a-39ff-40d9-b9f4-d9143f4a15de', 'ilgoohome'),
  ('SP2X24ec23e1', '418195be-abbb-4509-85ba-a908c6c88ba0', 'ilgoohome'),
  ('SP2X24ec23e1', '42546ea3-cd04-4d77-b92a-5a5173c88206', 'ilgoohome'),
  ('SP2X24ec23e1', '42613187-f0df-4ccf-8d2d-19bf0074a283', 'ilgoohome'),
  ('SP2X24ec23e1', '45654aa3-bd9e-4564-a77d-c48b6be4e1e8', 'ilgoohome'),
  ('SP2X24ec23e1', '46263e3c-eb1f-4d9d-b0bc-6bf0c05f394c', 'ilgoohome'),
  ('SP2X24ec23e1', '47dd3d44-db4a-4662-8a16-b77c74517fc8', 'ilgoohome'),
  ('SP2X24ec23e1', '4939c76d-f419-40cb-826f-c1905e040cfa', 'ilgoohome'),
  ('SP2X24ec23e1', '498b9c19-17a3-4a3d-aec8-6a0e1518cc3e', 'ilgoohome'),
  ('SP2X24ec23e1', '4b8486f7-8680-4c8e-b535-f9c92881f475', 'ilgoohome'),
  ('SP2X24ec23e1', '50fddd01-4795-47df-896f-2a6c17b7dd43', 'ilgoohome'),
  ('SP2X24ec23e1', '52f12381-14d6-44b1-a41e-2cb19813c61b', 'ilgoohome'),
  ('SP2X24ec23e1', '54eaae6f-db6f-4b87-832a-6eb332695809', 'ilgoohome'),
  ('SP2X24ec23e1', '5b5074f8-b199-41c7-935a-6266cf842d2e', 'ilgoohome'),
  ('SP2X24ec23e1', '61ae44b3-549b-4b13-80fa-4f18fa403195', 'ilgoohome'),
  ('SP2X24ec23e1', '63082ac5-60e7-4414-baac-9a10cec60995', 'ilgoohome'),
  ('SP2X24ec23e1', '68821c35-012b-4a92-9bf4-d22c63a107c3', 'ilgoohome'),
  ('SP2X24ec23e1', '6c82c4f8-739c-4298-a26c-11f16881b300', 'ilgoohome'),
  ('SP2X24ec23e1', '6dd3c714-8ba9-4e9c-9392-3935940fd3dc', 'ilgoohome'),
  ('SP2X24ec23e1', '71115bc1-3319-45ac-a190-2a6a8d6a4d17', 'ilgoohome'),
  ('SP2X24ec23e1', '7307deab-c167-4aa4-ab35-6e7cd382b105', 'ilgoohome'),
  ('SP2X24ec23e1', '7337f9ed-d818-492b-89cf-15da232fb64b', 'ilgoohome'),
  ('SP2X24ec23e1', '73f90150-1dd2-4907-9b97-7be2a56c9de3', 'ilgoohome'),
  ('SP2X24ec23e1', '741c2815-25c8-4c35-b991-3a96a8bdbc25', 'ilgoohome'),
  ('SP2X24ec23e1', '764ab995-5ca7-4d32-9b9e-37acf0307f01', 'ilgoohome'),
  ('SP2X24ec23e1', '7658908e-7004-48ca-95f3-b36e5308f51e', 'ilgoohome'),
  ('SP2X24ec23e1', '76a7e655-fcca-4128-a8cf-9a3924872247', 'ilgoohome'),
  ('SP2X24ec23e1', '77e83bee-8e92-4a80-85ee-98d9533c4ace', 'ilgoohome'),
  ('SP2X24ec23e1', '7c019017-6347-4623-ac82-456687bce185', 'ilgoohome'),
  ('SP2X24ec23e1', '7eb51030-5180-40ec-b8da-6af96d460dea', 'ilgoohome'),
  ('SP2X24ec23e1', '808fb42a-1463-46f1-812b-5bdcaa3a04aa', 'ilgoohome'),
  ('SP2X24ec23e1', '813a3810-6add-41d3-b1b2-5fd3ead1f442', 'ilgoohome'),
  ('SP2X24ec23e1', '81521532-507d-4a59-9807-079a24f88945', 'ilgoohome'),
  ('SP2X24ec23e1', '83e88498-88ae-4a89-bb84-6b27fe9d92c0', 'ilgoohome'),
  ('SP2X24ec23e1', '8e543014-0500-479b-9c20-13682b328577', 'ilgoohome'),
  ('SP2X24ec23e1', '902cd1b4-32b3-4040-bd5f-e2de9fbc15df', 'ilgoohome'),
  ('SP2X24ec23e1', '97ab8597-a2eb-4373-bc0c-2e6719d22864', 'ilgoohome'),
  ('SP2X24ec23e1', '99fe5d0e-a17e-4a46-91c6-155ff8c63445', 'ilgoohome'),
  ('SP2X24ec23e1', '9a9fc469-86f9-4f97-9c32-846a9865332d', 'ilgoohome'),
  ('SP2X24ec23e1', '9faef3cf-7de7-45bc-9da6-a7c67ca5a17f', 'ilgoohome'),
  ('SP2X24ec23e1', 'a0896e36-7102-4b3a-a820-fbf7d051044b', 'ilgoohome'),
  ('SP2X24ec23e1', 'a1efe16c-a9d0-451f-9970-8df7d51e4582', 'ilgoohome'),
  ('SP2X24ec23e1', 'a350277f-457b-4ba1-8b7a-c906a6381fdf', 'ilgoohome'),
  ('SP2X24ec23e1', 'a7b2b0ab-c42d-4836-9909-8fdacc274db2', 'ilgoohome'),
  ('SP2X24ec23e1', 'a8bb9d18-b673-4b4f-90e3-cb0f3789ebe9', 'ilgoohome'),
  ('SP2X24ec23e1', 'af9e5147-27e7-444a-b71e-96feaac840e3', 'ilgoohome'),
  ('SP2X24ec23e1', 'afabfa7c-b4d9-446e-9a26-473e820a2c22', 'ilgoohome'),
  ('SP2X24ec23e1', 'b0cb1a38-cc92-455a-8f3b-3c3250f6cf4a', 'ilgoohome'),
  ('SP2X24ec23e1', 'b477b02b-97c2-466b-b384-08adc5a3e83f', 'ilgoohome'),
  ('SP2X24ec23e1', 'ba423719-f062-4981-ae5d-0cea67b3d20d', 'ilgoohome'),
  ('SP2X24ec23e1', 'ba81114e-186a-4012-860e-2ef8fed99308', 'ilgoohome'),
  ('SP2X24ec23e1', 'bcafb435-f59f-495d-8fd8-61d3b302c006', 'ilgoohome'),
  ('SP2X24ec23e1', 'bf218a7d-9662-4cb9-a275-47eedf469f5a', 'ilgoohome'),
  ('SP2X24ec23e1', 'c1b09c71-bcd9-4e65-9a87-4e41e813b960', 'ilgoohome'),
  ('SP2X24ec23e1', 'c3be0d13-b430-49ff-932d-bf4151cb6f0a', 'ilgoohome'),
  ('SP2X24ec23e1', 'c58e6d57-07b8-4bc8-920f-bd419056921f', 'ilgoohome'),
  ('SP2X24ec23e1', 'c8959608-96ec-46c5-8750-aa0acc113451', 'ilgoohome'),
  ('SP2X24ec23e1', 'cb72484c-b705-4636-b632-52321a73d3b7', 'ilgoohome'),
  ('SP2X24ec23e1', 'cf79fad7-efb2-4c04-bbd7-8b91c1e3d38c', 'ilgoohome'),
  ('SP2X24ec23e1', 'cfa6039f-b2d1-4be9-b802-d3b39615a5f4', 'ilgoohome'),
  ('SP2X24ec23e1', 'cfe3c547-6edf-4752-a868-a36ec50a9e4b', 'ilgoohome'),
  ('SP2X24ec23e1', 'd35d5128-f23a-4c6f-ae4b-d2450b1a0be6', 'ilgoohome'),
  ('SP2X24ec23e1', 'd3843c28-720a-442a-96a0-6364a99e59f6', 'ilgoohome'),
  ('SP2X24ec23e1', 'd43fc38f-39a9-45e6-b970-a19922d288ac', 'ilgoohome'),
  ('SP2X24ec23e1', 'd56f5684-48fc-4618-b818-70ff5b862711', 'ilgoohome'),
  ('SP2X24ec23e1', 'd584ed75-7058-43b7-9a82-6cab68bf64f5', 'ilgoohome'),
  ('SP2X24ec23e1', 'd5cbd161-67d8-4691-8820-10529a014bd8', 'ilgoohome'),
  ('SP2X24ec23e1', 'dfe17c5c-1404-46f4-8670-688a8b5ad3c6', 'ilgoohome'),
  ('SP2X24ec23e1', 'e5a9b816-a4ae-4aa0-887f-3c3f17bf6105', 'ilgoohome'),
  ('SP2X24ec23e1', 'e5cef2ce-87ee-4099-94b6-8dcb1823e3f6', 'ilgoohome'),
  ('SP2X24ec23e1', 'e6687633-75a2-4391-90cc-1b1196c6a636', 'ilgoohome');

-- SQL query to populate compartment numbers in boxes table
-- This ensures each box on the same stand has a unique compartment number
-- Compartments are numbered starting from 1 for each stand

UPDATE public.boxes
SET compartment = subquery.compartment_num
FROM (
  SELECT 
    id,
    ROW_NUMBER() OVER (PARTITION BY stand_id ORDER BY id) AS compartment_num
  FROM public.boxes
) AS subquery
WHERE boxes.id = subquery.id;
