const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000/api";

interface ApiErrorBody {
  error?: string;
}

export interface ApiUser {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  role: "guest" | "staff" | "admin";
  createdAt?: string;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem("hotelpro_token");
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  const body = (await response.json()) as T & ApiErrorBody;
  if (!response.ok) throw new Error(body.error ?? "Request failed");
  return body as T;
}

export async function apiLogin(email: string, password: string) {
  return request<{ token: string; user: ApiUser }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function apiRegister(email: string, password: string, fullName: string) {
  return request<{ token: string; user: ApiUser }>("/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password, fullName }),
  });
}

export async function apiCurrentUser() {
  return request<{ user: ApiUser }>("/auth/me");
}

export async function apiUpdateProfile(updates: { fullName?: string; phone?: string }) {
  return request<{ user: ApiUser }>("/profile", {
    method: "PATCH",
    body: JSON.stringify(updates),
  });
}
