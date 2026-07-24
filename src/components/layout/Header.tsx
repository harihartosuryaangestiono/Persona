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
  const { currentUser, switchUserByName, allUsers, logout } = useUser();
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

                  <button
                    onClick={handleCreateNewWs}
                    className="w-full flex items-center gap-2 p-2 rounded-lg text-xs text-neutral-800 hover:bg-neutral-100 font-semibold transition mt-2 border border-dashed border-neutral-300"
                  >
                    <Plus className="w-4 h-4" /> Create Workspace
                  </button>
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

            {/* Persona Switcher Dropdown */}
            {isUserMenuOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white border border-neutral-200 rounded-xl shadow-xl p-2 z-50">
                <div className="px-3 py-2 border-b border-neutral-100 mb-1">
                  <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-neutral-600" /> Active Persona Switcher
                  </p>
                  <p className="text-[10px] text-neutral-400 mt-0.5">Switch user context to test RBX views</p>
                </div>
                <div className="space-y-1">
                  {allUsers.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => {
                        switchUserByName(u.name);
                        setIsUserMenuOpen(false);
                      }}
                      className={`w-full flex items-center justify-between p-2 rounded-lg text-xs transition ${
                        currentUser.name === u.name
                          ? 'bg-neutral-100 text-neutral-900 font-semibold'
                          : 'hover:bg-neutral-50 text-neutral-700'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        {u.avatar ? (
                          <img src={u.avatar} alt={u.name} className="w-6 h-6 rounded-full object-cover" />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-neutral-900 text-white flex items-center justify-center font-bold text-[10px] shrink-0">
                            {u.name.charAt(0)}
                          </div>
                        )}
                        <div className="text-left">
                          <p className="font-semibold">{u.name}</p>
                          <p className="text-[10px] text-neutral-500">{u.roles.join(', ')}</p>
                        </div>
                      </div>
                      {currentUser.name === u.name && (
                        <span className="w-2 h-2 rounded-full bg-neutral-900" />
                      )}
                    </button>
                  ))}
                </div>
                <div className="pt-2 mt-2 border-t border-neutral-100">
                  <button
                    onClick={() => {
                      logout();
                      setIsUserMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2 p-2 hover:bg-red-50 text-red-600 hover:text-red-700 rounded-lg text-xs font-semibold transition"
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
