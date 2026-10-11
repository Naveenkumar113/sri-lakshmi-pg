import React, { useState, useEffect } from 'react';
import api from '../../services/api';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const fetchUsers = async () => {
    try {
      const res = await api.get(`/admin/users${search ? `?search=${encodeURIComponent(search)}` : ''}`);
      setUsers(res.data);
    } catch (err) {
      console.error('Failed to load users', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [search]);

  const viewUserDetails = async (userId) => {
    setDetailsLoading(true);
    try {
      const res = await api.get(`/admin/users/${userId}`);
      setSelectedUser(res.data);
    } catch (err) {
      alert('Failed to load user details.');
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleToggleStatus = async (user) => {
    const newStatus = !user.is_active;
    if (!window.confirm(`Are you sure you want to ${newStatus ? 'activate' : 'deactivate'} account for ${user.full_name}?`)) return;

    try {
      await api.put(`/admin/users/${user.id}/status`, { is_active: newStatus });
      fetchUsers();
      if (selectedUser && selectedUser.id === user.id) {
        setSelectedUser({ ...selectedUser, is_active: newStatus });
      }
    } catch (err) {
      alert('Failed to update user status.');
    }
  };

  return (
    <div className="bg-white p-4 rounded-4 border shadow-sm">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div>
          <h4 className="fw-bold mb-1">Registered Users & Residents</h4>
          <p className="text-secondary small mb-0">
            View profiles, contact information, emergency contacts, and active visit/booking history.
          </p>
        </div>

        {/* Search Input */}
        <div style={{ maxWidth: '300px', width: '100%' }}>
          <div className="input-group input-group-sm">
            <span className="input-group-text bg-light border-end-0">
              <i className="bi bi-search"></i>
            </span>
            <input
              type="text"
              className="form-control bg-light border-start-0"
              placeholder="Search name, email, or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status"></div>
        </div>
      ) : users.length === 0 ? (
        <div className="text-center py-5 bg-light rounded-4 border">
          <i className="bi bi-people fs-1 text-muted"></i>
          <h6 className="fw-bold mt-2">No users found</h6>
        </div>
      ) : (
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light small">
              <tr>
                <th>Resident Name</th>
                <th>Contact Phone</th>
                <th>Occupation / College</th>
                <th>Visits</th>
                <th>Bookings</th>
                <th>Status</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody className="small">
              {users.map((u) => (
                <tr key={u.id}>
                  <td>
                    <div className="fw-bold text-dark">{u.full_name}</div>
                    <div className="text-muted" style={{ fontSize: '0.72rem' }}>{u.email}</div>
                  </td>
                  <td>
                    <a href={`tel:${u.phone}`} className="text-dark text-decoration-none fw-semibold">
                      {u.phone}
                    </a>
                  </td>
                  <td>{u.occupation || u.company_or_college || '-'}</td>
                  <td>
                    <span className="badge bg-light text-dark border">
                      {u.visits_count} Visits
                    </span>
                  </td>
                  <td>
                    <span className="badge bg-light text-dark border">
                      {u.bookings_count} Bookings
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${u.is_active ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger'}`}>
                      {u.is_active ? 'Active' : 'Deactivated'}
                    </span>
                  </td>
                  <td className="text-end">
                    <div className="d-flex justify-content-end gap-1">
                      <button
                        onClick={() => viewUserDetails(u.id)}
                        className="btn btn-sm btn-outline-primary py-1 px-2"
                        title="View Full Profile & History"
                      >
                        <i className="bi bi-eye"></i> Details
                      </button>
                      <button
                        onClick={() => handleToggleStatus(u)}
                        className={`btn btn-sm ${u.is_active ? 'btn-outline-danger' : 'btn-outline-success'} py-1 px-2`}
                        title={u.is_active ? 'Deactivate Account' : 'Activate Account'}
                      >
                        <i className={`bi bi-${u.is_active ? 'person-x' : 'person-check'}`}></i>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* User Details Modal */}
      {selectedUser && (
        <div
          className="modal fade show d-block"
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', zIndex: 1060 }}
          tabIndex="-1"
        >
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
              <div className="modal-header bg-light border-0 py-3">
                <h5 className="modal-title fw-bold">Resident File: {selectedUser.full_name}</h5>
                <button type="button" className="btn-close" onClick={() => setSelectedUser(null)}></button>
              </div>

              <div className="modal-body p-4">
                <div className="row g-3 mb-4">
                  <div className="col-sm-6">
                    <div className="p-3 bg-light rounded-3">
                      <div className="small text-muted">Email Address</div>
                      <div className="fw-bold">{selectedUser.email}</div>
                    </div>
                  </div>
                  <div className="col-sm-6">
                    <div className="p-3 bg-light rounded-3">
                      <div className="small text-muted">Primary Phone</div>
                      <div className="fw-bold">{selectedUser.phone}</div>
                    </div>
                  </div>
                  <div className="col-sm-6">
                    <div className="p-3 bg-light rounded-3">
                      <div className="small text-muted">Occupation</div>
                      <div>{selectedUser.occupation || '-'}</div>
                    </div>
                  </div>
                  <div className="col-sm-6">
                    <div className="p-3 bg-light rounded-3">
                      <div className="small text-muted">Company / College</div>
                      <div>{selectedUser.company_or_college || '-'}</div>
                    </div>
                  </div>
                  <div className="col-sm-6">
                    <div className="p-3 bg-light rounded-3">
                      <div className="small text-muted">Emergency Contact Phone</div>
                      <div className="fw-bold text-danger">{selectedUser.emergency_contact || '-'}</div>
                    </div>
                  </div>
                  <div className="col-sm-6">
                    <div className="p-3 bg-light rounded-3">
                      <div className="small text-muted">Registered Date</div>
                      <div>{new Date(selectedUser.created_at).toLocaleDateString('en-IN')}</div>
                    </div>
                  </div>
                  <div className="col-12">
                    <div className="p-3 bg-light rounded-3">
                      <div className="small text-muted">Native / Home Address</div>
                      <div>{selectedUser.address || '-'}</div>
                    </div>
                  </div>
                </div>

                {/* Visit History */}
                <h6 className="fw-bold mb-2">Visit History ({selectedUser.visits?.length || 0})</h6>
                <div className="table-responsive mb-4">
                  <table className="table table-sm align-middle small mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Date</th>
                        <th>Time</th>
                        <th>Purpose</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedUser.visits?.map((v) => (
                        <tr key={v.id}>
                          <td>{v.date}</td>
                          <td>{v.time}</td>
                          <td>{v.purpose}</td>
                          <td>
                            <span className={`status-pill status-${v.status.toLowerCase()}`}>
                              {v.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Booking History */}
                <h6 className="fw-bold mb-2">Booking History ({selectedUser.bookings?.length || 0})</h6>
                <div className="table-responsive">
                  <table className="table table-sm align-middle small mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Room Category</th>
                        <th>Cooling</th>
                        <th>Joining Date</th>
                        <th>Bed</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedUser.bookings?.map((b) => (
                        <tr key={b.id}>
                          <td>{b.room_type}</td>
                          <td>{b.is_ac ? 'AC' : 'Non-AC'}</td>
                          <td>{b.joining_date}</td>
                          <td className="fw-bold">{b.allocated_bed || '-'}</td>
                          <td>
                            <span className={`status-pill status-${b.status.toLowerCase()}`}>
                              {b.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="modal-footer border-0 bg-light py-2">
                <button type="button" className="btn btn-sm btn-dark" onClick={() => setSelectedUser(null)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
