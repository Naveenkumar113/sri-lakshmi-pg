import React, { useState, useEffect } from 'react';
import api from '../../services/api';

export default function AdminBookings() {
  const [bookings, setBookings] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('ALL');

  // Modal states
  const [activeBooking, setActiveBooking] = useState(null);
  const [modalMode, setModalMode] = useState(null); // 'APPROVE' | 'REJECT'
  const [actionForm, setActionForm] = useState({
    room_id: '',
    bed_id: '',
    allocated_bed: '',
    admin_notes: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      let bookList = [];
      let roomList = [];

      try {
        const bookRes = await api.get('/admin/bookings');
        bookList = Array.isArray(bookRes.data) ? bookRes.data : [];
      } catch (err) {
        console.warn('GET /admin/bookings failed:', err);
      }

      try {
        const roomRes = await api.get('/admin/rooms');
        roomList = Array.isArray(roomRes.data) ? roomRes.data : [];
      } catch (err) {
        try {
          const pubRes = await api.get('/rooms');
          roomList = Array.isArray(pubRes.data) ? pubRes.data : [];
        } catch (pubErr) {
          console.error('Failed to load rooms fallback in bookings:', pubErr);
        }
      }

      setBookings(bookList);
      setRooms(roomList);
    } catch (err) {
      console.error('Failed to load admin bookings', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openModal = (booking, mode) => {
    setActiveBooking(booking);
    setModalMode(mode);

    // Find best matching room
    const matchingRoom = rooms.find((r) => r.id === booking.room_id) ||
      rooms.find((r) => r.is_ac === booking.is_ac && r.available_beds > 0 && r.status !== 'MAINTENANCE') ||
      rooms.find((r) => r.available_beds > 0 && r.status !== 'MAINTENANCE') ||
      rooms[0];

    const freeBed = matchingRoom?.beds?.find((b) => !b.is_occupied && b.bed_status !== 'MAINTENANCE');

    setActionForm({
      room_id: matchingRoom?.id || '',
      bed_id: freeBed?.id || '',
      allocated_bed: freeBed?.bed_number || '',
      admin_notes: mode === 'APPROVE' ? 'Room allocated. Welcome to Sri Lakshmi Srinivasa PG!' : '',
    });
  };

  const closeModal = () => {
    setActiveBooking(null);
    setModalMode(null);
  };

  const handleActionSubmit = async (e) => {
    e.preventDefault();
    if (!activeBooking) return;
    setSubmitting(true);

    try {
      if (modalMode === 'APPROVE') {
        await api.put(`/admin/bookings/${activeBooking.id}/approve`, {
          room_id: actionForm.room_id || null,
          bed_id: actionForm.bed_id || null,
          allocated_bed: actionForm.allocated_bed || null,
          admin_notes: actionForm.admin_notes,
        });
      } else {
        await api.put(`/admin/bookings/${activeBooking.id}/reject`, {
          admin_notes: actionForm.admin_notes,
        });
      }
      closeModal();
      fetchData();
    } catch (err) {
      alert(err.response?.data?.detail || 'Error processing booking request.');
    } finally {
      setSubmitting(false);
    }
  };


  const filtered = bookings.filter((b) => {
    if (filterStatus === 'ALL') return true;
    return b.status === filterStatus;
  });

  return (
    <div className="bg-white p-4 rounded-4 border shadow-sm">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div>
          <h4 className="fw-bold mb-1">Room Booking & Bed Allocation</h4>
          <p className="text-secondary small mb-0">
            Review applicant profiles, perform real-time room availability verification, and assign beds.
          </p>
        </div>

        {/* Filter buttons */}
        <div className="d-flex flex-wrap gap-2">
          {['ALL', 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'].map((st) => (
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
          <i className="bi bi-door-closed fs-1 text-muted"></i>
          <h6 className="fw-bold mt-2">No bookings matching this status</h6>
        </div>
      ) : (
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light small">
              <tr>
                <th>Applicant</th>
                <th>Contact</th>
                <th>Category</th>
                <th>Cooling</th>
                <th>Joining Date</th>
                <th>Allocated Room / Bed</th>
                <th>Status</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody className="small">
              {filtered.map((b) => (
                <tr key={b.id}>
                  <td>
                    <div className="fw-bold text-dark">{b.user?.full_name || 'Resident'}</div>
                    <div className="text-muted" style={{ fontSize: '0.72rem' }}>
                      {b.user?.occupation || 'Applicant'} • {b.user?.email}
                    </div>
                  </td>
                  <td>{b.user?.phone || '-'}</td>
                  <td>{b.room_type.replace('_', ' ')}</td>
                  <td>
                    <span className={`badge ${b.is_ac ? 'bg-primary' : 'bg-secondary'}`}>
                      {b.is_ac ? 'AC' : 'Non-AC'}
                    </span>
                  </td>
                  <td>{b.preferred_joining_date} ({b.stay_duration_months}m)</td>
                  <td>
                    {b.allocated_bed ? (
                      <span className="text-success fw-bold">
                        Room {b.room?.room_number || ''} • Bed {b.allocated_bed}
                      </span>
                    ) : (
                      <span className="text-muted fst-italic">Pending allocation</span>
                    )}
                  </td>
                  <td>
                    <span className={`status-pill status-${b.status.toLowerCase()}`}>
                      {b.status}
                    </span>
                  </td>
                  <td className="text-end">
                    <div className="d-flex justify-content-end gap-1">
                      {b.status !== 'APPROVED' && (
                        <button
                          onClick={() => openModal(b, 'APPROVE')}
                          className="btn btn-sm btn-success py-1 px-2"
                          title="Verify Availability & Approve"
                        >
                          <i className="bi bi-check-circle"></i> Approve & Allocate
                        </button>
                      )}
                      {b.status !== 'REJECTED' && (
                        <button
                          onClick={() => openModal(b, 'REJECT')}
                          className="btn btn-sm btn-outline-danger py-1 px-2"
                          title="Reject Request"
                        >
                          <i className="bi bi-x-circle"></i> Reject
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

      {/* Modal for Approve / Reject */}
      {modalMode && activeBooking && (
        <div
          className="modal fade show d-block"
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', zIndex: 1060 }}
          tabIndex="-1"
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
              <div className="modal-header bg-light border-0 py-3">
                <h5 className="modal-title fw-bold">
                  {modalMode === 'APPROVE' ? 'Verify & Approve Room Allocation' : 'Reject Booking Request'}
                </h5>
                <button type="button" className="btn-close" onClick={closeModal}></button>
              </div>

              <form onSubmit={handleActionSubmit}>
                <div className="modal-body p-4">
                  <div className="p-3 bg-light rounded-3 mb-3 small">
                    <strong>Applicant:</strong> {activeBooking.user?.full_name} ({activeBooking.user?.phone})<br />
                    <strong>Category:</strong> {activeBooking.room_type} ({activeBooking.is_ac ? 'AC' : 'Non-AC'})<br />
                    <strong>Joining Date:</strong> {activeBooking.preferred_joining_date}
                  </div>

                  {modalMode === 'APPROVE' && (
                    <>
                      <div className="mb-3">
                        <label className="form-label small fw-semibold">Select Room *</label>
                        <select
                          className="form-select"
                          required
                          value={actionForm.room_id}
                          onChange={(e) => {
                            const newRoomId = e.target.value;
                            const r = rooms.find((rm) => rm.id === newRoomId);
                            const firstFree = r?.beds?.find((b) => !b.is_occupied && b.bed_status !== 'MAINTENANCE');
                            setActionForm({
                              ...actionForm,
                              room_id: newRoomId,
                              bed_id: firstFree?.id || '',
                              allocated_bed: firstFree?.bed_number || '',
                            });
                          }}
                        >
                          <option value="">-- Choose Available Room --</option>
                          {rooms
                            .filter((rm) => rm.available_beds > 0 && rm.status !== 'MAINTENANCE')
                            .map((rm) => (
                              <option key={rm.id} value={rm.id}>
                                Room {rm.room_number} • {rm.sharing_type} ({rm.is_ac ? 'AC' : 'Non-AC'}) • {rm.available_beds} beds free
                              </option>
                            ))}
                        </select>
                      </div>

                      <div className="mb-3">
                        <label className="form-label small fw-semibold">Select Available Bed *</label>
                        <select
                          className="form-select"
                          required
                          value={actionForm.bed_id}
                          disabled={!actionForm.room_id}
                          onChange={(e) => {
                            const selectedBedId = e.target.value;
                            const r = rooms.find((rm) => rm.id === actionForm.room_id);
                            const bObj = r?.beds?.find((b) => b.id === selectedBedId);
                            setActionForm({
                              ...actionForm,
                              bed_id: selectedBedId,
                              allocated_bed: bObj?.bed_number || '',
                            });
                          }}
                        >
                          <option value="">-- Choose Free Bed --</option>
                          {rooms
                            .find((rm) => rm.id === actionForm.room_id)
                            ?.beds?.filter((b) => !b.is_occupied && b.bed_status !== 'MAINTENANCE')
                            .map((b) => (
                              <option key={b.id} value={b.id}>
                                {b.bed_number} (Free)
                              </option>
                            ))}
                        </select>
                        <div className="p-2 bg-success-subtle text-success rounded-3 small mt-2" style={{ fontSize: '0.74rem' }}>
                          <i className="bi bi-shield-check me-1"></i>
                          Approving will link this user to a resident profile, automatically generate a unique Resident ID (e.g. SLPG-XXXX), allocate the bed, and increment occupied beds.
                        </div>
                      </div>
                    </>
                  )}

                  <div className="mb-2">
                    <label className="form-label small fw-semibold">
                      {modalMode === 'REJECT' ? 'Reason for Rejection *' : 'Manager Note to Resident'}
                    </label>
                    <textarea
                      rows="3"
                      required={modalMode === 'REJECT'}
                      className="form-control"
                      placeholder={
                        modalMode === 'REJECT'
                          ? 'e.g. Sorry, this room is no longer available.'
                          : 'e.g. Please bring original Aadhaar copy and 1 passport photo.'
                      }
                      value={actionForm.admin_notes}
                      onChange={(e) => setActionForm({ ...actionForm, admin_notes: e.target.value })}
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
                    {submitting ? 'Verifying...' : `Confirm ${modalMode}`}
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
