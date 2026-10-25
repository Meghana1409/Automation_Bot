/**
 * Schedule & Dynamic Time Slot Utilities
 * Strictly respects day-specific open, close, and break hours configured in the Working Hours module.
 */

export const STANDARD_SLOTS = [
  '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
  '12:00 PM', '12:30 PM', '01:00 PM', '01:30 PM', '02:00 PM', '02:30 PM',
  '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM', '05:00 PM', '05:30 PM',
  '06:00 PM', '06:30 PM', '07:00 PM', '07:30 PM', '08:00 PM',
];

export const parseSlotMinutes = (timeStr) => {
  if (!timeStr) return null;
  const t = timeStr.trim().toUpperCase();
  const match12 = t.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (match12) {
    let h = parseInt(match12[1], 10);
    const m = parseInt(match12[2], 10);
    const period = match12[3] ? match12[3].toUpperCase() : null;
    if (period === 'PM' && h < 12) h += 12;
    if (period === 'AM' && h === 12) h = 0;
    return h * 60 + m;
  }
  const match24 = t.match(/^(\d{1,2}):(\d{2})$/);
  if (match24) {
    return parseInt(match24[1], 10) * 60 + parseInt(match24[2], 10);
  }
  return null;
};

export const formatMinutesToSlot = (mins) => {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const ampm = h < 12 ? 'AM' : 'PM';
  let displayH = h % 12;
  if (displayH === 0) displayH = 12;
  return `${String(displayH).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`;
};

/**
 * Resolves day-of-week schedule for a given YYYY-MM-DD date.
 * Backend WorkingHours model uses day_of_week: 0=Monday .. 6=Sunday.
 * JS Date.getDay() uses 0=Sunday .. 6=Saturday.
 */
export const getDaySchedule = (dateStr, workingHours = []) => {
  if (!dateStr) {
    return {
      isOpen: true,
      dayName: '',
      openTime: '09:00',
      closeTime: '20:00',
      breakStart: '13:00',
      breakEnd: '14:00',
    };
  }

  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    const jsDay = dt.getDay(); // 0=Sunday, 1=Monday... 6=Saturday
    const backendDow = jsDay === 0 ? 6 : jsDay - 1; // 0=Monday... 6=Sunday
    const dayName = dt.toLocaleDateString('en-US', { weekday: 'long' });

    const wh = (workingHours || []).find((h) => h.day_of_week === backendDow);
    if (!wh) {
      return {
        isOpen: true,
        dayName,
        openTime: '09:00',
        closeTime: '20:00',
        breakStart: '13:00',
        breakEnd: '14:00',
      };
    }

    return {
      isOpen: Boolean(wh.is_open),
      dayName: wh.day_name || dayName,
      openTime: wh.open_time || '09:00',
      closeTime: wh.close_time || '20:00',
      breakStart: wh.break_start || '',
      breakEnd: wh.break_end || '',
    };
  } catch (err) {
    console.error('Error resolving day schedule:', err);
    return {
      isOpen: true,
      dayName: '',
      openTime: '09:00',
      closeTime: '20:00',
      breakStart: '',
      breakEnd: '',
    };
  }
};

/**
 * Generates available candidate slot strings strictly within the day's open and close hours.
 * Excludes break hours and slots after the closing time.
 */
export const generateSlotsForDate = (dateStr, workingHours = []) => {
  if (!dateStr) return STANDARD_SLOTS;

  const schedule = getDaySchedule(dateStr, workingHours);
  if (!schedule.isOpen) {
    return []; // Salon is closed on this day
  }

  const openMins = parseSlotMinutes(schedule.openTime) ?? 540; // 09:00 AM
  const closeMins = parseSlotMinutes(schedule.closeTime) ?? 1200; // 08:00 PM
  const bStart = schedule.breakStart ? parseSlotMinutes(schedule.breakStart) : null;
  const bEnd = schedule.breakEnd ? parseSlotMinutes(schedule.breakEnd) : null;

  const slots = [];
  let curr = openMins;
  // Strictly respects closing time: curr <= closeMins. No slots generated after close time.
  while (curr <= closeMins) {
    // Exclude break hours [bStart, bEnd)
    if (bStart !== null && bEnd !== null && curr >= bStart && curr < bEnd) {
      curr += 30;
      continue;
    }
    slots.push(formatMinutesToSlot(curr));
    curr += 30;
  }

  return slots;
};
