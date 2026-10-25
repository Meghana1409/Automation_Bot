import React, { useState } from 'react';
import { Search, Calendar, User, Clock, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';

export default function AppointmentTable({ appointments, onDelete, loading }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [selectedDate, setSelectedDate] = useState('');

  const filtered = appointments.filter((app) => {
    const matchesSearch =
      app.patient_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (app.patient_phone && app.patient_phone.includes(searchTerm));
    const matchesDoctor = selectedDoctor ? app.doctor_name.includes(selectedDoctor) : true;
    const matchesDate = selectedDate ? app.appointment_date === selectedDate : true;
    return matchesSearch && matchesDoctor && matchesDate;
  });

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header and Filters */}
      <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">Appointments Schedule</h2>
          <p className="text-xs text-slate-500">
            Real-time appointments synced with WhatsApp Bot and Clinic Database
          </p>
        </div>

        {/* Filter inputs */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search */}
          <div className="relative min-w-[180px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search patient..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white"
            />
          </div>

          {/* Doctor filter */}
          <select
            value={selectedDoctor}
            onChange={(e) => setSelectedDoctor(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <option value="">All Doctors</option>
            <option value="Amit Sharma">Dr. Amit Sharma (Ortho)</option>
            <option value="Neha Verma">Dr. Neha Verma (General)</option>
          </select>

          {/* Date filter */}
          <div className="relative">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          {(searchTerm || selectedDoctor || selectedDate) && (
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedDoctor('');
                setSelectedDate('');
              }}
              className="text-xs text-sky-600 hover:text-sky-800 font-medium px-2 py-1"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-50/75 border-b border-slate-200 text-xs font-semibold uppercase text-slate-500">
            <tr>
              <th className="px-5 py-3.5">ID</th>
              <th className="px-5 py-3.5">Patient Details</th>
              <th className="px-5 py-3.5">Assigned Doctor</th>
              <th className="px-5 py-3.5">Date & Slot</th>
              <th className="px-5 py-3.5">Status</th>
              <th className="px-5 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan="6" className="py-12 text-center text-slate-400">
                  <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-sky-500 border-t-transparent mb-2"></div>
                  <p className="text-xs">Loading appointments from database...</p>
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan="6" className="py-12 text-center">
                  <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400 mb-2">
                    <Calendar className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-medium text-slate-700">No appointments found</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {searchTerm || selectedDoctor || selectedDate
                      ? 'Try clearing your filters.'
                      : 'Appointments booked via WhatsApp bot or web will appear here.'}
                  </p>
                </td>
              </tr>
            ) : (
              filtered.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-5 py-4 font-mono text-xs text-slate-400">
                    #{item.id}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center space-x-2.5">
                      <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-semibold text-xs border border-slate-200">
                        {item.patient_name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900 text-xs sm:text-sm">
                          {item.patient_name}
                        </p>
                        {item.patient_phone && (
                          <p className="text-xs text-slate-400">{item.patient_phone}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-800">
                      <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                      {item.doctor_name}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="text-xs space-y-0.5">
                      <div className="flex items-center gap-1.5 font-medium text-slate-800">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {item.appointment_date}
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-500">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {item.appointment_time}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${
                        item.status === 'confirmed'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}
                    >
                      <CheckCircle2 className="w-3 h-3" />
                      {item.status || 'confirmed'}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <button
                      onClick={() => onDelete(item.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Cancel/Delete Appointment"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      
      {/* Footer count */}
      <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 text-xs text-slate-500 flex justify-between items-center">
        <span>Showing {filtered.length} of {appointments.length} appointments</span>
        <span className="font-mono text-[11px] text-slate-400">PostgreSQL / SQLite Compatible</span>
      </div>
    </div>
  );
}
