import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { DEFAULT_ROOMS } from '../data/defaultData';

export default function Rooms() {
  const { requireAuth } = useAuth();
  const navigate = useNavigate();

  const [rooms, setRooms] = useState(DEFAULT_ROOMS);
  const [loading, setLoading] = useState(false);
  const [selectedType, setSelectedType] = useState('ALL');
  const [acFilter, setAcFilter] = useState('ALL');

  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const res = await api.get('/rooms');
        if (Array.isArray(res.data) && res.data.length > 0) {
          setRooms(res.data);
        }
      } catch (err) {
        console.warn('Could not load live rooms, keeping verified PG rooms', err);
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
            {filteredRooms.map((room, idx) => {
              let imagesList = ['/images/bedroom_double.png'];
              if (Array.isArray(room.images)) {
                imagesList = room.images;
              } else if (typeof room.images === 'string' && room.images.trim()) {
                try {
                  const parsed = JSON.parse(room.images);
                  if (Array.isArray(parsed) && parsed.length > 0) imagesList = parsed;
                } catch (e) {
                  imagesList = [room.images];
                }
              }
              const displayImg = imagesList[0] || '/images/bedroom_double.png';
              const amenities = room.amenities ? room.amenities.split(',').map((s) => s.trim()) : [];
              const statusRaw = room.status || 'AVAILABLE';
              const statusLabel = statusRaw.replace('_', ' ');
              const statusClass = statusRaw.toLowerCase().replace('_', '-');
              const sharingLabel = room.sharing_type || `${(room.room_type || 'Double').replace('_', ' ')} Sharing`;

              return (
                <div key={room.id || `room-${idx}`} className="col-md-6 col-lg-4">
                  <div className="pg-card h-100 d-flex flex-column">
                    {/* Image Header */}
                    <div className="position-relative overflow-hidden" style={{ height: '175px' }}>
                      <img
                        src={displayImg}
                        onError={(e) => { e.target.src = '/images/bedroom_double.png'; }}
                        alt={`Room ${room.room_number}`}
                        className="w-100 h-100"
                        style={{ objectFit: 'cover' }}
                      />
                      <div className="position-absolute top-0 start-0 m-2 d-flex gap-1">
                        <span className={`badge ${room.is_ac ? 'bg-primary' : 'bg-dark'} fw-semibold`} style={{ fontSize: '0.68rem' }}>
                          {room.is_ac ? 'AC' : 'Non-AC'}
                        </span>
                        <span className="badge bg-secondary" style={{ fontSize: '0.68rem' }}>
                          Fl {room.floor || 1}
                        </span>
                      </div>
                      <div className="position-absolute top-0 end-0 m-2">
                        <span className={`status-pill status-${statusClass}`} style={{ fontSize: '0.65rem', padding: '2px 8px' }}>
                          {statusLabel}
                        </span>
                      </div>
                    </div>

                    {/* Card Content */}
                    <div className="p-3 d-flex flex-column flex-grow-1 justify-content-between">
                      <div>
                        <div className="d-flex justify-content-between align-items-center mb-1">
                          <h5 className="fw-bold mb-0 text-dark" style={{ fontSize: '1rem' }}>Room {room.room_number}</h5>
                          <span className="badge bg-light text-dark border" style={{ fontSize: '0.68rem' }}>
                            {room.available_beds !== undefined ? room.available_beds : room.capacity} of {room.capacity} Beds Free
                          </span>
                        </div>

                        <div className="text-secondary small fw-semibold mb-1" style={{ fontSize: '0.8rem' }}>
                          {sharingLabel}
                        </div>

                        {/* Amenities Tags */}
                        <div className="d-flex flex-wrap gap-1 mb-2">
                          {amenities.slice(0, 3).map((am, i) => (
                            <span key={i} className="badge bg-light text-secondary border small" style={{ fontSize: '0.68rem' }}>
                              <i className="bi bi-check text-success me-0.5"></i>{am}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Pricing and Action Buttons */}
                      <div className="pt-2 border-top">
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <div>
                            <span className="text-muted d-block" style={{ fontSize: '0.68rem' }}>Monthly Rent</span>
                            <span className="fw-bold text-dark fs-6">
                              {room.monthly_rent ? `₹${room.monthly_rent.toLocaleString('en-IN')}` : 'Contact'}
                            </span>
                          </div>

                          {room.security_deposit && (
                            <div className="text-end">
                              <span className="text-muted d-block" style={{ fontSize: '0.68rem' }}>Deposit</span>
                              <span className="small fw-semibold text-secondary" style={{ fontSize: '0.78rem' }}>
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
                            {room.available_beds > 0 ? 'Book Room' : 'Full'}
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
