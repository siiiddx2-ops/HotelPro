/*
# Fix recursive profile authorization checks

1. New helper function
- `public.current_user_role()` returns the signed-in user's role without re-entering the `profiles` table RLS policies.
- The function is security-definer and uses a fixed search path so it cannot be redirected to another schema.

2. Modified security policies
- Replace profile lookups inside `profiles_read_self_or_staff` and all staff/admin policy checks with `current_user_role()`.
- Preserve the existing ownership and role boundaries for profiles, bookings, payments, rooms, and activity logs.

3. Security
- Revoke function execution from PUBLIC and anon.
- Grant execution only to authenticated users.
- No tables, columns, or user records are deleted or changed.

4. Important notes
- This removes the infinite recursion that prevented room availability, reviews, bookings, and payments from loading.
- The helper only returns the role for the currently authenticated user.
*/

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid()
$$;

REVOKE EXECUTE ON FUNCTION public.current_user_role() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_user_role() TO authenticated;

DROP POLICY IF EXISTS "profiles_read_self_or_staff" ON public.profiles;
CREATE POLICY "profiles_read_self_or_staff"
ON public.profiles FOR SELECT
TO authenticated
USING (
  auth.uid() = id
  OR public.current_user_role() IN ('staff', 'admin')
);

DROP POLICY IF EXISTS "activity_logs_select_admin" ON public.activity_logs;
CREATE POLICY "activity_logs_select_admin"
ON public.activity_logs FOR SELECT
TO authenticated
USING (public.current_user_role() = 'admin');

DROP POLICY IF EXISTS "bookings_select_own_or_staff" ON public.bookings;
CREATE POLICY "bookings_select_own_or_staff"
ON public.bookings FOR SELECT
TO authenticated
USING (
  auth.uid() = guest_id
  OR public.current_user_role() IN ('staff', 'admin')
);

DROP POLICY IF EXISTS "payments_delete_staff" ON public.payments;
CREATE POLICY "payments_delete_staff"
ON public.payments FOR DELETE
TO authenticated
USING (public.current_user_role() IN ('staff', 'admin'));

DROP POLICY IF EXISTS "payments_select_own_or_staff" ON public.payments;
CREATE POLICY "payments_select_own_or_staff"
ON public.payments FOR SELECT
TO authenticated
USING (
  auth.uid() = guest_id
  OR public.current_user_role() IN ('staff', 'admin')
);

DROP POLICY IF EXISTS "payments_update_staff" ON public.payments;
CREATE POLICY "payments_update_staff"
ON public.payments FOR UPDATE
TO authenticated
USING (public.current_user_role() IN ('staff', 'admin'))
WITH CHECK (public.current_user_role() IN ('staff', 'admin'));

DROP POLICY IF EXISTS "rooms_delete_admin" ON public.rooms;
CREATE POLICY "rooms_delete_admin"
ON public.rooms FOR DELETE
TO authenticated
USING (public.current_user_role() = 'admin');

DROP POLICY IF EXISTS "rooms_insert_admin" ON public.rooms;
CREATE POLICY "rooms_insert_admin"
ON public.rooms FOR INSERT
TO authenticated
WITH CHECK (public.current_user_role() IN ('admin', 'staff'));

DROP POLICY IF EXISTS "rooms_update_staff" ON public.rooms;
CREATE POLICY "rooms_update_staff"
ON public.rooms FOR UPDATE
TO authenticated
USING (public.current_user_role() IN ('admin', 'staff'));
