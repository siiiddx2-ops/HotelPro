const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000/api";

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

export interface Hotel { id: string; name: string; description?: string; address?: string; city?: string; country?: string; phone?: string; email?: string; star_rating?: number; image_url?: string; created_at?: string; }
export interface RoomCategory { id: string; hotel_id: string; name: string; description?: string; base_price: number; capacity: number; amenities?: string[]; created_at?: string; }
export interface Room { id: string; hotel_id: string; category_id: string; room_number: string; floor?: number; status: "available" | "occupied" | "cleaning" | "maintenance" | "reserved"; price: number; image_url?: string; created_at?: string; }
export interface Booking { id: string; guest_id: string; hotel_id: string; room_id: string; check_in: string; check_out: string; guests: number; status: "pending" | "confirmed" | "checked_in" | "checked_out" | "cancelled" | "refunded"; total_amount: number; notes?: string; created_at?: string; }
export interface Payment { id: string; booking_id: string; guest_id: string; amount: number; method: "card" | "cash" | "wallet" | "bank_transfer"; status: "pending" | "paid" | "failed" | "refunded"; transaction_id?: string; created_at?: string; }
export interface Review { id: string; booking_id: string; guest_id: string; hotel_id: string; room_id: string; rating: number; comment?: string; created_at?: string; }
export interface NotificationItem { id: string; user_id: string; title: string; body?: string; type: "info" | "booking" | "payment" | "system" | "service"; read: boolean; created_at?: string; }
export interface ServiceRequest { id: string; guest_id: string; hotel_id: string; room_id?: string | null; booking_id?: string | null; type: "housekeeping" | "room_service" | "maintenance" | "laundry" | "other"; description?: string; status: "open" | "in_progress" | "done" | "cancelled"; assigned_to?: string | null; created_at?: string; }
export interface StaffAssignment { id: string; user_id: string; hotel_id: string; role: "staff" | "admin"; department?: string; created_at?: string; }
export interface SeasonalRate { id: string; category_id: string; name: string; start_date: string; end_date: string; price: number; created_at?: string; }
export interface ActivityLog { id: string; actor_id?: string | null; action: string; target_id?: string | null; details?: string; created_at?: string; }
export interface Invoice { id: string; booking_id: string; guest_id: string; invoice_number?: string; amount: number; status: "issued" | "paid" | "void"; created_at?: string; }

type QueryResult<T> = { data: T; error: Error | null; count?: number | null };

type QueryOptions = { count?: "exact"; head?: boolean };

class QueryBuilder<T> implements PromiseLike<QueryResult<T>> {
  private method: "GET" | "POST" | "PATCH" | "DELETE" = "GET";
  private payload: unknown;
  private filters: Record<string, string> = {};
  private orderBy?: string;
  private orderAsc = true;
  private maxRows?: number;
  private options: QueryOptions = {};
  private singleRow = false;

  constructor(private readonly table: string) {}

  select(_columns = "*", options: QueryOptions = {}) { this.options = options; return this; }
  eq(column: string, value: string | number | boolean) { this.filters[`eq.${column}`] = String(value); return this; }
  in(column: string, values: string[]) { this.filters[`in.${column}`] = values.join(","); return this; }
  or(_expression: string) { return this; }
  order(column: string, options: { ascending?: boolean } = {}) { this.orderBy = column; this.orderAsc = options.ascending ?? true; return this; }
  limit(value: number) { this.maxRows = value; return this; }
  maybeSingle() { this.singleRow = true; return this as unknown as QueryBuilder<any>; }
  single() { this.singleRow = true; return this as unknown as QueryBuilder<any>; }
  insert(payload: unknown) { this.method = "POST"; this.payload = payload; return this; }
  update(payload: unknown) { this.method = "PATCH"; this.payload = payload; return this; }
  delete() { this.method = "DELETE"; return this; }

  async execute(): Promise<QueryResult<T>> {
    try {
      const params = new URLSearchParams(this.filters);
      if (this.orderBy) { params.set("orderBy", this.orderBy); params.set("orderAsc", String(this.orderAsc)); }
      if (this.maxRows) params.set("limit", String(this.maxRows));
      if (this.options.head) params.set("head", "true");
      const token = localStorage.getItem("hotelpro_token");
      const response = await fetch(`${API_URL}/data/${this.table}${params.size ? `?${params}` : ""}`, {
        method: this.method,
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        ...(this.method !== "GET" && this.method !== "DELETE" ? { body: JSON.stringify(this.payload) } : {}),
      });
      const body = await response.json() as { data: T[] | null; error?: string; count?: number };
      if (!response.ok) return { data: null as T, error: new Error(body.error ?? "Request failed"), count: body.count };
      const data = this.singleRow ? (body.data?.[0] ?? null) : body.data;
      return { data: data as T, error: null, count: body.count };
    } catch (error) {
      return { data: null as T, error: error as Error };
    }
  }

  then<TResult1 = QueryResult<T>, TResult2 = never>(onfulfilled?: ((value: QueryResult<T>) => TResult1 | PromiseLike<TResult1>) | null, onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null): Promise<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected);
  }
}

export const supabase = {
  from: <T = any[]>(table: string) => new QueryBuilder<T>(table),
  async rpc(name: string, args: Record<string, unknown>) {
    const token = localStorage.getItem("hotelpro_token");
    const response = await fetch(`${API_URL}/rpc/${name}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(args),
    });
    const body = await response.json() as { data?: unknown; error?: string };
    return { data: body.data ?? null, error: response.ok ? null : new Error(body.error ?? "Request failed") };
  },
};
