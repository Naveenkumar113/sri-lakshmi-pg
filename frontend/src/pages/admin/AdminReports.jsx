import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import AdminOverviewHeader from '../../components/AdminOverviewHeader';
import TablePagination from '../../components/TablePagination';

const ISSUE_CATEGORIES = [
  'Room cleaning not completed today',
  'Bathroom or toilet cleaning issue',
  'Water supply problem',
  'Electrical problem',
  'Fan or AC not working',
  'Bed or mattress problem',
  'Door, lock, or key problem',
  'Wi-Fi or internet problem',
  'Washing machine problem',
  'Plumbing or leakage problem',
  'Room maintenance required',
  'Pest or mosquito problem',
  'Security concern',
  'Noise disturbance',
  'Other issue',
];

export default function AdminReports() {
  const [searchParams, setSearchParams] = useSearchParams();
  const directReportId = searchParams.get('report_id');

  const [reports, setReports] = useState([]);
  const [counts, setCounts] = useState({ open: 0, in_progress: 0, resolved: 0, total: 0 });
  const [loading, setLoading] = useState(true);

  // Pagination state (default 10)
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('newest');

  // Modal inspection & resolution state
  const [selectedReport, setSelectedReport] = useState(null);
  const [modalStatus, setModalStatus] = useState('OPEN');
  const [modalNotes, setModalNotes] = useState('');
  const [savingStatus, setSavingStatus] = useState(false);
  const [statusFeedback, setStatusFeedback] = useState(null);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const params = {};
      if (statusFilter && statusFilter !== 'ALL') params.status = statusFilter;
      if (categoryFilter && categoryFilter !== 'ALL') params.category = categoryFilter;
      if (searchTerm.trim()) params.search = searchTerm.trim();
      if (sortBy) params.sort_by = sortBy;

      const res = await api.get('/admin/reports', { params });
      const items = res.data.items || [];
      setReports(items);
      setCounts({
        open: res.data.open_count,
        in_progress: res.data.in_progress_count,
        resolved: res.data.resolved_count,
        total: res.data.total,
      });

      // If opened via notification link with ?report_id=...
      if (directReportId) {
        const found = items.find((r) => r.id === directReportId);
        if (found) {
          openDetailModal(found);
        } else {
          // Fetch directly from API
          try {
            const single = await api.get(`/admin/reports/${directReportId}`);
            openDetailModal(single.data);
          } catch (e) {
            console.warn('Direct report not found', e);
          }
        }
      }
    } catch (err) {
      console.error('Failed to load admin reports', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();

    // Instant real-time refresh when new report arrives via WebSocket/SSE
    const handleNewReport = () => {
      fetchReports();
    };
    window.addEventListener('pg-new-report', handleNewReport);

    // Background polling fallback every 20 seconds
    const timer = setInterval(() => {
      fetchReports();
    }, 20000);
    return () => {
      clearInterval(timer);
      window.removeEventListener('pg-new-report', handleNewReport);
    };
  }, [statusFilter, categoryFilter, sortBy, directReportId]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, categoryFilter, searchTerm, sortBy]);

  const paginatedReports = reports.slice((page - 1) * pageSize, page * pageSize);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchReports();
  };

  const openDetailModal = (report) => {
    setSelectedReport(report);
    setModalStatus(report.status);
    setModalNotes(report.resolution_notes || '');
    setStatusFeedback(null);
  };

  const closeDetailModal = () => {
    setSelectedReport(null);
    if (directReportId) {
      searchParams.delete('report_id');
      setSearchParams(searchParams);
    }
  };

  const handleSaveResolution = async () => {
    if (!selectedReport) return;
    setSavingStatus(true);
    setStatusFeedback(null);

    try {
      const res = await api.put(`/admin/reports/${selectedReport.id}/status`, {
        status: modalStatus,
        resolution_notes: modalNotes.trim() || null,
      });

      setStatusFeedback({ type: 'success', message: 'Report status updated & in-app notification sent to resident!' });
      setSelectedReport(res.data);
      // Refresh list
      fetchReports();
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to update report status.';
      setStatusFeedback({ type: 'danger', message: typeof msg === 'string' ? msg : JSON.stringify(msg) });
    } finally {
      setSavingStatus(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'OPEN':
        return <span className="badge bg-warning text-dark px-2.5 py-1.5 fw-semibold"><i className="bi bi-clock me-1"></i>Open</span>;
      case 'IN_PROGRESS':
        return <span className="badge bg-primary px-2.5 py-1.5 fw-semibold"><i className="bi bi-gear-wide-connected me-1"></i>In Progress</span>;
      case 'RESOLVED':
        return <span className="badge bg-success px-2.5 py-1.5 fw-semibold"><i className="bi bi-check-circle-fill me-1"></i>Resolved</span>;
      default:
        return <span className="badge bg-secondary px-2.5 py-1.5">{status}</span>;
    }
  };

  return (
    <div className="d-flex flex-column gap-4">
      {/* Reusable AdminOverviewHeader for Issue Reports */}
      <AdminOverviewHeader
        title="Issue Reports & Maintenance"
        subtitle="Manage resident maintenance, cleaning requests, plumbing, and electrical issues."
        badge={`${counts.open} Open Issues`}
        storageKey="reports"
        defaultCollapsed={true}
        summaryItems={[
          { label: 'Open', value: counts.open, colorClass: 'badge bg-warning text-dark rounded-pill px-1.5 py-0.5' },
          { label: 'In Progress', value: counts.in_progress, colorClass: 'badge bg-primary rounded-pill px-1.5 py-0.5' },
          { label: 'Resolved', value: counts.resolved, colorClass: 'text-success' },
          { label: 'Total', value: counts.total, colorClass: 'text-dark' },
        ]}
        rightActions={
          <button
            onClick={fetchReports}
            className="btn btn-sm btn-outline-dark d-flex align-items-center gap-1.5 px-2.5 shadow-xs"
            style={{ height: '36px' }}
            title="Reload reports"
          >
            <i className="bi bi-arrow-clockwise"></i>
            <span className="d-none d-sm-inline">Refresh</span>
          </button>
        }
      >
        {/* 4 Summary Stat Cards */}
        <div className="row g-2 g-md-3">
          <div className="col-6 col-xl-3">
            <div className="stat-box h-100 bg-white p-2.5 p-md-3 rounded-4 border shadow-sm border-top-secondary">
              <div className="d-flex justify-content-between align-items-center mb-1">
                <span className="small text-muted fw-semibold" style={{ fontSize: '0.75rem' }}>Total Reports</span>
                <div className="rounded-circle p-1.5 bg-light text-dark d-none d-sm-block">
                  <i className="bi bi-clipboard-data fs-6"></i>
                </div>
              </div>
              <h4 className="fw-bold mb-0 text-dark">{counts.total}</h4>
              <span className="small text-muted" style={{ fontSize: '0.7rem' }}>All submissions</span>
            </div>
          </div>

          <div className="col-6 col-xl-3">
            <div className="stat-box h-100 bg-white p-2.5 p-md-3 rounded-4 border shadow-sm border-top-warning">
              <div className="d-flex justify-content-between align-items-center mb-1">
                <span className="small text-warning-emphasis fw-semibold" style={{ fontSize: '0.75rem' }}>Open</span>
                <div className="rounded-circle p-1.5 bg-warning-subtle text-warning d-none d-sm-block">
                  <i className="bi bi-exclamation-circle fs-6"></i>
                </div>
              </div>
              <h4 className="fw-bold mb-0 text-warning">{counts.open}</h4>
              <span className="small text-warning fw-semibold" style={{ fontSize: '0.7rem' }}>Needs attention</span>
            </div>
          </div>

          <div className="col-6 col-xl-3">
            <div className="stat-box h-100 bg-white p-2.5 p-md-3 rounded-4 border shadow-sm border-top-primary">
              <div className="d-flex justify-content-between align-items-center mb-1">
                <span className="small text-primary fw-semibold" style={{ fontSize: '0.75rem' }}>In Progress</span>
                <div className="rounded-circle p-1.5 bg-primary-subtle text-primary d-none d-sm-block">
                  <i className="bi bi-gear-wide-connected fs-6"></i>
                </div>
              </div>
              <h4 className="fw-bold mb-0 text-primary">{counts.in_progress}</h4>
              <span className="small text-primary fw-semibold" style={{ fontSize: '0.7rem' }}>Being resolved</span>
            </div>
          </div>

          <div className="col-6 col-xl-3">
            <div className="stat-box h-100 bg-white p-2.5 p-md-3 rounded-4 border shadow-sm border-top-success">
              <div className="d-flex justify-content-between align-items-center mb-1">
                <span className="small text-success fw-semibold" style={{ fontSize: '0.75rem' }}>Resolved</span>
                <div className="rounded-circle p-1.5 bg-success-subtle text-success d-none d-sm-block">
                  <i className="bi bi-check-circle fs-6"></i>
                </div>
              </div>
              <h4 className="fw-bold mb-0 text-success">{counts.resolved}</h4>
              <span className="small text-success fw-semibold" style={{ fontSize: '0.7rem' }}>Completed fixes</span>
            </div>
          </div>
        </div>
      </AdminOverviewHeader>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3 p-md-4 rounded-4 border shadow-sm">
        <div className="row g-2 align-items-center">
          <div className="col-12 col-md-4">
            <form onSubmit={handleSearchSubmit} className="input-group">
              <input
                type="text"
                className="form-control"
                placeholder="Search name, room, code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ minHeight: '44px' }}
              />
              <button className="btn btn-dark" type="submit" style={{ minHeight: '44px' }}>
                <i className="bi bi-search"></i>
              </button>
            </form>
          </div>

          <div className="col-6 col-md-3">
            <select
              className="form-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ minHeight: '44px' }}
            >
              <option value="ALL">Status: All</option>
              <option value="OPEN">Open Only</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="RESOLVED">Resolved</option>
            </select>
          </div>

          <div className="col-6 col-md-3">
            <select
              className="form-select"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              style={{ minHeight: '44px' }}
            >
              <option value="ALL">Categories: All</option>
              {ISSUE_CATEGORIES.map((c, i) => (
                <option key={i} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="col-12 col-md-2">
            <select
              className="form-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{ minHeight: '44px' }}
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="status">By Status</option>
            </select>
          </div>
        </div>
      </div>

      {/* Reports Table */}
      <div className="bg-white rounded-4 border shadow-sm p-4">
        <div className="d-flex align-items-center justify-content-between mb-3">
          <h5 className="fw-bold text-dark mb-0">Issue Reports ({reports.length})</h5>
        </div>

        {loading ? (
          <div className="text-center py-5 text-muted small">
            <div className="spinner-border spinner-border-sm text-primary me-2" role="status"></div>
            Loading issue reports...
          </div>
        ) : reports.length === 0 ? (
          <div className="text-center py-5 border rounded-3 bg-light">
            <i className="bi bi-clipboard2-check display-6 text-muted mb-2"></i>
            <h6 className="fw-bold text-dark">No Issue Reports Found</h6>
            <p className="text-muted small mb-0">
              No reports match your current filters or search terms.
            </p>
          </div>
        ) : (
          <>
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light small text-muted text-uppercase">
                  <tr>
                    <th scope="col" style={{ letterSpacing: '0.04em' }}>Report ID</th>
                    <th scope="col" style={{ letterSpacing: '0.04em' }}>Resident</th>
                    <th scope="col" style={{ letterSpacing: '0.04em' }}>Room / Bed</th>
                    <th scope="col" style={{ letterSpacing: '0.04em' }}>Category</th>
                    <th scope="col" style={{ letterSpacing: '0.04em' }}>Reported At</th>
                    <th scope="col" style={{ letterSpacing: '0.04em' }}>Status</th>
                    <th scope="col" className="text-end" style={{ letterSpacing: '0.04em' }}>Actions</th>
                  </tr>
                </thead>
                <tbody className="small">
                  {paginatedReports.map((rep) => (
                    <tr
                      key={rep.id}
                      className={selectedReport?.id === rep.id ? 'table-warning' : ''}
                    >
                      <td>
                        <span className="fw-bold text-dark font-monospace">{rep.report_code}</span>
                      </td>
                      <td>
                        <div className="fw-bold text-dark">{rep.resident_name}</div>
                        <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                          {rep.resident_code ? `${rep.resident_code} • ` : ''}{rep.resident_phone}
                        </div>
                      </td>
                      <td>
                        {rep.room_number ? (
                          <div>
                            <span className="badge bg-light text-dark border">
                              Room {rep.room_number}
                            </span>
                            <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                              {rep.bed_number ? `Bed ${rep.bed_number}` : ''} {rep.floor_number !== null ? `(Fl ${rep.floor_number})` : ''}
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted fst-italic">No active bed</span>
                        )}
                      </td>
                      <td>
                        <div className="fw-semibold text-dark">{rep.issue_category}</div>
                        {rep.description && (
                          <div className="text-muted truncate" style={{ maxWidth: '260px', fontSize: '0.78rem' }} title={rep.description}>
                            {rep.description}
                          </div>
                        )}
                      </td>
                      <td className="text-nowrap text-secondary">
                        {new Date(rep.created_at).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td>{getStatusBadge(rep.status)}</td>
                      <td className="text-end text-nowrap">
                        <button
                          className="btn btn-sm btn-outline-primary fw-semibold px-2.5 py-1"
                          onClick={() => openDetailModal(rep)}
                        >
                          <i className="bi bi-pencil-square me-1"></i> Manage
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination for Reports */}
            <TablePagination
              currentPage={page}
              pageSize={pageSize}
              totalItems={reports.length}
              itemLabel="issue reports"
              onPageChange={setPage}
              onPageSizeChange={(newSize) => {
                setPageSize(newSize);
                setPage(1);
              }}
            />
          </>
        )}
      </div>

      {/* Manage & Resolution Modal */}
      {selectedReport && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1060 }}
          role="dialog"
        >
          <div className="modal-dialog modal-lg modal-dialog-centered" role="document">
            <div className="modal-content rounded-4 border-0 shadow">
              <div className="modal-header border-bottom pb-3">
                <div>
                  <h5 className="modal-title fw-bold text-dark d-flex align-items-center gap-2">
                    <i className="bi bi-clipboard-pulse text-warning"></i>
                    <span>Manage Issue Report: {selectedReport.report_code}</span>
                  </h5>
                  <div className="text-muted small">
                    Submitted on {new Date(selectedReport.created_at).toLocaleString('en-IN')}
                  </div>
                </div>
                <button
                  type="button"
                  className="btn-close"
                  onClick={closeDetailModal}
                  aria-label="Close"
                ></button>
              </div>

              <div className="modal-body p-4">
                {statusFeedback && (
                  <div className={`alert alert-${statusFeedback.type} alert-dismissible fade show small`} role="alert">
                    {statusFeedback.message}
                    <button type="button" className="btn-close" onClick={() => setStatusFeedback(null)}></button>
                  </div>
                )}

                {/* Resident Snapshot Details */}
                <div className="row g-3 p-3 bg-light rounded-3 border mb-3">
                  <div className="col-sm-6 col-md-3">
                    <span className="text-muted small d-block">Resident</span>
                    <strong className="text-dark">{selectedReport.resident_name}</strong>
                  </div>
                  <div className="col-sm-6 col-md-3">
                    <span className="text-muted small d-block">Resident ID</span>
                    <strong className="text-dark">{selectedReport.resident_code || 'N/A'}</strong>
                  </div>
                  <div className="col-sm-6 col-md-3">
                    <span className="text-muted small d-block">Phone Number</span>
                    <a href={`tel:${selectedReport.resident_phone}`} className="fw-bold text-primary text-decoration-none">
                      {selectedReport.resident_phone}
                    </a>
                  </div>
                  <div className="col-sm-6 col-md-3">
                    <span className="text-muted small d-block">Room / Bed</span>
                    <strong className="text-dark">
                      {selectedReport.room_number ? `Room ${selectedReport.room_number} (${selectedReport.bed_number || 'Bed'})` : 'No bed allocated'}
                    </strong>
                  </div>
                </div>

                {/* Issue Category & Description */}
                <div className="mb-3">
                  <label className="text-muted small fw-bold text-uppercase">Issue Category</label>
                  <div className="p-2.5 rounded bg-warning-subtle text-dark fw-bold border border-warning-subtle">
                    {selectedReport.issue_category}
                  </div>
                </div>

                <div className="mb-4">
                  <label className="text-muted small fw-bold text-uppercase">Resident Description</label>
                  <div className="p-3 rounded bg-white border text-dark" style={{ minHeight: '80px', whiteSpace: 'pre-wrap' }}>
                    {selectedReport.description || <span className="text-muted fst-italic">No additional description was provided by the resident.</span>}
                  </div>
                </div>

                <hr className="my-3" />

                {/* Resolution & Status Form */}
                <h6 className="fw-bold text-dark mb-3">Update Status & Resolution Notes</h6>
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label small fw-semibold text-dark">Current Status</label>
                    <select
                      className="form-select"
                      value={modalStatus}
                      onChange={(e) => setModalStatus(e.target.value)}
                    >
                      <option value="OPEN">Open (Pending Review)</option>
                      <option value="IN_PROGRESS">In Progress (Work Ongoing)</option>
                      <option value="RESOLVED">Resolved (Maintenance Completed)</option>
                    </select>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label small fw-semibold text-dark">In-App Notification</label>
                    <div className="form-text small mt-0 text-muted">
                      When marked as <strong>Resolved</strong> or <strong>In Progress</strong>, an in-app notification is automatically delivered to the resident.
                    </div>
                  </div>

                  <div className="col-12">
                    <label className="form-label small fw-semibold text-dark">Internal & Resident Resolution Notes</label>
                    <textarea
                      className="form-control"
                      rows="3"
                      placeholder="e.g., Electrician fixed the switch; Room deep cleaned and inspected; Plumber repaired tap washer..."
                      value={modalNotes}
                      onChange={(e) => setModalNotes(e.target.value)}
                    ></textarea>
                  </div>
                </div>

                {/* Status Timestamp metadata */}
                {selectedReport.resolved_at && (
                  <div className="mt-3 p-2 bg-light rounded text-muted small d-flex align-items-center gap-2">
                    <i className="bi bi-clock-history"></i>
                    <span>Resolved on: {new Date(selectedReport.resolved_at).toLocaleString('en-IN')}</span>
                  </div>
                )}
              </div>

              <div className="modal-footer border-top">
                <button
                  type="button"
                  className="btn btn-light border"
                  onClick={closeDetailModal}
                >
                  Close
                </button>
                <button
                  type="button"
                  disabled={savingStatus}
                  className="btn btn-warning text-dark fw-bold d-flex align-items-center gap-2 shadow-sm"
                  onClick={handleSaveResolution}
                >
                  {savingStatus ? (
                    <>
                      <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <i className="bi bi-check-lg"></i>
                      <span>Save Status & Notify Resident</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
