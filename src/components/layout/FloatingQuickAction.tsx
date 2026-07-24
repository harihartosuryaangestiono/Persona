'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/context/UserContext';
import { Plus, Upload, CheckCircle2, Video, Clock, DollarSign, X } from 'lucide-react';

export function FloatingQuickAction() {
  const { currentUser } = useUser();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  const getQuickActions = () => {
    const roles = currentUser?.roles || [];
    const actions: { label: string; icon: any; onClick: () => void }[] = [];

    if (roles.includes('Owner') || roles.includes('Admin')) {
      actions.push(
        { label: 'Approve Pending Tasks', icon: CheckCircle2, onClick: () => router.push('/approval') },
        { label: 'Adjust Client Budget', icon: DollarSign, onClick: () => router.push('/client-budget') }
      );
    }

    if (roles.includes('Strategist')) {
      actions.push(
        { label: 'Create Strategic Brief', icon: Plus, onClick: () => router.push('/kanban') },
        { label: 'Create Content Proposal', icon: Plus, onClick: () => router.push('/kanban') }
      );
    }

    if (roles.includes('Editor')) {
      actions.push(
        { label: 'Upload Preview Link', icon: Upload, onClick: () => router.push('/kanban') },
        { label: 'Submit Revision', icon: CheckCircle2, onClick: () => router.push('/kanban') }
      );
    }

    if (roles.includes('Scheduler')) {
      actions.push(
        { label: 'Schedule Post', icon: Clock, onClick: () => router.push('/scheduling') }
      );
    }

    if (roles.includes('Production Assistant')) {
      actions.push(
        { label: 'Start Shooting', icon: Video, onClick: () => router.push('/production') }
      );
    }

    return actions;
  };

  const currentActions = getQuickActions();

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Action Popover Menu */}
      {isOpen && (
        <div className="mb-3 space-y-2 flex flex-col items-end animate-fadeIn">
          {currentActions.map((act, i) => {
            const Icon = act.icon;
            return (
              <button
                key={i}
                onClick={() => {
                  act.onClick();
                  setIsOpen(false);
                }}
                className="flex items-center gap-2.5 bg-neutral-900 text-white hover:bg-neutral-800 text-xs font-semibold px-4 py-2.5 rounded-xl shadow-lg transition"
              >
                <span>{act.label}</span>
                <Icon className="w-4 h-4 text-neutral-300" />
              </button>
            );
          })}
        </div>
      )}

      {/* Main Trigger FAB */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-12 h-12 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white flex items-center justify-center shadow-lg transition transform hover:scale-105 active:scale-95"
      >
        {isOpen ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
      </button>
    </div>
  );
}
