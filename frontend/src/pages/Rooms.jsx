import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function Rooms() {
  const { requireAuth } = useAuth();
  const navigate = useNavigate();

  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState('ALL');
  const [acFilter, setAcFilter] = useState('ALL');

  useEffect(() => {
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
    fetchRooms();
  }, []);

  const filteredRooms = rooms.filter((r) => {
    if (selectedType !== 'ALL' && r.room_type !== selectedType) return false;
    if (acFilter === 'AC' && !r.is_ac) return false;
    if (acFilter === 'NON_AC' && r.is_ac) return false;
    return true;
  });

  const handleBook = (room) => {
    if (requireAuth('Book a Room', '/book-room')) {
      navigate('/book-room', { state: { selectedRoomId: room.id, roomType: room.room_type, isAc: room.is_ac } });
    }
  };

  const handleScheduleVisit = () => {
    if (requireAuth('Schedule a Visit', '/visit-request')) {
      navigate('/visit-request');
    }
  };

  return (
    <div className="py-5 bg-light min-vh-100">
      <div className="container">
        {/* Title */}
        <div className="text-center max-w-700 mx-auto mb-4" style={{ maxWidth: '680px' }}>
          <span className="pill-badge pill-badge-accent mb-2">Room Directory</span>
          <h1 className="display-5 fw-extrabold mb-2">Available Rooms & Sharing Types</h1>
          <p className="text-secondary small">
            Choose from Single, Double, Triple, and Four-Sharing accommodations. Every room includes individual lockers, sturdy cots, and clean living.
          </p>
        </div>

        {/* Filter Controls */}
        <div className="bg-white p-3 rounded-4 shadow-sm border mb-4 d-flex flex-wrap gap-3 align-items-center justify-content-between">
          {/* Sharing Type Filters */}
          <div className="d-flex flex-wrap gap-2">
            {[
              { id: 'ALL', label: 'All Rooms' },
              { id: 'SINGLE', label: 'Single Occupancy' },
              { id: 'DOUBLE', label: 'Double Sharing' },
              { id: 'TRIPLE', label: 'Triple Sharing' },
              { id: 'FOUR_SHARING', label: '4-Sharing' },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setSelectedType(t.id)}
                className={`btn btn-sm ${selectedType === t.id ? 'btn-dark fw-bold' : 'btn-outline-secondary'}`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* AC / Non-AC Filters */}
          <div className="d-flex gap-2">
            <button
              onClick={() => setAcFilter('ALL')}
              className={`btn btn-sm ${acFilter === 'ALL' ? 'btn-primary fw-bold' : 'btn-outline-primary'}`}
            >
              All AC & Non-AC
            </button>
            <button
              onClick={() => setAcFilter('AC')}
              className={`btn btn-sm ${acFilter === 'AC' ? 'btn-primary fw-bold' : 'btn-outline-primary'}`}
            >
              AC Only
            </button>
            <button
              onClick={() => setAcFilter('NON_AC')}
              className={`btn btn-sm ${acFilter === 'NON_AC' ? 'btn-primary fw-bold' : 'btn-outline-primary'}`}
            >
              Non-AC Only
            </button>
          </div>
        </div>

        {/* Room Grid */}
        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status"></div>
            <p className="text-muted small mt-2">Loading room inventory...</p>
          </div>
        ) : filteredRooms.length === 0 ? (
          <div className="text-center py-5 bg-white rounded-4 border">
            <i className="bi bi-door-closed fs-1 text-muted"></i>
            <h5 className="fw-bold mt-2">No rooms match the selected filters</h5>
            <p className="text-muted small">Try selecting "All Rooms" or adjust AC options.</p>
            <button onClick={() => { setSelectedType('ALL'); setAcFilter('ALL'); }} className="btn btn-sm btn-outline-dark">
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="row g-4">
            {filteredRooms.map((room) => {
              const imagesList = room.images ? JSON.parse(room.images) : ['/images/bedroom_double.png'];
              const displayImg = imagesList[0] || '/images/bedroom_double.png';
              const amenities = room.amenities ? room.amenities.split(',').map((s) => s.trim()) : [];

              return (
                <div key={room.id} className="col-md-6 col-lg-4">
                  <div className="pg-card h-100 d-flex flex-column">
                    {/* Image Header */}
                    <div className="position-relative overflow-hidden" style={{ height: '220px' }}>
                      <img
                        src={displayImg}
                        alt={`Room ${room.room_number}`}
                        className="w-100 h-100"
                        style={{ objectFit: 'cover' }}
                      />
                      <div className="position-absolute top-0 start-0 m-2 d-flex gap-1">
                        <span className={`badge ${room.is_ac ? 'bg-primary' : 'bg-dark'} fw-semibold`}>
                          {room.is_ac ? 'Air Conditioned' : 'Non-AC Ventilated'}
                        </span>
                        <span className="badge bg-secondary">
                          Floor {room.floor}
                        </span>
                      </div>
                      <div className="position-absolute top-0 end-0 m-2">
                        <span className={`status-pill status-${room.status.toLowerCase().replace('_', '-')}`}>
                          {room.status.replace('_', ' ')}
                        </span>
                      </div>
                    </div>

                    {/* Card Content */}
                    <div className="p-4 d-flex flex-column flex-grow-1 justify-content-between">
                      <div>
                        <div className="d-flex justify-content-between align-items-center mb-1">
                          <h4 className="fw-bold mb-0">Room {room.room_number}</h4>
                          <span className="badge bg-light text-dark border">
                            {room.available_beds} of {room.capacity} Beds Free
                          </span>
                        </div>

                        <div className="text-secondary small fw-semibold mb-2">
                          {room.room_type.replace('_', ' ')} Sharing
                        </div>

                        <p className="text-muted small line-clamp-2 mb-3">
                          {room.description || 'Clean and comfortable bedroom with sturdy cot, red mattress, almirah, and ventilation.'}
                        </p>

                        {/* Amenities Tags */}
                        <div className="d-flex flex-wrap gap-1 mb-3">
                          {amenities.slice(0, 4).map((am, i) => (
                            <span key={i} className="badge bg-light text-secondary border small" style={{ fontSize: '0.72rem' }}>
                              <i className="bi bi-check text-success me-1"></i>{am}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Pricing and Action Buttons */}
                      <div className="pt-3 border-top">
                        <div className="d-flex justify-content-between align-items-center mb-3">
                          <div>
                            <span className="text-muted small d-block" style={{ fontSize: '0.72rem' }}>Monthly Rent</span>
                            <span className="fw-bold text-dark fs-5">
                              {room.monthly_rent ? `₹${room.monthly_rent.toLocaleString('en-IN')}` : 'Contact for Price'}
                            </span>
                            <span className="text-muted small"> / month</span>
                          </div>

                          {room.security_deposit && (
                            <div className="text-end">
                              <span className="text-muted small d-block" style={{ fontSize: '0.72rem' }}>Deposit</span>
                              <span className="small fw-semibold text-secondary">
                                ₹{room.security_deposit.toLocaleString('en-IN')}
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="d-flex gap-2">
                          <button
                            onClick={handleScheduleVisit}
                            className="btn btn-sm btn-outline-dark flex-fill"
                          >
                            <i className="bi bi-calendar2 me-1"></i> Visit
                          </button>
                          <button
                            onClick={() => handleBook(room)}
                            disabled={room.available_beds <= 0 || room.status === 'FULL'}
                            className="btn btn-sm btn-pg-primary flex-fill"
                          >
                            <i className="bi bi-key-fill me-1"></i>
                            {room.available_beds > 0 ? 'Book Room' : 'Fully Occupied'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
