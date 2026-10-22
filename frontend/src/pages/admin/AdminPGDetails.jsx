import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { smartScrollTo, scrollToFirstError } from '../../utils/scrollHelper';
import AdminOverviewHeader from '../../components/AdminOverviewHeader';

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
      smartScrollTo('#pg-details-success', { offset: 90, delay: 80 });
    } catch (err) {
      alert('Failed to update PG details.');
      scrollToFirstError('#pg-details-form');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <AdminOverviewHeader
        title="PG Business Information"
        badge="Live Configuration"
        subtitle="Dynamically update property name, address, contact numbers, hours, and descriptions."
        storageKey="admin_overview_pgdetails"
        defaultCollapsed={true}
        summaryItems={[
          { label: 'Name', value: formData.name || 'Sri Lakshmi PG', colorClass: 'text-dark fw-bold' },
          { label: 'Phone', value: formData.phone || '+91 9361840263', colorClass: 'text-primary' },
          { label: 'Rating', value: `${formData.google_rating || '4.8'} ⭐`, colorClass: 'text-warning fw-bold' },
          { label: 'Location', value: 'Velachery, Chennai', colorClass: 'text-secondary' },
        ]}
      >
        <div className="row g-2.5 g-md-3">
          <div className="col-sm-6 col-md-3">
            <div className="stat-box h-100 p-3 bg-white rounded-3 border shadow-xs border-top-primary">
              <span className="small text-muted fw-semibold">PG Brand Name</span>
              <h6 className="fw-bold mb-0 text-dark mt-1">{formData.name || 'Sri Lakshmi Srinivasa Gents PG'}</h6>
              <span className="small text-muted" style={{ fontSize: '0.72rem' }}>{formData.tagline || 'Velachery Premium Stay'}</span>
            </div>
          </div>
          <div className="col-sm-6 col-md-3">
            <div className="stat-box h-100 p-3 bg-white rounded-3 border shadow-xs border-top-success">
              <span className="small text-muted fw-semibold">Primary Contact</span>
              <h6 className="fw-bold mb-0 text-success mt-1">{formData.phone || '9361840263'}</h6>
              <span className="small text-muted" style={{ fontSize: '0.72rem' }}>{formData.email || 'contact@srilakshmipg.com'}</span>
            </div>
          </div>
          <div className="col-sm-6 col-md-3">
            <div className="stat-box h-100 p-3 bg-white rounded-3 border shadow-xs border-top-warning">
              <span className="small text-muted fw-semibold">Google Rating</span>
              <h6 className="fw-bold mb-0 text-warning mt-1">{formData.google_rating || '4.8'} / 5.0 ⭐</h6>
              <span className="small text-muted" style={{ fontSize: '0.72rem' }}>Public review score</span>
            </div>
          </div>
          <div className="col-sm-6 col-md-3">
            <div className="stat-box h-100 p-3 bg-white rounded-3 border shadow-xs border-top-secondary">
              <span className="small text-muted fw-semibold">Visiting Hours</span>
              <h6 className="fw-bold mb-0 text-dark mt-1">{formData.opening_hours || '6:00 AM - 10:30 PM'}</h6>
              <span className="small text-muted" style={{ fontSize: '0.72rem' }}>Gate operating time</span>
            </div>
          </div>
        </div>
      </AdminOverviewHeader>

      <div className="bg-white p-4 p-md-5 rounded-4 border shadow-sm">

      {success && (
        <div id="pg-details-success" className="alert alert-success border-0 small py-2 mb-4 d-flex align-items-center gap-2">
          <i className="bi bi-check-circle-fill"></i>
          <div>{success}</div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary"></div>
        </div>
      ) : (
        <form id="pg-details-form" onSubmit={handleSubmit}>
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
    </div>
  );
}
