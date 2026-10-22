import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Auth3DCanvas from '../components/Auth3DCanvas';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [validationErrors, setValidationErrors] = useState({});

  const returnUrl = location.state?.returnUrl || null;
  const isAdminPath = location.pathname.includes('/admin');

  const validateForm = () => {
    const errors = {};
    if (!email.trim()) {
      errors.email = 'Please enter your registered email address or username.';
    }
    if (!password) {
      errors.password = 'Please enter your password.';
    }
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const loggedUser = await login(email.trim(), password);
      if (returnUrl) {
        navigate(returnUrl);
      } else if (loggedUser.role === 'ADMIN') {
        navigate('/admin/dashboard');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid email or password. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page-wrapper">
      <div className="auth-split-card">
        {/* Left Section — Brand Experience & Interactive 3D PG Tower (Desktop & Tablet) */}
        <div
          className="auth-hero-panel"
          style={{
            backgroundImage: `url('/images/bedroom_triple_wallpaper.png')`,
          }}
        >
          <div className="auth-hero-overlay"></div>
          {/* Interactive 3D WebGL PG Living Experience */}
          <Auth3DCanvas />

          <div className="auth-hero-content">
            {/* Brand Header */}
            <div>
              <div className="d-flex align-items-center gap-2.5 mb-3">
                <div
                  className="d-flex align-items-center justify-content-center text-white rounded-3 shadow-sm fw-bold"
                  style={{
                    width: '42px',
                    height: '42px',
                    backgroundColor: '#F4510B',
                    fontSize: '1.15rem',
                    letterSpacing: '0.5px',
                  }}
                >
                  SL
                </div>
                <div>
                  <h6 className="fw-bold mb-0 text-white" style={{ letterSpacing: '0.01em' }}>
                    Sri Lakshmi Srinivasa
                  </h6>
                  <span className="small text-white-50" style={{ fontSize: '0.75rem' }}>
                    Gents PG & Luxury Stay • Velachery
                  </span>
                </div>
              </div>

              <div className="pt-4">
                <span
                  className="badge px-3 py-1.5 rounded-pill mb-3 fw-semibold"
                  style={{
                    background: 'rgba(244, 81, 11, 0.25)',
                    color: '#FFEDD5',
                    border: '1px solid rgba(244, 81, 11, 0.4)',
                    fontSize: '0.78rem',
                  }}
                >
                  Premium Men's Living
                </span>
                <h2 className="fw-bold text-white mb-2 lh-sm" style={{ fontSize: '2rem' }}>
                  Your Space. <br />Your Comfort. <br /><span style={{ color: '#FDBA74' }}>Your Home.</span>
                </h2>
                <p className="text-white-50 small mb-4 lh-base" style={{ maxWidth: '360px' }}>
                  Experience peaceful, secure, and fully-managed co-living in the heart of Velachery, Chennai with chef-cooked meals and high-speed Wi-Fi.
                </p>
              </div>
            </div>

            {/* 3 Benefit Highlights */}
            <div className="d-flex flex-column gap-2.5 my-3">
              <div className="auth-feature-pill">
                <div className="auth-feature-icon">
                  <i className="bi bi-door-open-fill"></i>
                </div>
                <div>
                  <div className="fw-semibold small text-white">Comfortable AC & Non-AC Rooms</div>
                  <div className="text-white-50" style={{ fontSize: '0.7rem' }}>Well-ventilated spaces with attached washrooms</div>
                </div>
              </div>

              <div className="auth-feature-pill">
                <div className="auth-feature-icon">
                  <i className="bi bi-shield-check"></i>
                </div>
                <div>
                  <div className="fw-semibold small text-white">24/7 Secure Living</div>
                  <div className="text-white-50" style={{ fontSize: '0.7rem' }}>CCTV surveillance, biometric entry & resident safety</div>
                </div>
              </div>

              <div className="auth-feature-pill">
                <div className="auth-feature-icon">
                  <i className="bi bi-wallet2"></i>
                </div>
                <div>
                  <div className="fw-semibold small text-white">Seamless Rent & Bookings</div>
                  <div className="text-white-50" style={{ fontSize: '0.7rem' }}>Instant digital receipts & WhatsApp payment reminders</div>
                </div>
              </div>
            </div>

            {/* Footer location note */}
            <div className="pt-3 border-top border-white border-opacity-10 d-flex justify-content-between align-items-center text-white-50 small">
              <span style={{ fontSize: '0.75rem' }}>
                <i className="bi bi-geo-alt-fill text-danger me-1"></i> Velachery, Chennai - 600042
              </span>
              <span className="badge bg-black bg-opacity-30 border border-white border-opacity-10 px-2 py-1 text-white-50" style={{ fontSize: '0.7rem' }}>
                Gents Hostel
              </span>
            </div>
          </div>
        </div>

        {/* Right Section — Sign In Form */}
        <div className="auth-form-panel">
          {/* Mobile Branded Header (< 992px) */}
          <div className="auth-mobile-header text-center mb-4">
            <div
              className="d-inline-flex align-items-center justify-content-center text-white rounded-3 shadow-xs mb-2 fw-bold"
              style={{
                width: '46px',
                height: '46px',
                backgroundColor: '#F4510B',
                fontSize: '1.2rem',
              }}
            >
              SL
            </div>
            <h5 className="fw-bold text-dark mb-0">Sri Lakshmi Srinivasa</h5>
            <span className="text-muted small" style={{ fontSize: '0.75rem' }}>
              Gents PG • Velachery, Chennai
            </span>
          </div>

          {/* Form Header */}
          <div className="mb-4">
            <h3 className="fw-bold text-dark mb-1">
              {isAdminPath ? 'Admin ERP Sign In' : 'Welcome Back'}
            </h3>
            <p className="text-secondary small mb-0">
              Sign in to manage your room bookings, rent payments, and requests.
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div
              className="alert alert-danger border-0 rounded-3 small py-2.5 px-3 mb-3.5 d-flex align-items-center gap-2 shadow-xs"
              role="alert"
            >
              <i className="bi bi-exclamation-circle-fill text-danger flex-shrink-0 fs-6"></i>
              <div className="fw-medium">{error}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            {/* Email / Username Input */}
            <div className="mb-3 auth-input-group">
              <label htmlFor="login-email" className="form-label small fw-semibold text-dark mb-1.5">
                Email Address or Username
              </label>
              <div className="position-relative">
                <input
                  id="login-email"
                  type="email"
                  autoComplete="username"
                  className={`form-control ps-4 ${validationErrors.email ? 'is-invalid' : ''}`}
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (validationErrors.email) {
                      setValidationErrors((prev) => ({ ...prev, email: '' }));
                    }
                  }}
                />
                <i
                  className="bi bi-envelope text-muted position-absolute top-50 translate-middle-y ms-2.5"
                  style={{ pointerEvents: 'none' }}
                ></i>
              </div>
              {validationErrors.email && (
                <div className="invalid-feedback d-block small mt-1">
                  {validationErrors.email}
                </div>
              )}
            </div>

            {/* Password Input */}
            <div className="mb-3.5 auth-input-group">
              <div className="d-flex justify-content-between align-items-center mb-1.5">
                <label htmlFor="login-password" className="form-label small fw-semibold text-dark mb-0">
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="small text-decoration-none fw-semibold"
                  style={{ color: '#F4510B', fontSize: '0.8rem' }}
                >
                  Forgot password?
                </Link>
              </div>
              <div className="position-relative">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  className={`form-control ps-4 pe-5 ${validationErrors.password ? 'is-invalid' : ''}`}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (validationErrors.password) {
                      setValidationErrors((prev) => ({ ...prev, password: '' }));
                    }
                  }}
                />
                <i
                  className="bi bi-lock text-muted position-absolute top-50 translate-middle-y ms-2.5"
                  style={{ pointerEvents: 'none' }}
                ></i>
                <button
                  type="button"
                  className="btn btn-link text-muted position-absolute end-0 top-50 translate-middle-y pe-3 text-decoration-none"
                  onClick={() => setShowPassword((prev) => !prev)}
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  style={{ height: '48px', display: 'flex', alignItems: 'center' }}
                >
                  <i className={`bi ${showPassword ? 'bi-eye-slash-fill' : 'bi-eye-fill'} fs-6`}></i>
                </button>
              </div>
              {validationErrors.password && (
                <div className="invalid-feedback d-block small mt-1">
                  {validationErrors.password}
                </div>
              )}
            </div>

            {/* Submit Button */}
            <button
              id="login-submit-btn"
              type="submit"
              disabled={loading}
              className="auth-btn-primary w-100 mb-3.5"
            >
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  Signing In...
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <i className="bi bi-arrow-right"></i>
                </>
              )}
            </button>
          </form>

          {/* Register Prompt */}
          <div className="text-center small text-secondary pt-2 border-top">
            Don't have an account yet?{' '}
            <Link to="/register" className="fw-bold text-decoration-none ms-1" style={{ color: '#F4510B' }}>
              Create an Account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

