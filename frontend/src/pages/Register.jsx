import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCardTilt } from '../hooks/useCardTilt';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const returnUrl = location.state?.returnUrl || null;

  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    password: '',
    confirm_password: '',
    occupation: '',
    company_or_college: '',
    emergency_contact: '',
    address: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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

  const validateForm = () => {
    const errors = {};
    if (!formData.full_name.trim()) {
      errors.full_name = 'Please enter your full name.';
    }
    if (!formData.email.trim()) {
      errors.email = 'Please enter your email address.';
    }
    if (!formData.phone || !/^\d{10}$/.test(formData.phone)) {
      errors.phone = 'Please enter a valid 10-digit Indian mobile number (e.g. 9876543210).';
    }
    if (!formData.password) {
      errors.password = 'Please enter a password.';
    } else if (formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters long.';
    }
    if (formData.password !== formData.confirm_password) {
      errors.confirm_password = 'Passwords do not match. Please re-enter.';
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
      const payload = {
        full_name: formData.full_name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        password: formData.password,
        occupation: formData.occupation.trim() || null,
        company_or_college: formData.company_or_college.trim() || null,
        emergency_contact: formData.emergency_contact.trim() || null,
        address: formData.address.trim() || null,
      };

      await register(payload);
      if (returnUrl) {
        navigate(returnUrl);
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed. Please check your information.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page-wrapper">
      <div className="auth-card-tilt-container">
        <div
          ref={cardRef}
          className="auth-split-card auth-split-card-register"
          style={transformStyle ? { transform: transformStyle } : undefined}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          {/* Top 3D brand accent bar */}
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

          {/* Left Hero Section — PG Community & Living Experience (Desktop) */}
          <div
            className="auth-hero-panel"
            style={{
              backgroundImage: `url('/images/pg_exterior_main.jpg')`,
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
                    Join Our Resident Community
                  </span>
                  <h2 className="fw-bold text-white mb-2 lh-sm" style={{ fontSize: '2.1rem' }}>
                    Live Better. <br />Work Smarter. <br />
                    <span style={{ color: '#FDBA74' }}>Stay in Comfort.</span>
                  </h2>
                  <p className="text-white-50 small mb-0 lh-base" style={{ maxWidth: '370px' }}>
                    Create your resident account in under a minute to schedule property tours, reserve premium rooms, and manage monthly rent transparently.
                  </p>
                </div>
              </div>

              {/* 3 Benefit Highlights */}
              <div className="d-flex flex-column gap-2.5 my-3">
                <div className="auth-amenity-pill">
                  <div className="auth-amenity-icon">
                    <i className="bi bi-calendar2-check-fill"></i>
                  </div>
                  <div>
                    <div className="fw-semibold small text-white">Instant Property Tours</div>
                    <div className="text-white-50" style={{ fontSize: '0.72rem' }}>
                      Schedule room visits with real-time confirmation & directions
                    </div>
                  </div>
                </div>

                <div className="auth-amenity-pill">
                  <div className="auth-amenity-icon">
                    <i className="bi bi-wifi"></i>
                  </div>
                  <div>
                    <div className="fw-semibold small text-white">All-Inclusive Living</div>
                    <div className="text-white-50" style={{ fontSize: '0.72rem' }}>
                      High-speed internet, 3 times south/north food & laundry
                    </div>
                  </div>
                </div>

                <div className="auth-amenity-pill">
                  <div className="auth-amenity-icon">
                    <i className="bi bi-headset"></i>
                  </div>
                  <div>
                    <div className="fw-semibold small text-white">Direct Management Support</div>
                    <div className="text-white-50" style={{ fontSize: '0.72rem' }}>
                      Instant digital receipts & quick maintenance resolution
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer location note */}
              <div className="pt-3 border-top border-white border-opacity-10 d-flex justify-content-between align-items-center text-white-50 small">
                <span style={{ fontSize: '0.78rem' }}>
                  <i className="bi bi-geo-alt-fill text-danger me-1"></i> Velachery Main Rd, Chennai
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

          {/* Right Section — Registration Form */}
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
                  <i className="bi bi-check-circle-fill"></i> Instant Registration
                </span>
                <span className="auth-trust-chip">
                  <i className="bi bi-shield-check"></i> Zero Brokerage
                </span>
              </div>
            </div>

            {/* Form Title */}
            <div className="mb-3">
              <h3 className="fw-bold text-dark mb-1" style={{ fontSize: '1.45rem', letterSpacing: '-0.02em' }}>
                Create Your Resident Account
              </h3>
              <p className="text-secondary small mb-0 lh-sm">
                Join our comfortable, verified co-living community in Velachery.
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
              <div className="row g-2.5">
                {/* Full Name */}
                <div className="col-12 col-md-6 auth-input-group">
                  <label htmlFor="reg-name">
                    <span>
                      Full Name <span className="text-danger">*</span>
                    </span>
                  </label>
                  <div className="auth-input-wrapper">
                    <i className="bi bi-person auth-input-icon"></i>
                    <input
                      id="reg-name"
                      type="text"
                      required
                      placeholder="e.g. Karthik Ramanathan"
                      className={`form-control ${validationErrors.full_name ? 'is-invalid' : ''}`}
                      value={formData.full_name}
                      onChange={(e) => {
                        setFormData({ ...formData, full_name: e.target.value });
                        if (validationErrors.full_name) {
                          setValidationErrors((prev) => ({ ...prev, full_name: '' }));
                        }
                      }}
                    />
                  </div>
                  {validationErrors.full_name && (
                    <div className="invalid-feedback d-block small mt-1" role="alert">
                      {validationErrors.full_name}
                    </div>
                  )}
                </div>

                {/* Mobile Number */}
                <div className="col-12 col-md-6 auth-input-group">
                  <label htmlFor="reg-phone">
                    <span>
                      Mobile Number <span className="text-danger">*</span>
                    </span>
                  </label>
                  <div className="auth-input-wrapper">
                    <i className="bi bi-telephone auth-input-icon"></i>
                    <input
                      id="reg-phone"
                      type="tel"
                      inputMode="numeric"
                      maxLength={10}
                      required
                      placeholder="10-digit mobile number"
                      className={`form-control ${
                        validationErrors.phone
                          ? 'is-invalid'
                          : formData.phone.length === 10
                          ? 'is-valid'
                          : ''
                      }`}
                      value={formData.phone}
                      onChange={(e) => {
                        const clean = e.target.value.replace(/\D/g, '').slice(0, 10);
                        setFormData({ ...formData, phone: clean });
                        if (validationErrors.phone) {
                          setValidationErrors((prev) => ({ ...prev, phone: '' }));
                        }
                      }}
                    />
                  </div>
                  {validationErrors.phone && (
                    <div className="invalid-feedback d-block small mt-1" role="alert">
                      {validationErrors.phone}
                    </div>
                  )}
                </div>

                {/* Email Address */}
                <div className="col-12 auth-input-group">
                  <label htmlFor="reg-email">
                    <span>
                      Email Address <span className="text-danger">*</span>
                    </span>
                  </label>
                  <div className="auth-input-wrapper">
                    <i className="bi bi-envelope auth-input-icon"></i>
                    <input
                      id="reg-email"
                      type="email"
                      autoComplete="email"
                      required
                      placeholder="name@example.com"
                      className={`form-control ${validationErrors.email ? 'is-invalid' : ''}`}
                      value={formData.email}
                      onChange={(e) => {
                        setFormData({ ...formData, email: e.target.value });
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

                {/* Password */}
                <div className="col-12 col-md-6 auth-input-group">
                  <label htmlFor="reg-password">
                    <span>
                      Password <span className="text-danger">*</span>
                    </span>
                  </label>
                  <div className="auth-input-wrapper">
                    <i className="bi bi-lock auth-input-icon"></i>
                    <input
                      id="reg-password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      required
                      placeholder="At least 6 characters"
                      className={`form-control has-toggle ${validationErrors.password ? 'is-invalid' : ''}`}
                      value={formData.password}
                      onChange={(e) => {
                        setFormData({ ...formData, password: e.target.value });
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

                {/* Confirm Password */}
                <div className="col-12 col-md-6 auth-input-group">
                  <label htmlFor="reg-confirm-password">
                    <span>
                      Confirm Password <span className="text-danger">*</span>
                    </span>
                  </label>
                  <div className="auth-input-wrapper">
                    <i className="bi bi-shield-lock auth-input-icon"></i>
                    <input
                      id="reg-confirm-password"
                      type={showConfirmPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      required
                      placeholder="Re-enter password"
                      className={`form-control has-toggle ${
                        validationErrors.confirm_password
                          ? 'is-invalid'
                          : formData.confirm_password && formData.confirm_password === formData.password
                          ? 'is-valid'
                          : ''
                      }`}
                      value={formData.confirm_password}
                      onChange={(e) => {
                        setFormData({ ...formData, confirm_password: e.target.value });
                        if (validationErrors.confirm_password) {
                          setValidationErrors((prev) => ({ ...prev, confirm_password: '' }));
                        }
                      }}
                    />
                    <button
                      type="button"
                      className="auth-password-toggle"
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                      aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                    >
                      <i className={`bi ${showConfirmPassword ? 'bi-eye-slash-fill' : 'bi-eye-fill'} fs-6`}></i>
                    </button>
                  </div>
                  {validationErrors.confirm_password && (
                    <div className="invalid-feedback d-block small mt-1" role="alert">
                      {validationErrors.confirm_password}
                    </div>
                  )}
                </div>

                {/* Optional PG Stay Information Divider */}
                <div className="col-12 my-1">
                  <div className="d-flex align-items-center gap-2">
                    <span
                      className="badge bg-light text-secondary border px-2 py-1 fw-semibold"
                      style={{ fontSize: '0.72rem' }}
                    >
                      Profile & Stay Details (Optional)
                    </span>
                    <hr className="flex-grow-1 my-0 opacity-25" />
                  </div>
                </div>

                {/* Occupation */}
                <div className="col-12 col-md-6 auth-input-group">
                  <label htmlFor="reg-occupation">
                    <span>Occupation</span>
                    <span className="text-muted fw-normal" style={{ fontSize: '0.75rem' }}>Optional</span>
                  </label>
                  <div className="auth-input-wrapper">
                    <i className="bi bi-briefcase auth-input-icon"></i>
                    <input
                      id="reg-occupation"
                      type="text"
                      placeholder="e.g. Software Engineer / Student"
                      className="form-control"
                      value={formData.occupation}
                      onChange={(e) => setFormData({ ...formData, occupation: e.target.value })}
                    />
                  </div>
                </div>

                {/* Company / College */}
                <div className="col-12 col-md-6 auth-input-group">
                  <label htmlFor="reg-company">
                    <span>Company / College</span>
                    <span className="text-muted fw-normal" style={{ fontSize: '0.75rem' }}>Optional</span>
                  </label>
                  <div className="auth-input-wrapper">
                    <i className="bi bi-building auth-input-icon"></i>
                    <input
                      id="reg-company"
                      type="text"
                      placeholder="e.g. IT Park / University"
                      className="form-control"
                      value={formData.company_or_college}
                      onChange={(e) => setFormData({ ...formData, company_or_college: e.target.value })}
                    />
                  </div>
                </div>

                {/* Emergency Contact */}
                <div className="col-12 col-md-6 auth-input-group">
                  <label htmlFor="reg-emergency">
                    <span>Emergency Contact</span>
                    <span className="text-muted fw-normal" style={{ fontSize: '0.75rem' }}>Optional</span>
                  </label>
                  <div className="auth-input-wrapper">
                    <i className="bi bi-telephone-plus auth-input-icon"></i>
                    <input
                      id="reg-emergency"
                      type="tel"
                      placeholder="Parent / Guardian phone"
                      className="form-control"
                      value={formData.emergency_contact}
                      onChange={(e) => setFormData({ ...formData, emergency_contact: e.target.value })}
                    />
                  </div>
                </div>

                {/* Hometown Address */}
                <div className="col-12 col-md-6 auth-input-group">
                  <label htmlFor="reg-address">
                    <span>Native City / Address</span>
                    <span className="text-muted fw-normal" style={{ fontSize: '0.75rem' }}>Optional</span>
                  </label>
                  <div className="auth-input-wrapper">
                    <i className="bi bi-geo-alt auth-input-icon"></i>
                    <input
                      id="reg-address"
                      type="text"
                      placeholder="e.g. Coimbatore, Tamil Nadu"
                      className="form-control"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    />
                  </div>
                </div>

                {/* Submit Button */}
                <div className="col-12 pt-2">
                  <button
                    id="register-submit-btn"
                    type="submit"
                    disabled={loading}
                    className="auth-btn-primary w-100"
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                        <span>Registering Resident Account...</span>
                      </>
                    ) : (
                      <>
                        <span>Complete Registration</span>
                        <i className="bi bi-arrow-right"></i>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>

            {/* Login prompt */}
            <div className="text-center small text-secondary mt-3 pt-2 border-top">
              Already have an account?{' '}
              <Link to="/login" className="fw-bold text-decoration-none ms-1" style={{ color: '#F4510B' }}>
                Sign In Here
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
