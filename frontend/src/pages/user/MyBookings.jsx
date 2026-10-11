import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';

export default function MyBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState('');

  const fetchBookings = async () => {
    try {
      const res = await api.get('/bookings/my');
      setBookings(res.data);
    } catch (err) {
      console.error('Failed to load bookings', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const handleCancel = async (bookingId) => {
    if (!window.confirm('Are you sure you want to cancel this room booking request?')) return;
    try {
      await api.put(`/bookings/${bookingId}/cancel`);
      setActionMsg('Booking request cancelled successfully.');
      fetchBookings();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to cancel booking.');
    }
  };

  return (
    <div className="bg-white p-4 p-md-5 rounded-4 border shadow-sm">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div>
          <h3 className="fw-bold mb-1">My Room Bookings</h3>
          <p className="text-secondary small mb-0">
            View the status of your room reservation and allocated bed numbers.
          </p>
        </div>

        <Link to="/book-room" className="btn btn-sm btn-pg-primary fw-semibold">
          <i className="bi bi-key-fill me-1"></i> Request Another Room
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
          <p className="small text-muted mt-2">Loading bookings...</p>
        </div>
      ) : bookings.length === 0 ? (
        <div className="text-center py-5 bg-light rounded-4 border">
          <i className="bi bi-door-closed fs-1 text-muted"></i>
          <h5 className="fw-bold mt-2">No active bookings</h5>
          <p className="text-muted small">You haven't submitted any room booking requests yet.</p>
          <Link to="/book-room" className="btn btn-sm btn-pg-primary">
            Book a Room Now
          </Link>
        </div>
      ) : (
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light small">
              <tr>
                <th>Category</th>
                <th>Cooling</th>
                <th>Joining Date</th>
                <th>Duration</th>
                <th>Allocated Room / Bed</th>
                <th>Manager Note</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody className="small">
              {bookings.map((b) => (
                <tr key={b.id}>
                  <td className="fw-semibold">
                    {b.room_type.replace('_', ' ')} Sharing
                  </td>
                  <td>
                    <span className={`badge ${b.is_ac ? 'bg-primary' : 'bg-secondary'}`}>
                      {b.is_ac ? 'AC' : 'Non-AC'}
                    </span>
                  </td>
                  <td>{b.preferred_joining_date}</td>
                  <td>{b.stay_duration_months} Month(s)</td>
                  <td>
                    {b.allocated_bed ? (
                      <div className="p-2 bg-success bg-opacity-10 rounded text-success fw-bold">
                        <i className="bi bi-check-circle me-1"></i>
                        Bed {b.allocated_bed}
                      </div>
                    ) : (
                      <span className="text-muted fst-italic">Pending bed allocation</span>
                    )}
                  </td>
                  <td style={{ maxWidth: '200px' }}>
                    {b.admin_notes ? (
                      <span className="small text-secondary">{b.admin_notes}</span>
                    ) : (
                      <span className="text-muted">-</span>
                    )}
                  </td>
                  <td>
                    <span className={`status-pill status-${b.status.toLowerCase()}`}>
                      {b.status}
                    </span>
                  </td>
                  <td>
                    {b.status === 'PENDING' && (
                      <button
                        onClick={() => handleCancel(b.id)}
                        className="btn btn-sm btn-outline-danger"
                      >
                        Cancel
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
