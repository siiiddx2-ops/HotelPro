import { supabase, type Room, type RoomCategory, type Hotel } from "./supabase";

export interface RoomWithCategory extends Room {
  category?: RoomCategory;
  hotel?: Hotel;
}

export async function fetchRoomsWithCategories(hotelId?: string): Promise<RoomWithCategory[]> {
  let q = supabase
    .from("rooms")
    .select("*, category:room_categories(*), hotel:hotels(*)")
    .order("created_at", { ascending: false });
  if (hotelId) q = q.eq("hotel_id", hotelId);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as RoomWithCategory[];
}

export async function fetchRoomById(roomId: string): Promise<RoomWithCategory | null> {
  const { data, error } = await supabase
    .from("rooms")
    .select("*, category:room_categories(*), hotel:hotels(*)")
    .eq("id", roomId)
    .maybeSingle();
  if (error) throw error;
  return data as RoomWithCategory | null;
}

export async function fetchHotels(): Promise<Hotel[]> {
  const { data, error } = await supabase.from("hotels").select("*").order("name");
  if (error) throw error;
  return data ?? [];
}

export async function isRoomAvailable(roomId: string, checkIn: string, checkOut: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("bookings")
    .select("id")
    .eq("room_id", roomId)
    .in("status", ["pending", "confirmed", "checked_in"])
    .or(`and(check_in.lt.${checkOut},check_out.gt.${checkIn})`);
  if (error) throw error;
  return (data ?? []).length === 0;
}

export async function createNotification(
  userId: string,
  title: string,
  body: string,
  type: "info" | "booking" | "payment" | "system" | "service" = "info"
) {
  try {
    await supabase.from("notifications").insert({ user_id: userId, title, body, type });
  } catch (e) {
    console.warn("notification insert failed", e);
  }
}
