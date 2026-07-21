'use client';

import React, { useState } from 'react';
import { useData } from '@/context/DataContext';
import { Search, ExternalLink } from 'lucide-react';

export default function ContentDatabasePage() {
  const { worklogs } = useData();
  const [searchQuery, setSearchQuery] = useState('');

  const postedLogs = worklogs.filter((w) => w.status === 'Posted');

  return (
    <div className="space-y-6 animate-fadeIn text-neutral-900">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900 flex items-center gap-2">
            Published Content Database Vault <span className="text-xs font-mono bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-full border border-neutral-200">{postedLogs.length} Archived Posts</span>
          </h1>
          <p className="text-xs text-neutral-500">
            Permanent searchable archive of every published creative content across Instagram, TikTok, YouTube, and LinkedIn.
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="p-3 rounded-2xl bg-white border border-neutral-200/80 shadow-xs">
        <div className="flex items-center gap-2 bg-neutral-50 px-3 py-1.5 rounded-lg border border-neutral-200 text-xs text-neutral-700">
          <Search className="w-4 h-4 text-neutral-400" />
          <input
            type="text"
            placeholder="Search published content by title, client, or creator..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent focus:outline-none w-full placeholder-neutral-400"
          />
        </div>
      </div>

      {/* Content Vault Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {postedLogs
          .filter((w) => w.contentTitle.toLowerCase().includes(searchQuery.toLowerCase()))
          .map((item) => (
            <div
              key={item.id}
              className="p-5 rounded-2xl bg-white border border-neutral-200/80 hover:border-neutral-300 shadow-xs transition space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-neutral-100 text-neutral-800 border border-neutral-200">
                    {item.clientName}
                  </span>
                  <span className="text-[10px] text-neutral-400 font-mono">
                    {new Date(item.date).toISOString().split('T')[0]}
                  </span>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-neutral-900 leading-snug">{item.contentTitle}</h4>
                  <p className="text-xs text-neutral-500 mt-1 font-mono">{item.format || 'Reels'} • {item.score} pts</p>
                </div>

                <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200 text-[11px] text-neutral-600 italic">
                  "{item.contentTitle} — Master content archive for agency reference."
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-neutral-100 text-xs">
                <span className="text-neutral-500 font-semibold">PIC: {item.userName}</span>
                {item.previewLink ? (
                  <a
                    href={item.previewLink}
                    target="_blank"
                    rel="noreferrer"
                    className="text-neutral-900 font-semibold hover:underline flex items-center gap-1"
                  >
                    View Post <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                ) : (
                  <span className="text-neutral-300">—</span>
                )}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
