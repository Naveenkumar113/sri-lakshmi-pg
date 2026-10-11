import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export default function AdminProfile() {
  const { user, updateUser } = useAuth();

  const [profileData, setProfileData] = useState({
    full_name: user?.full_name || '',
    phone: user?.phone || '',
    emergency_contact: user?.emergency_contact || '',
    address: user?.address || '',
  });

  const [pwdData, setPwdData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });

  const [auditLogs, setAuditLogs] = useState([]);
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');
  const [pwdSuccess, setPwdSuccess] = useState('');
  const [pwdError, setPwdError] = useState('');

  useEffect(() => {
    const fetchAudit = async () => {
      try {
        const res = await api.get('/admin/audit-logs');
        setAuditLogs(res.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchAudit();
  }, []);

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileSuccess('');
    setProfileError('');
    try {
      const res = await api.put('/auth/me', profileData);
      updateUser(res.data);
      setProfileSuccess('Admin profile updated successfully.');
    } catch (err) {
      setProfileError('Failed to update admin profile.');
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

    try {
      await api.put('/auth/me/password', {
        current_password: pwdData.current_password,
        new_password: pwdData.new_password,
      });
      setPwdSuccess('Admin password changed successfully.');
      setPwdData({ current_password: '', new_password: '', confirm_password: '' });
    } catch (err) {
      setPwdError(err.response?.data?.detail || 'Current password incorrect.');
    }
  };

  return (
    <div className="d-flex flex-column gap-4">
      <div className="bg-white p-4 p-md-5 rounded-4 border shadow-sm">
        <h4 className="fw-bold mb-1">Estate Manager & Admin Profile</h4>
        <p className="text-secondary small mb-4">
          Credentials for managing Sri Lakshmi Srinivasa Gents PG.
        </p>

        {profileSuccess && <div className="alert alert-success border-0 small py-2 mb-3">{profileSuccess}</div>}
        {profileError && <div className="alert alert-danger border-0 small py-2 mb-3">{profileError}</div>}

        <form onSubmit={handleProfileSubmit}>
          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label small fw-semibold">Admin Name</label>
              <input
                type="text"
                required
                className="form-control"
                value={profileData.full_name}
                onChange={(e) => setProfileData({ ...profileData, full_name: e.target.value })}
              />
            </div>

            <div className="col-md-6">
              <label className="form-label small fw-semibold">Admin Email (Read-only)</label>
              <input type="email" readOnly className="form-control bg-light" value={user?.email || ''} />
            </div>

            <div className="col-md-6">
              <label className="form-label small fw-semibold">Official Phone Number</label>
              <input
                type="tel"
                required
                className="form-control"
                value={profileData.phone}
                onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
              />
            </div>

            <div className="col-md-6">
              <label className="form-label small fw-semibold">Office Address</label>
              <input
                type="text"
                className="form-control"
                value={profileData.address}
                onChange={(e) => setProfileData({ ...profileData, address: e.target.value })}
              />
            </div>

            <div className="col-12 pt-2">
              <button type="submit" className="btn btn-pg-primary fw-semibold">
                Save Admin Profile
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Password Change */}
      <div className="bg-white p-4 p-md-5 rounded-4 border shadow-sm">
        <h4 className="fw-bold mb-1">Change Admin Password</h4>
        <p className="text-secondary small mb-4">
          Ensure strong administrative security.
        </p>

        {pwdSuccess && <div className="alert alert-success border-0 small py-2 mb-3">{pwdSuccess}</div>}
        {pwdError && <div className="alert alert-danger border-0 small py-2 mb-3">{pwdError}</div>}

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
              <label className="form-label small fw-semibold">Confirm Password</label>
              <input
                type="password"
                required
                className="form-control"
                value={pwdData.confirm_password}
                onChange={(e) => setPwdData({ ...pwdData, confirm_password: e.target.value })}
              />
            </div>

            <div className="col-12 pt-2">
              <button type="submit" className="btn btn-outline-dark fw-semibold">
                Update Admin Password
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Security Audit Logs */}
      <div className="bg-white p-4 p-md-5 rounded-4 border shadow-sm">
        <h5 className="fw-bold mb-3">Security & Activity Audit Logs</h5>
        <div className="table-responsive">
          <table className="table table-sm align-middle small mb-0">
            <thead className="table-light">
              <tr>
                <th>Timestamp</th>
                <th>Actor</th>
                <th>Action</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.length === 0 ? (
                <tr>
                  <td colSpan="4" className="text-muted text-center py-3">No audit logs recorded yet.</td>
                </tr>
              ) : (
                auditLogs.map((log) => (
                  <tr key={log.id}>
                    <td>{new Date(log.created_at).toLocaleString('en-IN')}</td>
                    <td className="fw-semibold">{log.actor_email}</td>
                    <td><span className="badge bg-light text-dark border">{log.action}</span></td>
                    <td className="text-secondary">{log.details}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
