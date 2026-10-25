import React, { useState } from 'react';
import {
  Users,
  Plus,
  Edit2,
  Trash2,
  Phone,
  Mail,
  Sparkles,
  Layers,
  Upload,
  CheckCircle,
  XCircle,
  X,
  UserCheck,
} from 'lucide-react';
import api from '../../services/api';

export default function StaffManagement({ staff, services, onRefresh }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    title: '',
    email: '',
    phone: '',
    bio: '',
    avatar_url: '',
    is_active: true,
    service_ids: [],
  });

  const handleOpenCreateModal = () => {
    setEditingStaff(null);
    setFormData({
      name: '',
      title: 'Senior Stylist / Beautician',
      email: '',
      phone: '',
      bio: '',
      avatar_url: '',
      is_active: true,
      service_ids: [],
    });
    setError('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (st) => {
    setEditingStaff(st);
    setFormData({
      name: st.name,
      title: st.title,
      email: st.email || '',
      phone: st.phone || '',
      bio: st.bio || '',
      avatar_url: st.avatar_url || '',
      is_active: st.is_active,
      service_ids: st.service_ids || st.services?.map((s) => s.id) || [],
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
      const res = await api.staff.uploadAvatar(file);
      setFormData((prev) => ({ ...prev, avatar_url: res.avatar_url }));
    } catch (err) {
      setError(err.friendlyMessage || 'Failed to upload staff avatar.');
    } finally {
      setUploading(false);
    }
  };

  const toggleServiceMapping = (serviceId) => {
    setFormData((prev) => {
      const exists = prev.service_ids.includes(serviceId);
      const updated = exists
        ? prev.service_ids.filter((id) => id !== serviceId)
        : [...prev.service_ids, serviceId];
      return { ...prev, service_ids: updated };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.title.trim()) {
      setError('Stylist name and professional title are required.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      if (editingStaff) {
        await api.staff.update(editingStaff.id, formData);
      } else {
        await api.staff.create(formData);
      }
      setIsModalOpen(false);
      onRefresh();
    } catch (err) {
      setError(err.friendlyMessage || 'Failed to save stylist profile.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to remove stylist "${name}"?`)) return;
    try {
      await api.staff.delete(id);
      onRefresh();
    } catch (err) {
      alert(err.friendlyMessage || 'Failed to delete stylist profile.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-gold-500" />
            <span>Stylists & Beauticians Directory</span>
          </h2>
          <p className="text-xs text-slate-500">
            Maintain luxury stylist & beautician profiles and map specialists to their assigned salon services.
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="inline-flex items-center space-x-1.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-all shadow-sm shadow-brand-500/20 cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Stylist / Beautician</span>
        </button>
      </div>

      {/* Staff Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {staff.map((st) => (
          <div
            key={st.id}
            className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 flex flex-col justify-between space-y-4 hover:shadow-md transition-all"
          >
            {/* Profile Info */}
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center space-x-3">
                  <div className="w-14 h-14 rounded-2xl bg-brand-50 border border-brand-100 overflow-hidden shrink-0">
                    {st.avatar_url ? (
                      <img
                        src={st.avatar_url}
                        alt={st.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src =
                            'https://images.unsplash.com/photo-1595476108010-b4d1f102b1b1?auto=format&fit=crop&w=250&q=80';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-brand-600">
                        <UserCheck className="w-6 h-6" />
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-slate-900 leading-snug">{st.name}</h3>
                    <p className="text-xs font-semibold text-brand-700">{st.title}</p>
                    <span
                      className={`inline-block mt-1 text-[9px] font-bold px-2 py-0.5 rounded-full ${
                        st.is_active
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {st.is_active ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenEditModal(st)}
                    className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors cursor-pointer"
                    title="Edit Profile & Service Mapping"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(st.id, st.name)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                    title="Delete Stylist"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Bio */}
              {st.bio && <p className="text-xs text-slate-500 line-clamp-2 italic">"{st.bio}"</p>}

              {/* Contact info */}
              <div className="space-y-1 text-xs text-slate-600 pt-1">
                {st.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{st.phone}</span>
                  </div>
                )}
                {st.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span className="truncate">{st.email}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Mapped Services Section */}
            <div className="pt-4 border-t border-slate-100 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5 text-gold-500" />
                  <span>Assigned Salon Services ({st.services?.length || 0}):</span>
                </span>
              </div>

              {st.services && st.services.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {st.services.map((srv) => (
                    <span
                      key={srv.id}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-brand-50 text-brand-900 text-[11px] font-medium border border-brand-200"
                    >
                      <span>{srv.name}</span>
                      <span className="text-gold-600 font-bold">₹{srv.price}</span>
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-amber-600 italic">No services currently assigned.</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Staff Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <h3 className="font-bold text-base text-slate-900">
                {editingStaff ? 'Edit Stylist Profile & Mappings' : 'Add New Stylist / Beautician'}
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

              {/* Full Name & Title */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Anya Roy"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Professional Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g. Master Stylist & Colorist"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                  />
                </div>
              </div>

              {/* Email & Phone */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="anya@salon.com"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Phone</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+91 98765 43210"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                  />
                </div>
              </div>

              {/* Bio */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Professional Bio
                </label>
                <textarea
                  rows={2}
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  placeholder="Styling expertise, luxury treatments, certifications, and background..."
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                />
              </div>

              {/* Avatar Upload */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Profile Avatar
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formData.avatar_url}
                    onChange={(e) => setFormData({ ...formData, avatar_url: e.target.value })}
                    placeholder="Avatar image URL or upload photo..."
                    className="flex-1 px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 font-mono"
                  />
                  <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer shrink-0">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{uploading ? '...' : 'Upload'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                      disabled={uploading}
                    />
                  </label>
                </div>
              </div>

              {/* Service Mapping Section (Multi-select Checklist) */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <label className="block text-xs font-bold text-slate-800">
                  Assign Salon Services to this Stylist:
                </label>
                <p className="text-[11px] text-slate-500">
                  Clients booking these treatments will be able to select this stylist.
                </p>

                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {services.map((srv) => {
                    const isMapped = formData.service_ids.includes(srv.id);
                    return (
                      <label
                        key={srv.id}
                        className={`flex items-center justify-between p-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                          isMapped
                            ? 'bg-brand-50 border-brand-300 text-brand-900 font-semibold'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <input
                            type="checkbox"
                            checked={isMapped}
                            onChange={() => toggleServiceMapping(srv.id)}
                            className="rounded text-brand-600 focus:ring-brand-500"
                          />
                          <span className="truncate">{srv.name}</span>
                        </div>
                        <span className="text-[10px] text-gold-600 font-bold shrink-0">₹{srv.price}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Active Toggle */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="staff-active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="rounded text-brand-600 focus:ring-brand-500"
                />
                <label htmlFor="staff-active" className="text-xs font-semibold text-slate-700">
                  Active (Accepting client appointments & styling sessions)
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
                  className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold shadow-xs shadow-brand-500/20 cursor-pointer disabled:opacity-60"
                >
                  {submitting ? 'Saving...' : editingStaff ? 'Save Changes' : 'Add Stylist'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
