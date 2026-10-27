import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error("Missing Supabase environment variables. Check your .env file.");
}

export const supabase = createClient(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export type Role = "guest" | "staff" | "admin";

export interface Profile {
  id: string;
  role: Role;
  full_name: string;
  phone?: string;
  avatar_url?: string;
  hotel_id?: string | null;
  created_at?: string;
}

export interface Hotel {
  id: string;
  name: string;
  description?: string;
  address?: string;
  city?: string;
  country?: string;
  phone?: string;
  email?: string;
  star_rating?: number;
  image_url?: string;
  created_at?: string;
}

export interface RoomCategory {
  id: string;
  hotel_id: string;
  name: string;
  description?: string;
  base_price: number;
  capacity: number;
  amenities?: string[];
  created_at?: string;
}

export interface Room {
  id: string;
  hotel_id: string;
  category_id: string;
  room_number: string;
  floor?: number;
  status: "available" | "occupied" | "cleaning" | "maintenance" | "reserved";
  price: number;
  image_url?: string;
  created_at?: string;
}

export interface Booking {
  id: string;
  guest_id: string;
  hotel_id: string;
  room_id: string;
  check_in: string;
  check_out: string;
  guests: number;
  status: "pending" | "confirmed" | "checked_in" | "checked_out" | "cancelled" | "refunded";
  total_amount: number;
  notes?: string;
  created_at?: string;
}

export interface Payment {
  id: string;
  booking_id: string;
  guest_id: string;
  amount: number;
  method: "card" | "cash" | "wallet" | "bank_transfer";
  status: "pending" | "paid" | "failed" | "refunded";
  transaction_id?: string;
  created_at?: string;
}

export interface Review {
  id: string;
  booking_id: string;
  guest_id: string;
  hotel_id: string;
  room_id: string;
  rating: number;
  comment?: string;
  created_at?: string;
}

export interface NotificationItem {
  id: string;
  user_id: string;
  title: string;
  body?: string;
  type: "info" | "booking" | "payment" | "system" | "service";
  read: boolean;
  created_at?: string;
}

export interface ServiceRequest {
  id: string;
  guest_id: string;
  hotel_id: string;
  room_id?: string | null;
  booking_id?: string | null;
  type: "housekeeping" | "room_service" | "maintenance" | "laundry" | "other";
  description?: string;
  status: "open" | "in_progress" | "done" | "cancelled";
  assigned_to?: string | null;
  created_at?: string;
}

export interface StaffAssignment {
  id: string;
  user_id: string;
  hotel_id: string;
  role: "staff" | "admin";
  department?: string;
  created_at?: string;
}

export interface SeasonalRate {
  id: string;
  category_id: string;
  name: string;
  start_date: string;
  end_date: string;
  price: number;
  created_at?: string;
}

export interface ActivityLog {
  id: string;
  actor_id?: string | null;
  action: string;
  target_id?: string | null;
  details?: string;
  created_at?: string;
}

export interface Invoice {
  id: string;
  booking_id: string;
  guest_id: string;
  invoice_number?: string;
  amount: number;
  status: "issued" | "paid" | "void";
  created_at?: string;
}
