import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/auth/forgot-password', { email });
      setMessage(res.data.message);
      setSubmitted(true);
    } catch (err) {
      setMessage('Password reset instructions generated.');
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="py-5 bg-light min-vh-100 d-flex align-items-center">
      <div className="container" style={{ maxWidth: '460px' }}>
        <div className="bg-white p-4 p-md-5 rounded-4 border shadow-sm text-center">
          <div
            className="d-inline-flex align-items-center justify-content-center text-primary rounded-circle mb-3 bg-light border"
            style={{ width: '56px', height: '56px' }}
          >
            <i className="bi bi-key-fill fs-3 text-warning"></i>
          </div>

          <h3 className="fw-bold text-dark mb-1">Reset Password</h3>
          <p className="text-muted small mb-4">
            Enter your registered email address to receive password reset assistance.
          </p>

          {submitted ? (
            <div>
              <div className="alert alert-success border-0 small py-3 px-3 mb-4 text-start">
                <i className="bi bi-check-circle-fill me-2"></i>
                {message}
              </div>
              <Link to="/login" className="btn btn-pg-primary w-100 py-2 fw-semibold">
                Back to Sign In
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="text-start">
              <div className="mb-3">
                <label className="form-label small fw-semibold">Registered Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  className="form-control"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn btn-pg-primary w-100 py-2 fw-semibold mb-3"
              >
                {loading ? 'Sending Request...' : 'Send Reset Instructions'}
              </button>

              <div className="text-center small">
                <Link to="/login" className="text-muted text-decoration-none">
                  <i className="bi bi-arrow-left me-1"></i> Back to Login
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
