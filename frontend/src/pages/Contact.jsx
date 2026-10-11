import React, { useState } from 'react';
import api from '../services/api';

export default function Contact() {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    message: '',
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      await api.post('/contact', formData);
      setSuccess(true);
      setFormData({ name: '', phone: '', email: '', message: '' });
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to send message. Please try again or call us directly.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="py-5 bg-light min-vh-100">
      <div className="container">
        {/* Title */}
        <div className="text-center max-w-700 mx-auto mb-5" style={{ maxWidth: '680px' }}>
          <span className="pill-badge pill-badge-accent mb-2">Get In Touch</span>
          <h1 className="display-5 fw-extrabold mb-2">Contact Sri Lakshmi Srinivasa Gents PG</h1>
          <p className="text-secondary small">
            Have questions about room availability, monthly pricing, or visiting the PG? Reach out anytime.
          </p>
        </div>

        <div className="row g-5">
          {/* Contact Details */}
          <div className="col-lg-5">
            <div className="bg-white p-4 p-md-5 rounded-4 border shadow-sm h-100 d-flex flex-column justify-content-between">
              <div>
                <h4 className="fw-bold mb-4">Property Desk</h4>

                <div className="d-flex align-items-start gap-3 mb-4">
                  <div className="d-flex align-items-center justify-content-center rounded-circle bg-light border text-danger" style={{ width: '44px', height: '44px', flexShrink: 0 }}>
                    <i className="bi bi-geo-alt-fill fs-5"></i>
                  </div>
                  <div>
                    <div className="fw-bold text-dark">Address</div>
                    <div className="text-secondary small lh-base">
                      3, Bhavani St, Bharathi Nagar,<br />
                      Velachery, Chennai,<br />
                      Tamil Nadu – 600113, India
                    </div>
                  </div>
                </div>

                <div className="d-flex align-items-start gap-3 mb-4">
                  <div className="d-flex align-items-center justify-content-center rounded-circle bg-light border text-success" style={{ width: '44px', height: '44px', flexShrink: 0 }}>
                    <i className="bi bi-telephone-fill fs-5"></i>
                  </div>
                  <div>
                    <div className="fw-bold text-dark">Phone Numbers</div>
                    <a href="tel:+917893744206" className="text-decoration-none text-dark fw-bold d-block">
                      +91 78937 44206
                    </a>
                    <span className="text-muted small">+91 90032 80430</span>
                  </div>
                </div>

                <div className="d-flex align-items-start gap-3 mb-4">
                  <div className="d-flex align-items-center justify-content-center rounded-circle bg-light border text-primary" style={{ width: '44px', height: '44px', flexShrink: 0 }}>
                    <i className="bi bi-clock-fill fs-5"></i>
                  </div>
                  <div>
                    <div className="fw-bold text-dark">Office Hours</div>
                    <div className="text-secondary small">Open 24 Hours Daily</div>
                  </div>
                </div>

                <div className="d-flex align-items-start gap-3 mb-4">
                  <div className="d-flex align-items-center justify-content-center rounded-circle bg-light border text-warning" style={{ width: '44px', height: '44px', flexShrink: 0 }}>
                    <i className="bi bi-envelope-fill fs-5"></i>
                  </div>
                  <div>
                    <div className="fw-bold text-dark">Email Inquiries</div>
                    <div className="text-secondary small">srilakshmisrinivasa.pg@gmail.com</div>
                  </div>
                </div>
              </div>

              {/* Direct Buttons */}
              <div className="d-flex gap-2 pt-3 border-top">
                <a href="tel:+917893744206" className="btn btn-outline-dark flex-fill py-2 fw-semibold">
                  <i className="bi bi-telephone-fill text-success me-1"></i> Call Now
                </a>
                <a
                  href="https://wa.me/917893744206"
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-success flex-fill py-2 fw-semibold"
                >
                  <i className="bi bi-whatsapp me-1"></i> WhatsApp
                </a>
              </div>
            </div>
          </div>

          {/* Contact Message Form */}
          <div className="col-lg-7">
            <div className="bg-white p-4 p-md-5 rounded-4 border shadow-sm">
              <h4 className="fw-bold mb-2">Send an Enquiry</h4>
              <p className="text-muted small mb-4">
                Leave your details below and our PG warden will reply or call you promptly.
              </p>

              {success && (
                <div className="alert alert-success border-0 rounded-3 mb-4 d-flex align-items-center gap-2">
                  <i className="bi bi-check-circle-fill fs-5"></i>
                  <div>
                    <strong>Message submitted successfully!</strong> Our manager will contact you shortly.
                  </div>
                </div>
              )}

              {error && (
                <div className="alert alert-danger border-0 rounded-3 mb-4 d-flex align-items-center gap-2">
                  <i className="bi bi-exclamation-triangle-fill fs-5"></i>
                  <div>{error}</div>
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label small fw-semibold">Your Full Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Rahul Sharma"
                      className="form-control"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label small fw-semibold">Mobile Number *</label>
                    <input
                      type="tel"
                      required
                      placeholder="e.g. 9876543210"
                      className="form-control"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>

                  <div className="col-12">
                    <label className="form-label small fw-semibold">Email Address *</label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. rahul@example.com"
                      className="form-control"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>

                  <div className="col-12">
                    <label className="form-label small fw-semibold">Your Message / Query *</label>
                    <textarea
                      required
                      rows="4"
                      placeholder="Specify your inquiry (e.g. Are 2-sharing AC rooms available from 1st of next month?)"
                      className="form-control"
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    ></textarea>
                  </div>

                  <div className="col-12 pt-2">
                    <button
                      type="submit"
                      disabled={loading}
                      className="btn btn-pg-primary w-100 py-2 fw-semibold"
                    >
                      {loading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                          Submitting...
                        </>
                      ) : (
                        <>
                          <i className="bi bi-send-fill me-1"></i> Send Enquiry
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
