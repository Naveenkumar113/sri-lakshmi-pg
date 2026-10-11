import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const returnUrl = location.state?.returnUrl || null;
  const isAdminPath = location.pathname.includes('/admin');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const loggedUser = await login(email, password);
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

  const handleDemoLogin = (role) => {
    if (role === 'admin') {
      setEmail('admin@srilakshmipg.com');
      setPassword('Admin@PG2026!');
    } else {
      setEmail('karthik.r@example.com');
      setPassword('User@PG2026!');
    }
  };

  return (
    <div className="py-5 bg-light min-vh-100 d-flex align-items-center">
      <div className="container" style={{ maxWidth: '480px' }}>
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
            <div className="alert alert-danger border-0 rounded-3 small py-2 px-3 mb-3 d-flex align-items-center gap-2">
              <i className="bi bi-exclamation-circle-fill"></i>
              <div>{error}</div>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label small fw-semibold">Email Address</label>
              <input
                type="email"
                required
                className="form-control"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="mb-3">
              <div className="d-flex justify-content-between align-items-center">
                <label className="form-label small fw-semibold mb-0">Password</label>
                <Link to="/forgot-password" className="small text-decoration-none text-muted">
                  Forgot password?
                </Link>
              </div>
              <input
                type="password"
                required
                className="form-control mt-1"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-pg-primary w-100 py-2 fw-semibold mb-3"
            >
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Demo Login Shortcuts */}
          <div className="p-3 bg-light rounded-3 border mb-3">
            <div className="small fw-bold text-dark mb-2 text-center">
              Quick Demo Fill
            </div>
            <div className="d-flex gap-2">
              <button
                type="button"
                onClick={() => handleDemoLogin('user')}
                className="btn btn-sm btn-outline-secondary flex-fill"
              >
                Resident User
              </button>
              <button
                type="button"
                onClick={() => handleDemoLogin('admin')}
                className="btn btn-sm btn-outline-primary flex-fill"
              >
                PG Admin
              </button>
            </div>
          </div>

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
