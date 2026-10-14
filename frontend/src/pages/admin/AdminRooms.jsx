import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import VisualRoomLayout from '../../components/VisualRoomLayout';
import BusSeatMap, {
  CAPACITY_WORDS,
  capacityToSharingType,
  getRoomSharingLabel,
} from '../../components/BusSeatMap';

const sanitizePhone = (val) => (val || '').replace(/\D/g, '').slice(0, 10);

export default function AdminRooms() {
  const [rooms, setRooms] = useState([]);
  const [residents, setResidents] = useState([]);
  const [loading, setLoading] = useState(true);

  // View state: 'CARDS' or 'TABLE'
  const [viewMode, setViewMode] = useState('CARDS');

  // Filters & Search
  const [search, setSearch] = useState('');
  const [acFilter, setAcFilter] = useState('ALL');
  const [sharingFilter, setSharingFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modals state
  const [showRoomFormModal, setShowRoomFormModal] = useState(false);
  const [editRoom, setEditRoom] = useState(null); // null = Add, object = Edit

  const [showManageModal, setShowManageModal] = useState(false);
  const [selectedManageRoom, setSelectedManageRoom] = useState(null);
  const [manageTab, setManageTab] = useState('VISUAL'); // 'VISUAL' | 'LIST'

  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignBed, setAssignBed] = useState(null);

  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferTarget, setTransferTarget] = useState(null);

  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [checkoutTarget, setCheckoutTarget] = useState(null);

  const [submitting, setSubmitting] = useState(false);

  // Room Form
  const [roomForm, setRoomForm] = useState({
    room_number: '',
    room_type: 'Non-AC',
    sharing_type: 'Triple Sharing',
    is_ac: false,
    floor: 1,
    capacity: 3,
    monthly_rent: 5500,
    monthly_rent_per_bed: 5500,
    security_deposit: 5000,
    description: 'Comfortable accommodation with individual lockers, sturdy cots, and daily cleaning.',
    amenities: 'Free Wi-Fi, Ceiling Fan, Individual Cupboard, Hot Water',
    status: 'AVAILABLE',
  });

  // Assign Form
  const [assignForm, setAssignForm] = useState({
    mode: 'EXISTING', // 'EXISTING' | 'NEW'
    resident_id: '',
    // If NEW
    full_name: '',
    phone: '',
    email: '',
    occupation: '',
    emergency_contact: '',
    address: '',
    move_in_date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  // Transfer Form
  const [transferForm, setTransferForm] = useState({
    new_room_id: '',
    new_bed_id: '',
    transfer_date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  // Checkout Form
  const [checkoutForm, setCheckoutForm] = useState({
    checkout_date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  const fetchData = async () => {
    try {
      const [roomsRes, resRes] = await Promise.all([
        api.get('/admin/rooms'),
        api.get('/admin/residents'),
      ]);
      setRooms(roomsRes.data);
      setResidents(resRes.data);

      // If a room is currently open in Manage modal, refresh it
      if (selectedManageRoom) {
        const updated = roomsRes.data.find((r) => r.id === selectedManageRoom.id);
        if (updated) setSelectedManageRoom(updated);
      }
    } catch (err) {
      console.error('Failed to load room data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Distinct sharing types dynamically collected from current rooms + standard sharing types
  const distinctSharingTypes = Array.from(
    new Set([
      'Single Sharing',
      'Double Sharing',
      'Triple Sharing',
      'Four Sharing',
      ...rooms.map((r) => getRoomSharingLabel(r)).filter(Boolean),
    ])
  ).sort((a, b) => {
    const getCap = (s) => {
      const word = (s || '').replace(' Sharing', '').trim();
      const entry = Object.entries(CAPACITY_WORDS).find(
        ([_, w]) => w.toLowerCase() === word.toLowerCase()
      );
      return entry ? parseInt(entry[0], 10) : parseInt(word, 10) || 99;
    };
    return getCap(a) - getCap(b);
  });

  // Filtered rooms
  const filteredRooms = rooms.filter((r) => {
    if (acFilter !== 'ALL') {
      const isAc = acFilter === 'AC';
      if (r.is_ac !== isAc) return false;
    }
    if (sharingFilter !== 'ALL') {
      const roomSharing = getRoomSharingLabel(r).toLowerCase();
      const targetFilter = sharingFilter.toLowerCase();
      if (roomSharing !== targetFilter) return false;
    }
    if (statusFilter !== 'ALL' && r.status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const numMatch = r.room_number?.toLowerCase().includes(q);
      const descMatch = r.description?.toLowerCase().includes(q);
      const resMatch = r.beds?.some(
        (b) =>
          b.current_occupant_name?.toLowerCase().includes(q) ||
          b.current_resident_code?.toLowerCase().includes(q)
      );
      if (!numMatch && !descMatch && !resMatch) return false;
    }
    return true;
  });

  // Overall metrics
  const totalRooms = rooms.length;
  const totalBeds = rooms.reduce((acc, r) => acc + (r.capacity || 0), 0);
  const occupiedBeds = rooms.reduce((acc, r) => acc + (r.occupied_beds || 0), 0);
  const availableBeds = rooms.reduce((acc, r) => acc + (r.available_beds || 0), 0);
  const occupancyRate = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;

  // Open Room Add
  const handleOpenAdd = () => {
    setEditRoom(null);
    setRoomForm({
      room_number: '',
      room_type: 'Non-AC',
      sharing_type: 'Triple Sharing',
      is_ac: false,
      floor: 1,
      capacity: 3,
      monthly_rent: 5500,
      monthly_rent_per_bed: 5500,
      security_deposit: 5000,
      description: 'Comfortable accommodation with individual lockers, sturdy cots, and daily cleaning.',
      amenities: 'Free Wi-Fi, Ceiling Fan, Individual Cupboard, Hot Water',
      status: 'AVAILABLE',
    });
    setShowRoomFormModal(true);
  };

  // Open Room Edit
  const handleOpenEdit = (room) => {
    setEditRoom(room);
    const cap = parseInt(room.capacity, 10) || 2;
    const sharing = capacityToSharingType(cap) || getRoomSharingLabel(room);

    setRoomForm({
      room_number: room.room_number,
      room_type: room.room_type || (room.is_ac ? 'AC' : 'Non-AC'),
      sharing_type: sharing,
      is_ac: room.is_ac,
      floor: room.floor,
      capacity: cap,
      monthly_rent: room.monthly_rent || 0,
      monthly_rent_per_bed: room.monthly_rent_per_bed || room.monthly_rent || 0,
      security_deposit: room.security_deposit || 0,
      description: room.description || '',
      amenities: room.amenities || '',
      status: room.status,
    });
    setShowRoomFormModal(true);
  };

  // Submit Room Add / Edit
  const handleRoomFormSubmit = async (e) => {
    e.preventDefault();
    const capNum = parseInt(roomForm.capacity, 10);
    if (isNaN(capNum) || capNum < 1 || capNum > 20) {
      alert('Sharing Capacity must be a positive whole number between 1 and 20.');
      return;
    }

    if (editRoom) {
      // RULE: Admin cannot reduce room capacity below the number of occupied beds
      const occupiedCount = editRoom.occupied_beds || (editRoom.beds ? editRoom.beds.filter((b) => b.is_occupied).length : 0);
      if (capNum < occupiedCount) {
        alert(
          `Cannot reduce capacity to ${capNum}. Room ${editRoom.room_number} currently has ${occupiedCount} active resident allocation(s). Please transfer or checkout residents first.`
        );
        return;
      }
    }

    setSubmitting(true);
    try {
      const derivedSharing = capacityToSharingType(capNum);
      const payload = {
        ...roomForm,
        capacity: capNum,
        sharing_type: derivedSharing,
        floor: parseInt(roomForm.floor, 10) || 1,
        monthly_rent: parseFloat(roomForm.monthly_rent_per_bed || roomForm.monthly_rent || 0),
        monthly_rent_per_bed: parseFloat(roomForm.monthly_rent_per_bed || roomForm.monthly_rent || 0),
        security_deposit: parseFloat(roomForm.security_deposit || 0),
      };

      if (editRoom) {
        await api.put(`/admin/rooms/${editRoom.id}`, payload);
      } else {
        await api.post('/admin/rooms', payload);
      }
      setShowRoomFormModal(false);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.detail || 'Error saving room details.');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Room
  const handleDeleteRoom = async (room) => {
    if (!window.confirm(`Are you sure you want to delete Room ${room.room_number}?`)) return;
    try {
      await api.delete(`/admin/rooms/${room.id}`);
      fetchData();
      if (selectedManageRoom && selectedManageRoom.id === room.id) {
        setShowManageModal(false);
      }
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to delete room.');
    }
  };

  // Open Manage Room Modal
  const handleOpenManageRoom = (room) => {
    setSelectedManageRoom(room);
    setManageTab('VISUAL');
    setShowManageModal(true);
  };

  // Open Assign Resident to Bed Modal
  const handleOpenAssign = (bed, room) => {
    setAssignBed({ ...bed, room });
    setAssignForm({
      mode: 'EXISTING',
      resident_id: '',
      full_name: '',
      phone: '',
      email: '',
      occupation: '',
      emergency_contact: '',
      address: '',
      move_in_date: new Date().toISOString().split('T')[0],
      notes: '',
    });
    setShowAssignModal(true);
  };

  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    if (!assignBed) return;
    setSubmitting(true);

    try {
      if (assignForm.mode === 'EXISTING') {
        if (!assignForm.resident_id) {
          alert('Please select a resident to allocate.');
          setSubmitting(false);
          return;
        }
        await api.post('/admin/allocations', {
          resident_id: assignForm.resident_id,
          room_id: assignBed.room.id,
          bed_id: assignBed.id,
          move_in_date: assignForm.move_in_date,
          notes: assignForm.notes,
        });
      } else {
        // Enforce strict 10 numeric digits for Indian mobile numbers
        if (!assignForm.phone || assignForm.phone.length !== 10 || !/^\d{10}$/.test(assignForm.phone)) {
          alert('Resident phone number must contain exactly 10 numeric digits for Indian mobile numbers (0–9 only, e.g. 9876543210). Alphabetic characters, special characters, and spaces are rejected.');
          setSubmitting(false);
          return;
        }
        if (assignForm.emergency_contact && (assignForm.emergency_contact.length !== 10 || !/^\d{10}$/.test(assignForm.emergency_contact))) {
          alert('Emergency contact must contain exactly 10 numeric digits if provided (e.g. 9840123456).');
          setSubmitting(false);
          return;
        }

        // Register new resident and allocate atomically
        await api.post('/admin/residents', {
          full_name: assignForm.full_name,
          phone: assignForm.phone,
          email: assignForm.email || null,
          occupation: assignForm.occupation,
          emergency_contact: assignForm.emergency_contact,
          address: assignForm.address,
          room_id: assignBed.room.id,
          bed_id: assignBed.id,
          move_in_date: assignForm.move_in_date,
          notes: assignForm.notes,
        });
      }
      setShowAssignModal(false);
      fetchData();
      alert('Bed allocation completed successfully!');
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to allocate bed.');
    } finally {
      setSubmitting(false);
    }
  };

  // Open Transfer Modal from Room Manage
  const handleOpenTransferFromBed = (bed, room) => {
    setTransferTarget({
      allocation_id: bed.current_allocation_id,
      resident_code: bed.current_resident_code,
      resident_name: bed.current_occupant_name,
      room_number: room.room_number,
      bed_number: bed.bed_number,
      room_id: room.id,
    });
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
    if (!transferTarget?.allocation_id) return;
    setSubmitting(true);
    try {
      await api.put(`/admin/allocations/${transferTarget.allocation_id}/transfer`, transferForm);
      setShowTransferModal(false);
      fetchData();
      alert('Resident transferred successfully!');
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to transfer resident.');
    } finally {
      setSubmitting(false);
    }
  };

  // Open Checkout Modal from Room Manage
  const handleOpenCheckoutFromBed = (bed, room) => {
    setCheckoutTarget({
      allocation_id: bed.current_allocation_id,
      resident_code: bed.current_resident_code,
      resident_name: bed.current_occupant_name,
      room_number: room.room_number,
      bed_number: bed.bed_number,
    });
    setCheckoutForm({
      checkout_date: new Date().toISOString().split('T')[0],
      notes: '',
    });
    setShowCheckoutModal(true);
  };

  const handleCheckoutSubmit = async (e) => {
    e.preventDefault();
    if (!checkoutTarget?.allocation_id) return;
    setSubmitting(true);
    try {
      await api.put(`/admin/allocations/${checkoutTarget.allocation_id}/checkout`, checkoutForm);
      setShowCheckoutModal(false);
      fetchData();
      alert(`Resident ${checkoutTarget.resident_code} successfully checked out. Bed is now free!`);
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to check out resident.');
    } finally {
      setSubmitting(false);
    }
  };

  // Helpers
  const selectedTransferRoom = rooms.find((r) => r.id === transferForm.new_room_id);
  const transferAvailableBeds = selectedTransferRoom?.beds?.filter((b) => !b.is_occupied && b.bed_status !== 'MAINTENANCE') || [];

  // Unallocated residents
  const unallocatedResidents = residents.filter((r) => !r.current_allocation_id);

  return (
    <div className="d-flex flex-column gap-4">
      {/* Top Title & Actions */}
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
        <div>
          <h4 className="fw-bold mb-1">Room & Bed Management</h4>
          <p className="text-secondary small mb-0">
            Create rooms, configure sharing types & AC options, manage bed allocations, and monitor real-time occupancy.
          </p>
        </div>

        <div className="d-flex align-items-center gap-2">
          {/* View toggle */}
          <div className="btn-group btn-group-sm" role="group">
            <button
              onClick={() => setViewMode('CARDS')}
              className={`btn ${viewMode === 'CARDS' ? 'btn-dark' : 'btn-outline-secondary'}`}
              title="Card View"
            >
              <i className="bi bi-grid-fill me-1"></i> Card View
            </button>
            <button
              onClick={() => setViewMode('TABLE')}
              className={`btn ${viewMode === 'TABLE' ? 'btn-dark' : 'btn-outline-secondary'}`}
              title="Table View"
            >
              <i className="bi bi-table me-1"></i> Table View
            </button>
          </div>

          <button onClick={handleOpenAdd} className="btn btn-sm btn-pg-primary fw-semibold">
            <i className="bi bi-plus-lg me-1"></i> Create Room
          </button>
        </div>
      </div>

      {/* Metric Stat Cards */}
      <div className="row g-3">
        <div className="col-sm-6 col-xl-3">
          <div className="stat-box h-100 border-start border-4 border-primary">
            <div className="d-flex justify-content-between align-items-center mb-1">
              <span className="small text-muted fw-semibold">Total Inventory</span>
              <i className="bi bi-building text-primary fs-5"></i>
            </div>
            <h3 className="fw-bold mb-0 text-dark">{totalRooms} Rooms</h3>
            <span className="small text-muted">{totalBeds} Total Beds</span>
          </div>
        </div>

        <div className="col-sm-6 col-xl-3">
          <div className="stat-box h-100 border-start border-4 border-danger">
            <div className="d-flex justify-content-between align-items-center mb-1">
              <span className="small text-muted fw-semibold">Occupied Beds</span>
              <i className="bi bi-person-fill-lock text-danger fs-5"></i>
            </div>
            <h3 className="fw-bold mb-0 text-danger">{occupiedBeds}</h3>
            <span className="small text-muted">{occupancyRate}% PG Occupancy</span>
          </div>
        </div>

        <div className="col-sm-6 col-xl-3">
          <div className="stat-box h-100 border-start border-4 border-success">
            <div className="d-flex justify-content-between align-items-center mb-1">
              <span className="small text-muted fw-semibold">Available Beds</span>
              <i className="bi bi-door-open-fill text-success fs-5"></i>
            </div>
            <h3 className="fw-bold mb-0 text-success">{availableBeds}</h3>
            <span className="small text-muted">Vacant & ready for intake</span>
          </div>
        </div>

        <div className="col-sm-6 col-xl-3">
          <div className="stat-box h-100 border-start border-4 border-warning">
            <div className="d-flex justify-content-between align-items-center mb-1">
              <span className="small text-muted fw-semibold">PG Occupancy Rate</span>
              <i className="bi bi-pie-chart-fill text-warning fs-5"></i>
            </div>
            <h3 className="fw-bold mb-0 text-dark">{occupancyRate}%</h3>
            <div className="progress mt-2" style={{ height: '6px' }}>
              <div
                className="progress-bar bg-warning"
                role="progressbar"
                style={{ width: `${occupancyRate}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

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
                placeholder="Search Room (e.g. S-2, 101) or resident..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="col-sm-4 col-md-2">
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

          <div className="col-sm-4 col-md-2">
            <select
              className="form-select form-select-sm"
              value={sharingFilter}
              onChange={(e) => setSharingFilter(e.target.value)}
            >
              <option value="ALL">All Sharing Types</option>
              {distinctSharingTypes.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          <div className="col-sm-4 col-md-2">
            <select
              className="form-select form-select-sm"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">All Room Statuses</option>
              <option value="AVAILABLE">AVAILABLE</option>
              <option value="PARTIALLY_AVAILABLE">PARTIALLY AVAILABLE</option>
              <option value="FULL">FULL</option>
              <option value="MAINTENANCE">MAINTENANCE</option>
            </select>
          </div>

          <div className="col-md-2 text-end">
            <span className="small text-muted">
              Rooms: <strong>{filteredRooms.length}</strong> of <strong>{rooms.length}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Main Content Area: Cards or Table */}
      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status"></div>
          <p className="text-muted small mt-2">Loading room inventory...</p>
        </div>
      ) : filteredRooms.length === 0 ? (
        <div className="text-center py-5 bg-white rounded-4 border shadow-sm">
          <i className="bi bi-door-closed fs-1 text-muted"></i>
          <h6 className="fw-bold mt-2">No rooms found</h6>
          <p className="text-secondary small mb-3">No rooms match the selected filters.</p>
          <button
            onClick={() => {
              setSearch('');
              setAcFilter('ALL');
              setSharingFilter('ALL');
              setStatusFilter('ALL');
            }}
            className="btn btn-sm btn-outline-secondary"
          >
            Clear Filters
          </button>
        </div>
      ) : viewMode === 'CARDS' ? (
        /* Visual Room Cards Grid (Matching Prompt Section 5) */
        <div className="row g-3">
          {filteredRooms.map((room) => {
            const isFull = room.available_beds === 0;
            const isPartiallyAvailable = room.available_beds > 0 && room.occupied_beds > 0;

            return (
              <div key={room.id} className="col-md-6 col-xl-4">
                <div className="card h-100 border shadow-sm rounded-4 overflow-hidden">
                  {/* Card Header */}
                  <div className="card-header bg-white border-bottom p-3 d-flex justify-content-between align-items-center">
                    <div>
                      <div className="d-flex align-items-center gap-2">
                        <h5 className="fw-bold mb-0 text-dark">Room {room.room_number}</h5>
                        <span className={`badge ${room.is_ac ? 'bg-primary' : 'bg-secondary'}`}>
                          {room.is_ac ? 'AC' : 'Non-AC'}
                        </span>
                      </div>
                      <div className="small text-muted mt-1">
                        Floor {room.floor} — {getRoomSharingLabel(room)}
                      </div>
                    </div>

                    <div className="text-end">
                      <span
                        className={`status-pill status-${room.status.toLowerCase().replace('_', '-')}`}
                      >
                        {room.status.replace('_', ' ')}
                      </span>
                      <div className="fw-bold text-success small mt-1">
                        ₹{(room.monthly_rent_per_bed || room.monthly_rent || 0).toLocaleString('en-IN')}/mo
                      </div>
                    </div>
                  </div>

                  {/* Bus Seat-Selection Bed Map (RedBus Sleeper Berth Design) */}
                  <div className="card-body p-3 bg-light">
                    <BusSeatMap
                      room={room}
                      compact={true}
                      showLegend={true}
                      onAssign={(bed) => handleOpenAssign(bed, room)}
                      onTransfer={(bed) => handleOpenTransferFromBed(bed, room)}
                      onCheckout={(bed) => handleOpenCheckoutFromBed(bed, room)}
                      onSelectBed={(bed) => {
                        if (bed.is_occupied) {
                          handleOpenManageRoom(room);
                        } else if (bed.bed_status !== 'MAINTENANCE') {
                          handleOpenAssign(bed, room);
                        }
                      }}
                    />

                    {/* Occupancy Summary Progress Bar */}
                    <div className="d-flex justify-content-between align-items-center small mt-3 mb-1">
                      <span className="fw-semibold text-secondary">
                        Occupancy: {room.occupied_beds} / {room.capacity}
                      </span>
                      <span className="fw-bold text-success">
                        Available Beds: {room.available_beds}
                      </span>
                    </div>
                    <div className="progress" style={{ height: '6px', borderRadius: '4px' }}>
                      <div
                        className={`progress-bar ${isFull ? 'bg-danger' : isPartiallyAvailable ? 'bg-warning' : 'bg-success'}`}
                        role="progressbar"
                        style={{ width: `${room.occupancy_percentage || 0}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Card Footer Actions */}
                  <div className="card-footer bg-white border-top p-2 px-3 d-flex justify-content-between align-items-center">
                    <button
                      onClick={() => handleOpenManageRoom(room)}
                      className="btn btn-sm btn-outline-primary fw-semibold d-inline-flex align-items-center gap-1"
                    >
                      <i className="bi bi-gear-fill"></i> Manage Room
                    </button>

                    <div className="d-flex gap-1">
                      <button
                        onClick={() => handleOpenEdit(room)}
                        className="btn btn-sm btn-outline-secondary py-1 px-2"
                        title="Edit Details"
                      >
                        <i className="bi bi-pencil"></i>
                      </button>
                      <button
                        onClick={() => handleDeleteRoom(room)}
                        className="btn btn-sm btn-outline-danger py-1 px-2"
                        title="Delete Room"
                      >
                        <i className="bi bi-trash"></i>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <div className="bg-white p-4 rounded-4 border shadow-sm">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light small">
                <tr>
                  <th>Room #</th>
                  <th>Floor</th>
                  <th>Type</th>
                  <th>Sharing</th>
                  <th>Cooling</th>
                  <th>Rent / Bed</th>
                  <th>Beds (Occupied / Total)</th>
                  <th>Available</th>
                  <th>Status</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody className="small">
                {filteredRooms.map((r) => (
                  <tr key={r.id}>
                    <td className="fw-bold text-dark fs-6">Room {r.room_number}</td>
                    <td>Floor {r.floor}</td>
                    <td>{r.room_type}</td>
                    <td>{getRoomSharingLabel(r)}</td>
                    <td>
                      <span className={`badge ${r.is_ac ? 'bg-primary' : 'bg-secondary'}`}>
                        {r.is_ac ? 'AC' : 'Non-AC'}
                      </span>
                    </td>
                    <td className="fw-semibold">
                      ₹{(r.monthly_rent_per_bed || r.monthly_rent || 0).toLocaleString('en-IN')}
                    </td>
                    <td>
                      <span className="fw-bold">{r.occupied_beds}</span> / {r.capacity} beds
                    </td>
                    <td>
                      <span className="badge bg-success-subtle text-success border border-success-subtle">
                        {r.available_beds} Free
                      </span>
                    </td>
                    <td>
                      <span className={`status-pill status-${r.status.toLowerCase().replace('_', '-')}`}>
                        {r.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="text-end">
                      <div className="d-flex justify-content-end gap-1">
                        <button
                          onClick={() => handleOpenManageRoom(r)}
                          className="btn btn-sm btn-primary py-1 px-2"
                          title="Manage Room & Bed Allocations"
                        >
                          <i className="bi bi-gear-fill me-1"></i> Manage
                        </button>
                        <button
                          onClick={() => handleOpenEdit(r)}
                          className="btn btn-sm btn-outline-secondary py-1 px-2"
                          title="Edit Room"
                        >
                          <i className="bi bi-pencil"></i>
                        </button>
                        <button
                          onClick={() => handleDeleteRoom(r)}
                          className="btn btn-sm btn-outline-danger py-1 px-2"
                          title="Delete Room"
                        >
                          <i className="bi bi-trash"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 1. Add / Edit Room Modal */}
      {showRoomFormModal && (
        <div
          className="modal fade show d-block"
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', zIndex: 1060 }}
          tabIndex="-1"
        >
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
              <div className="modal-header bg-light border-0 py-3">
                <h5 className="modal-title fw-bold">
                  {editRoom ? `Edit Room ${editRoom.room_number}` : 'Create New PG Room'}
                </h5>
                <button type="button" className="btn-close" onClick={() => setShowRoomFormModal(false)}></button>
              </div>

              <form onSubmit={handleRoomFormSubmit}>
                <div className="modal-body p-4">
                  <div className="row g-3">
                    <div className="col-md-4">
                      <label className="form-label small fw-semibold">Room Number / Name *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. S-1, S-2, A-101"
                        className="form-control"
                        value={roomForm.room_number}
                        onChange={(e) => setRoomForm({ ...roomForm, room_number: e.target.value })}
                      />
                      <span className="text-muted" style={{ fontSize: '0.72rem' }}>
                        Must be unique within PG.
                      </span>
                    </div>

                    <div className="col-md-4">
                      <label className="form-label small fw-semibold">Floor Number *</label>
                      <input
                        type="number"
                        min="0"
                        required
                        className="form-control"
                        value={roomForm.floor}
                        onChange={(e) => setRoomForm({ ...roomForm, floor: e.target.value })}
                      />
                    </div>

                    <div className="col-md-4">
                      <label className="form-label small fw-semibold">Room Type (AC Option) *</label>
                      <select
                        className="form-select"
                        value={roomForm.is_ac ? 'true' : 'false'}
                        onChange={(e) => {
                          const isAc = e.target.value === 'true';
                          setRoomForm({ ...roomForm, is_ac: isAc, room_type: isAc ? 'AC' : 'Non-AC' });
                        }}
                      >
                        <option value="false">Non-AC (Ventilated)</option>
                        <option value="true">Air Conditioned (AC)</option>
                      </select>
                    </div>

                    <div className="col-md-4">
                      <label className="form-label small fw-semibold">
                        Sharing Capacity (Number of Persons) *
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="20"
                        step="1"
                        required
                        className="form-control"
                        placeholder="e.g. 1, 2, 3, 5, 6, 7, 8..."
                        value={roomForm.capacity}
                        onKeyDown={(e) => {
                          if (['.', 'e', 'E', '+', '-'].includes(e.key)) {
                            e.preventDefault();
                          }
                        }}
                        onChange={(e) => {
                          const rawVal = e.target.value;
                          if (rawVal === '') {
                            setRoomForm({ ...roomForm, capacity: '', sharing_type: '' });
                            return;
                          }
                          if (!/^\d+$/.test(rawVal)) return;
                          const parsed = parseInt(rawVal, 10);
                          if (!isNaN(parsed)) {
                            const bounded = Math.max(1, Math.min(20, parsed));
                            setRoomForm({
                              ...roomForm,
                              capacity: bounded,
                              sharing_type: capacityToSharingType(bounded),
                            });
                          }
                        }}
                      />
                      <span className="text-muted" style={{ fontSize: '0.72rem' }}>
                        Enter 1 to 20 persons per room.
                      </span>
                    </div>

                    <div className="col-md-4">
                      <label className="form-label small fw-semibold">Total Bed Capacity *</label>
                      <input
                        type="number"
                        readOnly
                        disabled
                        className="form-control bg-light text-dark fw-bold"
                        value={roomForm.capacity || ''}
                      />
                      <span className="text-primary fw-semibold" style={{ fontSize: '0.72rem' }}>
                        <i className="bi bi-info-circle me-1"></i> Auto-derived: {roomForm.capacity ? capacityToSharingType(roomForm.capacity) : '—'} ({roomForm.capacity || 0} Bed{roomForm.capacity === 1 ? '' : 's'})
                      </span>
                    </div>

                    <div className="col-md-4">
                      <label className="form-label small fw-semibold">Room Status *</label>
                      <select
                        className="form-select"
                        value={roomForm.status}
                        onChange={(e) => setRoomForm({ ...roomForm, status: e.target.value })}
                      >
                        <option value="AVAILABLE">AVAILABLE</option>
                        <option value="PARTIALLY_AVAILABLE">PARTIALLY_AVAILABLE</option>
                        <option value="FULL">FULL</option>
                        <option value="MAINTENANCE">MAINTENANCE</option>
                        <option value="INACTIVE">INACTIVE</option>
                      </select>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">Monthly Rent per Bed (₹) *</label>
                      <input
                        type="number"
                        required
                        placeholder="e.g. 5500"
                        className="form-control"
                        value={roomForm.monthly_rent_per_bed}
                        onChange={(e) => setRoomForm({ ...roomForm, monthly_rent_per_bed: e.target.value })}
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">Security Deposit (₹)</label>
                      <input
                        type="number"
                        placeholder="e.g. 5000"
                        className="form-control"
                        value={roomForm.security_deposit}
                        onChange={(e) => setRoomForm({ ...roomForm, security_deposit: e.target.value })}
                      />
                    </div>

                    <div className="col-12">
                      <label className="form-label small fw-semibold">Amenities (Comma separated)</label>
                      <input
                        type="text"
                        className="form-control"
                        value={roomForm.amenities}
                        onChange={(e) => setRoomForm({ ...roomForm, amenities: e.target.value })}
                      />
                    </div>

                    <div className="col-12">
                      <label className="form-label small fw-semibold">Room Description (Optional)</label>
                      <textarea
                        rows="2"
                        className="form-control"
                        value={roomForm.description}
                        onChange={(e) => setRoomForm({ ...roomForm, description: e.target.value })}
                      ></textarea>
                    </div>
                  </div>
                </div>

                <div className="modal-footer border-0 bg-light py-2">
                  <button type="button" className="btn btn-sm btn-secondary" onClick={() => setShowRoomFormModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" disabled={submitting} className="btn btn-sm btn-pg-primary fw-semibold">
                    {submitting ? 'Saving...' : editRoom ? 'Update Room Details' : 'Create Room & Generate Beds'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* 2. Manage Room Modal (Prompt Section 6) */}
      {showManageModal && selectedManageRoom && (
        <div
          className="modal fade show d-block"
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', zIndex: 1060 }}
          tabIndex="-1"
        >
          <div className="modal-dialog modal-dialog-centered modal-xl">
            <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
              <div className="modal-header bg-light border-0 py-3">
                <div>
                  <div className="d-flex align-items-center gap-2">
                    <h5 className="modal-title fw-bold mb-0">Manage Room {selectedManageRoom.room_number}</h5>
                    <span className={`badge ${selectedManageRoom.is_ac ? 'bg-primary' : 'bg-secondary'}`}>
                      {selectedManageRoom.is_ac ? 'AC' : 'Non-AC'}
                    </span>
                    <span className={`status-pill status-${selectedManageRoom.status.toLowerCase().replace('_', '-')}`}>
                      {selectedManageRoom.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="small text-muted mt-1">
                    Floor {selectedManageRoom.floor} • {getRoomSharingLabel(selectedManageRoom)} • ₹{(selectedManageRoom.monthly_rent_per_bed || selectedManageRoom.monthly_rent || 0).toLocaleString('en-IN')}/bed/month
                  </div>
                </div>
                <button type="button" className="btn-close" onClick={() => setShowManageModal(false)}></button>
              </div>

              <div className="modal-body p-4" style={{ maxHeight: '75vh', overflowY: 'auto' }}>
                {/* Stats row */}
                <div className="row g-3 mb-4">
                  <div className="col-sm-3">
                    <div className="p-3 bg-light rounded-3 text-center border">
                      <div className="small text-muted fw-semibold">Total Bed Capacity</div>
                      <h4 className="fw-bold mb-0 text-dark">{selectedManageRoom.capacity}</h4>
                    </div>
                  </div>
                  <div className="col-sm-3">
                    <div className="p-3 bg-light rounded-3 text-center border">
                      <div className="small text-muted fw-semibold">Occupied Beds</div>
                      <h4 className="fw-bold mb-0 text-danger">{selectedManageRoom.occupied_beds}</h4>
                    </div>
                  </div>
                  <div className="col-sm-3">
                    <div className="p-3 bg-light rounded-3 text-center border">
                      <div className="small text-muted fw-semibold">Available Beds</div>
                      <h4 className="fw-bold mb-0 text-success">{selectedManageRoom.available_beds}</h4>
                    </div>
                  </div>
                  <div className="col-sm-3">
                    <div className="p-3 bg-light rounded-3 text-center border">
                      <div className="small text-muted fw-semibold">Occupancy Rate</div>
                      <h4 className="fw-bold mb-0 text-primary">{selectedManageRoom.occupancy_percentage}%</h4>
                    </div>
                  </div>
                </div>

                {/* Visual View Switcher (RedBus Seat/Berth Layout vs List) */}
                <div className="d-flex flex-wrap justify-content-between align-items-center mb-3 p-2 bg-light rounded-3 border gap-2">
                  <div className="d-flex align-items-center gap-2">
                    <span className="small text-secondary fw-semibold">View Mode:</span>
                    <div className="btn-group btn-group-sm" role="group">
                      <button
                        type="button"
                        className={`btn px-3 fw-semibold ${manageTab === 'VISUAL' ? 'btn-danger text-white shadow-sm' : 'btn-outline-secondary'}`}
                        onClick={() => setManageTab('VISUAL')}
                      >
                        <i className="bi bi-grid-3x3-gap-fill me-1"></i> RedBus Seat/Berth Layout
                      </button>
                      <button
                        type="button"
                        className={`btn px-3 fw-semibold ${manageTab === 'LIST' ? 'btn-dark text-white shadow-sm' : 'btn-outline-secondary'}`}
                        onClick={() => setManageTab('LIST')}
                      >
                        <i className="bi bi-list-task me-1"></i> Compact Bed List
                      </button>
                    </div>
                  </div>

                  <span className="small text-muted">
                    {manageTab === 'VISUAL' ? (
                      <span>
                        <i className="bi bi-hand-index-thumb text-success me-1"></i> Green = Available • Red = Occupied • Click to assign or manage
                      </span>
                    ) : (
                      <span>Table of all {selectedManageRoom.capacity} bed allocations</span>
                    )}
                  </span>
                </div>

                {manageTab === 'VISUAL' ? (
                  <VisualRoomLayout
                    room={selectedManageRoom}
                    onAssign={(bed) => handleOpenAssign(bed, selectedManageRoom)}
                    onTransfer={(bed) => handleOpenTransferFromBed(bed, selectedManageRoom)}
                    onCheckout={(bed) => handleOpenCheckoutFromBed(bed, selectedManageRoom)}
                  />
                ) : (
                  <>
                    {/* Bed-by-bed Allocation List (Prompt Section 6) */}
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <h6 className="fw-bold mb-0 text-primary">
                        <i className="bi bi-layout-three-columns me-1"></i> Bed Allocations & Occupant Status
                      </h6>
                      <span className="small text-muted">
                        Green = Free • Red = Occupied
                      </span>
                    </div>

                    <div className="d-flex flex-column gap-3 mb-4">
                      {selectedManageRoom.beds?.map((bed) => {
                        const isOcc = bed.is_occupied;
                        const isMaint = bed.bed_status === 'MAINTENANCE';

                        return (
                          <div
                            key={bed.id}
                            className={`p-3 rounded-4 border d-flex flex-wrap justify-content-between align-items-center gap-3 ${
                              isOcc ? 'bg-danger-subtle bg-opacity-10 border-danger-subtle' : 'bg-success-subtle bg-opacity-10 border-success-subtle'
                            }`}
                          >
                            <div className="d-flex align-items-center gap-3">
                              <div
                                className={`rounded-circle d-flex align-items-center justify-content-center text-white fw-bold ${
                                  isOcc ? 'bg-danger' : isMaint ? 'bg-secondary' : 'bg-success'
                                }`}
                                style={{ width: '44px', height: '44px' }}
                              >
                                <i className={`bi bi-${isOcc ? 'person-fill' : isMaint ? 'tools' : 'check-lg'} fs-5`}></i>
                              </div>

                              <div>
                                <div className="d-flex align-items-center gap-2">
                                  <h6 className="fw-bold text-dark mb-0">{bed.bed_number}</h6>
                                  <span
                                    className={`badge ${
                                      isOcc ? 'bg-danger' : isMaint ? 'bg-secondary' : 'bg-success'
                                    } px-2 py-1`}
                                  >
                                    {isOcc ? 'OCCUPIED' : isMaint ? 'MAINTENANCE' : 'AVAILABLE'}
                                  </span>
                                </div>

                                {isOcc ? (
                                  <div className="small mt-1 text-dark">
                                    <span className="badge bg-dark font-monospace me-1">
                                      {bed.current_resident_code}
                                    </span>
                                    <strong>{bed.current_occupant_name}</strong>
                                    {bed.move_in_date && (
                                      <span className="text-muted ms-2">
                                        • Allocated: {bed.move_in_date}
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <div className="small text-success mt-1">
                                    Bed is vacant and ready to allocate.
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Bed Action buttons */}
                            <div className="d-flex gap-2">
                              {isOcc ? (
                                <>
                                  <button
                                    onClick={() => handleOpenTransferFromBed(bed, selectedManageRoom)}
                                    className="btn btn-sm btn-outline-warning text-dark fw-semibold"
                                    title="Transfer to another room/bed"
                                  >
                                    <i className="bi bi-arrow-left-right me-1"></i> Transfer
                                  </button>
                                  <button
                                    onClick={() => handleOpenCheckoutFromBed(bed, selectedManageRoom)}
                                    className="btn btn-sm btn-outline-danger fw-semibold"
                                    title="Check Out Resident"
                                  >
                                    <i className="bi bi-box-arrow-right me-1"></i> Check Out
                                  </button>
                                </>
                              ) : (
                                <button
                                  onClick={() => handleOpenAssign(bed, selectedManageRoom)}
                                  className="btn btn-sm btn-success fw-semibold"
                                >
                                  <i className="bi bi-person-plus-fill me-1"></i> Assign Resident
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}

                {/* Room Description & Details */}
                <div className="p-3 bg-light rounded-3 border">
                  <div className="small text-muted fw-semibold mb-1">Room Description & Amenities</div>
                  <p className="small mb-1">{selectedManageRoom.description || 'No description provided.'}</p>
                  <div className="small text-secondary">
                    <strong>Amenities:</strong> {selectedManageRoom.amenities || 'Standard amenities included.'}
                  </div>
                </div>
              </div>

              <div className="modal-footer border-0 bg-light py-2 d-flex justify-content-between">
                <div>
                  <button
                    onClick={() => {
                      setShowManageModal(false);
                      handleOpenEdit(selectedManageRoom);
                    }}
                    className="btn btn-sm btn-outline-secondary me-2"
                  >
                    <i className="bi bi-pencil me-1"></i> Edit Room
                  </button>
                </div>

                <button type="button" className="btn btn-sm btn-dark" onClick={() => setShowManageModal(false)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Assign Resident to Bed Modal */}
      {showAssignModal && assignBed && (
        <div
          className="modal fade show d-block"
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', zIndex: 1070 }}
          tabIndex="-1"
        >
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
              <div className="modal-header bg-success text-white border-0 py-3">
                <h5 className="modal-title fw-bold">
                  Assign Resident • Room {assignBed.room.room_number} ({assignBed.bed_number})
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowAssignModal(false)}></button>
              </div>

              <form onSubmit={handleAssignSubmit}>
                <div className="modal-body p-4">
                  {/* Mode switcher: Existing unallocated vs New resident */}
                  <div className="d-flex gap-2 mb-4 p-1 bg-light rounded-3 border">
                    <button
                      type="button"
                      className={`btn btn-sm flex-fill fw-semibold ${assignForm.mode === 'EXISTING' ? 'btn-white shadow-sm' : 'btn-light'}`}
                      onClick={() => setAssignForm({ ...assignForm, mode: 'EXISTING' })}
                    >
                      Assign Existing Resident ({unallocatedResidents.length} unassigned)
                    </button>
                    <button
                      type="button"
                      className={`btn btn-sm flex-fill fw-semibold ${assignForm.mode === 'NEW' ? 'btn-white shadow-sm' : 'btn-light'}`}
                      onClick={() => setAssignForm({ ...assignForm, mode: 'NEW' })}
                    >
                      + Register New Resident & Allocate
                    </button>
                  </div>

                  {assignForm.mode === 'EXISTING' ? (
                    <div>
                      <div className="mb-3">
                        <label className="form-label small fw-semibold">Select Resident *</label>
                        <select
                          className="form-select"
                          required
                          value={assignForm.resident_id}
                          onChange={(e) => setAssignForm({ ...assignForm, resident_id: e.target.value })}
                        >
                          <option value="">-- Choose Resident --</option>
                          {residents
                            .filter((r) => !r.current_allocation_id)
                            .map((r) => (
                              <option key={r.id} value={r.id}>
                                {r.resident_code} • {r.full_name} ({r.phone})
                              </option>
                            ))}
                        </select>
                        <span className="text-muted small mt-1" style={{ fontSize: '0.72rem' }}>
                          Only residents without an active room allocation are listed.
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="row g-3 mb-3">
                      <div className="col-md-6">
                        <label className="form-label small fw-semibold">Full Name *</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Arun Kumar"
                          className="form-control"
                          value={assignForm.full_name}
                          onChange={(e) => setAssignForm({ ...assignForm, full_name: e.target.value })}
                        />
                      </div>

                      <div className="col-md-6">
                        <label className="form-label small fw-semibold">
                          Phone Number * <span className="text-muted fw-normal">(10 digits)</span>
                        </label>
                        <input
                          type="tel"
                          inputMode="numeric"
                          maxLength={10}
                          required
                          placeholder="10-digit mobile number (e.g. 9876543210)"
                          className={`form-control ${
                            assignForm.phone
                              ? assignForm.phone.length === 10
                                ? 'is-valid'
                                : 'is-invalid'
                              : ''
                          }`}
                          value={assignForm.phone}
                          onChange={(e) => {
                            const clean = sanitizePhone(e.target.value);
                            setAssignForm({ ...assignForm, phone: clean });
                          }}
                        />
                        {assignForm.phone ? (
                          assignForm.phone.length === 10 ? (
                            <div className="text-success small mt-1" style={{ fontSize: '0.75rem' }}>
                              <i className="bi bi-check-circle-fill me-1"></i> Valid 10-digit Indian mobile number
                            </div>
                          ) : (
                            <div className="text-danger small mt-1" style={{ fontSize: '0.75rem' }}>
                              <i className="bi bi-exclamation-triangle-fill me-1"></i> Exactly 10 digits required ({assignForm.phone.length}/10 digits)
                            </div>
                          )
                        ) : (
                          <div className="text-muted small mt-1" style={{ fontSize: '0.72rem' }}>
                            Accepts digits 0–9 only. Max 10 digits, no country code or special characters.
                          </div>
                        )}
                      </div>

                      <div className="col-md-6">
                        <label className="form-label small fw-semibold">Email Address (Optional)</label>
                        <input
                          type="email"
                          className="form-control"
                          value={assignForm.email}
                          onChange={(e) => setAssignForm({ ...assignForm, email: e.target.value })}
                        />
                      </div>

                      <div className="col-md-6">
                        <label className="form-label small fw-semibold">Occupation</label>
                        <input
                          type="text"
                          placeholder="e.g. Software Engineer"
                          className="form-control"
                          value={assignForm.occupation}
                          onChange={(e) => setAssignForm({ ...assignForm, occupation: e.target.value })}
                        />
                      </div>

                      <div className="col-md-6">
                        <label className="form-label small fw-semibold">
                          Emergency Contact <span className="text-muted fw-normal">(10 digits, optional)</span>
                        </label>
                        <input
                          type="tel"
                          inputMode="numeric"
                          maxLength={10}
                          placeholder="10-digit mobile number (e.g. 9840123456)"
                          className={`form-control ${
                            assignForm.emergency_contact
                              ? assignForm.emergency_contact.length === 10
                                ? 'is-valid'
                                : 'is-invalid'
                              : ''
                          }`}
                          value={assignForm.emergency_contact}
                          onChange={(e) => {
                            const clean = sanitizePhone(e.target.value);
                            setAssignForm({ ...assignForm, emergency_contact: clean });
                          }}
                        />
                        {assignForm.emergency_contact && (
                          assignForm.emergency_contact.length === 10 ? (
                            <div className="text-success small mt-1" style={{ fontSize: '0.75rem' }}>
                              <i className="bi bi-check-circle-fill me-1"></i> Valid 10-digit emergency contact
                            </div>
                          ) : (
                            <div className="text-danger small mt-1" style={{ fontSize: '0.75rem' }}>
                              <i className="bi bi-exclamation-triangle-fill me-1"></i> Must be 10 numeric digits ({assignForm.emergency_contact.length}/10 digits)
                            </div>
                          )
                        )}
                      </div>

                      <div className="col-md-6">
                        <label className="form-label small fw-semibold">Native Place / Address</label>
                        <input
                          type="text"
                          placeholder="e.g. Trichy, Tamil Nadu"
                          className="form-control"
                          value={assignForm.address}
                          onChange={(e) => setAssignForm({ ...assignForm, address: e.target.value })}
                        />
                      </div>
                    </div>
                  )}

                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">Move-in Date *</label>
                      <input
                        type="date"
                        required
                        className="form-control"
                        value={assignForm.move_in_date}
                        onChange={(e) => setAssignForm({ ...assignForm, move_in_date: e.target.value })}
                      />
                    </div>

                    <div className="col-12">
                      <label className="form-label small fw-semibold">Admin Notes</label>
                      <textarea
                        rows="2"
                        className="form-control"
                        placeholder="e.g. Advance paid, original Aadhaar card verified."
                        value={assignForm.notes}
                        onChange={(e) => setAssignForm({ ...assignForm, notes: e.target.value })}
                      ></textarea>
                    </div>
                  </div>
                </div>

                <div className="modal-footer border-0 bg-light py-2">
                  <button type="button" className="btn btn-sm btn-secondary" onClick={() => setShowAssignModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" disabled={submitting} className="btn btn-sm btn-success fw-semibold">
                    {submitting ? 'Allocating...' : 'Confirm Bed Allocation'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* 4. Transfer Modal */}
      {showTransferModal && transferTarget && (
        <div
          className="modal fade show d-block"
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', zIndex: 1070 }}
          tabIndex="-1"
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
              <div className="modal-header bg-light border-0 py-3">
                <h5 className="modal-title fw-bold">Transfer Resident: {transferTarget.resident_name}</h5>
                <button type="button" className="btn-close" onClick={() => setShowTransferModal(false)}></button>
              </div>

              <form onSubmit={handleTransferSubmit}>
                <div className="modal-body p-4">
                  <div className="p-3 bg-light rounded-3 mb-3 small">
                    <div>Resident: <strong>{transferTarget.resident_name}</strong> ({transferTarget.resident_code})</div>
                    <div>Currently in: <strong>Room {transferTarget.room_number} • Bed {transferTarget.bed_number}</strong></div>
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
                        .filter((rm) => rm.available_beds > 0 && rm.status !== 'MAINTENANCE')
                        .map((rm) => (
                          <option key={rm.id} value={rm.id}>
                            Room {rm.room_number} • {getRoomSharingLabel(rm)} ({rm.is_ac ? 'AC' : 'Non-AC'}) • {rm.available_beds} beds free
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
                      {transferAvailableBeds.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.bed_number} (Free)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Transfer Date *</label>
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
                    {submitting ? 'Transferring...' : 'Execute Transfer'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* 5. Checkout Modal */}
      {showCheckoutModal && checkoutTarget && (
        <div
          className="modal fade show d-block"
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', zIndex: 1070 }}
          tabIndex="-1"
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
              <div className="modal-header bg-danger text-white border-0 py-3">
                <h5 className="modal-title fw-bold">Confirm Checkout</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowCheckoutModal(false)}></button>
              </div>

              <form onSubmit={handleCheckoutSubmit}>
                <div className="modal-body p-4">
                  <div className="p-3 bg-light rounded-3 mb-3 small">
                    <div>Resident: <strong>{checkoutTarget.resident_name}</strong> ({checkoutTarget.resident_code})</div>
                    <div>Currently occupying: <strong>Room {checkoutTarget.room_number} • Bed {checkoutTarget.bed_number}</strong></div>
                  </div>

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
                    {submitting ? 'Releasing Bed...' : 'Confirm Checkout'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
