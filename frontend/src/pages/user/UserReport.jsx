import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

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

export default function UserReport() {
  const { user } = useAuth();

  // Resident info state
  const [residentInfo, setResidentInfo] = useState(null);
  const [infoLoading, setInfoLoading] = useState(true);

  // Form state
  const [issueCategory, setIssueCategory] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  // History state
  const [reports, setReports] = useState([]);
  const [reportsLoading, setReportsLoading] = useState(true);

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
      setReports(res.data.items || []);
    } catch (err) {
      console.error('Failed to load past reports', err);
    } finally {
      setReportsLoading(false);
    }
  };

  useEffect(() => {
    fetchResidentDetails();
    fetchMyReports();

    // Subtle background polling every 25 seconds for live status updates from admin
    const timer = setInterval(() => {
      fetchMyReports();
    }, 25000);

    return () => clearInterval(timer);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!issueCategory) {
      setErrorMsg('Please select an issue type.');
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
        message: 'Your report has been submitted successfully to the PG management team.',
      });
      setIssueCategory('');
      setDescription('');
      // Refresh list
      fetchMyReports();
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to submit report. Please try again.';
      setErrorMsg(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setSubmitting(false);
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
      {/* Header Banner */}
      <div className="bg-white p-4 rounded-4 border shadow-sm">
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
          <div>
            <div className="d-flex align-items-center gap-2 mb-1">
              <span className="badge bg-danger-subtle text-danger border border-danger-subtle fw-semibold px-2 py-1">
                <i className="bi bi-exclamation-octagon me-1"></i> Resident Support
              </span>
            </div>
            <h4 className="fw-bold text-dark mb-1">Report an Issue or Maintenance Concern</h4>
            <p className="text-muted small mb-0">
              Submit your maintenance or room requests directly to the PG administration. Issues are logged with verified resident snapshots and tracked in real time.
            </p>
          </div>
          <button
            onClick={fetchMyReports}
            className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1"
            title="Refresh reports"
          >
            <i className="bi bi-arrow-clockwise"></i>
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Report Form Card */}
      <div className="bg-white p-4 rounded-4 border shadow-sm">
        <h5 className="fw-bold text-dark mb-3 d-flex align-items-center gap-2">
          <i className="bi bi-pencil-square text-primary"></i>
          <span>Create New Issue Report</span>
        </h5>

        {/* Read-Only Resident Snapshot Box */}
        <div className="p-3 bg-light rounded-3 border mb-4">
          <div className="d-flex align-items-center justify-content-between mb-2">
            <span className="small text-muted text-uppercase fw-bold" style={{ letterSpacing: '0.04em' }}>
              <i className="bi bi-shield-check text-success me-1"></i> Verified Resident Snapshot (Read-Only)
            </span>
            <span className="badge bg-secondary-subtle text-secondary small">System Verified</span>
          </div>

          {infoLoading ? (
            <div className="py-2 text-center text-muted small">
              <div className="spinner-border spinner-border-sm text-primary me-2" role="status"></div>
              Loading resident details...
            </div>
          ) : (
            <div className="row g-3">
              <div className="col-sm-6 col-md-4">
                <label className="text-muted small d-block mb-1">Resident Name</label>
                <input
                  type="text"
                  className="form-control form-control-sm bg-white"
                  value={residentInfo?.resident_name || user?.full_name || ''}
                  readOnly
                  disabled
                />
              </div>

              <div className="col-sm-6 col-md-4">
                <label className="text-muted small d-block mb-1">Registered Phone</label>
                <input
                  type="text"
                  className="form-control form-control-sm bg-white"
                  value={residentInfo?.phone || user?.phone || ''}
                  readOnly
                  disabled
                />
              </div>

              <div className="col-sm-6 col-md-4">
                <label className="text-muted small d-block mb-1">Resident ID</label>
                <input
                  type="text"
                  className="form-control form-control-sm bg-white"
                  value={residentInfo?.resident_code || 'Not Registered as Resident'}
                  readOnly
                  disabled
                />
              </div>

              <div className="col-sm-4 col-md-4">
                <label className="text-muted small d-block mb-1">Room Number</label>
                <input
                  type="text"
                  className="form-control form-control-sm bg-white"
                  value={residentInfo?.room_number || (residentInfo?.has_active_bed ? 'N/A' : 'No Active Room')}
                  readOnly
                  disabled
                />
              </div>

              <div className="col-sm-4 col-md-4">
                <label className="text-muted small d-block mb-1">Floor</label>
                <input
                  type="text"
                  className="form-control form-control-sm bg-white"
                  value={residentInfo?.floor_number !== null && residentInfo?.floor_number !== undefined ? `Floor ${residentInfo.floor_number}` : 'N/A'}
                  readOnly
                  disabled
                />
              </div>

              <div className="col-sm-4 col-md-4">
                <label className="text-muted small d-block mb-1">Bed Number</label>
                <input
                  type="text"
                  className="form-control form-control-sm bg-white"
                  value={residentInfo?.bed_number || (residentInfo?.has_active_bed ? 'N/A' : 'No Active Bed')}
                  readOnly
                  disabled
                />
              </div>
            </div>
          )}

          {!infoLoading && !residentInfo?.has_active_bed && (
            <div className="mt-2 text-warning-emphasis small d-flex align-items-center gap-1">
              <i className="bi bi-info-circle-fill text-warning"></i>
              <span>You currently do not have an active bed allocation. The admin will review this report against your general account.</span>
            </div>
          )}
        </div>

        {/* Success Alert */}
        {successMsg && (
          <div className="alert alert-success alert-dismissible fade show d-flex align-items-start gap-2 shadow-sm" role="alert">
            <i className="bi bi-check-circle-fill fs-5 mt-0.5 text-success"></i>
            <div>
              <div className="fw-bold">Report Submitted Successfully!</div>
              <div className="small">
                Your issue reference number is <strong className="text-decoration-underline">{successMsg.code}</strong>.
                {successMsg.message}
              </div>
            </div>
            <button type="button" className="btn-close" onClick={() => setSuccessMsg(null)} aria-label="Close"></button>
          </div>
        )}

        {/* Error Alert */}
        {errorMsg && (
          <div className="alert alert-danger alert-dismissible fade show d-flex align-items-center gap-2 shadow-sm" role="alert">
            <i className="bi bi-exclamation-triangle-fill fs-5 text-danger"></i>
            <div className="small">{errorMsg}</div>
            <button type="button" className="btn-close" onClick={() => setErrorMsg(null)} aria-label="Close"></button>
          </div>
        )}

        {/* Form Inputs */}
        <form onSubmit={handleSubmit}>
          <div className="row g-3">
            <div className="col-12">
              <label htmlFor="issueCategorySelect" className="form-label fw-semibold text-dark small mb-1">
                Issue Type <span className="text-danger">*</span>
              </label>
              <select
                id="issueCategorySelect"
                className="form-select"
                value={issueCategory}
                onChange={(e) => setIssueCategory(e.target.value)}
                required
              >
                <option value="">-- Select Issue Category --</option>
                {ISSUE_CATEGORIES.map((cat, idx) => (
                  <option key={idx} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-12">
              <div className="d-flex justify-content-between align-items-center mb-1">
                <label htmlFor="issueDescriptionArea" className="form-label fw-semibold text-dark small mb-0">
                  Describe Your Issue <span className="text-muted fw-normal">(Optional)</span>
                </label>
                <span className="small text-muted">{description.length}/2000</span>
              </div>
              <textarea
                id="issueDescriptionArea"
                className="form-control"
                rows="4"
                placeholder="Explain the problem in detail (e.g., tap leaking under the washbasin, AC remote not turning on, etc.)..."
                maxLength={2000}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              ></textarea>
              <div className="form-text small">
                Please provide any specific room details or preferred times for maintenance staff to attend.
              </div>
            </div>

            <div className="col-12 d-flex justify-content-end">
              <button
                type="submit"
                disabled={submitting || !issueCategory}
                className="btn btn-warning text-dark fw-bold px-4 py-2 d-flex align-items-center gap-2 shadow-sm"
              >
                {submitting ? (
                  <>
                    <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                    <span>Submitting Report...</span>
                  </>
                ) : (
                  <>
                    <i className="bi bi-send-fill"></i>
                    <span>Submit Report</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* My Reports History Section */}
      <div className="bg-white p-4 rounded-4 border shadow-sm">
        <div className="d-flex align-items-center justify-content-between mb-3">
          <h5 className="fw-bold text-dark mb-0 d-flex align-items-center gap-2">
            <i className="bi bi-clock-history text-secondary"></i>
            <span>My Reports History</span>
          </h5>
          <span className="badge bg-light text-dark border">{reports.length} Reports</span>
        </div>

        {reportsLoading ? (
          <div className="text-center py-4 text-muted small">
            <div className="spinner-border spinner-border-sm text-primary me-2" role="status"></div>
            Loading report history...
          </div>
        ) : reports.length === 0 ? (
          <div className="text-center py-5 border rounded-3 bg-light">
            <div className="display-6 text-muted mb-2">
              <i className="bi bi-clipboard2-check"></i>
            </div>
            <h6 className="fw-bold text-dark">No Reports Submitted Yet</h6>
            <p className="text-muted small mb-0">
              When you submit maintenance or room issues, they will appear here with live resolution status.
            </p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light small text-muted text-uppercase">
                <tr>
                  <th scope="col" style={{ letterSpacing: '0.04em' }}>Report ID</th>
                  <th scope="col" style={{ letterSpacing: '0.04em' }}>Issue Category</th>
                  <th scope="col" style={{ letterSpacing: '0.04em' }}>Date Reported</th>
                  <th scope="col" style={{ letterSpacing: '0.04em' }}>Current Status</th>
                  <th scope="col" style={{ letterSpacing: '0.04em' }}>Admin Resolution Notes</th>
                  <th scope="col" style={{ letterSpacing: '0.04em' }}>Date Resolved</th>
                </tr>
              </thead>
              <tbody className="small">
                {reports.map((rep) => (
                  <tr key={rep.id}>
                    <td>
                      <span className="fw-bold text-dark font-monospace">{rep.report_code}</span>
                      {rep.room_number && (
                        <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                          Room {rep.room_number} {rep.bed_number ? `• Bed ${rep.bed_number}` : ''}
                        </div>
                      )}
                    </td>
                    <td>
                      <div className="fw-semibold text-dark">{rep.issue_category}</div>
                      {rep.description && (
                        <div className="text-muted truncate" style={{ maxWidth: '280px', fontSize: '0.78rem' }} title={rep.description}>
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
                    <td>
                      {rep.resolution_notes ? (
                        <div className="p-2 bg-light rounded text-dark border-start border-3 border-success" style={{ fontSize: '0.8rem' }}>
                          {rep.resolution_notes}
                        </div>
                      ) : (
                        <span className="text-muted fst-italic">Pending admin review</span>
                      )}
                    </td>
                    <td className="text-nowrap text-secondary">
                      {rep.resolved_at ? (
                        new Date(rep.resolved_at).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
