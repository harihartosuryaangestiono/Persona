'use client';

import React, { useState } from 'react';
import { Zap, ArrowRight } from 'lucide-react';
import { DEFAULT_AUTOMATIONS } from '@/lib/services/automation-service';

export default function AutomationsPage() {
  const [rules, setRules] = useState(DEFAULT_AUTOMATIONS);

  const toggleRule = (id: string) => {
    setRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, active: !r.active } : r))
    );
  };

  return (
    <div className="space-y-6 animate-fadeIn text-neutral-900">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900 flex items-center gap-2">
            Automation Engine <span className="text-xs font-mono bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-full border border-neutral-200">No-Code Pipelines</span>
          </h1>
          <p className="text-xs text-neutral-500">
            Event-driven trigger and action workflows connecting Kanban, approvals, scheduling, client budget, and activity logs.
          </p>
        </div>
      </div>

      {/* Rules List */}
      <div className="space-y-4">
        {rules.map((rule) => (
          <div
            key={rule.id}
            className="p-6 rounded-2xl bg-white border border-neutral-200/80 space-y-4 shadow-xs"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-neutral-100 text-neutral-900">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-900">{rule.name}</h3>
                  <p className="text-xs text-neutral-500 font-mono mt-0.5">Trigger: EventBus.{rule.triggerEvent}</p>
                </div>
              </div>

              <button
                onClick={() => toggleRule(rule.id)}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold font-mono transition ${
                  rule.active
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-neutral-100 text-neutral-500 border border-neutral-200'
                }`}
              >
                {rule.active ? 'ACTIVE' : 'PAUSED'}
              </button>
            </div>

            {/* Action Flow */}
            <div className="space-y-2 pt-2 border-t border-neutral-100">
              <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Automated Actions Sequence:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                {rule.actions.map((act, i) => (
                  <div key={i} className="p-3 rounded-xl bg-neutral-50 border border-neutral-200 text-xs text-neutral-900 flex items-center gap-2 font-medium">
                    <ArrowRight className="w-4 h-4 text-neutral-400 shrink-0" />
                    <span>{act}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
