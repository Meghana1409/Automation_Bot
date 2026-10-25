import React, { useState, useMemo } from 'react';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  ExternalLink,
  Clock,
  Image as ImageIcon,
  CheckCircle,
  XCircle,
  X,
  Upload,
  Layers,
} from 'lucide-react';
import api from '../../services/api';

export default function ServiceManagement({ services = [], onRefresh }) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    category: 'General',
    description: '',
    price: 500,
    min_duration_minutes: 15,
    max_duration_minutes: 30,
    image_url: '',
    external_link: '',
    is_active: true,
  });

  const categories = useMemo(() => {
    return ['ALL', ...new Set((services || []).map((s) => s.category).filter(Boolean))];
  }, [services]);

  // Real-time filtering by name and description (with safe null-guards)
  const filteredServices = useMemo(() => {
    const query = (search || '').trim().toLowerCase();
    return (services || []).filter((srv) => {
      const name = (srv?.name || '').toLowerCase();
      const desc = (srv?.description || '').toLowerCase();

      const matchesSearch =
        !query ||
        name.includes(query) ||
        desc.includes(query);

      const matchesCat =
        selectedCategory === 'ALL' ||
        (srv?.category && srv.category.toLowerCase() === selectedCategory.toLowerCase());

      return matchesSearch && matchesCat;
    });
  }, [services, search, selectedCategory]);

  const handleOpenCreateModal = () => {
    setEditingService(null);
    setFormData({
      name: '',
      category: 'Nails & Manicures',
      description: '',
      price: 1500,
      min_duration_minutes: 30,
      max_duration_minutes: 60,
      image_url: '',
      external_link: '',
      is_active: true,
    });
    setError('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (service) => {
    setEditingService(service);
    setFormData({
      name: service.name,
      category: service.category || 'General',
      description: service.description || '',
      price: service.price,
      min_duration_minutes: service.min_duration_minutes,
      max_duration_minutes: service.max_duration_minutes,
      image_url: service.image_url || '',
      external_link: service.external_link || '',
      is_active: service.is_active,
    });
    setError('');
    setIsModalOpen(true);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError('');
    try {
      const res = await api.services.uploadPhoto(file);
      setFormData((prev) => ({ ...prev, image_url: res.image_url }));
    } catch (err) {
      setError(err.friendlyMessage || 'Failed to upload image.');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('Service name is required.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      if (editingService) {
        await api.services.update(editingService.id, formData);
      } else {
        await api.services.create(formData);
      }
      setIsModalOpen(false);
      onRefresh();
    } catch (err) {
      setError(err.friendlyMessage || 'Failed to save service.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete the salon service "${name}"?`)) {
      return;
    }
    try {
      await api.services.delete(id);
      onRefresh();
    } catch (err) {
      alert(err.friendlyMessage || 'Failed to delete service.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Layers className="w-5 h-5 text-brand-600" />
            <span>Salon Services & Treatment Pricing</span>
          </h2>
          <p className="text-xs text-slate-500">
            Configure luxury salon treatments, styling pricing, service durations, brochures, and portfolio imagery.
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="inline-flex items-center space-x-1.5 bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-all shadow-sm shadow-brand-700/30 cursor-pointer self-start sm:self-auto border border-brand-500"
        >
          <Plus className="w-4 h-4 text-gold-300" />
          <span>Add Salon Service</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or description..."
            className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg shrink-0 transition-all cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-brand-900 text-gold-300 font-bold'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Services Grid */}
      {filteredServices.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200/80 p-8">
          <Layers className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-700">No Salon Services Found</h3>
          <p className="text-xs text-slate-400 mt-1">
            {search ? `No services match "${search}". Try checking for spelling or clear search.` : 'Try adjusting your category filter.'}
          </p>
          {(search || selectedCategory !== 'ALL') && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setSelectedCategory('ALL');
              }}
              className="mt-3 px-3.5 py-1.5 rounded-xl bg-brand-50 border border-brand-200 text-brand-700 hover:bg-brand-100 text-xs font-semibold transition-colors cursor-pointer"
            >
              Clear Search & Filter
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredServices.map((srv) => (
            <div
              key={srv.id}
              className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col justify-between transition-all hover:shadow-md"
            >
              {/* Service Card Image or Placeholder */}
              <div className="h-40 bg-slate-100 relative overflow-hidden group">
                {srv.image_url ? (
                  <img
                    src={srv.image_url}
                    alt={srv.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src =
                        'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=600&q=80';
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                    <ImageIcon className="w-8 h-8 mb-1" />
                    <span className="text-[11px]">No photo uploaded</span>
                  </div>
                )}
                {/* Status Badge */}
                <div className="absolute top-3 right-3">
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold shadow-xs ${
                      srv.is_active
                        ? 'bg-brand-600 text-white'
                        : 'bg-slate-700 text-slate-200'
                    }`}
                  >
                    {srv.is_active ? 'ACTIVE' : 'INACTIVE'}
                  </span>
                </div>
                {/* Category Pill */}
                <div className="absolute bottom-3 left-3">
                  <span className="px-2.5 py-1 rounded-lg bg-[#071f11]/90 backdrop-blur-xs text-gold-300 text-[10px] font-semibold tracking-wide border border-gold-500/20">
                    {srv.category}
                  </span>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-base text-slate-900 leading-snug">{srv.name}</h3>
                    <span className="text-base font-extrabold text-gold-600 shrink-0">
                      ₹{srv.price}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                    {srv.description || 'No description provided.'}
                  </p>
                </div>

                {/* Meta: Duration time frames & Links */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center gap-1.5 text-slate-600 font-medium">
                    <Clock className="w-3.5 h-3.5 text-gold-500" />
                    <span>
                      {srv.min_duration_minutes} - {srv.max_duration_minutes} mins
                    </span>
                  </div>

                  {srv.external_link && (
                    <a
                      href={srv.external_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-brand-600 hover:text-brand-700 font-semibold"
                    >
                      <span>Brochure</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>

                {/* Card Actions */}
                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    onClick={() => handleOpenEditModal(srv)}
                    className="p-2 text-slate-600 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors cursor-pointer"
                    title="Edit Service"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(srv.id, srv.name)}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                    title="Delete Service"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Service Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <h3 className="font-bold text-base text-slate-900">
                {editingService ? 'Edit Salon Treatment' : 'Add New Salon Treatment'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {error && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                  {error}
                </div>
              )}

              {/* Service Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Salon Treatment Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Gel manicures"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>

              {/* Category & Price */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    placeholder="e.g. Nails & Manicures"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Price (₹) *</label>
                  <input
                    type="number"
                    min="0"
                    step="50"
                    required
                    value={formData.price}
                    onChange={(e) =>
                      setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none font-semibold text-gold-600"
                  />
                </div>
              </div>

              {/* Min & Max Time Frames */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Min Duration (mins)
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="240"
                    value={formData.min_duration_minutes}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        min_duration_minutes: parseInt(e.target.value) || 15,
                      })
                    }
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Max Duration (mins)
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="240"
                    value={formData.max_duration_minutes}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        max_duration_minutes: parseInt(e.target.value) || 30,
                      })
                    }
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Luxury treatment details, organic products used, client aftercare..."
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>

              {/* Photo Upload & Image URL */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Service Photo</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formData.image_url}
                    onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                    placeholder="Image URL or upload a file below..."
                    className="flex-1 px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 font-mono focus:outline-none"
                  />
                  <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer shrink-0">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{uploading ? 'Uploading...' : 'Upload'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                      disabled={uploading}
                    />
                  </label>
                </div>
                {formData.image_url && (
                  <div className="mt-2 w-full h-24 rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
                    <img
                      src={formData.image_url}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
              </div>

              {/* External Link */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  External Brochure / Lookbook Link
                </label>
                <input
                  type="url"
                  value={formData.external_link}
                  onChange={(e) => setFormData({ ...formData, external_link: e.target.value })}
                  placeholder="https://luxesalon.example.com/lookbook"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 font-mono focus:outline-none"
                />
              </div>

              {/* Active Toggle */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="service-active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="rounded text-brand-600 focus:ring-brand-500"
                />
                <label htmlFor="service-active" className="text-xs font-semibold text-slate-700">
                  Active (Available for salon client booking)
                </label>
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-xs cursor-pointer disabled:opacity-60"
                >
                  {submitting ? 'Saving...' : editingService ? 'Save Changes' : 'Create Treatment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
