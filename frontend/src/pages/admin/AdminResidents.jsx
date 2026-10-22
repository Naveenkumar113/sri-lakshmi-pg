import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api, { cachedGet, invalidateClientCache } from '../../services/api';
import { smartScrollTo, scrollToFirstError } from '../../utils/scrollHelper';
import AdminOverviewHeader from '../../components/AdminOverviewHeader';
import TablePagination from '../../components/TablePagination';

export default function AdminResidents() {
  const [searchParams] = useSearchParams();
  const [residents, setResidents] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'ALL');
  const [roomFilter, setRoomFilter] = useState(searchParams.get('room') || '');
  const [acFilter, setAcFilter] = useState('ALL');

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);

  const [selectedResident, setSelectedResident] = useState(null);
  const [residentDetails, setResidentDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [addForm, setAddForm] = useState({
    full_name: '',
    phone: '',
    email: '',
    occupation: '',
    emergency_contact: '',
    address: '',
    room_id: '',
    bed_id: '',
    move_in_date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  const [editForm, setEditForm] = useState({
    full_name: '',
    phone: '',
    email: '',
    occupation: '',
    emergency_contact: '',
    address: '',
    resident_status: 'ACTIVE',
  });

  const [transferForm, setTransferForm] = useState({
    new_room_id: '',
    new_bed_id: '',
    transfer_date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  const [checkoutForm, setCheckoutForm] = useState({
    checkout_date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  // Success alert banner with newly generated resident ID
  const [recentGeneratedCode, setRecentGeneratedCode] = useState(null);

  const fetchData = async (force = false) => {
    try {
      const ttl = force ? 0 : 30000;
      // Parallel execution for residents and rooms
      const [resData, roomsData] = await Promise.all([
        cachedGet('/admin/residents', {}, ttl).catch(() => []),
        cachedGet('/admin/rooms', {}, ttl).catch(async () => {
          return cachedGet('/rooms', {}, ttl).catch(() => []);
        })
      ]);

      setResidents(Array.isArray(resData) ? resData : []);
      setRooms(Array.isArray(roomsData) ? roomsData : []);
    } catch (err) {
      console.error('Failed to load resident data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filtered residents list
  const filteredResidents = residents.filter((r) => {
    if (statusFilter !== 'ALL' && r.resident_status !== statusFilter) return false;
    if (roomFilter && (!r.current_room_number || r.current_room_number.toLowerCase() !== roomFilter.toLowerCase())) return false;
    if (acFilter !== 'ALL') {
      const isAcBool = acFilter === 'AC';
      if (r.is_ac !== isAcBool) return false;
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      const codeMatch = r.resident_code?.toLowerCase().includes(q);
      const nameMatch = r.full_name?.toLowerCase().includes(q);
      const phoneMatch = r.phone?.includes(q);
      const roomMatch = r.current_room_number?.toLowerCase().includes(q);
      const occMatch = r.occupation?.toLowerCase().includes(q);
      if (!codeMatch && !nameMatch && !phoneMatch && !roomMatch && !occMatch) return false;
    }
    return true;
  });

  // Pagination state (default 10)
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Reset to page 1 on search or filter change
  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, roomFilter, acFilter]);

  // Paginated slice
  const paginatedResidents = filteredResidents.slice((page - 1) * pageSize, page * pageSize);

  // Metrics
  const activeResidentsCount = residents.filter((r) => r.resident_status === 'ACTIVE').length;
  const checkedOutCount = residents.filter((r) => r.resident_status === 'CHECKED_OUT').length;

  // View Details
  const handleOpenDetails = async (resident) => {
    setSelectedResident(resident);
    setDetailsLoading(true);
    setShowDetailsModal(true);
    try {
      const res = await api.get(`/admin/residents/${resident.id}`);
      setResidentDetails(res.data);
    } catch (err) {
      alert('Failed to load resident details.');
    } finally {
      setDetailsLoading(false);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (resident) => {
    setSelectedResident(resident);
    setEditForm({
      full_name: resident.full_name || '',
      phone: resident.phone || '',
      email: resident.email || '',
      occupation: resident.occupation || '',
      emergency_contact: resident.emergency_contact || '',
      address: resident.address || '',
      resident_status: resident.resident_status || 'ACTIVE',
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!selectedResident) return;

    // Strict 10-digit validation
    if (!/^\d{10}$/.test(editForm.phone)) {
      alert('Phone number must contain exactly 10 numeric digits for Indian mobile numbers (0-9 only).');
      return;
    }
    if (editForm.emergency_contact && !/^\d{10}$/.test(editForm.emergency_contact)) {
      alert('Emergency contact phone must contain exactly 10 numeric digits if provided.');
      return;
    }

    setSubmitting(true);
    try {
      await api.put(`/admin/residents/${selectedResident.id}`, editForm);
      setShowEditModal(false);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to update resident details.');
    } finally {
      setSubmitting(false);
    }
  };

  // Open Add Modal
  const handleOpenAdd = () => {
    setAddForm({
      full_name: '',
      phone: '',
      email: '',
      occupation: '',
      emergency_contact: '',
      address: '',
      room_id: '',
      bed_id: '',
      move_in_date: new Date().toISOString().split('T')[0],
      notes: '',
    });
    setShowAddModal(true);
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();

    // Strict 10-digit validation
    if (!/^\d{10}$/.test(addForm.phone)) {
      alert('Resident phone number must contain exactly 10 numeric digits for Indian mobile numbers (0-9 only, e.g. 9876543210).');
      return;
    }
    if (addForm.emergency_contact && !/^\d{10}$/.test(addForm.emergency_contact)) {
      alert('Emergency contact phone must contain exactly 10 numeric digits if provided (e.g. 9840123456).');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        ...addForm,
        email: addForm.email.trim() ? addForm.email.trim() : null,
        room_id: addForm.room_id || null,
        bed_id: addForm.bed_id || null,
      };
      const res = await api.post('/admin/residents', payload);
      invalidateClientCache('/admin/residents');
      invalidateClientCache('/admin/rooms');
      invalidateClientCache('/admin/analytics');
      setShowAddModal(false);
      setRecentGeneratedCode({
        code: res.data.resident_code,
        name: res.data.full_name,
        room: res.data.current_room_number,
        bed: res.data.current_bed_number,
      });
      fetchData(true);
      smartScrollTo('#resident-success-banner', { offset: 90, delay: 120 });
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to register resident.');
      scrollToFirstError('#add-resident-form');
    } finally {
      setSubmitting(false);
    }
  };

  // Open Transfer Modal
  const handleOpenTransfer = (resident) => {
    if (!resident.current_allocation_id) {
      alert('Resident does not have an active bed allocation to transfer.');
      return;
    }
    setSelectedResident(resident);
    setTransferForm({
      new_room_id: '',
      new_bed_id: '',
      transfer_date: new Date().toISOString().split('T')[0],
      notes: '',
    });
    setShowTransferModal(true);
  };

  const handleTransferSubmit = async (e) => {
    e.preventDefault();
    if (!selectedResident?.current_allocation_id) return;
    setSubmitting(true);
    try {
      await api.put(`/admin/allocations/${selectedResident.current_allocation_id}/transfer`, transferForm);
      invalidateClientCache('/admin/residents');
      invalidateClientCache('/admin/rooms');
      invalidateClientCache('/admin/analytics');
      setShowTransferModal(false);
      fetchData(true);
      alert(`Resident ${selectedResident.resident_code} successfully transferred!`);
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to transfer resident.');
    } finally {
      setSubmitting(false);
    }
  };

  // Open Checkout Modal
  const handleOpenCheckout = (resident) => {
    if (!resident.current_allocation_id) {
      alert('Resident does not have an active bed allocation to check out.');
      return;
    }
    setSelectedResident(resident);
    setCheckoutForm({
      checkout_date: new Date().toISOString().split('T')[0],
      notes: '',
    });
    setShowCheckoutModal(true);
  };

  const handleCheckoutSubmit = async (e) => {
    e.preventDefault();
    if (!selectedResident?.current_allocation_id) return;
    setSubmitting(true);
    try {
      await api.put(`/admin/allocations/${selectedResident.current_allocation_id}/checkout`, checkoutForm);
      invalidateClientCache('/admin/residents');
      invalidateClientCache('/admin/rooms');
      invalidateClientCache('/admin/analytics');
      setShowCheckoutModal(false);
      fetchData(true);
      alert(`Resident ${selectedResident.resident_code} (${selectedResident.full_name}) successfully checked out. Bed is now vacant.`);
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to check out resident.');
    } finally {
      setSubmitting(false);
    }
  };

  // Selected room available beds helper
  const selectedAddRoom = rooms.find((r) => r.id === addForm.room_id);
  const addRoomAvailableBeds = selectedAddRoom?.beds?.filter((b) => !b.is_occupied && b.bed_status !== 'MAINTENANCE') || [];

  const selectedTransferRoom = rooms.find((r) => r.id === transferForm.new_room_id);
  const transferRoomAvailableBeds = selectedTransferRoom?.beds?.filter((b) => !b.is_occupied && b.bed_status !== 'MAINTENANCE') || [];

  return (
    <div className="d-flex flex-column gap-4">
      {/* Reusable AdminOverviewHeader for Residents */}
      <AdminOverviewHeader
        title="Residents Management"
        subtitle="Manage resident profiles, ID assignments, room & bed allocations, and checkout history."
        badge={`${activeResidentsCount} Active`}
        storageKey="residents"
        defaultCollapsed={true}
        summaryItems={[
          { label: 'Active', value: activeResidentsCount, colorClass: 'text-success' },
          { label: 'Checked Out', value: checkedOutCount, colorClass: 'text-secondary' },
          { label: 'Total Registered', value: residents.length, colorClass: 'text-primary' },
          { label: 'Rooms Available', value: rooms.filter((r) => r.available_beds > 0 && r.status !== 'MAINTENANCE').length, colorClass: 'text-warning' },
        ]}
        rightActions={
          <button onClick={handleOpenAdd} className="btn btn-sm btn-pg-primary fw-semibold text-white d-flex align-items-center gap-1 shadow-xs" style={{ minHeight: '36px' }}>
            <i className="bi bi-person-plus-fill"></i>
            <span>Add Resident</span>
          </button>
        }
      >
        {/* Quick Stats Cards */}
        <div className="row g-2.5 g-md-3">
          <div className="col-sm-6 col-xl-3">
            <div className="stat-box h-100 p-3 bg-white rounded-3 border shadow-xs border-start border-4 border-success">
              <div className="d-flex justify-content-between align-items-center mb-1">
                <span className="small text-muted fw-semibold">Active Residents</span>
                <i className="bi bi-person-check-fill text-success fs-5"></i>
              </div>
              <h3 className="fw-bold mb-0 text-success">{activeResidentsCount}</h3>
              <span className="small text-muted">Currently staying in PG</span>
            </div>
          </div>

          <div className="col-sm-6 col-xl-3">
            <div className="stat-box h-100 p-3 bg-white rounded-3 border shadow-xs border-start border-4 border-secondary">
              <div className="d-flex justify-content-between align-items-center mb-1">
                <span className="small text-muted fw-semibold">Checked-Out Residents</span>
                <i className="bi bi-box-arrow-right text-secondary fs-5"></i>
              </div>
              <h3 className="fw-bold mb-0 text-secondary">{checkedOutCount}</h3>
              <span className="small text-muted">Historical records preserved</span>
            </div>
          </div>

          <div className="col-sm-6 col-xl-3">
            <div className="stat-box h-100 p-3 bg-white rounded-3 border shadow-xs border-start border-4 border-primary">
              <div className="d-flex justify-content-between align-items-center mb-1">
                <span className="small text-muted fw-semibold">Total Registered Residents</span>
                <i className="bi bi-people-fill text-primary fs-5"></i>
              </div>
              <h3 className="fw-bold mb-0 text-primary">{residents.length}</h3>
              <span className="small text-muted">Total resident profiles</span>
            </div>
          </div>

          <div className="col-sm-6 col-xl-3">
            <div className="stat-box h-100 p-3 bg-white rounded-3 border shadow-xs border-start border-4 border-warning">
              <div className="d-flex justify-content-between align-items-center mb-1">
                <span className="small text-muted fw-semibold">Available Rooms</span>
                <i className="bi bi-door-open-fill text-warning fs-5"></i>
              </div>
              <h3 className="fw-bold mb-0 text-warning">
                {rooms.filter((r) => r.available_beds > 0 && r.status !== 'MAINTENANCE').length}
              </h3>
              <span className="small text-muted">Rooms ready for intake</span>
            </div>
          </div>
        </div>
      </AdminOverviewHeader>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3 rounded-4 border shadow-sm">
        <div className="row g-2 align-items-center">
          <div className="col-md-4">
            <div className="input-group input-group-sm">
              <span className="input-group-text bg-light border-end-0">
                <i className="bi bi-search"></i>
              </span>
              <input
                type="text"
                className="form-control bg-light border-start-0"
                placeholder="Search ID (SLPG-0001), name, phone, room..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="col-sm-6 col-md-2">
            <select
              className="form-select form-select-sm"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active Only</option>
              <option value="CHECKED_OUT">Checked Out</option>
            </select>
          </div>

          <div className="col-sm-6 col-md-2">
            <select
              className="form-select form-select-sm"
              value={acFilter}
              onChange={(e) => setAcFilter(e.target.value)}
            >
              <option value="ALL">All Cooling</option>
              <option value="AC">AC Only</option>
              <option value="NON_AC">Non-AC Only</option>
            </select>
          </div>

          <div className="col-sm-6 col-md-2">
            <select
              className="form-select form-select-sm"
              value={roomFilter}
              onChange={(e) => setRoomFilter(e.target.value)}
            >
              <option value="">All Rooms</option>
              {rooms.map((r) => (
                <option key={r.id} value={r.room_number}>
                  Room {r.room_number}
                </option>
              ))}
            </select>
          </div>

          <div className="col-sm-6 col-md-2 text-end">
            <span className="small text-muted">
              Showing <strong>{filteredResidents.length}</strong> of <strong>{residents.length}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Resident Table */}
      <div className="bg-white p-4 rounded-4 border shadow-sm">
        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status"></div>
            <p className="text-muted small mt-2">Loading residents...</p>
          </div>
        ) : filteredResidents.length === 0 ? (
          <div className="text-center py-5 bg-light rounded-4 border">
            <i className="bi bi-people fs-1 text-muted"></i>
            <h6 className="fw-bold mt-2">No residents match your filter criteria</h6>
            <p className="text-secondary small mb-3">Try adjusting your search query or reset the filters.</p>
            <button
              onClick={() => {
                setSearch('');
                setStatusFilter('ALL');
                setRoomFilter('');
                setAcFilter('ALL');
              }}
              className="btn btn-sm btn-outline-secondary"
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <>
            <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light small">
                <tr>
                  <th>Resident ID</th>
                  <th>Resident Name</th>
                  <th>Phone</th>
                  <th>Room Number</th>
                  <th>Bed Number</th>
                  <th>AC / Non-AC</th>
                  <th>Move-in Date</th>
                  <th>Monthly Rent</th>
                  <th>Status</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody className="small">
                {paginatedResidents.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <span className="badge bg-dark px-2 py-1 font-monospace">
                        {r.resident_code}
                      </span>
                    </td>
                    <td>
                      <div className="fw-bold text-dark">{r.full_name}</div>
                      <div className="text-muted" style={{ fontSize: '0.72rem' }}>
                        {r.occupation || 'Resident'} {r.email ? `• ${r.email}` : ''}
                      </div>
                    </td>
                    <td>
                      <a href={`tel:${r.phone}`} className="text-decoration-none fw-semibold text-dark">
                        {r.phone}
                      </a>
                    </td>
                    <td>
                      {r.current_room_number ? (
                        <span className="fw-bold text-primary">
                          Room {r.current_room_number}
                        </span>
                      ) : (
                        <span className="text-muted fst-italic">Not allocated</span>
                      )}
                    </td>
                    <td>
                      {r.current_bed_number ? (
                        <span className="badge bg-light text-dark border">
                          {r.current_bed_number}
                        </span>
                      ) : (
                        <span className="text-muted">-</span>
                      )}
                    </td>
                    <td>
                      {r.is_ac !== null && r.is_ac !== undefined ? (
                        <span className={`badge ${r.is_ac ? 'bg-primary' : 'bg-secondary'}`}>
                          {r.is_ac ? 'AC' : 'Non-AC'}
                        </span>
                      ) : (
                        <span className="text-muted">-</span>
                      )}
                    </td>
                    <td>{r.current_move_in_date || '-'}</td>
                    <td className="fw-semibold">
                      {r.current_monthly_rent ? `₹${r.current_monthly_rent.toLocaleString('en-IN')}` : '-'}
                    </td>
                    <td>
                      <span
                        className={`badge ${
                          r.resident_status === 'ACTIVE'
                            ? 'bg-success-subtle text-success border border-success-subtle'
                            : 'bg-secondary-subtle text-secondary border border-secondary-subtle'
                        } px-2 py-1`}
                      >
                        {r.resident_status}
                      </span>
                    </td>
                    <td className="text-end">
                      <div className="d-flex justify-content-end gap-1">
                        <button
                          onClick={() => handleOpenDetails(r)}
                          className="btn btn-sm btn-outline-primary py-1 px-2"
                          title="View Profile & History"
                        >
                          <i className="bi bi-eye"></i>
                        </button>

                        <button
                          onClick={() => handleOpenEdit(r)}
                          className="btn btn-sm btn-outline-secondary py-1 px-2"
                          title="Edit Personal Details"
                        >
                          <i className="bi bi-pencil"></i>
                        </button>

                        {r.resident_status === 'ACTIVE' && r.current_allocation_id && (
                          <>
                            <button
                              onClick={() => handleOpenTransfer(r)}
                              className="btn btn-sm btn-outline-warning text-dark py-1 px-2"
                              title="Transfer to another room/bed"
                            >
                              <i className="bi bi-arrow-left-right"></i>
                            </button>

                            <button
                              onClick={() => handleOpenCheckout(r)}
                              className="btn btn-sm btn-outline-danger py-1 px-2"
                              title="Check Out Resident"
                            >
                              <i className="bi bi-box-arrow-right"></i>
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

            {/* Pagination for Residents */}
            <TablePagination
              currentPage={page}
              pageSize={pageSize}
              totalItems={filteredResidents.length}
              itemLabel="residents"
              onPageChange={setPage}
              onPageSizeChange={(newSize) => {
                setPageSize(newSize);
                setPage(1);
              }}
            />
          </>
        )}
      </div>

      {/* Add Resident Modal (Method B) */}
      {showAddModal && (
        <div
          className="modal fade show d-block"
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', zIndex: 1060 }}
          tabIndex="-1"
        >
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
              <div className="modal-header bg-light border-0 py-3">
                <div>
                  <h5 className="modal-title fw-bold mb-0">Add New Resident (Direct ERP Registration)</h5>
                  <div className="small text-muted">
                    Unique Resident ID (e.g. SLPG-XXXX) is automatically assigned by the backend.
                  </div>
                </div>
                <button type="button" className="btn-close" onClick={() => setShowAddModal(false)}></button>
              </div>

              <form id="add-resident-form" onSubmit={handleAddSubmit}>
                <div className="modal-body p-4">
                  <h6 className="fw-bold text-primary mb-3">1. Personal & Contact Information</h6>
                  <div className="row g-3 mb-4">
                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">Resident Full Name *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Arun Kumar"
                        className="form-control"
                        value={addForm.full_name}
                        onChange={(e) => setAddForm({ ...addForm, full_name: e.target.value })}
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">Phone Number *</label>
                      <input
                        type="tel"
                        required
                        maxLength={10}
                        inputMode="numeric"
                        placeholder="e.g. 9876543210 (10 digits)"
                        className={`form-control ${addForm.phone.length === 10 ? 'is-valid' : addForm.phone.length > 0 ? 'is-invalid' : ''}`}
                        value={addForm.phone}
                        onChange={(e) => {
                          const clean = e.target.value.replace(/\D/g, '').slice(0, 10);
                          setAddForm({ ...addForm, phone: clean });
                        }}
                      />
                      {addForm.phone.length > 0 && addForm.phone.length < 10 && (
                        <div className="text-danger small mt-1" style={{ fontSize: '0.72rem' }}>
                          <i className="bi bi-exclamation-circle me-1"></i>
                          Must be exactly 10 digits ({addForm.phone.length}/10 entered)
                        </div>
                      )}
                      {addForm.phone.length === 10 && (
                        <div className="text-success small mt-1" style={{ fontSize: '0.72rem' }}>
                          <i className="bi bi-check-circle me-1"></i>
                          Valid 10-digit mobile number
                        </div>
                      )}
                    </div>

                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">Email Address (Optional)</label>
                      <input
                        type="email"
                        placeholder="e.g. arun.kumar@gmail.com"
                        className="form-control"
                        value={addForm.email}
                        onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">Occupation / Profession</label>
                      <input
                        type="text"
                        placeholder="e.g. Software Engineer, Student"
                        className="form-control"
                        value={addForm.occupation}
                        onChange={(e) => setAddForm({ ...addForm, occupation: e.target.value })}
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">Emergency Contact Phone</label>
                      <input
                        type="tel"
                        maxLength={10}
                        inputMode="numeric"
                        placeholder="e.g. 9840123456 (10 digits)"
                        className={`form-control ${addForm.emergency_contact?.length === 10 ? 'is-valid' : addForm.emergency_contact?.length > 0 ? 'is-invalid' : ''}`}
                        value={addForm.emergency_contact}
                        onChange={(e) => {
                          const clean = e.target.value.replace(/\D/g, '').slice(0, 10);
                          setAddForm({ ...addForm, emergency_contact: clean });
                        }}
                      />
                      {addForm.emergency_contact?.length > 0 && addForm.emergency_contact.length < 10 && (
                        <div className="text-danger small mt-1" style={{ fontSize: '0.72rem' }}>
                          <i className="bi bi-exclamation-circle me-1"></i>
                          Must be 10 digits if provided ({addForm.emergency_contact.length}/10 entered)
                        </div>
                      )}
                    </div>

                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">Native Place / Permanent Address</label>
                      <input
                        type="text"
                        placeholder="e.g. Native: Trichy, Tamil Nadu"
                        className="form-control"
                        value={addForm.address}
                        onChange={(e) => setAddForm({ ...addForm, address: e.target.value })}
                      />
                    </div>
                  </div>

                  <h6 className="fw-bold text-primary mb-3">2. Room & Bed Allocation (Optional / Immediate)</h6>
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">Select Room</label>
                      <select
                        className="form-select"
                        value={addForm.room_id}
                        onChange={(e) => setAddForm({ ...addForm, room_id: e.target.value, bed_id: '' })}
                      >
                        <option value="">-- Do Not Allocate Now (Register Only) --</option>
                        {rooms.map((rm) => (
                          <option key={rm.id} value={rm.id} disabled={rm.available_beds <= 0 || rm.status === 'MAINTENANCE'}>
                            Room {rm.room_number} • {rm.sharing_type} ({rm.is_ac ? 'AC' : 'Non-AC'}) • {rm.available_beds} beds free
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">Select Available Bed</label>
                      <select
                        className="form-select"
                        value={addForm.bed_id}
                        disabled={!addForm.room_id}
                        onChange={(e) => setAddForm({ ...addForm, bed_id: e.target.value })}
                      >
                        <option value="">-- Choose Bed --</option>
                        {addRoomAvailableBeds.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.bed_number} (Vacant)
                          </option>
                        ))}
                      </select>
                    </div>

                    {addForm.room_id && (
                      <div className="col-md-6">
                        <label className="form-label small fw-semibold">Move-in Date *</label>
                        <input
                          type="date"
                          required
                          className="form-control"
                          value={addForm.move_in_date}
                          onChange={(e) => setAddForm({ ...addForm, move_in_date: e.target.value })}
                        />
                      </div>
                    )}

                    <div className="col-12">
                      <label className="form-label small fw-semibold">Internal Admin Notes</label>
                      <textarea
                        rows="2"
                        className="form-control"
                        placeholder="e.g. Advance paid ₹5000, ID proof submitted."
                        value={addForm.notes}
                        onChange={(e) => setAddForm({ ...addForm, notes: e.target.value })}
                      ></textarea>
                    </div>
                  </div>
                </div>

                <div className="modal-footer border-0 bg-light py-2">
                  <button type="button" className="btn btn-sm btn-secondary" onClick={() => setShowAddModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" disabled={submitting} className="btn btn-sm btn-pg-primary fw-semibold">
                    {submitting ? 'Generating ID & Saving...' : 'Register & Generate ID'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Resident Modal */}
      {showEditModal && selectedResident && (
        <div
          className="modal fade show d-block"
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', zIndex: 1060 }}
          tabIndex="-1"
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
              <div className="modal-header bg-light border-0 py-3">
                <h5 className="modal-title fw-bold">Edit Resident: {selectedResident.resident_code}</h5>
                <button type="button" className="btn-close" onClick={() => setShowEditModal(false)}></button>
              </div>

              <form onSubmit={handleEditSubmit}>
                <div className="modal-body p-4">
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Full Name *</label>
                    <input
                      type="text"
                      required
                      className="form-control"
                      value={editForm.full_name}
                      onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Phone Number *</label>
                    <input
                      type="tel"
                      required
                      maxLength={10}
                      inputMode="numeric"
                      placeholder="e.g. 9876543210 (10 digits)"
                      className={`form-control ${editForm.phone?.length === 10 ? 'is-valid' : editForm.phone?.length > 0 ? 'is-invalid' : ''}`}
                      value={editForm.phone || ''}
                      onChange={(e) => {
                        const clean = e.target.value.replace(/\D/g, '').slice(0, 10);
                        setEditForm({ ...editForm, phone: clean });
                      }}
                    />
                    {editForm.phone?.length > 0 && editForm.phone.length < 10 && (
                      <div className="text-danger small mt-1" style={{ fontSize: '0.72rem' }}>
                        <i className="bi bi-exclamation-circle me-1"></i>
                        Must be exactly 10 digits ({editForm.phone.length}/10 entered)
                      </div>
                    )}
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Email Address</label>
                    <input
                      type="email"
                      className="form-control"
                      value={editForm.email || ''}
                      onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Occupation</label>
                    <input
                      type="text"
                      className="form-control"
                      value={editForm.occupation || ''}
                      onChange={(e) => setEditForm({ ...editForm, occupation: e.target.value })}
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Emergency Contact</label>
                    <input
                      type="tel"
                      maxLength={10}
                      inputMode="numeric"
                      placeholder="e.g. 9840123456 (10 digits)"
                      className="form-control"
                      value={editForm.emergency_contact || ''}
                      onChange={(e) => {
                        const clean = e.target.value.replace(/\D/g, '').slice(0, 10);
                        setEditForm({ ...editForm, emergency_contact: clean });
                      }}
                    />
                    {editForm.emergency_contact?.length > 0 && editForm.emergency_contact.length < 10 && (
                      <div className="text-danger small mt-1" style={{ fontSize: '0.72rem' }}>
                        <i className="bi bi-exclamation-circle me-1"></i>
                        Must be 10 digits if provided ({editForm.emergency_contact.length}/10 entered)
                      </div>
                    )}
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Address</label>
                    <textarea
                      rows="2"
                      className="form-control"
                      value={editForm.address}
                      onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                    ></textarea>
                  </div>
                </div>

                <div className="modal-footer border-0 bg-light py-2">
                  <button type="button" className="btn btn-sm btn-secondary" onClick={() => setShowEditModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" disabled={submitting} className="btn btn-sm btn-pg-primary fw-semibold">
                    {submitting ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Transfer Room Modal */}
      {showTransferModal && selectedResident && (
        <div
          className="modal fade show d-block"
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', zIndex: 1060 }}
          tabIndex="-1"
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
              <div className="modal-header bg-light border-0 py-3">
                <div>
                  <h5 className="modal-title fw-bold mb-0">Transfer Resident Room</h5>
                  <div className="small text-muted">
                    {selectedResident.resident_code} • {selectedResident.full_name}
                  </div>
                </div>
                <button type="button" className="btn-close" onClick={() => setShowTransferModal(false)}></button>
              </div>

              <form onSubmit={handleTransferSubmit}>
                <div className="modal-body p-4">
                  <div className="p-3 bg-light rounded-3 mb-3 small">
                    <div className="text-muted">Current Allocation:</div>
                    <div className="fw-bold fs-6 text-dark">
                      Room {selectedResident.current_room_number} • Bed {selectedResident.current_bed_number}
                    </div>
                    <div className="text-secondary">
                      Resident ID: <strong>{selectedResident.resident_code}</strong> (ID stays unchanged)
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Destination Room *</label>
                    <select
                      className="form-select"
                      required
                      value={transferForm.new_room_id}
                      onChange={(e) => setTransferForm({ ...transferForm, new_room_id: e.target.value, new_bed_id: '' })}
                    >
                      <option value="">-- Select Destination Room --</option>
                      {rooms
                        .filter((rm) => rm.id !== selectedResident.current_room_id && rm.available_beds > 0 && rm.status !== 'MAINTENANCE')
                        .map((rm) => (
                          <option key={rm.id} value={rm.id}>
                            Room {rm.room_number} • {rm.sharing_type} ({rm.is_ac ? 'AC' : 'Non-AC'}) • {rm.available_beds} beds free
                          </option>
                        ))}
                    </select>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Destination Bed *</label>
                    <select
                      className="form-select"
                      required
                      value={transferForm.new_bed_id}
                      disabled={!transferForm.new_room_id}
                      onChange={(e) => setTransferForm({ ...transferForm, new_bed_id: e.target.value })}
                    >
                      <option value="">-- Select Free Bed --</option>
                      {transferRoomAvailableBeds.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.bed_number} (Free)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Effective Transfer Date *</label>
                    <input
                      type="date"
                      required
                      className="form-control"
                      value={transferForm.transfer_date}
                      onChange={(e) => setTransferForm({ ...transferForm, transfer_date: e.target.value })}
                    />
                  </div>

                  <div className="mb-2">
                    <label className="form-label small fw-semibold">Transfer Reason / Notes</label>
                    <textarea
                      rows="2"
                      className="form-control"
                      placeholder="e.g. Upgraded to AC room / changed roommates."
                      value={transferForm.notes}
                      onChange={(e) => setTransferForm({ ...transferForm, notes: e.target.value })}
                    ></textarea>
                  </div>
                </div>

                <div className="modal-footer border-0 bg-light py-2">
                  <button type="button" className="btn btn-sm btn-secondary" onClick={() => setShowTransferModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" disabled={submitting} className="btn btn-sm btn-warning fw-bold text-dark">
                    {submitting ? 'Transferring...' : 'Execute Room Transfer'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Checkout Modal */}
      {showCheckoutModal && selectedResident && (
        <div
          className="modal fade show d-block"
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', zIndex: 1060 }}
          tabIndex="-1"
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
              <div className="modal-header bg-danger text-white border-0 py-3">
                <h5 className="modal-title fw-bold">Confirm Resident Checkout</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowCheckoutModal(false)}></button>
              </div>

              <form onSubmit={handleCheckoutSubmit}>
                <div className="modal-body p-4">
                  <div className="p-3 bg-light rounded-3 mb-3 small">
                    <div>Resident: <strong>{selectedResident.full_name}</strong> ({selectedResident.resident_code})</div>
                    <div>Currently occupying: <strong>Room {selectedResident.current_room_number} • Bed {selectedResident.current_bed_number}</strong></div>
                  </div>

                  <p className="text-secondary small mb-3">
                    Checking out will release Bed {selectedResident.current_bed_number} in Room {selectedResident.current_room_number} immediately. Room availability will increment by 1. Resident record and historical audit logs will be permanently preserved.
                  </p>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Checkout Date *</label>
                    <input
                      type="date"
                      required
                      className="form-control"
                      value={checkoutForm.checkout_date}
                      onChange={(e) => setCheckoutForm({ ...checkoutForm, checkout_date: e.target.value })}
                    />
                  </div>

                  <div className="mb-2">
                    <label className="form-label small fw-semibold">Checkout Notes</label>
                    <textarea
                      rows="2"
                      className="form-control"
                      placeholder="e.g. Deposit refunded ₹5000 via GPay. Keys returned."
                      value={checkoutForm.notes}
                      onChange={(e) => setCheckoutForm({ ...checkoutForm, notes: e.target.value })}
                    ></textarea>
                  </div>
                </div>

                <div className="modal-footer border-0 bg-light py-2">
                  <button type="button" className="btn btn-sm btn-secondary" onClick={() => setShowCheckoutModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" disabled={submitting} className="btn btn-sm btn-danger fw-semibold">
                    {submitting ? 'Releasing Bed...' : 'Confirm Checkout & Free Bed'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Full Resident Profile & History Modal */}
      {showDetailsModal && selectedResident && (
        <div
          className="modal fade show d-block"
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', zIndex: 1060 }}
          tabIndex="-1"
        >
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
              <div className="modal-header bg-light border-0 py-3">
                <div className="d-flex align-items-center gap-2">
                  <span className="badge bg-dark font-monospace fs-6">{selectedResident.resident_code}</span>
                  <h5 className="modal-title fw-bold mb-0">{selectedResident.full_name}</h5>
                </div>
                <button type="button" className="btn-close" onClick={() => setShowDetailsModal(false)}></button>
              </div>

              <div className="modal-body p-4" style={{ maxHeight: '75vh', overflowY: 'auto' }}>
                {detailsLoading ? (
                  <div className="text-center py-5">
                    <div className="spinner-border text-primary" role="status"></div>
                  </div>
                ) : (
                  <>
                    {/* Active Bed Card */}
                    <div className="p-3 rounded-4 mb-4 bg-light border">
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <span className="small text-muted fw-bold text-uppercase">Current Bed Status</span>
                        <span
                          className={`badge ${
                            selectedResident.resident_status === 'ACTIVE' ? 'bg-success' : 'bg-secondary'
                          }`}
                        >
                          {selectedResident.resident_status}
                        </span>
                      </div>
                      {selectedResident.current_room_number ? (
                        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
                          <div>
                            <h5 className="fw-bold text-dark mb-0">
                              Room {selectedResident.current_room_number} • Bed {selectedResident.current_bed_number}
                            </h5>
                            <span className="small text-muted">
                              {selectedResident.sharing_type} • {selectedResident.is_ac ? 'Air Conditioned' : 'Non-AC'} • Move-in: {selectedResident.current_move_in_date}
                            </span>
                          </div>
                          <div className="text-end">
                            <div className="fw-bold text-success fs-5">
                              {selectedResident.current_monthly_rent ? `₹${selectedResident.current_monthly_rent.toLocaleString('en-IN')}` : '-'}
                            </div>
                            <span className="small text-muted">Rent / month</span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-muted small mb-0">No active room or bed allocated currently.</p>
                      )}
                    </div>

                    {/* Personal Details */}
                    <h6 className="fw-bold mb-3 text-primary">Resident Profile & Contacts</h6>
                    <div className="row g-3 mb-4">
                      <div className="col-sm-6">
                        <div className="p-3 bg-light rounded-3">
                          <div className="small text-muted">Primary Phone</div>
                          <div className="fw-bold">{selectedResident.phone}</div>
                        </div>
                      </div>
                      <div className="col-sm-6">
                        <div className="p-3 bg-light rounded-3">
                          <div className="small text-muted">Email Address</div>
                          <div className="fw-bold">{selectedResident.email || 'Not provided'}</div>
                        </div>
                      </div>
                      <div className="col-sm-6">
                        <div className="p-3 bg-light rounded-3">
                          <div className="small text-muted">Occupation</div>
                          <div>{selectedResident.occupation || '-'}</div>
                        </div>
                      </div>
                      <div className="col-sm-6">
                        <div className="p-3 bg-light rounded-3">
                          <div className="small text-muted">Emergency Contact</div>
                          <div className="fw-bold text-danger">{selectedResident.emergency_contact || '-'}</div>
                        </div>
                      </div>
                      <div className="col-12">
                        <div className="p-3 bg-light rounded-3">
                          <div className="small text-muted">Native Place / Address</div>
                          <div>{selectedResident.address || '-'}</div>
                        </div>
                      </div>
                    </div>

                    {/* Historical Bed Allocations */}
                    <h6 className="fw-bold mb-2 text-primary">
                      Historical Bed Allocations ({residentDetails?.allocations?.length || 0})
                    </h6>
                    <div className="table-responsive mb-4">
                      <table className="table table-sm align-middle small mb-0">
                        <thead className="table-light">
                          <tr>
                            <th>Room & Bed</th>
                            <th>Move-in</th>
                            <th>Move-out</th>
                            <th>Status</th>
                            <th>Notes</th>
                          </tr>
                        </thead>
                        <tbody>
                          {residentDetails?.allocations?.map((a) => (
                            <tr key={a.id}>
                              <td className="fw-semibold">
                                Room {a.room_number} • {a.bed_number}
                              </td>
                              <td>{a.move_in_date}</td>
                              <td>{a.move_out_date || 'Present'}</td>
                              <td>
                                <span className={`status-pill status-${a.allocation_status.toLowerCase()}`}>
                                  {a.allocation_status}
                                </span>
                              </td>
                              <td className="text-muted" style={{ maxWidth: '200px' }}>
                                {a.notes || '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Audit History Timeline */}
                    <h6 className="fw-bold mb-2 text-primary">
                      Event History Log ({residentDetails?.history?.length || 0})
                    </h6>
                    <div className="d-flex flex-column gap-2">
                      {residentDetails?.history?.map((h) => (
                        <div key={h.id} className="p-2 px-3 border rounded-3 bg-light small d-flex justify-content-between align-items-center">
                          <div>
                            <span className="badge bg-secondary me-2">{h.event_type}</span>
                            <span>{h.details}</span>
                          </div>
                          <span className="text-muted" style={{ fontSize: '0.72rem' }}>
                            {new Date(h.created_at).toLocaleDateString('en-IN')}
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>

              <div className="modal-footer border-0 bg-light py-2">
                <button type="button" className="btn btn-sm btn-dark" onClick={() => setShowDetailsModal(false)}>
                  Close Profile
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
