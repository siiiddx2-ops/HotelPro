import { LayoutDashboard, Building2, BedDouble, CalendarCheck, Users, BarChart3, Bell, CreditCard, ScrollText, User } from "lucide-react";
import AppLayout from "./AppLayout";

const navItems = [
  { to: "/admin", label: "Dashboard", icon: <LayoutDashboard className="h-5 w-5" /> },
  { to: "/admin/hotels", label: "Hotels", icon: <Building2 className="h-5 w-5" /> },
  { to: "/admin/rooms", label: "Rooms", icon: <BedDouble className="h-5 w-5" /> },
  { to: "/admin/bookings", label: "Bookings", icon: <CalendarCheck className="h-5 w-5" /> },
  { to: "/admin/payments", label: "Payments", icon: <CreditCard className="h-5 w-5" /> },
  { to: "/admin/staff", label: "Staff", icon: <Users className="h-5 w-5" /> },
  { to: "/admin/reports", label: "Reports", icon: <BarChart3 className="h-5 w-5" /> },
  { to: "/admin/logs", label: "Activity Logs", icon: <ScrollText className="h-5 w-5" /> },
  { to: "/admin/notifications", label: "Notifications", icon: <Bell className="h-5 w-5" /> },
  { to: "/admin/profile", label: "Profile", icon: <User className="h-5 w-5" /> },
];

export default function AdminLayout() {
  return <AppLayout navItems={navItems} title="Admin" accent="primary" />;
}
