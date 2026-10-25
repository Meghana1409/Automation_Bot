import React from 'react';
import { Stethoscope, Clock, CheckCircle2, UserPlus, PhoneCall, Award } from 'lucide-react';

export default function DoctorDirectory({ onBookWithDoctor, stats }) {
  const doctors = [
    {
      name: 'Dr. Amit Sharma',
      role: 'Consultant Orthopedic Surgeon',
      experience: '14+ Years Experience',
      timings: 'Monday - Saturday: 10:00 AM to 02:00 PM',
      specialties: [
        'Bone & Joint Pain (Haddiyon aur Jodon ka dard)',
        'Fracture Management',
        'Arthritis & Knee Pain',
        'Spine & Chronic Back Pain',
      ],
      color: 'indigo',
      slots: ['10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM', '12:00 PM', '12:30 PM', '01:00 PM', '01:30 PM'],
    },
    {
      name: 'Dr. Neha Verma',
      role: 'Senior General Physician',
      experience: '10+ Years Experience',
      timings: 'Monday - Saturday: 05:00 PM to 09:00 PM',
      specialties: [
        'Viral Fever, Cold & Cough',
        'Diabetes & Blood Pressure Management',
        'Stomach Infections & Digestive Care',
        'General Health Consultations',
      ],
      color: 'amber',
      slots: ['05:00 PM', '05:30 PM', '06:00 PM', '06:30 PM', '07:00 PM', '07:30 PM', '08:00 PM', '08:30 PM'],
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-bold text-slate-900">Medical Specialists & Duty Hours</h2>
        <p className="text-xs text-slate-500">
          Our clinic doctors and their designated consultation timings.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {doctors.map((doc) => {
          const count = stats?.doctor_counts?.[doc.name] ?? 0;
          return (
            <div
              key={doc.name}
              className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3.5">
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-white text-base shadow-sm ${
                        doc.color === 'indigo' ? 'bg-indigo-600' : 'bg-amber-600'
                      }`}
                    >
                      <Stethoscope className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900">{doc.name}</h3>
                      <p className="text-xs font-medium text-slate-500">{doc.role}</p>
                    </div>
                  </div>
                  <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
                    {count} Booked
                  </span>
                </div>

                {/* Timings */}
                <div className="mt-4 p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center space-x-2 text-xs text-slate-700">
                  <Clock className="w-4 h-4 text-sky-600 shrink-0" />
                  <span className="font-semibold">{doc.timings}</span>
                </div>

                {/* Specialties */}
                <div className="mt-4 space-y-1.5">
                  <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Treatments & Specialties:
                  </p>
                  <ul className="space-y-1 text-xs text-slate-600">
                    {doc.specialties.map((spec, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span>{spec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Action */}
              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">Available Monday to Saturday</span>
                <button
                  onClick={() => onBookWithDoctor(doc.name)}
                  className="inline-flex items-center space-x-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white transition-colors"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Book Slot</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
