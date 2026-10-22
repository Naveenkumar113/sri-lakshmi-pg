import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

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
      errors.email = 'Please enter your email address or username.';
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
    <div className="py-5 bg-light min-vh-100 d-flex align-items-center">
      <div className="container" style={{ maxWidth: '440px' }}>
        <div className="bg-white p-4 p-md-5 rounded-4 border shadow-sm">
          {/* Logo */}
          <div className="text-center mb-4">
            <div
              className="d-inline-flex align-items-center justify-content-center text-white rounded-3 mb-2 shadow-sm"
              style={{
                width: '48px',
                height: '48px',
                background: 'linear-gradient(135deg, #EA580C 0%, #C2410C 100%)',
                fontWeight: 800,
                fontSize: '1.25rem',
              }}
            >
              SL
            </div>
            <h3 className="fw-bold text-dark mb-1">
              {isAdminPath ? 'Admin Portal Login' : 'Sign In'}
            </h3>
            <p className="text-muted small mb-0">
              Sri Lakshmi Srinivasa Gents PG • Velachery
            </p>
          </div>

          {error && (
            <div className="alert alert-danger border-0 rounded-3 small py-2 px-3 mb-3 d-flex align-items-center gap-2" role="alert">
              <i className="bi bi-exclamation-circle-fill flex-shrink-0"></i>
              <div>{error}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div className="mb-3">
              <label htmlFor="login-email" className="form-label small fw-semibold">
                Email Address
              </label>
              <input
                id="login-email"
                type="email"
                autoComplete="username"
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
              {validationErrors.email && (
                <div className="invalid-feedback d-block small mt-1">
                  {validationErrors.email}
                </div>
              )}
            </div>

            <div className="mb-3">
              <div className="d-flex justify-content-between align-items-center mb-1">
                <label htmlFor="login-password" className="form-label small fw-semibold mb-0">
                  Password
                </label>
                <Link to="/forgot-password" className="small text-decoration-none text-muted">
                  Forgot password?
                </Link>
              </div>
              <div className="input-group">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  className={`form-control ${validationErrors.password ? 'is-invalid' : ''}`}
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
                  className="btn btn-outline-secondary border-start-0"
                  style={{ borderColor: '#dee2e6' }}
                  onClick={() => setShowPassword((prev) => !prev)}
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  <i className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                </button>
              </div>
              {validationErrors.password && (
                <div className="invalid-feedback d-block small mt-1">
                  {validationErrors.password}
                </div>
              )}
            </div>

            <button
              id="login-submit-btn"
              type="submit"
              disabled={loading}
              className="btn btn-pg-primary w-100 py-2 fw-semibold mb-4"
            >
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Register Prompt */}
          <div className="text-center small text-secondary">
            Don't have an account yet?{' '}
            <Link to="/register" className="fw-bold text-dark text-decoration-none">
              Create an Account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

