-- =============================================================
-- Migration: Upgrade schema to target production schemas
-- =============================================================

-- Drop old tables if they exist to prevent conflicts (clean recreate)
DROP TRIGGER IF EXISTS trg_payments_updated ON public.payments;
DROP TRIGGER IF EXISTS trg_appointments_updated ON public.appointments;
DROP TRIGGER IF EXISTS trg_staff_updated ON public.staff;
DROP TRIGGER IF EXISTS trg_services_updated ON public.services;
DROP TRIGGER IF EXISTS trg_users_updated ON public.users;

DROP TABLE IF EXISTS public.payments CASCADE;
DROP TABLE IF EXISTS public.appointments CASCADE;
DROP TABLE IF EXISTS public.staff CASCADE;
DROP TABLE IF EXISTS public.services CASCADE;

-- Install required extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;

-- Re-create ENUM Types if not existing, or update them
DO $$ BEGIN
  CREATE TYPE hold_status AS ENUM ('active', 'converted', 'expired', 'released');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE payment_provider AS ENUM ('mtn_mobile_money', 'airtel_money', 'bank_transfer', 'cash_at_salon');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE payment_status AS ENUM ('pending', 'requires_action', 'succeeded', 'failed', 'expired', 'refunded');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE message_sender_type AS ENUM ('customer', 'stylist', 'system');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE reschedule_status AS ENUM ('requested', 'accepted', 'declined', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE media_kind AS ENUM ('image', 'video');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Adjust user_role ENUM to include stylist/manager
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'stylist';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'manager';

-- Adjust appointment_status ENUM
ALTER TYPE appointment_status ADD VALUE IF NOT EXISTS 'draft';
ALTER TYPE appointment_status ADD VALUE IF NOT EXISTS 'held';
ALTER TYPE appointment_status ADD VALUE IF NOT EXISTS 'no_show';

-- Adjust users table structure to align with production schema
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS marketing_opt_in BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- Ensure phone constraint fits production
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS phone_format;
ALTER TABLE public.users ADD CONSTRAINT users_contact_required CHECK (email IS NOT NULL OR phone IS NOT NULL);

-- =============================================================
-- PRODUCTION BOOKING SCHEMAS
-- =============================================================

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

CREATE TABLE IF NOT EXISTS public.service_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  sort_order integer NOT NULL DEFAULT 0
);

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
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.stylist_services (
  stylist_id uuid NOT NULL REFERENCES public.stylist_profiles(user_id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  custom_duration_minutes integer CHECK (custom_duration_minutes > 0),
  custom_price_ugx integer CHECK (custom_price_ugx >= 0),
  PRIMARY KEY (stylist_id, service_id)
);

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

CREATE TABLE IF NOT EXISTS public.stylist_working_hours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stylist_id uuid NOT NULL REFERENCES public.stylist_profiles(user_id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  day_of_week smallint NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  starts_at time NOT NULL,
  ends_at time NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  CONSTRAINT working_hours_valid_range CHECK (starts_at < ends_at)
);

CREATE TABLE IF NOT EXISTS public.stylist_time_off (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stylist_id uuid NOT NULL REFERENCES public.stylist_profiles(user_id) ON DELETE CASCADE,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT time_off_valid_range CHECK (starts_at < ends_at)
);

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

CREATE UNIQUE INDEX IF NOT EXISTS booking_holds_idempotency_key_idx
  ON public.booking_holds(customer_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS booking_holds_active_slot_idx
  ON public.booking_holds(stylist_id, starts_at, ends_at)
  WHERE status = 'active';

CREATE TABLE IF NOT EXISTS public.appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.users(id),
  stylist_id uuid NOT NULL REFERENCES public.stylist_profiles(user_id),
  branch_id uuid NOT NULL REFERENCES public.branches(id),
  hold_id uuid REFERENCES public.booking_holds(id) ON DELETE SET NULL,
  status appointment_status NOT NULL DEFAULT 'draft',
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  subtotal_ugx integer NOT NULL CHECK (subtotal_ugx >= 0),
  deposit_due_ugx integer NOT NULL DEFAULT 0 CHECK (deposit_due_ugx >= 0),
  total_ugx integer NOT NULL CHECK (total_ugx >= 0),
  customer_notes text,
  stylist_notes text,
  quiet_chair boolean NOT NULL DEFAULT false,
  cancellation_reason text,
  confirmed_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT appointments_valid_range CHECK (starts_at < ends_at),
  CONSTRAINT appointments_total_check CHECK (total_ugx >= subtotal_ugx)
);

CREATE INDEX IF NOT EXISTS idx_appointments_customer ON public.appointments(customer_id);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON public.appointments(status);
CREATE INDEX IF NOT EXISTS appointments_customer_time_idx ON public.appointments(customer_id, starts_at DESC);
CREATE INDEX IF NOT EXISTS appointments_stylist_time_idx ON public.appointments(stylist_id, starts_at);
CREATE INDEX IF NOT EXISTS appointments_status_idx ON public.appointments(status);

CREATE TABLE IF NOT EXISTS public.appointment_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES public.services(id),
  name_snapshot text NOT NULL,
  duration_minutes integer NOT NULL CHECK (duration_minutes > 0),
  price_ugx integer NOT NULL CHECK (price_ugx >= 0),
  sort_order integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES public.users(id),
  provider payment_provider NOT NULL,
  status payment_status NOT NULL DEFAULT 'pending',
  amount_ugx integer NOT NULL CHECK (amount_ugx > 0),
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

CREATE UNIQUE INDEX IF NOT EXISTS payments_provider_reference_idx
  ON public.payments(provider, provider_reference)
  WHERE provider_reference IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS payments_idempotency_key_idx
  ON public.payments(customer_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

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

CREATE INDEX IF NOT EXISTS reviews_stylist_idx ON public.reviews(stylist_id, created_at DESC);

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
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT reschedule_requested_valid_range CHECK (requested_starts_at < requested_ends_at)
);

CREATE TABLE IF NOT EXISTS public.message_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid REFERENCES public.appointments(id) ON DELETE SET NULL,
  customer_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  stylist_id uuid REFERENCES public.stylist_profiles(user_id) ON DELETE SET NULL,
  subject text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.message_threads(id) ON DELETE CASCADE,
  sender_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  sender_type message_sender_type NOT NULL,
  body text NOT NULL,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS messages_thread_created_idx ON public.messages(thread_id, created_at);

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text NOT NULL,
  deep_link text,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notifications_user_unread_idx
  ON public.notifications(user_id, created_at DESC)
  WHERE read_at IS NULL;

CREATE TABLE IF NOT EXISTS public.audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  action text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_events_entity_idx ON public.audit_events(entity_type, entity_id, created_at DESC);

-- =============================================================
-- SOCIAL CHANNELS TABLES
-- =============================================================

CREATE TYPE social_channel AS ENUM ('whatsapp', 'instagram');
CREATE TYPE conversation_status AS ENUM ('open', 'bot_active', 'staff_active', 'booked', 'closed', 'spam');
CREATE TYPE message_direction AS ENUM ('inbound', 'outbound');
CREATE TYPE template_kind AS ENUM ('booking_confirmation', 'payment_prompt', 'appointment_reminder', 'review_request', 'rebook_prompt', 'marketing_broadcast');
CREATE TYPE lead_status AS ENUM ('new', 'qualified', 'whatsapp_opened', 'hold_created', 'booked', 'lost');

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

CREATE INDEX IF NOT EXISTS social_leads_status_idx ON public.social_leads(status, last_seen_at DESC);

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

CREATE INDEX IF NOT EXISTS social_conversations_status_idx ON public.social_conversations(channel, status, last_message_at DESC);

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

CREATE INDEX IF NOT EXISTS social_messages_conversation_idx ON public.social_messages(conversation_id, created_at);

CREATE TABLE IF NOT EXISTS public.whatsapp_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.social_accounts(id) ON DELETE CASCADE,
  kind template_kind NOT NULL,
  template_name text NOT NULL,
  locale text NOT NULL DEFAULT 'en',
  body text NOT NULL,
  approved_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (account_id, template_name, locale)
);

CREATE TABLE IF NOT EXISTS public.social_consent_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  channel social_channel NOT NULL,
  consent_type text NOT NULL,
  granted boolean NOT NULL,
  source text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS social_consent_customer_idx ON public.social_consent_events(customer_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.instagram_media_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.social_accounts(id) ON DELETE CASCADE,
  service_id uuid REFERENCES public.services(id) ON DELETE SET NULL,
  external_media_id text NOT NULL,
  media_url text NOT NULL,
  permalink text,
  caption text,
  like_count integer NOT NULL DEFAULT 0,
  comment_count integer NOT NULL DEFAULT 0,
  posted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (account_id, external_media_id)
);

-- =============================================================
-- UPDATED TRIGGERS FOR NEW TABLES
-- =============================================================

CREATE TRIGGER trg_users_updated
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_branches_updated
  BEFORE UPDATE ON public.branches
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_customer_profiles_updated
  BEFORE UPDATE ON public.customer_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_stylist_profiles_updated
  BEFORE UPDATE ON public.stylist_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_services_updated
  BEFORE UPDATE ON public.services
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_appointments_updated
  BEFORE UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_payments_updated
  BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_reviews_updated
  BEFORE UPDATE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_reschedule_requests_updated
  BEFORE UPDATE ON public.reschedule_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_message_threads_updated
  BEFORE UPDATE ON public.message_threads
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_social_accounts_updated
  BEFORE UPDATE ON public.social_accounts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_social_conversations_updated
  BEFORE UPDATE ON public.social_conversations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =============================================================
-- SEED INITIAL DATA (REQUIRED CONSTRAINTS)
-- =============================================================

-- Seed Kampala branch
INSERT INTO public.branches (name, slug, address_line_1, city, country_code, timezone, phone_e164)
VALUES ('Shakira Beauty & Wellness Salon', 'kampala-main', 'Kampala Road', 'Kampala', 'UG', 'Africa/Kampala', '+256700123456')
ON CONFLICT (slug) DO NOTHING;

-- Seed service categories
INSERT INTO public.service_categories (name, sort_order) VALUES
  ('Braids', 10),
  ('Dreadlocks', 20),
  ('Perm', 30),
  ('Hair dye', 40)
ON CONFLICT (name) DO NOTHING;

-- Seed services with categories
INSERT INTO public.services (category_id, name, slug, description, duration_minutes, base_price_ugx, deposit_price_ugx, is_add_on)
SELECT id, 'Braids installation', 'braids-installation', 'Professional hair braiding in a variety of styles, done with care and precision.', 120, 185000, 62000, false
FROM public.service_categories WHERE name = 'Braids'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.services (category_id, name, slug, description, duration_minutes, base_price_ugx, deposit_price_ugx, is_add_on)
SELECT id, 'Dreadlock maintenance', 'dreadlock-maintenance', 'Deep conditioning and nourishing retwist, shape, and scalp care.', 60, 28000, 0, true
FROM public.service_categories WHERE name = 'Dreadlocks'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.services (category_id, name, slug, description, duration_minutes, base_price_ugx, deposit_price_ugx, is_add_on)
SELECT id, 'Perm finish', 'perm-finish', 'Curl shaping and finish set.', 45, 35000, 0, true
FROM public.service_categories WHERE name = 'Perm'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.services (category_id, name, slug, description, duration_minutes, base_price_ugx, deposit_price_ugx, is_add_on)
SELECT id, 'Hair dye gloss', 'hair-dye-gloss', 'Color gloss and tone refresh.', 30, 35000, 0, true
FROM public.service_categories WHERE name = 'Hair dye'
ON CONFLICT (slug) DO NOTHING;
