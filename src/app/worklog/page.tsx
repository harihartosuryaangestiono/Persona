'use client';

import React, { useState } from 'react';
import { useData } from '@/context/DataContext';
import { useUser } from '@/context/UserContext';
import { useToast } from '@/context/ToastContext';
import { Upload, Download, Plus, Search, ExternalLink, X, ChevronDown, ChevronUp, FolderOpen, Trash2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { calculateTaskScore } from '@/lib/score-calculator';
import { WorklogItem } from '@/lib/types';

interface WorklogStage {
  id: string;
  role: 'Strategist' | 'Production Assistant' | 'Editor' | 'Scheduler';
  userId: string;
  userName: string;
  taskType: string;
  format: string;
  qty: number;
  score: number;
}

export default function WorklogPage() {
  const { worklogs, clients, addWorklog, deleteWorklog, importWorklogs } = useData();
  const { currentUser, allUsers } = useUser();
  const { showToast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [parsedImportLogs, setParsedImportLogs] = useState<Partial<WorklogItem>[]>([]);
  const [duplicateCount, setDuplicateCount] = useState(0);

  // Manual Log Entry State
  const [newTitle, setNewTitle] = useState('');
  const [newClientId, setNewClientId] = useState(clients[0]?.id || '');
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [newStages, setNewStages] = useState<WorklogStage[]>([]);

  // Expanded rows
  const [expandedRowIds, setExpandedRowIds] = useState<string[]>([]);

  const toggleRow = (id: string) => {
    setExpandedRowIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const filteredLogs = worklogs.filter((w) => {
    const query = searchQuery.toLowerCase();
    const matchSearch =
      w.contentTitle.toLowerCase().includes(query) ||
      w.userName?.toLowerCase().includes(query) ||
      w.clientName?.toLowerCase().includes(query);
    if (!matchSearch) return false;

    const isAdmin = currentUser.roles.includes('Admin') || currentUser.roles.includes('Owner');
    if (isAdmin) return true;

    const isPrimaryAssignee = w.userName === currentUser.name || w.userId === currentUser.id;
    const logStages = w.stages ? (typeof w.stages === 'string' ? JSON.parse(w.stages) : w.stages) : [];
    const isStageAssignee = logStages.some(
      (s: any) => s.userId === currentUser.id || s.userName === currentUser.name
    );

    return isPrimaryAssignee || isStageAssignee;
  });

  // Excel File Upload Ingestion
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
            stages: null,
          };
        });

        setParsedImportLogs(parsed);
        setDuplicateCount(dupes);
      } catch (err) {
        showToast('Failed to parse Excel file. Please ensure valid format.', 'error');
      }
    };
    reader.readAsBinaryString(file);
  };

  const executeImport = () => {
    if (parsedImportLogs.length === 0) return;
    importWorklogs(parsedImportLogs);
    setIsImportModalOpen(false);
    showToast(`Successfully imported ${parsedImportLogs.length} worklog entries!`, 'success');
    setParsedImportLogs([]);
  };

  const exportToExcel = () => {
    const exportData = worklogs.map((w) => {
      const uNames = w.stages
        ? Array.from(new Set((typeof w.stages === 'string' ? JSON.parse(w.stages) : w.stages).map((s: any) => s.userName))).join(', ')
        : w.userName;

      return {
        Tanggal: new Date(w.date).toISOString().split('T')[0],
        Nama: uNames,
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
      };
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'PersonaOS_Worklog');
    XLSX.writeFile(wb, `PersonaOS_Worklog_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Form helpers for manual stages
  const getStrategicFormats = (type: string) => {
    if (type === 'Content Plan' || type === 'Production Lead') return ['4 Jam', '8 Jam'];
    if (type === 'Editing Plan') return ['Per Item'];
    if (type === 'Supervisi') return ['Per Check'];
    if (type === 'Presentasi') return ['Per Session'];
    return [];
  };

  const handleAddStage = () => {
    const defaultStage: WorklogStage = {
      id: `stg-${Date.now()}-${Math.random()}`,
      role: 'Editor',
      userId: allUsers[0]?.id || '',
      userName: allUsers[0]?.name || '',
      taskType: 'Editing',
      format: 'Reels',
      qty: 1,
      score: 150,
    };
    setNewStages([...newStages, defaultStage]);
  };

  const handleRemoveStage = (id: string) => {
    setNewStages(newStages.filter((s) => s.id !== id));
  };

  const handleStageFieldChange = (stageId: string, field: keyof WorklogStage, value: any) => {
    const updated = newStages.map((stage) => {
      if (stage.id !== stageId) return stage;

      const newStage = { ...stage, [field]: value };

      if (field === 'role') {
        if (value === 'Strategist') {
          newStage.taskType = 'Content Plan';
          newStage.format = '4 Jam';
        } else if (value === 'Production Assistant') {
          newStage.taskType = 'Production Assistant';
          newStage.format = '4 Jam';
        } else if (value === 'Editor') {
          newStage.taskType = 'Editing';
          newStage.format = 'Reels';
        } else if (value === 'Scheduler') {
          newStage.taskType = 'Scheduling';
          newStage.format = 'Per Post';
        }
        const matchingUser = allUsers.find((u) => {
          const roles = typeof u.roles === 'string' ? JSON.parse(u.roles) : u.roles;
          return roles.includes(value);
        });
        if (matchingUser) {
          newStage.userId = matchingUser.id;
          newStage.userName = matchingUser.name;
        }
      }

      if (field === 'taskType') {
        if (value === 'Editing') newStage.format = 'Reels';
        else if (value === 'Revisi') newStage.format = 'Minor';
        else if (value === 'Content Plan' || value === 'Production Lead' || value === 'Production Assistant') newStage.format = '4 Jam';
        else if (value === 'Editing Plan') newStage.format = 'Per Item';
        else if (value === 'Supervisi') newStage.format = 'Per Check';
        else if (value === 'Presentasi') newStage.format = 'Per Session';
        else if (value === 'Scheduling') newStage.format = 'Per Post';
      }

      if (field === 'userId') {
        const u = allUsers.find((user) => user.id === value);
        if (u) newStage.userName = u.name;
      }

      let cat = 'Editor';
      if (newStage.role === 'Strategist') cat = 'Strategic';
      else if (newStage.role === 'Production Assistant') cat = 'Assistant';
      else if (newStage.role === 'Scheduler') cat = 'Scheduler';

      newStage.score = calculateTaskScore(cat, newStage.taskType, newStage.format, newStage.qty);

      return newStage;
    });

    setNewStages(updated);
  };

  const handleManualAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const totalScore = newStages.reduce((sum, s) => sum + s.score, 0);
    const targetClient = clients.find((c) => c.id === newClientId) || clients[0];

    addWorklog({
      contentTitle: newTitle,
      clientId: targetClient.id,
      clientName: targetClient.name,
      userId: currentUser.id,
      userName: currentUser.name,
      taskType: newStages[0]?.taskType || 'Editing',
      format: newStages[0]?.format || 'Reels',
      qty: newStages[0]?.qty || 1,
      score: totalScore,
      source: 'Manual',
      stages: newStages,
    });

    setIsManualModalOpen(false);
    setNewTitle('');
    setNewStages([]);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this worklog entry permanently?')) {
      await deleteWorklog(id);
    }
  };

  return (
    <div className="space-y-6 text-neutral-900 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900 flex items-center gap-2">
            Worklog Master Data <span className="text-xs font-mono bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-full border border-neutral-200">{worklogs.length} Entries</span>
          </h1>
          <p className="text-xs text-neutral-500 font-medium">Single-row content ledger with expandable roles and point metrics.</p>
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
            onClick={() => {
              setNewStages([]);
              setIsManualModalOpen(true);
            }}
            className="bg-neutral-900 hover:bg-neutral-800 text-white font-semibold text-xs px-4 py-2 rounded-lg shadow-xs flex items-center gap-2 transition"
          >
            <Plus className="w-4 h-4" /> Add Worklog
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="p-3 rounded-2xl bg-white border border-neutral-200/80 shadow-xs">
        <div className="flex items-center gap-2 bg-neutral-50 px-3 py-1.5 rounded-lg border border-neutral-200 text-xs text-neutral-700">
          <Search className="w-4 h-4 text-neutral-400" />
          <input
            type="text"
            placeholder="Search worklog by judul konten, nama, or klien..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent focus:outline-hidden w-full placeholder-neutral-400 font-normal text-neutral-900"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-neutral-200/80 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs select-none">
            <thead className="bg-neutral-50 text-neutral-500 font-semibold uppercase tracking-wider border-b border-neutral-200 whitespace-nowrap">
              <tr>
                <th className="px-4 py-3.5 w-10"></th>
                <th className="px-4 py-3.5">Tanggal</th>
                <th className="px-4 py-3.5">Klien</th>
                <th className="px-4 py-3.5">Judul Konten</th>
                <th className="px-4 py-3.5">Employee(s)</th>
                <th className="px-4 py-3.5 text-center">Score</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5">Sumber</th>
                <th className="px-4 py-3.5 text-center">Preview</th>
                <th className="px-4 py-3.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 text-neutral-700">
              {filteredLogs.map((w) => {
                const isExpanded = expandedRowIds.includes(w.id);
                const logStages = w.stages ? (typeof w.stages === 'string' ? JSON.parse(w.stages) : w.stages) : [];
                const hasStages = logStages.length > 0;

                const uniqueUserNames = hasStages
                  ? Array.from(new Set(logStages.map((s: any) => s.userName))).join(', ')
                  : w.userName;

                return (
                  <React.Fragment key={w.id}>
                    <tr className="hover:bg-neutral-50 transition">
                      <td className="px-4 py-3.5">
                        {hasStages && (
                          <button
                            onClick={() => toggleRow(w.id)}
                            className="text-neutral-400 hover:text-neutral-700 transition"
                          >
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-3.5 font-mono text-neutral-500 whitespace-nowrap">
                        {new Date(w.date).toISOString().split('T')[0]}
                      </td>
                      <td className="px-4 py-3.5 font-semibold text-neutral-800 whitespace-nowrap">{w.clientName}</td>
                      <td className="px-4 py-3.5 font-bold text-neutral-900">{w.contentTitle}</td>
                      <td className="px-4 py-3.5 font-semibold text-neutral-700">{uniqueUserNames}</td>
                      <td className="px-4 py-3.5 text-center font-mono font-bold text-neutral-900">{w.score} pts</td>
                      <td className="px-4 py-3.5">
                        <span className="badge-draft text-[10px] px-2 py-0.5 rounded border border-neutral-200 font-bold">
                          {w.status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-neutral-500 font-semibold">{w.source || 'To Do List'}</td>
                      <td className="px-4 py-3.5 text-center">
                        {w.previewLink ? (
                          <a
                            href={w.previewLink}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex p-1 rounded hover:bg-neutral-100 text-neutral-600 transition"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        ) : (
                          <span className="text-neutral-350">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        {(currentUser?.roles.includes('Admin') || currentUser?.roles.includes('Owner')) && (
                          <button
                            onClick={() => handleDelete(w.id)}
                            className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-neutral-50 transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>

                    {/* EXPANDABLE STAGES VIEW */}
                    {isExpanded && hasStages && (
                      <tr className="bg-neutral-50 border-y border-neutral-100">
                        <td colSpan={10} className="px-6 py-4">
                          <div className="space-y-2.5 max-w-2xl">
                            <h5 className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Stages Allocation Details</h5>
                            <div className="grid grid-cols-1 gap-2">
                              {logStages.map((stage: any) => (
                                <div key={stage.id} className="bg-white border border-neutral-200 rounded-xl p-3 flex justify-between items-center text-xs">
                                  <div className="flex items-center gap-3">
                                    <span className="font-bold text-neutral-800">{stage.userName}</span>
                                    <span className="text-neutral-300">|</span>
                                    <span className="text-neutral-500 font-semibold">{stage.role}</span>
                                    <span className="text-neutral-300">|</span>
                                    <span className="text-neutral-600 font-mono">{stage.taskType} ({stage.format})</span>
                                  </div>
                                  <span className="font-mono font-bold text-neutral-900">{stage.score} pts</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* MANUAL WORKLOG MODAL */}
      {isManualModalOpen && (
        <div className="fixed inset-0 bg-neutral-950/40 backdrop-filter backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white border border-neutral-200 shadow-xl rounded-2xl w-full max-w-3xl overflow-hidden animate-scaleUp">
            <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between">
              <h2 className="text-base font-bold text-neutral-900">Add Manual Worklog Entry</h2>
              <button onClick={() => setIsManualModalOpen(false)} className="text-neutral-400 hover:text-neutral-600 text-sm">
                ✕
              </button>
            </div>

            <form onSubmit={handleManualAdd} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-neutral-700 font-semibold">Content Title</label>
                  <input
                    type="text"
                    required
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="e.g. Baking Masterclass Highlight"
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2 text-neutral-900 focus:outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-neutral-700 font-semibold">Select Client</label>
                  <select
                    value={newClientId}
                    onChange={(e) => setNewClientId(e.target.value)}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2 text-neutral-900 focus:outline-hidden"
                  >
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Stages List Editor */}
              <div className="space-y-2 pt-2 border-t border-neutral-100">
                <div className="flex items-center justify-between">
                  <label className="text-neutral-800 font-bold flex items-center gap-1.5">
                    Work stages allocation
                    <span className="text-[10px] bg-neutral-100 font-mono text-neutral-600 px-1.5 py-0.5 rounded border">
                      Total: {newStages.reduce((sum, s) => sum + s.score, 0)} pts
                    </span>
                  </label>
                  <button
                    type="button"
                    onClick={handleAddStage}
                    className="text-neutral-900 hover:text-neutral-700 font-semibold text-[10px] flex items-center gap-0.5"
                  >
                    + Add Stage
                  </button>
                </div>

                <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                  {newStages.map((stage) => {
                    const matchingUsers = allUsers.filter((u) => {
                      const roles = typeof u.roles === 'string' ? JSON.parse(u.roles) : u.roles;
                      return roles.includes(stage.role);
                    });

                    let typeOptions = ['Editing', 'Revisi'];
                    if (stage.role === 'Strategist') typeOptions = ['Content Plan', 'Production Lead', 'Editing Plan', 'Supervisi', 'Presentasi'];
                    else if (stage.role === 'Production Assistant') typeOptions = ['Production Assistant'];
                    else if (stage.role === 'Scheduler') typeOptions = ['Scheduling'];

                    const formatOptions = getStrategicFormats(stage.taskType).length > 0 ? getStrategicFormats(stage.taskType) :
                      (stage.taskType === 'Scheduling' ? ['Per Post'] :
                      (stage.taskType === 'Editing' ? ['Single Foto', 'Grafis', 'Story Video', 'Paket Static', 'Carousel', 'Reels'] : ['Minor', 'Medium', 'Major']));

                    return (
                      <div key={stage.id} className="bg-neutral-50 border border-neutral-200 rounded-xl p-3 flex flex-wrap items-center gap-3">
                        <div className="flex-1 min-w-[120px]">
                          <select
                            value={stage.role}
                            onChange={(e) => handleStageFieldChange(stage.id, 'role', e.target.value)}
                            className="w-full bg-white border border-neutral-200 rounded-lg px-2 py-1 focus:outline-hidden"
                          >
                            <option value="Strategist">Strategist</option>
                            <option value="Production Assistant">PA</option>
                            <option value="Editor">Editor</option>
                            <option value="Scheduler">Scheduler</option>
                          </select>
                        </div>

                        <div className="flex-1 min-w-[120px]">
                          <select
                            value={stage.userId}
                            onChange={(e) => handleStageFieldChange(stage.id, 'userId', e.target.value)}
                            className="w-full bg-white border border-neutral-200 rounded-lg px-2 py-1 focus:outline-hidden"
                          >
                            {matchingUsers.map((u) => (
                              <option key={u.id} value={u.id}>
                                {u.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="flex-1 min-w-[120px]">
                          <select
                            value={stage.taskType}
                            onChange={(e) => handleStageFieldChange(stage.id, 'taskType', e.target.value)}
                            className="w-full bg-white border border-neutral-200 rounded-lg px-2 py-1 focus:outline-hidden"
                          >
                            {typeOptions.map((t) => (
                              <option key={t} value={t}>
                                {t}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="flex-1 min-w-[120px]">
                          <select
                            value={stage.format}
                            onChange={(e) => handleStageFieldChange(stage.id, 'format', e.target.value)}
                            className="w-full bg-white border border-neutral-200 rounded-lg px-2 py-1 focus:outline-hidden"
                          >
                            {formatOptions.map((f) => (
                              <option key={f} value={f}>
                                {f}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="w-16">
                          <input
                            type="number"
                            min="1"
                            value={stage.qty}
                            onChange={(e) => handleStageFieldChange(stage.id, 'qty', Number(e.target.value))}
                            className="w-full bg-white border border-neutral-200 rounded-lg px-2 py-1 text-center focus:outline-hidden font-mono font-bold"
                          />
                        </div>

                        <div className="w-16 text-right font-mono font-bold text-neutral-800">
                          {stage.score} pts
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveStage(stage.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          ✕
                        </button>
                      </div>
                    );
                  })}

                  {newStages.length === 0 && (
                    <div className="text-center py-4 text-neutral-400 italic">
                      No stages added. Add work stage allocations to set up logs.
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setIsManualModalOpen(false)}
                  className="bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-semibold px-4 py-2 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={newStages.length === 0}
                  className="bg-neutral-900 hover:bg-neutral-800 text-white font-semibold px-4 py-2 rounded-lg transition disabled:opacity-50"
                >
                  Save Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* IMPORT MODAL */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-2xl bg-white border border-neutral-200 rounded-2xl shadow-xl p-6 space-y-4 animate-scaleUp">
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
                ✕
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
                        ⚠️ {duplicateCount} duplicates found (will be skipped)
                      </span>
                    )}
                  </div>

                  <div className="max-h-60 overflow-y-auto border border-neutral-250/70 rounded-xl">
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-neutral-100 text-neutral-500 font-semibold border-b border-neutral-200">
                        <tr>
                          <th className="px-3 py-2">Tanggal</th>
                          <th className="px-3 py-2">Klien</th>
                          <th className="px-3 py-2">Judul Konten</th>
                          <th className="px-3 py-2">Nama</th>
                          <th className="px-3 py-2 text-right">Score</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-100">
                        {parsedImportLogs.slice(0, 10).map((log, i) => (
                          <tr key={i} className="hover:bg-neutral-50">
                            <td className="px-3 py-2 font-mono">{log.date}</td>
                            <td className="px-3 py-2 font-bold">{log.clientName}</td>
                            <td className="px-3 py-2 truncate max-w-xs">{log.contentTitle}</td>
                            <td className="px-3 py-2 font-semibold">{log.userName}</td>
                            <td className="px-3 py-2 text-right font-mono font-bold text-neutral-800">{log.score} pts</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {parsedImportLogs.length > 10 && (
                      <p className="text-center text-[10px] text-neutral-400 py-2 border-t border-neutral-100 bg-neutral-50">
                        And {parsedImportLogs.length - 10} more rows...
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-100">
              <button
                type="button"
                onClick={() => {
                  setIsImportModalOpen(false);
                  setParsedImportLogs([]);
                }}
                className="px-4 py-2 rounded-lg text-xs text-neutral-500 hover:bg-neutral-100 font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeImport}
                disabled={parsedImportLogs.length === 0}
                className="bg-neutral-900 hover:bg-neutral-800 text-white font-semibold text-xs px-5 py-2 rounded-lg disabled:opacity-50 shadow-sm"
              >
                Ingest to Database
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
