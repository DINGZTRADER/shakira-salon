-- =============================================================
-- Row Level Security (RLS) Policies
-- =============================================================

-- Enable RLS on all tables
ALTER TABLE public.users        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments     ENABLE ROW LEVEL SECURITY;

-- -------------------------------------------------------------
-- USERS policies
-- -------------------------------------------------------------

-- Users can read their own profile
CREATE POLICY "users_select_own"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

-- Admins can read all profiles
CREATE POLICY "users_select_admin"
  ON public.users FOR SELECT
  USING (public.is_admin());

-- Users can update their own profile (not role)
CREATE POLICY "users_update_own"
  ON public.users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Admins can update any profile
CREATE POLICY "users_update_admin"
  ON public.users FOR UPDATE
  USING (public.is_admin());

-- -------------------------------------------------------------
-- SERVICES policies
-- -------------------------------------------------------------

-- Anyone (including anonymous) can view active services
CREATE POLICY "services_select_public"
  ON public.services FOR SELECT
  USING (is_active = true OR public.is_admin());

-- Only admins can insert/update/delete services
CREATE POLICY "services_insert_admin"
  ON public.services FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "services_update_admin"
  ON public.services FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "services_delete_admin"
  ON public.services FOR DELETE
  USING (public.is_admin());

-- -------------------------------------------------------------
-- STAFF policies
-- -------------------------------------------------------------

-- Anyone can view active staff
CREATE POLICY "staff_select_public"
  ON public.staff FOR SELECT
  USING (is_active = true OR public.is_admin());

-- Only admins can manage staff
CREATE POLICY "staff_insert_admin"
  ON public.staff FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "staff_update_admin"
  ON public.staff FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "staff_delete_admin"
  ON public.staff FOR DELETE
  USING (public.is_admin());

-- -------------------------------------------------------------
-- APPOINTMENTS policies
-- -------------------------------------------------------------

-- Customers can view their own appointments
CREATE POLICY "appointments_select_own"
  ON public.appointments FOR SELECT
  USING (auth.uid() = customer_id);

-- Admins can view all appointments
CREATE POLICY "appointments_select_admin"
  ON public.appointments FOR SELECT
  USING (public.is_admin());

-- Customers can create their own appointments
CREATE POLICY "appointments_insert_own"
  ON public.appointments FOR INSERT
  WITH CHECK (auth.uid() = customer_id);

-- Customers can update their own appointments (reschedule/cancel)
CREATE POLICY "appointments_update_own"
  ON public.appointments FOR UPDATE
  USING (auth.uid() = customer_id)
  WITH CHECK (auth.uid() = customer_id);

-- Admins can update any appointment (approve/cancel)
CREATE POLICY "appointments_update_admin"
  ON public.appointments FOR UPDATE
  USING (public.is_admin());

-- Admins can delete appointments
CREATE POLICY "appointments_delete_admin"
  ON public.appointments FOR DELETE
  USING (public.is_admin());

-- -------------------------------------------------------------
-- PAYMENTS policies
-- -------------------------------------------------------------

-- Customers can view payments for their own appointments
CREATE POLICY "payments_select_own"
  ON public.payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.appointments a
      WHERE a.id = appointment_id AND a.customer_id = auth.uid()
    )
  );

-- Admins can view all payments
CREATE POLICY "payments_select_admin"
  ON public.payments FOR SELECT
  USING (public.is_admin());

-- Customers can create payments for their own appointments
CREATE POLICY "payments_insert_own"
  ON public.payments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.appointments a
      WHERE a.id = appointment_id AND a.customer_id = auth.uid()
    )
  );

-- Admins can update payment status
CREATE POLICY "payments_update_admin"
  ON public.payments FOR UPDATE
  USING (public.is_admin());
