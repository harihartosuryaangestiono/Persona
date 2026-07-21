'use client';

import React, { useState, useEffect } from 'react';
import { useData } from '@/context/DataContext';
import { Search, X, CheckSquare, Users, Briefcase, FileText, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export function GlobalSearchModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [query, setQuery] = useState('');
  const { tasks, clients, worklogs } = useData();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        isOpen ? onClose() : null;
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredTasks = query.trim()
    ? tasks.filter(
        (t) =>
          t.title.toLowerCase().includes(query.toLowerCase()) ||
          t.clientName?.toLowerCase().includes(query.toLowerCase())
      )
    : [];

  const filteredClients = query.trim()
    ? clients.filter((c) => c.name.toLowerCase().includes(query.toLowerCase()))
    : [];

  const filteredWorklogs = query.trim()
    ? worklogs.filter((w) => w.contentTitle.toLowerCase().includes(query.toLowerCase()))
    : [];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-black/60 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-700/60 rounded-2xl shadow-2xl overflow-hidden glass-panel">
        <div className="flex items-center px-4 py-3 border-b border-slate-800">
          <Search className="w-5 h-5 text-slate-400 mr-3" />
          <input
            type="text"
            placeholder="Type to search tasks, clients, worklogs, files..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-slate-100 placeholder-slate-500 focus:outline-none text-base font-medium"
            autoFocus
          />
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="max-h-96 overflow-y-auto p-4 space-y-4">
          {!query.trim() && (
            <div className="text-center py-8 text-slate-500">
              <p className="text-sm font-medium">Search anything across Persona OS</p>
              <p className="text-xs text-slate-600 mt-1">Try searching "Baking Empire", "Reels", "Jabin", or "Menu"</p>
            </div>
          )}

          {filteredTasks.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                <CheckSquare className="w-3.5 h-3.5 text-blue-400" /> Tasks ({filteredTasks.length})
              </h4>
              <div className="space-y-1">
                {filteredTasks.slice(0, 5).map((t) => (
                  <Link
                    key={t.id}
                    href="/kanban"
                    onClick={onClose}
                    className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-800/60 transition group"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-200 group-hover:text-blue-400 transition">
                        {t.title}
                      </p>
                      <p className="text-xs text-slate-400">
                        {t.clientName} • <span className="text-slate-500">{t.status}</span>
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-blue-400 group-hover:translate-x-1 transition" />
                  </Link>
                ))}
              </div>
            </div>
          )}

          {filteredClients.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                <Briefcase className="w-3.5 h-3.5 text-purple-400" /> Clients ({filteredClients.length})
              </h4>
              <div className="space-y-1">
                {filteredClients.map((c) => (
                  <Link
                    key={c.id}
                    href="/clients"
                    onClick={onClose}
                    className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-800/60 transition group"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-200 group-hover:text-purple-400 transition">
                        {c.name}
                      </p>
                      <p className="text-xs text-slate-400">
                        Budget: {c.monthlyPointBudget} pts • Remaining: {c.remainingPoint} pts
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-purple-400 group-hover:translate-x-1 transition" />
                  </Link>
                ))}
              </div>
            </div>
          )}

          {filteredWorklogs.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                <FileText className="w-3.5 h-3.5 text-emerald-400" /> Worklog Records ({filteredWorklogs.length})
              </h4>
              <div className="space-y-1">
                {filteredWorklogs.slice(0, 4).map((w) => (
                  <Link
                    key={w.id}
                    href="/worklog"
                    onClick={onClose}
                    className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-800/60 transition group"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-200 group-hover:text-emerald-400 transition">
                        {w.contentTitle}
                      </p>
                      <p className="text-xs text-slate-400">
                        {w.taskType} • {w.score} pts
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-emerald-400 group-hover:translate-x-1 transition" />
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
