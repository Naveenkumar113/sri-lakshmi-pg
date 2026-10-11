import React, { useState, useEffect } from 'react';
import api from '../../services/api';

export default function AdminMessages() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchMessages = async () => {
    try {
      const res = await api.get('/admin/contact');
      setMessages(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  const handleMarkRead = async (id) => {
    try {
      await api.put(`/admin/contact/${id}/read`);
      setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, is_read: true } : m)));
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this message enquiry?')) return;
    try {
      await api.delete(`/admin/contact/${id}`);
      fetchMessages();
    } catch (err) {
      alert('Failed to delete message.');
    }
  };

  return (
    <div className="bg-white p-4 rounded-4 border shadow-sm">
      <div className="mb-4">
        <h4 className="fw-bold mb-1">Contact Messages & Enquiries</h4>
        <p className="text-secondary small mb-0">
          Inquiries submitted via the public contact form by prospective residents.
        </p>
      </div>

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary"></div>
        </div>
      ) : messages.length === 0 ? (
        <div className="text-center py-5 bg-light rounded-4 border">
          <i className="bi bi-chat-left-dots fs-1 text-muted"></i>
          <h6 className="fw-bold mt-2">No contact enquiries received</h6>
        </div>
      ) : (
        <div className="d-flex flex-column gap-3">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`p-3 p-md-4 rounded-3 border transition-all ${
                msg.is_read ? 'bg-white opacity-85' : 'bg-light border-warning border-opacity-50 shadow-xs'
              }`}
            >
              <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-2">
                <div>
                  <h6 className="fw-bold mb-0 text-dark">{msg.name}</h6>
                  <div className="small text-muted">
                    <a href={`tel:${msg.phone}`} className="text-decoration-none me-3 fw-semibold text-dark">
                      <i className="bi bi-telephone me-1"></i>{msg.phone}
                    </a>
                    <a href={`mailto:${msg.email}`} className="text-decoration-none text-secondary">
                      <i className="bi bi-envelope me-1"></i>{msg.email}
                    </a>
                  </div>
                </div>

                <div className="d-flex align-items-center gap-2">
                  <span className="small text-muted" style={{ fontSize: '0.72rem' }}>
                    {new Date(msg.created_at).toLocaleString('en-IN')}
                  </span>
                  {!msg.is_read && (
                    <button
                      onClick={() => handleMarkRead(msg.id)}
                      className="btn btn-sm btn-outline-secondary py-0 px-2"
                      style={{ fontSize: '0.72rem' }}
                    >
                      Mark Read
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(msg.id)}
                    className="btn btn-sm btn-outline-danger py-0 px-2"
                    style={{ fontSize: '0.72rem' }}
                  >
                    <i className="bi bi-trash"></i>
                  </button>
                </div>
              </div>

              <p className="text-secondary small mb-0 lh-base bg-white p-3 rounded border">
                {msg.message}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
