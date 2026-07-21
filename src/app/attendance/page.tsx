'use client';

import React, { useState } from 'react';
import { useUser } from '@/context/UserContext';
import { useData } from '@/context/DataContext';
import { Building, Smartphone, MapPin } from 'lucide-react';

export default function AttendancePage() {
  const { currentUser } = useUser();
  const { attendances, clockIn, clockOut } = useData();

  const [locationMode, setLocationMode] = useState<'OFFICE' | 'REMOTE' | 'GPS'>('OFFICE');

  const todayAtt = attendances.find(
    (a) =>
      a.userId === currentUser.id &&
      new Date(a.date).toDateString() === new Date().toDateString()
  );

  return (
    <div className="space-y-6 animate-fadeIn text-neutral-900">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900 flex items-center gap-2">
            Attendance & Work Hours <span className="text-xs font-mono bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-full border border-neutral-200">GPS & Office Modes</span>
          </h1>
          <p className="text-xs text-neutral-500">Clock in/out tracking with automated working hours & late detection.</p>
        </div>
      </div>

      {/* Clock In / Out Action Widget */}
      <div className="bg-white p-8 rounded-2xl border border-neutral-200/80 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xs">
        <div className="space-y-2">
          <span className="text-xs font-mono text-neutral-500 font-semibold uppercase tracking-wider">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </span>
          <h2 className="text-xl font-bold text-neutral-900">
            Attendance Status for {currentUser.name}
          </h2>
          <p className="text-xs text-neutral-500">
            Current Status:{' '}
            <span className="font-semibold text-neutral-900">
              {todayAtt ? (todayAtt.clockOut ? 'Clocked Out' : 'Active Working') : 'Not Clocked In'}
            </span>
          </p>
        </div>

        <div className="flex flex-col items-center gap-3">
          {/* Location Mode Selector */}
          <div className="flex items-center gap-1 bg-neutral-50 p-1.5 rounded-xl border border-neutral-200 text-xs">
            <button
              onClick={() => setLocationMode('OFFICE')}
              className={`px-3 py-1 rounded-lg flex items-center gap-1.5 transition ${
                locationMode === 'OFFICE' ? 'bg-neutral-900 text-white font-semibold' : 'text-neutral-600'
              }`}
            >
              <Building className="w-3.5 h-3.5" /> Office
            </button>
            <button
              onClick={() => setLocationMode('REMOTE')}
              className={`px-3 py-1 rounded-lg flex items-center gap-1.5 transition ${
                locationMode === 'REMOTE' ? 'bg-neutral-900 text-white font-semibold' : 'text-neutral-600'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" /> Remote
            </button>
            <button
              onClick={() => setLocationMode('GPS')}
              className={`px-3 py-1 rounded-lg flex items-center gap-1.5 transition ${
                locationMode === 'GPS' ? 'bg-neutral-900 text-white font-semibold' : 'text-neutral-600'
              }`}
            >
              <MapPin className="w-3.5 h-3.5" /> GPS Verified
            </button>
          </div>

          {/* Main Clock Button */}
          {!todayAtt ? (
            <button
              onClick={() => clockIn(currentUser.id, locationMode)}
              className="bg-neutral-900 hover:bg-neutral-800 text-white font-semibold text-xs px-8 py-2.5 rounded-lg shadow-xs transition"
            >
              Clock In Now
            </button>
          ) : !todayAtt.clockOut ? (
            <button
              onClick={() => clockOut(currentUser.id)}
              className="bg-red-600 hover:bg-red-700 text-white font-semibold text-xs px-8 py-2.5 rounded-lg shadow-xs transition"
            >
              Clock Out Now
            </button>
          ) : (
            <div className="p-2.5 bg-neutral-50 border border-neutral-200 rounded-lg text-xs text-neutral-700 text-center font-mono">
              ✅ Work Shift Completed ({todayAtt.workingHours} hrs)
            </div>
          )}
        </div>
      </div>

      {/* Attendance History Table */}
      <div className="bg-white rounded-2xl border border-neutral-200/80 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-neutral-100 font-semibold text-xs text-neutral-900">
          Recent Agency Attendance Records
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50 text-neutral-500 font-semibold uppercase tracking-wider border-b border-neutral-200">
              <tr>
                <th className="px-4 py-3">Employee</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Clock In</th>
                <th className="px-4 py-3">Clock Out</th>
                <th className="px-4 py-3">Location Mode</th>
                <th className="px-4 py-3">Working Hours</th>
                <th className="px-4 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 text-neutral-700">
              {attendances.map((a) => (
                <tr key={a.id} className="hover:bg-neutral-50 transition">
                  <td className="px-4 py-3 font-semibold text-neutral-900">{a.userName}</td>
                  <td className="px-4 py-3 font-mono text-neutral-500">
                    {new Date(a.date).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 font-mono text-neutral-900">
                    {new Date(a.clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="px-4 py-3 font-mono text-neutral-700">
                    {a.clockOut
                      ? new Date(a.clockOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : 'Active'}
                  </td>
                  <td className="px-4 py-3 font-mono text-neutral-600">{a.locationMode}</td>
                  <td className="px-4 py-3 font-mono font-bold text-neutral-900">{a.workingHours} hrs</td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full ${
                        a.status === 'ON_TIME'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : 'bg-red-50 text-red-800 border border-red-200'
                      }`}
                    >
                      {a.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
