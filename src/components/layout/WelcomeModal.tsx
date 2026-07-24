'use client';

import React, { useState, useEffect } from 'react';
import { useUser } from '@/context/UserContext';
import { useData } from '@/context/DataContext';
import {
  Calendar,
  Clock,
  CheckSquare,
  Award,
  Video,
  FileCheck,
  Check,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import confetti from 'canvas-confetti';

const MOTIVATIONAL_MESSAGES = [
  "Let's make today productive.",
  "One great task at a time.",
  "Small progress every day creates big results.",
  "Your team is counting on you today.",
  "Stay focused and enjoy your work.",
  "Make it simple, but significant.",
  "Action is the foundational key to all success.",
  "Focus on being productive instead of busy.",
  "Do one thing every day that scares you.",
  "The secret of getting ahead is getting started."
];

export function WelcomeModal() {
  const { currentUser, hasSeenWelcomeToday, setHasSeenWelcomeToday } = useUser();
  const { tasks, worklogs, attendances, clockIn } = useData();

  const [currentTime, setCurrentTime] = useState('');
  const [greeting, setGreeting] = useState({ text: 'Welcome', icon: '👋' });
  const [motivationalMessage, setMotivationalMessage] = useState('');
  const [isSuccessCheckedIn, setIsSuccessCheckedIn] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  // Time and message initialization
  useEffect(() => {
    // 1. Time & Greeting
    const now = new Date();
    const hours = now.getHours();
    
    // Greeting text
    if (hours >= 5 && hours < 11) {
      setGreeting({ text: 'Good Morning', icon: '🌅' });
    } else if (hours >= 11 && hours < 15) {
      setGreeting({ text: 'Good Afternoon', icon: '☀️' });
    } else if (hours >= 15 && hours < 18) {
      setGreeting({ text: 'Good Evening', icon: '🌤️' });
    } else {
      setGreeting({ text: 'Good Night', icon: '🌙' });
    }

    // Live clock formatting
    const formatTime = () => {
      const d = new Date();
      return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    };
    setCurrentTime(formatTime());
    const interval = setInterval(() => setCurrentTime(formatTime()), 1000);

    // 2. Motivational Message (Random selection)
    const randomIdx = Math.floor(Math.random() * MOTIVATIONAL_MESSAGES.length);
    setMotivationalMessage(MOTIVATIONAL_MESSAGES[randomIdx]);

    return () => clearInterval(interval);
  }, []);

  // Check if we should display the modal
  const todayStr = new Date().toDateString();
  const hasCheckedInToday = attendances.some(
    (a) =>
      a.userId === currentUser.id &&
      new Date(a.date).toDateString() === todayStr
  );

  useEffect(() => {
    // Only show if not seen today
    const lastSeenDate = localStorage.getItem(`persona_last_greeting_date_${currentUser.id}`);
    if (lastSeenDate !== todayStr && !hasSeenWelcomeToday) {
      setIsOpen(true);
    }
  }, [currentUser.id, todayStr, hasSeenWelcomeToday]);

  if (!isOpen) return null;

  // Role Checks
  const isOwnerOrAdmin = currentUser.roles.includes('Owner') || currentUser.roles.includes('Admin');
  const isStrategist = currentUser.roles.includes('Strategist');

  // Today's Focus Calculations
  const userTasksCount = tasks.filter(
    (t) => t.assignedUserIds.includes(currentUser.id) && t.status !== 'Posted'
  ).length;

  const pendingApprovalsCount = isOwnerOrAdmin || isStrategist
    ? tasks.filter((t) => t.status === 'Approval').length
    : 0;

  const shootScheduleCount = tasks.filter(
    (t) => (t.category === 'Assistant' || t.status === 'Shooting') && t.status !== 'Posted'
  ).length;

  // Capacity calculation
  const userWorklogs = worklogs.filter(
    (w) => w.userName === currentUser.name || w.userId === currentUser.id
  );
  const userTotalPoints = userWorklogs.reduce((sum, w) => sum + w.score, 0);
  const remainingCapacity = Math.max(0, currentUser.monthlyCapacity - userTotalPoints);

  const handleCheckIn = () => {
    // Call DataContext clockIn
    clockIn(currentUser.id, 'OFFICE');

    // Trigger local success state
    setIsSuccessCheckedIn(true);

    // Fire Confetti!
    try {
      confetti({
        particleCount: 120,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch (e) {}

    // Store check-in & greeting seen today
    localStorage.setItem(`persona_last_greeting_date_${currentUser.id}`, todayStr);

    // Wait a brief moment then close
    setTimeout(() => {
      setHasSeenWelcomeToday(true);
      setIsOpen(false);
    }, 2000);
  };

  const handleSkip = () => {
    // Skip greeting/check in for today (Admin/Owner only)
    localStorage.setItem(`persona_last_greeting_date_${currentUser.id}`, todayStr);
    setHasSeenWelcomeToday(true);
    setIsOpen(false);
  };

  const handleClose = () => {
    if (hasCheckedInToday) {
      localStorage.setItem(`persona_last_greeting_date_${currentUser.id}`, todayStr);
      setHasSeenWelcomeToday(true);
      setIsOpen(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/40 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-white border border-neutral-200 rounded-3xl w-full max-w-lg p-6 md:p-8 shadow-xl relative animate-scaleUp max-h-[90vh] overflow-y-auto space-y-6">
        
        {/* Dynamic greeting header */}
        <div className="text-center space-y-2">
          <div className="text-4xl">{greeting.icon}</div>
          <h2 className="text-2xl font-bold tracking-tight text-neutral-900">
            {greeting.text}, {currentUser.name}
          </h2>
          <p className="text-xs text-neutral-500 font-medium italic">
            "{motivationalMessage}"
          </p>
        </div>

        {/* Date and running clock */}
        <div className="grid grid-cols-2 gap-3 bg-neutral-50 p-3.5 rounded-2xl border border-neutral-200/60 text-xs">
          <div className="flex items-center gap-2 text-neutral-600 font-semibold">
            <Calendar className="w-4 h-4 text-neutral-400" />
            <span>
              {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          </div>
          <div className="flex items-center gap-2 text-neutral-600 font-mono font-semibold justify-end">
            <Clock className="w-4 h-4 text-neutral-400" />
            <span>{currentTime}</span>
          </div>
        </div>

        {/* Target: Today's Focus */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5" /> Today's Focus
          </h3>

          <div className="grid grid-cols-2 gap-3">
            {/* Assigned Tasks count */}
            <div className="p-3 bg-neutral-50 border border-neutral-200/80 rounded-xl space-y-1.5">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-neutral-500 uppercase">
                <CheckSquare className="w-3.5 h-3.5 text-neutral-400" /> Assigned
              </div>
              <p className="text-base font-bold text-neutral-900 font-mono">{userTasksCount} Tasks</p>
            </div>

            {/* Shoot Schedule count */}
            <div className="p-3 bg-neutral-50 border border-neutral-200/80 rounded-xl space-y-1.5">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-neutral-500 uppercase">
                <Video className="w-3.5 h-3.5 text-neutral-400" /> Shoot Schedule
              </div>
              <p className="text-base font-bold text-neutral-900 font-mono">{shootScheduleCount} Shoot(s)</p>
            </div>

            {/* Pending Approvals count (Strategist/Owner/Admin only) */}
            {(isOwnerOrAdmin || isStrategist) && (
              <div className="p-3 bg-neutral-50 border border-neutral-200/80 rounded-xl space-y-1.5 col-span-2">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-neutral-500 uppercase">
                  <FileCheck className="w-3.5 h-3.5 text-neutral-400" /> Need Approval
                </div>
                <p className="text-base font-bold text-neutral-900 font-mono">{pendingApprovalsCount} Items Pending</p>
              </div>
            )}

            {/* Monthly Capacity count */}
            <div className="p-4 bg-neutral-50 border border-neutral-200/80 rounded-xl space-y-2 col-span-2">
              <div className="flex items-center justify-between text-[11px] font-semibold text-neutral-500 uppercase">
                <span className="flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5 text-neutral-400" /> Remaining Capacity
                </span>
                <span className="font-mono text-neutral-900">{remainingCapacity} / {currentUser.monthlyCapacity} pts</span>
              </div>
              <div className="w-full bg-neutral-200 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-neutral-900 h-full transition-all duration-500"
                  style={{ width: `${Math.min(100, (remainingCapacity / currentUser.monthlyCapacity) * 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Attendance Check-in Section */}
        <div className="pt-2 border-t border-neutral-100 space-y-3">
          {isSuccessCheckedIn ? (
            <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-center rounded-2xl font-bold flex flex-col items-center gap-1.5 animate-scaleUp">
              <span className="text-xl">🎉</span>
              <span>Have a productive day!</span>
            </div>
          ) : hasCheckedInToday ? (
            <div className="space-y-3">
              <div className="p-3 bg-emerald-50/50 border border-emerald-200/60 text-emerald-800 text-center rounded-xl font-bold text-xs flex items-center justify-center gap-1.5">
                <Check className="w-4 h-4" /> You're already checked in today
              </div>
              <button
                onClick={handleClose}
                className="w-full bg-neutral-900 hover:bg-neutral-800 active:scale-[0.99] text-white font-bold py-2.5 px-4 rounded-xl text-sm transition shadow-sm flex items-center justify-center gap-1"
              >
                Go to Dashboard <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-[11px] text-neutral-500 font-semibold text-center uppercase tracking-wider">
                Please check in to start your work day
              </p>
              <button
                onClick={handleCheckIn}
                className="w-full bg-neutral-900 hover:bg-neutral-800 active:scale-[0.99] text-white font-bold py-3 px-4 rounded-2xl text-sm transition shadow-md flex items-center justify-center gap-2"
              >
                ✅ Check In Now
              </button>

              {/* Admin/Owner Skip Button */}
              {isOwnerOrAdmin && (
                <button
                  onClick={handleSkip}
                  className="w-full hover:bg-neutral-100 font-semibold py-2 px-4 rounded-xl text-xs text-neutral-500 transition"
                >
                  Skip Check In Today (Admin Only)
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
