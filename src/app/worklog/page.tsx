'use client';

import React, { useState } from 'react';
import { useData } from '@/context/DataContext';
import { useUser } from '@/context/UserContext';
import { Upload, Download, Plus, Search, ExternalLink, X, AlertTriangle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { calculateTaskScore } from '@/lib/score-calculator';
import { WorklogItem } from '@/lib/types';

export default function WorklogPage() {
  const { worklogs, clients, addWorklog, importWorklogs } = useData();
  const { currentUser } = useUser();

  const [searchQuery, setSearchQuery] = useState('');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [parsedImportLogs, setParsedImportLogs] = useState<Partial<WorklogItem>[]>([]);
  const [duplicateCount, setDuplicateCount] = useState(0);

  // Manual Log Entry State
  const [newTitle, setNewTitle] = useState('');
  const [newClientId, setNewClientId] = useState(clients[0]?.id || '');
  const [newTaskType, setNewTaskType] = useState('Editing');
  const [newFormat, setNewFormat] = useState('Reels');
  const [newQty, setNewQty] = useState(1);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);

  const filteredLogs = worklogs.filter(
    (w) =>
      w.contentTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.userName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.clientName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handle Excel File Upload & Ingestion
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsName = wb.SheetNames[0];
        const ws = wb.Sheets[wsName];
        const data: any[] = XLSX.utils.sheet_to_json(ws);

        let dupes = 0;
        const parsed: Partial<WorklogItem>[] = data.map((row, idx) => {
          const contentTitle = row['Judul konten'] || row['Content Title'] || row['Title'] || `Task #${idx + 1}`;
          const taskType = row['Tipe task'] || row['Task Type'] || 'Editing';
          const format = row['Format'] || 'Single Foto';
          const qty = Number(row['Qty'] || 1);
          const category = row['Kategori'] || 'Editor';

          const score = Number(row['Score']) || calculateTaskScore(category, taskType, format, qty);

          const isDup = worklogs.some(
            (existing) => existing.contentTitle.toLowerCase() === contentTitle.toLowerCase()
          );
          if (isDup) dupes++;

          return {
            contentTitle,
            taskType,
            format,
            qty,
            score,
            clientName: row['Klien'] || row['Client'] || 'Baking Empire Gading Serpong',
            userName: row['Nama'] || row['Employee'] || currentUser.name,
            date: row['Tanggal'] || new Date().toISOString().split('T')[0],
            status: row['Status'] || 'Posted',
            source: row['Sumber (content plan)'] || 'To Do List',
            deadline: row['Deadline'] || '',
            previewLink: row['Preview Link'] || '',
          };
        });

        setParsedImportLogs(parsed);
        setDuplicateCount(dupes);
      } catch (err) {
        alert('Failed to parse Excel file. Please ensure valid format.');
      }
    };
    reader.readAsBinaryString(file);
  };

  const executeImport = () => {
    if (parsedImportLogs.length === 0) return;
    importWorklogs(parsedImportLogs);
    setIsImportModalOpen(false);
    setParsedImportLogs([]);
    alert(`Successfully imported ${parsedImportLogs.length} worklog entries!`);
  };

  // 1-Click Excel Export matching user format
  const exportToExcel = () => {
    const exportData = worklogs.map((w) => ({
      Tanggal: new Date(w.date).toISOString().split('T')[0],
      Nama: w.userName,
      Klien: w.clientName,
      'Judul konten': w.contentTitle,
      'Tipe task': w.taskType,
      Format: w.format,
      Qty: w.qty,
      Score: w.score,
      Status: w.status,
      'Sumber (content plan)': w.source,
      Deadline: w.deadline || '',
      'Preview Link': w.previewLink || '',
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'PersonaOS_Worklog');
    XLSX.writeFile(wb, `PersonaOS_Worklog_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleManualAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const score = calculateTaskScore('Editor', newTaskType, newFormat, newQty);
    const targetClient = clients.find((c) => c.id === newClientId) || clients[0];

    addWorklog({
      contentTitle: newTitle,
      clientId: targetClient.id,
      clientName: targetClient.name,
      userId: currentUser.id,
      userName: currentUser.name,
      taskType: newTaskType,
      format: newFormat,
      qty: newQty,
      score,
      source: 'Manual',
    });

    setIsManualModalOpen(false);
    setNewTitle('');
  };

  return (
    <div className="space-y-6 animate-fadeIn text-neutral-900">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900 flex items-center gap-2">
            Worklog Master Data <span className="text-xs font-mono bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-full border border-neutral-200">{worklogs.length} Entries</span>
          </h1>
          <p className="text-xs text-neutral-500">Complete worklog history by employee, client, task type, format, score, and source.</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="bg-white hover:bg-neutral-50 border border-neutral-200 text-neutral-700 font-semibold text-xs px-3.5 py-2 rounded-lg flex items-center gap-2 transition shadow-xs"
          >
            <Upload className="w-4 h-4 text-neutral-500" /> Import Excel Wizard
          </button>
          <button
            onClick={exportToExcel}
            className="bg-white hover:bg-neutral-50 border border-neutral-200 text-neutral-700 font-semibold text-xs px-3.5 py-2 rounded-lg flex items-center gap-2 transition shadow-xs"
          >
            <Download className="w-4 h-4 text-neutral-500" /> Export Excel
          </button>
          <button
            onClick={() => setIsManualModalOpen(true)}
            className="bg-neutral-900 hover:bg-neutral-800 text-white font-semibold text-xs px-4 py-2 rounded-lg shadow-xs flex items-center gap-2 transition"
          >
            <Plus className="w-4 h-4" /> Add Worklog
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="p-3 rounded-2xl bg-white border border-neutral-200/80 shadow-xs">
        <div className="flex items-center gap-2 bg-neutral-50 px-3 py-1.5 rounded-lg border border-neutral-200 text-xs text-neutral-700">
          <Search className="w-4 h-4 text-neutral-400" />
          <input
            type="text"
            placeholder="Search worklog by judul konten, nama, or klien..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent focus:outline-none w-full placeholder-neutral-400"
          />
        </div>
      </div>

      {/* Linear Style Worklog Table */}
      <div className="bg-white rounded-2xl border border-neutral-200/80 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50 text-neutral-500 font-semibold uppercase tracking-wider border-b border-neutral-200 whitespace-nowrap">
              <tr>
                <th className="px-4 py-3">Tanggal</th>
                <th className="px-4 py-3">Nama</th>
                <th className="px-4 py-3">Klien</th>
                <th className="px-4 py-3">Judul Konten</th>
                <th className="px-4 py-3">Tipe Task</th>
                <th className="px-4 py-3">Format</th>
                <th className="px-4 py-3 text-center">Qty</th>
                <th className="px-4 py-3 text-center">Score</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Sumber</th>
                <th className="px-4 py-3">Deadline</th>
                <th className="px-4 py-3 text-center">Preview Link</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 text-neutral-700">
              {filteredLogs.map((w) => (
                <tr key={w.id} className="hover:bg-neutral-50 transition">
                  <td className="px-4 py-3 font-mono text-neutral-500 whitespace-nowrap">
                    {new Date(w.date).toISOString().split('T')[0]}
                  </td>
                  <td className="px-4 py-3 font-semibold text-neutral-900 whitespace-nowrap">{w.userName}</td>
                  <td className="px-4 py-3 whitespace-nowrap font-medium text-neutral-700">{w.clientName}</td>
                  <td className="px-4 py-3 font-medium text-neutral-900 max-w-xs truncate">{w.contentTitle}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{w.taskType}</td>
                  <td className="px-4 py-3 font-mono text-neutral-600 whitespace-nowrap">{w.format || '—'}</td>
                  <td className="px-4 py-3 text-center font-mono">{w.qty}</td>
                  <td className="px-4 py-3 text-center font-mono font-bold text-neutral-900">
                    {w.score} pts
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span
                      className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full ${
                        w.status === 'Posted'
                          ? 'bg-neutral-100 text-neutral-800 border border-neutral-200'
                          : w.status === 'Waiting for Approval' || w.status === 'Approval'
                          ? 'bg-amber-50 text-amber-800 border border-amber-200'
                          : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      }`}
                    >
                      {w.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-neutral-500 text-[11px] whitespace-nowrap">{w.source || 'To Do List'}</td>
                  <td className="px-4 py-3 font-mono text-neutral-500 whitespace-nowrap">{w.deadline || '—'}</td>
                  <td className="px-4 py-3 text-center">
                    {w.previewLink ? (
                      <a
                        href={w.previewLink}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex p-1.5 rounded hover:bg-neutral-100 text-neutral-600 transition"
                        title="Open Link"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    ) : (
                      <span className="text-neutral-300">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Excel Import Wizard Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-2xl bg-white border border-neutral-200 rounded-2xl shadow-xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <h3 className="text-base font-bold text-neutral-900 flex items-center gap-2">
                <Upload className="w-4 h-4 text-neutral-600" /> Excel Worklog Import Wizard
              </h3>
              <button
                onClick={() => {
                  setIsImportModalOpen(false);
                  setParsedImportLogs([]);
                }}
                className="p-1 text-neutral-400 hover:text-neutral-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-4 border-2 border-dashed border-neutral-200 hover:border-neutral-400 rounded-xl text-center bg-neutral-50 transition cursor-pointer">
                <Upload className="w-8 h-8 text-neutral-400 mx-auto mb-2" />
                <p className="font-semibold text-neutral-900">Upload Excel (.xlsx, .csv) File</p>
                <p className="text-[11px] text-neutral-500 mt-1">Columns: Tanggal, Nama, Klien, Judul konten, Tipe task, Format, Qty, Score, Status, Sumber, Deadline, Preview Link</p>
                <input
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileUpload}
                  className="mt-3 block w-full text-xs text-neutral-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-neutral-900 file:text-white hover:file:bg-neutral-800 cursor-pointer"
                />
              </div>

              {parsedImportLogs.length > 0 && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between text-xs bg-neutral-50 p-3 rounded-lg border border-neutral-200">
                    <span className="text-neutral-800 font-semibold">Parsed Records: {parsedImportLogs.length}</span>
                    {duplicateCount > 0 && (
                      <span className="text-amber-700 flex items-center gap-1 font-mono">
                        <AlertTriangle className="w-3.5 h-3.5" /> {duplicateCount} Potential Duplicates
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-100">
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="px-4 py-2 rounded-lg text-xs text-neutral-600 hover:bg-neutral-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeImport}
                disabled={parsedImportLogs.length === 0}
                className="bg-neutral-900 hover:bg-neutral-800 disabled:opacity-50 text-white font-semibold text-xs px-5 py-2 rounded-lg shadow-xs"
              >
                Execute 1-Click Import ({parsedImportLogs.length})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Worklog Entry Modal */}
      {isManualModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <form
            onSubmit={handleManualAdd}
            className="w-full max-w-md bg-white border border-neutral-200 rounded-2xl shadow-xl p-6 space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <h3 className="text-base font-bold text-neutral-900">Manual Worklog Entry</h3>
              <button
                type="button"
                onClick={() => setIsManualModalOpen(false)}
                className="p-1 text-neutral-400 hover:text-neutral-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-neutral-600 font-semibold mb-1">Judul Konten</label>
                <input
                  type="text"
                  placeholder="e.g. Baking Empire Croissant Shoot"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-white border border-neutral-200 rounded-lg px-3 py-2 text-neutral-900 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-neutral-600 font-semibold mb-1">Klien</label>
                <select
                  value={newClientId}
                  onChange={(e) => setNewClientId(e.target.value)}
                  className="w-full bg-white border border-neutral-200 rounded-lg px-3 py-2 text-neutral-900"
                >
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-600 font-semibold mb-1">Format</label>
                  <select
                    value={newFormat}
                    onChange={(e) => setNewFormat(e.target.value)}
                    className="w-full bg-white border border-neutral-200 rounded-lg px-3 py-2 text-neutral-900"
                  >
                    <option value="Reels">Reels (150 pts)</option>
                    <option value="Carousel">Carousel (150 pts)</option>
                    <option value="Single Foto">Single Foto (10 pts)</option>
                    <option value="Grafis">Grafis (25 pts)</option>
                    <option value="4 Jam">4 Jam (400 pts)</option>
                    <option value="8 Jam">8 Jam (800 pts)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-neutral-600 font-semibold mb-1">Qty</label>
                  <input
                    type="number"
                    min="1"
                    value={newQty}
                    onChange={(e) => setNewQty(Number(e.target.value))}
                    className="w-full bg-white border border-neutral-200 rounded-lg px-3 py-2 text-neutral-900"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-100">
              <button
                type="button"
                onClick={() => setIsManualModalOpen(false)}
                className="px-4 py-2 rounded-lg text-xs text-neutral-600 hover:bg-neutral-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-neutral-900 hover:bg-neutral-800 text-white font-semibold text-xs px-5 py-2 rounded-lg shadow-xs"
              >
                Save Worklog
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
