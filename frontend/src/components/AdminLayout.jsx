import React, { useState } from 'react';
import {
  LayoutDashboard,
  Calendar,
  Layers,
  Percent,
  Clock,
  Gauge,
  Users,
  LogOut,
  RefreshCw,
  Menu,
  X,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  UserCheck,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function AdminLayout({
  activeTab,
  onTabChange,
  health,
  loading,
  onRefresh,
  children,
}) {
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshSuccess, setRefreshSuccess] = useState(false);

  const handleHeaderRefresh = async () => {
    if (loading || isRefreshing) return;
    setIsRefreshing(true);
    try {
      if (onRefresh) {
        await onRefresh();
      }
      setRefreshSuccess(true);
      setTimeout(() => setRefreshSuccess(false), 2500);
    } catch (err) {
      console.error('Failed to reload dashboard data:', err);
    } finally {
      setTimeout(() => {
        setIsRefreshing(false);
      }, 600);
    }
  };

  const navItems = [
    { id: 'overview', label: 'Dashboard Overview', icon: LayoutDashboard },
    { id: 'calendar', label: 'Salon Booking Calendar', icon: Calendar },
    { id: 'services', label: 'Salon Services & Pricing', icon: Layers },
    { id: 'discounts', label: 'Offers & Beauty Packages', icon: Percent },
    { id: 'schedule', label: 'Working Hours & Schedule', icon: Clock },
    { id: 'capacity', label: 'Salon Chair Limits', icon: Gauge },
    { id: 'staff', label: 'Stylists & Beauticians', icon: Users },
  ];

  const handleNavClick = (id) => {
    onTabChange(id);
    setMobileMenuOpen(false);
  };

  const isDbHealthy = health?.database_connected;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col md:flex-row font-sans text-slate-800 antialiased">
      {/* Mobile Backdrop */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-40 md:hidden"
        />
      )}

      {/* Sidebar Navigation */}
      <aside
        className={`fixed md:sticky top-0 left-0 h-screen w-64 bg-[#071f11] text-white z-50 flex flex-col justify-between transition-transform duration-300 ease-in-out md:translate-x-0 border-r border-brand-900/50 ${
          mobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        <div>
          {/* Brand Header */}
          <div className="h-16 px-5 flex items-center justify-between border-b border-brand-900/60 bg-[#05170d]">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-emerald-500 flex items-center justify-center text-gold-300 shadow-md shadow-brand-900/40">
                <Sparkles className="w-5 h-5 text-gold-400" />
              </div>
              <div>
                <h2 className="text-sm font-bold tracking-tight text-white flex items-center gap-1.5">
                  Luxe Salon & Spa
                  <span className="text-[10px] bg-gold-500/20 text-gold-300 px-1.5 py-0.2 rounded border border-gold-500/30 font-medium">
                    Admin
                  </span>
                </h2>
                <p className="text-[11px] text-emerald-300/70 font-medium">Salon Management</p>
              </div>
            </div>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="md:hidden text-slate-400 hover:text-white p-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Nav Links */}
          <nav className="p-3 space-y-1 mt-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                    isActive
                      ? 'bg-brand-600 text-white shadow-sm shadow-brand-700/40 font-semibold border-l-3 border-gold-400'
                      : 'text-slate-300 hover:text-white hover:bg-brand-900/40'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-gold-300' : 'text-emerald-400/60'}`} />
                    <span>{item.label}</span>
                  </div>
                  {isActive && <ChevronRight className="w-3.5 h-3.5 text-gold-300/90" />}
                </button>
              );
            })}
          </nav>
        </div>

        {/* User Card & Logout */}
        <div className="p-4 border-t border-brand-900/60 bg-[#05170d] space-y-3">
          <div className="flex items-center justify-between p-2 rounded-xl bg-brand-900/40 border border-brand-800/40">
            <div className="flex items-center space-x-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-lg bg-brand-500/20 text-gold-400 border border-gold-500/30 flex items-center justify-center shrink-0">
                <UserCheck className="w-4 h-4 text-gold-400" />
              </div>
              <div className="truncate">
                <p className="text-xs font-semibold text-slate-200 truncate">
                  {user?.full_name || 'Salon Admin'}
                </p>
                <p className="text-[10px] text-emerald-300/70 truncate">{user?.email || 'admin@salon.com'}</p>
              </div>
            </div>
            <button
              onClick={logout}
              title="Sign Out"
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center justify-between px-1 text-[11px] text-slate-400">
            <span className="flex items-center gap-1.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  isDbHealthy ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
                }`}
              />
              Database {isDbHealthy ? 'Online' : 'Degraded'}
            </span>
            <span className="font-mono text-[10px] text-slate-500 uppercase">
              {health?.database_type || 'SQLite'}
            </span>
          </div>
        </div>
      </aside>

      {/* Main Viewport */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Header Bar */}
        <header className="h-16 bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs px-4 sm:px-6 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center space-x-2 text-xs">
              <span className="text-slate-400 hidden sm:inline">Salon Portal</span>
              <span className="text-slate-300 hidden sm:inline">/</span>
              <span className="font-semibold text-slate-900">
                {navItems.find((n) => n.id === activeTab)?.label || 'Dashboard'}
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="relative">
              <button
                onClick={handleHeaderRefresh}
                disabled={loading || isRefreshing}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer shadow-2xs select-none ${
                  loading || isRefreshing
                    ? 'bg-brand-50 border-brand-200 text-brand-700'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300 active:scale-95'
                }`}
                title="Refetch and reload all salon stats and appointment data"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${
                    loading || isRefreshing ? 'animate-spin text-brand-600' : 'text-slate-500'
                  }`}
                />
                <span className="hidden sm:inline">
                  {loading || isRefreshing ? 'Reloading...' : 'Refresh'}
                </span>
              </button>

              {refreshSuccess && (
                <div className="absolute right-0 top-11 bg-slate-900 text-white text-[11px] font-medium px-2.5 py-1 rounded-md shadow-lg flex items-center gap-1.5 z-50 whitespace-nowrap animate-fade-in pointer-events-none">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Data reloaded</span>
                </div>
              )}
            </div>
            <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-slate-200 text-xs">
              <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 font-medium">
                {new Date().toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
            </div>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
          {children}
        </main>
      </div>
    </div>
  );
}
