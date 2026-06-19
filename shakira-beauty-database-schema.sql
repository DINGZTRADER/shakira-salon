-- Shakira Beauty and Welness Salon Booking Platform
-- Production-ready PostgreSQL schema
-- Target: PostgreSQL 15+

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;

CREATE TYPE user_role AS ENUM ('customer', 'stylist', 'manager', 'admin');
CREATE TYPE appointment_status AS ENUM ('draft', 'held', 'confirmed', 'completed', 'cancelled', 'no_show');
CREATE TYPE hold_status AS ENUM ('active', 'converted', 'expired', 'released');
CREATE TYPE payment_provider AS ENUM ('mtn_mobile_money', 'airtel_money', 'bank_transfer', 'cash_at_salon');
CREATE TYPE payment_status AS ENUM ('pending', 'requires_action', 'succeeded', 'failed', 'expired', 'refunded');
CREATE TYPE message_sender_type AS ENUM ('customer', 'stylist', 'system');
CREATE TYPE reschedule_status AS ENUM ('requested', 'accepted', 'declined', 'cancelled');
CREATE TYPE media_kind AS ENUM ('image', 'video');

CREATE TABLE branches (
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

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role user_role NOT NULL DEFAULT 'customer',
  full_name text NOT NULL,
  email citext UNIQUE,
  phone_e164 text UNIQUE,
  avatar_url text,
  marketing_opt_in boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT users_contact_required CHECK (email IS NOT NULL OR phone_e164 IS NOT NULL)
);

CREATE TABLE customer_profiles (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  preferred_branch_id uuid REFERENCES branches(id),
  preferred_payment_provider payment_provider,
  quiet_chair_preference boolean NOT NULL DEFAULT false,
  hair_notes text,
  allergy_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE stylist_profiles (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES branches(id),
  display_name text NOT NULL,
  bio text,
  years_experience integer NOT NULL DEFAULT 0 CHECK (years_experience >= 0),
  rating_average numeric(3,2) NOT NULL DEFAULT 0 CHECK (rating_average >= 0 AND rating_average <= 5),
  rating_count integer NOT NULL DEFAULT 0 CHECK (rating_count >= 0),
  is_bookable boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE service_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  sort_order integer NOT NULL DEFAULT 0
);

CREATE TABLE services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES service_categories(id),
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

CREATE TABLE stylist_services (
  stylist_id uuid NOT NULL REFERENCES stylist_profiles(user_id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  custom_duration_minutes integer CHECK (custom_duration_minutes > 0),
  custom_price_ugx integer CHECK (custom_price_ugx >= 0),
  PRIMARY KEY (stylist_id, service_id)
);

CREATE TABLE stylist_portfolio_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stylist_id uuid NOT NULL REFERENCES stylist_profiles(user_id) ON DELETE CASCADE,
  service_id uuid REFERENCES services(id) ON DELETE SET NULL,
  kind media_kind NOT NULL DEFAULT 'image',
  url text NOT NULL,
  alt_text text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE stylist_working_hours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stylist_id uuid NOT NULL REFERENCES stylist_profiles(user_id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  day_of_week smallint NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  starts_at time NOT NULL,
  ends_at time NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  CONSTRAINT working_hours_valid_range CHECK (starts_at < ends_at)
);

CREATE TABLE stylist_time_off (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stylist_id uuid NOT NULL REFERENCES stylist_profiles(user_id) ON DELETE CASCADE,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT time_off_valid_range CHECK (starts_at < ends_at)
);

CREATE TABLE booking_holds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stylist_id uuid NOT NULL REFERENCES stylist_profiles(user_id),
  branch_id uuid NOT NULL REFERENCES branches(id),
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  status hold_status NOT NULL DEFAULT 'active',
  expires_at timestamptz NOT NULL,
  idempotency_key text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT booking_holds_valid_range CHECK (starts_at < ends_at),
  CONSTRAINT booking_holds_expiry_after_create CHECK (expires_at > created_at)
);

CREATE UNIQUE INDEX booking_holds_idempotency_key_idx
  ON booking_holds(customer_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX booking_holds_active_slot_idx
  ON booking_holds(stylist_id, starts_at, ends_at)
  WHERE status = 'active';

CREATE TABLE appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES users(id),
  stylist_id uuid NOT NULL REFERENCES stylist_profiles(user_id),
  branch_id uuid NOT NULL REFERENCES branches(id),
  hold_id uuid REFERENCES booking_holds(id) ON DELETE SET NULL,
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

CREATE INDEX appointments_customer_time_idx ON appointments(customer_id, starts_at DESC);
CREATE INDEX appointments_stylist_time_idx ON appointments(stylist_id, starts_at);
CREATE INDEX appointments_status_idx ON appointments(status);

CREATE TABLE appointment_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES services(id),
  name_snapshot text NOT NULL,
  duration_minutes integer NOT NULL CHECK (duration_minutes > 0),
  price_ugx integer NOT NULL CHECK (price_ugx >= 0),
  sort_order integer NOT NULL DEFAULT 0
);

CREATE TABLE payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES users(id),
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

CREATE UNIQUE INDEX payments_provider_reference_idx
  ON payments(provider, provider_reference)
  WHERE provider_reference IS NOT NULL;

CREATE UNIQUE INDEX payments_idempotency_key_idx
  ON payments(customer_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE TABLE reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL UNIQUE REFERENCES appointments(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES users(id),
  stylist_id uuid NOT NULL REFERENCES stylist_profiles(user_id),
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text,
  photo_permission boolean NOT NULL DEFAULT false,
  is_public boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX reviews_stylist_idx ON reviews(stylist_id, created_at DESC);

CREATE TABLE reschedule_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  requested_by_user_id uuid NOT NULL REFERENCES users(id),
  current_starts_at timestamptz NOT NULL,
  current_ends_at timestamptz NOT NULL,
  requested_starts_at timestamptz NOT NULL,
  requested_ends_at timestamptz NOT NULL,
  status reschedule_status NOT NULL DEFAULT 'requested',
  reason text,
  resolved_by_user_id uuid REFERENCES users(id),
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT reschedule_requested_valid_range CHECK (requested_starts_at < requested_ends_at)
);

CREATE TABLE message_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid REFERENCES appointments(id) ON DELETE SET NULL,
  customer_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stylist_id uuid REFERENCES stylist_profiles(user_id) ON DELETE SET NULL,
  subject text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES message_threads(id) ON DELETE CASCADE,
  sender_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  sender_type message_sender_type NOT NULL,
  body text NOT NULL,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX messages_thread_created_idx ON messages(thread_id, created_at);

CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text NOT NULL,
  deep_link text,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX notifications_user_unread_idx
  ON notifications(user_id, created_at DESC)
  WHERE read_at IS NULL;

CREATE TABLE audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  action text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX audit_events_entity_idx ON audit_events(entity_type, entity_id, created_at DESC);

-- Seed data for Shakira Beauty and Welness Salon.
INSERT INTO service_categories (name, sort_order) VALUES
  ('Braids', 10),
  ('Dreadlocks', 20),
  ('Perm', 30),
  ('Hair dye', 40)
ON CONFLICT (name) DO NOTHING;

INSERT INTO services (category_id, name, slug, description, duration_minutes, base_price_ugx, deposit_price_ugx)
SELECT id, 'Braids installation', 'braids-installation', 'Protective braids styling with consultation.', 135, 185000, 62000
FROM service_categories WHERE name = 'Braids'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO services (category_id, name, slug, description, duration_minutes, base_price_ugx, deposit_price_ugx, is_add_on)
SELECT id, 'Dreadlock maintenance', 'dreadlock-maintenance', 'Retwist, shape, and scalp care.', 45, 28000, 0, true
FROM service_categories WHERE name = 'Dreadlocks'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO services (category_id, name, slug, description, duration_minutes, base_price_ugx, deposit_price_ugx, is_add_on)
SELECT id, 'Perm finish', 'perm-finish', 'Curl shaping and finish set.', 45, 35000, 0, true
FROM service_categories WHERE name = 'Perm'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO services (category_id, name, slug, description, duration_minutes, base_price_ugx, deposit_price_ugx, is_add_on)
SELECT id, 'Hair dye gloss', 'hair-dye-gloss', 'Color gloss and tone refresh.', 25, 35000, 0, true
FROM service_categories WHERE name = 'Hair dye'
ON CONFLICT (slug) DO NOTHING;
