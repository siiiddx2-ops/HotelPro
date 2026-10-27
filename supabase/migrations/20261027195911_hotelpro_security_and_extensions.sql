/*
# HotelPro — Security hardening + new tables

## Summary
1. SECURITY: Role assignment moved to a SECURITY DEFINER function. The `profiles.role`
   column is no longer client-writable — only the `set_user_role` RPC can change it,
   and only when the caller is an admin.
2. SECURITY: Profile updates restricted to user-editable columns (full_name, phone,
   avatar_url). Role/hotel_id are server-controlled.
3. NEW TABLE: `seasonal_rates` — date-range based pricing overrides per room category.
4. NEW TABLE: `activity_logs` — audit trail of admin/staff actions (booking changes,
   role changes, check-in/out, etc.).
5. NEW TABLE: `invoices` — generated invoice records linked to bookings/payments.
6. RLS + grants on all new tables.
7. Activity log helper function.
*/

-- ============================================================
-- 1. SECURITY: Lock down profiles.role column
-- ============================================================

-- Revoke table-level UPDATE so we can grant column-level
REVOKE UPDATE ON public.profiles FROM authenticated;
-- Grant UPDATE only on user-editable columns
GRANT UPDATE (full_name, phone, avatar_url) ON public.profiles TO authenticated;

-- SECURITY DEFINER function for role assignment (admin only)
CREATE OR REPLACE FUNCTION public.set_user_role(p_target_user uuid, p_role text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Authorize the CALLER (not a parameter)
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Not authorized to change user roles';
  END IF;

  IF p_role NOT IN ('guest', 'staff', 'admin') THEN
    RAISE EXCEPTION 'Invalid role value';
  END IF;

  UPDATE public.profiles SET role = p_role WHERE id = p_target_user;

  -- Log the action
  INSERT INTO public.activity_logs (actor_id, action, target_id, details)
  VALUES (auth.uid(), 'role_change', p_target_user, 'Role set to ' || p_role);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.set_user_role(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_user_role(uuid, text) TO authenticated;

-- SECURITY DEFINER function for staff assignment (admin only)
CREATE OR REPLACE FUNCTION public.assign_staff(p_user_id uuid, p_hotel_id uuid, p_department text DEFAULT 'frontdesk')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Not authorized to assign staff';
  END IF;

  INSERT INTO public.staff_assignments (user_id, hotel_id, department)
  VALUES (p_user_id, p_hotel_id, p_department)
  ON CONFLICT (user_id, hotel_id) DO UPDATE SET department = EXCLUDED.department;

  -- Set the user's role to staff if they were a guest
  UPDATE public.profiles SET role = 'staff', hotel_id = p_hotel_id WHERE id = p_user_id AND role = 'guest';

  INSERT INTO public.activity_logs (actor_id, action, target_id, details)
  VALUES (auth.uid(), 'staff_assignment', p_user_id, 'Assigned to hotel ' || p_hotel_id::text);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.assign_staff(uuid, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.assign_staff(uuid, uuid, text) TO authenticated;

-- Function to remove staff assignment (admin only)
CREATE OR REPLACE FUNCTION public.remove_staff_assignment(p_assignment_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  DELETE FROM public.staff_assignments WHERE id = p_assignment_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.remove_staff_assignment(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.remove_staff_assignment(uuid) TO authenticated;

-- ============================================================
-- 2. NEW TABLE: seasonal_rates
-- ============================================================

CREATE TABLE IF NOT EXISTS public.seasonal_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES public.room_categories(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Seasonal rate',
  start_date date NOT NULL,
  end_date date NOT NULL,
  price numeric(10,2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.seasonal_rates ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.seasonal_rates TO authenticated;

DROP POLICY IF EXISTS "seasonal_rates_select_all" ON public.seasonal_rates;
CREATE POLICY "seasonal_rates_select_all" ON public.seasonal_rates FOR SELECT
  TO authenticated USING (true);
DROP POLICY IF EXISTS "seasonal_rates_insert_admin" ON public.seasonal_rates;
CREATE POLICY "seasonal_rates_insert_admin" ON public.seasonal_rates FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );
DROP POLICY IF EXISTS "seasonal_rates_update_admin" ON public.seasonal_rates;
CREATE POLICY "seasonal_rates_update_admin" ON public.seasonal_rates FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );
DROP POLICY IF EXISTS "seasonal_rates_delete_admin" ON public.seasonal_rates;
CREATE POLICY "seasonal_rates_delete_admin" ON public.seasonal_rates FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- ============================================================
-- 3. NEW TABLE: activity_logs
-- ============================================================

CREATE TABLE IF NOT EXISTS public.activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  target_id uuid,
  details text DEFAULT '',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.activity_logs TO authenticated;
GRANT INSERT ON public.activity_logs TO authenticated;

DROP POLICY IF EXISTS "activity_logs_select_admin" ON public.activity_logs;
CREATE POLICY "activity_logs_select_admin" ON public.activity_logs FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );
DROP POLICY IF EXISTS "activity_logs_insert_any" ON public.activity_logs;
CREATE POLICY "activity_logs_insert_any" ON public.activity_logs FOR INSERT
  TO authenticated WITH CHECK (true);

-- Helper to log activity from client
CREATE OR REPLACE FUNCTION public.log_activity(p_action text, p_target_id uuid DEFAULT NULL, p_details text DEFAULT '')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.activity_logs (actor_id, action, target_id, details)
  VALUES (auth.uid(), p_action, p_target_id, p_details);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.log_activity(text, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.log_activity(text, uuid, text) TO authenticated;

-- ============================================================
-- 4. NEW TABLE: invoices
-- ============================================================

CREATE TABLE IF NOT EXISTS public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  guest_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  invoice_number text NOT NULL DEFAULT '',
  amount numeric(10,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'issued' CHECK (status IN ('issued','paid','void')),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoices TO authenticated;

DROP POLICY IF EXISTS "invoices_select_own_or_staff" ON public.invoices;
CREATE POLICY "invoices_select_own_or_staff" ON public.invoices FOR SELECT
  TO authenticated USING (
    auth.uid() = guest_id
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('staff','admin'))
  );
DROP POLICY IF EXISTS "invoices_insert_self" ON public.invoices;
CREATE POLICY "invoices_insert_self" ON public.invoices FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = guest_id);
DROP POLICY IF EXISTS "invoices_update_staff" ON public.invoices;
CREATE POLICY "invoices_update_staff" ON public.invoices FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('staff','admin'))
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('staff','admin'))
  );

-- ============================================================
-- 5. Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_seasonal_rates_category ON public.seasonal_rates(category_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_actor ON public.activity_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON public.activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_booking ON public.invoices(booking_id);
CREATE INDEX IF NOT EXISTS idx_invoices_guest ON public.invoices(guest_id);
