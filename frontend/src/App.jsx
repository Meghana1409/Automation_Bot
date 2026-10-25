import React, { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import AdminLogin from './components/AdminLogin';
import AdminLayout from './components/AdminLayout';

// The 7 Dedicated Admin Feature Views
import AdminOverview from './components/admin/AdminOverview';
import AppointmentCalendar from './components/admin/AppointmentCalendar';
import ServiceManagement from './components/admin/ServiceManagement';
import DiscountEngine from './components/admin/DiscountEngine';
import ScheduleManagement from './components/admin/ScheduleManagement';
import CapacityManagement from './components/admin/CapacityManagement';
import StaffManagement from './components/admin/StaffManagement';

import api from './services/api';

function AdminDashboardApp() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');

  // Salon State
  const [appointments, setAppointments] = useState([]);
  const [services, setServices] = useState([]);
  const [staff, setStaff] = useState([]);
  const [capacity, setCapacity] = useState(null);
  const [stats, setStats] = useState(null);
  const [health, setHealth] = useState(null);
  const [discounts, setDiscounts] = useState([]);
  const [workingHours, setWorkingHours] = useState([]);
  const [dataLoading, setDataLoading] = useState(false);

  const fetchAllData = useCallback(async () => {
    if (!isAuthenticated) return;
    setDataLoading(true);
    try {
      const [
        statsRes,
        appsRes,
        servicesRes,
        staffRes,
        capacityRes,
        healthRes,
        discountsRes,
        workingHoursRes,
      ] = await Promise.allSettled([
        api.appointments.getStats(),
        api.appointments.getAll({ limit: 500 }),
        api.services.getAll(),
        api.staff.getAll(),
        api.capacity.getCapacity(),
        api.health.getHealth(),
        api.discounts.getAll(),
        api.schedule.getWorkingHours(),
      ]);

      if (statsRes.status === 'fulfilled') setStats(statsRes.value);
      if (appsRes.status === 'fulfilled') setAppointments(appsRes.value);
      if (servicesRes.status === 'fulfilled') setServices(servicesRes.value);
      if (staffRes.status === 'fulfilled') setStaff(staffRes.value);
      if (capacityRes.status === 'fulfilled') setCapacity(capacityRes.value);
      if (healthRes.status === 'fulfilled') setHealth(healthRes.value);
      if (discountsRes.status === 'fulfilled') setDiscounts(discountsRes.value);
      if (workingHoursRes.status === 'fulfilled') setWorkingHours(workingHoursRes.value);
    } catch (err) {
      console.error('Error fetching salon dashboard data:', err);
    } finally {
      setDataLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchAllData();
    }
  }, [isAuthenticated, fetchAllData]);

  const handleApproveAppointment = async (id) => {
    try {
      await api.appointments.approve(id);
      fetchAllData();
    } catch (err) {
      alert(err.friendlyMessage || 'Failed to approve appointment.');
    }
  };

  const handleCancelAppointment = async (app) => {
    const clientName = app.client_name || app.patient_name || 'Client';
    const reason = window.prompt(`Enter reason for cancelling appointment #${app.id} (${clientName}):`);
    if (!reason) return;
    try {
      await api.appointments.cancel(app.id, reason);
      fetchAllData();
    } catch (err) {
      alert(err.friendlyMessage || 'Failed to cancel appointment.');
    }
  };

  // If auth is verifying stored token
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-3">
          <span className="w-8 h-8 border-3 border-brand-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-slate-300">Verifying secure salon admin session...</p>
        </div>
      </div>
    );
  }

  // Strictly no customer-facing UI: if not logged in, render Admin Login screen
  if (!isAuthenticated) {
    return <AdminLogin />;
  }

  return (
    <AdminLayout
      activeTab={activeTab}
      onTabChange={setActiveTab}
      health={health}
      loading={dataLoading}
      onRefresh={fetchAllData}
    >
      {/* 1. Overview Tab */}
      {activeTab === 'overview' && (
        <AdminOverview
          stats={stats}
          appointments={appointments}
          services={services}
          staff={staff}
          capacity={capacity}
          workingHours={workingHours}
          onRefresh={fetchAllData}
          onNavigateTab={setActiveTab}
        />
      )}

      {/* 2. Appointment Calendar Tab */}
      {activeTab === 'calendar' && (
        <AppointmentCalendar
          appointments={appointments}
          staff={staff}
          services={services}
          capacity={capacity}
          workingHours={workingHours}
          onRefresh={fetchAllData}
        />
      )}

      {/* 3. Service & Price Management Tab */}
      {activeTab === 'services' && (
        <ServiceManagement services={services} onRefresh={fetchAllData} />
      )}

      {/* 4. Discount Engine Tab */}
      {activeTab === 'discounts' && (
        <DiscountEngine
          discounts={discounts}
          services={services}
          onRefresh={fetchAllData}
        />
      )}

      {/* 5. Working Hours & Schedule Tab */}
      {activeTab === 'schedule' && (
        <ScheduleManagement onRefresh={fetchAllData} />
      )}

      {/* 6. Booking Capacity Limit Tab */}
      {activeTab === 'capacity' && (
        <CapacityManagement onRefresh={fetchAllData} />
      )}

      {/* 7. Staff Management & Service Mapping Tab */}
      {activeTab === 'staff' && (
        <StaffManagement
          staff={staff}
          services={services}
          onRefresh={fetchAllData}
        />
      )}
    </AdminLayout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AdminDashboardApp />
    </AuthProvider>
  );
}
