import React, { useState, useEffect } from 'react';
import api from '../../services/api';

export default function AdminSettings() {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState('');

  const fetchSlots = async () => {
    try {
      const res = await api.get('/visits/slots');
      setSlots(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSlots();
  }, []);

  return (
    <div className="bg-white p-4 p-md-5 rounded-4 border shadow-sm">
      <div className="mb-4">
        <h4 className="fw-bold mb-1">System Settings & Appointment Slots</h4>
        <p className="text-secondary small mb-0">
          Configure physical appointment visiting slots, visitor quotas, and operational preferences.
        </p>
      </div>

      {success && <div className="alert alert-success border-0 small py-2 mb-3">{success}</div>}

      <div className="mb-5">
        <h6 className="fw-bold mb-3 text-dark">Active Visit Time Slots</h6>
        <div className="row g-3">
          {slots.map((s) => (
            <div key={s.id} className="col-sm-6 col-md-4">
              <div className="p-3 border rounded-3 bg-light d-flex justify-content-between align-items-center">
                <div>
                  <div className="fw-bold text-dark">{s.time_label}</div>
                  <div className="small text-muted">Max {s.max_capacity} appointments/day</div>
                </div>
                <span className="badge bg-success-subtle text-success border border-success-subtle">
                  Enabled
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="p-4 bg-light rounded-4 border">
        <h6 className="fw-bold mb-2">Hostel Database & Deployment Information</h6>
        <div className="row g-3 small text-secondary">
          <div className="col-md-6">
            <strong>Database Engine:</strong> PostgreSQL 18 / SQLAlchemy 2.0
          </div>
          <div className="col-md-6">
            <strong>API Framework:</strong> Python 3.9 / FastAPI REST
          </div>
          <div className="col-md-6">
            <strong>Frontend Stack:</strong> React 19, Vite, Bootstrap 5, Framer Motion, Three.js
          </div>
          <div className="col-md-6">
            <strong>Location:</strong> 3, Bhavani St, Bharathi Nagar, Velachery, Chennai
          </div>
        </div>
      </div>
    </div>
  );
}
