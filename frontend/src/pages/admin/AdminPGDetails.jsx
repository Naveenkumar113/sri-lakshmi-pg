import React, { useState, useEffect } from 'react';
import api from '../../services/api';

export default function AdminPGDetails() {
  const [formData, setFormData] = useState({
    name: '',
    tagline: '',
    address: '',
    phone: '',
    alt_phone: '',
    email: '',
    opening_hours: '',
    google_rating: '',
    about_text: '',
    rules_text: '',
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const res = await api.get('/pg-details');
        setFormData(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSuccess('');

    try {
      await api.put('/admin/pg-details', formData);
      setSuccess('PG Information updated live successfully!');
    } catch (err) {
      alert('Failed to update PG details.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white p-4 p-md-5 rounded-4 border shadow-sm">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="fw-bold mb-1">PG Business Information & CMS</h4>
          <p className="text-secondary small mb-0">
            Dynamically update property name, address, contact numbers, hours, and descriptions.
          </p>
        </div>
      </div>

      {success && (
        <div className="alert alert-success border-0 small py-2 mb-4 d-flex align-items-center gap-2">
          <i className="bi bi-check-circle-fill"></i>
          <div>{success}</div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary"></div>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label small fw-semibold">PG Business Name *</label>
              <input
                type="text"
                required
                className="form-control"
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="col-md-6">
              <label className="form-label small fw-semibold">Hero Tagline *</label>
              <input
                type="text"
                required
                className="form-control"
                value={formData.tagline || ''}
                onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
              />
            </div>

            <div className="col-md-6">
              <label className="form-label small fw-semibold">Primary Phone Number *</label>
              <input
                type="text"
                required
                className="form-control"
                value={formData.phone || ''}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>

            <div className="col-md-6">
              <label className="form-label small fw-semibold">Secondary / WhatsApp Phone</label>
              <input
                type="text"
                className="form-control"
                value={formData.alt_phone || ''}
                onChange={(e) => setFormData({ ...formData, alt_phone: e.target.value })}
              />
            </div>

            <div className="col-md-6">
              <label className="form-label small fw-semibold">Public Email Address</label>
              <input
                type="email"
                className="form-control"
                value={formData.email || ''}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div className="col-md-3">
              <label className="form-label small fw-semibold">Operating Hours</label>
              <input
                type="text"
                className="form-control"
                value={formData.opening_hours || ''}
                onChange={(e) => setFormData({ ...formData, opening_hours: e.target.value })}
              />
            </div>

            <div className="col-md-3">
              <label className="form-label small fw-semibold">Google Review Rating</label>
              <input
                type="text"
                className="form-control"
                value={formData.google_rating || ''}
                onChange={(e) => setFormData({ ...formData, google_rating: e.target.value })}
              />
            </div>

            <div className="col-12">
              <label className="form-label small fw-semibold">Physical Location & Address *</label>
              <textarea
                rows="2"
                required
                className="form-control"
                value={formData.address || ''}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              ></textarea>
            </div>

            <div className="col-12">
              <label className="form-label small fw-semibold">About Us Description</label>
              <textarea
                rows="4"
                className="form-control"
                value={formData.about_text || ''}
                onChange={(e) => setFormData({ ...formData, about_text: e.target.value })}
              ></textarea>
            </div>

            <div className="col-12">
              <label className="form-label small fw-semibold">Hostel Rules & Policy</label>
              <textarea
                rows="4"
                className="form-control"
                value={formData.rules_text || ''}
                onChange={(e) => setFormData({ ...formData, rules_text: e.target.value })}
              ></textarea>
            </div>

            <div className="col-12 pt-3">
              <button
                type="submit"
                disabled={saving}
                className="btn btn-pg-primary fw-semibold px-4"
              >
                {saving ? 'Publishing Changes...' : 'Save & Publish Live Information'}
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
