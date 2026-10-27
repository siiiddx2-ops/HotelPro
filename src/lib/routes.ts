export function defaultPath(role?: string | null) {
  if (role === "admin") return "/admin";
  if (role === "staff") return "/staff";
  return "/guest";
}
