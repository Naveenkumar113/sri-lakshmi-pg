import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCardTilt } from '../hooks/useCardTilt';

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

  // 3D Card Tilt for Desktop
  const {
    cardRef,
    transformStyle,
    glarePosition,
    handleMouseMove,
    handleMouseLeave,
    isInteractive,
  } = useCardTilt();

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
      <div className="auth-card-tilt-container">
        <div
          ref={cardRef}
          className="auth-split-card"
          style={transformStyle ? { transform: transformStyle } : undefined}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          {/* Top 3D brand accent trim */}
          <div className="auth-card-accent-bar" aria-hidden="true" />

          {/* Desktop Glare reflection layer */}
          {isInteractive && glarePosition.opacity > 0 && (
            <div
              className="auth-card-glare"
              style={{
                background: `radial-gradient(circle at ${glarePosition.x}% ${glarePosition.y}%, rgba(255, 255, 255, 0.45) 0%, rgba(244, 81, 11, 0.12) 35%, transparent 65%)`,
                opacity: glarePosition.opacity,
              }}
              aria-hidden="true"
            />
          )}

          {/* Left Hero Section — PG Living Experience (Desktop) */}
          <div
            className="auth-hero-panel"
            style={{
              backgroundImage: `url('/images/pg_room_double.jpg')`,
            }}
          >
            <div className="auth-hero-overlay" aria-hidden="true" />

            <div className="auth-hero-content">
              {/* Brand Header */}
              <div>
                <div className="d-flex align-items-center gap-3 mb-3">
                  <div className="auth-brand-emblem shadow-sm" aria-hidden="true">
                    SL
                  </div>
                  <div>
                    <h5 className="fw-bold mb-0 text-white" style={{ letterSpacing: '-0.01em' }}>
                      Sri Lakshmi Srinivasa
                    </h5>
                    <span className="small text-white-50" style={{ fontSize: '0.78rem' }}>
                      Gents PG & Luxury Stay • Velachery
                    </span>
                  </div>
                </div>

                <div className="pt-3">
                  <span
                    className="badge px-3 py-1.5 rounded-pill mb-3 fw-semibold shadow-xs"
                    style={{
                      background: 'rgba(244, 81, 11, 0.3)',
                      color: '#FFEDD5',
                      border: '1px solid rgba(244, 81, 11, 0.5)',
                      fontSize: '0.8rem',
                      letterSpacing: '0.02em',
                    }}
                  >
                    ⭐ 4.8 Resident Rated • Velachery
                  </span>
                  <h2 className="fw-bold text-white mb-2 lh-sm" style={{ fontSize: '2.1rem' }}>
                    Your Space. <br />Your Comfort. <br />
                    <span style={{ color: '#FDBA74' }}>Your True Home.</span>
                  </h2>
                  <p className="text-white-50 small mb-0 lh-base" style={{ maxWidth: '370px' }}>
                    Experience peaceful, hygienic, and fully managed co-living in the heart of Velachery, Chennai with chef-cooked meals and high-speed Wi-Fi.
                  </p>
                </div>
              </div>

              {/* 3 Benefit Highlights */}
              <div className="d-flex flex-column gap-2.5 my-3">
                <div className="auth-amenity-pill">
                  <div className="auth-amenity-icon">
                    <i className="bi bi-door-open-fill"></i>
                  </div>
                  <div>
                    <div className="fw-semibold small text-white">Comfortable AC & Non-AC Rooms</div>
                    <div className="text-white-50" style={{ fontSize: '0.72rem' }}>
                      Well-ventilated spaces with attached washrooms & daily housekeeping
                    </div>
                  </div>
                </div>

                <div className="auth-amenity-pill">
                  <div className="auth-amenity-icon">
                    <i className="bi bi-cup-hot-fill"></i>
                  </div>
                  <div>
                    <div className="fw-semibold small text-white">3x Daily Homestyle Meals & Wi-Fi</div>
                    <div className="text-white-50" style={{ fontSize: '0.72rem' }}>
                      Nutritious South & North Indian menu with 100 Mbps internet
                    </div>
                  </div>
                </div>

                <div className="auth-amenity-pill">
                  <div className="auth-amenity-icon">
                    <i className="bi bi-shield-check"></i>
                  </div>
                  <div>
                    <div className="fw-semibold small text-white">24/7 Biometric Security & CCTV</div>
                    <div className="text-white-50" style={{ fontSize: '0.72rem' }}>
                      Round-the-clock safety, power backup & resident warden support
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer location note */}
              <div className="pt-3 border-top border-white border-opacity-10 d-flex justify-content-between align-items-center text-white-50 small">
                <span style={{ fontSize: '0.78rem' }}>
                  <i className="bi bi-geo-alt-fill text-danger me-1"></i> Velachery, Chennai - 600113
                </span>
                <span
                  className="badge bg-black bg-opacity-40 border border-white border-opacity-15 px-2.5 py-1 text-white-50"
                  style={{ fontSize: '0.72rem' }}
                >
                  Zero Brokerage
                </span>
              </div>
            </div>
          </div>

          {/* Right Section — Sign In Form */}
          <div className="auth-form-panel">
            {/* Mobile Branded Header (< 992px) */}
            <div className="auth-mobile-header mb-3">
              <div className="auth-brand-emblem auth-brand-emblem-sm mb-2 shadow-sm" aria-hidden="true">
                SL
              </div>
              <h5 className="fw-bold text-dark mb-0" style={{ letterSpacing: '-0.01em' }}>
                Sri Lakshmi Srinivasa
              </h5>
              <span className="text-muted small" style={{ fontSize: '0.78rem' }}>
                Gents PG & Luxury Stay • Velachery
              </span>
              <div className="d-flex flex-wrap justify-content-center gap-1.5 mt-2">
                <span className="auth-trust-chip">
                  <i className="bi bi-cup-hot-fill"></i> Homestyle Food
                </span>
                <span className="auth-trust-chip">
                  <i className="bi bi-wifi"></i> 100 Mbps Wi-Fi
                </span>
                <span className="auth-trust-chip">
                  <i className="bi bi-shield-lock-fill"></i> 24/7 Security
                </span>
              </div>
            </div>

            {/* Form Header */}
            <div className="mb-3.5">
              <h3 className="fw-bold text-dark mb-1" style={{ fontSize: '1.5rem', letterSpacing: '-0.02em' }}>
                {isAdminPath ? 'Admin ERP Sign In' : 'Welcome Back'}
              </h3>
              <p className="text-secondary small mb-0 lh-sm">
                {isAdminPath
                  ? 'Authorized administrator login for PG management & operations.'
                  : 'Sign in to manage your room bookings, rent payments, and requests.'}
              </p>
            </div>

            {/* Error Alert */}
            {error && (
              <div
                className="alert alert-danger border-0 rounded-3 small py-2.5 px-3 mb-3 d-flex align-items-center gap-2 shadow-xs"
                role="alert"
              >
                <i className="bi bi-exclamation-circle-fill text-danger flex-shrink-0 fs-6"></i>
                <div className="fw-medium">{error}</div>
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate>
              {/* Email / Username Input */}
              <div className="auth-input-group">
                <label htmlFor="login-email">
                  <span>
                    Email Address or Username <span className="text-danger">*</span>
                  </span>
                </label>
                <div className="auth-input-wrapper">
                  <i className="bi bi-envelope auth-input-icon"></i>
                  <input
                    id="login-email"
                    type="email"
                    autoComplete="username"
                    required
                    className={`form-control ${validationErrors.email ? 'is-invalid' : ''}`}
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (validationErrors.email) {
                        setValidationErrors((prev) => ({ ...prev, email: '' }));
                      }
                    }}
                  />
                </div>
                {validationErrors.email && (
                  <div className="invalid-feedback d-block small mt-1" role="alert">
                    {validationErrors.email}
                  </div>
                )}
              </div>

              {/* Password Input */}
              <div className="auth-input-group">
                <label htmlFor="login-password">
                  <span>
                    Password <span className="text-danger">*</span>
                  </span>
                  <Link
                    to="/forgot-password"
                    className="text-decoration-none fw-semibold"
                    style={{ color: '#F4510B', fontSize: '0.8rem' }}
                  >
                    Forgot password?
                  </Link>
                </label>
                <div className="auth-input-wrapper">
                  <i className="bi bi-lock auth-input-icon"></i>
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    className={`form-control has-toggle ${validationErrors.password ? 'is-invalid' : ''}`}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (validationErrors.password) {
                        setValidationErrors((prev) => ({ ...prev, password: '' }));
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="auth-password-toggle"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    <i className={`bi ${showPassword ? 'bi-eye-slash-fill' : 'bi-eye-fill'} fs-6`}></i>
                  </button>
                </div>
                {validationErrors.password && (
                  <div className="invalid-feedback d-block small mt-1" role="alert">
                    {validationErrors.password}
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <button
                id="login-submit-btn"
                type="submit"
                disabled={loading}
                className="auth-btn-primary my-2"
              >
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                    <span>Signing In...</span>
                  </>
                ) : (
                  <>
                    <span>{isAdminPath ? 'Sign In to Admin ERP' : 'Sign In to Resident Portal'}</span>
                    <i className="bi bi-arrow-right"></i>
                  </>
                )}
              </button>
            </form>

            {/* Register Prompt */}
            <div className="text-center small text-secondary pt-3 mt-2 border-top">
              Don't have an account yet?{' '}
              <Link to="/register" className="fw-bold text-decoration-none ms-1" style={{ color: '#F4510B' }}>
                Create an Account
              </Link>
            </div>

            {/* Encrypted Security Note */}
            <div className="text-center text-muted small mt-2 d-flex align-items-center justify-content-center gap-1.5" style={{ fontSize: '0.74rem' }}>
              <i className="bi bi-shield-check text-success"></i>
              <span>256-Bit SSL Encrypted & Protected Session</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
