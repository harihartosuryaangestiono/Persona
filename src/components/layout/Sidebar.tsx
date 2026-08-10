'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Briefcase,
  Calendar,
  Kanban,
  Video,
  FileText,
  ListTodo,
  CheckCircle,
  Clock,
  UserCheck,
  CalendarOff,
  Award,
  DollarSign,
  BarChart3,
  Settings,
  Palette,
  FolderKanban,
  Database,
  BookOpen,
  Library,
  CalendarRange,
  Zap,
  PieChart,
  Command,
  Archive,
  Sparkles,
} from 'lucide-react';
import { useData } from '@/context/DataContext';
import { useUser } from '@/context/UserContext';
import { useWorkspace } from '@/context/WorkspaceContext';
import { UserRole } from '@/lib/types';
import { calculateUserPointsForPeriod } from '@/lib/score-calculator';
 
interface NavItem {
  name: string;
  href: string;
  icon: any;
  allowedRoles?: UserRole[];
  badgeKey?: string;
}
 
const ALL_NAV_ITEMS: NavItem[] = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Persona AI BI', href: '/persona-ai', icon: Sparkles },
  { name: 'Clients', href: '/clients', icon: Users, allowedRoles: ['Admin', 'Owner'] },
  { name: 'Projects', href: '/projects', icon: Briefcase, allowedRoles: ['Admin', 'Owner', 'Strategist', 'Production Assistant'] },
  { name: 'Editorial Calendar', href: '/calendar', icon: Calendar, allowedRoles: ['Admin', 'Owner', 'Strategist', 'Production Assistant', 'Editor', 'Scheduler'] },
  { name: 'Kanban Pipeline', href: '/kanban', icon: Kanban, allowedRoles: ['Admin', 'Owner', 'Strategist', 'Editor', 'Production Assistant', 'Scheduler'] },
  { name: 'Production & Shoot', href: '/production', icon: Video, allowedRoles: ['Admin', 'Owner', 'Production Assistant', 'Strategist'] },
  { name: 'Worklog', href: '/worklog', icon: FileText, allowedRoles: ['Admin', 'Owner', 'Strategist', 'Production Assistant', 'Editor', 'Scheduler'] },
  { name: 'To Do List', href: '/todo', icon: ListTodo, allowedRoles: ['Admin', 'Owner'] },
  { name: 'Brand Hub', href: '/brand-hub', icon: Palette, allowedRoles: ['Admin', 'Owner'] },
  { name: 'Asset Library (DAM)', href: '/assets', icon: FolderKanban, allowedRoles: ['Admin', 'Owner'] },
  { name: 'Resource Planner', href: '/resource-planner', icon: CalendarRange, allowedRoles: ['Admin', 'Owner'] },
  { name: 'Approval Queue', href: '/approval', icon: CheckCircle, badgeKey: 'approval', allowedRoles: ['Admin', 'Owner', 'Strategist'] },
  { name: 'Editing Queue', href: '/editing', icon: Video, badgeKey: 'editing', allowedRoles: ['Admin', 'Owner', 'Editor'] },
  { name: 'Scheduling', href: '/scheduling', icon: Clock, badgeKey: 'scheduling', allowedRoles: ['Admin', 'Owner', 'Scheduler'] },
  { name: 'Attendance', href: '/attendance', icon: UserCheck, allowedRoles: ['Admin', 'Owner', 'Production Assistant', 'Editor', 'Scheduler'] },
  { name: 'Score Summary', href: '/score-summary', icon: Award, allowedRoles: ['Admin', 'Owner'] },
  { name: 'Client Budget', href: '/client-budget', icon: DollarSign, allowedRoles: ['Admin', 'Owner'] },
  { name: 'Advanced Analytics', href: '/analytics', icon: PieChart, allowedRoles: ['Admin', 'Owner'] },
  { name: 'Reports', href: '/reports', icon: BarChart3, allowedRoles: ['Admin', 'Owner'] },
  { name: 'Archive', href: '/archive', icon: Archive, allowedRoles: ['Admin', 'Owner', 'Strategist'] },
  { name: 'Settings', href: '/settings', icon: Settings, allowedRoles: ['Admin', 'Owner'] },
];
 
export function Sidebar() {
  const pathname = usePathname();
  const { tasks, worklogs, companySettings } = useData();
  const { currentUser } = useUser();
  const { currentWorkspace } = useWorkspace();
 
  const pendingApprovalsCount = tasks.filter((t) => t.status === 'Waiting for Approval' || t.status === 'Approval').length;
  const editingCount = tasks.filter((t) => (t.status === 'Editing' || t.status === 'Revision') && t.workspaceId === currentWorkspace?.id && !t.isArchived).length;
  const schedulingCount = tasks.filter((t) => (t.status === 'Scheduling' || t.status === 'Ready to Post') && t.workspaceId === currentWorkspace?.id && !t.isArchived).length;

  // Dynamic capacity calculation
  const capacity = (companySettings?.monthlyCapacity && companySettings.monthlyCapacity !== 12000) ? companySettings.monthlyCapacity : (currentUser?.monthlyCapacity && currentUser.monthlyCapacity !== 12000 ? currentUser.monthlyCapacity : 16000);
  
  // Sum worklogs and active tasks matching selected period (current month/year)
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const currentDate = new Date();
  const activeMonth = monthNames[currentDate.getMonth()];
  const activeYear = currentDate.getFullYear();
  const userPoints = currentUser ? calculateUserPointsForPeriod(currentUser, activeMonth, activeYear, worklogs, tasks) : 0;

  const progressPercent = capacity > 0 ? Math.min(100, (userPoints / capacity) * 100) : 0;
 
  const AI_ALLOWED_USERS = ['devi', 'anggi', 'gigie'];

  const navItems = ALL_NAV_ITEMS.filter((item) => {
    if (item.href === '/persona-ai') {
      const uName = (currentUser?.name || '').toLowerCase();
      return AI_ALLOWED_USERS.some((name) => uName.includes(name));
    }
    if (!item.allowedRoles) return true;
    if (currentUser.roles.includes('Owner') || currentUser.roles.includes('Admin')) return true;
    return item.allowedRoles.some((role) => currentUser.roles.includes(role));
  });

  return (
    <aside className="w-64 h-screen sticky top-0 bg-white border-r border-neutral-200/80 flex flex-col justify-between py-5 px-3 z-30 select-none">
      {/* Brand Header & Workspace Switcher */}
      <div>
        <div className="flex items-center gap-3 px-3 mb-4">
          <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center bg-white border border-neutral-200/50 shadow-xs">
            <img src="/Logo.png" alt="Persona OS Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-neutral-900 flex items-center gap-1.5">
              Persona OS
            </h1>
            <p className="text-[11px] text-neutral-500 font-medium">Enterprise Agency</p>
          </div>
        </div>

        {/* User Context Banner */}
        <div className="mx-2 mb-4 p-2.5 rounded-xl bg-neutral-50 border border-neutral-200/80 flex items-center gap-2.5">
          {currentUser.avatar ? (
            <img src={currentUser.avatar} alt={currentUser.name} className="w-7 h-7 rounded-full object-cover border border-neutral-200" />
          ) : (
            <div className="w-7 h-7 rounded-full bg-neutral-900 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
              {currentUser.name.charAt(0)}
            </div>
          )}
          <div className="truncate text-left">
            <p className="text-xs font-bold text-neutral-900 truncate">{currentUser.name}</p>
            <p className="text-[10px] text-neutral-500 font-mono truncate">{currentUser.roles.join(' • ')}</p>
          </div>
        </div>

        {/* Role-Based Navigation List */}
        <nav className="space-y-0.5 max-h-[calc(100vh-230px)] overflow-y-auto pr-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.name}
                href={item.href}
                className={`group flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-neutral-100 text-neutral-900 font-semibold'
                    : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <Icon
                    className={`w-4 h-4 shrink-0 transition-colors ${
                      isActive ? 'text-neutral-900' : 'text-neutral-400 group-hover:text-neutral-600'
                    }`}
                  />
                  <span className="truncate">{item.name}</span>
                </div>

                {item.badgeKey === 'approval' && pendingApprovalsCount > 0 && (
                  <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-1.5 py-0.5 rounded-md border border-amber-200 shrink-0">
                    {pendingApprovalsCount}
                  </span>
                )}

                {item.badgeKey === 'editing' && editingCount > 0 && (
                  <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-1.5 py-0.5 rounded-md border border-amber-200 shrink-0">
                    {editingCount}
                  </span>
                )}

                {item.badgeKey === 'scheduling' && schedulingCount > 0 && (
                  <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-1.5 py-0.5 rounded-md border border-amber-200 shrink-0">
                    {schedulingCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer System Status Card */}
      <div className="px-3">
        <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200/80 space-y-1.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-neutral-500 font-medium">Monthly Capacity</span>
            <span className="text-neutral-900 font-mono font-semibold">{capacity.toLocaleString('en-US')} pts</span>
          </div>
          <div className="w-full bg-neutral-200 h-1.5 rounded-full overflow-hidden">
            <div className="bg-neutral-900 h-full transition-all duration-500" style={{ width: `${progressPercent}%` }} />
          </div>
          <div className="flex items-center justify-between text-[9px] text-neutral-400 font-mono font-semibold">
            <span>Progress: {userPoints.toLocaleString('en-US')} pts</span>
            <span>{progressPercent.toFixed(0)}%</span>
          </div>
          <p className="text-[9px] text-neutral-400 pt-0.5 border-t border-neutral-200/60">Persona: {currentUser.name}</p>
        </div>
      </div>
    </aside>
  );
}
