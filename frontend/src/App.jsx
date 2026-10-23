import React, { useEffect, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';

// Components
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import MobileBottomBar from './components/MobileBottomBar';
import AuthRequiredModal from './components/AuthRequiredModal';

// Public Pages (Static imports for critical landing)
import Home from './pages/Home';
import About from './pages/About';
import Rooms from './pages/Rooms';
import Facilities from './pages/Facilities';
import Gallery from './pages/Gallery';
import Location from './pages/Location';
import Contact from './pages/Contact';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';

// User Portal (Lazy loaded)
import UserLayout from './layouts/UserLayout';
const UserDashboard = lazy(() => import('./pages/user/UserDashboard'));
const MyVisits = lazy(() => import('./pages/user/MyVisits'));
const MyBookings = lazy(() => import('./pages/user/MyBookings'));
const VisitRequestForm = lazy(() => import('./pages/user/VisitRequestForm'));
const BookRoomForm = lazy(() => import('./pages/user/BookRoomForm'));
const Profile = lazy(() => import('./pages/user/Profile'));
const Notifications = lazy(() => import('./pages/user/Notifications'));
const UserReport = lazy(() => import('./pages/user/UserReport'));

// Admin Portal (Lazy loaded to drastically shrink initial bundle and make dashboard navigation instant)
import AdminLayout from './layouts/AdminLayout';
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminVisits = lazy(() => import('./pages/admin/AdminVisits'));
const AdminBookings = lazy(() => import('./pages/admin/AdminBookings'));
const AdminRooms = lazy(() => import('./pages/admin/AdminRooms'));
const AdminResidents = lazy(() => import('./pages/admin/AdminResidents'));
const AdminRentManagement = lazy(() => import('./pages/admin/AdminRentManagement'));
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers'));
const AdminFacilities = lazy(() => import('./pages/admin/AdminFacilities'));
const AdminGallery = lazy(() => import('./pages/admin/AdminGallery'));
const AdminPGDetails = lazy(() => import('./pages/admin/AdminPGDetails'));
const AdminMessages = lazy(() => import('./pages/admin/AdminMessages'));
const AdminReports = lazy(() => import('./pages/admin/AdminReports'));
const AdminNotifications = lazy(() => import('./pages/admin/AdminNotifications'));
const AdminProfile = lazy(() => import('./pages/admin/AdminProfile'));
const AdminSettings = lazy(() => import('./pages/admin/AdminSettings'));

function PageLoader() {
  return (
    <div className="d-flex justify-content-center align-items-center py-5">
      <div className="spinner-border text-warning spinner-border-sm me-2" role="status"></div>
      <span className="small text-muted fw-semibold">Loading...</span>
    </div>
  );
}

// Helper to scroll to top on navigation
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

// Layout wrapper for public pages with Navbar, Footer & Mobile Bottom Bar
function PublicLayout({ children }) {
  return (
    <div className="d-flex flex-column min-vh-100">
      <Navbar />
      <main className="flex-grow-1 d-flex flex-column">{children}</main>
      <Footer />
      <MobileBottomBar />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <BrowserRouter>
          <ScrollToTop />
          <AuthRequiredModal />

        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<PublicLayout><Home /></PublicLayout>} />
            <Route path="/about" element={<PublicLayout><About /></PublicLayout>} />
            <Route path="/rooms" element={<PublicLayout><Rooms /></PublicLayout>} />
            <Route path="/facilities" element={<PublicLayout><Facilities /></PublicLayout>} />
            <Route path="/gallery" element={<PublicLayout><Gallery /></PublicLayout>} />
            <Route path="/location" element={<PublicLayout><Location /></PublicLayout>} />
            <Route path="/contact" element={<PublicLayout><Contact /></PublicLayout>} />
            <Route path="/login" element={<PublicLayout><Login /></PublicLayout>} />
            <Route path="/register" element={<PublicLayout><Register /></PublicLayout>} />
            <Route path="/forgot-password" element={<PublicLayout><ForgotPassword /></PublicLayout>} />

            {/* User Portal Protected Routes */}
            <Route element={<PublicLayout><UserLayout /></PublicLayout>}>
              <Route path="/dashboard" element={<UserDashboard />} />
              <Route path="/my-visits" element={<MyVisits />} />
              <Route path="/my-bookings" element={<MyBookings />} />
              <Route path="/visit-request" element={<VisitRequestForm />} />
              <Route path="/book-room" element={<BookRoomForm />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/report" element={<UserReport />} />
            </Route>

            {/* Admin Portal Routes */}
            <Route path="/admin/login" element={<PublicLayout><Login /></PublicLayout>} />
            <Route path="/admin" element={<AdminLayout />}>
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="visits" element={<AdminVisits />} />
              <Route path="bookings" element={<AdminBookings />} />
              <Route path="rooms" element={<AdminRooms />} />
              <Route path="residents" element={<AdminResidents />} />
              <Route path="rent" element={<AdminRentManagement />} />
              <Route path="users" element={<AdminUsers />} />

              <Route path="facilities" element={<AdminFacilities />} />
              <Route path="gallery" element={<AdminGallery />} />
              <Route path="pg-details" element={<AdminPGDetails />} />
              <Route path="messages" element={<AdminMessages />} />
              <Route path="reports" element={<AdminReports />} />
              <Route path="notifications" element={<AdminNotifications />} />
              <Route path="profile" element={<AdminProfile />} />
              <Route path="settings" element={<AdminSettings />} />
            </Route>

            {/* Catch-all 404 Route */}
            <Route
              path="*"
              element={
                <PublicLayout>
                  <div className="py-5 text-center min-vh-50 d-flex flex-column justify-content-center align-items-center">
                    <h1 className="display-1 fw-bold text-muted">404</h1>
                    <h4 className="fw-bold">Page Not Found</h4>
                    <p className="text-secondary small">The requested page does not exist.</p>
                    <a href="/" className="btn btn-pg-primary mt-2">Return Home</a>
                  </div>
                </PublicLayout>
              }
            />
          </Routes>
        </Suspense>
      </BrowserRouter>
      </NotificationProvider>
    </AuthProvider>
  );
}
