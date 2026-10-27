/*
# HotelPro — Hotel Management System schema

1. Overview
- Full hotel management platform with three roles: guest, staff, admin.
- Profiles extend auth.users with a role, full name and phone.
- Hotels own rooms and room categories; rooms belong to a category.
- Bookings link a guest to a room with check-in/out dates, status, total.
- Payments record payment attempts for a booking.
- Reviews store guest ratings for a room/booking.
- Notifications keep users informed of bookings and operations.
- Service requests let guests ask for housekeeping, room service, etc.

2. Tables
- profiles (auth-extended user info + role)
- hotels
- room_categories
- rooms
- bookings
- payments
- reviews
- notifications
- service_requests
- staff_assignments (staff -> hotel)

3. Security
- RLS on every table.
- Guest: can manage their own bookings, payments, reviews, notifications, service requests, profile.
- Staff/Admin: can manage hotel operations. Role is stored in profiles.role (raw_app_meta_data is the
  source of truth but we mirror role into profiles for convenient querying).
- Admin role grants broader oversight via policies that check profiles.role = 'admin'.
- Owner columns default to auth.uid() so inserts that omit user_id succeed.
*/

-- PROFILES ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'guest' CHECK (role IN ('guest','staff','admin')),
  full_name text NOT NULL DEFAULT '',
  phone text DEFAULT '',
  avatar_url text DEFAULT '',
  hotel_id uuid, -- for staff/admin: which hotel they belong to
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;

DROP POLICY IF EXISTS "profiles_read_self_or_staff" ON public.profiles;
CREATE POLICY "profiles_read_self_or_staff" ON public.profiles FOR SELECT
  TO authenticated USING (
    auth.uid() = id
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('staff','admin'))
  );

DROP POLICY IF EXISTS "profiles_insert_self" ON public.profiles;
CREATE POLICY "profiles_insert_self" ON public.profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_self" ON public.profiles;
CREATE POLICY "profiles_update_self" ON public.profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- HOTELS ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.hotels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  address text DEFAULT '',
  city text DEFAULT '',
  country text DEFAULT '',
  phone text DEFAULT '',
  email text DEFAULT '',
  star_rating int DEFAULT 4 CHECK (star_rating BETWEEN 1 AND 5),
  image_url text DEFAULT '',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.hotels ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hotels TO authenticated;

DROP POLICY IF EXISTS "hotels_select_all" ON public.hotels;
CREATE POLICY "hotels_select_all" ON public.hotels FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "hotels_modify_admin" ON public.hotels;
CREATE POLICY "hotels_modify_admin" ON public.hotels FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );
DROP POLICY IF EXISTS "hotels_update_admin" ON public.hotels;
CREATE POLICY "hotels_update_admin" ON public.hotels FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );
DROP POLICY IF EXISTS "hotels_delete_admin" ON public.hotels;
CREATE POLICY "hotels_delete_admin" ON public.hotels FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- ROOM CATEGORIES ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.room_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text DEFAULT '',
  base_price numeric(10,2) NOT NULL DEFAULT 0,
  capacity int NOT NULL DEFAULT 2,
  amenities text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.room_categories ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.room_categories TO authenticated;

DROP POLICY IF EXISTS "room_categories_select_all" ON public.room_categories;
CREATE POLICY "room_categories_select_all" ON public.room_categories FOR SELECT
  TO authenticated USING (true);
DROP POLICY IF EXISTS "room_categories_insert_admin" ON public.room_categories;
CREATE POLICY "room_categories_insert_admin" ON public.room_categories FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );
DROP POLICY IF EXISTS "room_categories_update_admin" ON public.room_categories;
CREATE POLICY "room_categories_update_admin" ON public.room_categories FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );
DROP POLICY IF EXISTS "room_categories_delete_admin" ON public.room_categories;
CREATE POLICY "room_categories_delete_admin" ON public.room_categories FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- ROOMS -------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.room_categories(id) ON DELETE CASCADE,
  room_number text NOT NULL,
  floor int DEFAULT 1,
  status text NOT NULL DEFAULT 'available' CHECK (status IN ('available','occupied','cleaning','maintenance','reserved')),
  price numeric(10,2) NOT NULL DEFAULT 0,
  image_url text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  UNIQUE (hotel_id, room_number)
);
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rooms TO authenticated;

DROP POLICY IF EXISTS "rooms_select_all" ON public.rooms;
CREATE POLICY "rooms_select_all" ON public.rooms FOR SELECT
  TO authenticated USING (true);
DROP POLICY IF EXISTS "rooms_insert_admin" ON public.rooms;
CREATE POLICY "rooms_insert_admin" ON public.rooms FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','staff'))
  );
DROP POLICY IF EXISTS "rooms_update_staff" ON public.rooms;
CREATE POLICY "rooms_update_staff" ON public.rooms FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','staff'))
  );
DROP POLICY IF EXISTS "rooms_delete_admin" ON public.rooms;
CREATE POLICY "rooms_delete_admin" ON public.rooms FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- BOOKINGS ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  hotel_id uuid NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  check_in date NOT NULL,
  check_out date NOT NULL,
  guests int NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','checked_in','checked_out','cancelled','refunded')),
  total_amount numeric(10,2) NOT NULL DEFAULT 0,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bookings TO authenticated;

DROP POLICY IF EXISTS "bookings_select_own_or_staff" ON public.bookings;
CREATE POLICY "bookings_select_own_or_staff" ON public.bookings FOR SELECT
  TO authenticated USING (
    auth.uid() = guest_id
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('staff','admin'))
  );
DROP POLICY IF EXISTS "bookings_insert_self" ON public.bookings;
CREATE POLICY "bookings_insert_self" ON public.bookings FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = guest_id);
DROP POLICY IF EXISTS "bookings_update_own" ON public.bookings;
CREATE POLICY "bookings_update_own" ON public.bookings FOR UPDATE
  TO authenticated USING (auth.uid() = guest_id) WITH CHECK (auth.uid() = guest_id);
DROP POLICY IF EXISTS "bookings_delete_own" ON public.bookings;
CREATE POLICY "bookings_delete_own" ON public.bookings FOR DELETE
  TO authenticated USING (auth.uid() = guest_id);

-- PAYMENTS ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  guest_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  amount numeric(10,2) NOT NULL DEFAULT 0,
  method text NOT NULL DEFAULT 'card' CHECK (method IN ('card','cash','wallet','bank_transfer')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','failed','refunded')),
  transaction_id text DEFAULT '',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payments TO authenticated;

DROP POLICY IF EXISTS "payments_select_own_or_staff" ON public.payments;
CREATE POLICY "payments_select_own_or_staff" ON public.payments FOR SELECT
  TO authenticated USING (
    auth.uid() = guest_id
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('staff','admin'))
  );
DROP POLICY IF EXISTS "payments_insert_self" ON public.payments;
CREATE POLICY "payments_insert_self" ON public.payments FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = guest_id);
DROP POLICY IF EXISTS "payments_update_staff" ON public.payments;
CREATE POLICY "payments_update_staff" ON public.payments FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('staff','admin'))
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('staff','admin'))
  );
DROP POLICY IF EXISTS "payments_delete_staff" ON public.payments;
CREATE POLICY "payments_delete_staff" ON public.payments FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('staff','admin'))
  );

-- REVIEWS -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  guest_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  hotel_id uuid NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  rating int NOT NULL DEFAULT 5 CHECK (rating BETWEEN 1 AND 5),
  comment text DEFAULT '',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reviews TO authenticated;

DROP POLICY IF EXISTS "reviews_select_all" ON public.reviews;
CREATE POLICY "reviews_select_all" ON public.reviews FOR SELECT
  TO authenticated USING (true);
DROP POLICY IF EXISTS "reviews_insert_self" ON public.reviews;
CREATE POLICY "reviews_insert_self" ON public.reviews FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = guest_id);
DROP POLICY IF EXISTS "reviews_update_self" ON public.reviews;
CREATE POLICY "reviews_update_self" ON public.reviews FOR UPDATE
  TO authenticated USING (auth.uid() = guest_id) WITH CHECK (auth.uid() = guest_id);
DROP POLICY IF EXISTS "reviews_delete_self" ON public.reviews;
CREATE POLICY "reviews_delete_self" ON public.reviews FOR DELETE
  TO authenticated USING (auth.uid() = guest_id);

-- NOTIFICATIONS -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text DEFAULT '',
  type text NOT NULL DEFAULT 'info' CHECK (type IN ('info','booking','payment','system','service')),
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;

DROP POLICY IF EXISTS "notifications_select_own" ON public.notifications;
CREATE POLICY "notifications_select_own" ON public.notifications FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "notifications_insert_any_to_user" ON public.notifications;
CREATE POLICY "notifications_insert_any_to_user" ON public.notifications FOR INSERT
  TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "notifications_update_own" ON public.notifications;
CREATE POLICY "notifications_update_own" ON public.notifications FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "notifications_delete_own" ON public.notifications;
CREATE POLICY "notifications_delete_own" ON public.notifications FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- SERVICE REQUESTS --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.service_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  hotel_id uuid NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  room_id uuid REFERENCES public.rooms(id) ON DELETE SET NULL,
  booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  type text NOT NULL DEFAULT 'housekeeping' CHECK (type IN ('housekeeping','room_service','maintenance','laundry','other')),
  description text DEFAULT '',
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','done','cancelled')),
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_requests TO authenticated;

DROP POLICY IF EXISTS "service_select_own_or_staff" ON public.service_requests;
CREATE POLICY "service_select_own_or_staff" ON public.service_requests FOR SELECT
  TO authenticated USING (
    auth.uid() = guest_id
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('staff','admin'))
  );
DROP POLICY IF EXISTS "service_insert_self" ON public.service_requests;
CREATE POLICY "service_insert_self" ON public.service_requests FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = guest_id);
DROP POLICY IF EXISTS "service_update_staff" ON public.service_requests;
CREATE POLICY "service_update_staff" ON public.service_requests FOR UPDATE
  TO authenticated USING (
    auth.uid() = guest_id
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('staff','admin'))
  ) WITH CHECK (
    auth.uid() = guest_id
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('staff','admin'))
  );
DROP POLICY IF EXISTS "service_delete_own" ON public.service_requests;
CREATE POLICY "service_delete_own" ON public.service_requests FOR DELETE
  TO authenticated USING (auth.uid() = guest_id);

-- STAFF ASSIGNMENTS -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.staff_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  hotel_id uuid NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'staff' CHECK (role IN ('staff','admin')),
  department text DEFAULT 'frontdesk',
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, hotel_id)
);
ALTER TABLE public.staff_assignments ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff_assignments TO authenticated;

DROP POLICY IF EXISTS "staff_select_self_or_admin" ON public.staff_assignments;
CREATE POLICY "staff_select_self_or_admin" ON public.staff_assignments FOR SELECT
  TO authenticated USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );
DROP POLICY IF EXISTS "staff_insert_admin" ON public.staff_assignments;
CREATE POLICY "staff_insert_admin" ON public.staff_assignments FOR INSERT
  TO authenticated WITH CHECK (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );
DROP POLICY IF EXISTS "staff_update_admin" ON public.staff_assignments;
CREATE POLICY "staff_update_admin" ON public.staff_assignments FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );
DROP POLICY IF EXISTS "staff_delete_admin" ON public.staff_assignments;
CREATE POLICY "staff_delete_admin" ON public.staff_assignments FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- INDEXES -----------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_bookings_guest ON public.bookings(guest_id);
CREATE INDEX IF NOT EXISTS idx_bookings_room ON public.bookings(room_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings(status);
CREATE INDEX IF NOT EXISTS idx_rooms_hotel ON public.rooms(hotel_id);
CREATE INDEX IF NOT EXISTS idx_rooms_category ON public.rooms(category_id);
CREATE INDEX IF NOT EXISTS idx_rooms_status ON public.rooms(status);
CREATE INDEX IF NOT EXISTS idx_payments_booking ON public.payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_service_guest ON public.service_requests(guest_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- AUTO-CREATE PROFILE TRIGGER ---------------------------------------------
-- When a new auth user is created, insert a matching profile row.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, role, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'role', 'guest'),
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated;
