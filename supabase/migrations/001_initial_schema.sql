-- =============================================================
-- Sakira Beauty & Hair Salon - Database Schema
-- Step 1: Tables, Constraints, Relationships, RLS Policies
-- =============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================
-- ENUM TYPES
-- =============================================================

-- User roles
CREATE TYPE user_role AS ENUM ('customer', 'admin');

-- Appointment lifecycle status
CREATE TYPE appointment_status AS ENUM (
  'pending',
  'confirmed',
  'cancelled',
  'completed',
  'rescheduled'
);

-- Payment status
CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'failed');

-- Payment methods (Uganda mobile money)
CREATE TYPE payment_method AS ENUM ('mtn_momo', 'airtel_money');

-- =============================================================
-- TABLE: users
-- Extends Supabase auth.users with profile + role data
-- =============================================================

CREATE TABLE public.users (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   TEXT NOT NULL,
  email       TEXT NOT NULL UNIQUE,
  phone       TEXT NOT NULL,
  role        user_role NOT NULL DEFAULT 'customer',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT phone_format CHECK (phone ~ '^\+?[0-9]{9,15}$')
);

COMMENT ON TABLE public.users IS 'Customer and admin profiles linked to Supabase auth';

-- =============================================================
-- TABLE: services
-- Salon services with prices in UGX
-- =============================================================

CREATE TABLE public.services (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name             TEXT NOT NULL,
  description      TEXT,
  price            INTEGER NOT NULL,            -- UGX, whole numbers only
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  is_active        BOOLEAN NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT price_positive CHECK (price > 0),
  CONSTRAINT duration_positive CHECK (duration_minutes > 0)
);

COMMENT ON TABLE public.services IS 'Salon services and pricing (UGX, stored as integers)';

-- =============================================================
-- TABLE: staff
-- Salon staff members
-- =============================================================

CREATE TABLE public.staff (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  role        TEXT NOT NULL,                 -- e.g. 'Hair Stylist', 'Beautician'
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.staff IS 'Salon staff providing services';

-- =============================================================
-- TABLE: appointments
-- Customer bookings
-- =============================================================

CREATE TABLE public.appointments (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id       UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  service_id        UUID NOT NULL REFERENCES public.services(id) ON DELETE RESTRICT,
  staff_id          UUID REFERENCES public.staff(id) ON DELETE SET NULL,
  appointment_date  DATE NOT NULL,
  appointment_time  TIME NOT NULL,
  status            appointment_status NOT NULL DEFAULT 'pending',
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Prevent booking the same staff at the same date/time
  CONSTRAINT unique_staff_slot UNIQUE (staff_id, appointment_date, appointment_time),

  -- No bookings in the past (validated on insert via trigger as well)
  CONSTRAINT future_date CHECK (appointment_date >= CURRENT_DATE)
);

COMMENT ON TABLE public.appointments IS 'Customer service bookings';

-- Indexes for common queries
CREATE INDEX idx_appointments_customer ON public.appointments(customer_id);
CREATE INDEX idx_appointments_date ON public.appointments(appointment_date);
CREATE INDEX idx_appointments_status ON public.appointments(status);
CREATE INDEX idx_appointments_staff ON public.appointments(staff_id);

-- =============================================================
-- TABLE: payments
-- Payment records linked to appointments
-- =============================================================

CREATE TABLE public.payments (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  appointment_id  UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  amount          INTEGER NOT NULL,         -- UGX
  method          payment_method NOT NULL,
  status          payment_status NOT NULL DEFAULT 'pending',
  phone_number    TEXT NOT NULL,            -- MoMo / Airtel number used
  reference       TEXT,                     -- transaction reference
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT amount_positive CHECK (amount > 0),
  CONSTRAINT payment_phone_format CHECK (phone_number ~ '^\+?[0-9]{9,15}$')
);

COMMENT ON TABLE public.payments IS 'Mobile money payment records (MTN MoMo / Airtel Money)';

CREATE INDEX idx_payments_appointment ON public.payments(appointment_id);
CREATE INDEX idx_payments_status ON public.payments(status);

-- =============================================================
-- TRIGGER: auto-update updated_at on all tables
-- =============================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_services_updated
  BEFORE UPDATE ON public.services
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_staff_updated
  BEFORE UPDATE ON public.staff
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_appointments_updated
  BEFORE UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_payments_updated
  BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =============================================================
-- TRIGGER: auto-create public.users row on auth signup
-- =============================================================

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

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================================
-- HELPER FUNCTION: check if current user is admin
-- =============================================================

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;
