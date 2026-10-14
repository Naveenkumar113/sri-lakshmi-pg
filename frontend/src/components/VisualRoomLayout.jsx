import React from 'react';
import BusSeatMap, { getRoomSharingLabel } from './BusSeatMap';

/**
 * VisualRoomLayout Component
 * Displays the room bed layout styled as a RedBus seat-selection map:
 * - Sleeper berths with rounded outlines and pillow headrests
 * - 2+1 aisle layout for Triple Sharing, 2+2 for Four Sharing, 2 side-by-side for Double, 1 for Single
 * - Clear available (white/green), occupied (red), selected (solid green), and maintenance (grey) states
 */
export default function VisualRoomLayout({
  room,
  onAssign,
  onTransfer,
  onCheckout,
  onViewResident,
}) {
  if (!room) return null;

  return (
    <div className="visual-room-seatmap-container bg-white rounded-4 border shadow-sm p-3 p-md-4 mb-4">
      {/* Header */}
      <div className="d-flex flex-wrap justify-content-between align-items-center pb-3 mb-3 border-bottom gap-2">
        <div>
          <div className="d-flex align-items-center gap-2">
            <span className="badge bg-danger text-white px-2 py-1 font-monospace">
              <i className="bi bi-grid-3x3-gap-fill me-1"></i> SEAT MAP
            </span>
            <h5 className="fw-bold mb-0 text-dark">
              Room {room.room_number} — {getRoomSharingLabel(room)}
            </h5>
            <span className={`badge ${room.is_ac ? 'bg-primary' : 'bg-secondary'}`}>
              {room.is_ac ? 'AC' : 'Non-AC'}
            </span>
          </div>
          <div className="small text-muted mt-1">
            Floor {room.floor} • Capacity: {room.capacity} Bed{room.capacity > 1 ? 's' : ''} •{' '}
            <span className="text-danger fw-semibold">{room.occupied_beds || 0} Occupied</span> •{' '}
            <span className="text-success fw-semibold">{room.available_beds || 0} Available</span>
          </div>
        </div>

        <div className="text-end">
          <span className="small text-secondary fw-semibold d-block">Monthly Rent / Bed</span>
          <span className="fw-bold text-success fs-6">
            ₹{(room.monthly_rent_per_bed || room.monthly_rent || 0).toLocaleString('en-IN')}/mo
          </span>
        </div>
      </div>

      {/* Bus Seat Map */}
      <BusSeatMap
        room={room}
        compact={false}
        showLegend={true}
        onAssign={onAssign}
        onTransfer={onTransfer}
        onCheckout={onCheckout}
      />
    </div>
  );
}
