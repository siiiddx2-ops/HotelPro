-- Redirect user-reference foreign keys from auth.users to public.profiles
-- so that PostgREST can resolve the nested joins used by the frontend.

ALTER TABLE public.bookings
  DROP CONSTRAINT bookings_guest_id_fkey,
  ADD CONSTRAINT bookings_guest_id_fkey
    FOREIGN KEY (guest_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.service_requests
  DROP CONSTRAINT service_requests_guest_id_fkey,
  ADD CONSTRAINT service_requests_guest_id_fkey
    FOREIGN KEY (guest_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.payments
  DROP CONSTRAINT payments_guest_id_fkey,
  ADD CONSTRAINT payments_guest_id_fkey
    FOREIGN KEY (guest_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.reviews
  DROP CONSTRAINT reviews_guest_id_fkey,
  ADD CONSTRAINT reviews_guest_id_fkey
    FOREIGN KEY (guest_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.invoices
  DROP CONSTRAINT invoices_guest_id_fkey,
  ADD CONSTRAINT invoices_guest_id_fkey
    FOREIGN KEY (guest_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.activity_logs
  DROP CONSTRAINT activity_logs_actor_id_fkey,
  ADD CONSTRAINT activity_logs_actor_id_fkey
    FOREIGN KEY (actor_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.staff_assignments
  DROP CONSTRAINT staff_assignments_user_id_fkey,
  ADD CONSTRAINT staff_assignments_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.notifications
  DROP CONSTRAINT notifications_user_id_fkey,
  ADD CONSTRAINT notifications_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.service_requests
  DROP CONSTRAINT service_requests_assigned_to_fkey,
  ADD CONSTRAINT service_requests_assigned_to_fkey
    FOREIGN KEY (assigned_to) REFERENCES public.profiles(id) ON DELETE SET NULL;
