import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import LightboxModal from '../components/LightboxModal';
import Hero3DVisual from '../components/Hero3DVisual';

export default function Home() {
  const { requireAuth } = useAuth();
  const navigate = useNavigate();

  const [pgInfo, setPgInfo] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [gallery, setGallery] = useState([]);
  const [loading, setLoading] = useState(true);

  // Lightbox state
  const [lightboxIndex, setLightboxIndex] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [infoRes, roomsRes, facRes, galRes] = await Promise.all([
          api.get('/pg-details'),
          api.get('/rooms'),
          api.get('/facilities'),
          api.get('/gallery')
        ]);
        setPgInfo(infoRes.data);
        setRooms(roomsRes.data);
        setFacilities(facRes.data);
        setGallery(galRes.data);
      } catch (err) {
        console.error('Error fetching home data', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleScheduleVisit = () => {
    if (requireAuth('Schedule a Visit', '/visit-request')) {
      navigate('/visit-request');
    }
  };

  const handleBookRoom = (room = null) => {
    if (requireAuth('Book a Room', '/book-room')) {
      navigate('/book-room', { state: { selectedRoomId: room?.id } });
    }
  };

  const parsedFaqs = pgInfo?.faq_data ? JSON.parse(pgInfo.faq_data) : [
    { q: "How can I visit the PG?", a: "Click 'Schedule a Visit' to choose your convenient date and time. Our manager will confirm your appointment." },
    { q: "How can I book a room?", a: "Explore our room list, select single, double, triple, or 4-sharing, and submit your booking request." },
    { q: "Do I need an account?", a: "You can browse all rooms, photos, and information freely. An account is only required when booking or scheduling a visit." },
    { q: "Are AC and Non-AC rooms available?", a: "Yes, both AC and Non-AC options are available." },
    { q: "How does approval work?", a: "The PG administration reviews live bed availability and approves your request, sending an instant notification." },
    { q: "How can I contact the PG?", a: "Call +91 78937 44206 or +91 90032 80430, or message us directly via WhatsApp." }
  ];

  return (
    <div>
      {/* ==================================================
          HERO SECTION (Using Real PG Building Image)
          ================================================== */}
      <section className="hero-wrapper position-relative">
        <img
          src="/images/pg_exterior_main.jpg"
          onError={(e) => { e.target.src = '/images/exterior_main.png'; }}
          alt="Sri Lakshmi Srinivasa Gents PG Building"
          className="hero-bg-img"
        />
        <div className="hero-overlay"></div>

        <div className="container py-5 my-4 position-relative" style={{ zIndex: 2 }}>
          <div className="row align-items-center g-5">
            <div className="col-lg-8 text-white">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                {/* Authentic Property Badge */}
                <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
                  <span className="badge-authentic">
                    <i className="bi bi-shield-check"></i> Verified Property • Velachery, Chennai
                  </span>
                  <span className="badge bg-warning text-dark px-3 py-1 fw-bold rounded-pill">
                    ⭐ 3.6 / 5 Google Reviews
                  </span>
                  <span className="badge bg-success text-white px-3 py-1 fw-semibold rounded-pill">
                    <i className="bi bi-clock-history me-1"></i> Open 24 Hours
                  </span>
                </div>

                <h1 className="display-4 fw-extrabold text-white mb-2" style={{ letterSpacing: '-0.03em' }}>
                  SRI LAKSHMI SRINIVASA <br />
                  <span style={{ color: '#FDBA74' }}>GENTS PG</span>
                </h1>

                <h3 className="h4 fw-semibold text-light opacity-90 mb-3">
                  "Comfortable & Convenient Men's PG in Velachery, Chennai"
                </h3>

                <p className="fs-6 text-light opacity-80 mb-4 pe-lg-5" style={{ maxWidth: '640px' }}>
                  Comfortable accommodation for working professionals and students in the Velachery–Taramani area. High-speed optic fiber Wi-Fi, automatic laundry, purified RO water, 24/7 security, and hygienic living.
                </p>

                {/* Hero CTA Buttons */}
                <div className="d-flex flex-wrap gap-3 pt-2">
                  <Link to="/rooms" className="btn btn-pg-secondary shadow">
                    <i className="bi bi-door-open"></i>
                    View Rooms
                  </Link>

                  <button onClick={handleScheduleVisit} className="btn btn-pg-primary shadow-lg">
                    <i className="bi bi-calendar2-check"></i>
                    Schedule a Visit
                  </button>

                  <button onClick={() => handleBookRoom()} className="btn btn-pg-outline-light">
                    <i className="bi bi-key-fill"></i>
                    Book a Room
                  </button>

                  <a href="tel:+917893744206" className="btn btn-outline-light rounded-pill px-3 py-2 fw-semibold d-inline-flex align-items-center gap-2">
                    <i className="bi bi-telephone-fill text-success"></i>
                    Call Now
                  </a>
                </div>

                {/* Trust Indicators */}
                <div className="d-flex flex-wrap gap-4 mt-5 pt-3 border-top border-light border-opacity-25 small text-light opacity-85">
                  <div className="d-flex align-items-center gap-2">
                    <i className="bi bi-geo-alt-fill text-danger fs-5"></i>
                    <span>3, Bhavani St, Bharathi Nagar</span>
                  </div>
                  <div className="d-flex align-items-center gap-2">
                    <i className="bi bi-train-front text-info fs-5"></i>
                    <span>Near Velachery MRTS & Taramani</span>
                  </div>
                  <div className="d-flex align-items-center gap-2">
                    <i className="bi bi-wifi text-warning fs-5"></i>
                    <span>High-Speed Wi-Fi</span>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Subtle 3D Visual Floating Pavilion */}
            <div className="col-lg-4 text-center d-flex justify-content-center">
              <Hero3DVisual />
            </div>
          </div>
        </div>
      </section>

      {/* ==================================================
          SECTION 1: QUICK PROPERTY INFORMATION
          ================================================== */}
      <section className="py-4 bg-white border-bottom shadow-sm">
        <div className="container">
          <div className="row g-3 text-center align-items-center">
            <div className="col-6 col-md-3 border-end">
              <div className="d-flex align-items-center justify-content-center gap-2">
                <i className="bi bi-geo-alt-fill text-danger fs-4"></i>
                <div className="text-start">
                  <div className="fw-bold small text-dark">Location</div>
                  <div className="text-muted small">Velachery, Chennai</div>
                </div>
              </div>
            </div>

            <div className="col-6 col-md-3 border-end">
              <div className="d-flex align-items-center justify-content-center gap-2">
                <i className="bi bi-telephone-fill text-success fs-4"></i>
                <div className="text-start">
                  <div className="fw-bold small text-dark">Direct Phone</div>
                  <div className="text-muted small">+91 78937 44206</div>
                </div>
              </div>
            </div>

            <div className="col-6 col-md-3 border-end">
              <div className="d-flex align-items-center justify-content-center gap-2">
                <i className="bi bi-clock-fill text-primary fs-4"></i>
                <div className="text-start">
                  <div className="fw-bold small text-dark">Hours</div>
                  <div className="text-muted small">Open 24 Hours</div>
                </div>
              </div>
            </div>

            <div className="col-6 col-md-3">
              <div className="d-flex align-items-center justify-content-center gap-2">
                <i className="bi bi-house-door-fill text-warning fs-4"></i>
                <div className="text-start">
                  <div className="fw-bold small text-dark">Property Type</div>
                  <div className="text-muted small">Gentlemen's PG</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================================================
          SECTION 2: ABOUT THE PG
          ================================================== */}
      <section className="section-padding bg-light">
        <div className="container">
          <div className="row align-items-center g-5">
            <div className="col-lg-6">
              <div className="position-relative">
                <img
                  src="/images/exterior_main.png"
                  alt="Actual PG Building Exterior"
                  className="img-fluid rounded-4 shadow-md w-100"
                  style={{ maxHeight: '420px', objectFit: 'cover' }}
                />
                <div className="position-absolute bottom-0 start-0 m-3">
                  <span className="badge-authentic">
                    <i className="bi bi-camera-fill"></i> Actual PG Exterior Photo
                  </span>
                </div>
              </div>
            </div>

            <div className="col-lg-6">
              <span className="pill-badge pill-badge-accent mb-2">About The Property</span>
              <h2 className="section-title text-start mb-3">
                Reliable & Peaceful Accommodation in Bharathi Nagar, Velachery
              </h2>
              <p className="text-secondary mb-3">
                Sri Lakshmi Srinivasa Gents PG is located at 3, Bhavani St, Bharathi Nagar in Velachery, Chennai. Conveniently situated near the Taramani IT hub, Velachery MRTS Station, and Phoenix Marketcity, it provides a safe, welcoming, and productive environment for working bachelors and students.
              </p>
              <p className="text-secondary mb-4">
                Our property is designed with essential amenities including comfortable wooden cots with clean mattresses, individual steel almirahs, automatic washing machines on the covered terrace, high-speed Wi-Fi, and 24/7 security watch.
              </p>

              <div className="row g-3 mb-4">
                <div className="col-sm-6">
                  <div className="d-flex align-items-center gap-2">
                    <i className="bi bi-check-circle-fill text-success fs-5"></i>
                    <span className="fw-semibold small">Walkable to Local Bus Stop</span>
                  </div>
                </div>
                <div className="col-sm-6">
                  <div className="d-flex align-items-center gap-2">
                    <i className="bi bi-check-circle-fill text-success fs-5"></i>
                    <span className="fw-semibold small">Commercial RO Drinking Water</span>
                  </div>
                </div>
                <div className="col-sm-6">
                  <div className="d-flex align-items-center gap-2">
                    <i className="bi bi-check-circle-fill text-success fs-5"></i>
                    <span className="fw-semibold small">24/7 Gate & Security Check</span>
                  </div>
                </div>
                <div className="col-sm-6">
                  <div className="d-flex align-items-center gap-2">
                    <i className="bi bi-check-circle-fill text-success fs-5"></i>
                    <span className="fw-semibold small">Easy Online Visit Scheduling</span>
                  </div>
                </div>
              </div>

              <div className="d-flex gap-3">
                <Link to="/about" className="btn btn-pg-secondary">
                  Learn More About Us
                </Link>
                <button onClick={handleScheduleVisit} className="btn btn-pg-primary">
                  Schedule a Visit
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================================================
          SECTION 3: WHY CHOOSE US
          ================================================== */}
      <section className="section-padding bg-white">
        <div className="container">
          <div className="section-header">
            <span className="pill-badge pill-badge-accent mb-2">Key Highlights</span>
            <h2 className="section-title">Why Choose Sri Lakshmi Srinivasa Gents PG</h2>
            <p className="section-subtitle">
              Carefully maintained facilities designed specifically for IT professionals, students, and job seekers in Chennai.
            </p>
          </div>

          <div className="row g-4">
            {[
              { title: "Convenient Velachery Location", desc: "Walking distance to Bhavani St bus stop and minutes from Taramani Ascendas, RMZ Millenia, and Velachery MRTS.", icon: "geo-alt-fill", color: "#EA580C" },
              { title: "Comfortable Rooms", desc: "Equipped with sturdy wooden cots, red mattresses, pillows, and cross-ventilation windows.", icon: "lamp-fill", color: "#2563EB" },
              { title: "AC & Non-AC Options", desc: "Choose between air-conditioned comfort or budget-friendly, well-ventilated natural rooms.", icon: "snow", color: "#0D9488" },
              { title: "Free Wi-Fi", desc: "High-speed broadband Wi-Fi coverage across all floors for seamless remote work and video calls.", icon: "wifi", color: "#7C3AED" },
              { title: "24/7 Security", desc: "CCTV monitoring of common corridors and 24-hour gated security entrance for total safety.", icon: "shield-fill-check", color: "#059669" },
              { title: "Washing Machine", desc: "Fully automatic washing machines with covered clothes drying lines on the open terrace.", icon: "droplet-fill", color: "#0284C7" },
              { title: "Clean Living Environment", desc: "Daily housekeeping of common areas and sanitized bathrooms to ensure hygiene.", icon: "sparkles", color: "#D97706" },
              { title: "Easy Visit Scheduling", desc: "Transparent booking system: choose your date and slot, and get confirmed prior to visiting.", icon: "calendar2-check-fill", color: "#DC2626" }
            ].map((card, i) => (
              <div key={i} className="col-md-6 col-lg-3">
                <div className="pg-card h-100 p-4 d-flex flex-column justify-content-between">
                  <div>
                    <div
                      className="d-flex align-items-center justify-content-center rounded-3 mb-3"
                      style={{ width: '48px', height: '48px', backgroundColor: `${card.color}15`, color: card.color }}
                    >
                      <i className={`bi bi-${card.icon} fs-4`}></i>
                    </div>
                    <h5 className="fw-bold mb-2 fs-6">{card.title}</h5>
                    <p className="text-secondary small mb-0">{card.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================================================
          SECTION 4: ROOMS SHOWCASE
          ================================================== */}
      <section className="section-padding bg-light">
        <div className="container">
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-end mb-4">
            <div>
              <span className="pill-badge pill-badge-accent mb-2">Room Inventory</span>
              <h2 className="section-title text-start mb-1">Available Rooms & Sharing Types</h2>
              <p className="section-subtitle mb-0">
                Single, Double, Triple, and 4-sharing rooms in AC and Non-AC configurations.
              </p>
            </div>
            <Link to="/rooms" className="btn btn-outline-dark fw-semibold mt-3 mt-md-0">
              View All Rooms <i className="bi bi-arrow-right ms-1"></i>
            </Link>
          </div>

          <div className="row g-4">
            {rooms.slice(0, 3).map((room) => {
              const imagesList = room.images ? JSON.parse(room.images) : ['/images/bedroom_double.png'];
              const displayImg = imagesList[0] || '/images/bedroom_double.png';

              return (
                <div key={room.id} className="col-md-6 col-lg-4">
                  <div className="pg-card h-100 d-flex flex-column">
                    <div className="position-relative overflow-hidden" style={{ height: '220px' }}>
                      <img
                        src={displayImg}
                        alt={`Room ${room.room_number}`}
                        className="w-100 h-100"
                        style={{ objectFit: 'cover' }}
                      />
                      <div className="position-absolute top-0 start-0 m-2">
                        <span className={`badge ${room.is_ac ? 'bg-primary' : 'bg-secondary'} fw-semibold`}>
                          {room.is_ac ? 'AC Room' : 'Non-AC Room'}
                        </span>
                      </div>
                      <div className="position-absolute top-0 end-0 m-2">
                        <span className={`status-pill status-${room.status.toLowerCase().replace('_', '-')}`}>
                          {room.status.replace('_', ' ')}
                        </span>
                      </div>
                    </div>

                    <div className="p-4 d-flex flex-column flex-grow-1 justify-content-between">
                      <div>
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <h5 className="fw-bold mb-0">Room {room.room_number}</h5>
                          <span className="small text-muted fw-semibold">Floor {room.floor}</span>
                        </div>
                        <p className="text-secondary small mb-3">
                          {room.room_type.replace('_', ' ')} Sharing • {room.capacity} Bed Capacity
                        </p>
                        <p className="text-muted small line-clamp-2 mb-3">
                          {room.description || 'Comfortable accommodation with individual lockers, sturdy cots, and daily cleaning.'}
                        </p>
                      </div>

                      <div className="pt-3 border-top d-flex justify-content-between align-items-center">
                        <div>
                          <div className="small text-muted">Monthly Rent</div>
                          <div className="fw-bold text-dark fs-5">
                            {room.monthly_rent ? `₹${room.monthly_rent.toLocaleString('en-IN')}` : 'Contact for Price'}
                          </div>
                        </div>

                        <button
                          onClick={() => handleBookRoom(room)}
                          className="btn btn-sm btn-pg-primary"
                        >
                          Book Room
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ==================================================
          SECTION 5: FACILITIES (Configurable by Admin)
          ================================================== */}
      <section className="section-padding bg-white">
        <div className="container">
          <div className="section-header">
            <span className="pill-badge pill-badge-accent mb-2">Amenities</span>
            <h2 className="section-title">Verified PG Facilities</h2>
            <p className="section-subtitle">
              Every resident enjoys direct access to all essential services maintained on the premises.
            </p>
          </div>

          <div className="row g-4">
            {facilities.map((fac) => (
              <div key={fac.id} className="col-6 col-md-4 col-lg-3">
                <div className="p-3 border rounded-3 h-100 bg-light d-flex flex-column align-items-start transition-hover">
                  <div
                    className="d-flex align-items-center justify-content-center rounded-circle mb-2"
                    style={{ width: '42px', height: '42px', backgroundColor: '#FFF7ED', color: '#EA580C' }}
                  >
                    <i className={`bi bi-${fac.icon} fs-5`}></i>
                  </div>
                  <h6 className="fw-bold mb-1 fs-6">{fac.title}</h6>
                  <p className="text-muted small mb-0">{fac.description}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-4">
            <Link to="/facilities" className="btn btn-sm btn-outline-dark fw-semibold">
              Explore All Facilities & Guidelines
            </Link>
          </div>
        </div>
      </section>

      {/* ==================================================
          SECTION 6: REAL PHOTO GALLERY (Authentic Reference)
          ================================================== */}
      <section className="section-padding bg-light">
        <div className="container">
          <div className="section-header">
            <span className="pill-badge pill-badge-accent mb-2">Property Tour</span>
            <h2 className="section-title">Actual Property Photographs</h2>
            <p className="section-subtitle">
              Honest and unedited photography of Sri Lakshmi Srinivasa Gents PG. See the real rooms, cots, building facade, and signboard.
            </p>
          </div>

          <div className="row g-3">
            {gallery.slice(0, 8).map((item, index) => (
              <div key={item.id} className="col-6 col-md-4 col-lg-3">
                <div
                  className="gallery-card position-relative"
                  onClick={() => setLightboxIndex(index)}
                >
                  <img src={item.image_url} alt={item.title} loading="lazy" />
                  <div className="position-absolute top-0 start-0 m-2">
                    <span className="badge-authentic">
                      <i className="bi bi-camera-fill"></i> {item.is_authentic ? 'Real Photo' : 'Hostel View'}
                    </span>
                  </div>
                  <div className="gallery-overlay">
                    <div className="fw-bold small">{item.title}</div>
                    <div className="text-white-50" style={{ fontSize: '0.72rem' }}>{item.category}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-4">
            <Link to="/gallery" className="btn btn-pg-primary">
              <i className="bi bi-images me-1"></i> View Complete Photo Gallery
            </Link>
          </div>
        </div>
      </section>

      {/* ==================================================
          SECTION 7: HOW IT WORKS
          ================================================== */}
      <section className="section-padding bg-white">
        <div className="container">
          <div className="section-header">
            <span className="pill-badge pill-badge-accent mb-2">Process</span>
            <h2 className="section-title">How To Visit & Reserve Your Stay</h2>
            <p className="section-subtitle">
              A straightforward 5-step process designed for convenience and transparency.
            </p>
          </div>

          <div className="row g-4 position-relative">
            {[
              { step: "01", title: "Create Account", desc: "Register a free account with your email and phone number.", icon: "person-check-fill" },
              { step: "02", title: "Choose Room / Visit", desc: "Select your desired sharing category (Single, Double, Triple, 4-Sharing) or visit date.", icon: "search" },
              { step: "03", title: "Submit Request", desc: "Pick a convenient time slot and submit your request in seconds.", icon: "send-check-fill" },
              { step: "04", title: "Admin Reviews", desc: "Our PG management checks live availability and approves your slot.", icon: "shield-lock-fill" },
              { step: "05", title: "Get Confirmation", desc: "Receive real-time notifications with confirmed date, time, and directions.", icon: "check-circle-fill" }
            ].map((st, i) => (
              <div key={i} className="col-md-6 col-lg">
                <div className="p-4 border rounded-4 bg-light text-center h-100 d-flex flex-column justify-content-between">
                  <div>
                    <div className="fw-extrabold text-warning fs-3 mb-2">{st.step}</div>
                    <div
                      className="d-flex align-items-center justify-content-center rounded-circle mx-auto mb-3"
                      style={{ width: '48px', height: '48px', backgroundColor: '#EA580C', color: '#FFFFFF' }}
                    >
                      <i className={`bi bi-${st.icon} fs-5`}></i>
                    </div>
                    <h5 className="fw-bold fs-6 mb-2">{st.title}</h5>
                    <p className="text-secondary small mb-0">{st.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================================================
          SECTION 8: LOCATION & CONTACT SUMMARY
          ================================================== */}
      <section className="section-padding bg-light">
        <div className="container">
          <div className="row g-5 align-items-center">
            <div className="col-lg-6">
              <span className="pill-badge pill-badge-accent mb-2">Strategic Spot</span>
              <h2 className="section-title text-start mb-3">Velachery, Chennai – Connected To Everywhere</h2>
              <div className="p-3 bg-white rounded-3 border mb-3">
                <div className="fw-bold text-dark mb-1">
                  <i className="bi bi-geo-alt-fill text-danger me-2"></i>
                  Sri Lakshmi Srinivasa Gents PG
                </div>
                <div className="text-secondary small">
                  3, Bhavani St, Bharathi Nagar, Velachery, Chennai, Tamil Nadu – 600113
                </div>
              </div>

              <div className="d-flex flex-column gap-2 mb-4">
                <div className="d-flex align-items-center gap-2 small text-secondary">
                  <i className="bi bi-check2-circle text-success fs-5"></i>
                  <span>5 mins to Velachery MRTS Railway Station</span>
                </div>
                <div className="d-flex align-items-center gap-2 small text-secondary">
                  <i className="bi bi-check2-circle text-success fs-5"></i>
                  <span>Quick access to Taramani IT corridor & Ascendas Tech Park</span>
                </div>
                <div className="d-flex align-items-center gap-2 small text-secondary">
                  <i className="bi bi-check2-circle text-success fs-5"></i>
                  <span>Near Phoenix Marketcity Chennai</span>
                </div>
                <div className="d-flex align-items-center gap-2 small text-secondary">
                  <i className="bi bi-check2-circle text-success fs-5"></i>
                  <span>Close to restaurants, medical shops, and ATMs on 100 Feet Road</span>
                </div>
              </div>

              <div className="d-flex flex-wrap gap-2">
                <a
                  href="https://maps.google.com/?q=Sri+Lakshmi+Srinivasa+Gents+PG+Velachery+Chennai"
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-pg-primary"
                >
                  <i className="bi bi-compass me-1"></i> Get Directions
                </a>
                <a href="tel:+917893744206" className="btn btn-pg-secondary">
                  <i className="bi bi-telephone me-1"></i> +91 78937 44206
                </a>
                <a
                  href="https://wa.me/917893744206"
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-success"
                >
                  <i className="bi bi-whatsapp me-1"></i> WhatsApp
                </a>
              </div>
            </div>

            {/* Embedded Map */}
            <div className="col-lg-6">
              <div className="rounded-4 overflow-hidden shadow border" style={{ height: '380px' }}>
                <iframe
                  title="PG Location Map"
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
        </div>
      </section>

      {/* ==================================================
          SECTION 9: FAQ
          ================================================== */}
      <section className="section-padding bg-white">
        <div className="container" style={{ maxWidth: '850px' }}>
          <div className="section-header">
            <span className="pill-badge pill-badge-accent mb-2">Questions & Answers</span>
            <h2 className="section-title">Frequently Asked Questions</h2>
            <p className="section-subtitle">
              Quick answers about visiting, booking, amenities, and policies.
            </p>
          </div>

          <div className="accordion accordion-flush shadow-sm rounded-4 border overflow-hidden" id="faqAccordion">
            {parsedFaqs.map((faq, idx) => (
              <div className="accordion-item" key={idx}>
                <h2 className="accordion-header" id={`heading${idx}`}>
                  <button
                    className={`accordion-button fw-bold text-dark ${idx !== 0 ? 'collapsed' : ''}`}
                    type="button"
                    data-bs-toggle="collapse"
                    data-bs-target={`#collapse${idx}`}
                    aria-expanded={idx === 0}
                    aria-controls={`collapse${idx}`}
                  >
                    {faq.q}
                  </button>
                </h2>
                <div
                  id={`collapse${idx}`}
                  className={`accordion-collapse collapse ${idx === 0 ? 'show' : ''}`}
                  data-bs-parent="#faqAccordion"
                >
                  <div className="accordion-body text-secondary small lh-lg">
                    {faq.a}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================================================
          SECTION 10: FINAL CALL TO ACTION
          ================================================== */}
      <section className="py-5 text-white position-relative" style={{ backgroundColor: '#0F172A' }}>
        <div className="container py-4 text-center">
          <span className="pill-badge pill-badge-white mb-3">Velachery, Chennai</span>
          <h2 className="display-6 fw-bold mb-3 text-white">
            Ready to Visit Sri Lakshmi Srinivasa Gents PG?
          </h2>
          <p className="lead text-light opacity-80 mb-4 mx-auto" style={{ maxWidth: '600px' }}>
            Schedule an appointment slot online to inspect our rooms, beds, and facilities in person.
          </p>
          <div className="d-flex justify-content-center flex-wrap gap-3">
            <button onClick={handleScheduleVisit} className="btn btn-pg-primary btn-lg px-4">
              <i className="bi bi-calendar2-check me-2"></i> Schedule a Visit
            </button>
            <Link to="/contact" className="btn btn-outline-light btn-lg px-4 rounded-3">
              <i className="bi bi-chat-dots me-2"></i> Contact Us
            </Link>
          </div>
        </div>
      </section>

      {/* Lightbox Modal */}
      {lightboxIndex !== null && (
        <LightboxModal
          images={gallery}
          activeIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onNavigate={(newIdx) => setLightboxIndex(newIdx)}
        />
      )}
    </div>
  );
}
