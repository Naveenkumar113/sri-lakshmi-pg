import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { smartScrollTo, scrollToFirstError } from '../../utils/scrollHelper';

const ISSUE_CATEGORIES = [
  'Room cleaning',
  'Water tap or plumbing problem',
  'Electrical issue',
  'Fan or AC problem',
  'Door, lock, or key problem',
  'Bathroom problem',
  'Internet issue',
  'Bed or mattress issue',
  'Washing machine problem',
  'Other',
];

export default function UserReport() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const directReportId = searchParams.get('report_id');

  // Resident info state
  const [residentInfo, setResidentInfo] = useState(null);
  const [infoLoading, setInfoLoading] = useState(true);

  // Form state
  const [issueCategory, setIssueCategory] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  // History & Detail Modal state
  const [reports, setReports] = useState([]);
  const [reportsLoading, setReportsLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState(null);

  // Fetch resident details and past reports
  const fetchResidentDetails = async () => {
    try {
      const res = await api.get('/reports/my-info');
      setResidentInfo(res.data);
    } catch (err) {
      console.error('Failed to load resident details', err);
    } finally {
      setInfoLoading(false);
    }
  };

  const fetchMyReports = async () => {
    try {
      const res = await api.get('/reports/my');
      const items = res.data.items || [];
      setReports(items);

      if (directReportId) {
        const target = items.find((r) => r.id === directReportId);
        if (target) setSelectedReport(target);
      }
    } catch (err) {
      console.error('Failed to load past reports', err);
    } finally {
      setReportsLoading(false);
    }
  };

  useEffect(() => {
    fetchResidentDetails();
    fetchMyReports();

    // Background polling every 20 seconds for status updates
    const timer = setInterval(() => {
      fetchMyReports();
    }, 20000);

    return () => clearInterval(timer);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!issueCategory) {
      setErrorMsg('Please select an issue category.');
      scrollToFirstError('#report-form-section');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await api.post('/reports', {
        issue_category: issueCategory,
        description: description ? description.trim() : null,
      });

      setSuccessMsg({
        code: res.data.report_code,
        message: 'Your report has been submitted. The PG maintenance team will attend to it shortly.',
      });
      // Clear form on success
      setIssueCategory('');
      setDescription('');
      smartScrollTo('#report-success-banner', { offset: 90, delay: 100 });
      fetchMyReports();
    } catch (err) {
      // Preserve form inputs so resident does not lose typed description
      const msg = err.response?.data?.detail || 'Failed to submit report. Please try again.';
      setErrorMsg(typeof msg === 'string' ? msg : JSON.stringify(msg));
      smartScrollTo('#report-error-banner', { offset: 90, delay: 100 });
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'OPEN':
        return <span className="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle px-2 py-0.5"><i className="bi bi-clock me-1"></i>Submitted</span>;
      case 'IN_PROGRESS':
        return <span className="badge bg-primary-subtle text-primary border border-primary-subtle px-2 py-0.5"><i className="bi bi-gear-wide-connected me-1"></i>In Progress</span>;
      case 'RESOLVED':
        return <span className="badge bg-success-subtle text-success border border-success-subtle px-2 py-0.5"><i className="bi bi-check-circle-fill me-1"></i>Resolved</span>;
      default:
        return <span className="badge bg-secondary-subtle text-secondary border border-secondary-subtle px-2 py-0.5">{status}</span>;
    }
  };

  return (
    <div className="d-flex flex-column gap-3">
      {/* 1. Header Banner - Clean, short & readable */}
      <div className="bg-white p-3 p-md-3.5 rounded-3 border shadow-xs d-flex justify-content-between align-items-center">
        <div>
          <div className="d-flex align-items-center gap-2">
            <h6 className="fw-bold text-dark mb-0">Report an Issue</h6>
            <span className="badge bg-danger-subtle text-danger border border-danger-subtle small px-1.5 py-0.5" style={{ fontSize: '0.65rem' }}>
              Maintenance
            </span>
          </div>
          <div className="text-muted small" style={{ fontSize: '0.75rem' }}>
            Direct request to PG administration with live tracking
          </div>
        </div>
        <button
          onClick={fetchMyReports}
          className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1 px-2.5 py-1.5"
          style={{ minHeight: '34px', fontSize: '0.8rem' }}
          title="Refresh reports"
        >
          <i className="bi bi-arrow-clockwise"></i>
          <span className="d-none d-sm-inline">Refresh</span>
        </button>
      </div>

      {/* 2. Simple, Mobile-Friendly Issue Form */}
      <div id="report-form-section" className="bg-white p-3 p-md-3.5 rounded-3 border shadow-xs">
        <form onSubmit={handleSubmit} className="d-flex flex-column gap-2.5">
          {/* Read-Only Compact Allocation Details Strip */}
          <div className="p-2.5 bg-light rounded-2 border">
            <div className="d-flex justify-content-between align-items-center mb-1.5">
              <span className="small text-muted fw-bold" style={{ fontSize: '0.7rem' }}>
                <i className="bi bi-person-check text-success me-1"></i> RESIDENT & ALLOCATION (VERIFIED)
              </span>
              <span className="badge bg-white text-secondary border font-monospace" style={{ fontSize: '0.68rem' }}>
                {residentInfo?.resident_code || 'ID Pending'}
              </span>
            </div>

            {infoLoading ? (
              <div className="py-1 text-center text-muted small" style={{ fontSize: '0.75rem' }}>
                <span className="spinner-border spinner-border-sm text-primary me-1"></span> Loading details...
              </div>
            ) : (
              <div className="d-flex flex-wrap align-items-center gap-x-3 gap-y-1 text-muted small" style={{ fontSize: '0.78rem' }}>
                <span><strong>{residentInfo?.resident_name || user?.full_name}</strong></span>
                <span>• {residentInfo?.phone || user?.phone}</span>
                <span>• Rm {residentInfo?.room_number || 'N/A'} (Floor {residentInfo?.floor_number ?? '—'}, Bed {residentInfo?.bed_number || '—'})</span>
              </div>
            )}
          </div>

          {/* Success Alert */}
          {successMsg && (
            <div id="report-success-banner" className="alert alert-success alert-dismissible fade show p-2.5 mb-0 d-flex align-items-start gap-2" role="alert">
              <i className="bi bi-check-circle-fill text-success fs-6 mt-0.5"></i>
              <div className="small flex-grow-1">
                <strong>Submitted (#{successMsg.code}):</strong> {successMsg.message}
              </div>
              <button type="button" className="btn-close p-2" onClick={() => setSuccessMsg(null)} aria-label="Close"></button>
            </div>
          )}

          {/* Error Alert */}
          {errorMsg && (
            <div id="report-error-banner" className="alert alert-danger alert-dismissible fade show p-2.5 mb-0 d-flex align-items-start gap-2" role="alert">
              <i className="bi bi-exclamation-triangle-fill text-danger fs-6 mt-0.5"></i>
              <div className="small flex-grow-1">{errorMsg}</div>
              <button type="button" className="btn-close p-2" onClick={() => setErrorMsg(null)} aria-label="Close"></button>
            </div>
          )}

          {/* Issue Category Dropdown */}
          <div>
            <label htmlFor="issueCategorySelect" className="form-label fw-semibold text-dark small mb-1">
              Issue Category <span className="text-danger">*</span>
            </label>
            <select
              id="issueCategorySelect"
              className="form-select form-select-sm"
              value={issueCategory}
              onChange={(e) => setIssueCategory(e.target.value)}
              required
              style={{ minHeight: '38px' }}
            >
              <option value="">-- Select Issue Category --</option>
              {ISSUE_CATEGORIES.map((cat, idx) => (
                <option key={idx} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Description Textarea */}
          <div>
            <div className="d-flex justify-content-between align-items-center mb-1">
              <label htmlFor="issueDescriptionArea" className="form-label fw-semibold text-dark small mb-0">
                Description <span className="text-muted fw-normal">(Optional)</span>
              </label>
              <span className="text-muted" style={{ fontSize: '0.7rem' }}>{description.length}/2000</span>
            </div>
            <textarea
              id="issueDescriptionArea"
              className="form-control form-control-sm"
              rows="3"
              placeholder="Briefly describe the problem (e.g. tap leaking in bathroom, fan regulator loose)..."
              maxLength={2000}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            ></textarea>
          </div>

          {/* Submit Button */}
          <div className="d-flex justify-content-end pt-1">
            <button
              type="submit"
              disabled={submitting || !issueCategory}
              className="btn btn-sm btn-pg-primary fw-bold px-4 py-2 d-flex align-items-center justify-content-center gap-1.5 w-100 w-sm-auto shadow-xs"
              style={{ minHeight: '38px' }}
            >
              {submitting ? (
                <>
                  <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <i className="bi bi-send-fill"></i>
                  <span>Submit Report</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* 3. My Reports History Section (Mobile Card List & Responsive Table) */}
      <div className="bg-white p-3 p-md-3.5 rounded-3 border shadow-xs">
        <div className="d-flex align-items-center justify-content-between mb-2.5 pb-2 border-bottom">
          <div className="d-flex align-items-center gap-2">
            <h6 className="fw-bold text-dark mb-0">My Reports History</h6>
            <span className="badge bg-light text-dark border small" style={{ fontSize: '0.68rem' }}>
              {reports.length}
            </span>
          </div>
          <span className="text-muted small" style={{ fontSize: '0.72rem' }}>Tap a card for details</span>
        </div>

        {reportsLoading ? (
          <div className="text-center py-4 text-muted small">
            <div className="spinner-border spinner-border-sm text-primary me-2"></div>
            Loading report history...
          </div>
        ) : reports.length === 0 ? (
          <div className="text-center py-4 bg-light rounded-2 text-muted small">
            <i className="bi bi-clipboard2-check fs-4 d-block mb-1 text-muted"></i>
            No reports submitted yet.
          </div>
        ) : (
          <>
            {/* Mobile Card List View (< md screens) */}
            <div className="d-md-none d-flex flex-column gap-2">
              {reports.map((rep) => (
                <div
                  key={`card-${rep.id}`}
                  onClick={() => setSelectedReport(rep)}
                  role="button"
                  tabIndex={0}
                  className={`p-2.5 rounded-2 border d-flex flex-column gap-1.5 cursor-pointer shadow-xs ${
                    rep.status === 'RESOLVED' ? 'bg-light' : 'bg-white'
                  }`}
                  style={{
                    borderLeft: rep.status === 'RESOLVED'
                      ? '4px solid #10B981'
                      : rep.status === 'IN_PROGRESS'
                      ? '4px solid #2563EB'
                      : '4px solid #F59E0B'
                  }}
                >
                  <div className="d-flex justify-content-between align-items-start gap-1">
                    <div>
                      <span className="fw-bold text-dark small">{rep.issue_category}</span>
                      <div className="d-flex align-items-center gap-1.5 text-muted" style={{ fontSize: '0.72rem' }}>
                        <span className="font-monospace fw-semibold text-dark">#{rep.report_code}</span>
                        {rep.room_number && (
                          <span>• Rm {rep.room_number}{rep.bed_number ? ` (Bed ${rep.bed_number})` : ''}</span>
                        )}
                      </div>
                    </div>
                    <div className="text-end flex-shrink-0">
                      {getStatusBadge(rep.status)}
                    </div>
                  </div>

                  {rep.description && (
                    <div className="text-muted small text-truncate" style={{ fontSize: '0.75rem' }}>
                      {rep.description}
                    </div>
                  )}

                  <div className="d-flex justify-content-between align-items-center pt-1 border-top text-muted" style={{ fontSize: '0.68rem' }}>
                    <span>
                      {new Date(rep.created_at).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                    <span className="text-primary fw-semibold">View Updates &rarr;</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View (>= md screens) */}
            <div className="table-responsive d-none d-md-block">
              <table className="table table-hover align-middle mb-0 small">
                <thead className="table-light">
                  <tr>
                    <th>Report ID</th>
                    <th>Category</th>
                    <th>Reported Date</th>
                    <th>Status</th>
                    <th>Admin Updates</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((rep) => (
                    <tr key={rep.id} onClick={() => setSelectedReport(rep)} style={{ cursor: 'pointer' }}>
                      <td>
                        <span className="fw-bold text-dark font-monospace">#{rep.report_code}</span>
                        {rep.room_number && (
                          <div className="text-muted" style={{ fontSize: '0.72rem' }}>
                            Room {rep.room_number} {rep.bed_number ? `(Bed ${rep.bed_number})` : ''}
                          </div>
                        )}
                      </td>
                      <td>
                        <div className="fw-semibold text-dark">{rep.issue_category}</div>
                        {rep.description && (
                          <div className="text-muted text-truncate" style={{ maxWidth: '240px', fontSize: '0.75rem' }}>
                            {rep.description}
                          </div>
                        )}
                      </td>
                      <td className="text-nowrap text-muted" style={{ fontSize: '0.75rem' }}>
                        {new Date(rep.created_at).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </td>
                      <td>{getStatusBadge(rep.status)}</td>
                      <td>
                        {rep.resolution_notes ? (
                          <div className="text-truncate text-success fw-semibold" style={{ maxWidth: '200px', fontSize: '0.75rem' }}>
                            {rep.resolution_notes}
                          </div>
                        ) : (
                          <span className="text-muted small fst-italic">Pending review</span>
                        )}
                      </td>
                      <td className="text-end">
                        <button
                          type="button"
                          className="btn btn-xs btn-outline-secondary"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedReport(rep);
                          }}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* 4. Dedicated Report Details Modal for Mobile & Desktop */}
      {selectedReport && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1060 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content rounded-3 border-0 shadow-lg overflow-hidden">
              <div className="modal-header bg-light p-3">
                <div className="d-flex align-items-center gap-2">
                  <div className="rounded-circle bg-danger-subtle text-danger p-1 d-flex align-items-center justify-content-center" style={{ width: '28px', height: '28px' }}>
                    <i className="bi bi-exclamation-octagon fs-6"></i>
                  </div>
                  <div>
                    <h6 className="modal-title fw-bold mb-0">Report #{selectedReport.report_code}</h6>
                    <div className="text-muted small" style={{ fontSize: '0.7rem' }}>
                      Submitted {new Date(selectedReport.created_at).toLocaleString('en-IN')}
                    </div>
                  </div>
                </div>
                <button type="button" className="btn-close" onClick={() => setSelectedReport(null)}></button>
              </div>

              <div className="modal-body p-3 d-flex flex-column gap-2.5">
                <div className="d-flex justify-content-between align-items-center p-2 bg-light rounded-2 border">
                  <div>
                    <div className="text-muted small" style={{ fontSize: '0.68rem' }}>Category</div>
                    <div className="fw-bold text-dark small">{selectedReport.issue_category}</div>
                  </div>
                  <div className="text-end">
                    <div className="text-muted small" style={{ fontSize: '0.68rem' }}>Current Status</div>
                    <div>{getStatusBadge(selectedReport.status)}</div>
                  </div>
                </div>

                {selectedReport.room_number && (
                  <div className="p-2 bg-light rounded-2 border text-muted small" style={{ fontSize: '0.75rem' }}>
                    <i className="bi bi-door-open me-1 text-primary"></i>
                    Allocated Location: <strong>Room {selectedReport.room_number}</strong> {selectedReport.bed_number ? `(Bed ${selectedReport.bed_number})` : ''}
                  </div>
                )}

                {selectedReport.description && (
                  <div>
                    <div className="text-muted small fw-semibold mb-1" style={{ fontSize: '0.72rem' }}>Resident Description:</div>
                    <div className="p-2.5 bg-white border rounded-2 small text-dark">
                      {selectedReport.description}
                    </div>
                  </div>
                )}

                <div>
                  <div className="text-muted small fw-semibold mb-1" style={{ fontSize: '0.72rem' }}>Admin Resolution & Updates:</div>
                  {selectedReport.resolution_notes ? (
                    <div className="p-2.5 bg-success-subtle text-success-emphasis border border-success-subtle rounded-2 small">
                      <div className="fw-bold mb-0.5"><i className="bi bi-check-circle me-1"></i>Update from Admin:</div>
                      <div>{selectedReport.resolution_notes}</div>
                      {selectedReport.resolved_at && (
                        <div className="text-muted mt-1" style={{ fontSize: '0.68rem' }}>
                          Resolved on: {new Date(selectedReport.resolved_at).toLocaleString('en-IN')}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-2.5 bg-light border rounded-2 small text-muted fst-italic">
                      Your report has been logged in the system. The PG manager and maintenance team are reviewing it.
                    </div>
                  )}
                </div>
              </div>

              <div className="modal-footer bg-light p-2.5">
                <button type="button" className="btn btn-sm btn-secondary w-100" onClick={() => setSelectedReport(null)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
