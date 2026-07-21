'use client';

import React, { useState } from 'react';
import { BookOpen, CheckSquare, ShieldCheck } from 'lucide-react';

export default function SopCenterPage() {
  const [activeDept, setActiveDept] = useState<'Strategist' | 'Editor' | 'Production' | 'Scheduler' | 'Admin'>('Editor');

  const SOPS = {
    Editor: [
      {
        title: 'Master Video Editing Workflow (Reels/TikTok 4K)',
        steps: [
          'Download RAW footage from Google Drive Master Folder within 2 hours of upload.',
          'Import into Premiere Pro / DaVinci Resolve with 9:16 vertical ratio preset.',
          'Apply client brand color grading LUT from Brand Hub.',
          'Add animated captions with 1.2x pacing and sound effects.',
          'Export in 1080x1920 H.264 high quality format.',
          'Upload draft link to Kanban card for Strategist & Client Approval.',
        ],
        version: '2026.2',
      },
      {
        title: 'Carousel Graphic Design Standard Operating Procedure',
        steps: [
          'Open Figma master template for client.',
          'Ensure primary & secondary brand colors strictly adhere to Brand Hub values.',
          'Use 1080x1350 resolution for 4:5 Instagram carousel layout.',
          'Export PNG 2x for ultra crisp typography on mobile screens.',
        ],
        version: '2026.1',
      },
    ],
    Strategist: [
      {
        title: 'Monthly Content Plan & Scriptwriting Standard',
        steps: [
          'Conduct monthly brand positioning review with Client Lead.',
          'Draft content pillar breakdown (Edukasi, Fun, Promo, Behind the Scenes).',
          'Calculate total monthly point budget vs Client Monthly Budget limit.',
          'Submit Content Plan presentation for Owner approval.',
        ],
        version: '2026.1',
      },
    ],
    Production: [
      {
        title: 'On-Location Shooting Prep & Equipment Checklist',
        steps: [
          'Verify camera batteries are 100% charged night before shoot.',
          'Check wireless lapel mics and backup audio recorders.',
          'Review shoot shotlist and lighting setup with Production Lead.',
          'Upload raw footage to Google Drive within 24 hours of shoot completion.',
        ],
        version: '2026.3',
      },
    ],
    Scheduler: [
      {
        title: 'Social Media Scheduling & Posting Protocol',
        steps: [
          'Confirm task status is set to Approved by Strategist.',
          'Copy approved caption and official client hashtag set from Content Plan.',
          'Schedule post for peak engagement hour specified in client analytics.',
          'Move task status in Kanban from Scheduling to Posted.',
        ],
        version: '2026.1',
      },
    ],
    Admin: [
      {
        title: 'Client Point Budget Guardrail & Invoicing Protocol',
        steps: [
          'Audit worklog entries weekly to ensure score accuracy (1 pt = Rp250).',
          'Send automated warning when client hits 80% point budget usage.',
          'Prepare monthly executive performance report for Owner review.',
        ],
        version: '2026.1',
      },
    ],
  };

  return (
    <div className="space-y-6 animate-fadeIn text-neutral-900">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900 flex items-center gap-2">
            Standard Operating Procedures (SOP) Center <span className="text-xs font-mono bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-full border border-neutral-200">Quality Compliance</span>
          </h1>
          <p className="text-xs text-neutral-500">
            Departmental operational standards, step-by-step checklists, training videos, and PDF guides.
          </p>
        </div>
      </div>

      {/* Department Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 p-2 bg-white border border-neutral-200/80 rounded-2xl shadow-xs">
        {(['Strategist', 'Editor', 'Production', 'Scheduler', 'Admin'] as const).map((dept) => (
          <button
            key={dept}
            onClick={() => setActiveDept(dept)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-2 whitespace-nowrap ${
              activeDept === dept
                ? 'bg-neutral-900 text-white shadow-xs'
                : 'bg-neutral-100 text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            {dept} Department
          </button>
        ))}
      </div>

      {/* SOP Content List */}
      <div className="space-y-6">
        {SOPS[activeDept].map((sop, idx) => (
          <div
            key={idx}
            className="p-6 rounded-2xl bg-white border border-neutral-200/80 shadow-xs space-y-4"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-100 pb-3">
              <h3 className="text-base font-bold text-neutral-900 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-neutral-700" /> {sop.title}
              </h3>
              <span className="text-[10px] font-mono text-neutral-600 bg-neutral-100 border border-neutral-200 px-2 py-1 rounded-md">
                Version {sop.version}
              </span>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Step-by-step Execution Checklist:</p>
              <div className="space-y-2">
                {sop.steps.map((step, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-neutral-50 border border-neutral-200 text-xs text-neutral-900 font-medium">
                    <CheckSquare className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                    <span>{step}</span>
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
