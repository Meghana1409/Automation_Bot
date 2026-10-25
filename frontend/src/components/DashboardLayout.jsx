import React, { useState } from 'react';
import {
  LayoutDashboard,
  Calendar,
  Clock,
  MessageSquare,
  Stethoscope,
  Database,
  Menu,
  X,
  RefreshCw,
  Plus,
  ShieldCheck,
  AlertTriangle,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

export default function DashboardLayout({
  activeTab,
  onTabChange,
  health,
  loading,
  onRefresh,
  onOpenBookModal,
  children,
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isHealthy = health?.database_connected;
  const dbType = health?.database_type?.toUpperCase() || 'SQLITE';

  const navItems = [
    { id: 'overview', label: 'Dashboard Overview', icon: LayoutDashboard },
    { id: 'appointments', label: 'Appointments Schedule', icon: Calendar },
    { id: 'slots', label: 'Live Slot Checker', icon: Clock },
    { id: 'bot', label: 'WhatsApp Bot Simulator', icon: MessageSquare },
    { id: 'doctors', label: 'Doctor Directory', icon: Stethoscope },
    { id: 'system', label: 'Database & API Health', icon: Database },
  ];

  const handleNavClick = (id) => {
    onTabChange(id);
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-100/80 flex flex-col md:flex-row font-sans text-slate-800 antialiased">
      {/* Mobile Backdrop */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-40 md:hidden"
        />
      )}

      {/* Sidebar Navigation */}
      <aside
        className={`fixed md:sticky top-0 left-0 h-screen w-64 bg-slate-900 text-white z-50 flex flex-col justify-between transition-transform duration-300 ease-in-out md:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        {/* Sidebar Header */}
        <div>
          <div className="h-16 px-5 flex items-center justify-between border-b border-slate-800 bg-slate-950/40">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-500 to-teal-400 flex items-center justify-center text-white shadow-md shadow-sky-500/20">
                <Stethoscope className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold tracking-tight text-white flex items-center gap-1.5">
                  Care & Cure
                  <span className="text-[10px] bg-sky-500/20 text-sky-300 px-1.5 py-0.2 rounded border border-sky-500/30 font-medium">
                    v1.0
                  </span>
                </h2>
                <p className="text-[11px] text-slate-400">Clinic Portal</p>
              </div>
            </div>
            {/* Mobile close button */}
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="md:hidden text-slate-400 hover:text-white p-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Nav Items */}
          <nav className="p-3 space-y-1 mt-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-sky-600 text-white shadow-sm shadow-sky-600/30 font-semibold'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>
                  {isActive && <ChevronRight className="w-3.5 h-3.5 text-white/70" />}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer: Database Status */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/40">
          <div className="rounded-xl bg-slate-800/80 p-3 border border-slate-700/60">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-semibold uppercase text-slate-400 tracking-wider">
                Database Engine
              </span>
              <span
                className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  isHealthy
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isHealthy ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
                  }`}
                />
                {isHealthy ? 'ONLINE' : 'DEGRADED'}
              </span>
            </div>
            <p className="text-xs font-semibold text-slate-200 flex items-center gap-1">
              <Database className="w-3.5 h-3.5 text-sky-400" />
              <span>{dbType}</span>
            </p>
            <p className="text-[10px] text-slate-400 mt-1 truncate">
              {health?.database_url_masked || 'sqlite:///./clinic.db'}
            </p>
          </div>
        </div>
      </aside>

      {/* Main Content Viewport */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Header Bar */}
        <header className="h-16 bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs px-4 sm:px-6 flex items-center justify-between">
          {/* Left section: Hamburger & Breadcrumbs */}
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center space-x-2 text-xs">
              <span className="text-slate-400 hidden sm:inline">Clinic Portal</span>
              <span className="text-slate-300 hidden sm:inline">/</span>
              <span className="font-semibold text-slate-900 capitalize">
                {navItems.find((n) => n.id === activeTab)?.label || 'Dashboard'}
              </span>
            </div>
          </div>

          {/* Right section: Doctor duty pills & Actions */}
          <div className="flex items-center space-x-2.5 sm:space-x-3">
            {/* Doctor shift badges */}
            <div className="hidden lg:flex items-center space-x-2 text-[11px]">
              <div className="px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-700">
                <span className="font-bold">Dr. Amit Sharma</span> (10 AM - 2 PM)
              </div>
              <div className="px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-100 text-amber-700">
                <span className="font-bold">Dr. Neha Verma</span> (5 PM - 9 PM)
              </div>
            </div>

            {/* Refresh Data button */}
            <button
              onClick={onRefresh}
              disabled={loading}
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
              title="Refresh Data from API"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-sky-600' : ''}`} />
            </button>

            {/* New Appointment button */}
            <button
              onClick={onOpenBookModal}
              className="inline-flex items-center space-x-1.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold px-3.5 py-2 rounded-lg transition-all shadow-sm shadow-sky-500/20"
            >
              <Plus className="w-4 h-4" />
              <span>Book Appointment</span>
            </button>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
          {children}
        </main>
      </div>
    </div>
  );
}
