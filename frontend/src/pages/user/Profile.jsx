import React, { useState } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export default function Profile() {
  const { user, updateUser } = useAuth();

  const [profileData, setProfileData] = useState({
    full_name: user?.full_name || '',
    phone: user?.phone || '',
    occupation: user?.occupation || '',
    company_or_college: user?.company_or_college || '',
    emergency_contact: user?.emergency_contact || '',
    address: user?.address || '',
  });

  const [pwdData, setPwdData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });

  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');

  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdSuccess, setPwdSuccess] = useState('');
  const [pwdError, setPwdError] = useState('');

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileLoading(true);
    setProfileSuccess('');
    setProfileError('');

    try {
      const res = await api.put('/auth/me', profileData);
      updateUser(res.data);
      setProfileSuccess('Profile updated successfully.');
    } catch (err) {
      setProfileError(err.response?.data?.detail || 'Failed to update profile.');
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPwdSuccess('');
    setPwdError('');

    if (pwdData.new_password !== pwdData.confirm_password) {
      setPwdError('New passwords do not match.');
      return;
    }

    setPwdLoading(true);

    try {
      await api.put('/auth/me/password', {
        current_password: pwdData.current_password,
        new_password: pwdData.new_password,
      });
      setPwdSuccess('Password changed successfully.');
      setPwdData({ current_password: '', new_password: '', confirm_password: '' });
    } catch (err) {
      setPwdError(err.response?.data?.detail || 'Failed to change password. Please check your current password.');
    } finally {
      setPwdLoading(false);
    }
  };

  return (
    <div className="d-flex flex-column gap-4">
      {/* Profile Details Form */}
      <div className="bg-white p-4 p-md-5 rounded-4 border shadow-sm">
        <h4 className="fw-bold mb-1">My Personal Profile</h4>
        <p className="text-secondary small mb-4">
          Manage your contact information, emergency phone, and workplace details.
        </p>

        {profileSuccess && (
          <div className="alert alert-success border-0 small py-2 mb-3">
            <i className="bi bi-check-circle-fill me-2"></i>{profileSuccess}
          </div>
        )}

        {profileError && (
          <div className="alert alert-danger border-0 small py-2 mb-3">
            <i className="bi bi-exclamation-circle-fill me-2"></i>{profileError}
          </div>
        )}

        <form onSubmit={handleProfileSubmit}>
          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label small fw-semibold">Full Name</label>
              <input
                type="text"
                required
                className="form-control"
                value={profileData.full_name}
                onChange={(e) => setProfileData({ ...profileData, full_name: e.target.value })}
              />
            </div>

            <div className="col-md-6">
              <label className="form-label small fw-semibold">Registered Email (Read-only)</label>
              <input
                type="email"
                readOnly
                className="form-control bg-light"
                value={user?.email || ''}
              />
            </div>

            <div className="col-md-6">
              <label className="form-label small fw-semibold">Mobile Number</label>
              <input
                type="tel"
                required
                className="form-control"
                value={profileData.phone}
                onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
              />
            </div>

            <div className="col-md-6">
              <label className="form-label small fw-semibold">Occupation</label>
              <input
                type="text"
                placeholder="e.g. Software Engineer / Student"
                className="form-control"
                value={profileData.occupation}
                onChange={(e) => setProfileData({ ...profileData, occupation: e.target.value })}
              />
            </div>

            <div className="col-md-6">
              <label className="form-label small fw-semibold">Company / College</label>
              <input
                type="text"
                placeholder="e.g. Ascendas IT Park"
                className="form-control"
                value={profileData.company_or_college}
                onChange={(e) => setProfileData({ ...profileData, company_or_college: e.target.value })}
              />
            </div>

            <div className="col-md-6">
              <label className="form-label small fw-semibold">Emergency Contact Phone</label>
              <input
                type="tel"
                placeholder="e.g. Father / Brother phone"
                className="form-control"
                value={profileData.emergency_contact}
                onChange={(e) => setProfileData({ ...profileData, emergency_contact: e.target.value })}
              />
            </div>

            <div className="col-12">
              <label className="form-label small fw-semibold">Permanent Address</label>
              <textarea
                rows="2"
                className="form-control"
                value={profileData.address}
                onChange={(e) => setProfileData({ ...profileData, address: e.target.value })}
              ></textarea>
            </div>

            <div className="col-12 pt-2">
              <button
                type="submit"
                disabled={profileLoading}
                className="btn btn-pg-primary fw-semibold"
              >
                {profileLoading ? 'Saving...' : 'Save Profile Changes'}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Change Password */}
      <div className="bg-white p-4 p-md-5 rounded-4 border shadow-sm">
        <h4 className="fw-bold mb-1">Security & Password</h4>
        <p className="text-secondary small mb-4">
          Update your login password. Current password is required for security verification.
        </p>

        {pwdSuccess && (
          <div className="alert alert-success border-0 small py-2 mb-3">
            <i className="bi bi-check-circle-fill me-2"></i>{pwdSuccess}
          </div>
        )}

        {pwdError && (
          <div className="alert alert-danger border-0 small py-2 mb-3">
            <i className="bi bi-exclamation-circle-fill me-2"></i>{pwdError}
          </div>
        )}

        <form onSubmit={handlePasswordSubmit}>
          <div className="row g-3">
            <div className="col-md-4">
              <label className="form-label small fw-semibold">Current Password</label>
              <input
                type="password"
                required
                className="form-control"
                value={pwdData.current_password}
                onChange={(e) => setPwdData({ ...pwdData, current_password: e.target.value })}
              />
            </div>

            <div className="col-md-4">
              <label className="form-label small fw-semibold">New Password</label>
              <input
                type="password"
                required
                placeholder="At least 6 characters"
                className="form-control"
                value={pwdData.new_password}
                onChange={(e) => setPwdData({ ...pwdData, new_password: e.target.value })}
              />
            </div>

            <div className="col-md-4">
              <label className="form-label small fw-semibold">Confirm New Password</label>
              <input
                type="password"
                required
                className="form-control"
                value={pwdData.confirm_password}
                onChange={(e) => setPwdData({ ...pwdData, confirm_password: e.target.value })}
              />
            </div>

            <div className="col-12 pt-2">
              <button
                type="submit"
                disabled={pwdLoading}
                className="btn btn-outline-dark fw-semibold"
              >
                {pwdLoading ? 'Updating Password...' : 'Update Password'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
