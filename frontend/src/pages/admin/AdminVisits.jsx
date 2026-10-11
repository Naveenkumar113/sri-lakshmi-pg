import React, { useState, useEffect } from 'react';
import api from '../../services/api';

export default function AdminVisits() {
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('ALL');

  // Modal action states
  const [activeVisit, setActiveVisit] = useState(null);
  const [modalMode, setModalMode] = useState(null); // 'APPROVE' | 'REJECT' | 'RESCHEDULE'
  const [actionForm, setActionForm] = useState({
    date: '',
    time: '',
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchVisits = async () => {
    try {
      const res = await api.get('/admin/visits');
      setVisits(res.data);
    } catch (err) {
      console.error('Failed to load admin visits', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVisits();
  }, []);

  const openActionModal = (visit, mode) => {
    setActiveVisit(visit);
    setModalMode(mode);
    setActionForm({
      date: visit.confirmed_date || visit.preferred_date,
      time: visit.confirmed_time || visit.preferred_time,
      notes: visit.admin_notes || (mode === 'APPROVE' ? 'Slot confirmed. Please visit 3 Bhavani St.' : ''),
    });
  };

  const closeModal = () => {
    setActiveVisit(null);
    setModalMode(null);
  };

  const handleActionSubmit = async (e) => {
    e.preventDefault();
    if (!activeVisit) return;
    setSubmitting(true);

    try {
      if (modalMode === 'APPROVE') {
        await api.put(`/admin/visits/${activeVisit.id}/approve`, {
          confirmed_date: actionForm.date,
          confirmed_time: actionForm.time,
          admin_notes: actionForm.notes,
        });
      } else if (modalMode === 'REJECT') {
        await api.put(`/admin/visits/${activeVisit.id}/reject`, {
          admin_notes: actionForm.notes,
        });
      } else if (modalMode === 'RESCHEDULE') {
        await api.put(`/admin/visits/${activeVisit.id}/reschedule`, {
          rescheduled_date: actionForm.date,
          rescheduled_time: actionForm.time,
          admin_notes: actionForm.notes,
        });
      }
      closeModal();
      fetchVisits();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to process visit request.');
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = visits.filter((v) => {
    if (filterStatus === 'ALL') return true;
    return v.status === filterStatus;
  });

  return (
    <div className="bg-white p-4 rounded-4 border shadow-sm">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div>
          <h4 className="fw-bold mb-1">PG Visit Appointments Management</h4>
          <p className="text-secondary small mb-0">
            Review, approve, reschedule, or cancel visitor appointments.
          </p>
        </div>

        {/* Status Filters */}
        <div className="d-flex flex-wrap gap-2">
          {['ALL', 'PENDING', 'APPROVED', 'RESCHEDULED', 'REJECTED'].map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`btn btn-sm ${filterStatus === st ? 'btn-dark fw-bold' : 'btn-outline-secondary'}`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status"></div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-5 bg-light rounded-4 border">
          <i className="bi bi-calendar-x fs-1 text-muted"></i>
          <h6 className="fw-bold mt-2">No visits match this status</h6>
        </div>
      ) : (
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light small">
              <tr>
                <th>Visitor Name</th>
                <th>Contact Phone</th>
                <th>Requested Date & Time</th>
                <th>Purpose</th>
                <th>Confirmed Schedule</th>
                <th>Status</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody className="small">
              {filtered.map((v) => (
                <tr key={v.id}>
                  <td>
                    <div className="fw-bold text-dark">{v.full_name}</div>
                    <div className="text-muted" style={{ fontSize: '0.72rem' }}>{v.email}</div>
                  </td>
                  <td>
                    <a href={`tel:${v.phone}`} className="text-decoration-none fw-semibold text-dark">
                      {v.phone}
                    </a>
                  </td>
                  <td>
                    <div className="fw-semibold">{v.preferred_date}</div>
                    <div className="text-muted" style={{ fontSize: '0.72rem' }}>{v.preferred_time}</div>
                  </td>
                  <td>
                    {v.purpose} ({v.number_of_visitors}p)
                  </td>
                  <td>
                    {v.confirmed_date ? (
                      <span className="text-success fw-bold">
                        {v.confirmed_date} @ {v.confirmed_time}
                      </span>
                    ) : (
                      <span className="text-muted">-</span>
                    )}
                  </td>
                  <td>
                    <span className={`status-pill status-${v.status.toLowerCase()}`}>
                      {v.status}
                    </span>
                  </td>
                  <td className="text-end">
                    <div className="d-flex justify-content-end gap-1">
                      {v.status !== 'APPROVED' && (
                        <button
                          onClick={() => openActionModal(v, 'APPROVE')}
                          className="btn btn-sm btn-success py-1 px-2"
                          title="Approve Visit"
                        >
                          <i className="bi bi-check-lg"></i> Approve
                        </button>
                      )}
                      <button
                        onClick={() => openActionModal(v, 'RESCHEDULE')}
                        className="btn btn-sm btn-outline-primary py-1 px-2"
                        title="Reschedule Visit"
                      >
                        <i className="bi bi-calendar-range"></i> Reschedule
                      </button>
                      {v.status !== 'REJECTED' && (
                        <button
                          onClick={() => openActionModal(v, 'REJECT')}
                          className="btn btn-sm btn-outline-danger py-1 px-2"
                          title="Reject Visit"
                        >
                          <i className="bi bi-x-lg"></i> Reject
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Action Modal (Approve / Reject / Reschedule) */}
      {modalMode && activeVisit && (
        <div
          className="modal fade show d-block"
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', zIndex: 1060 }}
          tabIndex="-1"
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
              <div className="modal-header bg-light border-0 py-3">
                <h5 className="modal-title fw-bold">
                  {modalMode === 'APPROVE' && 'Approve Visit Request'}
                  {modalMode === 'REJECT' && 'Reject Visit Request'}
                  {modalMode === 'RESCHEDULE' && 'Reschedule Visit Slot'}
                </h5>
                <button type="button" className="btn-close" onClick={closeModal}></button>
              </div>

              <form onSubmit={handleActionSubmit}>
                <div className="modal-body p-4">
                  <div className="p-3 bg-light rounded-3 mb-3 small">
                    <strong>Visitor:</strong> {activeVisit.full_name} ({activeVisit.phone})<br />
                    <strong>Originally Requested:</strong> {activeVisit.preferred_date} at {activeVisit.preferred_time}
                  </div>

                  {(modalMode === 'APPROVE' || modalMode === 'RESCHEDULE') && (
                    <div className="row g-3 mb-3">
                      <div className="col-6">
                        <label className="form-label small fw-semibold">Confirmed Date *</label>
                        <input
                          type="date"
                          required
                          className="form-control"
                          value={actionForm.date}
                          onChange={(e) => setActionForm({ ...actionForm, date: e.target.value })}
                        />
                      </div>
                      <div className="col-6">
                        <label className="form-label small fw-semibold">Confirmed Slot *</label>
                        <input
                          type="text"
                          required
                          className="form-control"
                          value={actionForm.time}
                          onChange={(e) => setActionForm({ ...actionForm, time: e.target.value })}
                        />
                      </div>
                    </div>
                  )}

                  <div className="mb-2">
                    <label className="form-label small fw-semibold">
                      {modalMode === 'REJECT' ? 'Reason for Rejection *' : 'Admin Note to User (Optional)'}
                    </label>
                    <textarea
                      rows="3"
                      required={modalMode === 'REJECT'}
                      className="form-control"
                      placeholder={
                        modalMode === 'REJECT'
                          ? 'Explain reason (e.g. Full booking on that day / Maintenance)'
                          : 'e.g. Please bring college/corporate ID proof when visiting.'
                      }
                      value={actionForm.notes}
                      onChange={(e) => setActionForm({ ...actionForm, notes: e.target.value })}
                    ></textarea>
                  </div>
                </div>

                <div className="modal-footer border-0 bg-light py-2">
                  <button type="button" className="btn btn-sm btn-secondary" onClick={closeModal}>
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className={`btn btn-sm ${
                      modalMode === 'REJECT' ? 'btn-danger' : 'btn-success'
                    } fw-semibold`}
                  >
                    {submitting ? 'Updating...' : `Confirm ${modalMode}`}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
