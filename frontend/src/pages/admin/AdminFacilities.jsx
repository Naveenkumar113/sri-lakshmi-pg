import React, { useState, useEffect } from 'react';
import api from '../../services/api';

export default function AdminFacilities() {
  const [facilities, setFacilities] = useState([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editFacility, setEditFacility] = useState(null);
  const [form, setForm] = useState({
    title: '',
    category: 'comfort',
    description: '',
    icon: 'check-circle',
    is_active: true,
    display_order: 1,
  });

  const fetchFacilities = async () => {
    try {
      const res = await api.get('/admin/facilities');
      setFacilities(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFacilities();
  }, []);

  const openAdd = () => {
    setEditFacility(null);
    setForm({
      title: '',
      category: 'comfort',
      description: '',
      icon: 'check-circle',
      is_active: true,
      display_order: facilities.length + 1,
    });
    setModalOpen(true);
  };

  const openEdit = (fac) => {
    setEditFacility(fac);
    setForm({
      title: fac.title,
      category: fac.category,
      description: fac.description,
      icon: fac.icon,
      is_active: fac.is_active,
      display_order: fac.display_order,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editFacility) {
        await api.put(`/admin/facilities/${editFacility.id}`, form);
      } else {
        await api.post('/admin/facilities', form);
      }
      setModalOpen(false);
      fetchFacilities();
    } catch (err) {
      alert('Failed to save facility.');
    }
  };

  const handleDelete = async (fac) => {
    if (!window.confirm(`Delete facility "${fac.title}"?`)) return;
    try {
      await api.delete(`/admin/facilities/${fac.id}`);
      fetchFacilities();
    } catch (err) {
      alert('Failed to delete facility.');
    }
  };

  const handleToggle = async (fac) => {
    try {
      await api.put(`/admin/facilities/${fac.id}`, { is_active: !fac.is_active });
      fetchFacilities();
    } catch (err) {
      alert('Failed to toggle status.');
    }
  };

  return (
    <div className="bg-white p-4 rounded-4 border shadow-sm">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-3">
        <div>
          <h4 className="fw-bold mb-1">PG Amenities & Facilities Configuration</h4>
          <p className="text-secondary small mb-0">
            Control which facilities appear on the homepage and facilities page dynamically.
          </p>
        </div>

        <div className="d-flex align-items-center gap-2">
          <a href="/admin/gallery" className="btn btn-sm btn-outline-secondary">
            <i className="bi bi-images me-1"></i> Open Gallery
          </a>
          <button onClick={openAdd} className="btn btn-sm btn-pg-primary fw-semibold">
            <i className="bi bi-plus-lg me-1"></i> Add Facility
          </button>
        </div>
      </div>

      {/* Facilities & Gallery Sub-navigation Tabs */}
      <div className="d-flex gap-2 border-bottom pb-2 mb-3">
        <a href="/admin/facilities" className="btn btn-sm btn-dark fw-bold">
          <i className="bi bi-stars me-1"></i> Facilities ({facilities.length})
        </a>
        <a href="/admin/gallery" className="btn btn-sm btn-outline-secondary">
          <i className="bi bi-images me-1"></i> Photo Gallery
        </a>
      </div>

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary"></div>
        </div>
      ) : (
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light small">
              <tr>
                <th>Order</th>
                <th>Icon</th>
                <th>Title</th>
                <th>Category</th>
                <th>Description</th>
                <th>Status</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody className="small">
              {facilities.map((f) => (
                <tr key={f.id}>
                  <td className="fw-bold text-muted">#{f.display_order}</td>
                  <td>
                    <div
                      className="d-flex align-items-center justify-content-center rounded-circle bg-light border text-primary"
                      style={{ width: '36px', height: '36px' }}
                    >
                      <i className={`bi bi-${f.icon} fs-5`}></i>
                    </div>
                  </td>
                  <td className="fw-bold text-dark">{f.title}</td>
                  <td>
                    <span className="badge bg-light text-secondary border text-uppercase" style={{ fontSize: '0.68rem' }}>
                      {f.category}
                    </span>
                  </td>
                  <td className="text-muted" style={{ maxWidth: '280px' }}>
                    {f.description}
                  </td>
                  <td>
                    <button
                      onClick={() => handleToggle(f)}
                      className={`btn btn-sm ${f.is_active ? 'btn-success' : 'btn-secondary'} py-0 px-2 fw-semibold`}
                      style={{ fontSize: '0.72rem' }}
                    >
                      {f.is_active ? 'Visible' : 'Hidden'}
                    </button>
                  </td>
                  <td className="text-end">
                    <button onClick={() => openEdit(f)} className="btn btn-sm btn-outline-secondary py-1 px-2 me-1">
                      <i className="bi bi-pencil"></i>
                    </button>
                    <button onClick={() => handleDelete(f)} className="btn btn-sm btn-outline-danger py-1 px-2">
                      <i className="bi bi-trash"></i>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(15, 23, 42, 0.65)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
              <div className="modal-header bg-light border-0 py-3">
                <h5 className="modal-title fw-bold">
                  {editFacility ? 'Edit Facility' : 'Add New Facility'}
                </h5>
                <button type="button" className="btn-close" onClick={() => setModalOpen(false)}></button>
              </div>

              <form onSubmit={handleSubmit}>
                <div className="modal-body p-4">
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Facility Title *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Free High-Speed Wi-Fi"
                      className="form-control"
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                    />
                  </div>

                  <div className="row g-3 mb-3">
                    <div className="col-6">
                      <label className="form-label small fw-semibold">Category</label>
                      <select
                        className="form-select"
                        value={form.category}
                        onChange={(e) => setForm({ ...form, category: e.target.value })}
                      >
                        <option value="essential">Essential</option>
                        <option value="security">Security</option>
                        <option value="comfort">Comfort</option>
                        <option value="convenience">Convenience</option>
                      </select>
                    </div>

                    <div className="col-6">
                      <label className="form-label small fw-semibold">Bootstrap Icon</label>
                      <input
                        type="text"
                        placeholder="e.g. wifi / droplet / shield-check"
                        className="form-control"
                        value={form.icon}
                        onChange={(e) => setForm({ ...form, icon: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Description *</label>
                    <textarea
                      rows="3"
                      required
                      placeholder="Detail what this service covers..."
                      className="form-control"
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                    ></textarea>
                  </div>

                  <div className="row g-3">
                    <div className="col-6">
                      <label className="form-label small fw-semibold">Display Priority Order</label>
                      <input
                        type="number"
                        className="form-control"
                        value={form.display_order}
                        onChange={(e) => setForm({ ...form, display_order: parseInt(e.target.value) })}
                      />
                    </div>

                    <div className="col-6 d-flex align-items-center pt-4">
                      <div className="form-check form-switch">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id="activeSwitch"
                          checked={form.is_active}
                          onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                        />
                        <label className="form-check-label small fw-semibold" htmlFor="activeSwitch">
                          Active & Visible
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="modal-footer border-0 bg-light py-2">
                  <button type="button" className="btn btn-sm btn-secondary" onClick={() => setModalOpen(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-sm btn-pg-primary fw-semibold">
                    Save Facility
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
