import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.phone || !/^\d{10}$/.test(formData.phone)) {
      setError('Please enter a valid 10-digit Indian mobile number (e.g. 9876543210).');
      return;
    }

    if (formData.password !== formData.confirm_password) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        full_name: formData.full_name,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        occupation: formData.occupation || null,
        company_or_college: formData.company_or_college || null,
        emergency_contact: formData.emergency_contact || null,
        address: formData.address || null,
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
      <div className="auth-split-card" style={{ maxWidth: '1140px' }}>
        {/* Left Section — Brand Experience */}
        <div
          className="auth-hero-panel"
          style={{
            backgroundImage: `url('/images/bedroom_double.png')`,
          }}
        >
          <div className="auth-hero-overlay"></div>

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

              <div className="pt-3">
                <span
                  className="badge px-3 py-1.5 rounded-pill mb-3 fw-semibold"
                  style={{
                    background: 'rgba(244, 81, 11, 0.25)',
                    color: '#FFEDD5',
                    border: '1px solid rgba(244, 81, 11, 0.4)',
                    fontSize: '0.78rem',
                  }}
                >
                  Join Our Community
                </span>
                <h2 className="fw-bold text-white mb-2 lh-sm" style={{ fontSize: '1.9rem' }}>
                  Live Better. <br />Work Smarter. <br /><span style={{ color: '#FDBA74' }}>Stay in Comfort.</span>
                </h2>
                <p className="text-white-50 small mb-4 lh-base" style={{ maxWidth: '360px' }}>
                  Create your resident account in under a minute to schedule property tours, reserve premium beds, and manage monthly rent transparently.
                </p>
              </div>
            </div>

            {/* 3 Benefit Highlights */}
            <div className="d-flex flex-column gap-2.5 my-2">
              <div className="auth-feature-pill">
                <div className="auth-feature-icon">
                  <i className="bi bi-calendar2-check-fill"></i>
                </div>
                <div>
                  <div className="fw-semibold small text-white">Instant Property Visits</div>
                  <div className="text-white-50" style={{ fontSize: '0.7rem' }}>Book convenient time slots with instant confirmation</div>
                </div>
              </div>

              <div className="auth-feature-pill">
                <div className="auth-feature-icon">
                  <i className="bi bi-wifi"></i>
                </div>
                <div>
                  <div className="fw-semibold small text-white">All-Inclusive Amenities</div>
                  <div className="text-white-50" style={{ fontSize: '0.7rem' }}>High-speed Wi-Fi, 3 times south/north food & laundry</div>
                </div>
              </div>

              <div className="auth-feature-pill">
                <div className="auth-feature-icon">
                  <i className="bi bi-clock-history"></i>
                </div>
                <div>
                  <div className="fw-semibold small text-white">Direct Owner Communication</div>
                  <div className="text-white-50" style={{ fontSize: '0.7rem' }}>Quick resolution for all resident maintenance queries</div>
                </div>
              </div>
            </div>

            {/* Footer location note */}
            <div className="pt-3 border-top border-white border-opacity-10 d-flex justify-content-between align-items-center text-white-50 small">
              <span style={{ fontSize: '0.75rem' }}>
                <i className="bi bi-geo-alt-fill text-danger me-1"></i> Velachery Main Rd, Chennai
              </span>
              <span className="badge bg-black bg-opacity-30 border border-white border-opacity-10 px-2 py-1 text-white-50" style={{ fontSize: '0.7rem' }}>
                Zero Brokerage
              </span>
            </div>
          </div>
        </div>

        {/* Right Section — Registration Form */}
        <div className="auth-form-panel" style={{ flex: 1.25 }}>
          {/* Mobile Branded Header (< 992px) */}
          <div className="auth-mobile-header text-center mb-3">
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

          {/* Form Title */}
          <div className="mb-3.5">
            <h3 className="fw-bold text-dark mb-1">Create Your Account</h3>
            <p className="text-secondary small mb-0">
              Get started with your Sri Lakshmi Srinivasa PG account.
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
              <div className="col-md-6 auth-input-group">
                <label className="form-label small fw-semibold text-dark mb-1">
                  Full Name <span className="text-danger">*</span>
                </label>
                <div className="position-relative">
                  <input
                    type="text"
                    required
                    placeholder="e.g. Karthik Ramanathan"
                    className="form-control ps-4"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  />
                  <i
                    className="bi bi-person text-muted position-absolute top-50 translate-middle-y ms-2.5"
                    style={{ pointerEvents: 'none' }}
                  ></i>
                </div>
              </div>

              {/* Mobile Number */}
              <div className="col-md-6 auth-input-group">
                <label className="form-label small fw-semibold text-dark mb-1">
                  Mobile Number <span className="text-danger">*</span>
                </label>
                <div className="position-relative">
                  <input
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    required
                    placeholder="10-digit mobile number"
                    className={`form-control ps-4 ${
                      formData.phone ? (formData.phone.length === 10 ? 'is-valid' : 'is-invalid') : ''
                    }`}
                    value={formData.phone}
                    onChange={(e) => {
                      const clean = e.target.value.replace(/\D/g, '').slice(0, 10);
                      setFormData({ ...formData, phone: clean });
                    }}
                  />
                  <i
                    className="bi bi-telephone text-muted position-absolute top-50 translate-middle-y ms-2.5"
                    style={{ pointerEvents: 'none' }}
                  ></i>
                </div>
              </div>

              {/* Email Address */}
              <div className="col-12 auth-input-group">
                <label className="form-label small fw-semibold text-dark mb-1">
                  Email Address <span className="text-danger">*</span>
                </label>
                <div className="position-relative">
                  <input
                    type="email"
                    required
                    placeholder="name@example.com"
                    className="form-control ps-4"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                  <i
                    className="bi bi-envelope text-muted position-absolute top-50 translate-middle-y ms-2.5"
                    style={{ pointerEvents: 'none' }}
                  ></i>
                </div>
              </div>

              {/* Password */}
              <div className="col-md-6 auth-input-group">
                <label className="form-label small fw-semibold text-dark mb-1">
                  Password <span className="text-danger">*</span>
                </label>
                <div className="position-relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="At least 6 characters"
                    className="form-control ps-4 pe-5"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
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
              </div>

              {/* Confirm Password */}
              <div className="col-md-6 auth-input-group">
                <label className="form-label small fw-semibold text-dark mb-1">
                  Confirm Password <span className="text-danger">*</span>
                </label>
                <div className="position-relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    placeholder="Re-enter password"
                    className="form-control ps-4 pe-5"
                    value={formData.confirm_password}
                    onChange={(e) => setFormData({ ...formData, confirm_password: e.target.value })}
                  />
                  <i
                    className="bi bi-lock-fill text-muted position-absolute top-50 translate-middle-y ms-2.5"
                    style={{ pointerEvents: 'none' }}
                  ></i>
                  <button
                    type="button"
                    className="btn btn-link text-muted position-absolute end-0 top-50 translate-middle-y pe-3 text-decoration-none"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    tabIndex={-1}
                    aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                    style={{ height: '48px', display: 'flex', alignItems: 'center' }}
                  >
                    <i className={`bi ${showConfirmPassword ? 'bi-eye-slash-fill' : 'bi-eye-fill'} fs-6`}></i>
                  </button>
                </div>
              </div>

              {/* Occupation */}
              <div className="col-md-6 auth-input-group">
                <label className="form-label small fw-semibold text-dark mb-1">
                  Occupation <span className="text-muted fw-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Software Engineer / Student"
                  className="form-control"
                  value={formData.occupation}
                  onChange={(e) => setFormData({ ...formData, occupation: e.target.value })}
                />
              </div>

              {/* Company / College */}
              <div className="col-md-6 auth-input-group">
                <label className="form-label small fw-semibold text-dark mb-1">
                  Company / College <span className="text-muted fw-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. IT Park / College"
                  className="form-control"
                  value={formData.company_or_college}
                  onChange={(e) => setFormData({ ...formData, company_or_college: e.target.value })}
                />
              </div>

              {/* Emergency Contact */}
              <div className="col-md-6 auth-input-group">
                <label className="form-label small fw-semibold text-dark mb-1">
                  Emergency Contact <span className="text-muted fw-normal">(Optional)</span>
                </label>
                <input
                  type="tel"
                  placeholder="Parent / Guardian phone"
                  className="form-control"
                  value={formData.emergency_contact}
                  onChange={(e) => setFormData({ ...formData, emergency_contact: e.target.value })}
                />
              </div>

              {/* Hometown Address */}
              <div className="col-md-6 auth-input-group">
                <label className="form-label small fw-semibold text-dark mb-1">
                  Native City / Address <span className="text-muted fw-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Coimbatore, Tamil Nadu"
                  className="form-control"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>

              {/* Submit Button */}
              <div className="col-12 pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="auth-btn-primary w-100"
                >
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                      Registering Account...
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
  );
}
