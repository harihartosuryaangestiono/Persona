'use client';

import React, { useState, useEffect } from 'react';
import { useUser } from '@/context/UserContext';
import { useData } from '@/context/DataContext';
import { useWorkspace } from '@/context/WorkspaceContext';
import { Plus, X, Calendar as CalendarIcon, Link2, CheckCircle2 } from 'lucide-react';
import { calculateAutoDeadline } from '@/lib/score-calculator';

export function FloatingQuickAction() {
  const { currentUser, allUsers } = useUser();
  const { clients, addTask } = useData();
  const { currentWorkspace } = useWorkspace();
  
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [clientId, setClientId] = useState('');
  const [category, setCategory] = useState<'Strategic' | 'Production' | 'Editing' | 'Scheduling'>('Editing');
  const [postingDate, setPostingDate] = useState(new Date().toISOString().split('T')[0]);
  const [deadline, setDeadline] = useState(calculateAutoDeadline(new Date().toISOString().split('T')[0], -3));
  const [month, setMonth] = useState('July');
  const [year, setYear] = useState(2026);
  const [assignedPIC, setAssignedPIC] = useState('');
  const [driveLink, setDriveLink] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const activeClients = clients.filter((c) => c.status === 'Active' || c.active);

  // Set defaults
  useEffect(() => {
    if (activeClients.length > 0 && !clientId) {
      setClientId(activeClients[0].id);
    }
  }, [activeClients, clientId]);

  useEffect(() => {
    if (currentUser && !assignedPIC) {
      setAssignedPIC(currentUser.id);
    }
  }, [currentUser, assignedPIC]);

  // Sync Month, Year and Deadline when postingDate changes
  useEffect(() => {
    if (postingDate) {
      const d = new Date(postingDate);
      if (!isNaN(d.getTime())) {
        const monthNames = [
          'January', 'February', 'March', 'April', 'May', 'June',
          'July', 'August', 'September', 'October', 'November', 'December'
        ];
        setMonth(monthNames[d.getMonth()]);
        setYear(d.getFullYear());
      }
      setDeadline(calculateAutoDeadline(postingDate, -3));
    }
  }, [postingDate]);

  // Determine allowed categories based on user role (Requirement 7)
  const isExecutive = currentUser?.roles.includes('Admin') || currentUser?.roles.includes('Owner');
  const isStrategist = currentUser?.roles.includes('Strategist');
  const isEditor = currentUser?.roles.includes('Editor');
  const isScheduler = currentUser?.roles.includes('Scheduler');

  const canCreateStrategic = isExecutive || isStrategist;
  const canCreateProduction = isExecutive || isStrategist || isEditor || currentUser?.roles.includes('Production Assistant');

  // Enforce assignment restrictions: PA/Editor/Scheduler cannot assign other employees (Requirement 7)
  const canAssignOthers = isExecutive || isStrategist;

  // Correct starting status based on category (Requirement 8)
  const getFirstStatus = (cat: string) => {
    if (cat === 'Strategic') return 'Brief';
    if (cat === 'Production') return 'Production';
    if (cat === 'Editing') return 'Editing';
    return 'Scheduling';
  };

  const handleOpen = () => {
    // Reset Form
    setTitle('');
    setDriveLink('');
    setSuccess(false);
    
    if (typeof window !== 'undefined') {
      const cachedClient = localStorage.getItem('lastQuickClientId');
      const cachedCategory = localStorage.getItem('lastQuickCategory');
      const cachedPIC = localStorage.getItem('lastQuickPIC');

      if (cachedClient && activeClients.some(c => c.id === cachedClient)) {
        setClientId(cachedClient);
      } else if (activeClients.length > 0) {
        setClientId(activeClients[0].id);
      }

      if (cachedCategory) {
        setCategory(cachedCategory as any);
      } else {
        if (canCreateStrategic) setCategory('Strategic');
        else if (canCreateProduction) setCategory('Production');
        else setCategory('Scheduling');
      }

      if (cachedPIC) {
        setAssignedPIC(cachedPIC);
      } else if (currentUser) {
        setAssignedPIC(currentUser.id);
      }
    } else {
      if (activeClients.length > 0) setClientId(activeClients[0].id);
      if (currentUser) setAssignedPIC(currentUser.id);
      if (canCreateStrategic) {
        setCategory('Strategic');
      } else if (canCreateProduction) {
        setCategory('Production');
      } else {
        setCategory('Scheduling');
      }
    }
    setIsOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !clientId || loading) return;

    setLoading(true);
    try {
      const selectedClient = clients.find((c) => c.id === clientId);
      const startingStatus = getFirstStatus(category);

      // Map categories to appropriate score calculation targets
      let scoreCat = 'Editor';
      let taskType = 'Editing';
      let format = 'Reels';
      let baseScore = 150;

      if (category === 'Strategic') {
        scoreCat = 'Strategic';
        taskType = 'Content Plan';
        format = '4 Jam';
        baseScore = 400;
      } else if (category === 'Production') {
        scoreCat = 'Assistant';
        taskType = 'Production Assistant';
        format = '4 Jam';
        baseScore = 400;
      } else if (category === 'Scheduling') {
        scoreCat = 'Scheduler';
        taskType = 'Scheduling';
        format = 'Per Post';
        baseScore = 5;
      }

      // Initial task stage setup
      const defaultStage = {
        id: `stg-${Date.now()}`,
        role: category === 'Strategic' ? 'Strategist' : (category === 'Production' ? 'Production Assistant' : (category === 'Scheduling' ? 'Scheduler' : 'Editor')),
        userId: assignedPIC || currentUser?.id || '',
        userName: allUsers.find(u => u.id === assignedPIC)?.name || currentUser?.name || '',
        taskType,
        format,
        qty: 1,
        score: baseScore,
      };

      await addTask({
        title,
        clientId,
        clientName: selectedClient?.name || 'Unknown Client',
        clientColor: selectedClient?.clientColor || '#3B82F6',
        workspaceId: currentWorkspace?.id || selectedClient?.workspaceId || 'ws-team-anggi',
        category,
        taskType,
        format,
        postingDate,
        deadline,
        status: startingStatus as any,
        assignedUserIds: [assignedPIC || currentUser?.id || ''],
        score: baseScore,
        cogs: baseScore * 250,
        driveLink,
        month,
        year,
        stages: [defaultStage],
      });

      // Cache memory for pre-filling next creation (Requirement 14)
      if (typeof window !== 'undefined') {
        localStorage.setItem('lastQuickClientId', clientId);
        localStorage.setItem('lastQuickCategory', category);
        localStorage.setItem('lastQuickPIC', assignedPIC);
      }

      setSuccess(true);
      setTimeout(() => {
        setIsOpen(false);
        setSuccess(false);
      }, 1000);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={handleOpen}
        aria-label="Quick Create Task"
        className="fixed bottom-6 right-6 z-[9999] w-14 h-14 rounded-full bg-neutral-900 hover:bg-neutral-800 text-white flex items-center justify-center shadow-2xl transition transform hover:scale-105 active:scale-95 border border-neutral-800"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Quick Create Task Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-[10000] bg-neutral-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white border border-neutral-200 shadow-2xl rounded-2xl w-full max-w-lg overflow-hidden animate-scaleUp">
            {/* Header */}
            <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between">
              <h2 className="text-sm font-bold text-neutral-900 tracking-tight flex items-center gap-2">
                <Plus className="w-4.5 h-4.5 text-neutral-500" /> Quick Create Content Task
              </h2>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg hover:bg-neutral-50 text-neutral-400 hover:text-neutral-600 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            {success ? (
              <div className="p-8 text-center space-y-3 flex flex-col items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-250 flex items-center justify-center text-emerald-600 animate-bounce">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-neutral-900">Task Created Successfully</h3>
                <p className="text-xs text-neutral-550">Workflow and priority have been initialized.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs font-medium text-neutral-700">
                <div className="space-y-1">
                  <label className="block text-neutral-700 font-bold">Content Title *</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. POV Bakery Behind the Scenes"
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2 text-neutral-900 focus:bg-white focus:outline-hidden transition"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-neutral-700 font-bold">Select Client *</label>
                    <select
                      required
                      value={clientId}
                      onChange={(e) => setClientId(e.target.value)}
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-2.5 py-2 text-neutral-900 focus:bg-white focus:outline-hidden transition"
                    >
                      {activeClients.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-neutral-700 font-bold">Workflow Category *</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as any)}
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-2.5 py-2 text-neutral-900 focus:bg-white focus:outline-hidden transition"
                    >
                      {canCreateStrategic && <option value="Strategic">Strategic</option>}
                      {canCreateProduction && <option value="Production">Production</option>}
                      <option value="Editing">Editing</option>
                      <option value="Scheduling">Scheduling</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-neutral-700 font-bold">Posting Date *</label>
                    <input
                      type="date"
                      required
                      value={postingDate}
                      onChange={(e) => setPostingDate(e.target.value)}
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-2.5 py-2 text-neutral-900 focus:bg-white focus:outline-hidden transition"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-neutral-700 font-bold flex items-center justify-between">
                      <span>Deadline *</span>
                      <span className="text-[9px] font-bold text-neutral-450 uppercase">Auto (-3d)</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={deadline}
                      onChange={(e) => setDeadline(e.target.value)}
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-2.5 py-2 text-neutral-900 focus:bg-white focus:outline-hidden transition"
                    />
                  </div>
                </div>

                {/* Reporting Period - Mandatory */}
                <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-xl grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-neutral-500 font-bold">Reporting Month *</label>
                    <select
                      value={month}
                      onChange={(e) => setMonth(e.target.value)}
                      className="w-full bg-white border border-neutral-250 rounded-lg px-2 py-1.5 text-neutral-900 font-bold"
                    >
                      {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-neutral-500 font-bold">Reporting Year *</label>
                    <input
                      type="number"
                      required
                      value={year}
                      onChange={(e) => setYear(Number(e.target.value))}
                      className="w-full bg-white border border-neutral-250 rounded-lg px-2 py-1.5 text-neutral-900 font-bold font-mono text-center"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-1">
                    <label className="block text-neutral-700 font-bold">Assignee PIC *</label>
                    <select
                      value={assignedPIC}
                      disabled={!canAssignOthers}
                      onChange={(e) => setAssignedPIC(e.target.value)}
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-2.5 py-2 text-neutral-900 focus:bg-white focus:outline-hidden transition disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                      {!canAssignOthers && currentUser && (
                        <option value={currentUser.id}>{currentUser.name} (Myself)</option>
                      )}
                      {canAssignOthers && allUsers.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name} ({u.roles.join(', ')})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-neutral-700 font-bold flex items-center gap-1">
                    <Link2 className="w-3.5 h-3.5 text-neutral-450" /> Asset Drive Link
                  </label>
                  <input
                    type="url"
                    value={driveLink}
                    onChange={(e) => setDriveLink(e.target.value)}
                    placeholder="https://drive.google.com/..."
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2 text-neutral-900 focus:bg-white focus:outline-hidden transition"
                  />
                </div>

                {/* Footer Buttons */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-100">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="px-4 py-2 rounded-lg hover:bg-neutral-55 text-neutral-500 font-bold transition text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-neutral-900 hover:bg-neutral-800 text-white font-bold px-5 py-2 rounded-lg shadow-sm transition text-xs flex items-center gap-1.5"
                  >
                    {loading ? 'Creating...' : 'Create Task'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}

