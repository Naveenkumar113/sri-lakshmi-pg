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

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirm_password) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters.');
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
    <div className="py-5 bg-light min-vh-100 d-flex align-items-center">
      <div className="container" style={{ maxWidth: '640px' }}>
        <div className="bg-white p-4 p-md-5 rounded-4 border shadow-sm">
          {/* Header */}
          <div className="text-center mb-4">
            <h3 className="fw-bold text-dark mb-1">Create Resident Account</h3>
            <p className="text-muted small mb-0">
              Register to schedule visits, reserve rooms, and view booking updates.
            </p>
          </div>

          {error && (
            <div className="alert alert-danger border-0 rounded-3 small py-2 px-3 mb-3 d-flex align-items-center gap-2">
              <i className="bi bi-exclamation-circle-fill"></i>
              <div>{error}</div>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label small fw-semibold">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Karthik Ramanathan"
                  className="form-control"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                />
              </div>

              <div className="col-md-6">
                <label className="form-label small fw-semibold">Mobile Number *</label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. +91 9876543210"
                  className="form-control"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>

              <div className="col-12">
                <label className="form-label small fw-semibold">Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  className="form-control"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <div className="col-md-6">
                <label className="form-label small fw-semibold">Password *</label>
                <input
                  type="password"
                  required
                  placeholder="At least 6 characters"
                  className="form-control"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
              </div>

              <div className="col-md-6">
                <label className="form-label small fw-semibold">Confirm Password *</label>
                <input
                  type="password"
                  required
                  placeholder="Re-type password"
                  className="form-control"
                  value={formData.confirm_password}
                  onChange={(e) => setFormData({ ...formData, confirm_password: e.target.value })}
                />
              </div>

              <div className="col-md-6">
                <label className="form-label small fw-semibold">Occupation</label>
                <input
                  type="text"
                  placeholder="e.g. Software Engineer / Student"
                  className="form-control"
                  value={formData.occupation}
                  onChange={(e) => setFormData({ ...formData, occupation: e.target.value })}
                />
              </div>

              <div className="col-md-6">
                <label className="form-label small fw-semibold">Company / College Name</label>
                <input
                  type="text"
                  placeholder="e.g. Ascendas / Anna University"
                  className="form-control"
                  value={formData.company_or_college}
                  onChange={(e) => setFormData({ ...formData, company_or_college: e.target.value })}
                />
              </div>

              <div className="col-md-6">
                <label className="form-label small fw-semibold">Emergency Contact Phone</label>
                <input
                  type="tel"
                  placeholder="e.g. Parent / Guardian Phone"
                  className="form-control"
                  value={formData.emergency_contact}
                  onChange={(e) => setFormData({ ...formData, emergency_contact: e.target.value })}
                />
              </div>

              <div className="col-md-6">
                <label className="form-label small fw-semibold">Native Address / City</label>
                <input
                  type="text"
                  placeholder="e.g. Trichy, Tamil Nadu"
                  className="form-control"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>

              <div className="col-12 pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-pg-primary w-100 py-2 fw-semibold"
                >
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                      Registering Account...
                    </>
                  ) : (
                    'Complete Registration'
                  )}
                </button>
              </div>
            </div>
          </form>

          <div className="text-center small text-secondary mt-4">
            Already have an account?{' '}
            <Link to="/login" className="fw-bold text-dark text-decoration-none">
              Sign In Here
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
