import React, { useState, useEffect } from 'react';
import api from '../../services/api';

export default function AdminRooms() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);

  // Add / Edit Modal state
  const [editRoom, setEditRoom] = useState(null); // null = Add, object = Edit
  const [showFormModal, setShowFormModal] = useState(false);
  const [roomForm, setRoomForm] = useState({
    room_number: '',
    room_type: 'DOUBLE',
    is_ac: false,
    floor: 1,
    capacity: 2,
    available_beds: 2,
    monthly_rent: 6500,
    security_deposit: 5000,
    description: '',
    amenities: 'Free Wi-Fi, Ceiling Fan, Individual Cupboard, Hot Water',
    status: 'AVAILABLE',
  });

  // Bed Drawer State
  const [selectedRoomBeds, setSelectedRoomBeds] = useState(null);

  const fetchRooms = async () => {
    try {
      const res = await api.get('/rooms');
      setRooms(res.data);
    } catch (err) {
      console.error('Failed to load rooms', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  const openAddModal = () => {
    setEditRoom(null);
    setRoomForm({
      room_number: '',
      room_type: 'DOUBLE',
      is_ac: false,
      floor: 1,
      capacity: 2,
      available_beds: 2,
      monthly_rent: 6500,
      security_deposit: 5000,
      description: 'Comfortable accommodation with individual lockers, sturdy cots, and daily cleaning.',
      amenities: 'Free Wi-Fi, Ceiling Fan, Individual Cupboard, Hot Water',
      status: 'AVAILABLE',
    });
    setShowFormModal(true);
  };

  const openEditModal = (room) => {
    setEditRoom(room);
    setRoomForm({
      room_number: room.room_number,
      room_type: room.room_type,
      is_ac: room.is_ac,
      floor: room.floor,
      capacity: room.capacity,
      available_beds: room.available_beds,
      monthly_rent: room.monthly_rent || 0,
      security_deposit: room.security_deposit || 0,
      description: room.description || '',
      amenities: room.amenities || '',
      status: room.status,
    });
    setShowFormModal(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editRoom) {
        await api.put(`/admin/rooms/${editRoom.id}`, roomForm);
      } else {
        await api.post('/admin/rooms', roomForm);
      }
      setShowFormModal(false);
      fetchRooms();
    } catch (err) {
      alert(err.response?.data?.detail || 'Error saving room details.');
    }
  };

  const handleDeleteRoom = async (roomId, roomNumber) => {
    if (!window.confirm(`Are you sure you want to delete Room ${roomNumber}?`)) return;
    try {
      await api.delete(`/admin/rooms/${roomId}`);
      fetchRooms();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to delete room.');
    }
  };

  const openBedDrawer = (room) => {
    setSelectedRoomBeds(room);
  };

  const handleToggleBed = async (bed) => {
    if (!selectedRoomBeds) return;
    const newOccupied = !bed.is_occupied;
    const name = newOccupied ? window.prompt('Enter resident name for this bed:', 'Resident') : null;
    if (newOccupied && name === null) return;

    try {
      await api.put(`/admin/rooms/${selectedRoomBeds.id}/beds/${bed.id}`, {
        is_occupied: newOccupied,
        current_occupant_name: name,
      });
      // Refresh current room in drawer and table
      const res = await api.get('/rooms');
      setRooms(res.data);
      const updated = res.data.find((r) => r.id === selectedRoomBeds.id);
      setSelectedRoomBeds(updated || null);
    } catch (err) {
      alert('Failed to update bed status.');
    }
  };

  return (
    <div className="bg-white p-4 rounded-4 border shadow-sm">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div>
          <h4 className="fw-bold mb-1">Room Inventory & Bed Management</h4>
          <p className="text-secondary small mb-0">
            Configure room types, AC options, capacity, monthly rent, and live bed allocations.
          </p>
        </div>

        <button onClick={openAddModal} className="btn btn-sm btn-pg-primary fw-semibold">
          <i className="bi bi-plus-lg me-1"></i> Add New Room
        </button>
      </div>

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status"></div>
        </div>
      ) : (
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light small">
              <tr>
                <th>Room #</th>
                <th>Type</th>
                <th>Cooling</th>
                <th>Floor</th>
                <th>Rent / Month</th>
                <th>Deposit</th>
                <th>Occupancy (Free / Total)</th>
                <th>Status</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody className="small">
              {rooms.map((r) => (
                <tr key={r.id}>
                  <td className="fw-bold text-dark fs-6">Room {r.room_number}</td>
                  <td>{r.room_type.replace('_', ' ')}</td>
                  <td>
                    <span className={`badge ${r.is_ac ? 'bg-primary' : 'bg-secondary'}`}>
                      {r.is_ac ? 'AC' : 'Non-AC'}
                    </span>
                  </td>
                  <td>Floor {r.floor}</td>
                  <td className="fw-semibold">
                    {r.monthly_rent ? `₹${r.monthly_rent.toLocaleString('en-IN')}` : 'Contact'}
                  </td>
                  <td className="text-muted">
                    {r.security_deposit ? `₹${r.security_deposit.toLocaleString('en-IN')}` : '-'}
                  </td>
                  <td>
                    <button
                      onClick={() => openBedDrawer(r)}
                      className="btn btn-sm btn-light border py-1 px-2 d-inline-flex align-items-center gap-2"
                      title="Click to view and toggle beds"
                    >
                      <i className="bi bi-layout-three-columns text-primary"></i>
                      <span className="fw-bold">{r.available_beds} of {r.capacity} Free</span>
                    </button>
                  </td>
                  <td>
                    <span className={`status-pill status-${r.status.toLowerCase().replace('_', '-')}`}>
                      {r.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="text-end">
                    <div className="d-flex justify-content-end gap-1">
                      <button
                        onClick={() => openEditModal(r)}
                        className="btn btn-sm btn-outline-secondary py-1 px-2"
                        title="Edit Details"
                      >
                        <i className="bi bi-pencil"></i>
                      </button>
                      <button
                        onClick={() => handleDeleteRoom(r.id, r.room_number)}
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
      )}

      {/* Add / Edit Room Modal */}
      {showFormModal && (
        <div
          className="modal fade show d-block"
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', zIndex: 1060 }}
          tabIndex="-1"
        >
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
              <div className="modal-header bg-light border-0 py-3">
                <h5 className="modal-title fw-bold">
                  {editRoom ? `Edit Room ${editRoom.room_number}` : 'Add New Room'}
                </h5>
                <button type="button" className="btn-close" onClick={() => setShowFormModal(false)}></button>
              </div>

              <form onSubmit={handleFormSubmit}>
                <div className="modal-body p-4">
                  <div className="row g-3">
                    <div className="col-md-4">
                      <label className="form-label small fw-semibold">Room Number *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. 103"
                        className="form-control"
                        value={roomForm.room_number}
                        onChange={(e) => setRoomForm({ ...roomForm, room_number: e.target.value })}
                      />
                    </div>

                    <div className="col-md-4">
                      <label className="form-label small fw-semibold">Sharing Category *</label>
                      <select
                        className="form-select"
                        value={roomForm.room_type}
                        onChange={(e) => setRoomForm({ ...roomForm, room_type: e.target.value })}
                      >
                        <option value="SINGLE">Single Occupancy</option>
                        <option value="DOUBLE">Double Sharing</option>
                        <option value="TRIPLE">Triple Sharing</option>
                        <option value="FOUR_SHARING">4-Sharing</option>
                      </select>
                    </div>

                    <div className="col-md-4">
                      <label className="form-label small fw-semibold">AC Option *</label>
                      <select
                        className="form-select"
                        value={roomForm.is_ac ? 'true' : 'false'}
                        onChange={(e) => setRoomForm({ ...roomForm, is_ac: e.target.value === 'true' })}
                      >
                        <option value="false">Non-AC (Ventilated)</option>
                        <option value="true">Air Conditioned (AC)</option>
                      </select>
                    </div>

                    <div className="col-md-4">
                      <label className="form-label small fw-semibold">Floor Number</label>
                      <input
                        type="number"
                        min="0"
                        className="form-control"
                        value={roomForm.floor}
                        onChange={(e) => setRoomForm({ ...roomForm, floor: parseInt(e.target.value) })}
                      />
                    </div>

                    <div className="col-md-4">
                      <label className="form-label small fw-semibold">Bed Capacity</label>
                      <input
                        type="number"
                        min="1"
                        max="8"
                        className="form-control"
                        value={roomForm.capacity}
                        onChange={(e) => setRoomForm({ ...roomForm, capacity: parseInt(e.target.value) })}
                      />
                    </div>

                    <div className="col-md-4">
                      <label className="form-label small fw-semibold">Room Status</label>
                      <select
                        className="form-select"
                        value={roomForm.status}
                        onChange={(e) => setRoomForm({ ...roomForm, status: e.target.value })}
                      >
                        <option value="AVAILABLE">AVAILABLE</option>
                        <option value="PARTIALLY_AVAILABLE">PARTIALLY_AVAILABLE</option>
                        <option value="FULL">FULL</option>
                        <option value="MAINTENANCE">MAINTENANCE</option>
                      </select>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">Monthly Rent (₹)</label>
                      <input
                        type="number"
                        placeholder="e.g. 6500"
                        className="form-control"
                        value={roomForm.monthly_rent}
                        onChange={(e) => setRoomForm({ ...roomForm, monthly_rent: parseFloat(e.target.value) })}
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">Security Deposit (₹)</label>
                      <input
                        type="number"
                        placeholder="e.g. 5000"
                        className="form-control"
                        value={roomForm.security_deposit}
                        onChange={(e) => setRoomForm({ ...roomForm, security_deposit: parseFloat(e.target.value) })}
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
                      <label className="form-label small fw-semibold">Description</label>
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
                  <button type="button" className="btn btn-sm btn-secondary" onClick={() => setShowFormModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-sm btn-pg-primary fw-semibold">
                    {editRoom ? 'Save Changes' : 'Create Room'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Bed Drawer / Modal */}
      {selectedRoomBeds && (
        <div
          className="modal fade show d-block"
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', zIndex: 1060 }}
          tabIndex="-1"
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
              <div className="modal-header bg-light border-0 py-3">
                <h5 className="modal-title fw-bold">
                  Room {selectedRoomBeds.room_number} • Bed Allocations
                </h5>
                <button type="button" className="btn-close" onClick={() => setSelectedRoomBeds(null)}></button>
              </div>

              <div className="modal-body p-4">
                <p className="small text-secondary mb-3">
                  Click on any bed to toggle between occupied and vacant.
                </p>

                <div className="d-flex flex-column gap-2">
                  {selectedRoomBeds.beds?.map((bed) => (
                    <div
                      key={bed.id}
                      className="p-3 rounded-3 border d-flex justify-content-between align-items-center bg-light"
                    >
                      <div className="d-flex align-items-center gap-3">
                        <div
                          className={`d-flex align-items-center justify-content-center rounded-circle ${
                            bed.is_occupied ? 'bg-danger text-white' : 'bg-success text-white'
                          }`}
                          style={{ width: '40px', height: '40px' }}
                        >
                          <i className={`bi bi-${bed.is_occupied ? 'person-fill' : 'check-lg'} fs-5`}></i>
                        </div>
                        <div>
                          <div className="fw-bold text-dark">Bed {bed.bed_number}</div>
                          <div className="small text-muted">
                            {bed.is_occupied ? `Occupied by: ${bed.current_occupant_name || 'Resident'}` : 'Vacant & Available'}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => handleToggleBed(bed)}
                        className={`btn btn-sm ${bed.is_occupied ? 'btn-outline-danger' : 'btn-outline-success'} fw-semibold`}
                      >
                        {bed.is_occupied ? 'Free Bed' : 'Mark Occupied'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="modal-footer border-0 bg-light py-2">
                <button type="button" className="btn btn-sm btn-dark" onClick={() => setSelectedRoomBeds(null)}>
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
