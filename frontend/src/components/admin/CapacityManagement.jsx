import React, { useState, useEffect } from 'react';
import {
  Gauge,
  Save,
  CheckCircle,
  AlertCircle,
  Calendar,
  Clock,
  ShieldAlert,
  Users,
  Activity,
  Layers,
} from 'lucide-react';
import api from '../../services/api';

export default function CapacityManagement({ onRefresh }) {
  const [capacitySettings, setCapacitySettings] = useState({
    max_bookings_per_hour: 4,
    slot_duration_minutes: 60,
    allow_overbooking: false,
    notes: '',
  });

  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [occupancyData, setOccupancyData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [occupancyLoading, setOccupancyLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const fetchCapacity = async () => {
    setLoading(true);
    try {
      const cap = await api.capacity.getCapacity();
      setCapacitySettings(cap);
    } catch (err) {
      setErrorMessage(err.friendlyMessage || 'Failed to fetch capacity settings.');
    } finally {
      setLoading(false);
    }
  };

  const fetchOccupancy = async (dateStr) => {
    setOccupancyLoading(true);
    try {
      const occ = await api.capacity.getOccupancy(dateStr);
      setOccupancyData(occ);
    } catch (err) {
      console.error('Failed to load date occupancy:', err);
    } finally {
      setOccupancyLoading(false);
    }
  };

  useEffect(() => {
    fetchCapacity();
  }, []);

  useEffect(() => {
    if (selectedDate) {
      fetchOccupancy(selectedDate);
    }
  }, [selectedDate]);

  const handleSaveCapacity = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMessage('');
    setErrorMessage('');
    try {
      const updated = await api.capacity.updateCapacity({
        max_bookings_per_hour: parseInt(capacitySettings.max_bookings_per_hour, 10),
        slot_duration_minutes: parseInt(capacitySettings.slot_duration_minutes, 10) || 60,
        allow_overbooking: Boolean(capacitySettings.allow_overbooking),
        notes: capacitySettings.notes || '',
      });
      setCapacitySettings(updated);
      setSuccessMessage('Booking capacity settings updated successfully!');
      setTimeout(() => setSuccessMessage(''), 4000);
      fetchOccupancy(selectedDate);
      onRefresh();
    } catch (err) {
      setErrorMessage(err.friendlyMessage || 'Failed to save capacity settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Gauge className="w-5 h-5 text-gold-500" />
          <span>Salon Chair & Station Booking Limits</span>
        </h2>
        <p className="text-xs text-slate-500">
          Regulate maximum client bookings per hour across styling chairs and beauty suites.
        </p>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Main Grid: Control Card + Live Meter */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Capacity Control Form */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-5">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="font-bold text-base text-slate-900">Salon Capacity Parameters</h3>
            <p className="text-xs text-slate-500">Enforced by the salon booking & rescheduling engines.</p>
          </div>

          <form onSubmit={handleSaveCapacity} className="space-y-4">
            {/* Max Bookings per Hour */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Max Styling Chairs / Clients Per Hour *
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min="1"
                  max="30"
                  required
                  value={capacitySettings.max_bookings_per_hour}
                  onChange={(e) =>
                    setCapacitySettings({
                      ...capacitySettings,
                      max_bookings_per_hour: e.target.value,
                    })
                  }
                  className="w-24 px-3 py-2 text-base font-bold text-center border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500"
                />
                <span className="text-xs text-slate-500">clients per 60-min window</span>
              </div>
            </div>

            {/* Slot Duration */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Standard Slot Block
              </label>
              <select
                value={capacitySettings.slot_duration_minutes}
                onChange={(e) =>
                  setCapacitySettings({
                    ...capacitySettings,
                    slot_duration_minutes: e.target.value,
                  })
                }
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500"
              >
                <option value="60">60 Minutes</option>
                <option value="30">30 Minutes</option>
                <option value="15">15 Minutes</option>
              </select>
            </div>

            {/* Overbooking Toggle */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="overbook-toggle"
                  checked={capacitySettings.allow_overbooking}
                  onChange={(e) =>
                    setCapacitySettings({
                      ...capacitySettings,
                      allow_overbooking: e.target.checked,
                    })
                  }
                  className="rounded text-brand-600 focus:ring-brand-500"
                />
                <label
                  htmlFor="overbook-toggle"
                  className="text-xs font-bold text-slate-800 cursor-pointer"
                >
                  Permit VIP / Salon Overbooking
                </label>
              </div>
              <p className="text-[11px] text-slate-500 pl-5">
                If checked, salon administrators can override the hourly chair limit for VIP clients or urgent styling requests.
              </p>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Internal Salon Guidelines
              </label>
              <textarea
                rows={3}
                value={capacitySettings.notes || ''}
                onChange={(e) =>
                  setCapacitySettings({
                    ...capacitySettings,
                    notes: e.target.value,
                  })
                }
                placeholder="Salon styling chair protocol for peak weekend hours..."
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <button
              type="submit"
              disabled={saving || loading}
              className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs rounded-xl shadow-xs shadow-brand-500/20 transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saving ? 'Updating...' : 'Save Chair Limits'}</span>
            </button>
          </form>
        </div>

        {/* Right Column: Live Hourly Slot Occupancy Heatmap (2 Cols) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <Activity className="w-4 h-4 text-gold-500" />
                <span>Live Styling Chair & Station Occupancy</span>
              </h3>
              <p className="text-xs text-slate-500">
                Hourly client distribution and real-time styling station capacity.
              </p>
            </div>

            {/* Date Selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600">Select Date:</span>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-1.5 text-xs font-semibold border border-slate-200 rounded-xl bg-slate-50 focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          {/* Date Summary Card */}
          {occupancyData && (
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gold-500" />
                <span className="font-bold text-slate-800">
                  {occupancyData.date} ({occupancyData.day_name})
                </span>
                {occupancyData.is_holiday && (
                  <span className="bg-rose-100 text-rose-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    Holiday: {occupancyData.holiday_name}
                  </span>
                )}
                {!(occupancyData.is_salon_open ?? occupancyData.is_clinic_open) && !occupancyData.is_holiday && (
                  <span className="bg-slate-200 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    Salon Closed
                  </span>
                )}
              </div>

              <div className="flex items-center gap-4 text-slate-600">
                <span>
                  Total Client Bookings: <strong className="text-slate-900">{occupancyData.total_bookings}</strong>
                </span>
                <span>
                  Limit: <strong className="text-brand-700">{occupancyData.max_bookings_per_hour} chairs/hr</strong>
                </span>
              </div>
            </div>
          )}

          {/* Hourly Slots List */}
          {occupancyLoading ? (
            <div className="text-center py-12 text-xs text-slate-400">Loading chair occupancy...</div>
          ) : occupancyData && occupancyData.slots ? (
            <div className="space-y-2.5">
              {occupancyData.slots.map((slot) => {
                let statusColor = 'bg-brand-600';
                let statusLabel = 'Chairs Available';
                let badgeStyle = 'bg-brand-50 text-brand-800 border-brand-200';

                if (slot.is_closed) {
                  statusColor = 'bg-slate-400';
                  statusLabel = 'Closed';
                  badgeStyle = 'bg-slate-100 text-slate-600 border-slate-200';
                } else if (slot.is_break) {
                  statusColor = 'bg-amber-400';
                  statusLabel = 'Stylist Lunch / Break';
                  badgeStyle = 'bg-amber-50 text-amber-700 border-amber-200';
                } else if (slot.is_full) {
                  statusColor = 'bg-rose-500';
                  statusLabel = 'ALL CHAIRS OCCUPIED';
                  badgeStyle = 'bg-rose-50 text-rose-700 border-rose-200 font-bold';
                } else if (slot.percentage >= 50) {
                  statusColor = 'bg-gold-500';
                  statusLabel = `${slot.max_capacity - slot.booked_count} chairs open`;
                  badgeStyle = 'bg-gold-50 text-gold-800 border-gold-200';
                }

                return (
                  <div
                    key={slot.hour}
                    className="p-3 rounded-xl border border-slate-100 hover:border-slate-200 bg-white transition-all space-y-2"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-bold text-slate-800">{slot.time_label}</span>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="font-medium text-slate-500">
                          <strong>{slot.booked_count}</strong> / {slot.max_capacity} chairs booked
                        </span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full border ${badgeStyle}`}
                        >
                          {statusLabel}
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${statusColor} transition-all duration-500 rounded-full`}
                        style={{
                          width: `${slot.is_closed ? 100 : Math.min(100, slot.percentage)}%`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-xs text-slate-400">
              No chair occupancy data available.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
