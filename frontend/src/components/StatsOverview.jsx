import React from 'react';
import { Calendar, Users, Stethoscope, Clock } from 'lucide-react';

export default function StatsOverview({ stats, appointmentsCount }) {
  const total = stats?.total_appointments ?? appointmentsCount ?? 0;
  const today = stats?.today_appointments ?? 0;
  const amitCount = stats?.doctor_counts?.['Dr. Amit Sharma'] ?? 0;
  const nehaCount = stats?.doctor_counts?.['Dr. Neha Verma'] ?? 0;

  const cards = [
    {
      title: 'Total Bookings',
      value: total,
      sub: 'All-time appointments',
      icon: Users,
      color: 'text-sky-600',
      bg: 'bg-sky-50',
      border: 'border-sky-100',
    },
    {
      title: "Today's Schedule",
      value: today,
      sub: 'Scheduled for today',
      icon: Calendar,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
      border: 'border-emerald-100',
    },
    {
      title: 'Dr. Amit Sharma',
      value: amitCount,
      sub: 'Orthopedic Surgeon (10am-2pm)',
      icon: Stethoscope,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
      border: 'border-indigo-100',
    },
    {
      title: 'Dr. Neha Verma',
      value: nehaCount,
      sub: 'General Physician (5pm-9pm)',
      icon: Clock,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      border: 'border-amber-100',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex items-start justify-between"
          >
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                {card.title}
              </p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">
                {card.value}
              </h3>
              <p className="text-xs text-slate-500 mt-1">{card.sub}</p>
            </div>
            <div className={`p-3 rounded-xl ${card.bg} ${card.color} ${card.border} border`}>
              <Icon className="w-5 h-5" />
            </div>
          </div>
        );
      })}
    </div>
  );
}
