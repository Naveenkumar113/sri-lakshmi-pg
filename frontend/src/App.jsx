import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';

// Components
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import MobileBottomBar from './components/MobileBottomBar';
import AuthRequiredModal from './components/AuthRequiredModal';

// Public Pages
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

// User Portal
import UserLayout from './layouts/UserLayout';
import UserDashboard from './pages/user/UserDashboard';
import MyVisits from './pages/user/MyVisits';
import MyBookings from './pages/user/MyBookings';
import VisitRequestForm from './pages/user/VisitRequestForm';
import BookRoomForm from './pages/user/BookRoomForm';
import Profile from './pages/user/Profile';
import Notifications from './pages/user/Notifications';

// Admin Portal
import AdminLayout from './layouts/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminVisits from './pages/admin/AdminVisits';
import AdminBookings from './pages/admin/AdminBookings';
import AdminRooms from './pages/admin/AdminRooms';
import AdminResidents from './pages/admin/AdminResidents';
import AdminUsers from './pages/admin/AdminUsers';


import AdminFacilities from './pages/admin/AdminFacilities';
import AdminGallery from './pages/admin/AdminGallery';
import AdminPGDetails from './pages/admin/AdminPGDetails';
import AdminMessages from './pages/admin/AdminMessages';
import AdminNotifications from './pages/admin/AdminNotifications';
import AdminProfile from './pages/admin/AdminProfile';
import AdminSettings from './pages/admin/AdminSettings';

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
      <main className="flex-grow-1">{children}</main>
      <Footer />
      <MobileBottomBar />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <ScrollToTop />
        <AuthRequiredModal />

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
          </Route>

          {/* Admin Portal Routes */}
          <Route path="/admin/login" element={<PublicLayout><Login /></PublicLayout>} />
          <Route path="/admin" element={<AdminLayout />}>
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="visits" element={<AdminVisits />} />
            <Route path="bookings" element={<AdminBookings />} />
            <Route path="rooms" element={<AdminRooms />} />
            <Route path="residents" element={<AdminResidents />} />
            <Route path="users" element={<AdminUsers />} />

            <Route path="facilities" element={<AdminFacilities />} />
            <Route path="gallery" element={<AdminGallery />} />
            <Route path="pg-details" element={<AdminPGDetails />} />
            <Route path="messages" element={<AdminMessages />} />
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
      </BrowserRouter>
    </AuthProvider>
  );
}
