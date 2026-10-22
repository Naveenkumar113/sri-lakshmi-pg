import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api, { cachedGet, invalidateClientCache } from '../../services/api';
import { smartScrollTo } from '../../utils/scrollHelper';

export default function AdminRentManagement() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'records'); // 'records', 'logs', 'settings'
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [records, setRecords] = useState([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [rooms, setRooms] = useState([]);

  // Selected billing month (e.g. "2026-10")
  const currentMonthKey = new Date().toISOString().slice(0, 7); // "YYYY-MM"
  const [selectedMonth, setSelectedMonth] = useState(searchParams.get('month') || currentMonthKey);

  // Filters & Active Card Filter Title
  const initialStatus = searchParams.get('status') || 'ALL';
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [roomFilter, setRoomFilter] = useState('');
  const [activeFilterTitle, setActiveFilterTitle] = useState(
    initialStatus === 'OVERDUE' ? 'Overdue Residents' :
    initialStatus === 'PAID' ? 'Fully Paid Residents' :
    initialStatus === 'PENDING' ? 'Pending Residents' :
    initialStatus === 'PARTIALLY_PAID' ? 'Partially Paid Residents' : ''
  );

  // Modals state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showPreviewReminderModal, setShowPreviewReminderModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);

  // Payment form state
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: 'UPI',
    transaction_reference: '',
    notes: '',
  });
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState(null);

  // WhatsApp logs state
  const [reminderLogs, setReminderLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsPage, setLogsPage] = useState(1);
  const [totalLogs, setTotalLogs] = useState(0);
  const [logStatusFilter, setLogStatusFilter] = useState('ALL');

  // Scheduler / Sync action state
  const [runningJob, setRunningJob] = useState(false);
  const [syncingRecords, setSyncingRecords] = useState(false);
  const [actionAlert, setActionAlert] = useState(null);

  // Settings state
  const [settings, setSettings] = useState({
    admin_whatsapp_number: '7893744206',
    reminder_frequency_days: 1,
    auto_send_on_due_date: true,
    send_hour_ist: 9,
    whatsapp_enabled: true,
    whatsapp_template_name: 'pg_rent_due_reminder'
  });
  const [savingSettings, setSavingSettings] = useState(false);
  const [adminPhoneError, setAdminPhoneError] = useState('');

  // WhatsApp click-to-chat confirm modal state
  const [confirmModalData, setConfirmModalData] = useState(null);
  const [confirmingSend, setConfirmingSend] = useState(false);

  // Fetch Dashboard Summary Stats
  const fetchStats = async (force = false) => {
    try {
      const ttl = force ? 0 : 20000;
      const data = await cachedGet(`/admin/rent/dashboard-stats?month=${selectedMonth}`, {}, ttl);
      setStats(data);
    } catch (err) {
      console.error('Failed to load rent dashboard statistics', err);
    }
  };

  // Fetch Records with filters
  const fetchRecords = async (force = false) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      if (selectedMonth && selectedMonth !== 'ALL') params.append('month', selectedMonth);
      if (statusFilter && statusFilter !== 'ALL') params.append('status', statusFilter);
      if (roomFilter) params.append('room_number', roomFilter);
      if (search.trim()) params.append('search', search.trim());

      const ttl = force ? 0 : 20000;
      const data = await cachedGet(`/admin/rent/records?${params.toString()}`, {}, ttl);
      setRecords(data.records || []);
      setTotalRecords(data.total || 0);
    } catch (err) {
      console.error('Failed to load rent records', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch WhatsApp Reminder Logs
  const fetchLogs = async () => {
    try {
      setLogsLoading(true);
      const params = new URLSearchParams({
        page: logsPage.toString(),
        limit: '25',
      });
      if (logStatusFilter && logStatusFilter !== 'ALL') params.append('status', logStatusFilter);
      if (selectedMonth && selectedMonth !== 'ALL') params.append('month', selectedMonth);

      const res = await api.get(`/admin/rent/reminders/logs?${params.toString()}`);
      setReminderLogs(res.data.logs || []);
      setTotalLogs(res.data.total || 0);
    } catch (err) {
      console.error('Failed to load reminder logs', err);
    } finally {
      setLogsLoading(false);
    }
  };

  // Fetch Rooms for room filter dropdown
  const fetchRooms = async () => {
    try {
      const data = await cachedGet('/admin/rooms', {}, 30000);
      setRooms(Array.isArray(data) ? data : []);
    } catch (err) {
      console.warn('Failed to load room list for filters');
    }
  };

  // Fetch Settings
  const fetchSettings = async () => {
    try {
      const data = await cachedGet('/admin/rent/settings', {}, 60000);
      if (data) setSettings(data);
    } catch (err) {
      console.warn('Failed to load rent settings');
    }
  };

  useEffect(() => {
    // Parallel execute independent requests
    Promise.all([
      fetchStats(),
      fetchRecords(),
      fetchRooms(),
      fetchSettings()
    ]);
  }, [selectedMonth]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchRecords();
    }, 250);
    return () => clearTimeout(timer);
  }, [search, statusFilter, roomFilter]);

  useEffect(() => {
    const recordId = searchParams.get('record_id');
    if (recordId && records.length > 0) {
      const match = records.find(r => r.id === recordId || r.resident_id === recordId);
      if (match) {
        handleOpenHistoryModal(match);
      }
    }
  }, [records, searchParams]);

  useEffect(() => {
    if (activeTab === 'logs') {
      fetchLogs();
    }
  }, [activeTab, logsPage, logStatusFilter, selectedMonth]);

  // Open Record Payment Modal
  const handleOpenPaymentModal = (record) => {
    setSelectedRecord(record);
    setPaymentForm({
      amount: record.balance_due.toString(),
      payment_date: new Date().toISOString().split('T')[0],
      payment_method: 'UPI',
      transaction_reference: '',
      notes: '',
    });
    setPaymentError(null);
    setShowPaymentModal(true);
  };

  // Submit Payment Record
  const handleSubmitPayment = async (e) => {
    e.preventDefault();
    if (!selectedRecord) return;
    setPaymentError(null);

    const amountNum = parseFloat(paymentForm.amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setPaymentError('Please enter a valid payment amount greater than zero.');
      return;
    }
    if (amountNum > selectedRecord.balance_due) {
      setPaymentError(`Payment amount cannot exceed remaining balance due (₹${selectedRecord.balance_due.toLocaleString()}).`);
      return;
    }

    try {
      setSubmittingPayment(true);
      const res = await api.post(`/admin/rent/records/${selectedRecord.id}/payments`, {
        amount: amountNum,
        payment_date: paymentForm.payment_date,
        payment_method: paymentForm.payment_method,
        transaction_reference: paymentForm.transaction_reference.trim() || null,
        notes: paymentForm.notes.trim() || null,
      });

      setActionAlert({
        type: 'success',
        message: `Payment of ₹${amountNum.toLocaleString()} recorded successfully for ${selectedRecord.resident_name}! Balance is now ₹${res.data.balance_due.toLocaleString()} (${res.data.payment_status}).`
      });

      invalidateClientCache('/admin/rent');
      invalidateClientCache('/admin/analytics');
      setShowPaymentModal(false);
      fetchStats(true);
      fetchRecords(true);
    } catch (err) {
      const errMsg = err.response?.data?.detail || 'Failed to record payment. Please check details.';
      setPaymentError(errMsg);
    } finally {
      setSubmittingPayment(false);
    }
  };

  // Open Details & History Modal
  const handleOpenHistoryModal = (record) => {
    setSelectedRecord(record);
    setShowHistoryModal(true);
  };

  // Manual Trigger: Send Regular WhatsApp Reminder via Click-to-Chat
  const handleSendReminder = async (record, force = false) => {
    try {
      setActionAlert({ type: 'info', message: `Preparing WhatsApp reminder for ${record.resident_name} (${record.resident_phone})...` });
      const res = await api.post(`/admin/rent/records/${record.id}/send-reminder?force=${force}`);
      
      if (res.data.success && res.data.whatsapp_url) {
        // Open WhatsApp Web / App directly in a new tab
        window.open(res.data.whatsapp_url, '_blank', 'noopener,noreferrer');
        // Show confirmation modal
        setConfirmModalData(res.data);
        setActionAlert({
          type: 'success',
          message: `WhatsApp opened for ${record.resident_name}! Message is prefilled. Please press Send in WhatsApp and confirm below.`
        });
      } else {
        setActionAlert({
          type: 'warning',
          message: `Reminder logged: ${res.data.delivery_status}. Note: ${res.data.error_details || 'Could not construct WhatsApp chat link.'}`
        });
      }
      fetchStats();
      fetchRecords();
      if (activeTab === 'logs') fetchLogs();
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to send WhatsApp reminder.';
      setActionAlert({ type: 'danger', message: msg });
    }
  };

  // Retry Reminder from Logs
  const handleRetryReminder = async (logId) => {
    try {
      setActionAlert({ type: 'info', message: 'Re-opening WhatsApp reminder conversation...' });
      const res = await api.post(`/admin/rent/reminders/${logId}/retry`);
      if (res.data.success && res.data.whatsapp_url) {
        window.open(res.data.whatsapp_url, '_blank', 'noopener,noreferrer');
        setConfirmModalData(res.data);
        setActionAlert({
          type: 'success',
          message: `WhatsApp chat re-opened for ${res.data.recipient || 'resident'}! Please press Send in WhatsApp and confirm below.`
        });
      } else {
        setActionAlert({ type: 'warning', message: `Retry status: ${res.data.error_details || 'Could not open WhatsApp'}` });
      }
      fetchLogs();
      fetchStats();
      fetchRecords();
    } catch (err) {
      setActionAlert({ type: 'danger', message: err.response?.data?.detail || 'Failed to retry reminder.' });
    }
  };

  // Admin Confirms Message was Sent in WhatsApp
  const handleConfirmSent = async (logId) => {
    try {
      setConfirmingSend(true);
      const res = await api.post(`/admin/rent/reminders/${logId}/confirm-sent`);
      setActionAlert({
        type: 'success',
        message: `✓ Status updated: ${res.data.message || 'Reminder marked as Confirmed Sent.'}`
      });
      setConfirmModalData(null);
      fetchStats();
      fetchRecords();
      if (activeTab === 'logs') fetchLogs();
    } catch (err) {
      setActionAlert({
        type: 'danger',
        message: 'Failed to record send confirmation: ' + (err.response?.data?.detail || err.message)
      });
    } finally {
      setConfirmingSend(false);
    }
  };

  // Trigger Daily Scheduler Job on-demand
  const handleRunDailyJobNow = async () => {
    try {
      setRunningJob(true);
      const res = await api.post('/admin/rent/scheduler/run-now?allow_overdue=true');
      const r = res.data.report;
      setActionAlert({
        type: 'success',
        message: `Automated rent check completed! Records created: ${r.records_created}, Reminders evaluated: ${r.reminders_evaluated}, Reminders sent: ${r.reminders_sent}, Failed: ${r.reminders_failed}, Skipped (Cooldown): ${r.reminders_skipped_already_sent}.`
      });
      fetchStats();
      fetchRecords();
      if (activeTab === 'logs') fetchLogs();
    } catch (err) {
      setActionAlert({ type: 'danger', message: 'Failed to execute scheduled job: ' + (err.response?.data?.detail || err.message) });
    } finally {
      setRunningJob(false);
    }
  };

  // Manually sync/generate monthly records
  const handleSyncRecords = async () => {
    try {
      setSyncingRecords(true);
      const res = await api.post('/admin/rent/sync-records');
      setActionAlert({
        type: 'success',
        message: `${res.data.message} Total active resident allocations: ${res.data.active_allocations_count}.`
      });
      fetchStats();
      fetchRecords();
    } catch (err) {
      setActionAlert({ type: 'danger', message: 'Failed to sync records: ' + (err.response?.data?.detail || err.message) });
    } finally {
      setSyncingRecords(false);
    }
  };

  // Save Settings
  const handleSaveSettings = async (e) => {
    e.preventDefault();
    const cleanPhone = (settings.admin_whatsapp_number || '').replace(/\D/g, '');
    if (cleanPhone.length !== 10) {
      setAdminPhoneError(`Admin WhatsApp number must be exactly 10 digits for Indian mobile numbers (entered ${cleanPhone.length} digits).`);
      return;
    }
    setAdminPhoneError('');

    try {
      setSavingSettings(true);
      await api.put('/admin/rent/settings', {
        ...settings,
        admin_whatsapp_number: cleanPhone
      });
      setActionAlert({ type: 'success', message: 'Automated rent policy and Admin WhatsApp Number saved successfully!' });
      fetchSettings();
      fetchStats();
    } catch (err) {
      setActionAlert({ type: 'danger', message: 'Failed to save settings: ' + (err.response?.data?.detail || err.message) });
    } finally {
      setSavingSettings(false);
    }
  };

  // Month selector options (Last 6 months + Next 2 months)
  const monthOptions = useMemo(() => {
    const list = [];
    const base = new Date();
    for (let i = -6; i <= 2; i++) {
      const d = new Date(base.getFullYear(), base.getMonth() + i, 1);
      const key = d.toISOString().slice(0, 7);
      const label = d.toLocaleString('en-US', { month: 'long', year: 'numeric' });
      list.push({ key, label });
    }
    return list;
  }, []);

  // Status Badge Class Helper
  const getStatusBadge = (status) => {
    switch (status) {
      case 'PAID':
        return <span className="badge bg-success-subtle text-success border border-success-subtle px-2 py-1"><i className="bi bi-check-circle-fill me-1"></i>PAID</span>;
      case 'PARTIALLY_PAID':
        return <span className="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle px-2 py-1"><i className="bi bi-pie-chart-fill me-1"></i>PARTIALLY PAID</span>;
      case 'OVERDUE':
        return <span className="badge bg-danger-subtle text-danger border border-danger-subtle px-2 py-1 animate-pulse"><i className="bi bi-exclamation-triangle-fill me-1"></i>OVERDUE</span>;
      default:
        return <span className="badge bg-secondary-subtle text-secondary border border-secondary-subtle px-2 py-1"><i className="bi bi-clock me-1"></i>PENDING</span>;
    }
  };

  // WhatsApp Status Badge Helper
  const getWhatsAppBadge = (status) => {
    switch (status) {
      case 'CONFIRMED_SENT':
      case 'SENT':
      case 'DELIVERED':
        return <span className="badge bg-success text-white small px-2 py-1"><i className="bi bi-check2-all me-1"></i>CONFIRMED SENT</span>;
      case 'OPENED':
        return <span className="badge bg-primary text-white small px-2 py-1"><i className="bi bi-box-arrow-up-right me-1"></i>OPENED</span>;
      case 'PREPARED':
        return <span className="badge bg-info text-dark small px-2 py-1"><i className="bi bi-file-earmark-text me-1"></i>PREPARED</span>;
      case 'FAILED':
        return <span className="badge bg-danger text-white small px-2 py-1"><i className="bi bi-x-circle me-1"></i>FAILED</span>;
      case 'PENDING':
      case 'QUEUED':
        return <span className="badge bg-warning text-dark small px-2 py-1"><i className="bi bi-clock me-1"></i>PENDING</span>;
      default:
        return <span className="badge bg-light text-muted border small px-2 py-1">Not Sent</span>;
    }
  };

  return (
    <div className="d-flex flex-column gap-3">
      {/* Top Header Card: Title + Month Selector + Action Buttons (Well-Structured) */}
      <div className="bg-white p-3 p-md-4 rounded-4 border shadow-sm">
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
          <div>
            <h4 className="fw-bold mb-0 text-dark">Rent Management</h4>
            <div className="text-secondary small">Monthly dues, payments, and WhatsApp reminders</div>
          </div>
          <span className="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle px-2.5 py-1 fw-semibold">
            Automated ERP
          </span>
        </div>

        {/* Structured Row: Month Selector on Left, Action Buttons on Right */}
        <div className="d-flex flex-column flex-sm-row justify-content-between align-items-stretch align-items-sm-center gap-2 pt-2 border-top">
          <div className="d-flex align-items-center gap-2 bg-light px-3 py-1.5 rounded-3 border">
            <i className="bi bi-calendar3 text-primary"></i>
            <span className="small text-muted fw-semibold text-nowrap">Month:</span>
            <select
              className="form-select form-select-sm border-0 bg-transparent fw-bold text-dark py-0 ps-1"
              style={{ cursor: 'pointer', minHeight: 'auto' }}
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
            >
              <option value="ALL">All Months</option>
              {monthOptions.map((m) => (
                <option key={m.key} value={m.key}>
                  {m.label} {m.key === currentMonthKey ? '(Current)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="d-flex gap-2">
            <button
              onClick={handleRunDailyJobNow}
              disabled={runningJob}
              className="btn btn-sm btn-outline-primary d-flex align-items-center justify-content-center gap-1.5 flex-fill px-3 py-1.5"
              title="Runs daily automated check"
            >
              {runningJob ? (
                <span className="spinner-border spinner-border-sm" role="status"></span>
              ) : (
                <i className="bi bi-play-circle-fill"></i>
              )}
              <span>Auto Check</span>
            </button>

            <button
              onClick={handleSyncRecords}
              disabled={syncingRecords}
              className="btn btn-sm btn-outline-secondary d-flex align-items-center justify-content-center gap-1.5 flex-fill px-3 py-1.5"
              title="Sync active resident records"
            >
              {syncingRecords ? (
                <span className="spinner-border spinner-border-sm" role="status"></span>
              ) : (
                <i className="bi bi-arrow-repeat"></i>
              )}
              <span>Sync Records</span>
            </button>
          </div>
        </div>
      </div>

      {/* Action Notification Alert */}
      {actionAlert && (
        <div className={`alert alert-${actionAlert.type} alert-dismissible fade show mb-0 shadow-xs`} role="alert">
          <div className="d-flex align-items-center gap-2">
            <i className={`bi bi-${actionAlert.type === 'success' ? 'check-circle-fill' : actionAlert.type === 'warning' ? 'exclamation-circle-fill' : 'info-circle-fill'}`}></i>
            <div className="small fw-semibold">{actionAlert.message}</div>
          </div>
          <button type="button" className="btn-close" onClick={() => setActionAlert(null)}></button>
        </div>
      )}

      {/* Clean WhatsApp Status Card */}
      <div className="bg-white p-3 rounded-4 border shadow-sm d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-2.5">
        <div className="d-flex align-items-center gap-2.5">
          <div
            className="rounded-circle d-flex align-items-center justify-content-center text-white flex-shrink-0"
            style={{ width: '38px', height: '38px', backgroundColor: '#25D366' }}
          >
            <i className="bi bi-whatsapp fs-5"></i>
          </div>
          <div>
            <div className="d-flex flex-wrap align-items-center gap-2">
              <span className="fw-bold text-dark small">WhatsApp Chat Active</span>
              <span className="badge bg-success-subtle text-success border border-success-subtle px-2 py-0.5" style={{ fontSize: '0.65rem' }}>
                wa.me
              </span>
              {settings.admin_whatsapp_number && (
                <span className="badge bg-light text-secondary border px-2 py-0.5" style={{ fontSize: '0.65rem' }}>
                  +91 {settings.admin_whatsapp_number}
                </span>
              )}
            </div>
            <div className="text-muted small" style={{ fontSize: '0.75rem' }}>
              Prefilled payment reminder messages via WhatsApp
            </div>
          </div>
        </div>

        <button
          onClick={() => {
            setActiveTab('settings');
            smartScrollTo('#rent-automation-settings', { offset: 90, delay: 100, focusFirstInput: true });
          }}
          className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1.5 px-3 py-1.5 align-self-start align-self-sm-center"
        >
          <i className="bi bi-gear"></i>
          <span>Settings</span>
        </button>
      </div>

      {/* 8 Metric KPI Cards in Clean Structured 4x2 Grid (2-column on mobile, 4-column on desktop) */}
      <div className="row g-2.5 g-md-3">
        {/* Card 1: Active Residents -> Navigates to /admin/residents */}
        <div className="col-6 col-md-3">
          <div
            onClick={() => navigate('/admin/residents')}
            className="stat-box stat-box-interactive border-top-primary h-100"
            title="Click to view all active residents and room allocations"
            role="button"
            tabIndex={0}
          >
            <div className="d-flex justify-content-between align-items-center mb-1">
              <span className="small text-muted fw-semibold">Active Residents</span>
              <i className="bi bi-people text-primary fs-6"></i>
            </div>
            <h4 className="fw-bold mb-0 text-dark">{stats?.total_active_residents || 0}</h4>
            <div className="d-flex justify-content-between align-items-center text-muted small mt-1" style={{ fontSize: '0.72rem' }}>
              <span>Allocated beds</span>
              <span className="text-primary fw-semibold">View &rarr;</span>
            </div>
          </div>
        </div>

        {/* Card 2: Rent Expected -> Filters ALL residents for selected month */}
        <div className="col-6 col-md-3">
          <div
            onClick={() => {
              setActiveTab('records');
              setStatusFilter('ALL');
              setActiveFilterTitle(`Rent Expected — All Residents (${stats?.month_name || selectedMonth})`);
              smartScrollTo('#rent-tabs-section', { offset: 90 });
            }}
            className={`stat-box stat-box-interactive border-top-info h-100 ${statusFilter === 'ALL' && activeFilterTitle ? 'active-filter-card' : ''}`}
            title="Click to show all expected rent obligations for this month"
            role="button"
            tabIndex={0}
          >
            <div className="d-flex justify-content-between align-items-center mb-1">
              <span className="small text-muted fw-semibold">Rent Expected</span>
              <i className="bi bi-currency-rupee text-info fs-6"></i>
            </div>
            <h4 className="fw-bold mb-0 text-dark">₹{(stats?.expected_rent || 0).toLocaleString()}</h4>
            <div className="d-flex justify-content-between align-items-center text-muted small mt-1" style={{ fontSize: '0.72rem' }}>
              <span>{stats?.month_name || 'This month'}</span>
              <span className="text-info fw-semibold">Filter &rarr;</span>
            </div>
          </div>
        </div>

        {/* Card 3: Rent Collected -> Filters residents with amount_paid > 0 */}
        <div className="col-6 col-md-3">
          <div
            onClick={() => {
              setActiveTab('records');
              setStatusFilter('COLLECTED');
              setActiveFilterTitle(`Rent Collected — Paid & Partial Payments (${stats?.month_name || selectedMonth})`);
              smartScrollTo('#rent-tabs-section', { offset: 90 });
            }}
            className={`stat-box stat-box-interactive border-top-success h-100 ${statusFilter === 'COLLECTED' ? 'active-filter-card' : ''}`}
            title="Click to show residents who made payments this month"
            role="button"
            tabIndex={0}
          >
            <div className="d-flex justify-content-between align-items-center mb-1">
              <span className="small text-muted fw-semibold">Rent Collected</span>
              <i className="bi bi-cash-stack text-success fs-6"></i>
            </div>
            <h4 className="fw-bold mb-0 text-success">₹{(stats?.collected_rent || 0).toLocaleString()}</h4>
            <div className="d-flex justify-content-between align-items-center text-success fw-semibold small mt-1" style={{ fontSize: '0.72rem' }}>
              <span>
                {stats?.expected_rent > 0
                  ? `${Math.round((stats.collected_rent / stats.expected_rent) * 100)}% collected`
                  : '100%'}
              </span>
              <span>Filter &rarr;</span>
            </div>
          </div>
        </div>

        {/* Card 4: Outstanding Rent -> Filters residents with balance_due > 0 */}
        <div className="col-6 col-md-3">
          <div
            onClick={() => {
              setActiveTab('records');
              setStatusFilter('OUTSTANDING');
              setActiveFilterTitle(`Outstanding Rent — Unsettled Balances (${stats?.month_name || selectedMonth})`);
              smartScrollTo('#rent-tabs-section', { offset: 90 });
            }}
            className={`stat-box stat-box-interactive border-top-danger h-100 ${statusFilter === 'OUTSTANDING' ? 'active-filter-card' : ''}`}
            title="Click to show residents with unpaid or remaining balances"
            role="button"
            tabIndex={0}
          >
            <div className="d-flex justify-content-between align-items-center mb-1">
              <span className="small text-muted fw-semibold">Outstanding</span>
              <i className="bi bi-wallet2 text-danger fs-6"></i>
            </div>
            <h4 className="fw-bold mb-0 text-danger">₹{(stats?.outstanding_rent || 0).toLocaleString()}</h4>
            <div className="d-flex justify-content-between align-items-center text-muted small mt-1" style={{ fontSize: '0.72rem' }}>
              <span>Pending balance</span>
              <span className="text-danger fw-semibold">Filter &rarr;</span>
            </div>
          </div>
        </div>

        {/* Row 2 */}
        {/* Card 5: Paid Residents -> Filters status=PAID */}
        <div className="col-6 col-md-3">
          <div
            onClick={() => {
              setActiveTab('records');
              setStatusFilter('PAID');
              setActiveFilterTitle(`Paid Residents — Fully Settled (${stats?.month_name || selectedMonth})`);
              smartScrollTo('#rent-tabs-section', { offset: 90 });
            }}
            className={`stat-box stat-box-interactive border-top-success h-100 ${statusFilter === 'PAID' ? 'active-filter-card' : ''}`}
            title="Click to show only fully settled residents"
            role="button"
            tabIndex={0}
          >
            <div className="d-flex justify-content-between align-items-center mb-1">
              <span className="small text-muted fw-semibold">Paid Residents</span>
              <span className="badge bg-success rounded-pill px-2">{stats?.paid_residents || 0}</span>
            </div>
            <h4 className="fw-bold mb-0 text-success">{stats?.paid_residents || 0}</h4>
            <div className="d-flex justify-content-between align-items-center text-muted small mt-1" style={{ fontSize: '0.72rem' }}>
              <span>Fully settled</span>
              <span className="text-success fw-semibold">Filter &rarr;</span>
            </div>
          </div>
        </div>

        {/* Card 6: Pending / Partial -> Filters status in (PENDING, PARTIALLY_PAID) */}
        <div className="col-6 col-md-3">
          <div
            onClick={() => {
              setActiveTab('records');
              setStatusFilter('PENDING_OR_PARTIAL');
              setActiveFilterTitle(`Pending & Partial Rent (${stats?.month_name || selectedMonth})`);
              smartScrollTo('#rent-tabs-section', { offset: 90 });
            }}
            className={`stat-box stat-box-interactive border-top-warning h-100 ${statusFilter === 'PENDING_OR_PARTIAL' ? 'active-filter-card' : ''}`}
            title="Click to show pending and partially paid residents"
            role="button"
            tabIndex={0}
          >
            <div className="d-flex justify-content-between align-items-center mb-1">
              <span className="small text-muted fw-semibold">Pending / Partial</span>
              <span className="badge bg-warning text-dark rounded-pill px-2">
                {(stats?.pending_residents || 0) + (stats?.partially_paid_residents || 0)}
              </span>
            </div>
            <h4 className="fw-bold mb-0 text-warning">
              {(stats?.pending_residents || 0) + (stats?.partially_paid_residents || 0)}
            </h4>
            <div className="d-flex justify-content-between align-items-center text-muted small mt-1" style={{ fontSize: '0.72rem' }}>
              <span>{stats?.partially_paid_residents || 0} part • {stats?.pending_residents || 0} due</span>
              <span className="text-warning-emphasis fw-semibold">Filter &rarr;</span>
            </div>
          </div>
        </div>

        {/* Card 7: Overdue Payments -> Filters status=OVERDUE */}
        <div className="col-6 col-md-3">
          <div
            onClick={() => {
              setActiveTab('records');
              setStatusFilter('OVERDUE');
              setActiveFilterTitle(`Overdue Rent — Immediate Follow-up (${stats?.month_name || selectedMonth})`);
              smartScrollTo('#rent-tabs-section', { offset: 90 });
            }}
            className={`stat-box stat-box-interactive border-top-danger h-100 ${statusFilter === 'OVERDUE' ? 'active-filter-card' : ''}`}
            title="Click to show residents with overdue rent past due date"
            role="button"
            tabIndex={0}
          >
            <div className="d-flex justify-content-between align-items-center mb-1">
              <span className="small text-muted fw-semibold">Overdue</span>
              <span className="badge bg-danger rounded-pill px-2">{stats?.overdue_residents || 0}</span>
            </div>
            <h4 className="fw-bold mb-0 text-danger">{stats?.overdue_residents || 0}</h4>
            <div className="d-flex justify-content-between align-items-center text-danger fw-semibold small mt-1" style={{ fontSize: '0.72rem' }}>
              <span>₹{(stats?.overdue_amount || 0).toLocaleString()} overdue</span>
              <span>Filter &rarr;</span>
            </div>
          </div>
        </div>

        {/* Card 8: WhatsApp Sent / Failed -> Switches to Reminder Logs tab */}
        <div className="col-6 col-md-3">
          <div
            onClick={() => {
              setActiveTab('logs');
              smartScrollTo('#rent-tabs-section', { offset: 90 });
            }}
            className={`stat-box stat-box-interactive h-100 ${activeTab === 'logs' ? 'active-filter-card' : ''}`}
            style={{ borderTop: '3px solid #25D366 !important' }}
            title="Click to open WhatsApp delivery history & retry logs"
            role="button"
            tabIndex={0}
          >
            <div className="d-flex justify-content-between align-items-center mb-1">
              <span className="small text-muted fw-semibold">WhatsApp Sent</span>
              <i className="bi bi-whatsapp text-success fs-6"></i>
            </div>
            <h4 className="fw-bold mb-0 text-dark">
              {stats?.reminders_sent || 0}
            </h4>
            <div className="d-flex justify-content-between align-items-center text-muted small mt-1" style={{ fontSize: '0.72rem' }}>
              <span>{stats?.reminders_failed || 0} Failed</span>
              <span className="text-success fw-semibold">Logs &rarr;</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation (Scrollable on small mobile) */}
      <div id="rent-tabs-section" className="bg-white rounded-4 border shadow-sm overflow-hidden">
        <div className="d-flex border-bottom bg-light px-2.5 pt-1.5 gap-1 overflow-x-auto text-nowrap" style={{ scrollbarWidth: 'none' }}>
          <button
            onClick={() => {
              setActiveTab('records');
              smartScrollTo('#rent-tabs-section', { offset: 90 });
            }}
            className={`btn btn-sm border-0 rounded-top-3 px-3 py-1.5 fw-semibold ${
              activeTab === 'records'
                ? 'bg-white text-primary border-top border-start border-end shadow-xs'
                : 'text-muted hover-bg-light'
            }`}
            style={{ fontSize: '0.8rem', minHeight: '34px' }}
          >
            <i className="bi bi-table me-1"></i> Rent Payments
          </button>

          <button
            onClick={() => {
              setActiveTab('logs');
              smartScrollTo('#rent-tabs-section', { offset: 90 });
            }}
            className={`btn btn-sm border-0 rounded-top-3 px-3 py-1.5 fw-semibold ${
              activeTab === 'logs'
                ? 'bg-white text-primary border-top border-start border-end shadow-xs'
                : 'text-muted hover-bg-light'
            }`}
            style={{ fontSize: '0.8rem', minHeight: '34px' }}
          >
            <i className="bi bi-clock-history me-1"></i> Reminder Logs
          </button>

          <button
            onClick={() => {
              setActiveTab('settings');
              smartScrollTo('#rent-automation-settings', { offset: 90, delay: 100 });
            }}
            className={`btn btn-sm border-0 rounded-top-3 px-3 py-1.5 fw-semibold ${
              activeTab === 'settings'
                ? 'bg-white text-primary border-top border-start border-end shadow-xs'
                : 'text-muted hover-bg-light'
            }`}
            style={{ fontSize: '0.8rem', minHeight: '34px' }}
          >
            <i className="bi bi-gear-fill me-1"></i> Settings
          </button>
        </div>

        {/* TAB 1: Main Resident Rent Table */}
        {activeTab === 'records' && (
          <div className="p-2.5 p-md-3 d-flex flex-column gap-2.5">
            {/* Active Card Filter Banner (Shown when admin clicked a dashboard card) */}
            {activeFilterTitle && (
              <div className="d-flex align-items-center justify-content-between p-2.5 rounded-3 bg-primary-subtle border border-primary-subtle shadow-xs">
                <div className="d-flex align-items-center gap-2">
                  <span className="badge bg-primary px-2.5 py-1 fw-bold">Active Filter</span>
                  <span className="small fw-bold text-primary-emphasis">{activeFilterTitle}</span>
                  <span className="badge bg-white text-dark border px-2 py-0.5 small">{totalRecords} records</span>
                </div>
                <button
                  onClick={() => {
                    setStatusFilter('ALL');
                    setActiveFilterTitle('');
                    setRoomFilter('');
                    setSearch('');
                  }}
                  className="btn btn-xs btn-outline-primary d-flex align-items-center gap-1 px-2.5 py-1 fw-semibold bg-white"
                  title="Clear filter and show all records"
                >
                  <i className="bi bi-x-circle"></i>
                  <span>Clear Filter</span>
                </button>
              </div>
            )}

            {/* Filter Bar */}
            <div className="row g-1.5 align-items-center">
              <div className="col-12 col-md-4">
                <div className="input-group input-group-sm">
                  <span className="input-group-text bg-white border-end-0">
                    <i className="bi bi-search text-muted small"></i>
                  </span>
                  <input
                    type="text"
                    className="form-control border-start-0 ps-0"
                    placeholder="Search resident, ID, or phone..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    style={{ minHeight: '36px' }}
                  />
                  {search && (
                    <button className="btn btn-outline-secondary" onClick={() => setSearch('')}>
                      <i className="bi bi-x"></i>
                    </button>
                  )}
                </div>
              </div>

              <div className="col-6 col-md-3">
                <select
                  className="form-select form-select-sm"
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    if (e.target.value === 'ALL') setActiveFilterTitle('');
                    else if (e.target.value === 'OVERDUE') setActiveFilterTitle('Overdue Rent');
                    else if (e.target.value === 'PAID') setActiveFilterTitle('Paid Residents');
                    else if (e.target.value === 'OUTSTANDING') setActiveFilterTitle('Outstanding Rent');
                    else if (e.target.value === 'COLLECTED') setActiveFilterTitle('Rent Collected');
                    else if (e.target.value === 'PENDING_OR_PARTIAL') setActiveFilterTitle('Pending / Partial Rent');
                    else setActiveFilterTitle(`Status: ${e.target.value}`);
                  }}
                  style={{ minHeight: '36px' }}
                >
                  <option value="ALL">Status: All</option>
                  <option value="OVERDUE">Overdue Only</option>
                  <option value="OUTSTANDING">Outstanding Balance (&gt; ₹0)</option>
                  <option value="COLLECTED">Collected Payments</option>
                  <option value="PENDING_OR_PARTIAL">Pending / Partial</option>
                  <option value="PAID">Fully Paid</option>
                  <option value="PENDING">Pending (Not Due)</option>
                  <option value="PARTIALLY_PAID">Partially Paid</option>
                </select>
              </div>

              <div className="col-6 col-md-3">
                <select
                  className="form-select form-select-sm"
                  value={roomFilter}
                  onChange={(e) => setRoomFilter(e.target.value)}
                  style={{ minHeight: '36px' }}
                >
                  <option value="">Rooms: All</option>
                  {rooms.map((rm) => (
                    <option key={rm.id} value={rm.room_number}>
                      Room {rm.room_number}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-12 col-md-2 text-md-end">
                <button
                  onClick={() => {
                    fetchStats();
                    fetchRecords();
                  }}
                  className="btn btn-sm btn-outline-secondary w-100 d-flex align-items-center justify-content-center gap-1"
                  style={{ minHeight: '36px' }}
                >
                  <i className="bi bi-arrow-clockwise"></i>
                  <span>Refresh</span>
                </button>
              </div>
            </div>

            {/* Table */}
            {loading ? (
              <div className="text-center py-5">
                <div className="spinner-border text-primary" role="status"></div>
                <p className="text-muted small mt-2">Loading rent records from PostgreSQL...</p>
              </div>
            ) : records.length === 0 ? (
              <div className="text-center py-5 border rounded-3 bg-light">
                <i className="bi bi-inbox text-muted fs-1 d-block mb-2"></i>
                <h6 className="fw-bold">No rent records found for this criteria.</h6>
                <p className="text-secondary small mb-3">
                  Click 'Sync Month Records' to generate billing cycles for active residents.
                </p>
                <button onClick={handleSyncRecords} className="btn btn-sm btn-primary">
                  <i className="bi bi-arrow-repeat me-1"></i>Sync Records Now
                </button>
              </div>
            ) : (
              <>
                {/* Mobile Card List View (d-md-none) */}
                <div className="d-md-none d-flex flex-column gap-2">
              {records.map((r) => (
                <div
                  key={r.id}
                  className="bg-white p-3 rounded-3 border shadow-xs d-flex flex-column gap-2"
                  style={{
                    borderLeft: r.payment_status === 'OVERDUE'
                      ? '4px solid #EF4444'
                      : r.payment_status === 'PAID'
                      ? '4px solid #10B981'
                      : r.payment_status === 'PARTIALLY_PAID'
                      ? '4px solid #F59E0B'
                      : '4px solid #94A3B8'
                  }}
                >
                  {/* Top Row: Resident Name, Code & Status */}
                  <div className="d-flex justify-content-between align-items-start gap-1">
                    <div
                      onClick={() => handleOpenHistoryModal(r)}
                      role="button"
                      tabIndex={0}
                      className="cursor-pointer flex-grow-1"
                    >
                      <div className="fw-bold text-dark text-truncate fs-6">{r.resident_name}</div>
                      <div className="d-flex align-items-center gap-1.5 flex-wrap">
                        <span className="badge bg-light text-dark border font-monospace" style={{ fontSize: '0.68rem' }}>
                          {r.resident_code}
                        </span>
                        <span className="text-muted small" style={{ fontSize: '0.75rem' }}>
                          Rm {r.room_number} • Bed {r.bed_number}
                        </span>
                      </div>
                    </div>
                    <div className="text-end flex-shrink-0">
                      {getStatusBadge(r.payment_status)}
                    </div>
                  </div>

                  {/* Financial Metrics Strip */}
                  <div
                    onClick={() => handleOpenHistoryModal(r)}
                    role="button"
                    tabIndex={0}
                    className="p-2 bg-light rounded-2 border d-flex justify-content-between align-items-center cursor-pointer"
                  >
                    <div>
                      <div className="text-muted" style={{ fontSize: '0.68rem' }}>Total Rent</div>
                      <div className="fw-bold text-dark small">₹{r.rent_amount.toLocaleString()}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-muted" style={{ fontSize: '0.68rem' }}>Paid</div>
                      <div className="fw-semibold text-success small">₹{r.amount_paid.toLocaleString()}</div>
                    </div>
                    <div className="text-end">
                      <div className="text-muted" style={{ fontSize: '0.68rem' }}>Balance Due</div>
                      <div className={`fw-bold small ${r.balance_due > 0 ? 'text-danger' : 'text-success'}`}>
                        ₹{r.balance_due.toLocaleString()}
                      </div>
                    </div>
                  </div>

                  {/* Timing & WhatsApp Info */}
                  <div className="d-flex justify-content-between align-items-center text-muted" style={{ fontSize: '0.72rem' }}>
                    <div>
                      <span>Due: <strong className="text-dark">{r.due_date_formatted}</strong></span>
                      {r.days_overdue > 0 && (
                        <span className="text-danger fw-bold ms-1">({r.days_overdue}d overdue)</span>
                      )}
                    </div>
                    <div>
                      {getWhatsAppBadge(r.latest_reminder_status)}
                    </div>
                  </div>

                  {/* Action Buttons Row */}
                  <div className="d-flex gap-1.5 pt-1 border-top">
                    {r.balance_due > 0 && (
                      <button
                        onClick={() => handleOpenPaymentModal(r)}
                        className="btn btn-sm btn-success d-flex align-items-center justify-content-center gap-1 flex-fill py-1.5 fw-semibold"
                        style={{ minHeight: '36px' }}
                      >
                        <i className="bi bi-credit-card"></i>
                        <span>Pay ₹{r.balance_due.toLocaleString()}</span>
                      </button>
                    )}

                    <button
                      onClick={() => handleSendReminder(r)}
                      className="btn btn-sm btn-outline-success d-flex align-items-center justify-content-center gap-1 flex-fill py-1.5"
                      style={{ minHeight: '36px' }}
                      title="Send WhatsApp Reminder"
                    >
                      <i className="bi bi-whatsapp"></i>
                      <span>Remind</span>
                    </button>

                    <button
                      onClick={() => handleOpenHistoryModal(r)}
                      className="btn btn-sm btn-outline-secondary d-flex align-items-center justify-content-center gap-1 flex-fill py-1.5"
                      style={{ minHeight: '36px' }}
                      title="View Rent Details & History"
                    >
                      <i className="bi bi-eye"></i>
                      <span>Details</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View (d-none d-md-block) */}
            <div className="table-responsive d-none d-md-block">
              <table className="table table-hover align-middle small mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Resident ID & Name</th>
                    <th>Room & Bed</th>
                    <th>Rent Month</th>
                    <th className="text-end">Rent</th>
                    <th>Due Date</th>
                    <th className="text-end">Paid</th>
                    <th className="text-end">Balance Due</th>
                    <th>Payment Status</th>
                    <th>WhatsApp Status</th>
                    <th className="text-center" style={{ minWidth: '150px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((r) => (
                    <tr key={r.id}>
                      <td
                        onClick={() => handleOpenHistoryModal(r)}
                        style={{ cursor: 'pointer' }}
                        title="Click to view full details"
                      >
                        <div className="fw-bold text-dark">{r.resident_name}</div>
                        <div className="d-flex align-items-center gap-2">
                          <span className="badge bg-light text-dark border font-monospace" style={{ fontSize: '0.72rem' }}>
                            {r.resident_code}
                          </span>
                          <a
                            href={`https://wa.me/${r.resident_phone.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-decoration-none text-muted small"
                            title="Click to chat on WhatsApp"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <i className="bi bi-telephone text-success me-1"></i>
                            {r.resident_phone}
                          </a>
                        </div>
                      </td>

                      <td>
                        <div className="fw-semibold text-dark">Room {r.room_number}</div>
                        <div className="text-muted small">Bed: <span className="badge bg-secondary-subtle text-secondary">{r.bed_number}</span></div>
                      </td>

                      <td>
                        <span className="fw-semibold text-dark">{r.rent_month}</span>
                        <div className="text-muted" style={{ fontSize: '0.7rem' }}>Cycle: {r.billing_cycle_start} to {r.billing_cycle_end}</div>
                      </td>

                      <td className="text-end fw-bold text-dark">
                        ₹{r.rent_amount.toLocaleString()}
                      </td>

                      <td>
                        <div className="fw-semibold">{r.due_date_formatted}</div>
                        {r.days_overdue > 0 && (
                          <div className="text-danger fw-bold" style={{ fontSize: '0.7rem' }}>
                            <i className="bi bi-clock-history me-1"></i>{r.days_overdue} days overdue
                          </div>
                        )}
                      </td>

                      <td className="text-end fw-semibold text-success">
                        ₹{r.amount_paid.toLocaleString()}
                      </td>

                      <td className="text-end fw-bold text-danger">
                        ₹{r.balance_due.toLocaleString()}
                      </td>

                      <td>
                        {getStatusBadge(r.payment_status)}
                      </td>

                      <td>
                        <div className="d-flex flex-column gap-1">
                          {getWhatsAppBadge(r.latest_reminder_status)}
                          {r.reminder_count > 0 && (
                            <span className="text-muted" style={{ fontSize: '0.68rem' }}>
                              Sent: {r.reminder_count} time(s)
                            </span>
                          )}
                        </div>
                      </td>

                      <td>
                        <div className="d-flex justify-content-center align-items-center gap-1.5" style={{ minWidth: '140px' }}>
                          {/* Record Payment Button */}
                          {r.balance_due > 0 ? (
                            <button
                              onClick={() => handleOpenPaymentModal(r)}
                              className="btn btn-sm btn-success d-flex align-items-center gap-1 px-2.5 py-1.5 shadow-xs fw-semibold"
                              style={{ minHeight: '38px' }}
                              title="Record a payment receipt"
                            >
                              <i className="bi bi-credit-card"></i>
                              <span>Pay</span>
                            </button>
                          ) : (
                            <span className="badge bg-success-subtle text-success py-1.5 px-2">Settled</span>
                          )}

                          {/* Send WhatsApp Reminder Button */}
                          <button
                            onClick={() => handleSendReminder(r)}
                            className="btn btn-sm btn-outline-success d-flex align-items-center justify-content-center px-2 py-1.5 shadow-xs"
                            style={{ minHeight: '38px', minWidth: '38px' }}
                            title="Send or retry WhatsApp reminder"
                          >
                            <i className="bi bi-whatsapp fs-6"></i>
                          </button>

                          {/* View History & Details Button */}
                          <button
                            onClick={() => handleOpenHistoryModal(r)}
                            className="btn btn-sm btn-outline-secondary d-flex align-items-center justify-content-center px-2 py-1.5 shadow-xs"
                            style={{ minHeight: '38px', minWidth: '38px' }}
                            title="View payment transactions and reminder history"
                          >
                            <i className="bi bi-receipt fs-6"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

            {/* Pagination */}
            {totalRecords > limit && (
              <div className="d-flex justify-content-between align-items-center pt-3 border-top">
                <span className="small text-muted">
                  Showing {(page - 1) * limit + 1} to {Math.min(page * limit, totalRecords)} of {totalRecords} records
                </span>
                <div className="d-flex gap-1">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage(page - 1)}
                    className="btn btn-sm btn-outline-secondary"
                  >
                    Previous
                  </button>
                  <span className="btn btn-sm btn-light disabled fw-bold px-3">
                    Page {page}
                  </span>
                  <button
                    disabled={page * limit >= totalRecords}
                    onClick={() => setPage(page + 1)}
                    className="btn btn-sm btn-outline-secondary"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: WhatsApp Reminder Logs */}
        {activeTab === 'logs' && (
          <div className="p-4 d-flex flex-column gap-3">
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-2">
              <h6 className="fw-bold mb-0">WhatsApp Delivery History & Meta API Audit Log</h6>
              <div className="d-flex align-items-center gap-2">
                <select
                  className="form-select form-select-sm"
                  style={{ width: 'auto' }}
                  value={logStatusFilter}
                  onChange={(e) => setLogStatusFilter(e.target.value)}
                >
                  <option value="ALL">All Delivery Statuses</option>
                  <option value="SENT">Sent</option>
                  <option value="DELIVERED">Delivered</option>
                  <option value="FAILED">Failed</option>
                </select>
                <button onClick={fetchLogs} className="btn btn-sm btn-outline-secondary">
                  <i className="bi bi-arrow-clockwise"></i>
                </button>
              </div>
            </div>

            {logsLoading ? (
              <div className="text-center py-5">
                <div className="spinner-border text-primary" role="status"></div>
                <p className="text-muted small mt-2">Loading WhatsApp reminder delivery logs...</p>
              </div>
            ) : reminderLogs.length === 0 ? (
              <div className="text-center py-5 border rounded-3 bg-light">
                <i className="bi bi-chat-left-dots text-muted fs-1 d-block mb-2"></i>
                <p className="text-muted small mb-0">No WhatsApp reminder attempts logged yet.</p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover align-middle small mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Resident & ID</th>
                      <th>Phone Number</th>
                      <th>Rent Month</th>
                      <th>Outstanding Balance</th>
                      <th>Status</th>
                      <th>Message Preview</th>
                      <th>Attempted At</th>
                      <th>Log Details</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reminderLogs.map((log) => (
                      <tr key={log.id}>
                        <td>
                          <div className="fw-bold text-dark">{log.resident_name}</div>
                          <span className="badge bg-light text-dark border font-monospace" style={{ fontSize: '0.72rem' }}>
                            {log.resident_code || 'N/A'}
                          </span>
                        </td>
                        <td className="font-monospace">{log.phone_number}</td>
                        <td className="fw-semibold">{log.rent_month}</td>
                        <td>
                          <span className="fw-bold text-danger">
                            ₹{log.outstanding_amount !== undefined && log.outstanding_amount !== null ? Number(log.outstanding_amount).toLocaleString() : '—'}
                          </span>
                        </td>
                        <td>{getWhatsAppBadge(log.delivery_status)}</td>
                        <td>
                          <div
                            className="text-truncate text-secondary"
                            style={{ maxWidth: '200px', cursor: 'pointer' }}
                            title={log.message_text}
                          >
                            {log.message_text}
                          </div>
                        </td>
                        <td>
                          {log.attempted_at ? new Date(log.attempted_at).toLocaleString() : 'N/A'}
                        </td>
                        <td>
                          {log.error_details && (
                            <div className="small text-muted" style={{ maxWidth: '220px' }}>
                              {log.error_details}
                            </div>
                          )}
                        </td>
                        <td>
                          <div className="d-flex align-items-center gap-1">
                            {log.delivery_status === 'OPENED' && (
                              <>
                                <button
                                  onClick={() => handleConfirmSent(log.id)}
                                  className="btn btn-xs btn-success d-flex align-items-center gap-1 shadow-xs px-2 py-1 text-white"
                                  title="Confirm that you clicked Send in WhatsApp"
                                >
                                  <i className="bi bi-check2"></i>
                                  <span>Confirm Sent</span>
                                </button>
                                <button
                                  onClick={() => handleRetryReminder(log.id)}
                                  className="btn btn-xs btn-outline-primary shadow-xs px-2 py-1"
                                  title="Re-open WhatsApp conversation"
                                >
                                  <i className="bi bi-box-arrow-up-right"></i>
                                </button>
                              </>
                            )}
                            {log.delivery_status === 'FAILED' && (
                              <button
                                onClick={() => handleRetryReminder(log.id)}
                                className="btn btn-xs btn-outline-danger d-flex align-items-center gap-1 shadow-xs px-2 py-1"
                                title="Retry sending this reminder"
                              >
                                <i className="bi bi-arrow-clockwise"></i>
                                <span>Retry</span>
                              </button>
                            )}
                            {['CONFIRMED_SENT', 'SENT', 'DELIVERED'].includes(log.delivery_status) && (
                              <span className="badge bg-success-subtle text-success border border-success-subtle px-2 py-1">
                                <i className="bi bi-check-circle-fill me-1"></i>Sent
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: Automation Settings */}
        {activeTab === 'settings' && (
          <div id="rent-automation-settings" className="p-4" style={{ maxWidth: '750px' }}>
            <h6 className="fw-bold mb-3">Automated Monthly Rent & WhatsApp Configuration</h6>
            <form onSubmit={handleSaveSettings} className="d-flex flex-column gap-3">
              {/* Admin WhatsApp Number Field */}
              <div className="bg-light p-3 rounded-3 border">
                <label className="form-label fw-semibold small text-dark mb-1">
                  Admin WhatsApp Number <span className="text-danger">*</span>
                </label>
                <div className="input-group input-group-sm mb-1" style={{ maxWidth: '320px' }}>
                  <span className="input-group-text bg-white text-muted fw-bold">+91</span>
                  <input
                    type="tel"
                    maxLength="10"
                    placeholder="9876543210"
                    className={`form-control form-control-sm font-monospace fs-6 ${adminPhoneError ? 'is-invalid' : ''}`}
                    value={settings.admin_whatsapp_number || ''}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      setSettings({ ...settings, admin_whatsapp_number: val });
                      if (val.length === 10) setAdminPhoneError('');
                    }}
                  />
                </div>
                {adminPhoneError ? (
                  <div className="text-danger small mt-1">{adminPhoneError}</div>
                ) : (
                  <div className="form-text small">
                    Enter your personal 10-digit mobile number (e.g. <code>9876543210</code>). Included in resident reminder messages as the admin contact for payment confirmation.
                  </div>
                )}
              </div>

              <div className="bg-light p-3 rounded-3 border">
                <label className="form-label fw-semibold small text-dark mb-1">
                  Reminder Frequency Cooldown (Days)
                </label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  className="form-control form-control-sm"
                  value={settings.reminder_frequency_days}
                  onChange={(e) => setSettings({ ...settings, reminder_frequency_days: parseInt(e.target.value) || 1 })}
                />
                <div className="form-text small">
                  Prevents repeated reminders from being sent to the same resident within this many days.
                </div>
              </div>

              <div className="bg-light p-3 rounded-3 border">
                <label className="form-label fw-semibold small text-dark mb-1">
                  Daily Automated Run Hour (IST)
                </label>
                <select
                  className="form-select form-select-sm"
                  value={settings.send_hour_ist}
                  onChange={(e) => setSettings({ ...settings, send_hour_ist: parseInt(e.target.value) || 9 })}
                >
                  <option value="8">08:00 AM IST</option>
                  <option value="9">09:00 AM IST (Recommended)</option>
                  <option value="10">10:00 AM IST</option>
                  <option value="11">11:00 AM IST</option>
                  <option value="18">06:00 PM IST</option>
                </select>
                <div className="form-text small">
                  The automated background scheduler runs every morning at this time to verify dues and dispatch reminders.
                </div>
              </div>

              <div className="bg-light p-3 rounded-3 border">
                <label className="form-label fw-semibold small text-dark mb-1">
                  Approved WhatsApp Template Name
                </label>
                <input
                  type="text"
                  className="form-control form-control-sm font-monospace"
                  value={settings.whatsapp_template_name}
                  onChange={(e) => setSettings({ ...settings, whatsapp_template_name: e.target.value })}
                />
                <div className="form-text small">
                  The WhatsApp Business Cloud API template registered and approved in your Meta Business Suite.
                </div>
              </div>

              <div className="bg-light p-3 rounded-3 border d-flex align-items-center justify-content-between">
                <div>
                  <div className="fw-semibold small text-dark">Automated Due Date Reminder</div>
                  <div className="form-text small mb-0">Automatically dispatch WhatsApp reminders on resident's rent due date.</div>
                </div>
                <div className="form-check form-switch fs-5">
                  <input
                    type="checkbox"
                    className="form-check-input"
                    checked={settings.auto_send_on_due_date}
                    onChange={(e) => setSettings({ ...settings, auto_send_on_due_date: e.target.checked })}
                  />
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={savingSettings}
                  className="btn btn-primary d-flex align-items-center gap-2 px-4 shadow-sm"
                >
                  {savingSettings ? (
                    <span className="spinner-border spinner-border-sm" role="status"></span>
                  ) : (
                    <i className="bi bi-check-lg"></i>
                  )}
                  <span>Save Policy Settings</span>
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* RECORD PAYMENT MODAL */}
      {showPaymentModal && selectedRecord && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1060 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content rounded-4 border-0 shadow-lg overflow-hidden">
              <div className="modal-header bg-dark text-white p-3">
                <h5 className="modal-title fs-6 fw-bold">
                  <i className="bi bi-credit-card-fill text-warning me-2"></i>
                  Record Rent Payment
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowPaymentModal(false)}></button>
              </div>

              <form onSubmit={handleSubmitPayment}>
                <div className="modal-body p-4 d-flex flex-column gap-3">
                  {/* Resident Info Box */}
                  <div className="bg-light p-3 rounded-3 border">
                    <div className="d-flex justify-content-between align-items-start">
                      <div>
                        <div className="fw-bold text-dark">{selectedRecord.resident_name}</div>
                        <div className="text-muted small">
                          ID: <span className="font-monospace fw-bold">{selectedRecord.resident_code}</span> • Room {selectedRecord.room_number} ({selectedRecord.bed_number})
                        </div>
                      </div>
                      <div className="text-end">
                        <span className="badge bg-secondary">{selectedRecord.rent_month}</span>
                      </div>
                    </div>

                    <div className="row g-2 mt-2 pt-2 border-top small">
                      <div className="col-4">
                        <span className="text-muted">Total Rent:</span>
                        <div className="fw-bold">₹{selectedRecord.rent_amount.toLocaleString()}</div>
                      </div>
                      <div className="col-4">
                        <span className="text-muted">Paid So Far:</span>
                        <div className="fw-bold text-success">₹{selectedRecord.amount_paid.toLocaleString()}</div>
                      </div>
                      <div className="col-4">
                        <span className="text-muted">Remaining Balance:</span>
                        <div className="fw-bold text-danger">₹{selectedRecord.balance_due.toLocaleString()}</div>
                      </div>
                    </div>
                  </div>

                  {paymentError && (
                    <div className="alert alert-danger py-2 px-3 small mb-0">{paymentError}</div>
                  )}

                  {/* Payment Amount */}
                  <div>
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <label className="form-label fw-bold small text-dark mb-0">Payment Amount (₹) *</label>
                      <button
                        type="button"
                        onClick={() => setPaymentForm({ ...paymentForm, amount: selectedRecord.balance_due.toString() })}
                        className="btn btn-link btn-xs text-primary p-0 text-decoration-none small fw-semibold"
                      >
                        Pay Full Balance (₹{selectedRecord.balance_due.toLocaleString()})
                      </button>
                    </div>
                    <div className="input-group">
                      <span className="input-group-text bg-white fw-bold">₹</span>
                      <input
                        type="number"
                        step="0.01"
                        min="1"
                        max={selectedRecord.balance_due}
                        required
                        className="form-control form-control-lg fw-bold text-success"
                        value={paymentForm.amount}
                        onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                        placeholder="e.g. 6000"
                      />
                    </div>
                    {/* Live balance calculation preview */}
                    {paymentForm.amount && !isNaN(parseFloat(paymentForm.amount)) && (
                      <div className="small mt-1 text-muted">
                        Remaining balance after payment:{' '}
                        <span className="fw-bold text-dark">
                          ₹{Math.max(0, selectedRecord.balance_due - parseFloat(paymentForm.amount)).toLocaleString()}
                        </span>{' '}
                        {parseFloat(paymentForm.amount) >= selectedRecord.balance_due ? (
                          <span className="badge bg-success small">Will be fully PAID</span>
                        ) : (
                          <span className="badge bg-warning text-dark small">Will be PARTIALLY PAID</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Payment Date & Method */}
                  <div className="row g-2">
                    <div className="col-6">
                      <label className="form-label fw-bold small text-dark mb-1">Payment Date *</label>
                      <input
                        type="date"
                        required
                        className="form-control form-control-sm"
                        value={paymentForm.payment_date}
                        onChange={(e) => setPaymentForm({ ...paymentForm, payment_date: e.target.value })}
                      />
                    </div>

                    <div className="col-6">
                      <label className="form-label fw-bold small text-dark mb-1">Payment Method *</label>
                      <select
                        className="form-select form-select-sm"
                        value={paymentForm.payment_method}
                        onChange={(e) => setPaymentForm({ ...paymentForm, payment_method: e.target.value })}
                      >
                        <option value="UPI">UPI (Google Pay, PhonePe, Paytm)</option>
                        <option value="Cash">Cash at Counter</option>
                        <option value="Bank Transfer">Bank Transfer (NEFT/IMPS)</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>

                  {/* Transaction Reference */}
                  <div>
                    <label className="form-label fw-semibold small text-dark mb-1">
                      Transaction Reference / UTR Number (Optional)
                    </label>
                    <input
                      type="text"
                      className="form-control form-control-sm font-monospace"
                      placeholder="e.g. UPI Ref 328947823901 or Cheque No"
                      value={paymentForm.transaction_reference}
                      onChange={(e) => setPaymentForm({ ...paymentForm, transaction_reference: e.target.value })}
                    />
                  </div>

                  {/* Admin Notes */}
                  <div>
                    <label className="form-label fw-semibold small text-dark mb-1">Admin Notes (Optional)</label>
                    <textarea
                      rows="2"
                      className="form-control form-control-sm"
                      placeholder="Any comments, receipt notes, or remarks..."
                      value={paymentForm.notes}
                      onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                    ></textarea>
                  </div>
                </div>

                <div className="modal-footer bg-light p-3">
                  <button
                    type="button"
                    className="btn btn-sm btn-secondary"
                    onClick={() => setShowPaymentModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingPayment}
                    className="btn btn-sm btn-success px-4 d-flex align-items-center gap-2 fw-semibold"
                  >
                    {submittingPayment ? (
                      <span className="spinner-border spinner-border-sm" role="status"></span>
                    ) : (
                      <i className="bi bi-check-circle-fill"></i>
                    )}
                    <span>Confirm & Record Payment</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* PAYMENT HISTORY & RECORD DETAILS MODAL */}
      {showHistoryModal && selectedRecord && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.55)', zIndex: 1060 }}>
          <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content rounded-4 border-0 shadow-lg overflow-hidden">
              <div className="modal-header bg-dark text-white p-3">
                <div className="d-flex align-items-center gap-2">
                  <div className="bg-warning text-dark rounded-circle p-1 d-flex align-items-center justify-content-center" style={{ width: '28px', height: '28px' }}>
                    <i className="bi bi-person-badge-fill fs-6"></i>
                  </div>
                  <div>
                    <h6 className="modal-title fw-bold mb-0">Resident Rent Obligation Details</h6>
                    <div className="text-white-50 small" style={{ fontSize: '0.72rem' }}>
                      Complete breakdown for {selectedRecord.rent_month}
                    </div>
                  </div>
                </div>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowHistoryModal(false)}></button>
              </div>

              <div className="modal-body p-3 p-md-4 d-flex flex-column gap-3">
                {/* Resident Profile & Room Allocation Card */}
                <div className="p-3 bg-light rounded-3 border d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-2">
                  <div>
                    <div className="d-flex align-items-center gap-2">
                      <h5 className="fw-bold mb-0 text-dark">{selectedRecord.resident_name}</h5>
                      <span className="badge bg-white text-dark border font-monospace">{selectedRecord.resident_code}</span>
                      {getStatusBadge(selectedRecord.payment_status)}
                    </div>
                    <div className="d-flex flex-wrap align-items-center gap-3 text-muted small mt-1">
                      <span><i className="bi bi-door-open text-primary me-1"></i>Room {selectedRecord.room_number} (Bed: <strong>{selectedRecord.bed_number}</strong>)</span>
                      <a
                        href={`https://wa.me/${selectedRecord.resident_phone?.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-decoration-none text-success fw-semibold"
                      >
                        <i className="bi bi-telephone text-success me-1"></i>{selectedRecord.resident_phone}
                      </a>
                    </div>
                  </div>
                  <div className="text-sm-end">
                    <span className="badge bg-secondary-subtle text-secondary border px-2.5 py-1">
                      Billing: {selectedRecord.rent_month}
                    </span>
                    <div className="text-muted small mt-1" style={{ fontSize: '0.72rem' }}>
                      {selectedRecord.billing_cycle_start} to {selectedRecord.billing_cycle_end}
                    </div>
                  </div>
                </div>

                {/* 3-Column Financial Status Grid */}
                <div className="row g-2 text-center">
                  <div className="col-4">
                    <div className="p-2.5 bg-light rounded-3 border">
                      <div className="text-muted small" style={{ fontSize: '0.72rem' }}>Total Rent Due</div>
                      <div className="fw-bold text-dark fs-6">₹{selectedRecord.rent_amount.toLocaleString()}</div>
                      <div className="text-muted small" style={{ fontSize: '0.68rem' }}>Due: {selectedRecord.due_date_formatted}</div>
                    </div>
                  </div>
                  <div className="col-4">
                    <div className="p-2.5 bg-success-subtle rounded-3 border border-success-subtle">
                      <div className="text-success-emphasis small" style={{ fontSize: '0.72rem' }}>Amount Paid</div>
                      <div className="fw-bold text-success fs-6">₹{selectedRecord.amount_paid.toLocaleString()}</div>
                      <div className="text-success small" style={{ fontSize: '0.68rem' }}>
                        {selectedRecord.rent_amount > 0 ? `${Math.round((selectedRecord.amount_paid / selectedRecord.rent_amount) * 100)}% settled` : '100%'}
                      </div>
                    </div>
                  </div>
                  <div className="col-4">
                    <div className={`p-2.5 rounded-3 border ${selectedRecord.balance_due > 0 ? 'bg-danger-subtle border-danger-subtle' : 'bg-light'}`}>
                      <div className={selectedRecord.balance_due > 0 ? 'text-danger-emphasis small' : 'text-muted small'} style={{ fontSize: '0.72rem' }}>
                        Outstanding
                      </div>
                      <div className={`fw-bold fs-6 ${selectedRecord.balance_due > 0 ? 'text-danger' : 'text-success'}`}>
                        ₹{selectedRecord.balance_due.toLocaleString()}
                      </div>
                      <div className="small" style={{ fontSize: '0.68rem' }}>
                        {selectedRecord.days_overdue > 0 ? (
                          <span className="text-danger fw-bold">{selectedRecord.days_overdue} days overdue</span>
                        ) : selectedRecord.balance_due === 0 ? (
                          <span className="text-success fw-semibold">Zero balance</span>
                        ) : (
                          <span className="text-muted">On schedule</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Balance Progress Bar */}
                <div className="bg-white p-2.5 rounded-3 border">
                  <div className="d-flex justify-content-between small text-muted mb-1">
                    <span>Paid: <strong className="text-success">₹{selectedRecord.amount_paid.toLocaleString()}</strong></span>
                    <span>Remaining: <strong className={selectedRecord.balance_due > 0 ? 'text-danger' : 'text-success'}>₹{selectedRecord.balance_due.toLocaleString()}</strong></span>
                  </div>
                  <div className="progress" style={{ height: '7px' }}>
                    <div
                      className="progress-bar bg-success"
                      role="progressbar"
                      style={{
                        width: `${Math.min(100, (selectedRecord.amount_paid / selectedRecord.rent_amount) * 100)}%`
                      }}
                    ></div>
                  </div>
                </div>

                {/* Payment Transactions Table */}
                <div>
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <h6 className="fw-bold text-dark mb-0">Recorded Payment Receipts ({selectedRecord.payments?.length || 0})</h6>
                    {selectedRecord.balance_due > 0 && (
                      <button
                        onClick={() => {
                          setShowHistoryModal(false);
                          handleOpenPaymentModal(selectedRecord);
                        }}
                        className="btn btn-xs btn-success d-flex align-items-center gap-1 px-2.5 py-1 fw-semibold"
                      >
                        <i className="bi bi-plus-circle"></i>
                        <span>Record Payment</span>
                      </button>
                    )}
                  </div>
                  {selectedRecord.payments?.length === 0 ? (
                    <div className="text-center py-4 bg-light rounded-3 text-muted small">
                      <i className="bi bi-clock text-muted d-block fs-4 mb-1"></i>
                      No payments have been recorded for this billing cycle yet.
                    </div>
                  ) : (
                    <div className="table-responsive">
                      <table className="table table-sm table-bordered align-middle small mb-0">
                        <thead className="table-light">
                          <tr>
                            <th>Date</th>
                            <th>Amount</th>
                            <th>Method</th>
                            <th>Ref / UTR</th>
                            <th>Recorded By</th>
                            <th>Notes</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedRecord.payments.map((p) => (
                            <tr key={p.id}>
                              <td className="fw-semibold">{p.payment_date}</td>
                              <td className="fw-bold text-success">₹{p.amount.toLocaleString()}</td>
                              <td><span className="badge bg-light text-dark border">{p.payment_method}</span></td>
                              <td className="font-monospace small">{p.transaction_reference || '—'}</td>
                              <td className="text-muted small">{p.recorded_by_admin_email || 'Admin'}</td>
                              <td className="text-muted small">{p.notes || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Reminder Log Info & Quick Actions Footer */}
                <div className="pt-2 border-top d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-2">
                  <div className="small text-muted">
                    WhatsApp Reminders: <strong>{selectedRecord.reminder_count || 0} sent</strong> • Latest: {getWhatsAppBadge(selectedRecord.latest_reminder_status)}
                  </div>
                  <div className="d-flex gap-2">
                    <button
                      onClick={() => {
                        setShowHistoryModal(false);
                        handleSendReminder(selectedRecord);
                      }}
                      className="btn btn-sm btn-outline-success d-flex align-items-center gap-1 px-3 py-1.5"
                    >
                      <i className="bi bi-whatsapp"></i>
                      <span>Send WhatsApp Reminder</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="modal-footer bg-light p-2.5 d-flex justify-content-between align-items-center">
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() => setShowHistoryModal(false)}
                >
                  &larr; Back to Rent Management
                </button>
                {selectedRecord.balance_due > 0 && (
                  <button
                    type="button"
                    className="btn btn-sm btn-success fw-semibold px-3"
                    onClick={() => {
                      setShowHistoryModal(false);
                      handleOpenPaymentModal(selectedRecord);
                    }}
                  >
                    <i className="bi bi-credit-card me-1"></i> Record Payment (₹{selectedRecord.balance_due.toLocaleString()})
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Regular WhatsApp Reminder Sent Confirmation Modal */}
      {confirmModalData && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          style={{ backgroundColor: 'rgba(0,0,0,0.55)', zIndex: 1060 }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
              <div className="modal-header bg-success text-white p-3">
                <div className="d-flex align-items-center gap-2">
                  <div className="bg-white rounded-circle p-1 d-flex align-items-center justify-content-center text-success" style={{ width: '28px', height: '28px' }}>
                    <i className="bi bi-whatsapp fs-6"></i>
                  </div>
                  <h6 className="modal-title fw-bold mb-0">WhatsApp Rent Reminder Opened</h6>
                </div>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setConfirmModalData(null)}
                ></button>
              </div>

              <div className="modal-body p-4 d-flex flex-column gap-3">
                <div className="bg-success-subtle border border-success-subtle p-3 rounded-3 text-success-emphasis">
                  <div className="fw-semibold small d-flex align-items-center gap-2 mb-1">
                    <i className="bi bi-info-circle-fill"></i>
                    <span>WhatsApp Conversation Opened in New Tab</span>
                  </div>
                  <p className="small mb-0 opacity-90">
                    The conversation with <strong>{confirmModalData.recipient}</strong> (+91 {confirmModalData.phone}) was opened with the pre-filled reminder message.
                  </p>
                </div>

                {/* Resident & Due details summary */}
                <div className="bg-light p-3 rounded-3 border">
                  <div className="row g-2 small">
                    <div className="col-6">
                      <span className="text-muted">Resident:</span>
                      <div className="fw-bold text-dark">{confirmModalData.recipient}</div>
                    </div>
                    <div className="col-6">
                      <span className="text-muted">Room & Month:</span>
                      <div className="fw-semibold text-dark">Room {confirmModalData.room_number || 'PG'} • {confirmModalData.rent_month}</div>
                    </div>
                    <div className="col-6">
                      <span className="text-muted">Outstanding Balance:</span>
                      <div className="fw-bold text-danger">₹{confirmModalData.outstanding_amount !== undefined ? Number(confirmModalData.outstanding_amount).toLocaleString() : '—'}</div>
                    </div>
                    <div className="col-6">
                      <span className="text-muted">Due Date:</span>
                      <div className="fw-semibold text-dark">{confirmModalData.due_date || 'N/A'}</div>
                    </div>
                  </div>
                </div>

                {/* Preformatted Message Preview */}
                <div>
                  <label className="form-label fw-semibold small text-dark mb-1">Message Preview:</label>
                  <pre
                    className="p-3 bg-white border rounded-3 text-secondary font-monospace small mb-0"
                    style={{ maxHeight: '180px', overflowY: 'auto', whiteSpace: 'pre-wrap' }}
                  >
                    {confirmModalData.message_text}
                  </pre>
                </div>

                <div className="text-muted small">
                  <i className="bi bi-hand-index-thumb me-1"></i>
                  Did you press <strong>Send</strong> in WhatsApp to dispatch this message?
                </div>
              </div>

              <div className="modal-footer bg-light p-3 d-flex justify-content-between">
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary px-3"
                  onClick={() => setConfirmModalData(null)}
                >
                  Keep as Opened / Close
                </button>
                <div className="d-flex gap-2">
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-primary"
                    onClick={() => {
                      if (confirmModalData.whatsapp_url) {
                        window.open(confirmModalData.whatsapp_url, '_blank', 'noopener,noreferrer');
                      }
                    }}
                    title="Re-open WhatsApp chat link"
                  >
                    <i className="bi bi-box-arrow-up-right me-1"></i>Re-open
                  </button>
                  <button
                    type="button"
                    disabled={confirmingSend}
                    className="btn btn-sm btn-success d-flex align-items-center gap-1 px-3 shadow-xs text-white"
                    onClick={() => handleConfirmSent(confirmModalData.log_id)}
                  >
                    {confirmingSend ? (
                      <span className="spinner-border spinner-border-sm" role="status"></span>
                    ) : (
                      <i className="bi bi-check-lg"></i>
                    )}
                    <span>✓ Yes, Confirmed Sent</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
