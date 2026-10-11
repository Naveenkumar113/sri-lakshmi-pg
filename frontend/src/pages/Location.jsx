import React from 'react';

export default function Location() {
  return (
    <div className="py-5 bg-light min-vh-100">
      <div className="container">
        {/* Title */}
        <div className="text-center max-w-700 mx-auto mb-5" style={{ maxWidth: '680px' }}>
          <span className="pill-badge pill-badge-accent mb-2">Location & Neighborhood</span>
          <h1 className="display-5 fw-extrabold mb-2">How To Reach Sri Lakshmi Srinivasa Gents PG</h1>
          <p className="text-secondary small">
            3, Bhavani St, Bharathi Nagar, Velachery, Chennai, Tamil Nadu – 600113
          </p>
        </div>

        <div className="row g-5 align-items-center mb-5">
          {/* Info Card & Action Buttons */}
          <div className="col-lg-5">
            <div className="bg-white p-4 p-md-5 rounded-4 border shadow-sm">
              <span className="badge bg-warning text-dark px-3 py-1 fw-bold rounded-pill mb-3">
                <i className="bi bi-geo-alt-fill me-1"></i> Velachery Branch
              </span>
              <h3 className="fw-bold mb-3">Property Address</h3>

              <div className="p-3 bg-light rounded-3 mb-4 border">
                <div className="fw-bold text-dark fs-6 mb-1">
                  SRI LAKSHMI SRINIVASA GENTS PG
                </div>
                <div className="text-secondary small lh-base">
                  3, Bhavani St, Bharathi Nagar,<br />
                  Velachery, Chennai,<br />
                  Tamil Nadu – 600113, India
                </div>
              </div>

              <div className="d-flex flex-column gap-3 mb-4">
                <div className="d-flex align-items-center gap-3">
                  <div className="d-flex align-items-center justify-content-center rounded-circle bg-success text-white" style={{ width: '40px', height: '40px' }}>
                    <i className="bi bi-telephone-fill"></i>
                  </div>
                  <div>
                    <div className="small text-muted">Primary Contact</div>
                    <a href="tel:+917893744206" className="fw-bold text-dark text-decoration-none">
                      +91 78937 44206
                    </a>
                  </div>
                </div>

                <div className="d-flex align-items-center gap-3">
                  <div className="d-flex align-items-center justify-content-center rounded-circle bg-primary text-white" style={{ width: '40px', height: '40px' }}>
                    <i className="bi bi-clock-fill"></i>
                  </div>
                  <div>
                    <div className="small text-muted">Operating Hours</div>
                    <div className="fw-bold text-dark">Open 24 Hours Daily</div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="d-flex flex-column gap-2">
                <a
                  href="https://maps.google.com/?q=Sri+Lakshmi+Srinivasa+Gents+PG+Velachery+Chennai"
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-pg-primary py-2 fw-semibold"
                >
                  <i className="bi bi-compass me-2"></i> Get Directions on Google Maps
                </a>
                <div className="d-flex gap-2">
                  <a href="tel:+917893744206" className="btn btn-outline-dark flex-fill py-2 fw-semibold">
                    <i className="bi bi-telephone-fill text-success me-1"></i> Call Now
                  </a>
                  <a
                    href="https://wa.me/917893744206"
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-success flex-fill py-2 fw-semibold"
                  >
                    <i className="bi bi-whatsapp me-1"></i> WhatsApp
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Map */}
          <div className="col-lg-7">
            <div className="rounded-4 overflow-hidden border shadow-sm" style={{ height: '460px' }}>
              <iframe
                title="Google Map Location of Sri Lakshmi Srinivasa Gents PG"
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3887.488344654944!2d80.2180!3d12.9815!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3a525d80b7410041%3A0x6b2b73bcfa014c27!2sBhavani%20St%2C%20Bharathi%20Nagar%2C%20Velachery%2C%20Chennai%2C%20Tamil%20Nadu%20600113!5e0!3m2!1sen!2sin!4v1700000000000!5m2!1sen!2sin"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen=""
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              ></iframe>
            </div>
          </div>
        </div>

        {/* Nearby Connectivity Cards */}
        <div className="bg-white p-4 p-md-5 rounded-4 border shadow-sm">
          <h4 className="fw-bold mb-4">Strategic Proximity & Commute Distances</h4>
          <div className="row g-3">
            {[
              { hub: "Velachery MRTS Railway Station", time: "5 - 7 mins", type: "Train & Transit", icon: "train-front" },
              { hub: "Taramani IT Corridor & Ascendas", time: "8 - 10 mins", type: "Tech Parks", icon: "laptop" },
              { hub: "Phoenix Marketcity Chennai", time: "6 - 8 mins", type: "Shopping & Dining", icon: "bag" },
              { hub: "Vijayanagar Bus Terminus", time: "4 - 5 mins", type: "MTC City Buses", icon: "bus-front" },
              { hub: "Old Mahabalipuram Road (OMR)", time: "10 - 12 mins", type: "IT Expressway", icon: "signpost-2" },
              { hub: "100 Feet Road Food & Markets", time: "3 mins walk", type: "Daily Needs", icon: "shop" }
            ].map((item, idx) => (
              <div key={idx} className="col-md-6 col-lg-4">
                <div className="p-3 border rounded-3 bg-light d-flex align-items-center justify-content-between">
                  <div className="d-flex align-items-center gap-3">
                    <div className="d-flex align-items-center justify-content-center rounded-circle bg-white border" style={{ width: '42px', height: '42px' }}>
                      <i className={`bi bi-${item.icon} text-primary fs-5`}></i>
                    </div>
                    <div>
                      <div className="fw-bold small text-dark">{item.hub}</div>
                      <div className="text-muted small" style={{ fontSize: '0.72rem' }}>{item.type}</div>
                    </div>
                  </div>
                  <span className="badge bg-warning text-dark fw-bold">{item.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
