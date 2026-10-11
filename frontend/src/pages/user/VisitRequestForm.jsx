import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import confetti from 'canvas-confetti';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export default function VisitRequestForm() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [slots, setSlots] = useState([]);
  const [formData, setFormData] = useState({
    preferred_date: new Date(Date.now() + 86400000).toISOString().split('T')[0], // Tomorrow default
    preferred_time: '10:00 AM',
    purpose: 'Room Inspection',
    number_of_visitors: 1,
    message: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const fetchSlots = async () => {
      try {
        const res = await api.get('/visits/slots');
        setSlots(res.data);
        if (res.data.length > 0 && !formData.preferred_time) {
          setFormData((prev) => ({ ...prev, preferred_time: res.data[0].time_label }));
        }
      } catch (err) {
        console.error('Failed to load slots', err);
      }
    };
    fetchSlots();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await api.post('/visits', formData);
      setSuccess(true);
      confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
      setTimeout(() => {
        navigate('/my-visits');
      }, 1800);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to submit visit request. Please select a different slot or date.');
    } finally {
      setLoading(false);
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="bg-white p-4 p-md-5 rounded-4 border shadow-sm">
      <div className="mb-4">
        <span className="pill-badge pill-badge-accent mb-2">Schedule An Appointment</span>
        <h3 className="fw-bold mb-1">Book Your PG Visit</h3>
        <p className="text-secondary small mb-0">
          Visit 3, Bhavani St, Bharathi Nagar, Velachery to view available beds, room interiors, and amenities.
        </p>
      </div>

      {success && (
        <div className="alert alert-success border-0 rounded-3 mb-4 d-flex align-items-center gap-2">
          <i className="bi bi-check-circle-fill fs-4"></i>
          <div>
            <strong>Visit request submitted successfully!</strong> Status is PENDING admin review. Redirecting to your visits...
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
            <label className="form-label small fw-semibold">Visitor Name</label>
            <input type="text" readOnly className="form-control bg-light" value={user?.full_name || ''} />
          </div>

          <div className="col-md-4">
            <label className="form-label small fw-semibold">Contact Phone</label>
            <input type="text" readOnly className="form-control bg-light" value={user?.phone || ''} />
          </div>

          <div className="col-md-4">
            <label className="form-label small fw-semibold">Email Address</label>
            <input type="text" readOnly className="form-control bg-light" value={user?.email || ''} />
          </div>

          {/* Appointment Date */}
          <div className="col-md-6">
            <label className="form-label small fw-semibold">Preferred Visit Date *</label>
            <input
              type="date"
              required
              min={todayStr}
              className="form-control"
              value={formData.preferred_date}
              onChange={(e) => setFormData({ ...formData, preferred_date: e.target.value })}
            />
            <div className="text-muted small mt-1" style={{ fontSize: '0.72rem' }}>
              Select today or any upcoming date.
            </div>
          </div>

          {/* Appointment Slot */}
          <div className="col-md-6">
            <label className="form-label small fw-semibold">Preferred Time Slot *</label>
            <select
              required
              className="form-select"
              value={formData.preferred_time}
              onChange={(e) => setFormData({ ...formData, preferred_time: e.target.value })}
            >
              {slots.length > 0 ? (
                slots.map((s) => (
                  <option key={s.id} value={s.time_label}>
                    {s.time_label}
                  </option>
                ))
              ) : (
                <>
                  <option value="09:00 AM">09:00 AM</option>
                  <option value="10:00 AM">10:00 AM</option>
                  <option value="11:00 AM">11:00 AM</option>
                  <option value="12:00 PM">12:00 PM</option>
                  <option value="02:00 PM">02:00 PM</option>
                  <option value="03:00 PM">03:00 PM</option>
                  <option value="04:00 PM">04:00 PM</option>
                  <option value="05:00 PM">05:00 PM</option>
                  <option value="06:00 PM">06:00 PM</option>
                </>
              )}
            </select>
            <div className="text-muted small mt-1" style={{ fontSize: '0.72rem' }}>
              Slots are capped to avoid congestion.
            </div>
          </div>

          {/* Purpose */}
          <div className="col-md-6">
            <label className="form-label small fw-semibold">Purpose of Visit</label>
            <select
              className="form-select"
              value={formData.purpose}
              onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
            >
              <option value="Room Inspection">Room Inspection (Check AC/Non-AC Beds)</option>
              <option value="Admission Inquiry">Admission Inquiry & On-spot Joining</option>
              <option value="Meeting Management">Meeting Management / Rules Query</option>
              <option value="Price & Facility Query">Price & Facility Query</option>
            </select>
          </div>

          {/* Number of Visitors */}
          <div className="col-md-6">
            <label className="form-label small fw-semibold">Number of Visitors</label>
            <select
              className="form-select"
              value={formData.number_of_visitors}
              onChange={(e) => setFormData({ ...formData, number_of_visitors: parseInt(e.target.value) })}
            >
              <option value="1">1 Person (Self)</option>
              <option value="2">2 Persons (With Parent / Friend)</option>
              <option value="3">3 Persons (Family / Colleagues)</option>
            </select>
          </div>

          {/* Additional Message */}
          <div className="col-12">
            <label className="form-label small fw-semibold">Additional Message / Inquiries (Optional)</label>
            <textarea
              rows="3"
              placeholder="e.g. Interested in double sharing AC room, visiting after work around 6 PM."
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
                  <i className="bi bi-calendar2-check-fill me-1"></i> Submit Visit Appointment Request
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
