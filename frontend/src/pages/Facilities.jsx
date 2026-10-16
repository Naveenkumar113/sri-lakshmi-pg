import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { DEFAULT_FACILITIES } from '../data/defaultData';

export default function Facilities() {
  const [facilities, setFacilities] = useState(DEFAULT_FACILITIES);
  const [activeCategory, setActiveCategory] = useState('ALL');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchFacilities = async () => {
      try {
        const res = await api.get('/facilities');
        if (Array.isArray(res.data) && res.data.length > 0) {
          setFacilities(res.data);
        }
      } catch (err) {
        console.warn('Could not load live facilities, keeping verified PG amenities', err);
      } finally {
        setLoading(false);
      }
    };
    fetchFacilities();
  }, []);

  const categories = [
    { id: 'ALL', label: 'All Facilities' },
    { id: 'essential', label: 'Essential Services' },
    { id: 'security', label: 'Safety & Security' },
    { id: 'comfort', label: 'Comfort & Rooms' },
    { id: 'convenience', label: 'Convenience' },
  ];

  const filtered = facilities.filter((f) => {
    if (activeCategory === 'ALL') return true;
    return f.category === activeCategory;
  });

  return (
    <div className="py-5 bg-light min-vh-100">
      <div className="container">
        {/* Title */}
        <div className="text-center max-w-700 mx-auto mb-4" style={{ maxWidth: '680px' }}>
          <span className="pill-badge pill-badge-accent mb-2">Amenities & Services</span>
          <h1 className="display-5 fw-extrabold mb-2">Hostel Amenities & Facilities</h1>
          <p className="text-secondary small">
            Designed to ensure comfortable daily living for IT professionals, corporators, and students in Velachery.
          </p>
        </div>

        {/* Category Tabs */}
        <div className="d-flex justify-content-center flex-wrap gap-1.5 mb-3">
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveCategory(c.id)}
              className={`btn btn-sm ${activeCategory === c.id ? 'btn-dark fw-bold px-2.5 py-1' : 'btn-white bg-white border text-secondary px-2.5 py-1'}`}
              style={{ fontSize: '0.8rem' }}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Facilities Grid */}
        {loading ? (
          <div className="text-center py-4">
            <div className="spinner-border text-primary spinner-border-sm" role="status"></div>
            <p className="text-muted small mt-2">Loading verified facilities...</p>
          </div>
        ) : (
          <div className="row g-2 g-md-3 mb-4">
            {filtered.map((fac) => (
              <div key={fac.id} className="col-6 col-md-4 col-lg-3">
                <div className="pg-card p-2.5 p-md-3 h-100 d-flex flex-column justify-content-between">
                  <div>
                    <div className="d-flex justify-content-between align-items-center mb-1.5">
                      <div
                        className="d-flex align-items-center justify-content-center rounded-2"
                        style={{ width: '32px', height: '32px', backgroundColor: '#FFF7ED', color: '#EA580C' }}
                      >
                        <i className={`bi bi-${fac.icon}`} style={{ fontSize: '1.05rem' }}></i>
                      </div>
                      <span className="badge bg-light text-secondary border text-uppercase" style={{ fontSize: '0.62rem' }}>
                        {fac.category}
                      </span>
                    </div>

                    <h6 className="fw-bold mb-1 text-dark" style={{ fontSize: '0.88rem' }}>{fac.title}</h6>
                    {fac.description && (
                      <p className="text-secondary small mb-0 lh-sm text-truncate w-100" style={{ fontSize: '0.74rem' }} title={fac.description}>
                        {fac.description}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Rules & Guidelines Section */}
        <div className="p-4 p-md-5 bg-white rounded-4 border shadow-sm">
          <div className="row g-4 align-items-center">
            <div className="col-lg-7">
              <span className="pill-badge pill-badge-accent mb-2">Hostel Rules & Policy</span>
              <h3 className="fw-bold mb-3">Living Guidelines for Residents</h3>
              <ul className="text-secondary small d-flex flex-column gap-2 mb-0 ps-3">
                <li>PG entrance is accessible 24 hours daily with round-the-clock watch.</li>
                <li>Quiet hours are observed between 10:30 PM and 6:00 AM to respect working professionals.</li>
                <li>Smoking, alcohol consumption, and unauthorized parties are strictly forbidden on premises.</li>
                <li>Every resident has an allocated bed and individual locked wardrobe.</li>
                <li>Automatic laundry washing machines are located on the terrace utility area.</li>
              </ul>
            </div>
            <div className="col-lg-5 text-center text-lg-end">
              <Link to="/contact" className="btn btn-outline-dark me-2">Have Questions?</Link>
              <Link to="/rooms" className="btn btn-pg-primary">Explore Rooms</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
