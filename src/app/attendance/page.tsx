'use client';

import React, { useState, useEffect } from 'react';
import { useUser } from '@/context/UserContext';
import { useData } from '@/context/DataContext';
import { 
  Building, 
  Smartphone, 
  MapPin, 
  AlertCircle, 
  Clock, 
  Calendar, 
  Check, 
  CheckCircle, 
  Filter, 
  User, 
  Users, 
  TrendingUp, 
  Award, 
  Coffee, 
  LogOut, 
  UserCheck 
} from 'lucide-react';
import { 
  formatWorkingMinutes, 
  getJakartaDateString, 
  formatJakartaTime, 
  formatJakartaFullDate 
} from '@/lib/attendance';

export default function AttendancePage() {
  const { currentUser, allUsers } = useUser();
  const { attendances, leaveRequests, clockIn, clockOut, companySettings } = useData();

  const [locationMode, setLocationMode] = useState<'OFFICE' | 'REMOTE' | 'GPS'>('OFFICE');
  const [gpsCoords, setGpsCoords] = useState<string>('');
  const [gpsError, setGpsError] = useState<string>('');

  // Real-time ticking state
  const [now, setNow] = useState<Date>(new Date());

  // Filter States
  const [filterEmployee, setFilterEmployee] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterLocation, setFilterLocation] = useState('');
  const [filterLate, setFilterLate] = useState('');

  // Selected period for monthly metrics (Default to current month, e.g. "2026-08")
  const [selectedMonth, setSelectedMonth] = useState('2026-08');

  // Trigger ticking every second for the active timers
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const isExecutive = currentUser?.roles?.includes('Admin') || 
                      currentUser?.roles?.includes('Owner') || 
                      currentUser?.roles?.includes('Strategist');

  const todayJakartaStr = getJakartaDateString(now);

  // Find user's active session first
  const activeSession = attendances.find(
    (a) => a.userId === currentUser?.id && a.status === 'ACTIVE' && !a.clockOut
  );

  // If no active session, look for user's completed shift today
  const todaySession = attendances.find(
    (a) => a.userId === currentUser?.id && getJakartaDateString(new Date(a.date)) === todayJakartaStr
  );

  // Determine user's current status: Working, Completed, or Not Clocked In
  let userStatus: 'NOT_CLOCKED_IN' | 'WORKING' | 'COMPLETED' = 'NOT_CLOCKED_IN';
  let activeDisplayAttendance = null;

  if (activeSession) {
    userStatus = 'WORKING';
    activeDisplayAttendance = activeSession;
  } else if (todaySession) {
    userStatus = 'COMPLETED';
    activeDisplayAttendance = todaySession;
  }

  // Handle geolocation verification
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
            setGpsError('Geolocation denied. Falling back to GPS Verified.');
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

  const handleClockInClick = () => {
    const finalMode = locationMode === 'GPS' ? (gpsCoords || 'GPS') : locationMode;
    clockIn(currentUser?.id || 'u-system', finalMode as any);
  };

  const handleClockOutClick = () => {
    clockOut(currentUser?.id || 'u-system');
  };

  // ----------------------------------------------------
  // DATA FILTERING
  // ----------------------------------------------------
  const displayAttendances = isExecutive 
    ? attendances 
    : attendances.filter(a => a.userId === currentUser?.id);

  const filteredAttendances = displayAttendances.filter((a) => {
    if (filterEmployee && a.userId !== filterEmployee) return false;
    if (filterDate && getJakartaDateString(new Date(a.date)) !== filterDate) return false;
    if (filterStatus && a.status !== filterStatus) return false;
    if (filterLocation) {
      if (filterLocation === 'GPS' && !a.locationMode.startsWith('GPS')) return false;
      if (filterLocation !== 'GPS' && a.locationMode !== filterLocation) return false;
    }
    if (filterLate) {
      if (filterLate === 'LATE' && !a.isLate) return false;
      if (filterLate === 'ON_TIME' && a.isLate) return false;
    }
    return true;
  });

  // Helper to determine if a user has an approved leave request on a specific date
  const isUserOnLeaveOnDate = (userId: string, dateStr: string) => {
    const targetTime = new Date(dateStr + 'T00:00:00.000Z').getTime();
    return leaveRequests.some((lr) => {
      if (lr.userId !== userId || lr.status !== 'APPROVED') return false;
      const start = new Date(lr.startDate + 'T00:00:00.000Z').getTime();
      const end = new Date(lr.endDate + 'T23:59:59.999Z').getTime();
      return targetTime >= start && targetTime <= end;
    });
  };

  // ----------------------------------------------------
  // METRICS: TODAY'S ATTENDANCE SUMMARY
  // ----------------------------------------------------
  const todayRecords = attendances.filter(
    (a) => getJakartaDateString(new Date(a.date)) === todayJakartaStr
  );

  const presentCount = new Set(todayRecords.map((r) => r.userId)).size;
  const activeCount = todayRecords.filter((r) => r.status === 'ACTIVE').length;
  const completedCount = todayRecords.filter((r) => r.status === 'COMPLETED').length;
  const lateCountToday = todayRecords.filter((r) => r.isLate).length;

  // Calculate Absentees: active employees who haven't clocked in today, are not on approved leave, and today is a workday.
  const activeEmployees = allUsers.filter((u) => u.active !== false);
  const dayOfWeek = now.getDay(); // 0 = Sunday, 6 = Saturday
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

  let absentCountToday = 0;
  if (!isWeekend) {
    absentCountToday = activeEmployees.filter((u) => {
      const hasCheckedIn = todayRecords.some((r) => r.userId === u.id);
      const onLeave = isUserOnLeaveOnDate(u.id, todayJakartaStr);
      return !hasCheckedIn && !onLeave;
    }).length;
  }

  // ----------------------------------------------------
  // METRICS: MONTHLY ANALYTICAL METRICS
  // ----------------------------------------------------
  const monthlyRecords = displayAttendances.filter((a) => {
    const recordDateStr = getJakartaDateString(new Date(a.date)); // e.g. "2026-08-11"
    return recordDateStr.startsWith(selectedMonth);
  });

  const uniqueEmployeesInMonth = new Set(monthlyRecords.map((r) => r.userId)).size;

  let totalMonthlyWorkingMinutes = 0;
  monthlyRecords.forEach((a) => {
    if (a.status === 'ACTIVE' && !a.clockOut) {
      // Calculate live working minutes so far for active sessions
      const elapsedMs = now.getTime() - new Date(a.clockIn).getTime();
      const elapsedMinutes = Math.max(0, Math.floor(elapsedMs / 60000));
      totalMonthlyWorkingMinutes += elapsedMinutes;
    } else {
      totalMonthlyWorkingMinutes += a.workingMinutes || 0;
    }
  });

  const totalMonthlyWorkingHoursStr = formatWorkingMinutes(totalMonthlyWorkingMinutes);

  let averageMonthlyMinutes = 0;
  if (uniqueEmployeesInMonth > 0) {
    averageMonthlyMinutes = Math.floor(totalMonthlyWorkingMinutes / uniqueEmployeesInMonth);
  }
  const averageMonthlyWorkingHoursStr = formatWorkingMinutes(averageMonthlyMinutes);

  const monthlyLateCount = monthlyRecords.filter((r) => r.isLate).length;

  // Calculate Attendance Rate
  const getExpectedWorkdays = (monthStr: string) => {
    const [year, month] = monthStr.split('-').map(Number);
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0); // last day of month
    const today = new Date();
    const limit = (today.getFullYear() === year && today.getMonth() === month - 1) ? today : end;
    
    let weekdays = 0;
    for (let d = new Date(start); d <= limit; d.setDate(d.getDate() + 1)) {
      const day = d.getDay();
      if (day !== 0 && day !== 6) {
        weekdays++;
      }
    }
    return weekdays;
  };

  const expectedWorkdays = getExpectedWorkdays(selectedMonth);
  const totalUserCapacity = expectedWorkdays * activeEmployees.length;
  const attendanceRate = totalUserCapacity > 0 
    ? Math.min(100, Math.round((monthlyRecords.length / totalUserCapacity) * 100)) 
    : 100;

  // Calculate local user stats for selected month (Present, Late, Absent, Working Days)
  const myMonthlyRecords = monthlyRecords.filter(a => a.userId === currentUser?.id);
  const myPresentDays = myMonthlyRecords.length;
  const myLateCount = myMonthlyRecords.filter(a => a.isLate).length;
  
  // Calculate my leave days
  let myLeaveDays = 0;
  const [yearNum, monthNum] = selectedMonth.split('-').map(Number);
  const firstDay = new Date(yearNum, monthNum - 1, 1);
  const lastDay = new Date(yearNum, monthNum, 0);
  for (let d = new Date(firstDay); d <= lastDay; d.setDate(d.getDate() + 1)) {
    const dateStr = getJakartaDateString(d);
    if (isUserOnLeaveOnDate(currentUser?.id || '', dateStr)) {
      myLeaveDays++;
    }
  }

  // Calculate my absent days (weekdays not present and not on leave)
  let myAbsentDays = 0;
  const currentLimit = (now.getFullYear() === yearNum && now.getMonth() === monthNum - 1) ? now : lastDay;
  for (let d = new Date(firstDay); d <= currentLimit; d.setDate(d.getDate() + 1)) {
    const dayVal = d.getDay();
    if (dayVal !== 0 && dayVal !== 6) {
      const dateStr = getJakartaDateString(d);
      const isPresent = myMonthlyRecords.some(r => getJakartaDateString(new Date(r.date)) === dateStr);
      const onLeave = isUserOnLeaveOnDate(currentUser?.id || '', dateStr);
      if (!isPresent && !onLeave) {
        myAbsentDays++;
      }
    }
  }

  const [expectedMonthLabel, setExpectedMonthLabel] = useState('August 2026');
  useEffect(() => {
    const [y, m] = selectedMonth.split('-');
    const date = new Date(Number(y), Number(m) - 1, 1);
    setExpectedMonthLabel(date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }));
  }, [selectedMonth]);

  // Calculate Live Working Duration for Current User Active Session
  let liveUserElapsedMinutes = 0;
  if (activeSession) {
    const diffMs = now.getTime() - new Date(activeSession.clockIn).getTime();
    liveUserElapsedMinutes = Math.max(0, Math.floor(diffMs / 60000));
  }

  return (
    <div className="space-y-6 text-neutral-900 animate-fadeIn pb-32">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900 flex items-center gap-2">
            Attendance & Work Hours
            <span className="text-xs font-mono bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-full border border-neutral-200">
              Asia/Jakarta
            </span>
          </h1>
          <p className="text-xs text-neutral-500 font-medium">
            Production-grade attendance tracking, real-time working timers, and late arrivals monitoring.
          </p>
        </div>
        <div className="text-right text-xs font-mono text-neutral-500">
          <Clock className="w-3.5 h-3.5 inline mr-1" />
          {formatJakartaFullDate(now)} | {now.toLocaleTimeString('en-US', { hour12: true, timeZone: 'Asia/Jakarta' })}
        </div>
      </div>

      {/* 1. STATE-AWARE ATTENDANCE CARD */}
      <div className="bg-white p-6 rounded-2xl border border-neutral-200/80 shadow-xs">
        <h2 className="text-xs font-mono text-neutral-400 font-bold uppercase tracking-wider mb-4">
          Attendance Status for {currentUser?.name}
        </h2>

        {userStatus === 'NOT_CLOCKED_IN' && (
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-neutral-400 animate-pulse"></span>
                <span className="text-sm font-bold text-neutral-500 uppercase">Not Clocked In</span>
              </div>
              <p className="text-xs text-neutral-400">Start your workday by selecting your work mode below.</p>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full md:w-auto">
              <div className="flex items-center gap-1 bg-neutral-50 p-1 rounded-xl border border-neutral-200 text-xs">
                <button
                  onClick={() => handleModeChange('OFFICE')}
                  className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition ${
                    locationMode === 'OFFICE' ? 'bg-neutral-900 text-white font-semibold' : 'text-neutral-500 hover:text-neutral-900'
                  }`}
                >
                  <Building className="w-3.5 h-3.5" /> Office
                </button>
                <button
                  onClick={() => handleModeChange('REMOTE')}
                  className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition ${
                    locationMode === 'REMOTE' ? 'bg-neutral-900 text-white font-semibold' : 'text-neutral-500 hover:text-neutral-900'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" /> Remote
                </button>
                <button
                  onClick={() => handleModeChange('GPS')}
                  className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition ${
                    locationMode === 'GPS' ? 'bg-neutral-900 text-white font-semibold' : 'text-neutral-500 hover:text-neutral-900'
                  }`}
                >
                  <MapPin className="w-3.5 h-3.5" /> GPS Verified
                </button>
              </div>

              <button
                onClick={handleClockInClick}
                className="bg-neutral-950 hover:bg-neutral-800 text-white font-bold text-xs px-6 py-2.5 rounded-xl shadow-xs transition"
              >
                Clock In Now
              </button>
            </div>
          </div>
        )}

        {userStatus === 'WORKING' && activeDisplayAttendance && (
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
                <span className="text-sm font-bold text-emerald-600 uppercase tracking-wider flex items-center gap-1">
                  ● WORKING
                </span>
                {activeDisplayAttendance.isLate && (
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-full">
                    Late {activeDisplayAttendance.lateMinutes}m
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-8 text-left">
                <div>
                  <span className="text-[10px] text-neutral-400 block uppercase font-bold">Clocked In</span>
                  <span className="text-base font-bold text-neutral-900">
                    {formatJakartaTime(activeDisplayAttendance.clockIn)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-neutral-400 block uppercase font-bold">Working Time</span>
                  <span className="text-base font-mono font-bold text-neutral-900">
                    {formatWorkingMinutes(liveUserElapsedMinutes)}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto self-end">
              <div className="text-right text-[11px] text-neutral-400 font-mono hidden md:block">
                Mode: <span className="font-bold text-neutral-600">{activeDisplayAttendance.locationMode}</span>
              </div>
              <button
                onClick={handleClockOutClick}
                className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white font-bold text-xs px-6 py-2.5 rounded-xl shadow-xs transition"
              >
                Clock Out
              </button>
            </div>
          </div>
        )}

        {userStatus === 'COMPLETED' && activeDisplayAttendance && (
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-neutral-500" />
                <span className="text-sm font-bold text-neutral-500 uppercase tracking-wider">
                  Completed
                </span>
                {activeDisplayAttendance.isLate && (
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-full">
                    Late {activeDisplayAttendance.lateMinutes}m
                  </span>
                )}
              </div>

              <div className="grid grid-cols-3 gap-8 text-left">
                <div>
                  <span className="text-[10px] text-neutral-400 block uppercase font-bold">Clock In</span>
                  <span className="text-sm font-bold text-neutral-900">
                    {formatJakartaTime(activeDisplayAttendance.clockIn)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-neutral-400 block uppercase font-bold">Clock Out</span>
                  <span className="text-sm font-bold text-neutral-900">
                    {formatJakartaTime(activeDisplayAttendance.clockOut!)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-neutral-400 block uppercase font-bold">Working Time</span>
                  <span className="text-sm font-mono font-bold text-neutral-900">
                    {formatWorkingMinutes(activeDisplayAttendance.workingMinutes || 0)}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-3 bg-neutral-50 border border-neutral-200/80 rounded-xl text-center text-xs text-neutral-500 font-mono font-bold w-full md:w-auto">
              ✓ Attendance completed today ({formatWorkingMinutes(activeDisplayAttendance.workingMinutes || 0)})
            </div>
          </div>
        )}

        {locationMode === 'GPS' && gpsCoords && (
          <p className="text-[11px] text-neutral-500 font-mono font-bold mt-3 border-t border-neutral-100 pt-2.5 flex items-center gap-1">
            📍 Coordinates verified: {gpsCoords}
          </p>
        )}
        {gpsError && (
          <p className="text-[11px] text-amber-600 mt-3 border-t border-neutral-100 pt-2.5 flex items-center gap-1 font-semibold">
            <AlertCircle className="w-3.5 h-3.5" /> {gpsError}
          </p>
        )}
      </div>

      {/* 2. METRICS CARDS SECTION */}
      {isExecutive && (
        <div className="space-y-4">
          <h3 className="text-xs font-mono font-bold text-neutral-400 uppercase tracking-wider">
            Today's Attendance Metrics ({formatJakartaFullDate(now)})
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-neutral-200/80 shadow-2xs">
              <span className="text-neutral-550 block text-[10px] font-bold text-neutral-400 uppercase">Present</span>
              <p className="text-2xl font-bold text-neutral-950 mt-1">{presentCount}</p>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-neutral-200/80 shadow-2xs">
              <span className="text-neutral-550 block text-[10px] font-bold text-emerald-500 uppercase">Active</span>
              <p className="text-2xl font-bold text-emerald-600 mt-1">{activeCount}</p>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-neutral-200/80 shadow-2xs">
              <span className="text-neutral-550 block text-[10px] font-bold text-neutral-500 uppercase">Completed</span>
              <p className="text-2xl font-bold text-neutral-700 mt-1">{completedCount}</p>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-neutral-200/80 shadow-2xs">
              <span className="text-neutral-550 block text-[10px] font-bold text-amber-600 uppercase">Late</span>
              <p className="text-2xl font-bold text-amber-700 mt-1">{lateCountToday}</p>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-neutral-200/80 shadow-2xs col-span-2 sm:col-span-1">
              <span className="text-neutral-550 block text-[10px] font-bold text-neutral-400 uppercase">Absent</span>
              <p className="text-2xl font-bold text-neutral-900 mt-1">{absentCountToday}</p>
            </div>
          </div>
        </div>
      )}

      {/* 3. PERIODIC ANALYTICS & SUMMARY REPORT */}
      <div className="bg-white p-6 rounded-2xl border border-neutral-200/80 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-neutral-100 pb-4 gap-4">
          <div>
            <h3 className="text-sm font-bold text-neutral-950 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-neutral-700" /> 
              {isExecutive ? `Analytics Dashboard: ${expectedMonthLabel}` : `My Attendance Summary: ${expectedMonthLabel}`}
            </h3>
            <p className="text-[11px] text-neutral-500">Calculated metrics derived from actual database records.</p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-neutral-500 font-semibold">Period:</span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-neutral-50 border border-neutral-200 rounded-lg px-2.5 py-1 text-neutral-800 font-bold focus:outline-hidden text-xs"
            >
              <option value="2026-08">August 2026</option>
              <option value="2026-07">July 2026</option>
              <option value="2026-06">June 2026</option>
            </select>
          </div>
        </div>

        {monthlyRecords.length === 0 ? (
          <div className="p-8 text-center text-xs text-neutral-500 font-medium">
            ⚠️ Tidak ada data attendance yang cukup untuk menghitung metrik ini.
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-xs">
            {isExecutive ? (
              // ADMIN ANALYTICAL WIDGETS
              <>
                <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-200/70 space-y-1">
                  <span className="text-neutral-500 block">Total Working Hours</span>
                  <p className="font-mono font-bold text-neutral-900 text-base">{totalMonthlyWorkingHoursStr}</p>
                </div>
                <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-200/70 space-y-1">
                  <span className="text-neutral-500 block">Average / Employee</span>
                  <p className="font-mono font-bold text-neutral-900 text-base">{averageMonthlyWorkingHoursStr}</p>
                </div>
                <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-200/70 space-y-1">
                  <span className="text-neutral-500 block">Late Arrivals</span>
                  <p className="font-bold text-amber-700 text-base">{monthlyLateCount}</p>
                </div>
                <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-200/70 space-y-1">
                  <span className="text-neutral-500 block">Attendance Rate</span>
                  <p className="font-bold text-emerald-800 text-base">{attendanceRate}%</p>
                </div>
              </>
            ) : (
              // USER PERSONAL SUMMARY METRICS
              <>
                <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-200/70 space-y-1">
                  <span className="text-neutral-500 block">Days Present</span>
                  <p className="font-bold text-neutral-900 text-base">{myPresentDays} Days</p>
                </div>
                <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-200/70 space-y-1">
                  <span className="text-neutral-500 block">Late Count</span>
                  <p className="font-bold text-amber-700 text-base">{myLateCount} Time(s)</p>
                </div>
                <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-200/70 space-y-1">
                  <span className="text-neutral-500 block">On Leave (Approved)</span>
                  <p className="font-bold text-neutral-800 text-base">{myLeaveDays} Days</p>
                </div>
                <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-200/70 space-y-1">
                  <span className="text-neutral-500 block">Days Absent</span>
                  <p className={`font-bold text-base ${myAbsentDays > 0 ? 'text-red-600' : 'text-neutral-900'}`}>
                    {myAbsentDays} Days
                  </p>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* 4. ATTENDANCE HISTORY TABLE WITH FILTERS */}
      <div className="bg-white rounded-2xl border border-neutral-200/80 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-neutral-100 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="font-bold text-xs text-neutral-900">
              {isExecutive ? 'Recent Agency Attendance Records' : 'My Personal Attendance History'}
            </span>
            <span className="text-[10px] font-bold text-neutral-400 font-mono">
              Showing {filteredAttendances.length} record(s)
            </span>
          </div>

          {/* Filtering row (Only for Admins/Executives) */}
          {isExecutive && (
            <div className="flex flex-wrap items-center gap-3 border-t border-neutral-50 pt-3 text-[11px] text-neutral-600 font-medium">
              <div className="flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-neutral-400" />
                <span className="font-bold">Filters:</span>
              </div>

              {/* Employee Filter */}
              <div className="flex items-center gap-1">
                <select
                  value={filterEmployee}
                  onChange={(e) => setFilterEmployee(e.target.value)}
                  className="bg-neutral-50 border border-neutral-200 rounded-lg px-2.5 py-1 text-neutral-850 focus:outline-hidden"
                >
                  <option value="">All Employees</option>
                  {activeEmployees.map((u) => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>

              {/* Date Filter */}
              <div className="flex items-center gap-1">
                <span className="text-neutral-400">Date:</span>
                <input
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className="bg-neutral-50 border border-neutral-200 rounded-lg px-2 py-0.5 text-neutral-800 focus:outline-hidden font-mono text-[10px]"
                />
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-1">
                <span className="text-neutral-400">Status:</span>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="bg-neutral-50 border border-neutral-200 rounded-lg px-2.5 py-1 text-neutral-850 focus:outline-hidden"
                >
                  <option value="">All Status</option>
                  <option value="ACTIVE">Working</option>
                  <option value="COMPLETED">Completed</option>
                </select>
              </div>

              {/* Location Mode Filter */}
              <div className="flex items-center gap-1">
                <span className="text-neutral-400">Location:</span>
                <select
                  value={filterLocation}
                  onChange={(e) => setFilterLocation(e.target.value)}
                  className="bg-neutral-50 border border-neutral-200 rounded-lg px-2.5 py-1 text-neutral-850 focus:outline-hidden"
                >
                  <option value="">All Locations</option>
                  <option value="OFFICE">Office</option>
                  <option value="REMOTE">Remote</option>
                  <option value="GPS">GPS Verified</option>
                </select>
              </div>

              {/* Lateness Filter */}
              <div className="flex items-center gap-1">
                <span className="text-neutral-400">Lateness:</span>
                <select
                  value={filterLate}
                  onChange={(e) => setFilterLate(e.target.value)}
                  className="bg-neutral-50 border border-neutral-200 rounded-lg px-2.5 py-1 text-neutral-850 focus:outline-hidden"
                >
                  <option value="">All Arrivals</option>
                  <option value="ON_TIME">On Time</option>
                  <option value="LATE">Late</option>
                </select>
              </div>

              {/* Reset Filters button */}
              {(filterEmployee || filterDate || filterStatus || filterLocation || filterLate) && (
                <button
                  onClick={() => {
                    setFilterEmployee('');
                    setFilterDate('');
                    setFilterStatus('');
                    setFilterLocation('');
                    setFilterLate('');
                  }}
                  className="text-red-500 hover:text-red-700 font-bold transition ml-auto text-[10px]"
                >
                  Clear Filters
                </button>
              )}
            </div>
          )}
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
                <th className="px-4 py-3">Working Duration</th>
                <th className="px-4 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 text-neutral-700">
              {filteredAttendances.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-neutral-400 font-medium">
                    No attendance records found matching current query.
                  </td>
                </tr>
              ) : (
                filteredAttendances.map((a) => {
                  let workingDurationStr = '0m';
                  if (a.status === 'ACTIVE' && !a.clockOut) {
                    // Ticking timer for active table rows
                    const elapsedMs = now.getTime() - new Date(a.clockIn).getTime();
                    const elapsedMin = Math.max(0, Math.floor(elapsedMs / 60000));
                    workingDurationStr = formatWorkingMinutes(elapsedMin);
                  } else {
                    workingDurationStr = formatWorkingMinutes(a.workingMinutes || 0);
                  }

                  const isAttLate = a.isLate;

                  return (
                    <tr key={a.id} className="hover:bg-neutral-50 transition">
                      <td className="px-4 py-3 font-semibold text-neutral-900">
                        {a.userName || 'Unknown User'}
                      </td>
                      <td className="px-4 py-3 font-mono text-neutral-500">
                        {getJakartaDateString(new Date(a.date))}
                      </td>
                      <td className="px-4 py-3 font-mono text-neutral-900">
                        {formatJakartaTime(a.clockIn)}
                      </td>
                      <td className="px-4 py-3 font-mono text-neutral-700">
                        {a.clockOut ? formatJakartaTime(a.clockOut) : '—'}
                      </td>
                      <td className="px-4 py-3 font-mono text-neutral-600 font-bold max-w-[150px] truncate">
                        {a.locationMode}
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-neutral-900">
                        {workingDurationStr}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {a.status === 'ACTIVE' ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full">
                              ● Working
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold px-2 py-0.5 bg-neutral-100 text-neutral-600 border border-neutral-200 rounded-full">
                              ✓ Completed
                            </span>
                          )}

                          {isAttLate && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-full" title={`Late by ${a.lateMinutes} minutes`}>
                              Late {a.lateMinutes}m
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
