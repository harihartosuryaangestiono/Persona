'use client';

import React, { useState } from 'react';
import { useData } from '@/context/DataContext';
import { useUser } from '@/context/UserContext';
import { useWorkspace } from '@/context/WorkspaceContext';
import { 
  DollarSign, 
  Clock, 
  Award, 
  Activity, 
  TrendingUp, 
  Percent, 
  Search, 
  X, 
  ExternalLink, 
  ChevronRight, 
  Briefcase, 
  User as UserIcon,
  Calendar,
  Layers,
  ArrowUpRight,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { formatRupiah, EMPLOYEE_POINT_VALUE_IDR, CLIENT_POINT_VALUE_IDR } from '@/lib/score-calculator';

export default function AnalyticsPage() {
  const { tasks, clients, budgets } = useData();
  const { allUsers } = useUser();
  const { currentWorkspace } = useWorkspace();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const currentDate = new Date();

  // Period and search filter states
  const [selectedMonth, setSelectedMonth] = useState(monthNames[currentDate.getMonth()]);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [selectedUserDetail, setSelectedUserDetail] = useState<any | null>(null);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [taskSearchQuery, setTaskSearchQuery] = useState('');
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const [taskFilterStatus, setTaskFilterStatus] = useState<'ALL' | 'ACTIVE' | 'POSTED'>('ALL');

  // Helper to convert month/year to budget format (e.g. August 2026 -> 2026-08)
  const getBudgetMonthFormat = (month: string, year: number) => {
    const idx = monthNames.indexOf(month);
    if (idx === -1) return '';
    const mStr = String(idx + 1).padStart(2, '0');
    return `${year}-${mStr}`;
  };

  // Filter tasks belonging to current workspace and selected month/year
  const workspaceTasks = tasks.filter((t) => 
    !t.isArchived && 
    (!t.workspaceId || t.workspaceId === currentWorkspace.id) &&
    t.month === selectedMonth &&
    t.year === selectedYear
  );

  // Compute Agency Metrics based on filtered tasks
  const totalPoints = workspaceTasks.reduce((sum, t) => sum + t.score, 0);
  const totalLaborCost = totalPoints * EMPLOYEE_POINT_VALUE_IDR; // COGS
  const totalClientBilling = totalPoints * CLIENT_POINT_VALUE_IDR; // Gross Revenue
  const netAgencyProfit = totalClientBilling - totalLaborCost;
  const profitMarginPct = totalClientBilling > 0 ? (netAgencyProfit / totalClientBilling) * 100 : 83.3;

  // Calculate Points by Role/Department
  let strategistPoints = 0;
  let productionPoints = 0;
  let editorPoints = 0;
  let schedulerPoints = 0;

  // Map to hold points breakdown by user ID
  const userPointsMap: Record<string, {
    totalPoints: number;
    tasksCount: number;
    items: Array<{
      id: string;
      title: string;
      clientName: string;
      clientColor: string;
      taskType: string;
      format: string;
      status: string;
      date: string;
      points: number;
    }>;
  }> = {};

  // Process all task stages to compute individual scores
  workspaceTasks.forEach((task) => {
    let stagesList: any[] = [];
    if (task.stages) {
      try {
        stagesList = typeof task.stages === 'string' ? JSON.parse(task.stages) : task.stages;
      } catch (e) {
        console.error('Failed to parse stages for task:', task.id, e);
      }
    }

    if (Array.isArray(stagesList)) {
      stagesList.forEach((stage) => {
        if (!stage.userId) return;
        const uId = stage.userId;
        const score = Number(stage.score) || 0;

        // Categorize role points for department stats
        if (stage.role === 'Strategist') strategistPoints += score;
        else if (stage.role === 'Production Assistant') productionPoints += score;
        else if (stage.role === 'Editor') editorPoints += score;
        else if (stage.role === 'Scheduler') schedulerPoints += score;

        if (!userPointsMap[uId]) {
          userPointsMap[uId] = {
            totalPoints: 0,
            tasksCount: 0,
            items: []
          };
        }

        userPointsMap[uId].totalPoints += score;
        // Count distinct tasks
        if (!userPointsMap[uId].items.some(item => item.id === task.id)) {
          userPointsMap[uId].tasksCount += 1;
        }

        userPointsMap[uId].items.push({
          id: task.id,
          title: task.title,
          clientName: task.clientName || clients.find(c => c.id === task.clientId)?.name || 'Unknown Client',
          clientColor: task.clientColor || clients.find(c => c.id === task.clientId)?.clientColor || '#3B82F6',
          taskType: stage.taskType || task.taskType || 'Editing',
          format: stage.format || task.format || 'Reels',
          status: task.status,
          date: task.postingDate || task.deadline || task.createdAt,
          points: score
        });
      });
    }
  });

  // Build the final list of team members with points
  const teamMembers = allUsers.map(user => {
    const data = userPointsMap[user.id] || { totalPoints: 0, tasksCount: 0, items: [] };
    return {
      ...user,
      totalPoints: data.totalPoints,
      tasksCount: data.tasksCount,
      items: data.items
    };
  }).sort((a, b) => b.totalPoints - a.totalPoints);

  // Filter team members based on search
  const filteredTeam = teamMembers.filter(member => {
    const nameMatch = member.name.toLowerCase().includes(userSearchQuery.toLowerCase());
    const roleStr = Array.isArray(member.roles) ? member.roles.join(', ') : String(member.roles || '');
    const roleMatch = roleStr.toLowerCase().includes(userSearchQuery.toLowerCase());
    return nameMatch || roleMatch;
  });

  // Client Budget Utilization Stats
  const clientStats = clients
    .filter(c => c.workspaceId === currentWorkspace.id)
    .map(client => {
      const budgetMonth = getBudgetMonthFormat(selectedMonth, selectedYear);
      const budgetObj = budgets?.find((b) => b.clientId === client.id && b.month === budgetMonth);
      const monthlyBudget = budgetObj ? budgetObj.budget : (client.monthlyPointBudget || 5000);
      
      const clientTasks = workspaceTasks.filter(t => t.clientId === client.id);
      const usedPoints = clientTasks.reduce((sum, t) => sum + t.score, 0);
      const remainingPoints = Math.max(0, monthlyBudget - usedPoints);
      const pct = monthlyBudget > 0 ? (usedPoints / monthlyBudget) * 100 : 0;
      
      return {
        ...client,
        usedPoints,
        monthlyBudget,
        remainingPoints,
        pct: Math.min(pct, 100),
        rawPct: pct,
        billingValue: usedPoints * CLIENT_POINT_VALUE_IDR
      };
    })
    .sort((a, b) => b.usedPoints - a.usedPoints);

  const filteredClients = clientStats.filter(c => 
    c.name.toLowerCase().includes(clientSearchQuery.toLowerCase()) ||
    c.code.toLowerCase().includes(clientSearchQuery.toLowerCase())
  );

  // Pipeline status breakdown
  const statusCounts = {
    brief: workspaceTasks.filter(t => ['Brief', 'Content Proposal', 'Editorial Calendar', 'Script & Shotlist'].includes(t.status)).length,
    production: workspaceTasks.filter(t => ['Production', 'Shooting'].includes(t.status)).length,
    editing: workspaceTasks.filter(t => ['Editing', 'Revision', 'Approval', 'Waiting for Approval'].includes(t.status)).length,
    posted: workspaceTasks.filter(t => ['Scheduling', 'Posted'].includes(t.status)).length
  };

  // Details list filter logic for selected user
  const detailsUserTasks = selectedUserDetail
    ? (userPointsMap[selectedUserDetail.id]?.items || [])
        .filter(item => 
          (item.title.toLowerCase().includes(taskSearchQuery.toLowerCase()) || 
           item.clientName.toLowerCase().includes(taskSearchQuery.toLowerCase())) &&
          (taskFilterStatus === 'ALL' || 
           (taskFilterStatus === 'POSTED' && item.status === 'Posted') || 
           (taskFilterStatus === 'ACTIVE' && item.status !== 'Posted'))
        )
    : [];

  return (
    <div className="space-y-6 animate-fadeIn text-neutral-900 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900 flex items-center gap-2">
            Executive Analytics & Velocity 
            <span className="text-xs font-mono bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full border border-purple-100 font-bold uppercase tracking-wide">
              Executive BI
            </span>
          </h1>
          <p className="text-xs text-neutral-500">
            Agency operational performance, profit margins, client budget utilization, and individual point allocations.
          </p>
        </div>

        {/* Global Period Selector */}
        <div className="flex items-center gap-2 bg-white border border-neutral-200 p-2 rounded-xl shadow-2xs text-xs font-semibold shrink-0">
          <Calendar className="w-4 h-4 text-neutral-450" />
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-neutral-50 border border-neutral-200 rounded-lg px-2 py-1 text-neutral-800 focus:outline-hidden"
          >
            {monthNames.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          <input
            type="number"
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="w-16 bg-neutral-50 border border-neutral-200 rounded-lg px-2 py-1 text-center text-neutral-800 font-mono focus:outline-hidden"
          />
        </div>
      </div>

      {/* Premium Executive KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Gross Billing */}
        <div className="p-5 rounded-2xl bg-white border border-neutral-200/80 space-y-2 shadow-xs">
          <p className="text-xs font-semibold text-neutral-400 flex items-center gap-2 uppercase tracking-wider font-mono">
            <DollarSign className="w-4 h-4 text-indigo-500" /> Client Billing Value
          </p>
          <p className="text-2xl font-bold text-neutral-900 font-mono tracking-tight">{formatRupiah(totalClientBilling)}</p>
          <div className="flex items-center gap-1 text-[10px] text-indigo-600 font-bold font-mono">
            <TrendingUp className="w-3.5 h-3.5" /> Gross Agency Revenue
          </div>
        </div>

        {/* KPI 2: Production Cost */}
        <div className="p-5 rounded-2xl bg-white border border-neutral-200/80 space-y-2 shadow-xs">
          <p className="text-xs font-semibold text-neutral-400 flex items-center gap-2 uppercase tracking-wider font-mono">
            <Layers className="w-4 h-4 text-rose-500" /> Production Cost (COGS)
          </p>
          <p className="text-2xl font-bold text-neutral-900 font-mono tracking-tight">{formatRupiah(totalLaborCost)}</p>
          <div className="flex items-center gap-1 text-[10px] text-neutral-500 font-mono">
            At {formatRupiah(250)} / point payroll rate
          </div>
        </div>

        {/* KPI 3: Net Profit */}
        <div className="p-5 rounded-2xl bg-white border border-neutral-200/80 space-y-2 shadow-xs">
          <p className="text-xs font-semibold text-neutral-400 flex items-center gap-2 uppercase tracking-wider font-mono">
            <Award className="w-4 h-4 text-emerald-500" /> Net Agency Profit
          </p>
          <p className="text-2xl font-bold text-emerald-700 font-mono tracking-tight">{formatRupiah(netAgencyProfit)}</p>
          <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-bold font-mono">
            <ArrowUpRight className="w-3.5 h-3.5" /> Profit generated from output
          </div>
        </div>

        {/* KPI 4: Gross Margin */}
        <div className="p-5 rounded-2xl bg-white border border-neutral-200/80 space-y-2 shadow-xs">
          <p className="text-xs font-semibold text-neutral-400 flex items-center gap-2 uppercase tracking-wider font-mono">
            <Percent className="w-4 h-4 text-amber-500" /> Operational Margin
          </p>
          <p className="text-2xl font-bold text-neutral-900 font-mono tracking-tight">{profitMarginPct.toFixed(1)}%</p>
          <div className="flex items-center gap-1 text-[10px] text-emerald-700 font-bold font-mono">
            <ShieldCheck className="w-3.5 h-3.5" /> Premium performance efficiency
          </div>
        </div>
      </div>

      {/* Main Breakdown Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Columns: Team Points Leaderboard */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl border border-neutral-200 p-5 space-y-4 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-sm font-bold text-neutral-800 flex items-center gap-2">
                  <UserIcon className="w-4 h-4 text-neutral-500" /> Team Point Allocations
                </h2>
                <p className="text-[10px] text-neutral-400">Click a team member to view their complete list of completed and active jobs.</p>
              </div>
              
              {/* Search Bar */}
              <div className="relative max-w-xs w-full">
                <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-neutral-400" />
                <input
                  type="text"
                  placeholder="Search team member..."
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-lg pl-8 pr-3 py-1.5 text-xs text-neutral-800 focus:outline-hidden focus:border-neutral-400 transition"
                />
              </div>
            </div>

            {/* Team Leaderboard Table */}
            <div className="overflow-hidden border border-neutral-100 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-50 text-neutral-500 font-bold uppercase tracking-wider border-b border-neutral-100 font-mono text-[9px]">
                  <tr>
                    <th className="px-4 py-3">Team Member</th>
                    <th className="px-4 py-3">Roles</th>
                    <th className="px-4 py-3 text-center">Tasks Count</th>
                    <th className="px-4 py-3 text-right">Points Earned</th>
                    <th className="px-4 py-3 text-right">Payroll (IDR)</th>
                    <th className="px-4 py-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 text-neutral-700">
                  {filteredTeam.map((member) => (
                    <tr 
                      key={member.id} 
                      onClick={() => {
                        setSelectedUserDetail(member);
                        setTaskSearchQuery('');
                        setTaskFilterStatus('ALL');
                      }}
                      className="hover:bg-neutral-50/70 transition cursor-pointer"
                    >
                      <td className="px-4 py-3.5 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-neutral-900 text-white flex items-center justify-center font-bold text-xs uppercase shadow-xs">
                          {member.name.substring(0, 2)}
                        </div>
                        <div>
                          <p className="font-bold text-neutral-850">{member.name}</p>
                          <p className="text-[10px] text-neutral-400 font-mono">{member.email}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="px-2 py-0.5 rounded bg-neutral-100 text-neutral-600 font-semibold text-[9px] font-mono">
                          {Array.isArray(member.roles) ? member.roles.join(', ') : member.roles}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-center font-mono font-bold text-neutral-700">
                        {member.tasksCount}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono font-bold text-neutral-900">
                        {member.totalPoints} pts
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono font-bold text-emerald-700">
                        {formatRupiah(member.totalPoints * 250)}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <button className="p-1 hover:bg-neutral-100 rounded text-neutral-400 hover:text-neutral-750 transition">
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredTeam.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-neutral-400 italic font-mono">
                        No team members found matching your search.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Advanced operational analytics widgets */}
        <div className="space-y-6">
          
          {/* Operational Pipeline Velocity */}
          <div className="bg-white rounded-2xl border border-neutral-200 p-5 space-y-4 shadow-xs">
            <div>
              <h2 className="text-sm font-bold text-neutral-800 flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-500" /> Pipeline Status & Distribution
              </h2>
              <p className="text-[10px] text-neutral-400">Current workload count across workflow stages.</p>
            </div>
            
            <div className="space-y-3 font-mono text-[10px] font-bold">
              <div className="space-y-1">
                <div className="flex justify-between text-neutral-600">
                  <span>Planning & Strategy</span>
                  <span>{statusCounts.brief} Tasks</span>
                </div>
                <div className="w-full bg-neutral-100 rounded-full h-2">
                  <div className="bg-indigo-400 h-2 rounded-full" style={{ width: `${workspaceTasks.length > 0 ? (statusCounts.brief / workspaceTasks.length) * 100 : 0}%` }} />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-neutral-600">
                  <span>Production (Shooting/Prep)</span>
                  <span>{statusCounts.production} Tasks</span>
                </div>
                <div className="w-full bg-neutral-100 rounded-full h-2">
                  <div className="bg-amber-400 h-2 rounded-full" style={{ width: `${workspaceTasks.length > 0 ? (statusCounts.production / workspaceTasks.length) * 100 : 0}%` }} />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-neutral-600">
                  <span>Editing & Revision Review</span>
                  <span>{statusCounts.editing} Tasks</span>
                </div>
                <div className="w-full bg-neutral-100 rounded-full h-2">
                  <div className="bg-rose-500 h-2 rounded-full" style={{ width: `${workspaceTasks.length > 0 ? (statusCounts.editing / workspaceTasks.length) * 100 : 0}%` }} />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-neutral-600">
                  <span>Ready to Post & Posted</span>
                  <span>{statusCounts.posted} Tasks</span>
                </div>
                <div className="w-full bg-neutral-100 rounded-full h-2">
                  <div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${workspaceTasks.length > 0 ? (statusCounts.posted / workspaceTasks.length) * 100 : 0}%` }} />
                </div>
              </div>
            </div>
          </div>

          {/* Department Cost Distribution */}
          <div className="bg-white rounded-2xl border border-neutral-200 p-5 space-y-4 shadow-xs">
            <div>
              <h2 className="text-sm font-bold text-neutral-800 flex items-center gap-2">
                <Activity className="w-4 h-4 text-rose-500" /> Operational Labor Breakdown
              </h2>
              <p className="text-[10px] text-neutral-400">Total labor expenses distributed by role specialization.</p>
            </div>
            
            <div className="space-y-3 font-mono text-[10px] font-bold">
              <div className="flex items-center justify-between border-b border-neutral-50 pb-2">
                <span className="text-neutral-500">Strategist Points</span>
                <span className="text-neutral-900">{strategistPoints} pts ({formatRupiah(strategistPoints * 250)})</span>
              </div>
              <div className="flex items-center justify-between border-b border-neutral-50 pb-2">
                <span className="text-neutral-500">Production Assistants</span>
                <span className="text-neutral-900">{productionPoints} pts ({formatRupiah(productionPoints * 250)})</span>
              </div>
              <div className="flex items-center justify-between border-b border-neutral-50 pb-2">
                <span className="text-neutral-500">Editor Specialization</span>
                <span className="text-neutral-900">{editorPoints} pts ({formatRupiah(editorPoints * 250)})</span>
              </div>
              <div className="flex items-center justify-between pb-1">
                <span className="text-neutral-500">Scheduler / Live Posting</span>
                <span className="text-neutral-900">{schedulerPoints} pts ({formatRupiah(schedulerPoints * 250)})</span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Advanced Client Utilization Analysis */}
      <div className="bg-white rounded-2xl border border-neutral-200 p-5 space-y-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-bold text-neutral-800 flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-emerald-650" /> Client Point Utilization & Gross Billing Review
            </h2>
            <p className="text-[10px] text-neutral-400">Track utilized points against allocated monthly quotas for active client accounts for {selectedMonth} {selectedYear}.</p>
          </div>

          {/* Client Search Bar */}
          <div className="relative max-w-xs w-full">
            <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-neutral-400" />
            <input
              type="text"
              placeholder="Search client name or code..."
              value={clientSearchQuery}
              onChange={(e) => setClientSearchQuery(e.target.value)}
              className="w-full bg-neutral-50 border border-neutral-200 rounded-lg pl-8 pr-3 py-1.5 text-xs text-neutral-800 focus:outline-hidden focus:border-neutral-400 transition"
            />
          </div>
        </div>

        {/* Client Leaderboard Table */}
        <div className="overflow-hidden border border-neutral-100 rounded-xl mt-4">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50 text-neutral-500 font-bold uppercase tracking-wider border-b border-neutral-100 font-mono text-[9px]">
              <tr>
                <th className="px-4 py-3">Client</th>
                <th className="px-4 py-3 text-right">Monthly Budget</th>
                <th className="px-4 py-3 text-center">Used Points / Burn Rate</th>
                <th className="px-4 py-3 text-right">Remaining Points</th>
                <th className="px-4 py-3 text-right">Gross Billing</th>
                <th className="px-4 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 text-neutral-700">
              {filteredClients.map((stat) => {
                const isDanger = stat.rawPct >= 90;
                const isWarning = stat.rawPct >= 70 && stat.rawPct < 90;
                return (
                  <tr key={stat.id} className="hover:bg-neutral-50/70 transition">
                    <td className="px-4 py-3.5 flex items-center gap-3">
                      <span 
                        className="w-2.5 h-7 rounded-sm block shrink-0" 
                        style={{ backgroundColor: stat.clientColor }} 
                      />
                      <div>
                        <p className="font-bold text-neutral-850">{stat.name}</p>
                        <p className="text-[10px] text-neutral-400 font-mono">{stat.code}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono font-bold text-neutral-700">
                      {stat.monthlyBudget} pts
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex flex-col items-center gap-1 max-w-xs mx-auto">
                        <div className="flex justify-between w-full text-[9px] font-mono font-bold text-neutral-500">
                          <span>{stat.usedPoints} pts</span>
                          <span>{stat.rawPct.toFixed(0)}%</span>
                        </div>
                        <div className="w-full bg-neutral-100 rounded-full h-2 overflow-hidden">
                          <div 
                            className={`h-2 rounded-full transition-all ${
                              isDanger ? 'bg-red-500 animate-pulse' : isWarning ? 'bg-amber-500' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${stat.pct}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono font-bold text-neutral-700">
                      {stat.remainingPoints} pts
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono font-bold text-neutral-900">
                      {formatRupiah(stat.billingValue)}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      {isDanger ? (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-red-50 border border-red-200 text-red-700 inline-flex items-center gap-1">
                          <AlertTriangle className="w-2.5 h-2.5" /> Critical
                        </span>
                      ) : isWarning ? (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-50 border border-amber-200 text-amber-700 inline-flex items-center gap-1">
                          Warning
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 border border-emerald-200 text-emerald-700 inline-flex items-center gap-1">
                          <CheckCircle2 className="w-2.5 h-2.5" /> Optimal
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filteredClients.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-neutral-400 italic font-mono">
                    No clients found matching the selected period.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Right Side Drawer (Slide-out panel) for Team Member Details */}
      {selectedUserDetail && (
        <div className="fixed inset-0 top-[64px] z-[10010] overflow-hidden flex justify-end">
          {/* Backdrop Blur Overlay */}
          <div 
            onClick={() => setSelectedUserDetail(null)}
            className="absolute inset-0 bg-black/45 backdrop-blur-xs transition-opacity animate-fadeIn"
          />

          {/* Drawer Body Panel */}
          <div className="relative w-full max-w-lg bg-white h-full shadow-2xl z-[10020] flex flex-col justify-between border-l border-neutral-200/80 animate-slideLeft">
            
            {/* Header Content */}
            <div className="p-6 border-b border-neutral-100 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-neutral-900 text-white flex items-center justify-center font-bold text-base uppercase">
                    {selectedUserDetail.name.substring(0, 2)}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-neutral-900">{selectedUserDetail.name}</h3>
                    <p className="text-[11px] text-neutral-400 font-mono font-bold uppercase tracking-wider">
                      {Array.isArray(selectedUserDetail.roles) ? selectedUserDetail.roles.join(', ') : selectedUserDetail.roles}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedUserDetail(null)}
                  className="p-1 text-neutral-400 hover:text-neutral-700 transition font-bold"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Stats Block Inside Drawer */}
              <div className="grid grid-cols-3 gap-3 bg-neutral-50 p-3 rounded-xl border border-neutral-100 text-center font-mono">
                <div className="space-y-0.5">
                  <p className="text-[9px] text-neutral-400 font-bold uppercase tracking-wider">Total Points</p>
                  <p className="text-sm font-bold text-neutral-900">{selectedUserDetail.totalPoints} pts</p>
                </div>
                <div className="space-y-0.5 border-x border-neutral-200">
                  <p className="text-[9px] text-neutral-400 font-bold uppercase tracking-wider">Total Jobs</p>
                  <p className="text-sm font-bold text-neutral-900">{selectedUserDetail.tasksCount}</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-[9px] text-neutral-400 font-bold uppercase tracking-wider">Total Payroll</p>
                  <p className="text-xs font-bold text-emerald-700 truncate">{formatRupiah(selectedUserDetail.totalPoints * 250)}</p>
                </div>
              </div>

              {/* Filter Row inside Drawer */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                {/* Search tasks */}
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-neutral-400" />
                  <input
                    type="text"
                    placeholder="Search client/content title..."
                    value={taskSearchQuery}
                    onChange={(e) => setTaskSearchQuery(e.target.value)}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-lg pl-8 pr-3 py-1.5 text-xs text-neutral-800 focus:outline-hidden focus:border-neutral-400 transition"
                  />
                </div>

                {/* Filter Selector */}
                <div className="flex bg-neutral-50 rounded-lg p-0.5 border border-neutral-200 text-[10px] font-bold">
                  <button 
                    onClick={() => setTaskFilterStatus('ALL')}
                    className={`px-2.5 py-1 rounded-md transition ${taskFilterStatus === 'ALL' ? 'bg-white text-neutral-900 shadow-xs' : 'text-neutral-400 hover:text-neutral-900'}`}
                  >
                    All
                  </button>
                  <button 
                    onClick={() => setTaskFilterStatus('ACTIVE')}
                    className={`px-2.5 py-1 rounded-md transition ${taskFilterStatus === 'ACTIVE' ? 'bg-white text-neutral-900 shadow-xs' : 'text-neutral-400 hover:text-neutral-900'}`}
                  >
                    Active
                  </button>
                  <button 
                    onClick={() => setTaskFilterStatus('POSTED')}
                    className={`px-2.5 py-1 rounded-md transition ${taskFilterStatus === 'POSTED' ? 'bg-white text-neutral-900 shadow-xs' : 'text-neutral-400 hover:text-neutral-900'}`}
                  >
                    Posted
                  </button>
                </div>
              </div>
            </div>

            {/* Scrollable Tasks/Jobs List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-3 bg-neutral-50/50">
              {detailsUserTasks.map((item, idx) => (
                <div key={`${item.id}-${idx}`} className="bg-white border border-neutral-200/60 p-4 rounded-xl shadow-xs space-y-3 flex flex-col justify-between hover:border-neutral-300 transition">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span 
                        className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider"
                        style={{ backgroundColor: `${item.clientColor}15`, color: item.clientColor }}
                      >
                        {item.clientName}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase ${
                        item.status === 'Posted' 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                          : 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                      }`}>
                        {item.status}
                      </span>
                    </div>
                    
                    <h4 className="font-bold text-xs text-neutral-900 leading-tight pt-1">
                      {item.title}
                    </h4>

                    <div className="flex items-center gap-2 text-[10px] text-neutral-400 pt-0.5 font-mono">
                      <span>{item.taskType}</span>
                      <span>•</span>
                      <span>{item.format}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-neutral-100 pt-2 text-[10px] font-semibold">
                    <span className="text-neutral-400 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {item.date}
                    </span>
                    <span className="font-bold text-emerald-700 text-xs font-mono">
                      +{item.points} pts
                    </span>
                  </div>
                </div>
              ))}

              {detailsUserTasks.length === 0 && (
                <div className="py-24 text-center text-neutral-450 italic font-mono text-xs">
                  No jobs found matching the selected filters.
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-neutral-100 bg-white text-left">
              <button 
                onClick={() => setSelectedUserDetail(null)}
                className="bg-neutral-900 hover:bg-neutral-800 text-white font-semibold text-xs px-4 py-2 rounded-lg shadow-xs transition"
              >
                Close Details
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
