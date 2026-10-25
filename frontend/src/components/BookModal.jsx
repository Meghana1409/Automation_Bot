import React, { useState } from 'react';
import { X, Calendar, Clock, User, Phone, CheckCircle, AlertCircle } from 'lucide-react';
import api from '../services/api';

const DOCTORS = [
  {
    name: 'Dr. Amit Sharma',
    specialty: 'Orthopedic Surgeon',
    slots: ['10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM', '12:00 PM', '12:30 PM', '01:00 PM', '01:30 PM'],
  },
  {
    name: 'Dr. Neha Verma',
    specialty: 'General Physician',
    slots: ['05:00 PM', '05:30 PM', '06:00 PM', '06:30 PM', '07:00 PM', '07:30 PM', '08:00 PM', '08:30 PM'],
  },
];

export default function BookModal({ isOpen, initialDoctor, onClose, onSuccess }) {
  const [patientName, setPatientName] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [doctorName, setDoctorName] = useState(initialDoctor || DOCTORS[0].name);
  const [appointmentDate, setAppointmentDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [appointmentTime, setAppointmentTime] = useState(DOCTORS[0].slots[0]);
  const [checking, setChecking] = useState(false);
  const [slotStatus, setSlotStatus] = useState(null); // { available: bool, message: str }
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  React.useEffect(() => {
    if (initialDoctor) {
      setDoctorName(initialDoctor);
      const selected = DOCTORS.find((d) => d.name === initialDoctor);
      if (selected && selected.slots.length > 0) {
        setAppointmentTime(selected.slots[0]);
      }
    }
  }, [initialDoctor]);

  if (!isOpen) return null;

  const currentDoctor = DOCTORS.find((d) => d.name === doctorName) || DOCTORS[0];

  const handleDoctorChange = (e) => {
    const doc = e.target.value;
    setDoctorName(doc);
    const selected = DOCTORS.find((d) => d.name === doc);
    if (selected && selected.slots.length > 0) {
      setAppointmentTime(selected.slots[0]);
    }
    setSlotStatus(null);
  };

  const handleCheckSlot = async () => {
    if (!appointmentDate || !appointmentTime) return;
    setChecking(true);
    setSlotStatus(null);
    setErrorMsg('');
    try {
      const res = await api.checkSlot(doctorName, appointmentDate, appointmentTime);
      setSlotStatus(res);
    } catch (err) {
      setErrorMsg('Failed to verify slot availability.');
    } finally {
      setChecking(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!patientName.trim()) {
      setErrorMsg('Patient name is required');
      return;
    }
    setSubmitting(true);
    setErrorMsg('');
    try {
      await api.createAppointment({
        patient_name: patientName.trim(),
        patient_phone: patientPhone.trim(),
        doctor_name: doctorName,
        appointment_date: appointmentDate,
        appointment_time: appointmentTime,
        status: 'confirmed',
      });
      onSuccess();
      onClose();
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to book appointment. The slot may already be taken.';
      setErrorMsg(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div>
            <h3 className="text-base font-bold text-slate-900">New Clinic Appointment</h3>
            <p className="text-xs text-slate-500">Manual booking with instant slot check</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Patient Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Patient Name *
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                required
                placeholder="e.g. Ramesh Patil"
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white"
              />
            </div>
          </div>

          {/* Patient Phone */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              WhatsApp Phone Number (Optional)
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="e.g. 919876543210"
                value={patientPhone}
                onChange={(e) => setPatientPhone(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white"
              />
            </div>
          </div>

          {/* Doctor Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Doctor & Specialty *
            </label>
            <select
              value={doctorName}
              onChange={handleDoctorChange}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white"
            >
              {DOCTORS.map((doc) => (
                <option key={doc.name} value={doc.name}>
                  {doc.name} - {doc.specialty}
                </option>
              ))}
            </select>
          </div>

          {/* Date & Time Slot */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Date *
              </label>
              <div className="relative">
                <input
                  type="date"
                  required
                  value={appointmentDate}
                  onChange={(e) => {
                    setAppointmentDate(e.target.value);
                    setSlotStatus(null);
                  }}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Time Slot *
              </label>
              <select
                value={appointmentTime}
                onChange={(e) => {
                  setAppointmentTime(e.target.value);
                  setSlotStatus(null);
                }}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white"
              >
                {currentDoctor.slots.map((slot) => (
                  <option key={slot} value={slot}>
                    {slot}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Slot Check Indicator / Button */}
          <div className="pt-1">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={handleCheckSlot}
                disabled={checking}
                className="text-xs text-sky-600 hover:text-sky-800 font-semibold flex items-center gap-1"
              >
                {checking ? 'Checking availability...' : 'Verify slot in database'}
              </button>

              {slotStatus && (
                <span
                  className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
                    slotStatus.available
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                  }`}
                >
                  {slotStatus.available ? (
                    <>
                      <CheckCircle className="w-3.5 h-3.5" />
                      Available
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-3.5 h-3.5" />
                      Already Booked
                    </>
                  )}
                </span>
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-lg transition-colors shadow-sm disabled:opacity-50"
            >
              {submitting ? 'Confirming...' : 'Book Appointment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
