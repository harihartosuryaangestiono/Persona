'use client';

import React, { useState } from 'react';
import { useData } from '@/context/DataContext';
import {
  Palette,
  ExternalLink,
  BookOpen,
  Layers,
  CheckCircle2,
  XCircle,
  FileText,
  Edit3,
  Plus,
  X,
  Save,
} from 'lucide-react';

interface BrandSpec {
  clientId: string;
  toneOfVoice: string;
  targetAudience: string;
  dos: string[];
  donts: string[];
  driveLink: string;
  primaryColor?: string;
  secondaryColor?: string;
}

function formatUrl(url: string): string {
  if (!url) return '';
  const trimmed = url.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

export default function BrandHubPage() {
  const { clients } = useData();
  const [selectedClientId, setSelectedClientId] = useState(clients[0]?.id || '');

  // Brand Specs state for clients
  const [brandSpecs, setBrandSpecs] = useState<Record<string, BrandSpec>>({
    [clients[0]?.id || 'c-1']: {
      clientId: clients[0]?.id || 'c-1',
      toneOfVoice: 'Premium, Gen-Z friendly, warm, appetizing, informative, and engaging. Avoid overly corporate or cold phrasing.',
      targetAudience: 'Young professionals, foodies, culinary enthusiasts, parents aged 18–35 looking for premium aesthetic lifestyle content.',
      dos: [
        'Use high-resolution 4K product closeups',
        'Apply warm color grading and clean lighting',
        'Include subtle sound effects for ASMR videos',
        'Always tag official client social media handles',
      ],
      donts: [
        'Never use blurry or pixelated graphics',
        'Do not mix unapproved font families',
        'Avoid overly aggressive hard sales captions',
        'Do not alter official brand logo proportions',
      ],
      driveLink: 'https://drive.google.com',
      primaryColor: '#3B82F6',
      secondaryColor: '#8B5CF6',
    },
  });

  // Modal State for Edit & Add
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddRuleModalOpen, setIsAddRuleModalOpen] = useState(false);

  const activeClient = clients.find((c) => c.id === selectedClientId) || clients[0];
  const activeSpec: BrandSpec = brandSpecs[selectedClientId] || {
    clientId: selectedClientId,
    toneOfVoice: 'Warm, professional, creative, and engaging.',
    targetAudience: 'General social media audience & brand followers.',
    dos: ['Use official logo assets', 'Apply consistent color palettes'],
    donts: ['Do not modify logo colors', 'Do not post low quality images'],
    driveLink: 'https://drive.google.com',
    primaryColor: activeClient?.clientColor || '#3B82F6',
    secondaryColor: '#8B5CF6',
  };

  // Editing form state
  const [editTone, setEditTone] = useState(activeSpec.toneOfVoice);
  const [editAudience, setEditAudience] = useState(activeSpec.targetAudience);
  const [editDosText, setEditDosText] = useState(activeSpec.dos.join('\n'));
  const [editDontsText, setEditDontsText] = useState(activeSpec.donts.join('\n'));
  const [editDriveLink, setEditDriveLink] = useState(activeSpec.driveLink);

  // New Rule Form State
  const [newRuleType, setNewRuleType] = useState<'DO' | 'DONT'>('DO');
  const [newRuleText, setNewRuleText] = useState('');

  const openEditModal = () => {
    setEditTone(activeSpec.toneOfVoice);
    setEditAudience(activeSpec.targetAudience);
    setEditDosText(activeSpec.dos.join('\n'));
    setEditDontsText(activeSpec.donts.join('\n'));
    setEditDriveLink(activeSpec.driveLink);
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedSpec: BrandSpec = {
      clientId: selectedClientId,
      toneOfVoice: editTone,
      targetAudience: editAudience,
      dos: editDosText.split('\n').filter((line) => line.trim().length > 0),
      donts: editDontsText.split('\n').filter((line) => line.trim().length > 0),
      driveLink: editDriveLink ? formatUrl(editDriveLink) : '',
      primaryColor: activeSpec.primaryColor,
      secondaryColor: activeSpec.secondaryColor,
    };

    setBrandSpecs((prev) => ({
      ...prev,
      [selectedClientId]: updatedSpec,
    }));
    setIsEditModalOpen(false);
  };

  const handleAddRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRuleText.trim()) return;

    const currentDos = activeSpec.dos;
    const currentDonts = activeSpec.donts;

    const updatedSpec: BrandSpec = {
      ...activeSpec,
      dos: newRuleType === 'DO' ? [...currentDos, newRuleText.trim()] : currentDos,
      donts: newRuleType === 'DONT' ? [...currentDonts, newRuleText.trim()] : currentDonts,
    };

    setBrandSpecs((prev) => ({
      ...prev,
      [selectedClientId]: updatedSpec,
    }));

    setNewRuleText('');
    setIsAddRuleModalOpen(false);
  };

  return (
    <div className="space-y-6 animate-fadeIn text-neutral-900">
      {/* Header & Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900 flex items-center gap-2">
            Brand Hub Knowledge Base <span className="text-xs font-mono bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-full border border-neutral-200">Brand Guidelines</span>
          </h1>
          <p className="text-xs text-neutral-500">
            Client brand guidelines, typography, color palettes, tone of voice, moodboards, and Google Drive master links.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAddRuleModalOpen(true)}
            className="bg-white hover:bg-neutral-50 border border-neutral-200 text-neutral-700 text-xs font-semibold px-4 py-2 rounded-lg transition shadow-xs flex items-center gap-2"
          >
            <Plus className="w-4 h-4 text-neutral-500" /> Add Brand Rule
          </button>
          <button
            onClick={openEditModal}
            className="bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-xs flex items-center gap-2 transition"
          >
            <Edit3 className="w-4 h-4" /> Edit Brand Hub
          </button>
        </div>
      </div>

      {/* Client Tab Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 p-2 bg-white border border-neutral-200/80 rounded-2xl shadow-xs">
        {clients.map((c) => (
          <button
            key={c.id}
            onClick={() => setSelectedClientId(c.id)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-2 whitespace-nowrap ${
              selectedClientId === c.id
                ? 'bg-neutral-900 text-white shadow-xs'
                : 'bg-neutral-100 text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.clientColor }} />
            {c.name}
          </button>
        ))}
      </div>

      {/* Brand Hub Detail Canvas */}
      {activeClient && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Brand Specs */}
          <div className="lg:col-span-2 space-y-6">
            {/* Color Palette & Identity Card */}
            <div className="p-6 rounded-2xl bg-white border border-neutral-200/80 shadow-xs space-y-4">
              <h3 className="text-base font-bold text-neutral-900 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Palette className="w-5 h-5 text-neutral-700" /> Brand Identity & Color Palette
                </span>
                <button
                  onClick={openEditModal}
                  className="text-xs text-neutral-900 hover:underline flex items-center gap-1 font-semibold"
                >
                  <Edit3 className="w-3.5 h-3.5" /> Edit Colors
                </button>
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 text-center space-y-2">
                  <div
                    className="w-12 h-12 rounded-xl mx-auto shadow-xs border border-neutral-200"
                    style={{ backgroundColor: activeClient.clientColor }}
                  />
                  <p className="text-xs font-bold text-neutral-900">Primary Color</p>
                  <p className="text-[11px] font-mono text-neutral-500">{activeClient.clientColor}</p>
                </div>
                <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 text-center space-y-2">
                  <div className="w-12 h-12 rounded-xl mx-auto shadow-xs bg-purple-600" />
                  <p className="text-xs font-bold text-neutral-900">Secondary Accent</p>
                  <p className="text-[11px] font-mono text-neutral-500">#8B5CF6</p>
                </div>
                <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 text-center space-y-2">
                  <div className="w-12 h-12 rounded-xl mx-auto shadow-xs bg-white border border-neutral-300" />
                  <p className="text-xs font-bold text-neutral-900">Light Text</p>
                  <p className="text-[11px] font-mono text-neutral-500">#FFFFFF</p>
                </div>
                <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 text-center space-y-2">
                  <div className="w-12 h-12 rounded-xl mx-auto shadow-xs bg-neutral-900" />
                  <p className="text-xs font-bold text-neutral-900">Dark Text</p>
                  <p className="text-[11px] font-mono text-neutral-500">#111827</p>
                </div>
              </div>
            </div>

            {/* Tone of Voice & Target Audience */}
            <div className="p-6 rounded-2xl bg-white border border-neutral-200/80 shadow-xs space-y-4">
              <h3 className="text-base font-bold text-neutral-900 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-neutral-700" /> Tone of Voice & Persona
                </span>
                <button
                  onClick={openEditModal}
                  className="text-xs text-neutral-900 hover:underline flex items-center gap-1 font-semibold"
                >
                  <Edit3 className="w-3.5 h-3.5" /> Edit Persona
                </button>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 space-y-2">
                  <p className="font-semibold text-neutral-900 uppercase tracking-wider text-[10px]">Tone of Voice</p>
                  <p className="text-neutral-700 leading-relaxed font-medium">{activeSpec.toneOfVoice}</p>
                </div>
                <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 space-y-2">
                  <p className="font-semibold text-neutral-900 uppercase tracking-wider text-[10px]">Target Audience</p>
                  <p className="text-neutral-700 leading-relaxed font-medium">{activeSpec.targetAudience}</p>
                </div>
              </div>
            </div>

            {/* Do's and Don'ts */}
            <div className="p-6 rounded-2xl bg-white border border-neutral-200/80 shadow-xs space-y-4">
              <h3 className="text-base font-bold text-neutral-900 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Layers className="w-5 h-5 text-neutral-700" /> Brand Do's & Don'ts
                </span>
                <button
                  onClick={() => setIsAddRuleModalOpen(true)}
                  className="text-xs text-neutral-900 hover:underline flex items-center gap-1 font-semibold"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Rule
                </button>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 space-y-2">
                  <p className="font-bold text-emerald-800 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" /> DO'S ({activeSpec.dos.length})
                  </p>
                  <ul className="space-y-1.5 text-emerald-950 font-medium list-disc list-inside">
                    {activeSpec.dos.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>

                <div className="p-4 rounded-xl bg-red-50 border border-red-200 space-y-2">
                  <p className="font-bold text-red-800 flex items-center gap-1.5">
                    <XCircle className="w-4 h-4" /> DON'TS ({activeSpec.donts.length})
                  </p>
                  <ul className="space-y-1.5 text-red-950 font-medium list-disc list-inside">
                    {activeSpec.donts.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Links & Assets Side Panel */}
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-white border border-neutral-200/80 shadow-xs space-y-4">
              <h3 className="text-base font-bold text-neutral-900 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-neutral-700" /> Google Drive & Assets
                </span>
                <button
                  onClick={openEditModal}
                  className="text-xs text-neutral-900 hover:underline flex items-center gap-1 font-semibold"
                >
                  <Edit3 className="w-3.5 h-3.5" /> Edit Link
                </button>
              </h3>

              <div className="space-y-3 text-xs">
                <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200 space-y-1">
                  <p className="font-semibold text-neutral-900">Master Drive Folder</p>
                  <a
                    href={activeSpec.driveLink}
                    target="_blank"
                    rel="noreferrer"
                    className="text-neutral-900 font-semibold hover:underline flex items-center gap-1.5 truncate font-mono"
                  >
                    {activeSpec.driveLink} <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>

                <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200 space-y-1">
                  <p className="font-semibold text-neutral-900">Official Brand Guideline PDF</p>
                  <p className="text-neutral-500">Version 2026.1 (12.4 MB)</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Edit Brand Hub */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <form
            onSubmit={handleSaveEdit}
            className="w-full max-w-lg bg-white border border-neutral-200 rounded-2xl shadow-xl p-6 space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <h3 className="text-base font-bold text-neutral-900 flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-neutral-700" /> Edit Brand Guidelines ({activeClient?.name})
              </h3>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 text-neutral-400 hover:text-neutral-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-neutral-600 font-semibold mb-1">Tone of Voice</label>
                <textarea
                  rows={2}
                  value={editTone}
                  onChange={(e) => setEditTone(e.target.value)}
                  className="w-full bg-white border border-neutral-200 rounded-lg p-3 text-neutral-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-neutral-600 font-semibold mb-1">Target Audience</label>
                <textarea
                  rows={2}
                  value={editAudience}
                  onChange={(e) => setEditAudience(e.target.value)}
                  className="w-full bg-white border border-neutral-200 rounded-lg p-3 text-neutral-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-neutral-600 font-semibold mb-1">Brand DO'S (One per line)</label>
                <textarea
                  rows={3}
                  value={editDosText}
                  onChange={(e) => setEditDosText(e.target.value)}
                  className="w-full bg-white border border-neutral-200 rounded-lg p-3 text-neutral-900 focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-neutral-600 font-semibold mb-1">Brand DON'TS (One per line)</label>
                <textarea
                  rows={3}
                  value={editDontsText}
                  onChange={(e) => setEditDontsText(e.target.value)}
                  className="w-full bg-white border border-neutral-200 rounded-lg p-3 text-neutral-900 focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-neutral-600 font-semibold mb-1">Master Google Drive Link</label>
                <input
                  type="text"
                  value={editDriveLink}
                  onChange={(e) => setEditDriveLink(e.target.value)}
                  className="w-full bg-white border border-neutral-200 rounded-lg px-3 py-2 text-neutral-900"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-100">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="px-4 py-2 rounded-lg text-xs text-neutral-600 hover:bg-neutral-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-neutral-900 hover:bg-neutral-800 text-white font-semibold text-xs px-5 py-2 rounded-lg shadow-xs flex items-center gap-1.5"
              >
                <Save className="w-4 h-4" /> Save Guidelines
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Add Single Brand Rule */}
      {isAddRuleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <form
            onSubmit={handleAddRule}
            className="w-full max-w-md bg-white border border-neutral-200 rounded-2xl shadow-xl p-6 space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <h3 className="text-base font-bold text-neutral-900 flex items-center gap-2">
                <Plus className="w-4 h-4 text-neutral-700" /> Add Brand Guideline Rule
              </h3>
              <button
                type="button"
                onClick={() => setIsAddRuleModalOpen(false)}
                className="p-1 text-neutral-400 hover:text-neutral-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-neutral-600 font-semibold mb-1">Rule Category</label>
                <select
                  value={newRuleType}
                  onChange={(e) => setNewRuleType(e.target.value as 'DO' | 'DONT')}
                  className="w-full bg-white border border-neutral-200 rounded-lg px-3 py-2 text-neutral-900 font-semibold"
                >
                  <option value="DO">DO (Recommended Practice)</option>
                  <option value="DONT">DON'T (Prohibited Practice)</option>
                </select>
              </div>

              <div>
                <label className="block text-neutral-600 font-semibold mb-1">Rule Instruction</label>
                <input
                  type="text"
                  placeholder="e.g. Always include 3-second animated logo intro..."
                  value={newRuleText}
                  onChange={(e) => setNewRuleText(e.target.value)}
                  className="w-full bg-white border border-neutral-200 rounded-lg px-3 py-2 text-neutral-900 focus:outline-none"
                  required
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-100">
              <button
                type="button"
                onClick={() => setIsAddRuleModalOpen(false)}
                className="px-4 py-2 rounded-lg text-xs text-neutral-600 hover:bg-neutral-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-neutral-900 hover:bg-neutral-800 text-white font-semibold text-xs px-5 py-2 rounded-lg shadow-xs"
              >
                Add Rule
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
