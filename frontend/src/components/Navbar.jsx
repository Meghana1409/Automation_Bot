import React from 'react';
import { Activity, Plus, RefreshCw, Database } from 'lucide-react';

export default function Navbar({ health, onRefresh, onOpenBookModal, loading }) {
  const isHealthy = health?.database_connected;
  const dbType = health?.database_type?.toUpperCase() || 'DB';

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Clinic Brand */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-sky-100">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                Care & Cure Clinic
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200">
                  Monorepo
                </span>
              </h1>
              <p className="text-xs text-slate-500">
                Receptionist Bot & Patient Scheduling
              </p>
            </div>
          </div>

          {/* Doctors hours & Status */}
          <div className="hidden md:flex items-center space-x-3 text-xs">
            <div className="px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-600">
              <span className="font-semibold text-slate-800">Dr. Amit Sharma</span> (Ortho): 10 AM - 2 PM
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-600">
              <span className="font-semibold text-slate-800">Dr. Neha Verma</span> (General): 5 PM - 9 PM
            </div>
          </div>

          {/* Actions & DB indicator */}
          <div className="flex items-center space-x-3">
            {/* Database indicator */}
            <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-medium border bg-slate-50 border-slate-200 text-slate-700">
              <span
                className={`w-2 h-2 rounded-full ${
                  isHealthy ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
                }`}
              />
              <Database className="w-3.5 h-3.5 text-slate-500 ml-0.5" />
              <span>{isHealthy ? `${dbType} Active` : 'DB Disconnected'}</span>
            </div>

            {/* Refresh button */}
            <button
              onClick={onRefresh}
              disabled={loading}
              className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
              title="Refresh Appointments"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            {/* Book Appointment CTA */}
            <button
              onClick={onOpenBookModal}
              className="inline-flex items-center space-x-2 bg-sky-600 hover:bg-sky-700 text-white text-xs sm:text-sm font-medium px-3.5 py-2 rounded-lg transition-all shadow-sm shadow-sky-200"
            >
              <Plus className="w-4 h-4" />
              <span>New Appointment</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
