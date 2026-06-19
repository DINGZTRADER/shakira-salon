-- =============================================================
-- Sakira Beauty & Hair Salon - Seed Data
-- Run AFTER 001_initial_schema.sql and 002_rls_policies.sql
-- =============================================================

-- -------------------------------------------------------------
-- SERVICES (7 services with UGX prices)
-- -------------------------------------------------------------

INSERT INTO public.services (name, description, price, duration_minutes, is_active)
VALUES
  (
    'Hair Braiding',
    'Professional hair braiding in a variety of styles, done with care and precision.',
    50000, 120, true
  ),
  (
    'Hair Treatment',
    'Deep conditioning and nourishing treatment to restore healthy, shiny hair.',
    40000, 60, true
  ),
  (
    'Hair Coloring',
    'Expert hair coloring and highlights using premium, hair-safe products.',
    120000, 150, true
  ),
  (
    'Manicure',
    'Complete nail care, shaping and polish for beautiful, well-groomed hands.',
    20000, 45, true
  ),
  (
    'Pedicure',
    'Relaxing foot care, exfoliation and polish for soft, healthy feet.',
    25000, 60, true
  ),
  (
    'Facial Treatment',
    'Refreshing facial to cleanse, exfoliate and rejuvenate your skin.',
    60000, 60, true
  ),
  (
    'Makeup',
    'Professional makeup application for any occasion, from natural to glamorous.',
    80000, 60, true
  );

-- -------------------------------------------------------------
-- STAFF (3 members)
-- -------------------------------------------------------------

INSERT INTO public.staff (name, role, is_active)
VALUES
  ('Sarah',  'Hair Stylist',    true),
  ('Aisha',  'Beautician',      true),
  ('Brenda', 'Nail Technician', true);

-- =============================================================
-- NOTE ON SAMPLE APPOINTMENTS
-- =============================================================
-- Appointments require a real customer_id from auth.users.
-- Because auth users are created through Supabase Auth (not raw
-- SQL), sample appointments are seeded via the helper function
-- below AFTER you create a test customer account.
--
-- Steps:
--   1. Sign up a test customer in the app (e.g. test@sakira.ug)
--   2. Run:  SELECT public.seed_sample_appointments('test@sakira.ug');
-- =============================================================

CREATE OR REPLACE FUNCTION public.seed_sample_appointments(p_email TEXT)
RETURNS TEXT AS $$
DECLARE
  v_customer_id UUID;
  v_service_braiding UUID;
  v_service_manicure UUID;
  v_service_facial UUID;
  v_staff_sarah UUID;
  v_staff_brenda UUID;
  v_staff_aisha UUID;
BEGIN
  -- Find the customer by email
  SELECT id INTO v_customer_id FROM public.users WHERE email = p_email;
  IF v_customer_id IS NULL THEN
    RETURN 'ERROR: No user found with email ' || p_email || '. Sign up first.';
  END IF;

  -- Look up service & staff ids
  SELECT id INTO v_service_braiding FROM public.services WHERE name = 'Hair Braiding';
  SELECT id INTO v_service_manicure FROM public.services WHERE name = 'Manicure';
  SELECT id INTO v_service_facial   FROM public.services WHERE name = 'Facial Treatment';
  SELECT id INTO v_staff_sarah  FROM public.staff WHERE name = 'Sarah';
  SELECT id INTO v_staff_brenda FROM public.staff WHERE name = 'Brenda';
  SELECT id INTO v_staff_aisha  FROM public.staff WHERE name = 'Aisha';

  -- Insert 3 sample appointments (future dates)
  INSERT INTO public.appointments
    (customer_id, service_id, staff_id, appointment_date, appointment_time, status, notes)
  VALUES
    (v_customer_id, v_service_braiding, v_staff_sarah,
     CURRENT_DATE + INTERVAL '2 days', '10:00:00', 'confirmed', 'Box braids, medium size'),
    (v_customer_id, v_service_manicure, v_staff_brenda,
     CURRENT_DATE + INTERVAL '4 days', '14:00:00', 'pending', NULL),
    (v_customer_id, v_service_facial, v_staff_aisha,
     CURRENT_DATE + INTERVAL '6 days', '11:30:00', 'pending', 'Sensitive skin');

  RETURN 'SUCCESS: 3 sample appointments created for ' || p_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
