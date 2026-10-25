import React, { useState, useMemo, useEffect } from 'react';
import {
  Calendar,
  Clock,
  CheckCircle,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Layers,
  Users,
  Gauge,
  ArrowRight,
  XCircle,
  Stethoscope,
  Phone,
  Mail,
  UserCheck,
  ShieldCheck,
  ChevronRight,
  Sparkles,
  RefreshCw,
  X,
} from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  STANDARD_SLOTS,
  parseSlotMinutes,
  getDaySchedule,
  generateSlotsForDate,
} from '../../utils/scheduleUtils';

export default function AdminOverview({
  stats,
  appointments = [],
  services = [],
  staff = [],
  capacity,
  workingHours = [],
  onApproveAppointment,
  onCancelAppointment,
  onRefresh,
  onNavigateTab,
}) {
  const { user } = useAuth();
  const todayAppointments = stats?.today_appointments || 0;
  const approvedAppointments = stats?.approved_appointments || 0;
  const maxCapacityPerHour = capacity?.max_bookings_per_hour || 4;

  const [localWorkingHours, setLocalWorkingHours] = useState(workingHours);

  useEffect(() => {
    if (workingHours && workingHours.length > 0) {
      setLocalWorkingHours(workingHours);
    } else {
      api.schedule
        .getWorkingHours()
        .then((data) => {
          if (Array.isArray(data) && data.length > 0) {
            setLocalWorkingHours(data);
          }
        })
        .catch(() => {});
    }
  }, [workingHours]);

  // Modals state for AdminOverview
  const [rescheduleModalApp, setRescheduleModalApp] = useState(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('10:00 AM');
  const [rescheduleReason, setRescheduleReason] = useState('');

  const [cancelModalApp, setCancelModalApp] = useState(null);
  const [cancelReason, setCancelReason] = useState('');

  const [doneModalApp, setDoneModalApp] = useState(null);
  const [completedBy, setCompletedBy] = useState('');
  const [completionNotes, setCompletionNotes] = useState('');

  const [actionLoading, setActionLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [modalError, setModalError] = useState('');
  const [actionSuccessMsg, setActionSuccessMsg] = useState('');

  // Auto-hide feedback notifications
  const triggerSuccessMsg = (msg) => {
    setActionSuccessMsg(msg);
    setTimeout(() => {
      setActionSuccessMsg('');
    }, 4000);
  };

  // Filter pending appointments
  const pendingAppointments = useMemo(() => {
    return appointments.filter((a) => a.status === 'pending');
  }, [appointments]);

  // Helper to parse date + time for accurate chronological sorting
  const parseAppDateTime = (dateStr, timeStr) => {
    if (!dateStr) return 0;
    try {
      let hours = 0;
      let minutes = 0;
      if (timeStr) {
        const t = timeStr.trim().toUpperCase();
        const isPM = t.includes('PM');
        const isAM = t.includes('AM');
        const cleaned = t.replace(/(AM|PM)/g, '').trim();
        const parts = cleaned.split(':');
        hours = parseInt(parts[0], 10) || 0;
        minutes = parseInt(parts[1], 10) || 0;
        if (isPM && hours < 12) hours += 12;
        if (isAM && hours === 12) hours = 0;
      }
      const [y, m, d] = dateStr.split('-').map(Number);
      return new Date(y, m - 1, d, hours, minutes).getTime();
    } catch {
      return 0;
    }
  };

  // Helper to resolve service details for an appointment
  const getServiceForApp = (app) => {
    if (app.service_id) {
      const s = services.find((srv) => srv.id === app.service_id);
      if (s) return s;
    }
    // Fallback based on stylist or treatment
    const stylistOrNotes = ((app.stylist_name || app.doctor_name || '') + ' ' + (app.notes || '')).toLowerCase();
    if (stylistOrNotes.includes('anya') || stylistOrNotes.includes('hair')) {
      return (
        services.find((s) => s.category?.toLowerCase().includes('hair')) || {
          name: 'Hair colouring',
          category: 'Hair Styling & Color',
          price: 2800,
        }
      );
    }
    if (stylistOrNotes.includes('priya') || stylistOrNotes.includes('nail')) {
      return (
        services.find((s) => s.category?.toLowerCase().includes('nail')) || {
          name: 'Gel manicures',
          category: 'Nails & Manicures',
          price: 1500,
        }
      );
    }
    if (stylistOrNotes.includes('meera') || stylistOrNotes.includes('facial')) {
      return (
        services.find((s) => s.category?.toLowerCase().includes('facial')) || {
          name: 'Basic to advance facials',
          category: 'Facials & Skincare',
          price: 2500,
        }
      );
    }
    return { name: 'Exfoliation', category: 'Spa & Massages', price: 1200 };
  };

  // Helper to resolve stylist/staff details
  const getStaffForApp = (app) => {
    if (app.staff_id) {
      const st = staff.find((s) => s.id === app.staff_id);
      if (st) return st;
    }
    const stylistName = app.stylist_name || app.doctor_name;
    if (stylistName) {
      const st = staff.find(
        (s) => s.name.toLowerCase() === stylistName.toLowerCase()
      );
      if (st) return st;
    }
    return { name: stylistName || 'Assigned Stylist', title: 'Stylist / Beautician' };
  };

  // Date label formatting helper (Today, Tomorrow, or Mon, Oct 26)
  const formatAppDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      if (dateStr === todayStr) return 'Today';
      if (dateStr === tomorrowStr) return 'Tomorrow';

      const [y, m, d] = dateStr.split('-').map(Number);
      const dt = new Date(y, m - 1, d);
      return dt.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  // Filter & sort confirmed/approved/rescheduled appointments by nearest upcoming time
  const upcomingAppointments = useMemo(() => {
    return appointments
      .filter((a) =>
        ['approved', 'confirmed', 'rescheduled'].includes(
          (a.status || '').toLowerCase()
        )
      )
      .sort((a, b) => {
        return (
          parseAppDateTime(a.appointment_date, a.appointment_time) -
          parseAppDateTime(b.appointment_date, b.appointment_time)
        );
      });
  }, [appointments]);

  // Operational Handlers
  const handleApprove = async (appId) => {
    if (onApproveAppointment) {
      await onApproveAppointment(appId);
      return;
    }
    setActionLoadingId(appId);
    try {
      await api.appointments.approve(appId);
      triggerSuccessMsg(`Appointment #${appId} confirmed & approved.`);
      if (onRefresh) onRefresh();
    } catch (err) {
      alert(err.friendlyMessage || 'Failed to approve appointment.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleOpenDoneModal = (app) => {
    setDoneModalApp(app);
    setCompletionNotes('');
    setModalError('');

    // Automatically pre-select currently logged-in user or matching registered staff member
    let defaultStaff = user?.full_name || '';
    if (user?.full_name) {
      const matched = staff.find(
        (s) =>
          s.name.toLowerCase() === user.full_name.toLowerCase() ||
          (user.email && s.email && s.email.toLowerCase() === user.email.toLowerCase())
      );
      if (matched) {
        defaultStaff = matched.name;
      }
    } else if (staff.length > 0) {
      defaultStaff = app.stylist_name || app.doctor_name || staff[0].name;
    }
    setCompletedBy(defaultStaff);
  };

  const handleConfirmDone = async () => {
    if (!completedBy) {
      setModalError('Please select the stylist/beautician who completed this service.');
      return;
    }
    setActionLoading(true);
    setModalError('');
    try {
      // Send selected staff identifier along with the 'done' / completed status update to the backend
      await api.appointments.updateStatus(
        doneModalApp.id,
        'completed',
        completionNotes,
        completedBy
      );
      const clientName = doneModalApp.client_name || doneModalApp.patient_name;
      triggerSuccessMsg(
        `Appointment #${doneModalApp.id} for ${clientName} marked as Done by ${completedBy}.`
      );
      setDoneModalApp(null);
      if (onRefresh) onRefresh();
    } catch (err) {
      setModalError(err.friendlyMessage || 'Failed to complete appointment.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenCancelModal = (app) => {
    setCancelModalApp(app);
    setCancelReason('');
    setModalError('');
  };

  const handleConfirmCancel = async () => {
    if (!cancelReason.trim()) {
      setModalError('Please specify a cancellation reason.');
      return;
    }
    setActionLoading(true);
    setModalError('');
    try {
      await api.appointments.cancel(cancelModalApp.id, cancelReason);
      triggerSuccessMsg(`Appointment #${cancelModalApp.id} cancelled.`);
      setCancelModalApp(null);
      if (onRefresh) onRefresh();
    } catch (err) {
      setModalError(err.friendlyMessage || 'Failed to cancel appointment.');
    } finally {
      setActionLoading(false);
    }
  };

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  const rescheduleDaySchedule = useMemo(() => {
    return getDaySchedule(rescheduleDate, localWorkingHours);
  }, [rescheduleDate, localWorkingHours]);

  // Compute available slots for reschedule modal in overview
  const rescheduleSlots = useMemo(() => {
    if (!rescheduleDate || !rescheduleModalApp) return [];
    const isToday = rescheduleDate === todayStr;
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const dateApps = (appointments || []).filter(
      (app) =>
        app.id !== rescheduleModalApp.id &&
        app.appointment_date === rescheduleDate &&
        app.status !== 'cancelled'
    );

    const stylist = rescheduleModalApp.stylist_name || rescheduleModalApp.doctor_name || '';
    const maxPerHour = capacity?.max_bookings_per_hour || 6;
    const allowOverbooking = capacity?.allow_overbooking || false;

    // Generate candidate slots strictly respecting day-specific open, close, and break hours
    const candidateSlots = generateSlotsForDate(rescheduleDate, localWorkingHours);
    if (!candidateSlots || candidateSlots.length === 0) {
      return [];
    }

    return candidateSlots.map((slot) => {
      const slotMins = parseSlotMinutes(slot);
      if (rescheduleDate < todayStr) {
        return { slot, available: false, status: 'passed', label: 'Passed' };
      }
      if (isToday && slotMins !== null && slotMins <= currentMinutes) {
        return { slot, available: false, status: 'passed', label: 'Passed' };
      }
      const isBooked = dateApps.some((app) => {
        const appStylist = app.stylist_name || app.doctor_name || '';
        const matchStylist =
          !stylist ||
          stylist === 'ALL' ||
          appStylist.toLowerCase().includes(stylist.toLowerCase()) ||
          stylist.toLowerCase().includes(appStylist.toLowerCase());
        return matchStylist && app.appointment_time?.trim().toUpperCase() === slot.trim().toUpperCase();
      });
      if (isBooked) {
        return { slot, available: false, status: 'booked', label: 'Already Booked / Unavailable' };
      }
      const slotHour = slotMins !== null ? Math.floor(slotMins / 60) : null;
      if (slotHour !== null) {
        const hourlyCount = dateApps.filter((app) => {
          const appMins = parseSlotMinutes(app.appointment_time);
          return appMins !== null && Math.floor(appMins / 60) === slotHour;
        }).length;
        if (!allowOverbooking && hourlyCount >= maxPerHour) {
          return { slot, available: false, status: 'capacity_full', label: 'Salon Capacity Full' };
        }
      }
      return { slot, available: true, status: 'available', label: 'Available' };
    });
  }, [rescheduleDate, rescheduleModalApp, appointments, capacity, localWorkingHours, todayStr]);

  const selectableRescheduleSlots = useMemo(() => {
    const isToday = rescheduleDate === todayStr;
    return rescheduleSlots.filter((s) => {
      if (isToday && s.status === 'passed') return false;
      return true;
    });
  }, [rescheduleSlots, rescheduleDate, todayStr]);

  useEffect(() => {
    if (!rescheduleModalApp) return;
    const currentValid = selectableRescheduleSlots.find(
      (s) => s.slot === rescheduleTime && s.available
    );
    if (!currentValid) {
      const firstAvailable = selectableRescheduleSlots.find((s) => s.available);
      if (firstAvailable) {
        setRescheduleTime(firstAvailable.slot);
      }
    }
  }, [selectableRescheduleSlots, rescheduleModalApp]);

  const handleOpenRescheduleModal = (app) => {
    setRescheduleModalApp(app);
    const validDate = (app.appointment_date && app.appointment_date >= todayStr) ? app.appointment_date : todayStr;
    setRescheduleDate(validDate);
    setRescheduleTime(app.appointment_time || '10:00 AM');
    setRescheduleReason('');
    setModalError('');
  };

  const handleConfirmReschedule = async () => {
    if (!rescheduleDate || !rescheduleTime) {
      setModalError('Please select both a new date and time slot.');
      return;
    }
    if (rescheduleDate < todayStr) {
      setModalError('Cannot reschedule to a past date. Please pick today or a future date.');
      return;
    }
    const chosenSlot = rescheduleSlots.find((s) => s.slot === rescheduleTime);
    if (chosenSlot && !chosenSlot.available) {
      setModalError(`Selected slot '${rescheduleTime}' is not available (${chosenSlot.label}).`);
      return;
    }
    setActionLoading(true);
    setModalError('');
    try {
      await api.appointments.reschedule(
        rescheduleModalApp.id,
        rescheduleDate,
        rescheduleTime,
        rescheduleReason
      );
      triggerSuccessMsg(
        `Appointment #${rescheduleModalApp.id} rescheduled to ${rescheduleDate} at ${rescheduleTime}.`
      );
      setRescheduleModalApp(null);
      if (onRefresh) onRefresh();
    } catch (err) {
      setModalError(err.friendlyMessage || 'Failed to reschedule appointment.');
    } finally {
      setActionLoading(false);
    }
  };

  const scrollToScheduledAppointments = () => {
    const el = document.getElementById('scheduled-appointments-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const scrollToPendingQueue = () => {
    const el = document.getElementById('pending-approval-queue-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert for Instant Feedback */}
      {actionSuccessMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold px-4 py-3 rounded-2xl shadow-xs flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{actionSuccessMsg}</span>
          </div>
          <button
            onClick={() => setActionSuccessMsg('')}
            className="text-emerald-500 hover:text-emerald-700 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Overview Top Header & Live Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Salon Dashboard Overview</span>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-brand-700 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Feed
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time tracking of today's client bookings, stylist allocations, and station capacity limits.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          <button
            onClick={async () => {
              if (onRefresh) {
                await onRefresh();
                triggerSuccessMsg('Dashboard stats and appointments refreshed successfully.');
              }
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-brand-700 text-xs font-bold rounded-xl border border-slate-200 transition-all cursor-pointer shadow-2xs select-none active:scale-95"
            title="Refresh dashboard stats and appointments"
          >
            <RefreshCw className="w-3.5 h-3.5 text-brand-600" />
            <span>Refresh Overview</span>
          </button>
        </div>
      </div>

      {/* 1. KPI Stats Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Today's Salon Clients */}
        <div
          onClick={scrollToScheduledAppointments}
          title="Click to smooth-scroll to scheduled appointments section"
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between cursor-pointer hover:shadow-md hover:border-brand-400 transition-all group active:scale-[0.99] select-none"
        >
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <span>Today's Clients</span>
            </p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{todayAppointments}</h3>
            <div className="flex items-center gap-1.5 mt-1.5">
              <span className="text-[11px] text-brand-600 font-semibold">
                {approvedAppointments} Confirmed & Approved
              </span>
              <span className="text-[10px] text-brand-700 bg-brand-50 px-1.5 py-0.2 rounded font-medium group-hover:bg-brand-100 flex items-center gap-0.5">
                Scroll to visits ↓
              </span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center border border-brand-100 group-hover:bg-brand-600 group-hover:text-white transition-colors">
            <Sparkles className="w-6 h-6 text-gold-500 group-hover:text-gold-300 transition-colors" />
          </div>
        </div>

        {/* Card 2: Pending Clients */}
        <div
          onClick={scrollToPendingQueue}
          title="Click to smooth-scroll to pending approval queue"
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between cursor-pointer hover:shadow-md hover:border-gold-400 transition-all group active:scale-[0.99] select-none"
        >
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <span>Pending Clients</span>
            </p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">
              {pendingAppointments.length}
            </h3>
            <div className="flex items-center gap-1.5 mt-1.5">
              <span className="text-[11px] text-gold-600 font-semibold">
                {pendingAppointments.length > 0 ? `${pendingAppointments.length} Action Required` : 'Queue Clear'}
              </span>
              <span className="text-[10px] text-gold-800 bg-gold-50 px-1.5 py-0.2 rounded font-medium group-hover:bg-gold-100 flex items-center gap-0.5">
                Review queue ↓
              </span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-gold-50 text-gold-600 flex items-center justify-center border border-gold-200 group-hover:bg-gold-500 group-hover:text-white transition-colors">
            <AlertCircle className="w-6 h-6" />
          </div>
        </div>

        {/* Card 3: Services & Staff */}
        <div
          onClick={() => onNavigateTab && onNavigateTab('services')}
          title="Click to redirect to Services & Pricing management"
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between cursor-pointer hover:shadow-md hover:border-emerald-400 transition-all group active:scale-[0.99] select-none"
        >
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <span>Services & Staff</span>
            </p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{services.length} Services</h3>
            <div className="flex items-center gap-1.5 mt-1.5">
              <span className="text-[11px] text-brand-700 font-semibold">
                {staff.length} Active Stylists
              </span>
              <span className="text-[10px] text-brand-800 bg-emerald-50 px-1.5 py-0.2 rounded font-medium group-hover:bg-emerald-100 flex items-center gap-0.5">
                Manage services →
              </span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-brand-700 flex items-center justify-center border border-emerald-100 group-hover:bg-brand-700 group-hover:text-white transition-colors">
            <Layers className="w-6 h-6" />
          </div>
        </div>

        {/* Card 4: Hourly Salon Station Booking Capacity Limit */}
        <div
          onClick={() => onNavigateTab && onNavigateTab('capacity')}
          title="Click to redirect to Booking Capacity Limit settings"
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between cursor-pointer hover:shadow-md hover:border-teal-400 transition-all group active:scale-[0.99] select-none"
        >
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <span>Booking Capacity Limit</span>
            </p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">
              {maxCapacityPerHour} / Hour
            </h3>
            <div className="flex items-center gap-1.5 mt-1.5">
              <span className="text-[11px] text-teal-700 font-semibold">
                Station Booking Cap
              </span>
              <span className="text-[10px] text-teal-800 bg-teal-50 px-1.5 py-0.2 rounded font-medium group-hover:bg-teal-100 flex items-center gap-0.5">
                Manage limit →
              </span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center border border-teal-100 group-hover:bg-teal-700 group-hover:text-white transition-colors">
            <Gauge className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* 2. Enhanced Full-Width Approval Queue */}
      <div id="pending-approval-queue-section" className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4 w-full scroll-mt-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-gold-600" />
              <span>Client Booking Requests Awaiting Approval</span>
              {pendingAppointments.length > 0 && (
                <span className="px-2.5 py-0.5 rounded-full bg-gold-100 text-gold-900 text-xs font-bold border border-gold-200">
                  {pendingAppointments.length} Pending
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Review client details, requested salon service, and assigned stylist. Approve, reschedule, or cancel requests directly from this queue.
            </p>
          </div>
          <button
            onClick={() => onNavigateTab('calendar')}
            className="text-xs text-brand-600 hover:text-brand-700 font-semibold flex items-center gap-1 cursor-pointer self-start sm:self-auto shrink-0"
          >
            <span>Open Salon Calendar</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {pendingAppointments.length === 0 ? (
          <div className="text-center py-10 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
            <CheckCircle className="w-9 h-9 text-brand-600 mx-auto mb-2 opacity-90" />
            <p className="text-sm font-bold text-slate-800">All Client Booking Requests Reviewed</p>
            <p className="text-xs text-slate-400 mt-0.5">
              There are no pending booking requests awaiting review. Salon schedules and styling stations are fully synchronized.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingAppointments.map((app) => {
              const srv = getServiceForApp(app);
              const st = getStaffForApp(app);
              const dateLabel = formatAppDate(app.appointment_date);
              const isWorkingOnThis = actionLoadingId === app.id;
              const clientName = app.client_name || app.patient_name;
              const clientPhone = app.client_phone || app.patient_phone;
              const clientEmail = app.client_email || app.patient_email;

              return (
                <div
                  key={app.id}
                  className="p-4 rounded-xl border border-slate-200/90 bg-white hover:border-gold-300 hover:shadow-xs transition-all space-y-3"
                >
                  {/* Primary Line: Client Details (Name, Contact), Salon Service, Stylist, and Date & Time Slot */}
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                    {/* Left: Client Name and Contact Information */}
                    <div className="flex items-center gap-2.5 flex-wrap min-w-0">
                      <span className="font-bold text-sm text-slate-900 tracking-tight">
                        {clientName}
                      </span>
                      {clientPhone && (
                        <span className="inline-flex items-center gap-1 text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md font-mono">
                          <Phone className="w-3 h-3 text-slate-400" />
                          {clientPhone}
                        </span>
                      )}
                      {clientEmail && (
                        <span className="inline-flex items-center gap-1 text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                          <Mail className="w-3 h-3 text-slate-400" />
                          {clientEmail}
                        </span>
                      )}
                    </div>

                    {/* Right on Primary Line: Service Pill, Stylist Pill, and Appointment Date & Time */}
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      {/* Service Pill */}
                      <div className="inline-flex items-center gap-1.5 bg-brand-50 border border-brand-200 px-2.5 py-1 rounded-lg text-brand-900">
                        <Layers className="w-3.5 h-3.5 text-brand-600 shrink-0" />
                        <span className="font-semibold">{srv.name}</span>
                        <span className="text-gold-600 font-bold ml-1">₹{srv.price}</span>
                      </div>

                      {/* Stylist Pill */}
                      <div className="inline-flex items-center gap-1.5 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg text-slate-800">
                        <Sparkles className="w-3.5 h-3.5 text-gold-500 shrink-0" />
                        <span className="font-semibold">{st.name}</span>
                      </div>

                      {/* Date & Time Slot Pill */}
                      <div className="inline-flex items-center gap-1.5 bg-gold-50 border border-gold-200 px-2.5 py-1 rounded-lg text-gold-950 font-medium">
                        <span className="inline-flex items-center gap-1 font-bold">
                          <Calendar className="w-3.5 h-3.5 text-gold-600" />
                          {dateLabel} ({app.appointment_date})
                        </span>
                        <span className="text-gold-400">•</span>
                        <span className="inline-flex items-center gap-1 font-extrabold text-gold-900">
                          <Clock className="w-3.5 h-3.5 text-gold-600" />
                          {app.appointment_time}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Optional Client Notes */}
                  {app.notes && (
                    <p className="text-xs text-slate-600 bg-gold-50/60 border border-gold-200/60 px-3 py-1.5 rounded-lg italic">
                      <span className="font-semibold text-gold-900 not-italic">Client Note:</span> "{app.notes}"
                    </p>
                  )}

                  {/* Second Line / Structured Footer: Metadata on left, Action Buttons on right */}
                  <div className="pt-2.5 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
                      <span>Request #{app.id}</span>
                      <span>•</span>
                      <span className="text-slate-500 font-sans">Awaiting admin review</span>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                      {/* Approve Action */}
                      <button
                        onClick={() => handleApprove(app.id)}
                        disabled={isWorkingOnThis}
                        className="px-3.5 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-500 active:bg-brand-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer disabled:opacity-50 border border-brand-500"
                        title="Approve this client appointment request"
                      >
                        <CheckCircle className="w-3.5 h-3.5 text-gold-300" />
                        <span>{isWorkingOnThis ? 'Approving...' : 'Approve'}</span>
                      </button>

                      {/* Reschedule Action (PROPOSE/SELECT NEW SLOT) */}
                      <button
                        onClick={() => handleOpenRescheduleModal(app)}
                        disabled={isWorkingOnThis}
                        className="px-3.5 py-1.5 rounded-xl bg-gold-50 hover:bg-gold-100 active:bg-gold-200 border border-gold-200 text-gold-800 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                        title="Propose or select a new date/time slot"
                      >
                        <Clock className="w-3.5 h-3.5 text-gold-600" />
                        <span>Reschedule</span>
                      </button>

                      {/* Cancel / Reject Action */}
                      <button
                        onClick={() => handleOpenCancelModal(app)}
                        disabled={isWorkingOnThis}
                        className="px-3 py-1.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 active:bg-rose-100 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                        title="Decline or cancel this request with reason"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Cancel</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. Lower Section: Salon Operations & Upcoming Scheduled Appointments Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Today's Stylist Shifts & Station Roster (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-brand-600" />
                <span>Today's Stylist Shifts</span>
              </h3>
              <span className="text-[10px] font-bold bg-brand-100 text-brand-800 px-2 py-0.5 rounded-full border border-brand-200">
                Active
              </span>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="p-3 rounded-xl bg-brand-50/70 border border-brand-100/80 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-brand-950">Anya Roy</span>
                  <span className="text-[10px] font-semibold bg-brand-200/70 text-brand-900 px-2 py-0.2 rounded">
                    10 AM - 3 PM
                  </span>
                </div>
                <p className="text-[11px] text-brand-700 font-medium">Lead Creative Hair Director (Morning Shift)</p>
              </div>

              <div className="p-3 rounded-xl bg-gold-50/70 border border-gold-200/80 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-gold-950">Priya Sen</span>
                  <span className="text-[10px] font-semibold bg-gold-200/70 text-gold-900 px-2 py-0.2 rounded">
                    12 PM - 6 PM
                  </span>
                </div>
                <p className="text-[11px] text-gold-800 font-medium">Master Nail Artist & Lash Specialist (Afternoon Shift)</p>
              </div>

              <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-100/80 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-950">Meera Kapoor</span>
                  <span className="text-[10px] font-semibold bg-emerald-200/70 text-emerald-900 px-2 py-0.2 rounded">
                    3 PM - 8 PM
                  </span>
                </div>
                <p className="text-[11px] text-emerald-800 font-medium">Senior Aesthetician & Skincare Expert (Evening Shift)</p>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span className="flex items-center gap-1.5 font-medium">
                <Gauge className="w-3.5 h-3.5 text-brand-600" />
                Station Cap: {maxCapacityPerHour} clients/hr
              </span>
              <button
                onClick={() => onNavigateTab('capacity')}
                className="text-brand-600 hover:text-brand-700 font-semibold cursor-pointer"
              >
                Settings
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Upcoming Scheduled Appointments Feed (8 cols) */}
        <div id="scheduled-appointments-section" className="lg:col-span-8 bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4 scroll-mt-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-brand-600" />
                <span>Upcoming Appointments</span>
                <span className="text-xs bg-slate-100 text-slate-700 font-bold px-2.5 py-0.5 rounded-full">
                  {upcomingAppointments.length} Scheduled
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Confirmed salon visits sorted chronologically. Mark as Done, Reschedule, or Cancel bookings directly.
              </p>
            </div>

            <button
              onClick={() => onNavigateTab('calendar')}
              className="text-xs text-brand-600 hover:text-brand-700 font-semibold flex items-center gap-1 cursor-pointer shrink-0"
            >
              <span>View Full Calendar</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {upcomingAppointments.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
              <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-700">No Upcoming Appointments</p>
              <p className="text-xs text-slate-400 mt-1">
                There are currently no confirmed visits on the schedule.
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
              {upcomingAppointments.slice(0, 10).map((app) => {
                const srv = getServiceForApp(app);
                const st = getStaffForApp(app);
                const dateLabel = formatAppDate(app.appointment_date);
                const isToday = dateLabel === 'Today';
                const isWorkingOnThis = actionLoadingId === app.id;

                return (
                  <div
                    key={app.id}
                    className={`p-4 rounded-xl border transition-all space-y-3 ${
                      isToday
                        ? 'bg-brand-50/20 border-brand-200 shadow-2xs'
                        : 'bg-white border-slate-200/90 hover:border-slate-300'
                    }`}
                  >
                    {/* Primary Line: Client Details (Name, Contact, Status), Salon Service, Stylist, and Date & Time Slot */}
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
                      {/* Left: Client Name, Status Badges, Contact, Service & Stylist */}
                      <div className="flex items-center gap-2 flex-wrap min-w-0">
                        <span className="font-bold text-sm text-slate-900">
                          {app.client_name || app.patient_name}
                        </span>
                        {isToday && (
                          <span className="text-[10px] bg-brand-600 text-white font-extrabold px-2 py-0.2 rounded-full uppercase tracking-wider">
                            TODAY
                          </span>
                        )}
                        <span
                          className={`text-[10px] font-bold px-2 py-0.2 rounded-full uppercase ${
                            app.status === 'rescheduled'
                              ? 'bg-gold-100 text-gold-900 border border-gold-200'
                              : 'bg-brand-100 text-brand-900 border border-brand-200'
                          }`}
                        >
                          {app.status}
                        </span>
                        {(app.client_phone || app.patient_phone) && (
                          <span className="text-xs text-slate-400 font-mono">
                            {app.client_phone || app.patient_phone}
                          </span>
                        )}

                        {/* Service Pill */}
                        <span className="inline-flex items-center gap-1 text-gold-900 font-semibold bg-gold-50 border border-gold-200/80 px-2 py-0.5 rounded-md text-xs">
                          <Layers className="w-3 h-3 text-gold-600 shrink-0" />
                          <span>{srv.name} (₹{srv.price})</span>
                        </span>

                        {/* Stylist Pill */}
                        <span className="inline-flex items-center gap-1 text-brand-900 font-medium bg-brand-50 border border-brand-200/80 px-2 py-0.5 rounded-md text-xs">
                          <Sparkles className="w-3 h-3 text-brand-600 shrink-0" />
                          <span>{st.name}</span>
                        </span>
                      </div>

                      {/* Right on Primary Line: Date & Time Slot Badges */}
                      <div className="flex items-center gap-2 shrink-0 text-xs self-start lg:self-auto">
                        <div className="flex items-center gap-1.5 font-bold text-slate-900 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg">
                          <Calendar className="w-3.5 h-3.5 text-brand-600 shrink-0" />
                          <span>{dateLabel}</span>
                          <span className="text-slate-400 font-normal">({app.appointment_date})</span>
                        </div>
                        <div className="flex items-center gap-1 font-extrabold text-slate-800 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg">
                          <Clock className="w-3.5 h-3.5 text-gold-500 shrink-0" />
                          <span>{app.appointment_time}</span>
                        </div>
                      </div>
                    </div>

                    {/* Clean Second Line / Structured Footer: Metadata on left, Action Buttons on right */}
                    <div className="pt-2.5 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      <div className="flex items-center gap-2 text-xs text-slate-500 flex-wrap">
                        {app.completed_by ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-gold-900 bg-gold-50 border border-gold-200 px-2 py-0.5 rounded-full">
                            <Sparkles className="w-3 h-3 text-gold-600" />
                            Completed by {app.completed_by}
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-500 flex items-center gap-1">
                            <UserCheck className="w-3.5 h-3.5 text-brand-600" />
                            Assigned to <strong className="text-slate-700 font-semibold">{st.name}</strong>
                          </span>
                        )}
                        {app.notes && (
                          <span className="text-[11px] text-slate-400 truncate max-w-xs" title={app.notes}>
                            • Note: "{app.notes}"
                          </span>
                        )}
                      </div>

                      {/* Right: Operational Action Buttons (Done, Reschedule, Cancel) */}
                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                        {/* Mark as Done */}
                        <button
                          onClick={() => handleOpenDoneModal(app)}
                          disabled={isWorkingOnThis}
                          className="px-3 py-1.5 rounded-xl bg-brand-50 hover:bg-brand-600 text-brand-700 hover:text-white border border-brand-200 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50 shadow-2xs"
                          title="Mark appointment as successfully completed"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Mark as Done</span>
                        </button>

                        {/* Reschedule */}
                        <button
                          onClick={() => handleOpenRescheduleModal(app)}
                          disabled={isWorkingOnThis}
                          className="px-3 py-1.5 rounded-xl bg-gold-50 hover:bg-gold-600 text-gold-800 hover:text-white border border-gold-200 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                          title="Reschedule appointment to a different date or time"
                        >
                          <Clock className="w-3.5 h-3.5" />
                          <span>Reschedule</span>
                        </button>

                        {/* Cancel */}
                        <button
                          onClick={() => handleOpenCancelModal(app)}
                          disabled={isWorkingOnThis}
                          className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-200 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                          title="Cancel this appointment with reason"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Cancel</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* RESCHEDULE APPOINTMENT MODAL                                              */}
      {/* ========================================================================= */}
      {rescheduleModalApp && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl border border-slate-200 animate-scale-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5 text-brand-700">
                <Clock className="w-4 h-4 text-brand-600" />
                <span>Reschedule Salon Appointment</span>
              </h3>
              <button
                onClick={() => setRescheduleModalApp(null)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Propose or select a new date and time slot for{' '}
              <strong className="text-slate-800">
                {rescheduleModalApp?.client_name || rescheduleModalApp?.patient_name}
              </strong>{' '}
              with{' '}
              <strong className="text-slate-800">
                {rescheduleModalApp?.stylist_name || rescheduleModalApp?.doctor_name}
              </strong>:
            </p>

            {modalError && (
              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                {modalError}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  New Appointment Date *
                </label>
                <input
                  type="date"
                  required
                  min={todayStr}
                  value={rescheduleDate}
                  onChange={(e) => {
                    if (e.target.value >= todayStr) {
                      setRescheduleDate(e.target.value);
                    }
                  }}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
                <p className="text-[10px] text-slate-400 mt-0.5">Past dates disabled ({todayStr} onwards)</p>
              </div>

              {/* Day-Specific Operating Hours / Closed Day Badge */}
              {rescheduleDate && (
                <div>
                  {rescheduleDaySchedule.isOpen ? (
                    <div className="px-3 py-1.5 bg-emerald-50 border border-emerald-200/80 rounded-xl text-[11px] flex items-center justify-between text-emerald-800">
                      <span className="font-semibold flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{rescheduleDaySchedule.dayName} Hours: {rescheduleDaySchedule.openTime} – {rescheduleDaySchedule.closeTime}</span>
                      </span>
                      {rescheduleDaySchedule.breakStart && rescheduleDaySchedule.breakEnd && (
                        <span className="text-[10px] text-emerald-700 bg-emerald-100/90 px-1.5 py-0.5 rounded font-semibold">
                          Break: {rescheduleDaySchedule.breakStart} – {rescheduleDaySchedule.breakEnd}
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>The salon is closed on {rescheduleDaySchedule.dayName}s according to the weekly operating schedule.</span>
                    </div>
                  )}
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">
                    New Time Slot *
                  </label>
                  {rescheduleDate === todayStr && rescheduleDaySchedule.isOpen && (
                    <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded font-medium">
                      Today's past slots filtered
                    </span>
                  )}
                </div>
                <select
                  value={rescheduleTime}
                  onChange={(e) => setRescheduleTime(e.target.value)}
                  disabled={!rescheduleDaySchedule.isOpen}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none bg-white font-medium disabled:bg-slate-100 disabled:text-slate-400"
                >
                  {!rescheduleDaySchedule.isOpen ? (
                    <option value="" disabled>
                      Salon closed on {rescheduleDaySchedule.dayName || 'this day'}s
                    </option>
                  ) : selectableRescheduleSlots.length === 0 ? (
                    <option value="" disabled>
                      No slots available on this date
                    </option>
                  ) : (
                    selectableRescheduleSlots.map((item) => (
                      <option
                        key={item.slot}
                        value={item.slot}
                        disabled={!item.available}
                        className={
                          item.available
                            ? 'text-slate-900 font-medium'
                            : 'text-slate-400 bg-slate-50 italic'
                        }
                      >
                        {item.slot}{' '}
                        {item.available
                          ? '(Available)'
                          : `(${item.label})`}
                      </option>
                    ))
                  )}
                </select>
                {rescheduleDaySchedule.isOpen && selectableRescheduleSlots.filter((s) => s.available).length === 0 && (
                  <p className="text-[11px] text-rose-600 mt-1 flex items-center gap-1 font-medium">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>No available slots on this date. Please pick another date.</span>
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Reschedule Note / Reason
                </label>
                <input
                  type="text"
                  value={rescheduleReason}
                  onChange={(e) => setRescheduleReason(e.target.value)}
                  placeholder="e.g. Client requested afternoon slot for bridal trial"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setRescheduleModalApp(null)}
                className="px-3.5 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReschedule}
                disabled={actionLoading || !rescheduleDaySchedule.isOpen || selectableRescheduleSlots.filter((s) => s.available).length === 0}
                className="px-3.5 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                <Clock className="w-3.5 h-3.5 text-gold-300" />
                <span>{actionLoading ? 'Updating...' : 'Confirm Reschedule'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CANCEL APPOINTMENT MODAL                                                  */}
      {/* ========================================================================= */}
      {cancelModalApp && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl border border-slate-200 animate-scale-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5 text-rose-600">
                <AlertTriangle className="w-4 h-4" />
                <span>Cancel Salon Appointment</span>
              </h3>
              <button
                onClick={() => setCancelModalApp(null)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Enter the administrative reason for dropping the booking for{' '}
              <strong className="text-slate-800">
                {cancelModalApp?.client_name || cancelModalApp?.patient_name}
              </strong>{' '}
              (#{cancelModalApp?.id}):
            </p>

            {modalError && (
              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                {modalError}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Cancellation Reason *
              </label>
              <textarea
                rows={3}
                required
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="e.g. Client requested cancellation due to travel, stylist schedule conflict..."
                className="w-full p-2.5 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setCancelModalApp(null)}
                className="px-3.5 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 cursor-pointer"
              >
                Keep Appointment
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                disabled={actionLoading}
                className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>{actionLoading ? 'Cancelling...' : 'Confirm Drop'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MARK AS DONE (SERVICE COMPLETED) MODAL                                    */}
      {/* ========================================================================= */}
      {doneModalApp && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl border border-slate-200 animate-scale-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5 text-brand-700">
                <CheckCircle2 className="w-4 h-4 text-brand-600" />
                <span>Mark Salon Appointment as Done</span>
              </h3>
              <button
                onClick={() => setDoneModalApp(null)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Appointment Brief */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900">
                  {doneModalApp.client_name || doneModalApp.patient_name}
                </span>
                <span className="text-[10px] font-bold text-slate-500 font-mono">#{doneModalApp.id}</span>
              </div>
              <p className="text-slate-600">
                <span className="font-semibold text-slate-700">Scheduled:</span> {doneModalApp.appointment_date} at {doneModalApp.appointment_time}
              </p>
              <p className="text-slate-600">
                <span className="font-semibold text-slate-700">Service:</span> {getServiceForApp(doneModalApp).name}
              </p>
            </div>

            {modalError && (
              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                {modalError}
              </div>
            )}

            <div className="space-y-3">
              {/* Staff Selection Dropdown */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Service Completed By (Stylist / Beautician) *
                </label>
                <select
                  value={completedBy}
                  onChange={(e) => setCompletedBy(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none bg-white font-medium"
                >
                  {/* Default / Logged-in user option if not already matching a staff name */}
                  {user?.full_name && !staff.some((s) => s.name.toLowerCase() === user.full_name.toLowerCase()) && (
                    <option value={user.full_name}>
                      {user.full_name} (Logged-in Salon Admin)
                    </option>
                  )}
                  {staff.map((st) => (
                    <option key={st.id} value={st.name}>
                      {st.name} {st.title ? `— ${st.title}` : ''}
                    </option>
                  ))}
                  {/* Fallback to booked stylist name if neither in list */}
                  {(doneModalApp.stylist_name || doneModalApp.doctor_name) &&
                    !staff.some((s) => s.name.toLowerCase() === (doneModalApp.stylist_name || doneModalApp.doctor_name).toLowerCase()) &&
                    (!user || user.full_name !== (doneModalApp.stylist_name || doneModalApp.doctor_name)) && (
                      <option value={doneModalApp.stylist_name || doneModalApp.doctor_name}>
                        {doneModalApp.stylist_name || doneModalApp.doctor_name} (Attending Stylist)
                      </option>
                  )}
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  Pre-selected to logged-in user. You can switch to any registered stylist.
                </p>
              </div>

              {/* Optional Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Completion Notes / Remarks (Optional)
                </label>
                <input
                  type="text"
                  value={completionNotes}
                  onChange={(e) => setCompletionNotes(e.target.value)}
                  placeholder="e.g. Styling complete; client delighted with balayage finish"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDoneModalApp(null)}
                className="px-3.5 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDone}
                disabled={actionLoading}
                className="px-3.5 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-gold-300" />
                <span>{actionLoading ? 'Saving...' : 'Confirm & Complete'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
