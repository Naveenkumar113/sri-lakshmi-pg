import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import confetti from 'canvas-confetti';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export default function BookRoomForm() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const preselectedRoomId = location.state?.selectedRoomId || '';
  const preselectedType = location.state?.roomType || 'DOUBLE';
  const preselectedAc = location.state?.isAc ?? false;

  const [rooms, setRooms] = useState([]);
  const [formData, setFormData] = useState({
    room_id: preselectedRoomId,
    room_type: preselectedType,
    is_ac: preselectedAc,
    preferred_joining_date: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
    stay_duration_months: 3,
    message: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const res = await api.get('/rooms');
        setRooms(res.data);
      } catch (err) {
        console.error('Failed to load rooms', err);
      }
    };
    fetchRooms();
  }, []);

  const handleRoomSelect = (roomId) => {
    const found = rooms.find((r) => r.id === roomId);
    if (found) {
      setFormData((prev) => ({
        ...prev,
        room_id: found.id,
        room_type: found.room_type,
        is_ac: found.is_ac,
      }));
    } else {
      setFormData((prev) => ({ ...prev, room_id: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await api.post('/bookings', formData);
      setSuccess(true);
      confetti({ particleCount: 75, spread: 70, origin: { y: 0.6 } });
      setTimeout(() => {
        navigate('/my-bookings');
      }, 1800);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to submit room booking request. Please check room availability.');
    } finally {
      setLoading(false);
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="bg-white p-4 p-md-5 rounded-4 border shadow-sm">
      <div className="mb-4">
        <span className="pill-badge pill-badge-accent mb-2">Room Reservation</span>
        <h3 className="fw-bold mb-1">Request a Room Booking</h3>
        <p className="text-secondary small mb-0">
          Submit your room reservation request. The management will verify bed availability and confirm your allocation.
        </p>
      </div>

      {success && (
        <div className="alert alert-success border-0 rounded-3 mb-4 d-flex align-items-center gap-2">
          <i className="bi bi-check-circle-fill fs-4"></i>
          <div>
            <strong>Booking request submitted!</strong> Status is PENDING admin verification. Redirecting to your bookings...
          </div>
        </div>
      )}

      {error && (
        <div className="alert alert-danger border-0 rounded-3 mb-4 d-flex align-items-center gap-2">
          <i className="bi bi-exclamation-triangle-fill fs-4"></i>
          <div>{error}</div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="row g-3">
          {/* Readonly User Info */}
          <div className="col-md-4">
            <label className="form-label small fw-semibold">Applicant Name</label>
            <input type="text" readOnly className="form-control bg-light" value={user?.full_name || ''} />
          </div>

          <div className="col-md-4">
            <label className="form-label small fw-semibold">Phone Number</label>
            <input type="text" readOnly className="form-control bg-light" value={user?.phone || ''} />
          </div>

          <div className="col-md-4">
            <label className="form-label small fw-semibold">Email Address</label>
            <input type="text" readOnly className="form-control bg-light" value={user?.email || ''} />
          </div>

          {/* Select Specific Room (Optional) */}
          <div className="col-md-6">
            <label className="form-label small fw-semibold">Select Specific Room (Optional)</label>
            <select
              className="form-select"
              value={formData.room_id}
              onChange={(e) => handleRoomSelect(e.target.value)}
            >
              <option value="">-- Any Available Room Matching Preferences --</option>
              {rooms.map((r) => (
                <option key={r.id} value={r.id} disabled={r.available_beds <= 0}>
                  Room {r.room_number} ({r.room_type.replace('_', ' ')} - {r.is_ac ? 'AC' : 'Non-AC'}) • {r.available_beds} beds free
                </option>
              ))}
            </select>
          </div>

          {/* Sharing Preference */}
          <div className="col-md-3">
            <label className="form-label small fw-semibold">Sharing Category *</label>
            <select
              required
              className="form-select"
              value={formData.room_type}
              onChange={(e) => setFormData({ ...formData, room_type: e.target.value })}
            >
              <option value="SINGLE">Single Occupancy</option>
              <option value="DOUBLE">Double Sharing</option>
              <option value="TRIPLE">Triple Sharing</option>
              <option value="FOUR_SHARING">4-Sharing</option>
            </select>
          </div>

          {/* AC Preference */}
          <div className="col-md-3">
            <label className="form-label small fw-semibold">Cooling Option *</label>
            <select
              required
              className="form-select"
              value={formData.is_ac ? 'true' : 'false'}
              onChange={(e) => setFormData({ ...formData, is_ac: e.target.value === 'true' })}
            >
              <option value="false">Non-AC (Ventilated)</option>
              <option value="true">Air Conditioned (AC)</option>
            </select>
          </div>

          {/* Preferred Joining Date */}
          <div className="col-md-6">
            <label className="form-label small fw-semibold">Expected Joining Date *</label>
            <input
              type="date"
              required
              min={todayStr}
              className="form-control"
              value={formData.preferred_joining_date}
              onChange={(e) => setFormData({ ...formData, preferred_joining_date: e.target.value })}
            />
          </div>

          {/* Stay Duration */}
          <div className="col-md-6">
            <label className="form-label small fw-semibold">Intended Duration of Stay</label>
            <select
              className="form-select"
              value={formData.stay_duration_months}
              onChange={(e) => setFormData({ ...formData, stay_duration_months: parseInt(e.target.value) })}
            >
              <option value="1">1 Month</option>
              <option value="3">3 Months (Standard)</option>
              <option value="6">6 Months</option>
              <option value="12">12 Months (Long Term)</option>
            </select>
          </div>

          {/* Message / Requirements */}
          <div className="col-12">
            <label className="form-label small fw-semibold">Specific Requirements / Notes</label>
            <textarea
              rows="3"
              placeholder="e.g. Need bed near window, two-wheeler parking space required, joining after 5 PM."
              className="form-control"
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
            ></textarea>
          </div>

          <div className="col-12 pt-3">
            <button
              type="submit"
              disabled={loading}
              className="btn btn-pg-primary w-100 py-2 fw-semibold"
            >
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                  Submitting Request...
                </>
              ) : (
                <>
                  <i className="bi bi-key-fill me-1"></i> Submit Room Booking Request
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
