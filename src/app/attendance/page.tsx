'use client';

import React, { useState } from 'react';
import { useUser } from '@/context/UserContext';
import { useData } from '@/context/DataContext';
import { Building, Smartphone, MapPin, AlertCircle } from 'lucide-react';

export default function AttendancePage() {
  const { currentUser } = useUser();
  const { attendances, clockIn, clockOut } = useData();

  const [locationMode, setLocationMode] = useState<'OFFICE' | 'REMOTE' | 'GPS'>('OFFICE');
  const [gpsCoords, setGpsCoords] = useState<string>('');
  const [gpsError, setGpsError] = useState<string>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const todayAtt = attendances.find(
    (a) =>
      a.userId === currentUser?.id &&
      new Date(a.date).toDateString() === new Date().toDateString()
  );

  const handleModeChange = (mode: 'OFFICE' | 'REMOTE' | 'GPS') => {
    setLocationMode(mode);
    setGpsError('');
    if (mode === 'GPS') {
      if (typeof window !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const lat = position.coords.latitude.toFixed(5);
            const lng = position.coords.longitude.toFixed(5);
            setGpsCoords(`GPS (${lat}, ${lng})`);
          },
          (err) => {
            setGpsError('Geolocation denied or unavailable. Falling back to default GPS mode.');
            setGpsCoords('GPS (Location Denied)');
          }
        );
      } else {
        setGpsCoords('GPS (Not Supported)');
      }
    } else {
      setGpsCoords('');
    }
  };

  const handleClockIn = () => {
    const finalMode = locationMode === 'GPS' ? (gpsCoords || 'GPS') : locationMode;
    clockIn(currentUser?.id || 'u-system', finalMode as any);
  };

  const filteredAttendances = attendances.filter((a) => {
    if (startDate !== '') {
      const attTime = new Date(a.date).getTime();
      const startTime = new Date(startDate).getTime();
      if (isNaN(attTime) || attTime < startTime) return false;
    }
    if (endDate !== '') {
      const attTime = new Date(a.date).getTime();
      const endTime = new Date(endDate + 'T23:59:59.999Z').getTime();
      if (isNaN(attTime) || attTime > endTime) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6 text-neutral-900 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900 flex items-center gap-2">
            Attendance & Work Hours <span className="text-xs font-mono bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-full border border-neutral-200">GPS & Office Modes</span>
          </h1>
          <p className="text-xs text-neutral-500 font-medium">Clock in/out tracking with automated working hours & late detection.</p>
        </div>
      </div>

      {/* Clock widget */}
      <div className="bg-white p-8 rounded-2xl border border-neutral-200/80 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xs select-none">
        <div className="space-y-2 text-center md:text-left">
          <span className="text-xs font-mono text-neutral-500 font-bold uppercase tracking-wider">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </span>
          <h2 className="text-xl font-bold text-neutral-900">
            Attendance Status for {currentUser?.name}
          </h2>
          <p className="text-xs text-neutral-500">
            Current Status:{' '}
            <span className="font-bold text-neutral-900">
              {todayAtt ? (todayAtt.clockOut ? 'Clocked Out' : 'Active Working') : 'Not Clocked In'}
            </span>
          </p>
          {locationMode === 'GPS' && gpsCoords && (
            <p className="text-[11px] text-emerald-700 font-mono font-bold flex items-center gap-1">
              📍 Coordinates verified: {gpsCoords}
            </p>
          )}
          {gpsError && (
            <p className="text-[11px] text-red-600 flex items-center gap-1 font-semibold">
              <AlertCircle className="w-3.5 h-3.5" /> {gpsError}
            </p>
          )}
        </div>

        <div className="flex flex-col items-center gap-3">
          {/* Location Mode Selector */}
          <div className="flex items-center gap-1 bg-neutral-50 p-1.5 rounded-xl border border-neutral-200 text-xs">
            <button
              onClick={() => handleModeChange('OFFICE')}
              className={`px-3 py-1 rounded-lg flex items-center gap-1.5 transition ${
                locationMode === 'OFFICE' ? 'bg-neutral-900 text-white font-semibold' : 'text-neutral-500'
              }`}
            >
              <Building className="w-3.5 h-3.5" /> Office
            </button>
            <button
              onClick={() => handleModeChange('REMOTE')}
              className={`px-3 py-1 rounded-lg flex items-center gap-1.5 transition ${
                locationMode === 'REMOTE' ? 'bg-neutral-900 text-white font-semibold' : 'text-neutral-505'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" /> Remote
            </button>
            <button
              onClick={() => handleModeChange('GPS')}
              className={`px-3 py-1 rounded-lg flex items-center gap-1.5 transition ${
                locationMode === 'GPS' ? 'bg-neutral-900 text-white font-semibold' : 'text-neutral-505'
              }`}
            >
              <MapPin className="w-3.5 h-3.5" /> GPS Verified
            </button>
          </div>

          {/* Main Clock Button */}
          {!todayAtt ? (
            <button
              onClick={handleClockIn}
              className="bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs px-8 py-2.5 rounded-lg shadow-xs transition"
            >
              Clock In Now
            </button>
          ) : !todayAtt.clockOut ? (
            <button
              onClick={() => clockOut(currentUser?.id || 'u-system')}
              className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs px-8 py-2.5 rounded-lg shadow-xs transition animate-pulse"
            >
              Clock Out Now
            </button>
          ) : (
            <div className="p-2.5 bg-neutral-50 border border-neutral-200 rounded-lg text-xs text-neutral-700 text-center font-mono font-bold">
              ✅ Work Shift Completed ({todayAtt.workingHours} hrs)
            </div>
          )}
        </div>
      </div>

      {/* Attendance History Table */}
      <div className="bg-white rounded-2xl border border-neutral-200/80 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-neutral-100 flex flex-wrap items-center justify-between gap-4 font-bold text-xs text-neutral-900">
          <span>Recent Agency Attendance Records</span>
          
          <div className="flex flex-wrap items-center gap-3 font-semibold text-[11px] text-neutral-605">
            {/* Start Date */}
            <div className="flex items-center gap-1">
              <span className="text-neutral-500 font-medium">Start:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-neutral-50 border border-neutral-200 rounded-lg px-2 py-0.5 text-neutral-800 focus:outline-hidden font-mono"
              />
            </div>

            {/* End Date */}
            <div className="flex items-center gap-1">
              <span className="text-neutral-500 font-medium">End:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-neutral-50 border border-neutral-200 rounded-lg px-2 py-0.5 text-neutral-800 focus:outline-hidden font-mono"
              />
            </div>

            {(startDate !== '' || endDate !== '') && (
              <button
                onClick={() => {
                  setStartDate('');
                  setEndDate('');
                }}
                className="text-red-500 hover:text-red-700 font-semibold"
              >
                Clear
              </button>
            )}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap">
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
              {filteredAttendances.map((a) => (
                <tr key={a.id} className="hover:bg-neutral-50 transition">
                  <td className="px-4 py-3 font-semibold text-neutral-900">{a.userName || 'Unknown User'}</td>
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
                  <td className="px-4 py-3 font-mono text-neutral-600 font-bold">{a.locationMode}</td>
                  <td className="px-4 py-3 font-mono font-bold text-neutral-900">{a.workingHours} hrs</td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
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
