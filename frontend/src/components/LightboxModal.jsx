import React, { useState, useEffect } from 'react';

export default function LightboxModal({ images, activeIndex, onClose, onNavigate }) {
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    // Reset zoom when navigating
    setZoom(1);

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') onNavigate((activeIndex + 1) % images.length);
      if (e.key === 'ArrowLeft') onNavigate((activeIndex - 1 + images.length) % images.length);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeIndex, images.length, onClose, onNavigate]);

  if (activeIndex === null || !images[activeIndex]) return null;

  const current = images[activeIndex];

  const toggleZoom = () => {
    setZoom((prev) => (prev === 1 ? 1.75 : 1));
  };

  return (
    <div
      className="position-fixed top-0 start-0 w-100 h-100 d-flex flex-column justify-content-between p-3 p-md-4"
      style={{
        backgroundColor: 'rgba(10, 15, 30, 0.94)',
        backdropFilter: 'blur(10px)',
        zIndex: 1080,
      }}
    >
      {/* Top Bar */}
      <div className="d-flex justify-content-between align-items-center text-white w-100 px-2">
        <div className="d-flex align-items-center gap-3">
          <span className="badge-authentic">
            <i className="bi bi-shield-check"></i>
            {current.is_authentic ? 'Real Authentic PG Photo' : 'Property Visual'}
          </span>
          <span className="small text-white-50">
            {activeIndex + 1} of {images.length}
          </span>
        </div>

        <div className="d-flex align-items-center gap-2">
          <button
            onClick={toggleZoom}
            className="btn btn-sm btn-outline-light rounded-circle d-flex align-items-center justify-content-center"
            style={{ width: '38px', height: '38px' }}
            title={zoom > 1 ? 'Zoom Out' : 'Zoom In'}
          >
            <i className={`bi bi-${zoom > 1 ? 'zoom-out' : 'zoom-in'}`}></i>
          </button>
          <button
            onClick={onClose}
            className="btn btn-sm btn-outline-light rounded-circle d-flex align-items-center justify-content-center"
            style={{ width: '38px', height: '38px' }}
            title="Close Lightbox"
          >
            <i className="bi bi-x-lg"></i>
          </button>
        </div>
      </div>

      {/* Main Image Area with Previous & Next controls */}
      <div className="d-flex align-items-center justify-content-between flex-grow-1 position-relative overflow-hidden my-2">
        <button
          onClick={() => onNavigate((activeIndex - 1 + images.length) % images.length)}
          className="btn btn-outline-light rounded-circle d-flex align-items-center justify-content-center shadow"
          style={{ width: '48px', height: '48px', zIndex: 10, background: 'rgba(0,0,0,0.5)' }}
          aria-label="Previous Photo"
        >
          <i className="bi bi-chevron-left fs-5"></i>
        </button>

        <div
          className="d-flex align-items-center justify-content-center w-100 h-100 overflow-auto text-center"
          style={{ cursor: zoom > 1 ? 'zoom-out' : 'zoom-in' }}
          onClick={toggleZoom}
        >
          <img
            src={current.image_url}
            alt={current.title}
            className="img-fluid rounded-3 shadow-lg"
            style={{
              maxHeight: '75vh',
              maxWidth: '90vw',
              objectFit: 'contain',
              transform: `scale(${zoom})`,
              transition: 'transform 0.3s ease',
            }}
          />
        </div>

        <button
          onClick={() => onNavigate((activeIndex + 1) % images.length)}
          className="btn btn-outline-light rounded-circle d-flex align-items-center justify-content-center shadow"
          style={{ width: '48px', height: '48px', zIndex: 10, background: 'rgba(0,0,0,0.5)' }}
          aria-label="Next Photo"
        >
          <i className="bi bi-chevron-right fs-5"></i>
        </button>
      </div>

      {/* Caption & Thumbnails */}
      <div className="text-center text-white px-2">
        <h6 className="fw-bold mb-1">{current.title}</h6>
        {current.caption && (
          <p className="small text-white-50 mb-3">{current.caption}</p>
        )}

        {/* Small thumbnail strip */}
        <div className="d-flex justify-content-center gap-2 overflow-auto py-1" style={{ maxWidth: '600px', margin: '0 auto' }}>
          {images.map((img, idx) => (
            <img
              key={img.id || idx}
              src={img.image_url}
              alt={img.title}
              onClick={() => onNavigate(idx)}
              className={`rounded-2 cursor-pointer border ${idx === activeIndex ? 'border-warning border-2' : 'border-secondary opacity-50'}`}
              style={{ width: '46px', height: '34px', objectFit: 'cover' }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
