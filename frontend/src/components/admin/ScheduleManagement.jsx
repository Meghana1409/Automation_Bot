import React, { useState, useEffect } from 'react';
import {
  Clock,
  Calendar as CalendarIcon,
  Plus,
  Trash2,
  Save,
  CheckCircle,
  AlertCircle,
  Coffee,
  Sun,
} from 'lucide-react';
import api from '../../services/api';

export default function ScheduleManagement({ onRefresh }) {
  const [workingHours, setWorkingHours] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingHours, setSavingHours] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // New Holiday form state
  const [newHolidayDate, setNewHolidayDate] = useState('');
  const [newHolidayName, setNewHolidayName] = useState('');
  const [addingHoliday, setAddingHoliday] = useState(false);

  const fetchScheduleData = async () => {
    setLoading(true);
    try {
      const [hoursRes, holRes] = await Promise.all([
        api.schedule.getWorkingHours(),
        api.schedule.getHolidays(),
      ]);
      setWorkingHours(hoursRes);
      setHolidays(holRes);
    } catch (err) {
      setErrorMessage(err.friendlyMessage || 'Failed to load schedule data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScheduleData();
  }, []);

  const handleHourChange = (index, field, value) => {
    setWorkingHours((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleSaveHours = async () => {
    setSavingHours(true);
    setSuccessMessage('');
    setErrorMessage('');
    try {
      const updated = await api.schedule.updateWorkingHours(workingHours);
      setWorkingHours(updated);
      setSuccessMessage('Weekly working hours updated successfully!');
      setTimeout(() => setSuccessMessage(''), 4000);
      onRefresh();
    } catch (err) {
      setErrorMessage(err.friendlyMessage || 'Failed to save working hours.');
    } finally {
      setSavingHours(false);
    }
  };

  const handleAddHoliday = async (e) => {
    e.preventDefault();
    if (!newHolidayDate || !newHolidayName.trim()) {
      setErrorMessage('Holiday date and name are required.');
      return;
    }

    setAddingHoliday(true);
    setSuccessMessage('');
    setErrorMessage('');
    try {
      await api.schedule.addHoliday({
        holiday_date: newHolidayDate,
        name: newHolidayName.trim(),
      });
      setNewHolidayDate('');
      setNewHolidayName('');
      setSuccessMessage('Holiday added successfully!');
      setTimeout(() => setSuccessMessage(''), 4000);
      fetchScheduleData();
      onRefresh();
    } catch (err) {
      setErrorMessage(err.friendlyMessage || 'Failed to add holiday.');
    } finally {
      setAddingHoliday(false);
    }
  };

  const handleDeleteHoliday = async (holidayId, name) => {
    if (!window.confirm(`Delete holiday "${name}"?`)) return;
    try {
      await api.schedule.deleteHoliday(holidayId);
      fetchScheduleData();
      onRefresh();
    } catch (err) {
      alert(err.friendlyMessage || 'Failed to delete holiday.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Clock className="w-5 h-5 text-gold-500" />
          <span>Salon Working Hours & Holiday Schedule</span>
        </h2>
        <p className="text-xs text-slate-500">
          Set weekly opening/closing salon hours, stylist lunch break periods, and festive closures.
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

      {/* Main Grid: Weekly Hours & Holidays */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: 7-Day Working Hours Grid (2 Cols) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <Sun className="w-4 h-4 text-gold-500" />
                <span>Weekly Salon Operational Hours</span>
              </h3>
              <p className="text-xs text-slate-500">
                Configure salon opening, closing, and stylist break periods for each day of the week.
              </p>
            </div>

            <button
              onClick={handleSaveHours}
              disabled={savingHours || loading}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs rounded-xl shadow-xs shadow-brand-500/20 transition-colors cursor-pointer disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{savingHours ? 'Saving...' : 'Save Salon Schedule'}</span>
            </button>
          </div>

          {loading ? (
            <div className="text-center py-12 text-xs text-slate-400">Loading salon schedule...</div>
          ) : (
            <div className="space-y-3">
              {workingHours.map((wh, idx) => (
                <div
                  key={wh.day_of_week}
                  className={`p-3.5 rounded-xl border transition-all ${
                    wh.is_open
                      ? 'bg-white border-slate-200 shadow-2xs'
                      : 'bg-slate-50 border-slate-200/60 opacity-60'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    {/* Day Name and Toggle */}
                    <div className="w-36 flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        id={`open-toggle-${wh.day_of_week}`}
                        checked={wh.is_open}
                        onChange={(e) => handleHourChange(idx, 'is_open', e.target.checked)}
                        className="rounded text-brand-600 focus:ring-brand-500"
                      />
                      <label
                        htmlFor={`open-toggle-${wh.day_of_week}`}
                        className="font-bold text-xs text-slate-900 cursor-pointer"
                      >
                        {wh.day_name}
                      </label>
                    </div>

                    {/* Open & Close Timings */}
                    {wh.is_open ? (
                      <div className="flex flex-wrap items-center gap-4 text-xs">
                        {/* Operating range */}
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-semibold text-slate-500">Open:</span>
                          <input
                            type="time"
                            value={wh.open_time}
                            onChange={(e) => handleHourChange(idx, 'open_time', e.target.value)}
                            className="px-2 py-1 text-xs border border-slate-200 rounded-lg bg-slate-50 font-mono"
                          />
                          <span className="text-slate-400">to</span>
                          <input
                            type="time"
                            value={wh.close_time}
                            onChange={(e) => handleHourChange(idx, 'close_time', e.target.value)}
                            className="px-2 py-1 text-xs border border-slate-200 rounded-lg bg-slate-50 font-mono"
                          />
                        </div>

                        {/* Break range */}
                        <div className="flex items-center gap-1.5 border-l border-slate-200 pl-3">
                          <Coffee className="w-3.5 h-3.5 text-gold-500" />
                          <span className="text-[11px] font-semibold text-slate-500">Break:</span>
                          <input
                            type="time"
                            value={wh.break_start || ''}
                            onChange={(e) => handleHourChange(idx, 'break_start', e.target.value)}
                            className="px-2 py-1 text-xs border border-slate-200 rounded-lg bg-slate-50 font-mono"
                          />
                          <span className="text-slate-400">-</span>
                          <input
                            type="time"
                            value={wh.break_end || ''}
                            onChange={(e) => handleHourChange(idx, 'break_end', e.target.value)}
                            className="px-2 py-1 text-xs border border-slate-200 rounded-lg bg-slate-50 font-mono"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs font-semibold text-slate-400 italic">
                        Salon Closed on {wh.day_name}s
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Holidays & Blocked Dates */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-5">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-gold-500" />
              <span>Salon Holidays & Festive Closures</span>
            </h3>
            <p className="text-xs text-slate-500">
              The appointment engine blocks client bookings on designated salon holiday dates.
            </p>
          </div>

          {/* Add Holiday Form */}
          <form onSubmit={handleAddHoliday} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3">
            <p className="text-xs font-bold text-slate-800">Add Upcoming Salon Holiday</p>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Holiday Date *
              </label>
              <input
                type="date"
                required
                value={newHolidayDate}
                onChange={(e) => setNewHolidayDate(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Holiday / Closure Name *
              </label>
              <input
                type="text"
                required
                value={newHolidayName}
                onChange={(e) => setNewHolidayName(e.target.value)}
                placeholder="e.g. Diwali Glamour Holiday"
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <button
              type="submit"
              disabled={addingHoliday}
              className="w-full py-2 bg-brand-900 hover:bg-brand-950 text-white font-semibold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{addingHoliday ? 'Adding...' : 'Add Holiday to Salon Calendar'}</span>
            </button>
          </form>

          {/* Holidays List */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Configured Salon Holidays ({holidays.length}):
            </label>

            {holidays.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">No holidays configured.</p>
            ) : (
              <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                {holidays.map((hol) => (
                  <div
                    key={hol.id}
                    className="p-2.5 rounded-xl border border-slate-200/80 bg-white flex items-center justify-between text-xs"
                  >
                    <div>
                      <p className="font-bold text-slate-800">{hol.name}</p>
                      <p className="text-[11px] text-slate-500 font-mono">{hol.holiday_date}</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteHoliday(hol.id, hol.name)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="Delete Holiday"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
