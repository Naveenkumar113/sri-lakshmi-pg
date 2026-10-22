import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import AdminOverviewHeader from '../../components/AdminOverviewHeader';
import TablePagination from '../../components/TablePagination';

export default function AdminMessages() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  // Pagination state (default 10)
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

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

  const unreadCount = messages.filter((m) => !m.is_read).length;
  const readCount = messages.filter((m) => m.is_read).length;
  const paginatedMessages = messages.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="d-flex flex-column gap-3">
      {/* Reusable AdminOverviewHeader for Contact Inquiries */}
      <AdminOverviewHeader
        title="Contact Messages & Enquiries"
        subtitle="Manage inquiries submitted via public contact forms by prospective residents."
        badge={`${unreadCount} Unread`}
        storageKey="messages"
        defaultCollapsed={true}
        summaryItems={[
          { label: 'Unread', value: unreadCount, colorClass: 'badge bg-warning text-dark rounded-pill px-1.5 py-0.5' },
          { label: 'Read', value: readCount, colorClass: 'text-success' },
          { label: 'Total Inquiries', value: messages.length, colorClass: 'text-dark' },
        ]}
        rightActions={
          <button
            onClick={fetchMessages}
            className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1.5 px-2.5"
            style={{ height: '36px' }}
            title="Refresh inquiries"
          >
            <i className="bi bi-arrow-clockwise"></i>
            <span className="d-none d-sm-inline">Refresh</span>
          </button>
        }
      >
        <div className="row g-2.5 g-md-3">
          <div className="col-sm-4">
            <div className="stat-box h-100 p-3 bg-white rounded-3 border shadow-xs border-top-warning">
              <div className="d-flex justify-content-between align-items-center mb-1">
                <span className="small text-muted fw-semibold">Pending / Unread</span>
                <span className="badge bg-warning text-dark rounded-pill">{unreadCount}</span>
              </div>
              <h4 className="fw-bold mb-0 text-warning">{unreadCount}</h4>
              <span className="small text-muted" style={{ fontSize: '0.72rem' }}>Needs response</span>
            </div>
          </div>
          <div className="col-sm-4">
            <div className="stat-box h-100 p-3 bg-white rounded-3 border shadow-xs border-top-success">
              <div className="d-flex justify-content-between align-items-center mb-1">
                <span className="small text-muted fw-semibold">Resolved / Read</span>
                <i className="bi bi-check-circle-fill text-success fs-6"></i>
              </div>
              <h4 className="fw-bold mb-0 text-success">{readCount}</h4>
              <span className="small text-muted" style={{ fontSize: '0.72rem' }}>Viewed messages</span>
            </div>
          </div>
          <div className="col-sm-4">
            <div className="stat-box h-100 p-3 bg-white rounded-3 border shadow-xs border-top-primary">
              <div className="d-flex justify-content-between align-items-center mb-1">
                <span className="small text-muted fw-semibold">Total Inquiries</span>
                <i className="bi bi-chat-left-dots-fill text-primary fs-6"></i>
              </div>
              <h4 className="fw-bold mb-0 text-primary">{messages.length}</h4>
              <span className="small text-muted" style={{ fontSize: '0.72rem' }}>All-time public contacts</span>
            </div>
          </div>
        </div>
      </AdminOverviewHeader>

      <div className="bg-white p-3 p-md-4 rounded-4 border shadow-sm">

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
          {paginatedMessages.map((msg) => (
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

          <TablePagination
            currentPage={page}
            pageSize={pageSize}
            totalItems={messages.length}
            itemLabel="inquiries"
            onPageChange={setPage}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setPage(1);
            }}
          />
        </div>
      )}
      </div>
    </div>
  );
}
