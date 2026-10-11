import React from 'react';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="bg-dark text-white pt-5 pb-4" style={{ backgroundColor: '#0B132B' }}>
      <div className="container">
        <div className="row g-4 mb-4">
          {/* Col 1: Property Identity */}
          <div className="col-lg-4 col-md-6">
            <div className="d-flex align-items-center gap-2 mb-3">
              <div
                className="d-flex align-items-center justify-content-center text-white rounded-3"
                style={{
                  width: '40px',
                  height: '40px',
                  background: 'linear-gradient(135deg, #EA580C 0%, #C2410C 100%)',
                  fontWeight: 800,
                }}
              >
                SL
              </div>
              <h5 className="mb-0 text-white fw-bold">SRI LAKSHMI SRINIVASA</h5>
            </div>
            <p className="text-light opacity-75 small mb-3">
              Established gentlemen's hostel providing comfortable, secure, and hassle-free accommodation in Bharathi Nagar, Velachery, Chennai. Convenient for IT professionals and college students.
            </p>
            <div className="d-flex align-items-center gap-2 mb-2">
              <span className="badge bg-warning text-dark px-2 py-1 fw-bold">
                <i className="bi bi-star-fill text-dark me-1"></i> 3.6 / 5
              </span>
              <span className="text-light opacity-75 small">Google Rating & Local Reviews</span>
            </div>
            <div className="text-success small fw-semibold">
              <i className="bi bi-clock-history me-1"></i> Open 24 Hours Daily
            </div>
          </div>

          {/* Col 2: Quick Links */}
          <div className="col-lg-2 col-md-6">
            <h6 className="text-white text-uppercase fw-bold mb-3 small" style={{ letterSpacing: '0.05em' }}>
              Explore
            </h6>
            <ul className="list-unstyled small d-flex flex-column gap-2 text-light opacity-75">
              <li><Link to="/rooms" className="text-white-50 text-decoration-none hover-white">Available Rooms</Link></li>
              <li><Link to="/facilities" className="text-white-50 text-decoration-none">PG Facilities</Link></li>
              <li><Link to="/gallery" className="text-white-50 text-decoration-none">Real Photo Gallery</Link></li>
              <li><Link to="/location" className="text-white-50 text-decoration-none">Location & Maps</Link></li>
              <li><Link to="/about" className="text-white-50 text-decoration-none">About Us</Link></li>
              <li><Link to="/contact" className="text-white-50 text-decoration-none">Contact & Inquiries</Link></li>
            </ul>
          </div>

          {/* Col 3: Room Types & Strategic Location */}
          <div className="col-lg-3 col-md-6">
            <h6 className="text-white text-uppercase fw-bold mb-3 small" style={{ letterSpacing: '0.05em' }}>
              Room Options
            </h6>
            <ul className="list-unstyled small d-flex flex-column gap-2 text-light opacity-75">
              <li><i className="bi bi-check2 text-warning me-1"></i> Single Occupancy AC</li>
              <li><i className="bi bi-check2 text-warning me-1"></i> 2-Sharing AC / Non-AC</li>
              <li><i className="bi bi-check2 text-warning me-1"></i> 3-Sharing AC / Non-AC</li>
              <li><i className="bi bi-check2 text-warning me-1"></i> 4-Sharing Budget Friendly</li>
              <li><i className="bi bi-check2 text-warning me-1"></i> High Speed Optic Fiber Wi-Fi</li>
              <li><i className="bi bi-check2 text-warning me-1"></i> Automatic Washing Machines</li>
            </ul>
          </div>

          {/* Col 4: Contact & Location */}
          <div className="col-lg-3 col-md-6">
            <h6 className="text-white text-uppercase fw-bold mb-3 small" style={{ letterSpacing: '0.05em' }}>
              Contact Address
            </h6>
            <div className="small text-light opacity-75 mb-2">
              <i className="bi bi-geo-alt-fill text-danger me-2"></i>
              3, Bhavani St, Bharathi Nagar,<br />
              Velachery, Chennai,<br />
              Tamil Nadu – 600113, India
            </div>
            <div className="small text-light opacity-75 mb-2">
              <i className="bi bi-telephone-fill text-success me-2"></i>
              <a href="tel:+917893744206" className="text-white text-decoration-none fw-semibold">
                +91 78937 44206
              </a>
              <br />
              <span className="ms-4 text-white-50">+91 90032 80430</span>
            </div>
            <div className="small text-light opacity-75 mb-3">
              <i className="bi bi-envelope-fill text-warning me-2"></i>
              srilakshmisrinivasa.pg@gmail.com
            </div>
            <div className="d-flex gap-2">
              <a
                href="https://wa.me/917893744206"
                target="_blank"
                rel="noreferrer"
                className="btn btn-sm btn-success rounded-pill px-3 py-1 fw-semibold"
              >
                <i className="bi bi-whatsapp me-1"></i> WhatsApp
              </a>
              <a
                href="tel:+917893744206"
                className="btn btn-sm btn-outline-light rounded-pill px-3 py-1 fw-semibold"
              >
                <i className="bi bi-telephone me-1"></i> Call Now
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-top border-secondary border-opacity-25 pt-3 d-flex flex-wrap justify-content-between align-items-center small text-light opacity-50">
          <div>
            © {new Date().getFullYear()} Sri Lakshmi Srinivasa Gents PG. All Rights Reserved.
          </div>
          <div className="d-flex gap-3">
            <Link to="/location" className="text-decoration-none text-light opacity-75">Velachery, Chennai</Link>
            <span>•</span>
            <Link to="/admin/login" className="text-decoration-none text-light opacity-75">Admin Portal</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
