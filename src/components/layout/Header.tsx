'use client';

import React, { useState } from 'react';
import { useUser } from '@/context/UserContext';
import { useData } from '@/context/DataContext';
import { useWorkspace } from '@/context/WorkspaceContext';
import {
  Search,
  Bell,
  ChevronDown,
  ShieldCheck,
  Zap,
  Building2,
  Plus,
  LogOut,
} from 'lucide-react';
import { GlobalSearchModal } from '@/components/search/GlobalSearchModal';

export function Header() {
  const { currentUser, logout } = useUser();
  const { tasks } = useData();
  const { currentWorkspace, workspaces, switchWorkspace, createWorkspace } = useWorkspace();

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isWorkspaceMenuOpen, setIsWorkspaceMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  const pendingApprovalsCount = tasks.filter((t) => t.status === 'Approval').length;

  const handleCreateNewWs = () => {
    const wsName = prompt('Enter new Workspace Name:');
    if (wsName) {
      createWorkspace(wsName);
      setIsWorkspaceMenuOpen(false);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full bg-white/90 backdrop-blur-md border-b border-neutral-200/80 px-6 py-3 flex items-center justify-between">
        {/* Left: Global Search Trigger & Workspace Selector */}
        <div className="flex items-center gap-4">
          {/* Workspace Switcher */}
          <div className="relative">
            <button
              onClick={() => setIsWorkspaceMenuOpen(!isWorkspaceMenuOpen)}
              className="flex items-center gap-2 bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 px-3 py-1.5 rounded-lg transition text-xs font-semibold text-neutral-900"
            >
              <Building2 className="w-4 h-4 text-neutral-500" />
              <span>{currentWorkspace.name}</span>
              <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
            </button>

            {isWorkspaceMenuOpen && (
              <div className="absolute left-0 mt-2 w-64 bg-white border border-neutral-200 rounded-xl shadow-lg p-2 z-50">
                <div className="px-3 py-2 border-b border-neutral-100 mb-1">
                  <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                    Workspaces ({workspaces.length})
                  </p>
                </div>
                <div className="space-y-1">
                  {workspaces.map((w) => (
                    <button
                      key={w.id}
                      onClick={() => {
                        switchWorkspace(w.id);
                        setIsWorkspaceMenuOpen(false);
                      }}
                      className={`w-full flex items-center justify-between p-2 rounded-lg text-xs transition ${
                        currentWorkspace.id === w.id
                          ? 'bg-neutral-100 text-neutral-900 font-semibold'
                          : 'hover:bg-neutral-50 text-neutral-700'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-neutral-400" />
                        <div className="text-left truncate">
                          <p className="font-semibold truncate">{w.name}</p>
                          <p className="text-[10px] text-neutral-400 font-mono">{w.billingPlan}</p>
                        </div>
                      </div>
                      {currentWorkspace.id === w.id && (
                        <span className="w-2 h-2 rounded-full bg-neutral-900" />
                      )}
                    </button>
                  ))}

                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => setIsSearchOpen(true)}
            className="flex items-center gap-3 bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 text-neutral-500 px-4 py-2 rounded-lg text-xs font-medium w-64 transition group"
          >
            <Search className="w-4 h-4 text-neutral-400 group-hover:text-neutral-600 transition" />
            <span className="flex-1 text-left">Search tasks, clients...</span>
            <kbd className="bg-white text-neutral-500 px-1.5 py-0.5 rounded text-[10px] font-mono border border-neutral-200">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Right: Persona Switcher & Notifications */}
        <div className="flex items-center gap-3">
          {/* Notifications Trigger */}
          <div className="relative">
            <button
              onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
              className="p-2 rounded-lg bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 text-neutral-600 transition relative"
            >
              <Bell className="w-4.5 h-4.5" />
              {pendingApprovalsCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-amber-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {pendingApprovalsCount}
                </span>
              )}
            </button>

            {/* Notifications Dropdown */}
            {isNotificationsOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-white border border-neutral-200 rounded-xl shadow-xl p-4 z-50">
                <div className="flex items-center justify-between pb-2 border-b border-neutral-100 mb-3">
                  <h4 className="text-xs font-semibold text-neutral-900 uppercase tracking-wider">
                    Notifications
                  </h4>
                  <span className="text-[10px] text-neutral-400 font-mono">Live Bus</span>
                </div>
                <div className="space-y-2.5 max-h-64 overflow-y-auto text-xs">
                  <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200">
                    <p className="font-semibold text-amber-800 flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5" /> Approval Required
                    </p>
                    <p className="text-neutral-700 mt-1">Samazama Ramen Promo Reel needs Strategist approval.</p>
                    <p className="text-[10px] text-neutral-400 mt-1">10 minutes ago</p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-neutral-50 border border-neutral-200">
                    <p className="font-semibold text-neutral-900">Budget Warning</p>
                    <p className="text-neutral-600 mt-1">Baking Empire Kelapa Gading hit 90% point limit.</p>
                    <p className="text-[10px] text-neutral-400 mt-1">1 hour ago</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* User Persona Switcher */}
          <div className="relative">
            <button
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="flex items-center gap-2.5 bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 px-3 py-1.5 rounded-lg transition"
            >
              {currentUser.avatar ? (
                <img
                  src={currentUser.avatar}
                  alt={currentUser.name}
                  className="w-7 h-7 rounded-full object-cover border border-neutral-200"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-neutral-900 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                  {currentUser.name.charAt(0)}
                </div>
              )}
              <div className="text-left hidden sm:block">
                <p className="text-xs font-semibold text-neutral-900 leading-tight">{currentUser.name}</p>
                <p className="text-[10px] text-neutral-500 leading-none">{currentUser.roles.join(', ')}</p>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
            </button>

            {/* Logged-In User Profile & Sign Out Dropdown */}
            {isUserMenuOpen && (
              <div className="absolute right-0 mt-2.5 w-72 bg-white border border-neutral-200/90 rounded-2xl shadow-2xl p-4 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-start gap-3.5 pb-3.5 border-b border-neutral-100">
                  {currentUser.avatar ? (
                    <img src={currentUser.avatar} alt={currentUser.name} className="w-11 h-11 rounded-full object-cover border border-neutral-200 shrink-0 shadow-xs" />
                  ) : (
                    <div className="w-11 h-11 rounded-full bg-neutral-900 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-xs">
                      {currentUser.name.charAt(0)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0 text-left space-y-1">
                    <p className="font-extrabold text-neutral-900 text-sm leading-tight truncate">{currentUser.name}</p>
                    <p className="text-[11px] text-neutral-500 font-mono truncate">{currentUser.email || `${currentUser.name.toLowerCase()}@personaos.com`}</p>
                    <div className="flex flex-wrap gap-1 pt-1">
                      {currentUser.roles.map((role) => (
                        <span key={role} className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-700 border border-neutral-200/80">
                          {role}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-3">
                  <button
                    onClick={() => {
                      logout();
                      setIsUserMenuOpen(false);
                    }}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-700 rounded-xl text-xs font-bold transition border border-rose-100 shadow-2xs active:scale-98"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out of Persona</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Global Search Modal */}
      <GlobalSearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </>
  );
}
