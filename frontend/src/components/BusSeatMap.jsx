import React, { useState } from 'react';

/**
 * BusSeatBerth Component
 * Replicates the exact RedBus sleeper berth / seat selection icon from the reference:
 * - Rounded rectangular berth outline (border-radius: 8px)
 * - Pillow / headrest indicator bar
 * - Bed number clearly displayed
 * - Distinct states: Available (Green), Occupied (Red), Selected (Solid Green), Maintenance (Grey)
 */
export function BusSeatBerth({
  bed,
  room,
  isSelected = false,
  compact = false,
  onClick,
}) {
  const isOccupied = bed.is_occupied;
  const isMaintenance = bed.bed_status === 'MAINTENANCE';
  const isReserved = bed.bed_status === 'RESERVED';

  // Dimension sizing
  const width = compact ? '54px' : '72px';
  const height = compact ? '92px' : '118px';

  // State styling matching RedBus seat selection reference
  let stateStyles = {
    bg: '#FFFFFF',
    border: '2px solid #16A34A',
    textColor: '#15803D',
    pillowBg: '#DCFCE7',
    pillowBorder: '#86EFAC',
    statusText: 'FREE',
    statusBadge: 'text-success',
    shadow: '0 1px 3px rgba(22, 163, 74, 0.15)',
  };

  if (isSelected) {
    stateStyles = {
      bg: '#16A34A',
      border: '2px solid #14532D',
      textColor: '#FFFFFF',
      pillowBg: '#FFFFFF',
      pillowBorder: 'transparent',
      statusText: 'SELECTED',
      statusBadge: 'text-white',
      shadow: '0 0 0 3px rgba(22, 163, 74, 0.4), 0 4px 10px rgba(0,0,0,0.15)',
    };
  } else if (isOccupied) {
    stateStyles = {
      bg: '#FEF2F2',
      border: '2px solid #DC2626',
      textColor: '#991B1B',
      pillowBg: '#EF4444',
      pillowBorder: '#DC2626',
      statusText: 'OCCUPIED',
      statusBadge: 'text-danger',
      shadow: '0 1px 3px rgba(220, 38, 38, 0.15)',
    };
  } else if (isMaintenance) {
    stateStyles = {
      bg: '#F1F5F9',
      border: '2px solid #94A3B8',
      textColor: '#64748B',
      pillowBg: '#CBD5E1',
      pillowBorder: '#94A3B8',
      statusText: 'MAINT',
      statusBadge: 'text-secondary',
      shadow: 'none',
    };
  } else if (isReserved) {
    stateStyles = {
      bg: '#FFFBEB',
      border: '2px solid #F59E0B',
      textColor: '#B45309',
      pillowBg: '#FDE68A',
      pillowBorder: '#F59E0B',
      statusText: 'RESERVED',
      statusBadge: 'text-warning',
      shadow: '0 1px 3px rgba(245, 158, 11, 0.15)',
    };
  }

  const tooltip = isOccupied
    ? `${bed.bed_number}: Occupied by ${bed.current_occupant_name || 'Active Resident'} (${bed.current_resident_code || 'SLPG'}) - Click to view details`
    : isMaintenance
    ? `${bed.bed_number}: Under Maintenance / Blocked`
    : isReserved
    ? `${bed.bed_number}: Reserved Bed`
    : `${bed.bed_number}: Available - Click to Assign Resident`;

  return (
    <div
      onClick={() => onClick && onClick(bed)}
      className="bus-seat-berth position-relative d-flex flex-column justify-content-between align-items-center transition-all user-select-none"
      style={{
        width,
        height,
        backgroundColor: stateStyles.bg,
        border: stateStyles.border,
        borderRadius: '8px',
        padding: compact ? '4px 3px' : '6px 4px',
        cursor: isMaintenance ? 'not-allowed' : 'pointer',
        boxShadow: stateStyles.shadow,
        transition: 'all 0.15s ease-in-out',
        flexShrink: 0,
      }}
      title={tooltip}
    >
      {/* Top Headrest / Pillow Indicator (inspired by RedBus sleeper berth) */}
      <div
        className="w-100 d-flex justify-content-center"
        style={{ pointerEvents: 'none' }}
      >
        <div
          style={{
            width: '75%',
            height: compact ? '7px' : '10px',
            backgroundColor: stateStyles.pillowBg,
            border: `1px solid ${stateStyles.pillowBorder}`,
            borderRadius: '4px',
          }}
        ></div>
      </div>

      {/* Middle: Bed Number + State Info */}
      <div className="text-center my-auto w-100 px-1" style={{ pointerEvents: 'none' }}>
        <div
          className="fw-bold font-monospace lh-1"
          style={{
            color: stateStyles.textColor,
            fontSize: compact ? '0.75rem' : '0.88rem',
            letterSpacing: '0.02em',
          }}
        >
          {bed.bed_number}
        </div>

        {isOccupied ? (
          <div className="mt-1">
            <span
              className={`badge ${isSelected ? 'bg-white text-dark' : 'bg-danger text-white'} font-monospace px-1 py-0 text-truncate d-block`}
              style={{ fontSize: compact ? '0.55rem' : '0.62rem', maxWidth: '100%' }}
              title={bed.current_occupant_name}
            >
              {bed.current_resident_code || 'OCCUPIED'}
            </span>
            {!compact && bed.current_occupant_name && (
              <div
                className="text-truncate fw-semibold mt-1"
                style={{
                  fontSize: '0.62rem',
                  color: isSelected ? '#FFFFFF' : '#7F1D1D',
                  maxWidth: '100%',
                }}
              >
                {bed.current_occupant_name.split(' ')[0]}
              </div>
            )}
          </div>
        ) : isMaintenance ? (
          <div className="mt-1 text-secondary" style={{ fontSize: compact ? '0.55rem' : '0.62rem' }}>
            <i className="bi bi-tools d-block"></i>
            <span style={{ fontSize: '0.52rem' }}>Maint</span>
          </div>
        ) : (
          <div
            className="mt-1 fw-bold"
            style={{
              color: isSelected ? '#FFFFFF' : '#16A34A',
              fontSize: compact ? '0.58rem' : '0.65rem',
            }}
          >
            {isSelected ? 'SELECTED' : '+ FREE'}
          </div>
        )}
      </div>

      {/* Bottom Status Tag */}
      <div
        className="w-100 text-center border-top pt-1"
        style={{
          borderColor: isSelected
            ? 'rgba(255,255,255,0.2)'
            : isOccupied
            ? '#FECACA'
            : isMaintenance
            ? '#E2E8F0'
            : '#DCFCE7',
          fontSize: compact ? '0.52rem' : '0.58rem',
          color: stateStyles.textColor,
          pointerEvents: 'none',
          lineHeight: 1,
        }}
      >
        {isOccupied ? 'Occupied' : isMaintenance ? 'Blocked' : isReserved ? 'Reserved' : 'Available'}
      </div>
    </div>
  );
}

/**
 * BusSeatMap Component
 * Arranges beds like a RedBus sleeper coach / seat selection map:
 * - Single Sharing: 1 berth
 * - Double Sharing: 2 berths side-by-side
 * - Triple Sharing: 2+1 layout (2 berths on left, aisle, 1 berth on right)
 * - Four Sharing: 2+2 layout (2 berths on left, aisle, 2 berths on right)
 */
export const CAPACITY_WORDS = {
  1: 'Single',
  2: 'Double',
  3: 'Triple',
  4: 'Four',
  5: 'Five',
  6: 'Six',
  7: 'Seven',
  8: 'Eight',
  9: 'Nine',
  10: 'Ten',
  11: 'Eleven',
  12: 'Twelve',
  13: 'Thirteen',
  14: 'Fourteen',
  15: 'Fifteen',
  16: 'Sixteen',
  17: 'Seventeen',
  18: 'Eighteen',
  19: 'Nineteen',
  20: 'Twenty',
};

export const capacityToSharingType = (capacity) => {
  const cap = parseInt(capacity, 10);
  if (isNaN(cap) || cap < 1) return '';
  const word = CAPACITY_WORDS[cap] || `${cap}-Person`;
  return `${word} Sharing`;
};

export const getRoomSharingLabel = (room) => {
  if (!room) return 'Sharing';
  const cap = parseInt(room.capacity, 10);
  if (!isNaN(cap) && cap >= 1 && CAPACITY_WORDS[cap]) {
    return `${CAPACITY_WORDS[cap]} Sharing`;
  }
  if (room.sharing_type) {
    return room.sharing_type;
  }
  if (!isNaN(cap) && cap >= 1) {
    return `${cap} Sharing`;
  }
  return 'Double Sharing';
};

export default function BusSeatMap({
  room,
  selectedBedId = null,
  compact = false,
  showLegend = true,
  onSelectBed,
  onAssign,
  onTransfer,
  onCheckout,
}) {
  const [internalSelectedBed, setInternalSelectedBed] = useState(null);

  if (!room) return null;

  const rawBeds = room.beds || [];
  const capacity = Math.max(1, Math.min(20, parseInt(room.capacity, 10) || rawBeds.length || 2));
  const sharingType = getRoomSharingLabel(room);

  // Guarantee that exactly room.capacity beds are rendered
  let beds = [...rawBeds];
  if (beds.length < capacity) {
    for (let i = beds.length + 1; i <= capacity; i++) {
      beds.push({
        id: `auto-${room.id || 'rm'}-bed-${i}`,
        bed_number: `Bed ${i}`,
        bed_status: 'AVAILABLE',
        is_occupied: false,
      });
    }
  } else if (beds.length > capacity) {
    beds = beds.slice(0, capacity);
  }

  const activeSelectedBed =
    selectedBedId !== null
      ? beds.find((b) => b.id === selectedBedId) || internalSelectedBed
      : internalSelectedBed;

  const handleBedClick = (bed) => {
    setInternalSelectedBed(bed);
    if (onSelectBed) {
      onSelectBed(bed, room);
    } else {
      // Default direct interaction
      if (!bed.is_occupied && bed.bed_status !== 'MAINTENANCE' && onAssign) {
        onAssign(bed, room);
      }
    }
  };

  // Group beds according to RedBus seating layout (e.g. 2+1 for triple, 2+2 for four, multi-row for 5-20)
  let leftBeds = [];
  let rightBeds = [];

  if (capacity === 1) {
    leftBeds = beds;
  } else if (capacity === 2) {
    leftBeds = beds;
  } else if (capacity === 3) {
    leftBeds = beds.slice(0, 2);
    rightBeds = beds.slice(2);
  } else if (capacity === 4) {
    leftBeds = beds.slice(0, 2);
    rightBeds = beds.slice(2, 4);
  } else {
    // 5 to 20 sharing: split evenly into left and right columns with central aisle passage
    const half = Math.ceil(beds.length / 2);
    leftBeds = beds.slice(0, half);
    rightBeds = beds.slice(half);
  }

  const hasAisle = capacity >= 3;

  return (
    <div className={`bus-seat-map-wrapper ${compact ? 'compact-mode' : 'full-mode'}`}>
      {/* Seat Map Legend (RedBus style) */}
      {showLegend && (
        <div
          className="d-flex flex-wrap align-items-center justify-content-center gap-3 mb-2 py-1 px-2 rounded-3 bg-white border"
          style={{ fontSize: compact ? '0.68rem' : '0.74rem' }}
        >
          <div className="d-flex align-items-center gap-1">
            <span
              style={{
                width: '12px',
                height: '16px',
                backgroundColor: '#FFFFFF',
                border: '2px solid #16A34A',
                borderRadius: '3px',
                display: 'inline-block',
              }}
            ></span>
            <span className="text-secondary fw-semibold">Available</span>
          </div>

          <div className="d-flex align-items-center gap-1">
            <span
              style={{
                width: '12px',
                height: '16px',
                backgroundColor: '#FEF2F2',
                border: '2px solid #DC2626',
                borderRadius: '3px',
                display: 'inline-block',
              }}
            ></span>
            <span className="text-secondary fw-semibold">Occupied</span>
          </div>

          <div className="d-flex align-items-center gap-1">
            <span
              style={{
                width: '12px',
                height: '16px',
                backgroundColor: '#16A34A',
                border: '2px solid #14532D',
                borderRadius: '3px',
                display: 'inline-block',
              }}
            ></span>
            <span className="text-secondary fw-semibold">Selected</span>
          </div>

          <div className="d-flex align-items-center gap-1">
            <span
              style={{
                width: '12px',
                height: '16px',
                backgroundColor: '#F1F5F9',
                border: '2px solid #94A3B8',
                borderRadius: '3px',
                display: 'inline-block',
              }}
            ></span>
            <span className="text-secondary fw-semibold">Maintenance</span>
          </div>
        </div>
      )}

      {/* Bus Seat Layout Deck Box */}
      <div
        className="bus-deck-box p-2 p-md-3 rounded-4 border position-relative"
        style={{
          backgroundColor: '#F8FAFC',
          border: '2px solid #E2E8F0',
          backgroundImage:
            'radial-gradient(#E2E8F0 1px, transparent 1px), radial-gradient(#E2E8F0 1px, #F8FAFC 1px)',
          backgroundSize: '16px 16px',
        }}
      >
        {/* Cabin Header Info */}
        <div className="d-flex justify-content-between align-items-center px-1 mb-2">
          <span
            className="badge bg-dark bg-opacity-75 font-monospace px-2 py-0"
            style={{ fontSize: '0.65rem' }}
          >
            {room.room_number ? `ROOM ${room.room_number}` : 'ROOM BERTH MAP'} • {sharingType.toUpperCase()}
          </span>

          <span className="text-muted small" style={{ fontSize: '0.68rem' }}>
            <span className="text-success fw-bold">{room.available_beds ?? (capacity - (room.occupied_beds || 0))} Available</span> •{' '}
            <span className="text-danger fw-bold">{room.occupied_beds || 0} Occupied</span>
          </span>
        </div>

        {/* Bus Seat Grid (Left Column - Aisle - Right Column) */}
        <div className="d-flex justify-content-center align-items-stretch gap-2 gap-md-3 py-1">
          {/* Left Column / Row of Berths */}
          <div
            className="d-flex flex-wrap justify-content-center align-content-start gap-2"
            style={{
              maxWidth: compact
                ? leftBeds.length > 1
                  ? '124px'
                  : '62px'
                : leftBeds.length > 1
                ? '168px'
                : '85px',
            }}
          >
            {leftBeds.map((bed) => (
              <BusSeatBerth
                key={bed.id}
                bed={bed}
                room={room}
                compact={compact}
                isSelected={activeSelectedBed?.id === bed.id}
                onClick={handleBedClick}
              />
            ))}
          </div>

          {/* Central Aisle / Walkway (Present in 2+1 and 2+2 layouts like RedBus) */}
          {hasAisle && (
            <div
              className="aisle-divider d-flex flex-column align-items-center justify-content-center px-1"
              style={{
                alignSelf: 'stretch',
                minHeight: compact ? '88px' : '110px',
                borderLeft: '1px dashed #CBD5E1',
                borderRight: '1px dashed #CBD5E1',
                backgroundColor: 'rgba(241, 245, 249, 0.6)',
              }}
            >
              <span
                className="text-muted text-uppercase fw-semibold"
                style={{
                  fontSize: '0.52rem',
                  letterSpacing: '0.12em',
                  writingMode: 'vertical-rl',
                  transform: 'rotate(180deg)',
                  opacity: 0.7,
                }}
              >
                Aisle Passage
              </span>
            </div>
          )}

          {/* Right Column / Row of Berths (for Triple 2+1 or Four 2+2 or multi-bed) */}
          {hasAisle && rightBeds.length > 0 && (
            <div
              className="d-flex flex-wrap justify-content-center align-content-start gap-2"
              style={{
                maxWidth: compact
                  ? rightBeds.length > 1
                    ? '124px'
                    : '62px'
                  : rightBeds.length > 1
                  ? '168px'
                  : '85px',
              }}
            >
              {rightBeds.map((bed) => (
                <BusSeatBerth
                  key={bed.id}
                  bed={bed}
                  room={room}
                  compact={compact}
                  isSelected={activeSelectedBed?.id === bed.id}
                  onClick={handleBedClick}
                />
              ))}
            </div>
          )}
        </div>

        <div className="text-center mt-2 text-muted" style={{ fontSize: '0.62rem' }}>
          <i className="bi bi-hand-index-thumb text-success me-1"></i>
          {compact
            ? 'Click any seat to allocate or manage resident'
            : 'Click green seat to assign resident • Click red seat for resident details & actions'}
        </div>
      </div>

      {/* Interactive Detail Panel for Selected Seat (in Full Mode) */}
      {!compact && activeSelectedBed && (
        <div className="mt-3 p-3 bg-white rounded-4 border shadow-sm animate__animated animate__fadeIn">
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
            <div className="d-flex align-items-center gap-3">
              <div
                className="d-flex align-items-center justify-content-center text-white fw-bold rounded-3"
                style={{
                  width: '44px',
                  height: '44px',
                  backgroundColor: activeSelectedBed.is_occupied
                    ? '#DC2626'
                    : activeSelectedBed.bed_status === 'MAINTENANCE'
                    ? '#64748B'
                    : '#16A34A',
                }}
              >
                <i
                  className={`bi bi-${
                    activeSelectedBed.is_occupied
                      ? 'person-fill'
                      : activeSelectedBed.bed_status === 'MAINTENANCE'
                      ? 'tools'
                      : 'check-lg'
                  } fs-4`}
                ></i>
              </div>

              <div>
                <div className="d-flex align-items-center gap-2">
                  <h6 className="fw-bold mb-0 text-dark">
                    Room {room.room_number} • Bed {activeSelectedBed.bed_number}
                  </h6>
                  <span
                    className={`badge ${
                      activeSelectedBed.is_occupied
                        ? 'bg-danger'
                        : activeSelectedBed.bed_status === 'MAINTENANCE'
                        ? 'bg-secondary'
                        : 'bg-success'
                    }`}
                  >
                    {activeSelectedBed.is_occupied
                      ? 'OCCUPIED'
                      : activeSelectedBed.bed_status || 'AVAILABLE'}
                  </span>
                </div>

                {activeSelectedBed.is_occupied ? (
                  <div className="small text-secondary mt-1">
                    Resident:{' '}
                    <strong className="text-dark">
                      {activeSelectedBed.current_occupant_name || 'Active Resident'}
                    </strong>{' '}
                    (
                    <span className="badge bg-dark font-monospace text-white py-0 px-1 me-1">
                      {activeSelectedBed.current_resident_code || 'SLPG'}
                    </span>
                    ) • Move-in: {activeSelectedBed.move_in_date || 'N/A'}
                  </div>
                ) : (
                  <div className="small text-success mt-1">
                    This bed seat is vacant and ready for immediate resident intake.
                  </div>
                )}
              </div>
            </div>

            {/* Actions for the selected seat */}
            <div className="d-flex flex-wrap gap-2">
              {activeSelectedBed.is_occupied ? (
                <>
                  <button
                    type="button"
                    onClick={() => onTransfer && onTransfer(activeSelectedBed, room)}
                    className="btn btn-sm btn-outline-warning text-dark fw-semibold"
                  >
                    <i className="bi bi-arrow-left-right me-1"></i> Transfer Room
                  </button>

                  <button
                    type="button"
                    onClick={() => onCheckout && onCheckout(activeSelectedBed, room)}
                    className="btn btn-sm btn-outline-danger fw-semibold"
                  >
                    <i className="bi bi-box-arrow-right me-1"></i> Check Out
                  </button>
                </>
              ) : activeSelectedBed.bed_status !== 'MAINTENANCE' ? (
                <button
                  type="button"
                  onClick={() => onAssign && onAssign(activeSelectedBed, room)}
                  className="btn btn-sm btn-success fw-bold px-3 shadow-sm"
                >
                  <i className="bi bi-person-plus-fill me-1"></i> Assign Resident to {activeSelectedBed.bed_number}
                </button>
              ) : null}

              <button
                type="button"
                onClick={() => setInternalSelectedBed(null)}
                className="btn btn-sm btn-outline-secondary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
