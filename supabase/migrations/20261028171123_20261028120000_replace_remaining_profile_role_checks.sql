/*
# Replace remaining recursive profile role checks

1. Modified policies
- Update hotel, room category, seasonal rate, invoice, service request, and staff assignment policies.
- Replace direct subqueries against `profiles` with the protected `public.current_user_role()` helper.

2. Security
- Preserve the existing guest ownership and staff/admin role restrictions.
- No tables, columns, or user records are deleted or changed.

3. Important notes
- All client-facing authorization checks now avoid querying `profiles` from another table's policy.
- This completes the recursion fix across the public application tables.
*/

DROP POLICY IF EXISTS "hotels_delete_admin" ON public.hotels;
CREATE POLICY "hotels_delete_admin" ON public.hotels FOR DELETE TO authenticated
USING (public.current_user_role() = 'admin');

DROP POLICY IF EXISTS "hotels_modify_admin" ON public.hotels;
CREATE POLICY "hotels_modify_admin" ON public.hotels FOR INSERT TO authenticated
WITH CHECK (public.current_user_role() = 'admin');

DROP POLICY IF EXISTS "hotels_update_admin" ON public.hotels;
CREATE POLICY "hotels_update_admin" ON public.hotels FOR UPDATE TO authenticated
USING (public.current_user_role() = 'admin');

DROP POLICY IF EXISTS "room_categories_delete_admin" ON public.room_categories;
CREATE POLICY "room_categories_delete_admin" ON public.room_categories FOR DELETE TO authenticated
USING (public.current_user_role() = 'admin');

DROP POLICY IF EXISTS "room_categories_insert_admin" ON public.room_categories;
CREATE POLICY "room_categories_insert_admin" ON public.room_categories FOR INSERT TO authenticated
WITH CHECK (public.current_user_role() = 'admin');

DROP POLICY IF EXISTS "room_categories_update_admin" ON public.room_categories;
CREATE POLICY "room_categories_update_admin" ON public.room_categories FOR UPDATE TO authenticated
USING (public.current_user_role() = 'admin');

DROP POLICY IF EXISTS "seasonal_rates_delete_admin" ON public.seasonal_rates;
CREATE POLICY "seasonal_rates_delete_admin" ON public.seasonal_rates FOR DELETE TO authenticated
USING (public.current_user_role() = 'admin');

DROP POLICY IF EXISTS "seasonal_rates_insert_admin" ON public.seasonal_rates;
CREATE POLICY "seasonal_rates_insert_admin" ON public.seasonal_rates FOR INSERT TO authenticated
WITH CHECK (public.current_user_role() = 'admin');

DROP POLICY IF EXISTS "seasonal_rates_update_admin" ON public.seasonal_rates;
CREATE POLICY "seasonal_rates_update_admin" ON public.seasonal_rates FOR UPDATE TO authenticated
USING (public.current_user_role() = 'admin');

DROP POLICY IF EXISTS "invoices_select_own_or_staff" ON public.invoices;
CREATE POLICY "invoices_select_own_or_staff" ON public.invoices FOR SELECT TO authenticated
USING (auth.uid() = guest_id OR public.current_user_role() IN ('staff', 'admin'));

DROP POLICY IF EXISTS "invoices_update_staff" ON public.invoices;
CREATE POLICY "invoices_update_staff" ON public.invoices FOR UPDATE TO authenticated
USING (public.current_user_role() IN ('staff', 'admin'))
WITH CHECK (public.current_user_role() IN ('staff', 'admin'));

DROP POLICY IF EXISTS "service_select_own_or_staff" ON public.service_requests;
CREATE POLICY "service_select_own_or_staff" ON public.service_requests FOR SELECT TO authenticated
USING (auth.uid() = guest_id OR public.current_user_role() IN ('staff', 'admin'));

DROP POLICY IF EXISTS "service_update_staff" ON public.service_requests;
CREATE POLICY "service_update_staff" ON public.service_requests FOR UPDATE TO authenticated
USING (auth.uid() = guest_id OR public.current_user_role() IN ('staff', 'admin'))
WITH CHECK (auth.uid() = guest_id OR public.current_user_role() IN ('staff', 'admin'));

DROP POLICY IF EXISTS "staff_delete_admin" ON public.staff_assignments;
CREATE POLICY "staff_delete_admin" ON public.staff_assignments FOR DELETE TO authenticated
USING (public.current_user_role() = 'admin');

DROP POLICY IF EXISTS "staff_insert_admin" ON public.staff_assignments;
CREATE POLICY "staff_insert_admin" ON public.staff_assignments FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id OR public.current_user_role() = 'admin');

DROP POLICY IF EXISTS "staff_select_self_or_admin" ON public.staff_assignments;
CREATE POLICY "staff_select_self_or_admin" ON public.staff_assignments FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.current_user_role() = 'admin');

DROP POLICY IF EXISTS "staff_update_admin" ON public.staff_assignments;
CREATE POLICY "staff_update_admin" ON public.staff_assignments FOR UPDATE TO authenticated
USING (public.current_user_role() = 'admin');
