import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { useTheme } from "../lib/theme";
import { Logo } from "../components/ui";
import {
  LayoutDashboard, BedDouble, CalendarCheck, Bell, Wrench, LogOut, Menu, X,
  Moon, Sun, User,
} from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

const navItems = [
  { to: "/guest", label: "Dashboard", icon: <LayoutDashboard className="h-5 w-5" /> },
  { to: "/guest/rooms", label: "Browse Rooms", icon: <BedDouble className="h-5 w-5" /> },
  { to: "/guest/bookings", label: "My Bookings", icon: <CalendarCheck className="h-5 w-5" /> },
  { to: "/guest/services", label: "Service Requests", icon: <Wrench className="h-5 w-5" /> },
  { to: "/guest/notifications", label: "Notifications", icon: <Bell className="h-5 w-5" /> },
  { to: "/guest/profile", label: "Profile", icon: <User className="h-5 w-5" /> },
];

export default function GuestLayout() {
  const { profile, signOut } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!profile) return;
    let mounted = true;
    (async () => {
      const { count } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", profile.id)
        .eq("read", false);
      if (mounted) setUnread(count ?? 0);
    })();
  }, [profile]);

  async function handleSignOut() {
    await signOut();
    navigate("/");
  }

  return (
    <div className="min-h-screen bg-ink-50 dark:bg-ink-950">
      <header className="sticky top-0 z-40 border-b border-ink-100 bg-white/90 backdrop-blur dark:border-ink-700 dark:bg-ink-900/90">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Logo to="/guest" />
            <span className="hidden sm:inline-block rounded-md bg-primary-600 px-2 py-0.5 text-xs font-semibold text-white">
              Guest
            </span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <button onClick={toggle} className="rounded-lg p-2 text-ink-600 hover:bg-ink-100 dark:text-ink-300 dark:hover:bg-ink-800" title="Toggle theme">
              {theme === "light" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
            </button>
            <Link to="/guest/profile" className="rounded-lg p-2 text-ink-600 hover:bg-ink-100 dark:text-ink-300 dark:hover:bg-ink-800">
              <User className="h-5 w-5" />
            </Link>
            <Link to="/guest/notifications" className="relative rounded-lg p-2 text-ink-600 hover:bg-ink-100 dark:text-ink-300 dark:hover:bg-ink-800">
              <Bell className="h-5 w-5" />
              {unread > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </Link>
            <div className="hidden sm:block text-right">
              <p className="text-sm font-medium text-ink-800 dark:text-ink-100">{profile?.full_name || "Guest"}</p>
              <p className="text-xs text-ink-500 dark:text-ink-400">Guest account</p>
            </div>
            <button onClick={handleSignOut} className="btn-ghost p-2" title="Sign out">
              <LogOut className="h-5 w-5" />
            </button>
            <button className="md:hidden p-2 text-ink-600 dark:text-ink-300" onClick={() => setOpen((v) => !v)}>
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl gap-6 px-4 sm:px-6 py-6">
        <aside className={`md:block w-60 shrink-0 ${open ? "block" : "hidden"}`}>
          <nav className="card p-3 flex flex-col gap-1 sticky top-24">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/guest"}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-primary-50 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300"
                      : "text-ink-600 hover:bg-ink-100 dark:text-ink-300 dark:hover:bg-ink-800"
                  }`
                }
              >
                {item.icon}
                {item.label}
              </NavLink>
            ))}
          </nav>
        </aside>
        <main className="flex-1 min-w-0 animate-fade-in">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
