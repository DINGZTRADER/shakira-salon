-- =============================================================
-- Shakira Beauty & Wellness Salon - Unified Database Setup
-- Run this script in the Supabase SQL Editor on a fresh database.
-- =============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;

-- =============================================================
-- ENUM TYPES
-- =============================================================

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('customer', 'stylist', 'manager', 'admin');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE appointment_status AS ENUM ('draft', 'held', 'pending', 'confirmed', 'completed', 'cancelled', 'no_show', 'rescheduled');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE hold_status AS ENUM ('active', 'converted', 'expired', 'released');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE payment_provider AS ENUM ('mtn_mobile_money', 'airtel_money', 'bank_transfer', 'cash_at_salon');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE payment_status AS ENUM ('pending', 'requires_action', 'succeeded', 'failed', 'expired', 'refunded', 'paid');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE message_sender_type AS ENUM ('customer', 'stylist', 'system');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE reschedule_status AS ENUM ('requested', 'accepted', 'declined', 'cancelled');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE media_kind AS ENUM ('image', 'video');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE social_channel AS ENUM ('whatsapp', 'instagram');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE conversation_status AS ENUM ('open', 'bot_active', 'staff_active', 'booked', 'closed', 'spam');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE message_direction AS ENUM ('inbound', 'outbound');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE template_kind AS ENUM ('booking_confirmation', 'payment_prompt', 'appointment_reminder', 'review_request', 'rebook_prompt', 'marketing_broadcast');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE lead_status AS ENUM ('new', 'qualified', 'whatsapp_opened', 'hold_created', 'booked', 'lost');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- =============================================================
-- TABLES & CONSTRAINTS
-- =============================================================

-- users table (linked to auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   TEXT NOT NULL,
  email       citext UNIQUE,
  phone       TEXT NOT NULL,
  role        user_role NOT NULL DEFAULT 'customer',
  avatar_url  TEXT,
  marketing_opt_in BOOLEAN NOT NULL DEFAULT false,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- branches table
CREATE TABLE IF NOT EXISTS public.branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  address_line_1 text NOT NULL,
  address_line_2 text,
  city text NOT NULL DEFAULT 'Kampala',
  country_code char(2) NOT NULL DEFAULT 'UG',
  timezone text NOT NULL DEFAULT 'Africa/Kampala',
  phone_e164 text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- customer_profiles table
CREATE TABLE IF NOT EXISTS public.customer_profiles (
  user_id uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  preferred_branch_id uuid REFERENCES public.branches(id),
  preferred_payment_provider payment_provider,
  quiet_chair_preference boolean NOT NULL DEFAULT false,
  hair_notes text,
  allergy_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- stylist_profiles table
CREATE TABLE IF NOT EXISTS public.stylist_profiles (
  user_id uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id),
  display_name text NOT NULL,
  bio text,
  years_experience integer NOT NULL DEFAULT 0 CHECK (years_experience >= 0),
  rating_average numeric(3,2) NOT NULL DEFAULT 0 CHECK (rating_average >= 0 AND rating_average <= 5),
  rating_count integer NOT NULL DEFAULT 0 CHECK (rating_count >= 0),
  is_bookable boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- service_categories table
CREATE TABLE IF NOT EXISTS public.service_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  sort_order integer NOT NULL DEFAULT 0
);

-- services table
CREATE TABLE IF NOT EXISTS public.services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES public.service_categories(id),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  duration_minutes integer NOT NULL CHECK (duration_minutes > 0),
  base_price_ugx integer NOT NULL CHECK (base_price_ugx >= 0),
  deposit_price_ugx integer NOT NULL DEFAULT 0 CHECK (deposit_price_ugx >= 0),
  is_add_on boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  price integer NOT NULL DEFAULT 0, -- backward compatibility
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- stylist_services
CREATE TABLE IF NOT EXISTS public.stylist_services (
  stylist_id uuid NOT NULL REFERENCES public.stylist_profiles(user_id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  custom_duration_minutes integer CHECK (custom_duration_minutes > 0),
  custom_price_ugx integer CHECK (custom_price_ugx >= 0),
  PRIMARY KEY (stylist_id, service_id)
);

-- stylist_portfolio_media
CREATE TABLE IF NOT EXISTS public.stylist_portfolio_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stylist_id uuid NOT NULL REFERENCES public.stylist_profiles(user_id) ON DELETE CASCADE,
  service_id uuid REFERENCES public.services(id) ON DELETE SET NULL,
  kind media_kind NOT NULL DEFAULT 'image',
  url text NOT NULL,
  alt_text text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- booking_holds table
CREATE TABLE IF NOT EXISTS public.booking_holds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  stylist_id uuid NOT NULL REFERENCES public.stylist_profiles(user_id),
  branch_id uuid NOT NULL REFERENCES public.branches(id),
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  status hold_status NOT NULL DEFAULT 'active',
  expires_at timestamptz NOT NULL,
  idempotency_key text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT booking_holds_valid_range CHECK (starts_at < ends_at),
  CONSTRAINT booking_holds_expiry_after_create CHECK (expires_at > created_at)
);

-- appointments table
CREATE TABLE IF NOT EXISTS public.appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.users(id),
  stylist_id uuid REFERENCES public.stylist_profiles(user_id) ON DELETE SET NULL,
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  hold_id uuid REFERENCES public.booking_holds(id) ON DELETE SET NULL,
  status appointment_status NOT NULL DEFAULT 'pending',
  starts_at timestamptz,
  ends_at timestamptz,
  subtotal_ugx integer NOT NULL DEFAULT 0 CHECK (subtotal_ugx >= 0),
  deposit_due_ugx integer NOT NULL DEFAULT 0 CHECK (deposit_due_ugx >= 0),
  total_ugx integer NOT NULL DEFAULT 0 CHECK (total_ugx >= 0),
  customer_notes text,
  stylist_notes text,
  quiet_chair boolean NOT NULL DEFAULT false,
  cancellation_reason text,
  confirmed_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  appointment_date DATE NOT NULL DEFAULT CURRENT_DATE, -- backward compatibility
  appointment_time TIME NOT NULL DEFAULT '12:00:00',  -- backward compatibility
  notes text,                                         -- backward compatibility
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- payments table
CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES public.users(id),
  provider payment_provider NOT NULL DEFAULT 'mtn_mobile_money',
  status payment_status NOT NULL DEFAULT 'pending',
  amount_ugx integer NOT NULL DEFAULT 0 CHECK (amount_ugx >= 0),
  phone_e164 text,
  provider_reference text,
  provider_status_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  idempotency_key text,
  requested_at timestamptz NOT NULL DEFAULT now(),
  succeeded_at timestamptz,
  failed_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- reviews table
CREATE TABLE IF NOT EXISTS public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL UNIQUE REFERENCES public.appointments(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES public.users(id),
  stylist_id uuid NOT NULL REFERENCES public.stylist_profiles(user_id),
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text,
  photo_permission boolean NOT NULL DEFAULT false,
  is_public boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- reschedule_requests table
CREATE TABLE IF NOT EXISTS public.reschedule_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  requested_by_user_id uuid NOT NULL REFERENCES public.users(id),
  current_starts_at timestamptz NOT NULL,
  current_ends_at timestamptz NOT NULL,
  requested_starts_at timestamptz NOT NULL,
  requested_ends_at timestamptz NOT NULL,
  status reschedule_status NOT NULL DEFAULT 'requested',
  reason text,
  resolved_by_user_id uuid REFERENCES public.users(id),
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- social_accounts table
CREATE TABLE IF NOT EXISTS public.social_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  channel social_channel NOT NULL,
  display_name text NOT NULL,
  handle text NOT NULL,
  external_account_id text,
  access_token_secret_ref text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (channel, handle)
);

-- social_leads table
CREATE TABLE IF NOT EXISTS public.social_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.social_accounts(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  channel social_channel NOT NULL,
  status lead_status NOT NULL DEFAULT 'new',
  source text NOT NULL,
  source_external_id text,
  service_interest text,
  attribution jsonb NOT NULL DEFAULT '{}'::jsonb,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now()
);

-- social_conversations table
CREATE TABLE IF NOT EXISTS public.social_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.social_accounts(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  appointment_id uuid REFERENCES public.appointments(id) ON DELETE SET NULL,
  lead_id uuid REFERENCES public.social_leads(id) ON DELETE SET NULL,
  channel social_channel NOT NULL,
  external_thread_id text NOT NULL,
  status conversation_status NOT NULL DEFAULT 'bot_active',
  assigned_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  bot_state jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_message_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (channel, external_thread_id)
);

-- social_messages table
CREATE TABLE IF NOT EXISTS public.social_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.social_conversations(id) ON DELETE CASCADE,
  direction message_direction NOT NULL,
  sender_external_id text,
  external_message_id text,
  body text,
  media_urls text[] NOT NULL DEFAULT ARRAY[]::text[],
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  delivered_at timestamptz,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (conversation_id, external_message_id)
);

-- =============================================================
-- TRIGGERS & TRIGGERS FUNCTIONS
-- =============================================================

-- Auto-update updated_at field helper
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE OR REPLACE TRIGGER trg_users_updated BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE OR REPLACE TRIGGER trg_branches_updated BEFORE UPDATE ON public.branches FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE OR REPLACE TRIGGER trg_customer_profiles_updated BEFORE UPDATE ON public.customer_profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE OR REPLACE TRIGGER trg_stylist_profiles_updated BEFORE UPDATE ON public.stylist_profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE OR REPLACE TRIGGER trg_services_updated BEFORE UPDATE ON public.services FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE OR REPLACE TRIGGER trg_appointments_updated BEFORE UPDATE ON public.appointments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE OR REPLACE TRIGGER trg_payments_updated BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE OR REPLACE TRIGGER trg_reviews_updated BEFORE UPDATE ON public.reviews FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE OR REPLACE TRIGGER trg_reschedule_requests_updated BEFORE UPDATE ON public.reschedule_requests FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE OR REPLACE TRIGGER trg_social_conversations_updated BEFORE UPDATE ON public.social_conversations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto-create public.users row on auth signup function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, full_name, email, phone, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Customer'),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'phone', '+256000000000'),
    'customer'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Link auth creation trigger
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Helper function: check if current user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- =============================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stylist_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_holds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_messages ENABLE ROW LEVEL SECURITY;

-- users policies
CREATE POLICY "users_select_own" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "users_select_admin" ON public.users FOR SELECT USING (public.is_admin());
CREATE POLICY "users_update_own" ON public.users FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "users_update_admin" ON public.users FOR UPDATE USING (public.is_admin());

-- services policies
CREATE POLICY "services_select_public" ON public.services FOR SELECT USING (is_active = true OR public.is_admin());
CREATE POLICY "services_insert_admin" ON public.services FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "services_update_admin" ON public.services FOR UPDATE USING (public.is_admin());

-- appointments policies
CREATE POLICY "appointments_select_own" ON public.appointments FOR SELECT USING (auth.uid() = customer_id);
CREATE POLICY "appointments_select_admin" ON public.appointments FOR SELECT USING (public.is_admin());
CREATE POLICY "appointments_insert_own" ON public.appointments FOR INSERT WITH CHECK (auth.uid() = customer_id);
CREATE POLICY "appointments_update_own" ON public.appointments FOR UPDATE USING (auth.uid() = customer_id) WITH CHECK (auth.uid() = customer_id);
CREATE POLICY "appointments_update_admin" ON public.appointments FOR UPDATE USING (public.is_admin());

-- payments policies
CREATE POLICY "payments_select_own" ON public.payments FOR SELECT USING (EXISTS (SELECT 1 FROM public.appointments a WHERE a.id = appointment_id AND a.customer_id = auth.uid()));
CREATE POLICY "payments_select_admin" ON public.payments FOR SELECT USING (public.is_admin());
CREATE POLICY "payments_insert_own" ON public.payments FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.appointments a WHERE a.id = appointment_id AND a.customer_id = auth.uid()));
CREATE POLICY "payments_update_admin" ON public.payments FOR UPDATE USING (public.is_admin());

-- branches policies
CREATE POLICY "branches_select_public" ON public.branches FOR SELECT USING (true);
CREATE POLICY "branches_all_admin" ON public.branches FOR ALL USING (public.is_admin());

-- stylist_profiles policies
CREATE POLICY "stylists_select_public" ON public.stylist_profiles FOR SELECT USING (true);
CREATE POLICY "stylists_all_admin" ON public.stylist_profiles FOR ALL USING (public.is_admin());

-- booking_holds policies
CREATE POLICY "holds_select_own" ON public.booking_holds FOR SELECT USING (auth.uid() = customer_id);
CREATE POLICY "holds_insert_own" ON public.booking_holds FOR INSERT WITH CHECK (auth.uid() = customer_id);

-- social_conversations & messages public/admin policies
CREATE POLICY "conversations_select_admin" ON public.social_conversations FOR SELECT USING (public.is_admin());
CREATE POLICY "conversations_all_admin" ON public.social_conversations FOR ALL USING (public.is_admin());
CREATE POLICY "messages_select_admin" ON public.social_messages FOR SELECT USING (public.is_admin());
CREATE POLICY "messages_all_admin" ON public.social_messages FOR ALL USING (public.is_admin());

-- =============================================================
-- SEED INITIAL DATA
-- =============================================================

-- Seed Kampala main branch
INSERT INTO public.branches (name, slug, address_line_1, city, country_code, timezone, phone_e164)
VALUES ('Shakira Beauty & Wellness Salon', 'kampala-main', 'Kampala Road', 'Kampala', 'UG', 'Africa/Kampala', '+256757211637')
ON CONFLICT (slug) DO NOTHING;

-- Seed service categories
INSERT INTO public.service_categories (name, sort_order) VALUES
  ('Braids', 10),
  ('Dreadlocks', 20),
  ('Perm', 30),
  ('Hair dye', 40)
ON CONFLICT (name) DO NOTHING;

-- Seed services
INSERT INTO public.services (category_id, name, slug, description, duration_minutes, base_price_ugx, deposit_price_ugx, is_add_on, price, is_active)
SELECT id, 'Braids installation', 'braids-installation', 'Professional hair braiding in a variety of styles, done with care and precision.', 120, 185000, 62000, false, 185000, true
FROM public.service_categories WHERE name = 'Braids'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.services (category_id, name, slug, description, duration_minutes, base_price_ugx, deposit_price_ugx, is_add_on, price, is_active)
SELECT id, 'Dreadlock retwist', 'dreadlock-retwist', 'Deep conditioning and nourishing retwist, shape, and scalp care.', 60, 28000, 0, true, 28000, true
FROM public.service_categories WHERE name = 'Dreadlocks'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.services (category_id, name, slug, description, duration_minutes, base_price_ugx, deposit_price_ugx, is_add_on, price, is_active)
SELECT id, 'Perm finish', 'perm-finish', 'Curl shaping and finish set.', 45, 35000, 0, true, 35000, true
FROM public.service_categories WHERE name = 'Perm'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.services (category_id, name, slug, description, duration_minutes, base_price_ugx, deposit_price_ugx, is_add_on, price, is_active)
SELECT id, 'Hair dye gloss', 'hair-dye-gloss', 'Color gloss and tone refresh.', 30, 35000, 0, true, 35000, true
FROM public.service_categories WHERE name = 'Hair dye'
ON CONFLICT (slug) DO NOTHING;
