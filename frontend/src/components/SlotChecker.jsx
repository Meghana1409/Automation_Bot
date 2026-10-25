import React, { useState } from 'react';
import { Search, CheckCircle, AlertCircle, Clock, Calendar } from 'lucide-react';
import api from '../services/api';

export default function SlotChecker() {
  const [doctor, setDoctor] = useState('Dr. Amit Sharma');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState('11:00 AM');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleCheck = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const data = await api.checkSlot(doctor, date, time);
      setResult(data);
    } catch (err) {
      setResult({
        available: false,
        status: 'Error',
        message: 'Could not query slot availability.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
      <div className="flex items-center space-x-2 mb-3">
        <Clock className="w-4 h-4 text-sky-600" />
        <h3 className="text-sm font-bold text-slate-900">Live Slot Checker</h3>
      </div>
      <p className="text-xs text-slate-500 mb-4">
        Quickly test whether a slot is free before scheduling.
      </p>

      <form onSubmit={handleCheck} className="space-y-3">
        <div>
          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
            Doctor
          </label>
          <select
            value={doctor}
            onChange={(e) => {
              setDoctor(e.target.value);
              setResult(null);
            }}
            className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-sky-500"
          >
            <option value="Dr. Amit Sharma">Dr. Amit Sharma (Ortho: 10AM-2PM)</option>
            <option value="Dr. Neha Verma">Dr. Neha Verma (General: 5PM-9PM)</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                setResult(null);
              }}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-sky-500"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Time
            </label>
            <input
              type="text"
              placeholder="e.g. 10:30 AM"
              value={time}
              onChange={(e) => {
                setTime(e.target.value);
                setResult(null);
              }}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-sky-500"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 shadow-sm"
        >
          <Search className="w-3.5 h-3.5" />
          {loading ? 'Checking Database...' : 'Check Availability'}
        </button>
      </form>

      {result && (
        <div
          className={`mt-4 p-3 rounded-lg border text-xs flex items-start gap-2 ${
            result.available
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {result.available ? (
            <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
          )}
          <div>
            <p className="font-semibold">{result.status}</p>
            <p className="text-[11px] mt-0.5 opacity-90">{result.message}</p>
          </div>
        </div>
      )}
    </div>
  );
}
