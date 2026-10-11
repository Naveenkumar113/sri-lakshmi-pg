import React from 'react';
import { Link } from 'react-router-dom';

export default function About() {
  return (
    <div className="py-5">
      <div className="container">
        {/* Header */}
        <div className="text-center max-w-700 mx-auto mb-5" style={{ maxWidth: '720px' }}>
          <span className="pill-badge pill-badge-accent mb-2">Our Story & Standards</span>
          <h1 className="display-5 fw-extrabold mb-3">About Sri Lakshmi Srinivasa Gents PG</h1>
          <p className="text-secondary lead fs-6">
            Providing honest, comfortable, and affordable gentlemen's hostel living in the heart of Velachery, Chennai.
          </p>
        </div>

        {/* Feature Grid */}
        <div className="row g-5 align-items-center mb-5">
          <div className="col-lg-6">
            <div className="position-relative">
              <img
                src="/images/exterior_main.png"
                alt="PG Exterior"
                className="img-fluid rounded-4 shadow-md w-100"
              />
              <div className="position-absolute bottom-0 start-0 m-3">
                <span className="badge-authentic">
                  <i className="bi bi-camera-fill"></i> Actual PG Building Exterior
                </span>
              </div>
            </div>
          </div>

          <div className="col-lg-6">
            <h3 className="fw-bold mb-3">A Safe, Respectful Living Community</h3>
            <p className="text-secondary mb-3">
              Founded to meet the growing need for clean, secure, and budget-friendly accommodation near South Chennai's major IT corridors, Sri Lakshmi Srinivasa Gents PG is situated at Bhavani Street, Bharathi Nagar, Velachery.
            </p>
            <p className="text-secondary mb-4">
              We understand that professionals and students relocating to Chennai need peace of mind, reliable high-speed internet for their work, comfortable beds for restful sleep, and round-the-clock security. We maintain direct, personal management so every resident's needs are promptly handled.
            </p>

            <div className="row g-3">
              <div className="col-sm-6">
                <div className="p-3 border rounded-3 bg-white shadow-sm">
                  <div className="fw-bold fs-4 text-warning">24/7</div>
                  <div className="small text-muted fw-semibold">Gated Security & Biometrics</div>
                </div>
              </div>
              <div className="col-sm-6">
                <div className="p-3 border rounded-3 bg-white shadow-sm">
                  <div className="fw-bold fs-4 text-success">100%</div>
                  <div className="small text-muted fw-semibold">RO Purified Drinking Water</div>
                </div>
              </div>
              <div className="col-sm-6">
                <div className="p-3 border rounded-3 bg-white shadow-sm">
                  <div className="fw-bold fs-4 text-primary">Fast</div>
                  <div className="small text-muted fw-semibold">Optic Fiber Internet Wi-Fi</div>
                </div>
              </div>
              <div className="col-sm-6">
                <div className="p-3 border rounded-3 bg-white shadow-sm">
                  <div className="fw-bold fs-4 text-danger">3.6 / 5</div>
                  <div className="small text-muted fw-semibold">Google Local Community Reviews</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Gallery Peek of Real Rooms */}
        <div className="py-4 border-top">
          <h4 className="fw-bold mb-4 text-center">Inside the PG Property</h4>
          <div className="row g-3">
            <div className="col-md-4">
              <div className="card border-0 shadow-sm rounded-3 overflow-hidden h-100">
                <img src="/images/bedroom_double.png" alt="Double Sharing Room" className="w-100" style={{ height: '220px', objectFit: 'cover' }} />
                <div className="p-3">
                  <h6 className="fw-bold mb-1">Double Sharing Rooms</h6>
                  <p className="small text-muted mb-0">Twin cots with red mattresses, pillows, windows, and switchboard access.</p>
                </div>
              </div>
            </div>

            <div className="col-md-4">
              <div className="card border-0 shadow-sm rounded-3 overflow-hidden h-100">
                <img src="/images/bedroom_triple_wallpaper.png" alt="Triple Sharing Room" className="w-100" style={{ height: '220px', objectFit: 'cover' }} />
                <div className="p-3">
                  <h6 className="fw-bold mb-1">Triple Sharing Rooms</h6>
                  <p className="small text-muted mb-0">Spacious bedrooms with feature wallpaper, individual almirahs, and ceiling fans.</p>
                </div>
              </div>
            </div>

            <div className="col-md-4">
              <div className="card border-0 shadow-sm rounded-3 overflow-hidden h-100">
                <img src="/images/signboard.png" alt="Official Signboard" className="w-100" style={{ height: '220px', objectFit: 'cover' }} />
                <div className="p-3">
                  <h6 className="fw-bold mb-1">Official Signboard & Entrance</h6>
                  <p className="small text-muted mb-0">Bharathi Nagar Bus Stop, Bhavani St, Velachery landmark.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Callout */}
        <div className="text-center mt-5 p-5 bg-white border rounded-4 shadow-sm">
          <h4 className="fw-bold mb-2">Want to see the rooms in person?</h4>
          <p className="text-secondary small mb-4">Book a convenient appointment online to tour the property and check room availability.</p>
          <div className="d-flex justify-content-center gap-3">
            <Link to="/rooms" className="btn btn-outline-dark">View Rooms</Link>
            <Link to="/contact" className="btn btn-pg-primary">Contact Manager</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
