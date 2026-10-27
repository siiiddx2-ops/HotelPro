import { LayoutDashboard, LogIn, CalendarCheck, Sparkles, Bell, User } from "lucide-react";
import AppLayout from "./AppLayout";

const navItems = [
  { to: "/staff", label: "Dashboard", icon: <LayoutDashboard className="h-5 w-5" /> },
  { to: "/staff/checkin", label: "Check-In / Out", icon: <LogIn className="h-5 w-5" /> },
  { to: "/staff/reservations", label: "Reservations", icon: <CalendarCheck className="h-5 w-5" /> },
  { to: "/staff/housekeeping", label: "Housekeeping", icon: <Sparkles className="h-5 w-5" /> },
  { to: "/staff/notifications", label: "Notifications", icon: <Bell className="h-5 w-5" /> },
  { to: "/staff/profile", label: "Profile", icon: <User className="h-5 w-5" /> },
];

export default function StaffLayout() {
  return <AppLayout navItems={navItems} title="Staff" accent="amber" />;
}
