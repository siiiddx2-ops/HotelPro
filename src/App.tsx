import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./lib/auth";
import { FullPageLoader } from "./components/ui";
import { ToastProvider } from "./components/Toast";
import { defaultPath } from "./lib/routes";
import LandingPage from "./pages/LandingPage";
import SignInPage from "./pages/SignInPage";
import SignUpPage from "./pages/SignUpPage";
import GuestLayout from "./layouts/GuestLayout";
import StaffLayout from "./layouts/StaffLayout";
import AdminLayout from "./layouts/AdminLayout";
import RoomsPage from "./pages/guest/RoomsPage";
import RoomDetailPage from "./pages/guest/RoomDetailPage";
import GuestDashboard from "./pages/guest/GuestDashboard";
import MyBookingsPage from "./pages/guest/MyBookingsPage";
import BookingDetailPage from "./pages/guest/BookingDetailPage";
import NotificationsPage from "./pages/NotificationsPage";
import ServiceRequestsPage from "./pages/guest/ServiceRequestsPage";
import ProfilePage from "./pages/ProfilePage";
import StaffDashboard from "./pages/staff/StaffDashboard";
import CheckInOutPage from "./pages/staff/CheckInOutPage";
import StaffReservationsPage from "./pages/staff/StaffReservationsPage";
import HousekeepingPage from "./pages/staff/HousekeepingPage";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminHotelsPage from "./pages/admin/AdminHotelsPage";
import AdminRoomsPage from "./pages/admin/AdminRoomsPage";
import AdminBookingsPage from "./pages/admin/AdminBookingsPage";
import AdminStaffPage from "./pages/admin/AdminStaffPage";
import AdminReportsPage from "./pages/admin/AdminReportsPage";
import AdminPaymentsPage from "./pages/admin/AdminPaymentsPage";
import AdminActivityLogsPage from "./pages/admin/AdminActivityLogsPage";

function RequireAuth({ children, roles }: { children: JSX.Element; roles?: string[] }) {
  const { session, profile, loading } = useAuth();
  const loc = useLocation();
  if (loading) return <FullPageLoader />;
  if (!session) return <Navigate to="/signin" state={{ from: loc.pathname }} replace />;
  if (roles && profile && !roles.includes(profile.role)) {
    return <Navigate to={defaultPath(profile.role)} replace />;
  }
  return children;
}

export default function App() {
  const { profile, loading } = useAuth();

  return (
    <ToastProvider>
      <Routes>
        <Route path="/" element={profile ? <Navigate to={defaultPath(profile?.role)} replace /> : <LandingPage />} />
        <Route path="/signin" element={profile ? <Navigate to={defaultPath(profile?.role)} replace /> : <SignInPage />} />
        <Route path="/signup" element={profile ? <Navigate to={defaultPath(profile?.role)} replace /> : <SignUpPage />} />

        {/* Guest area */}
        <Route path="/guest" element={<RequireAuth><GuestLayout /></RequireAuth>}>
          <Route index element={<GuestDashboard />} />
          <Route path="rooms" element={<RoomsPage />} />
          <Route path="rooms/:roomId" element={<RoomDetailPage />} />
          <Route path="bookings" element={<MyBookingsPage />} />
          <Route path="bookings/:bookingId" element={<BookingDetailPage />} />
          <Route path="services" element={<ServiceRequestsPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>

        {/* Staff area */}
        <Route path="/staff" element={<RequireAuth roles={["staff","admin"]}><StaffLayout /></RequireAuth>}>
          <Route index element={<StaffDashboard />} />
          <Route path="checkin" element={<CheckInOutPage />} />
          <Route path="reservations" element={<StaffReservationsPage />} />
          <Route path="housekeeping" element={<HousekeepingPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>

        {/* Admin area */}
        <Route path="/admin" element={<RequireAuth roles={["admin"]}><AdminLayout /></RequireAuth>}>
          <Route index element={<AdminDashboard />} />
          <Route path="hotels" element={<AdminHotelsPage />} />
          <Route path="rooms" element={<AdminRoomsPage />} />
          <Route path="bookings" element={<AdminBookingsPage />} />
          <Route path="payments" element={<AdminPaymentsPage />} />
          <Route path="staff" element={<AdminStaffPage />} />
          <Route path="reports" element={<AdminReportsPage />} />
          <Route path="logs" element={<AdminActivityLogsPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>

        <Route path="*" element={<Navigate to={loading ? "/" : defaultPath(profile?.role)} replace />} />
      </Routes>
    </ToastProvider>
  );
}
