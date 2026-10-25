import React, { useState, useMemo, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Clock,
  User,
  Phone,
  Mail,
  CheckCircle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Plus,
  Filter,
  Search,
  X,
  AlertTriangle,
  Sparkles,
  UserCheck,
} from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  STANDARD_SLOTS,
  parseSlotMinutes,
  getDaySchedule,
  generateSlotsForDate,
} from '../../utils/scheduleUtils';

export default function AppointmentCalendar({
  appointments = [],
  staff = [],
  services = [],
  capacity = null,
  workingHours = [],
  onRefresh,
}) {
  const { user } = useAuth();
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

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

  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [viewMode, setViewMode] = useState('list'); // Default to list view on load
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [staffFilter, setStaffFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  // Selected appointment for detail drawer / modal
  const [selectedApp, setSelectedApp] = useState(null);

  // Modals
  const [isDoneModalOpen, setIsDoneModalOpen] = useState(false);
  const [doneApp, setDoneApp] = useState(null);
  const [doneCompletedBy, setDoneCompletedBy] = useState('');
  const [doneNotes, setDoneNotes] = useState('');

  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('10:00 AM');
  const [rescheduleNotes, setRescheduleNotes] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Service selection for manual booking modal
  const [selectedServiceIds, setSelectedServiceIds] = useState([]);
  const [serviceSearch, setServiceSearch] = useState('');
  const [isServiceDropdownOpen, setIsServiceDropdownOpen] = useState(false);

  const [createFormData, setCreateFormData] = useState({
    client_name: '',
    client_phone: '',
    client_email: '',
    doctor_name: staff[0]?.name || 'Anya Roy',
    appointment_date: new Date().toISOString().split('T')[0],
    appointment_time: '10:00 AM',
    notes: '',
  });

  const [actionLoading, setActionLoading] = useState(false);
  const [modalError, setModalError] = useState('');

  // Filtered Appointments
  const filteredAppointments = useMemo(() => {
    return appointments.filter((app) => {
      const matchStatus = statusFilter === 'ALL' || app.status === statusFilter;
      const stylist = app.stylist_name || app.doctor_name || '';
      const matchStaff = staffFilter === 'ALL' || stylist.toLowerCase().includes(staffFilter.toLowerCase());
      const client = (app.client_name || app.patient_name || '').toLowerCase();
      const phone = (app.client_phone || app.patient_phone || '').toLowerCase();
      const matchSearch =
        !search ||
        client.includes(search.toLowerCase()) ||
        phone.includes(search.toLowerCase());
      return matchStatus && matchStaff && matchSearch;
    });
  }, [appointments, statusFilter, staffFilter, search]);

  // Calendar Date Math
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay(); // 0=Sun, 1=Mon, etc.

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const handlePrev = () => {
    if (viewMode === 'month') {
      setCurrentDate(new Date(year, month - 1, 1));
    } else if (viewMode === 'day') {
      setCurrentDate(new Date(year, month, currentDate.getDate() - 1));
    } else {
      setCurrentDate(new Date(year, month, currentDate.getDate() - 7));
    }
  };

  const handleNext = () => {
    if (viewMode === 'month') {
      setCurrentDate(new Date(year, month + 1, 1));
    } else if (viewMode === 'day') {
      setCurrentDate(new Date(year, month, currentDate.getDate() + 1));
    } else {
      setCurrentDate(new Date(year, month, currentDate.getDate() + 7));
    }
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Actions
  const handleApprove = async (appId) => {
    setActionLoading(true);
    try {
      await api.appointments.approve(appId);
      onRefresh();
      if (selectedApp?.id === appId) {
        setSelectedApp((prev) => ({ ...prev, status: 'approved' }));
      }
    } catch (err) {
      alert(err.friendlyMessage || 'Failed to approve appointment.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenDoneModal = (app) => {
    setDoneApp(app);
    setDoneNotes('');
    setModalError('');

    // Pre-select currently logged-in user or matching registered staff member
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
    setDoneCompletedBy(defaultStaff);
    setIsDoneModalOpen(true);
  };

  const handleConfirmDone = async () => {
    if (!doneCompletedBy) {
      setModalError('Please select the stylist/beautician who completed this service.');
      return;
    }
    setActionLoading(true);
    setModalError('');
    try {
      await api.appointments.updateStatus(
        doneApp.id,
        'completed',
        doneNotes,
        doneCompletedBy
      );
      setIsDoneModalOpen(false);
      onRefresh();
      if (selectedApp?.id === doneApp.id) {
        setSelectedApp((prev) => ({
          ...prev,
          status: 'completed',
          completed_by: doneCompletedBy,
        }));
      }
    } catch (err) {
      setModalError(err.friendlyMessage || 'Failed to complete appointment.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenCancel = (app) => {
    setSelectedApp(app);
    setCancelReason('');
    setModalError('');
    setIsCancelModalOpen(true);
  };

  const handleConfirmCancel = async () => {
    if (!cancelReason.trim()) {
      setModalError('Please enter a cancellation reason.');
      return;
    }
    setActionLoading(true);
    try {
      await api.appointments.cancel(selectedApp.id, cancelReason);
      setIsCancelModalOpen(false);
      onRefresh();
      if (selectedApp) {
        setSelectedApp((prev) => ({ ...prev, status: 'cancelled', cancellation_reason: cancelReason }));
      }
    } catch (err) {
      setModalError(err.friendlyMessage || 'Failed to cancel appointment.');
    } finally {
      setActionLoading(false);
    }
  };

  // Selected day schedules
  const selectedDaySchedule = useMemo(() => {
    return getDaySchedule(createFormData.appointment_date, localWorkingHours);
  }, [createFormData.appointment_date, localWorkingHours]);

  const rescheduleDaySchedule = useMemo(() => {
    return getDaySchedule(rescheduleDate, localWorkingHours);
  }, [rescheduleDate, localWorkingHours]);

  // Slot calculations for manual booking modal
  const modalSlots = useMemo(() => {
    const selectedDate = createFormData.appointment_date;
    const selectedStylist = createFormData.doctor_name;
    if (!selectedDate) return [];

    const isToday = selectedDate === todayStr;
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const dateApps = (appointments || []).filter(
      (app) => app.appointment_date === selectedDate && app.status !== 'cancelled'
    );

    const maxPerHour = capacity?.max_bookings_per_hour || 6;
    const allowOverbooking = capacity?.allow_overbooking || false;

    // Generate candidate slots strictly respecting day-specific open, close, and break hours
    const candidateSlots = generateSlotsForDate(selectedDate, localWorkingHours);
    if (!candidateSlots || candidateSlots.length === 0) {
      return [];
    }

    return candidateSlots.map((slot) => {
      const slotMins = parseSlotMinutes(slot);

      // 1. Past date check
      if (selectedDate < todayStr) {
        return { slot, available: false, status: 'passed', label: 'Passed' };
      }

      // 2. Past time on today check
      if (isToday && slotMins !== null && slotMins <= currentMinutes) {
        return { slot, available: false, status: 'passed', label: 'Passed' };
      }

      // 3. Already booked or pending for this stylist
      const isBooked = dateApps.some((app) => {
        const appStylist = app.stylist_name || app.doctor_name || '';
        const matchStylist =
          !selectedStylist ||
          selectedStylist === 'ALL' ||
          appStylist.toLowerCase().includes(selectedStylist.toLowerCase()) ||
          selectedStylist.toLowerCase().includes(appStylist.toLowerCase());
        const matchTime =
          app.appointment_time &&
          app.appointment_time.trim().toUpperCase() === slot.trim().toUpperCase();
        return matchStylist && matchTime;
      });

      if (isBooked) {
        return {
          slot,
          available: false,
          status: 'booked',
          label: 'Already Booked / Unavailable',
        };
      }

      // 4. Hourly chair capacity limit check
      const slotHour = slotMins !== null ? Math.floor(slotMins / 60) : null;
      if (slotHour !== null) {
        const hourlyCount = dateApps.filter((app) => {
          const appMins = parseSlotMinutes(app.appointment_time);
          return appMins !== null && Math.floor(appMins / 60) === slotHour;
        }).length;

        if (!allowOverbooking && hourlyCount >= maxPerHour) {
          return {
            slot,
            available: false,
            status: 'capacity_full',
            label: 'Salon Capacity Full',
          };
        }
      }

      return { slot, available: true, status: 'available', label: 'Available' };
    });
  }, [createFormData.appointment_date, createFormData.doctor_name, appointments, capacity, localWorkingHours, todayStr]);

  // Dynamic Past Time Slot Filtering for Today: Hide passed slots when today
  const selectableSlots = useMemo(() => {
    const isToday = createFormData.appointment_date === todayStr;
    return modalSlots.filter((s) => {
      if (isToday && s.status === 'passed') return false;
      return true;
    });
  }, [modalSlots, createFormData.appointment_date, todayStr]);

  // Auto-select first available slot if currently selected slot is invalid
  useEffect(() => {
    if (!isCreateModalOpen) return;
    const currentValid = selectableSlots.find(
      (s) => s.slot === createFormData.appointment_time && s.available
    );
    if (!currentValid) {
      const firstAvailable = selectableSlots.find((s) => s.available);
      if (firstAvailable) {
        setCreateFormData((prev) => ({
          ...prev,
          appointment_time: firstAvailable.slot,
        }));
      }
    }
  }, [selectableSlots, isCreateModalOpen]);

  // Slot calculations for reschedule modal
  const rescheduleSlots = useMemo(() => {
    if (!rescheduleDate || !selectedApp) return [];
    const isToday = rescheduleDate === todayStr;
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const dateApps = (appointments || []).filter(
      (app) =>
        app.id !== selectedApp.id &&
        app.appointment_date === rescheduleDate &&
        app.status !== 'cancelled'
    );

    const stylist = selectedApp.stylist_name || selectedApp.doctor_name || '';
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
  }, [rescheduleDate, selectedApp, appointments, capacity, localWorkingHours, todayStr]);

  const selectableRescheduleSlots = useMemo(() => {
    const isToday = rescheduleDate === todayStr;
    return rescheduleSlots.filter((s) => {
      if (isToday && s.status === 'passed') return false;
      return true;
    });
  }, [rescheduleSlots, rescheduleDate, todayStr]);

  useEffect(() => {
    if (!isRescheduleModalOpen) return;
    const currentValid = selectableRescheduleSlots.find(
      (s) => s.slot === rescheduleTime && s.available
    );
    if (!currentValid) {
      const firstAvailable = selectableRescheduleSlots.find((s) => s.available);
      if (firstAvailable) {
        setRescheduleTime(firstAvailable.slot);
      }
    }
  }, [selectableRescheduleSlots, isRescheduleModalOpen]);

  const handleOpenReschedule = (app) => {
    setSelectedApp(app);
    const validDate = app.appointment_date >= todayStr ? app.appointment_date : todayStr;
    setRescheduleDate(validDate);
    setRescheduleTime(app.appointment_time || '10:00 AM');
    setRescheduleNotes('');
    setModalError('');
    setIsRescheduleModalOpen(true);
  };

  const handleConfirmReschedule = async () => {
    if (!rescheduleDate || !rescheduleTime) {
      setModalError('Date and time are required for rescheduling.');
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
    try {
      await api.appointments.reschedule(
        selectedApp.id,
        rescheduleDate,
        rescheduleTime,
        rescheduleNotes
      );
      setIsRescheduleModalOpen(false);
      onRefresh();
      if (selectedApp) {
        setSelectedApp((prev) => ({
          ...prev,
          appointment_date: rescheduleDate,
          appointment_time: rescheduleTime,
          status: 'rescheduled',
        }));
      }
    } catch (err) {
      setModalError(err.friendlyMessage || 'Failed to reschedule appointment.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenCreateModal = () => {
    setModalError('');
    setSelectedServiceIds(services.length > 0 ? [services[0].id] : []);
    setServiceSearch('');
    setIsServiceDropdownOpen(false);
    setCreateFormData({
      client_name: '',
      client_phone: '',
      client_email: '',
      doctor_name: staff[0]?.name || 'Anya Roy',
      appointment_date: todayStr,
      appointment_time: '10:00 AM',
      notes: '',
    });
    setIsCreateModalOpen(true);
  };

  const handleCreateAppointment = async (e) => {
    e.preventDefault();
    if (createFormData.appointment_date < todayStr) {
      setModalError('Cannot book appointments for past dates. Please pick today or a future date.');
      return;
    }
    if (selectedServiceIds.length === 0) {
      setModalError('Please select at least one salon service for this client appointment.');
      return;
    }
    const chosenSlot = modalSlots.find((s) => s.slot === createFormData.appointment_time);
    if (chosenSlot && !chosenSlot.available) {
      setModalError(`Time slot '${createFormData.appointment_time}' is not available (${chosenSlot.label}). Please pick an available slot.`);
      return;
    }

    setActionLoading(true);
    setModalError('');
    try {
      const selectedServices = services.filter((s) => selectedServiceIds.includes(s.id));
      const serviceNames = selectedServices.map((s) => s.name).join(', ');
      const primaryServiceId = selectedServiceIds[0];

      const payload = {
        ...createFormData,
        service_id: primaryServiceId,
        service_ids: selectedServiceIds,
        service_name: serviceNames,
        notes: selectedServices.length > 0
          ? (createFormData.notes ? `${createFormData.notes} | Services: ${serviceNames}` : `Services: ${serviceNames}`)
          : createFormData.notes,
      };

      await api.appointments.create(payload);
      setIsCreateModalOpen(false);
      onRefresh();
    } catch (err) {
      setModalError(err.friendlyMessage || 'Failed to book appointment.');
    } finally {
      setActionLoading(false);
    }
  };

  // Status badge styling helper
  const getStatusBadge = (status) => {
    switch (status) {
      case 'approved':
      case 'confirmed':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'completed':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'pending':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'rescheduled':
        return 'bg-sky-100 text-sky-800 border-sky-200';
      case 'cancelled':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Action Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-brand-600" />
            <span>Salon Appointment & Booking Calendar</span>
          </h2>
          <p className="text-xs text-slate-500">
            Review incoming client booking requests, approve visits, cancel with notes, and reschedule salon chairs.
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="inline-flex items-center space-x-1.5 bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-all shadow-sm shadow-brand-700/30 cursor-pointer self-start sm:self-auto border border-brand-500"
        >
          <Plus className="w-4 h-4 text-gold-300" />
          <span>Book Salon Client</span>
        </button>
      </div>

      {/* Filter and Date Navigation Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Date Month/Day Navigator */}
        <div className="flex items-center space-x-2">
          <button
            onClick={handlePrev}
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={handleNext}
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={handleToday}
            className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
          >
            Today
          </button>
          <span className="font-bold text-base text-slate-900 pl-2">
            {monthNames[month]} {year}
          </span>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl self-start lg:self-auto">
          {['month', 'list'].map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all cursor-pointer ${
                viewMode === mode
                  ? 'bg-white text-slate-900 shadow-xs font-bold'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              {mode} View
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 text-xs border border-slate-200 rounded-xl bg-slate-50 font-medium"
          >
            <option value="ALL">All Statuses</option>
            <option value="pending">Pending Approval</option>
            <option value="approved">Approved</option>
            <option value="completed">Completed (Done)</option>
            <option value="rescheduled">Rescheduled</option>
            <option value="cancelled">Cancelled</option>
          </select>

          {/* Stylist filter */}
          <select
            value={staffFilter}
            onChange={(e) => setStaffFilter(e.target.value)}
            className="px-3 py-1.5 text-xs border border-slate-200 rounded-xl bg-slate-50 font-medium"
          >
            <option value="ALL">All Stylists</option>
            {staff.map((st) => (
              <option key={st.id} value={st.name}>
                {st.name}
              </option>
            ))}
          </select>

          {/* Search box */}
          <div className="relative w-44">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search client..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-2 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
        </div>
      </div>

      {/* Main Viewport: Calendar Month Grid or List View */}
      {viewMode === 'month' ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          {/* Day of Week Headers */}
          <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/70 text-center py-2 text-xs font-bold text-slate-600">
            <span>Sun</span>
            <span>Mon</span>
            <span>Tue</span>
            <span>Wed</span>
            <span>Thu</span>
            <span>Fri</span>
            <span>Sat</span>
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-slate-100">
            {/* Empty slots before first day */}
            {Array.from({ length: firstDayIndex }).map((_, idx) => (
              <div key={`empty-${idx}`} className="h-28 bg-slate-50/30 p-2" />
            ))}

            {/* Days in Month */}
            {Array.from({ length: daysInMonth }).map((_, idx) => {
              const dayNum = idx + 1;
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
              const dayAppointments = filteredAppointments.filter(
                (a) => a.appointment_date === dateStr
              );
              const isToday =
                new Date().toISOString().split('T')[0] === dateStr;

              return (
                <div
                  key={dayNum}
                  className={`min-h-28 p-2 flex flex-col justify-between transition-colors hover:bg-slate-50/80 ${
                    isToday ? 'bg-brand-50/40' : ''
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`text-xs font-bold inline-flex items-center justify-center w-6 h-6 rounded-full ${
                        isToday
                          ? 'bg-brand-600 text-white'
                          : 'text-slate-700'
                      }`}
                    >
                      {dayNum}
                    </span>
                    {dayAppointments.length > 0 && (
                      <span className="text-[10px] font-bold text-slate-400">
                        {dayAppointments.length} bookings
                      </span>
                    )}
                  </div>

                  {/* Appointments list in cell */}
                  <div className="space-y-1 overflow-y-auto max-h-20">
                    {dayAppointments.slice(0, 3).map((app) => (
                      <button
                        key={app.id}
                        onClick={() => setSelectedApp(app)}
                        className={`w-full text-left p-1 rounded-md text-[10px] truncate border block cursor-pointer transition-transform hover:scale-[1.02] ${getStatusBadge(
                          app.status
                        )}`}
                      >
                        <span className="font-bold">{app.appointment_time}</span> -{' '}
                        <span>{app.client_name || app.patient_name}</span>
                      </button>
                    ))}
                    {dayAppointments.length > 3 && (
                      <span className="text-[10px] text-slate-400 font-semibold block text-center">
                        +{dayAppointments.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* List View */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900">
              Scheduled Client Appointments ({filteredAppointments.length})
            </h3>
          </div>
          <div className="divide-y divide-slate-100">
            {filteredAppointments.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">
                No salon appointments match current filters.
              </div>
            ) : (
              filteredAppointments.map((app) => (
                <div
                  key={app.id}
                  onClick={() => setSelectedApp(app)}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900">{app.client_name || app.patient_name}</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getStatusBadge(
                          app.status
                        )}`}
                      >
                        {app.status.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                      <span className="inline-flex items-center gap-1 font-medium">
                        <CalendarIcon className="w-3.5 h-3.5 text-brand-600" />
                        {app.appointment_date} at {app.appointment_time}
                      </span>
                      <span className="inline-flex items-center gap-1 text-slate-700">
                        <Sparkles className="w-3.5 h-3.5 text-gold-500" />
                        {app.stylist_name || app.doctor_name}
                      </span>
                      {(app.service_name || app.service?.name) && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 text-[11px] font-semibold border border-brand-200">
                          {app.service_name || app.service?.name}
                        </span>
                      )}
                      {(app.client_phone || app.patient_phone) && <span>Ph: {app.client_phone || app.patient_phone}</span>}
                    </div>
                    {app.cancellation_reason && (
                      <p className="text-xs text-rose-600 italic">
                        Cancellation note: "{app.cancellation_reason}"
                      </p>
                    )}
                    {app.reschedule_notes && (
                      <p className="text-xs text-gold-700 italic">
                        Reschedule note: "{app.reschedule_notes}"
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {app.status === 'pending' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleApprove(app.id);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold flex items-center gap-1 cursor-pointer"
                        title="Approve client booking request"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Approve</span>
                      </button>
                    )}
                    {['approved', 'confirmed', 'rescheduled'].includes(app.status.toLowerCase()) && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenDoneModal(app);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-brand-50 hover:bg-brand-600 text-brand-700 hover:text-white border border-brand-200 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                        title="Mark appointment as completed / done"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Mark Done</span>
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenReschedule(app);
                      }}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-semibold cursor-pointer"
                    >
                      Reschedule
                    </button>
                    {app.status !== 'cancelled' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenCancel(app);
                        }}
                        className="px-3 py-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-semibold cursor-pointer"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Appointment Detail Drawer / Modal */}
      {selectedApp && !isCancelModalOpen && !isRescheduleModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getStatusBadge(
                    selectedApp.status
                  )}`}
                >
                  {selectedApp.status.toUpperCase()}
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-1">
                  Salon Appointment #{selectedApp.id}
                </h3>
              </div>
              <button
                onClick={() => setSelectedApp(null)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center gap-2 text-slate-700">
                <User className="w-4 h-4 text-slate-400" />
                <span className="font-bold text-sm text-slate-900">
                  {selectedApp.client_name || selectedApp.patient_name}
                </span>
              </div>

              {(selectedApp.client_phone || selectedApp.patient_phone) && (
                <div className="flex items-center gap-2 text-slate-600">
                  <Phone className="w-4 h-4 text-slate-400" />
                  <span>{selectedApp.client_phone || selectedApp.patient_phone}</span>
                </div>
              )}

              {(selectedApp.client_email || selectedApp.patient_email) && (
                <div className="flex items-center gap-2 text-slate-600">
                  <Mail className="w-4 h-4 text-slate-400" />
                  <span>{selectedApp.client_email || selectedApp.patient_email}</span>
                </div>
              )}

              <div className="flex items-center gap-2 text-slate-600">
                <CalendarIcon className="w-4 h-4 text-brand-600" />
                <span>
                  {selectedApp.appointment_date} at {selectedApp.appointment_time}
                </span>
              </div>

              <div className="flex items-center gap-2 text-slate-600">
                <Sparkles className="w-4 h-4 text-gold-500" />
                <span>Stylist: {selectedApp.stylist_name || selectedApp.doctor_name}</span>
              </div>

              {(selectedApp.service_name || selectedApp.service?.name) && (
                <div className="flex items-center gap-2 text-slate-700">
                  <Sparkles className="w-4 h-4 text-brand-600" />
                  <span className="font-semibold text-brand-900">
                    Service: {selectedApp.service_name || selectedApp.service?.name}
                    {selectedApp.service?.price && (
                      <span className="text-gold-600 ml-1">
                        (₹{selectedApp.service.price})
                      </span>
                    )}
                  </span>
                </div>
              )}

              {selectedApp.notes && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
                  <p className="font-semibold text-slate-700">Client Note:</p>
                  <p className="text-slate-500 mt-0.5">{selectedApp.notes}</p>
                </div>
              )}

              {selectedApp.cancellation_reason && (
                <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-rose-700">
                  <p className="font-bold">Cancellation Reason:</p>
                  <p className="mt-0.5">{selectedApp.cancellation_reason}</p>
                </div>
              )}

              {selectedApp.completed_by && (
                <div className="p-3 bg-gold-50 rounded-xl border border-gold-200 text-gold-900">
                  <p className="font-bold flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-gold-600" />
                    <span>Service Completed By:</span>
                  </p>
                  <p className="mt-0.5 font-semibold">{selectedApp.completed_by}</p>
                </div>
              )}

              {selectedApp.reschedule_notes && (
                <div className="p-3 bg-gold-50 rounded-xl border border-gold-200 text-gold-900">
                  <p className="font-bold">Reschedule Record:</p>
                  <p className="mt-0.5">{selectedApp.reschedule_notes}</p>
                </div>
              )}
            </div>

            {/* Actions Toolbar */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              {selectedApp.status === 'pending' && (
                <button
                  onClick={() => handleApprove(selectedApp.id)}
                  disabled={actionLoading}
                  className="px-3.5 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Approve Request</span>
                </button>
              )}
              {['approved', 'confirmed', 'rescheduled'].includes(selectedApp.status.toLowerCase()) && (
                <button
                  onClick={() => handleOpenDoneModal(selectedApp)}
                  disabled={actionLoading}
                  className="px-3.5 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  title="Mark appointment as completed / done"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Mark as Done</span>
                </button>
              )}
              <button
                onClick={() => handleOpenReschedule(selectedApp)}
                className="px-3.5 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-xs cursor-pointer"
              >
                Reschedule
              </button>
              {selectedApp.status !== 'cancelled' && (
                <button
                  onClick={() => handleOpenCancel(selectedApp)}
                  className="px-3.5 py-2 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 font-semibold text-xs cursor-pointer"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Cancel Appointment Modal */}
      {isCancelModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5 text-rose-600">
                <AlertTriangle className="w-4 h-4" />
                <span>Cancel Salon Appointment</span>
              </h3>
              <button
                onClick={() => setIsCancelModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Please enter the administrative reason for cancelling the appointment for{' '}
              <strong className="text-slate-800">
                {selectedApp?.client_name || selectedApp?.patient_name}
              </strong>:
            </p>

            {modalError && (
              <div className="p-2.5 rounded-lg bg-rose-50 text-rose-700 text-xs">
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
                className="w-full p-2.5 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsCancelModalOpen(false)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold cursor-pointer"
              >
                Keep Appointment
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                disabled={actionLoading}
                className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs cursor-pointer disabled:opacity-50"
              >
                {actionLoading ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reschedule Appointment Modal */}
      {isRescheduleModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5 text-brand-700">
                <Clock className="w-4 h-4 text-brand-600" />
                <span>Reschedule Salon Appointment</span>
              </h3>
              <button
                onClick={() => setIsRescheduleModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Select a new date and time for{' '}
              <strong className="text-slate-800">
                {selectedApp?.client_name || selectedApp?.patient_name}
              </strong> with{' '}
              <strong className="text-slate-800">
                {selectedApp?.stylist_name || selectedApp?.doctor_name}
              </strong>:
            </p>

            {modalError && (
              <div className="p-2.5 rounded-lg bg-rose-50 text-rose-700 text-xs">
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
                  value={rescheduleNotes}
                  onChange={(e) => setRescheduleNotes(e.target.value)}
                  placeholder="e.g. Client requested afternoon slot for bridal trial"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsRescheduleModalOpen(false)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReschedule}
                disabled={actionLoading || !rescheduleDaySchedule.isOpen || selectableRescheduleSlots.filter((s) => s.available).length === 0}
                className="px-3 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-xs cursor-pointer disabled:opacity-50"
              >
                {actionLoading ? 'Validating...' : 'Update Schedule'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Book Appointment Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-gold-500" />
                  <span>Book New Salon Client Appointment</span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Manual admin booking with automated chair capacity and slot collision checks.
                </p>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalError && (
              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleCreateAppointment} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Client Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={createFormData.client_name}
                  onChange={(e) =>
                    setCreateFormData({ ...createFormData, client_name: e.target.value })
                  }
                  placeholder="e.g. Tara Singhania"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Client Phone
                  </label>
                  <input
                    type="text"
                    value={createFormData.client_phone}
                    onChange={(e) =>
                      setCreateFormData({ ...createFormData, client_phone: e.target.value })
                    }
                    placeholder="9988776655"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Stylist / Beautician *</label>
                  <select
                    value={createFormData.doctor_name}
                    onChange={(e) =>
                      setCreateFormData({ ...createFormData, doctor_name: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none bg-white font-medium"
                  >
                    {staff.map((st) => (
                      <option key={st.id} value={st.name}>
                        {st.name} {st.specialty ? `(${st.specialty})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 1. SERVICE SELECTION FIELD (DROPDOWN & MULTISELECT) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">
                    Salon Service(s) Opted For *
                  </label>
                  {selectedServiceIds.length > 0 && (
                    <span className="text-[11px] font-semibold text-brand-700 bg-brand-50 px-2 py-0.5 rounded-full border border-brand-200">
                      {selectedServiceIds.length} chosen • ₹
                      {services
                        .filter((s) => selectedServiceIds.includes(s.id))
                        .reduce((sum, s) => sum + (s.price || 0), 0)}{' '}
                      •{' '}
                      {services
                        .filter((s) => selectedServiceIds.includes(s.id))
                        .reduce((sum, s) => sum + (s.min_duration_minutes || s.duration_min || 30), 0)}{' '}
                      mins
                    </span>
                  )}
                </div>

                {/* Selected Service Badges */}
                {selectedServiceIds.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2 p-2 bg-slate-50 rounded-xl border border-slate-200 max-h-24 overflow-y-auto">
                    {services
                      .filter((s) => selectedServiceIds.includes(s.id))
                      .map((srv) => (
                        <span
                          key={srv.id}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-brand-300 text-brand-900 text-xs font-medium shadow-2xs"
                        >
                          <span>{srv.name}</span>
                          <span className="text-gold-600 font-bold">₹{srv.price}</span>
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedServiceIds(selectedServiceIds.filter((id) => id !== srv.id))
                            }
                            className="text-slate-400 hover:text-rose-600 ml-0.5 cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                  </div>
                )}

                {/* Service Dropdown & Search Filter */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsServiceDropdownOpen(!isServiceDropdownOpen)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none bg-white flex items-center justify-between text-left cursor-pointer hover:border-brand-400 transition-colors"
                  >
                    <span className="text-slate-700 truncate font-medium">
                      {selectedServiceIds.length === 0
                        ? 'Select salon services (e.g. Gel manicures, Facial, Pedicure)...'
                        : `+ Add / Modify Salon Services (${selectedServiceIds.length} selected)`}
                    </span>
                    <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 ml-2" />
                  </button>

                  {isServiceDropdownOpen && (
                    <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-2 max-h-60 overflow-y-auto space-y-1">
                      <div className="sticky top-0 bg-white pb-1.5 pt-0.5 px-1 border-b border-slate-100 flex items-center gap-2">
                        <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <input
                          type="text"
                          value={serviceSearch}
                          onChange={(e) => setServiceSearch(e.target.value)}
                          placeholder="Search salon services by name or category..."
                          className="w-full text-xs outline-none bg-transparent"
                          autoFocus
                        />
                        {serviceSearch && (
                          <button
                            type="button"
                            onClick={() => setServiceSearch('')}
                            className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>

                      <div className="pt-1 space-y-0.5">
                        {services
                          .filter((srv) =>
                            srv.name.toLowerCase().includes(serviceSearch.toLowerCase()) ||
                            (srv.category && srv.category.toLowerCase().includes(serviceSearch.toLowerCase()))
                          )
                          .map((srv) => {
                            const isChecked = selectedServiceIds.includes(srv.id);
                            return (
                              <div
                                key={srv.id}
                                onClick={() => {
                                  if (isChecked) {
                                    setSelectedServiceIds(selectedServiceIds.filter((id) => id !== srv.id));
                                  } else {
                                    setSelectedServiceIds([...selectedServiceIds, srv.id]);
                                  }
                                }}
                                className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs cursor-pointer transition-colors ${
                                  isChecked
                                    ? 'bg-brand-50 text-brand-900 font-semibold'
                                    : 'hover:bg-slate-50 text-slate-700'
                                }`}
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    readOnly
                                    className="rounded border-slate-300 text-brand-600 focus:ring-brand-500 pointer-events-none"
                                  />
                                  <div className="truncate">
                                    <span className="truncate">{srv.name}</span>
                                    {srv.category && (
                                      <span className="ml-1.5 text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                                        {srv.category}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="text-right shrink-0 ml-2">
                                  <span className="font-bold text-gold-600">₹{srv.price}</span>
                                  <span className="text-[10px] text-slate-400 ml-1">
                                    • {srv.min_duration_minutes || srv.duration_min || 30}m
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                      </div>

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between px-1">
                        <button
                          type="button"
                          onClick={() => setSelectedServiceIds([])}
                          className="text-[11px] text-slate-500 hover:text-slate-800 cursor-pointer"
                        >
                          Clear all
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsServiceDropdownOpen(false)}
                          className="px-2.5 py-1 bg-brand-600 hover:bg-brand-500 text-white text-[11px] font-semibold rounded-lg cursor-pointer"
                        >
                          Done
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 2 & 3. DATE PICKER (DISABLED PAST DATES) & DYNAMIC TIME SLOT FILTER */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Appointment Date *
                  </label>
                  <input
                    type="date"
                    required
                    min={todayStr}
                    value={createFormData.appointment_date}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val >= todayStr) {
                        setCreateFormData({ ...createFormData, appointment_date: val });
                      }
                    }}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Past dates disabled ({todayStr} onwards)</p>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">Time Slot *</label>
                    {createFormData.appointment_date === todayStr && selectedDaySchedule.isOpen && (
                      <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded font-medium">
                        Past slots hidden
                      </span>
                    )}
                  </div>
                  <select
                    value={createFormData.appointment_time}
                    onChange={(e) =>
                      setCreateFormData({ ...createFormData, appointment_time: e.target.value })
                    }
                    disabled={!selectedDaySchedule.isOpen}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none bg-white font-medium disabled:bg-slate-100 disabled:text-slate-400"
                  >
                    {!selectedDaySchedule.isOpen ? (
                      <option value="" disabled>
                        Salon closed on {selectedDaySchedule.dayName || 'this day'}s
                      </option>
                    ) : selectableSlots.length === 0 ? (
                      <option value="" disabled>
                        No remaining slots on this date
                      </option>
                    ) : (
                      selectableSlots.map((item) => (
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
                  {selectedDaySchedule.isOpen && selectableSlots.filter((s) => s.available).length === 0 && (
                    <p className="text-[11px] text-rose-600 mt-1 flex items-center gap-1 font-medium">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>No available slots on this date. Please select another date or stylist.</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Day-Specific Working Hours & Schedule Indicator */}
              {createFormData.appointment_date && (
                <div>
                  {selectedDaySchedule.isOpen ? (
                    <div className="px-3 py-2 bg-emerald-50 border border-emerald-200/80 rounded-xl text-[11px] flex items-center justify-between text-emerald-800">
                      <span className="font-semibold flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{selectedDaySchedule.dayName} Hours: {selectedDaySchedule.openTime} – {selectedDaySchedule.closeTime}</span>
                      </span>
                      {selectedDaySchedule.breakStart && selectedDaySchedule.breakEnd && (
                        <span className="text-[10px] text-emerald-700 bg-emerald-100/90 px-2 py-0.5 rounded-md font-semibold">
                          Break: {selectedDaySchedule.breakStart} – {selectedDaySchedule.breakEnd}
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>The salon is closed on {selectedDaySchedule.dayName}s according to the weekly operating schedule. Please choose an open day.</span>
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Special Requests / Salon Notes</label>
                <input
                  type="text"
                  value={createFormData.notes}
                  onChange={(e) =>
                    setCreateFormData({ ...createFormData, notes: e.target.value })
                  }
                  placeholder="e.g. Prefers organic products, bridal trial..."
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading || !selectedDaySchedule.isOpen || selectableSlots.filter((s) => s.available).length === 0}
                  className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {actionLoading ? 'Booking...' : 'Book Client Appointment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MARK AS DONE (SERVICE COMPLETED) MODAL                                    */}
      {/* ========================================================================= */}
      {isDoneModalOpen && doneApp && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl border border-slate-200 animate-scale-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5 text-brand-700">
                <CheckCircle2 className="w-4 h-4 text-brand-600" />
                <span>Mark Salon Appointment as Done</span>
              </h3>
              <button
                onClick={() => setIsDoneModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Appointment Brief */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900">
                  {doneApp.client_name || doneApp.patient_name}
                </span>
                <span className="text-[10px] font-bold text-slate-500 font-mono">#{doneApp.id}</span>
              </div>
              <p className="text-slate-600">
                <span className="font-semibold text-slate-700">Scheduled:</span> {doneApp.appointment_date} at {doneApp.appointment_time}
              </p>
              <p className="text-slate-600">
                <span className="font-semibold text-slate-700">Stylist Assigned:</span> {doneApp.stylist_name || doneApp.doctor_name}
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
                  value={doneCompletedBy}
                  onChange={(e) => setDoneCompletedBy(e.target.value)}
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
                  {(doneApp.stylist_name || doneApp.doctor_name) &&
                    !staff.some((s) => s.name.toLowerCase() === (doneApp.stylist_name || doneApp.doctor_name).toLowerCase()) &&
                    (!user || user.full_name !== (doneApp.stylist_name || doneApp.doctor_name)) && (
                      <option value={doneApp.stylist_name || doneApp.doctor_name}>
                        {doneApp.stylist_name || doneApp.doctor_name} (Attending Stylist)
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
                  Completion Remarks / Notes (Optional)
                </label>
                <input
                  type="text"
                  value={doneNotes}
                  onChange={(e) => setDoneNotes(e.target.value)}
                  placeholder="e.g. Styling complete; client delighted with finish"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsDoneModalOpen(false)}
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
