import React, { useState, useEffect } from 'react';
import api from '../services/api';
import LightboxModal from '../components/LightboxModal';

export default function Gallery() {
  const [gallery, setGallery] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [lightboxIndex, setLightboxIndex] = useState(null);

  useEffect(() => {
    const fetchGallery = async () => {
      try {
        const res = await api.get('/gallery');
        setGallery(res.data);
      } catch (err) {
        console.error('Failed to load gallery', err);
      } finally {
        setLoading(false);
      }
    };
    fetchGallery();
  }, []);

  const categories = [
    { id: 'ALL', label: 'All Photos' },
    { id: 'AUTHENTIC', label: '⭐ Real PG Photos' },
    { id: 'Exterior', label: 'Building Exterior' },
    { id: 'Bedrooms', label: 'Bedrooms & Cots' },
    { id: 'Facilities', label: 'Facilities & Mess' },
    { id: 'Surroundings', label: 'Surroundings & Signboard' },
  ];

  const filtered = gallery.filter((item) => {
    if (selectedCategory === 'ALL') return true;
    if (selectedCategory === 'AUTHENTIC') return item.is_authentic === true;
    if (selectedCategory === 'Surroundings') return item.category === 'Surroundings' || item.category === 'Signboard';
    return item.category === selectedCategory;
  });

  return (
    <div className="py-5 bg-light min-vh-100">
      <div className="container">
        {/* Title */}
        <div className="text-center max-w-700 mx-auto mb-4" style={{ maxWidth: '680px' }}>
          <span className="pill-badge pill-badge-accent mb-2">Authentic Visuals</span>
          <h1 className="display-5 fw-extrabold mb-2">Property Photo Gallery</h1>
          <p className="text-secondary small">
            Transparent, unedited property photographs showing our actual rooms, red cot mattresses, exterior facade, and facilities at Bhavani St, Velachery.
          </p>
        </div>

        {/* Filter Badges */}
        <div className="d-flex justify-content-center flex-wrap gap-2 mb-5">
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCategory(c.id)}
              className={`btn btn-sm ${selectedCategory === c.id ? 'btn-dark fw-bold px-3' : 'btn-white bg-white border text-secondary px-3'}`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Masonry / Grid */}
        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status"></div>
            <p className="text-muted small mt-2">Loading gallery photos...</p>
          </div>
        ) : (
          <div className="row g-3 g-md-4">
            {filtered.map((item, index) => (
              <div key={item.id} className="col-sm-6 col-md-4 col-lg-3">
                <div
                  className="gallery-card position-relative h-100"
                  onClick={() => {
                    const globalIdx = gallery.findIndex((g) => g.id === item.id);
                    setLightboxIndex(globalIdx !== -1 ? globalIdx : index);
                  }}
                >
                  <img
                    src={item.image_url}
                    alt={item.title}
                    loading="lazy"
                    style={{ height: '240px', width: '100%', objectFit: 'cover' }}
                  />

                  {/* Authentic / Property Badge */}
                  <div className="position-absolute top-0 start-0 m-2">
                    <span className="badge-authentic">
                      <i className="bi bi-shield-check"></i>
                      {item.is_authentic ? 'Real Photo' : 'PG View'}
                    </span>
                  </div>

                  <div className="gallery-overlay">
                    <div className="fw-bold fs-6">{item.title}</div>
                    <div className="text-white-50 small mb-1">{item.category}</div>
                    {item.caption && (
                      <p className="text-white-50 mb-0" style={{ fontSize: '0.74rem' }}>
                        {item.caption}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Lightbox Component */}
        {lightboxIndex !== null && (
          <LightboxModal
            images={gallery}
            activeIndex={lightboxIndex}
            onClose={() => setLightboxIndex(null)}
            onNavigate={(newIdx) => setLightboxIndex(newIdx)}
          />
        )}
      </div>
    </div>
  );
}
