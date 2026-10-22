import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import AdminOverviewHeader from '../../components/AdminOverviewHeader';

export default function AdminGallery() {
  const [gallery, setGallery] = useState([]);
  const [loading, setLoading] = useState(true);

  // Upload modal state
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Exterior');
  const [caption, setCaption] = useState('');
  const [isAuthentic, setIsAuthentic] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const fetchGallery = async () => {
    try {
      const res = await api.get('/gallery');
      setGallery(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGallery();
  }, []);

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!uploadFile) {
      alert('Please select an image file to upload.');
      return;
    }
    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('title', title);
      formData.append('category', category);
      formData.append('caption', caption);
      formData.append('is_authentic', isAuthentic);

      await api.post('/admin/gallery/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setUploadModalOpen(false);
      setUploadFile(null);
      setTitle('');
      setCaption('');
      fetchGallery();
    } catch (err) {
      alert('Failed to upload image.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Delete photo "${item.title}"?`)) return;
    try {
      await api.delete(`/admin/gallery/${item.id}`);
      fetchGallery();
    } catch (err) {
      alert('Failed to delete image.');
    }
  };

  const authenticCount = gallery.filter((g) => g.is_authentic).length;
  const categoriesCount = new Set(gallery.map((g) => g.category)).size;

  return (
    <div>
      <AdminOverviewHeader
        title="Property Photo Gallery"
        badge="Media CMS"
        subtitle="Upload and manage authentic photographs of Sri Lakshmi Srinivasa Gents PG."
        storageKey="admin_overview_gallery"
        defaultCollapsed={true}
        summaryItems={[
          { label: 'Photos Uploaded', value: gallery.length, colorClass: 'badge bg-primary-subtle text-primary px-1.5 py-0.5 rounded-pill' },
          { label: 'Real Photos', value: authenticCount, colorClass: 'text-success' },
          { label: 'Categories', value: categoriesCount, colorClass: 'text-dark' },
        ]}
        rightActions={
          <div className="d-flex align-items-center gap-2">
            <a href="/admin/facilities" className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1.5" style={{ height: '36px' }}>
              <i className="bi bi-stars"></i>
              <span className="d-none d-sm-inline">Facilities</span>
            </a>
            <button
              onClick={() => setUploadModalOpen(true)}
              className="btn btn-sm btn-pg-primary fw-semibold d-flex align-items-center gap-1.5"
              style={{ height: '36px' }}
            >
              <i className="bi bi-cloud-arrow-up-fill"></i>
              <span>Upload Photo</span>
            </button>
          </div>
        }
      >
        <div className="row g-2.5 g-md-3">
          <div className="col-4">
            <div className="stat-box h-100 p-3 bg-white rounded-3 border shadow-xs border-top-primary">
              <div className="d-flex justify-content-between align-items-center mb-1">
                <span className="small text-muted fw-semibold">Total Gallery Photos</span>
                <i className="bi bi-images text-primary fs-6"></i>
              </div>
              <h4 className="fw-bold mb-0 text-primary">{gallery.length}</h4>
              <span className="small text-muted" style={{ fontSize: '0.72rem' }}>Published pictures</span>
            </div>
          </div>
          <div className="col-4">
            <div className="stat-box h-100 p-3 bg-white rounded-3 border shadow-xs border-top-success">
              <div className="d-flex justify-content-between align-items-center mb-1">
                <span className="small text-muted fw-semibold">Authentic Real Photos</span>
                <i className="bi bi-patch-check-fill text-success fs-6"></i>
              </div>
              <h4 className="fw-bold mb-0 text-success">{authenticCount}</h4>
              <span className="small text-muted" style={{ fontSize: '0.72rem' }}>Verified property views</span>
            </div>
          </div>
          <div className="col-4">
            <div className="stat-box h-100 p-3 bg-white rounded-3 border shadow-xs border-top-secondary">
              <div className="d-flex justify-content-between align-items-center mb-1">
                <span className="small text-muted fw-semibold">Media Categories</span>
                <i className="bi bi-folder-fill text-secondary fs-6"></i>
              </div>
              <h4 className="fw-bold mb-0 text-dark">{categoriesCount}</h4>
              <span className="small text-muted" style={{ fontSize: '0.72rem' }}>Bedrooms, Exterior, etc.</span>
            </div>
          </div>
        </div>
      </AdminOverviewHeader>

      <div className="bg-white p-3 p-md-4 rounded-4 border shadow-sm">
        {/* Facilities & Gallery Sub-navigation Tabs */}
        <div className="d-flex gap-2 border-bottom pb-2 mb-3">
          <a href="/admin/facilities" className="btn btn-sm btn-outline-secondary">
            <i className="bi bi-stars me-1"></i> Facilities
          </a>
          <a href="/admin/gallery" className="btn btn-sm btn-dark fw-bold">
            <i className="bi bi-images me-1"></i> Photo Gallery ({gallery.length})
          </a>
        </div>

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary"></div>
        </div>
      ) : (
        <div className="row g-3">
          {gallery.map((item) => (
            <div key={item.id} className="col-sm-6 col-md-4 col-lg-3">
              <div className="card h-100 border rounded-3 overflow-hidden shadow-sm">
                <div className="position-relative" style={{ height: '180px' }}>
                  <img
                    src={item.image_url}
                    alt={item.title}
                    className="w-100 h-100"
                    style={{ objectFit: 'cover' }}
                  />
                  <div className="position-absolute top-0 start-0 m-2">
                    <span className="badge-authentic">
                      <i className="bi bi-shield-check"></i>
                      {item.is_authentic ? 'Real Photo' : 'PG View'}
                    </span>
                  </div>
                </div>

                <div className="p-3 d-flex flex-column justify-content-between flex-grow-1">
                  <div>
                    <h6 className="fw-bold mb-1 text-dark text-truncate">{item.title}</h6>
                    <span className="badge bg-light text-secondary border text-uppercase mb-2" style={{ fontSize: '0.68rem' }}>
                      {item.category}
                    </span>
                    {item.caption && (
                      <p className="text-muted small mb-0 text-truncate" title={item.caption}>
                        {item.caption}
                      </p>
                    )}
                  </div>

                  <div className="pt-3 border-top mt-2 d-flex justify-content-between align-items-center">
                    <span className="small text-muted" style={{ fontSize: '0.72rem' }}>
                      ID #{item.id}
                    </span>
                    <button
                      onClick={() => handleDelete(item)}
                      className="btn btn-sm btn-outline-danger py-0 px-2"
                      title="Delete Photo"
                    >
                      <i className="bi bi-trash"></i>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      {uploadModalOpen && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(15, 23, 42, 0.65)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
              <div className="modal-header bg-light border-0 py-3">
                <h5 className="modal-title fw-bold">Upload Property Photo</h5>
                <button type="button" className="btn-close" onClick={() => setUploadModalOpen(false)}></button>
              </div>

              <form onSubmit={handleUploadSubmit}>
                <div className="modal-body p-4">
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Photo Title *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 2nd Floor Corridor & Cot Layout"
                      className="form-control"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                    />
                  </div>

                  <div className="row g-3 mb-3">
                    <div className="col-6">
                      <label className="form-label small fw-semibold">Category</label>
                      <select
                        className="form-select"
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                      >
                        <option value="Exterior">Exterior</option>
                        <option value="Bedrooms">Bedrooms</option>
                        <option value="Facilities">Facilities</option>
                        <option value="Surroundings">Surroundings</option>
                        <option value="Signboard">Signboard</option>
                      </select>
                    </div>

                    <div className="col-6 d-flex align-items-center pt-4">
                      <div className="form-check form-switch">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id="authSwitch"
                          checked={isAuthentic}
                          onChange={(e) => setIsAuthentic(e.target.checked)}
                        />
                        <label className="form-check-label small fw-semibold" htmlFor="authSwitch">
                          Authentic Camera Photo
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Select File from Device *</label>
                    <input
                      type="file"
                      required
                      accept="image/*"
                      className="form-control"
                      onChange={(e) => setUploadFile(e.target.files[0])}
                    />
                  </div>

                  <div className="mb-2">
                    <label className="form-label small fw-semibold">Caption / Location Context</label>
                    <textarea
                      rows="2"
                      placeholder="e.g. View of rooms facing Bhavani Street."
                      className="form-control"
                      value={caption}
                      onChange={(e) => setCaption(e.target.value)}
                    ></textarea>
                  </div>
                </div>

                <div className="modal-footer border-0 bg-light py-2">
                  <button type="button" className="btn btn-sm btn-secondary" onClick={() => setUploadModalOpen(false)}>
                    Cancel
                  </button>
                  <button type="submit" disabled={submitting} className="btn btn-sm btn-pg-primary fw-semibold">
                    {submitting ? 'Uploading...' : 'Save & Publish Photo'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
