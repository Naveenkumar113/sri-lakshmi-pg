import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';

export default function MyVisits() {
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState('');

  const fetchVisits = async () => {
    try {
      const res = await api.get('/visits/my');
      setVisits(res.data);
    } catch (err) {
      console.error('Failed to load visits', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVisits();
  }, []);

  const handleCancel = async (visitId) => {
    if (!window.confirm('Are you sure you want to cancel this visit appointment?')) return;
    try {
      await api.put(`/visits/${visitId}/cancel`);
      setActionMsg('Visit request cancelled successfully.');
      fetchVisits();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to cancel visit.');
    }
  };

  return (
    <div className="bg-white p-4 p-md-5 rounded-4 border shadow-sm">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div>
          <h3 className="fw-bold mb-1">My Visit Appointments</h3>
          <p className="text-secondary small mb-0">
            Track your scheduled visits to Sri Lakshmi Srinivasa Gents PG in Velachery.
          </p>
        </div>

        <Link to="/visit-request" className="btn btn-sm btn-pg-primary fw-semibold">
          <i className="bi bi-calendar2-plus me-1"></i> Schedule Another Visit
        </Link>
      </div>

      {actionMsg && (
        <div className="alert alert-info border-0 rounded-3 small py-2 mb-3">
          {actionMsg}
        </div>
      )}

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status"></div>
          <p className="small text-muted mt-2">Loading visits...</p>
        </div>
      ) : visits.length === 0 ? (
        <div className="text-center py-5 bg-light rounded-4 border">
          <i className="bi bi-calendar-x fs-1 text-muted"></i>
          <h5 className="fw-bold mt-2">No visits scheduled yet</h5>
          <p className="text-muted small">You haven't requested any PG visits yet.</p>
          <Link to="/visit-request" className="btn btn-sm btn-pg-primary">
            Schedule a Visit
          </Link>
        </div>
      ) : (
        <>
          {/* Mobile Cards View (< md screens) */}
          <div className="d-md-none d-flex flex-column gap-2.5">
            {visits.map((v) => (
              <div key={v.id} className="p-3 bg-white rounded-3 border shadow-xs">
                <div className="d-flex justify-content-between align-items-start mb-2">
                  <div>
                    <div className="fw-bold text-dark fs-6">
                      <i className="bi bi-calendar-event me-1.5 text-primary"></i>
                      {v.preferred_date}
                    </div>
                    <div className="text-muted small" style={{ fontSize: '0.75rem' }}>
                      <i className="bi bi-clock me-1"></i> {v.preferred_time}
                    </div>
                  </div>
                  <div>
                    <span className={`status-pill status-${v.status.toLowerCase()}`}>
                      {v.status}
                    </span>
                  </div>
                </div>

                <div className="p-2 bg-light rounded-2 border mb-2 small text-secondary">
                  <div className="d-flex justify-content-between mb-1">
                    <span className="text-muted">Purpose:</span>
                    <span className="fw-semibold text-dark">{v.purpose}</span>
                  </div>
                  <div className="d-flex justify-content-between">
                    <span className="text-muted">Visitors:</span>
                    <span className="fw-semibold text-dark">{v.number_of_visitors} Person(s)</span>
                  </div>
                </div>

                {v.confirmed_date ? (
                  <div className="p-2 bg-success bg-opacity-10 border border-success-subtle rounded-2 text-success small mb-2">
                    <div className="fw-bold mb-0.5">
                      <i className="bi bi-check-circle-fill me-1"></i> Confirmed Slot:
                    </div>
                    <div className="fw-semibold">{v.confirmed_date} at {v.confirmed_time}</div>
                  </div>
                ) : (
                  <div className="p-2 bg-light border rounded-2 text-muted small fst-italic mb-2" style={{ fontSize: '0.72rem' }}>
                    <i className="bi bi-hourglass-split me-1"></i> Manager review pending
                  </div>
                )}

                {v.admin_notes && (
                  <div className="small text-muted mb-2 p-2 bg-light rounded-2 border" style={{ fontSize: '0.72rem' }}>
                    <span className="fw-semibold text-dark">Manager Note:</span> {v.admin_notes}
                  </div>
                )}

                <div className="d-flex gap-2 mt-2 pt-1 border-top">
                  {v.status === 'PENDING' && (
                    <button
                      onClick={() => handleCancel(v.id)}
                      className="btn btn-sm btn-outline-danger w-100 py-1.5"
                      style={{ fontSize: '0.8rem' }}
                    >
                      <i className="bi bi-x-circle me-1"></i> Cancel Request
                    </button>
                  )}
                  {v.status === 'APPROVED' && (
                    <a
                      href="https://maps.google.com/?q=Sri+Lakshmi+Srinivasa+Gents+PG+Velachery+Chennai"
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-sm btn-outline-success w-100 py-1.5"
                      style={{ fontSize: '0.8rem' }}
                    >
                      <i className="bi bi-geo-alt me-1"></i> Get Directions
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table View (>= md screens) */}
          <div className="table-responsive d-none d-md-block">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light small">
                <tr>
                  <th>Date & Time</th>
                  <th>Purpose</th>
                  <th>Visitors</th>
                  <th>Confirmed Schedule</th>
                  <th>Manager Note</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody className="small">
                {visits.map((v) => (
                  <tr key={v.id}>
                    <td>
                      <div className="fw-bold text-dark">{v.preferred_date}</div>
                      <div className="text-muted" style={{ fontSize: '0.75rem' }}>{v.preferred_time}</div>
                    </td>
                    <td>{v.purpose}</td>
                    <td>{v.number_of_visitors} Person(s)</td>
                    <td>
                      {v.confirmed_date ? (
                        <div className="p-2 bg-success bg-opacity-10 rounded text-success fw-bold">
                          <i className="bi bi-calendar-check me-1"></i>
                          {v.confirmed_date} at {v.confirmed_time}
                        </div>
                      ) : (
                        <span className="text-muted fst-italic">Pending manager review</span>
                      )}
                    </td>
                    <td style={{ maxWidth: '180px' }}>
                      {v.admin_notes ? (
                        <span className="small text-secondary">{v.admin_notes}</span>
                      ) : (
                        <span className="text-muted">-</span>
                      )}
                    </td>
                    <td>
                      <span className={`status-pill status-${v.status.toLowerCase()}`}>
                        {v.status}
                      </span>
                    </td>
                    <td>
                      {v.status === 'PENDING' && (
                        <button
                          onClick={() => handleCancel(v.id)}
                          className="btn btn-sm btn-outline-danger"
                          title="Cancel Request"
                        >
                          Cancel
                        </button>
                      )}
                      {v.status === 'APPROVED' && (
                        <a
                          href="https://maps.google.com/?q=Sri+Lakshmi+Srinivasa+Gents+PG+Velachery+Chennai"
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-sm btn-outline-success"
                        >
                          <i className="bi bi-geo-alt"></i> Route
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
