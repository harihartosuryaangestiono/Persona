'use client';

import React, { useState, useEffect } from 'react';
import { useData } from '@/context/DataContext';
import { useUser } from '@/context/UserContext';
import {
  Plus,
  Search,
  Filter,
  Calendar as CalendarIcon,
  ExternalLink,
  X,
  Trash2,
  MoveRight,
} from 'lucide-react';
import { calculateTaskScore, calculateCOGS, calculateAutoDeadline } from '@/lib/score-calculator';
import { TaskItem } from '@/lib/types';

const KANBAN_COLUMNS: TaskItem['status'][] = [
  'Brief',
  'Content Proposal',
  'Script',
  'Editorial Plan',
  'Shooting',
  'Editing',
  'Revision',
  'Approval',
  'Scheduling',
  'Posted',
];

export default function KanbanPage() {
  const { tasks, clients, addTask, updateTask, updateTaskStatus, deleteTask } = useData();
  const { currentUser } = useUser();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClientFilter, setSelectedClientFilter] = useState('ALL');
  const [selectedTaskDetail, setSelectedTaskDetail] = useState<TaskItem | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // New task form state
  const [newTitle, setNewTitle] = useState('');
  const [newClientId, setNewClientId] = useState('');
  const [newCategory, setNewCategory] = useState<'Editor' | 'Strategic' | 'Assistant' | 'Scheduler'>('Editor');
  const [newTaskType, setNewTaskType] = useState('Editing');
  const [newFormat, setNewFormat] = useState('Reels');
  const [newQty, setNewQty] = useState(1);
  const [newPriority, setNewPriority] = useState<'High' | 'Medium' | 'Low'>('Medium');
  const [newPostingDate, setNewPostingDate] = useState('2026-07-28');
  const [newDriveLink, setNewDriveLink] = useState('');

  // Edit task form state
  const [isEditingDetail, setIsEditingDetail] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editClientId, setEditClientId] = useState('');
  const [editCategory, setEditCategory] = useState<'Editor' | 'Strategic' | 'Assistant' | 'Scheduler'>('Editor');
  const [editTaskType, setEditTaskType] = useState('Editing');
  const [editFormat, setEditFormat] = useState('Reels');
  const [editQty, setEditQty] = useState(1);
  const [editPriority, setEditPriority] = useState<'High' | 'Medium' | 'Low'>('Medium');
  const [editPostingDate, setEditPostingDate] = useState('2026-07-28');
  const [editDriveLink, setEditDriveLink] = useState('');
  const [editStatus, setEditStatus] = useState<TaskItem['status']>('Brief');

  // Auto-select first client when list loads
  useEffect(() => {
    if (clients.length > 0 && !newClientId) {
      setNewClientId(clients[0].id);
    }
  }, [clients, newClientId]);

  const autoScore = calculateTaskScore(newCategory, newTaskType, newFormat, newQty);
  const autoCogs = calculateCOGS(autoScore);
  const autoDeadline = calculateAutoDeadline(newPostingDate, -3);

  const editScore = calculateTaskScore(editCategory, editTaskType, editFormat, editQty);
  const editCogs = calculateCOGS(editScore);
  const editDeadline = calculateAutoDeadline(editPostingDate, -3);

  const startEditing = () => {
    if (!selectedTaskDetail) return;
    setEditTitle(selectedTaskDetail.title);
    setEditClientId(selectedTaskDetail.clientId);
    setEditCategory(selectedTaskDetail.category);
    setEditTaskType(selectedTaskDetail.taskType || 'Editing');
    setEditFormat(selectedTaskDetail.format || 'Reels');
    setEditQty(selectedTaskDetail.qty || 1);
    setEditPriority(selectedTaskDetail.priority || 'Medium');
    setEditPostingDate(selectedTaskDetail.postingDate ? selectedTaskDetail.postingDate.substring(0, 10) : '2026-07-28');
    setEditDriveLink(selectedTaskDetail.driveLink || '');
    setEditStatus(selectedTaskDetail.status);
    setIsEditingDetail(true);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTaskDetail) return;

    const targetClient = clients.find((c) => c.id === editClientId) || clients[0];

    // Point Cap Guardrail check
    const scoreDiff = editScore - selectedTaskDetail.score;
    if (targetClient && scoreDiff > 0 && targetClient.remainingPoint < scoreDiff) {
      alert(`⚠️ Client ${targetClient.name} has exceeded point budget! Additional point purchase required.`);
      return;
    }

    const updatedFields = {
      title: editTitle,
      clientId: editClientId,
      clientName: targetClient.name,
      clientColor: targetClient.clientColor,
      category: editCategory,
      taskType: editTaskType,
      format: editFormat,
      qty: editQty,
      priority: editPriority,
      postingDate: editPostingDate,
      deadline: editDeadline || editPostingDate,
      score: editScore,
      cogs: editCogs,
      driveLink: editDriveLink,
      status: editStatus,
    };

    updateTask(selectedTaskDetail.id, updatedFields);

    setSelectedTaskDetail({
      ...selectedTaskDetail,
      ...updatedFields,
    });

    setIsEditingDetail(false);
  };

  // Filter tasks
  const filteredTasks = tasks.filter((t) => {
    const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesClient = selectedClientFilter === 'ALL' || t.clientId === selectedClientFilter;
    return matchesSearch && matchesClient;
  });

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const targetClient = clients.find((c) => c.id === newClientId) || clients[0];

    // Point Cap Guardrail check
    if (targetClient && targetClient.remainingPoint < autoScore) {
      alert(`⚠️ Client ${targetClient.name} has exceeded point budget! (Remaining: ${targetClient.remainingPoint} pts). Additional point purchase required.`);
      return;
    }

    await addTask({
      title: newTitle,
      clientId: targetClient.id,
      clientName: targetClient.name,
      clientColor: targetClient.clientColor,
      category: newCategory,
      taskType: newTaskType,
      format: newFormat,
      qty: newQty,
      priority: newPriority,
      postingDate: newPostingDate,
      deadline: autoDeadline || newPostingDate,
      score: autoScore,
      cogs: autoCogs,
      driveLink: newDriveLink,
      status: 'Brief',
    });

    setIsCreateModalOpen(false);
    setNewTitle('');
  };

  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<TaskItem['status'] | null>(null);

  return (
    <div className="space-y-6 animate-fadeIn text-neutral-900">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900 flex items-center gap-2">
            Kanban Pipeline <span className="text-xs font-mono bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-full border border-neutral-200">10 Stages</span>
          </h1>
          <p className="text-xs text-neutral-500">Drag & drop tasks across columns. Minimal Linear-inspired workflow board.</p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="bg-neutral-900 hover:bg-neutral-800 text-white font-semibold text-xs px-4 py-2 rounded-lg shadow-xs flex items-center gap-2 transition"
        >
          <Plus className="w-4 h-4" /> Create Task
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-wrap items-center gap-3 p-3 rounded-2xl bg-white border border-neutral-200/80 shadow-xs">
        <div className="flex items-center gap-2 bg-neutral-50 px-3 py-1.5 rounded-lg border border-neutral-200 text-xs text-neutral-700 flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-neutral-400" />
          <input
            type="text"
            placeholder="Search tasks by title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent focus:outline-none w-full placeholder-neutral-400"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-neutral-400" />
          <select
            value={selectedClientFilter}
            onChange={(e) => setSelectedClientFilter(e.target.value)}
            className="bg-white border border-neutral-200 rounded-lg px-3 py-1.5 text-xs text-neutral-800 focus:outline-none font-semibold"
          >
            <option value="ALL">All Clients ({clients.length})</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 10-Column Linear Style Horizontal Scroll Track */}
      <div className="flex gap-4 overflow-x-auto pb-6 pt-1 min-h-[calc(100vh-280px)] select-none">
        {KANBAN_COLUMNS.map((col) => {
          const colTasks = filteredTasks.filter((t) => t.status === col);
          const colPoints = colTasks.reduce((sum, t) => sum + t.score, 0);
          const isTarget = dragOverColumn === col;

          return (
            <div
              key={col}
              onDragOver={(e) => {
                e.preventDefault();
                if (dragOverColumn !== col) setDragOverColumn(col);
              }}
              onDragLeave={() => {
                if (dragOverColumn === col) setDragOverColumn(null);
              }}
              onDrop={(e) => {
                e.preventDefault();
                const taskId = e.dataTransfer.getData('text/plain') || draggedTaskId;
                if (taskId) {
                  updateTaskStatus(taskId, col);
                }
                setDragOverColumn(null);
                setDraggedTaskId(null);
              }}
              className={`w-72 flex-shrink-0 border rounded-2xl flex flex-col p-3 transition-all duration-150 bg-white border-neutral-200/80 shadow-xs ${
                isTarget ? 'border-neutral-900 bg-neutral-50 scale-[1.01]' : ''
              }`}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between pb-3 border-b border-neutral-100 mb-3 px-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">{col}</h3>
                  <span className="bg-neutral-100 text-neutral-700 text-[10px] font-mono px-2 py-0.5 rounded-full font-bold border border-neutral-200">
                    {colTasks.length}
                  </span>
                </div>
                <span className="text-[10px] font-mono text-neutral-400">{colPoints} pts</span>
              </div>

              {/* Column Cards Container */}
              <div className="flex-1 space-y-2.5 overflow-y-auto max-h-[calc(100vh-340px)] pr-1 min-h-[150px]">
                {colTasks.map((task) => {
                  const isBeingDragged = draggedTaskId === task.id;

                  return (
                    <div
                      key={task.id}
                      draggable={true}
                      onDragStart={(e) => {
                        e.dataTransfer.setData('text/plain', task.id);
                        setDraggedTaskId(task.id);
                      }}
                      onDragEnd={() => {
                        setDraggedTaskId(null);
                        setDragOverColumn(null);
                      }}
                      onClick={() => setSelectedTaskDetail(task)}
                      className={`p-3.5 rounded-xl bg-white hover:bg-neutral-50 border border-neutral-200/80 hover:border-neutral-300 shadow-2xs transition cursor-grab active:cursor-grabbing space-y-2 group ${
                        isBeingDragged ? 'opacity-40 border-neutral-900' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              task.priority === 'High'
                                ? 'bg-red-500'
                                : task.priority === 'Medium'
                                ? 'bg-amber-500'
                                : 'bg-blue-500'
                            }`}
                          />
                          <span className="text-[10px] font-semibold text-neutral-600 font-mono truncate max-w-[120px]">
                            {task.clientName}
                          </span>
                        </div>
                        <span className="text-[10px] bg-neutral-100 text-neutral-800 font-mono font-bold px-1.5 py-0.5 rounded border border-neutral-200">
                          {task.score} pts
                        </span>
                      </div>

                      <p className="text-xs font-semibold text-neutral-900 leading-snug">
                        {task.title}
                      </p>

                      <div className="flex items-center justify-between text-[10px] text-neutral-500 pt-1 border-t border-neutral-100">
                        <span className="flex items-center gap-1 font-mono">
                          <CalendarIcon className="w-3 h-3 text-neutral-400" /> {task.deadline}
                        </span>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const nextIdx = (KANBAN_COLUMNS.indexOf(col) + 1) % KANBAN_COLUMNS.length;
                            updateTaskStatus(task.id, KANBAN_COLUMNS[nextIdx]);
                          }}
                          className="p-1 rounded hover:bg-neutral-200 text-neutral-500 hover:text-neutral-900 transition"
                          title="Advance Stage"
                        >
                          <MoveRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}

                {colTasks.length === 0 && (
                  <div className={`text-center py-10 border border-dashed rounded-xl transition ${isTarget ? 'border-neutral-400 bg-neutral-50' : 'border-neutral-200'}`}>
                    <p className="text-[11px] text-neutral-400">{isTarget ? 'Drop task here' : `No tasks in ${col}`}</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Task Detail Modal */}
      {selectedTaskDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-xl bg-white border border-neutral-200 rounded-2xl shadow-xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            {isEditingDetail ? (
              /* Editable detail modal */
              <form onSubmit={handleSaveEdit} className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
                  <h3 className="text-base font-bold text-neutral-900">Edit Production Task</h3>
                  <button
                    type="button"
                    onClick={() => setIsEditingDetail(false)}
                    className="p-1 text-neutral-400 hover:text-neutral-700"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block text-neutral-600 font-semibold mb-1">Task Title</label>
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full bg-white border border-neutral-200 rounded-lg px-3 py-2 text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-neutral-600 font-semibold mb-1">Client</label>
                      <select
                        value={editClientId}
                        onChange={(e) => setEditClientId(e.target.value)}
                        className="w-full bg-white border border-neutral-200 rounded-lg px-3 py-2 text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10"
                      >
                        {clients.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} ({c.remainingPoint} pts left)
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-neutral-600 font-semibold mb-1">Category</label>
                      <select
                        value={editCategory}
                        onChange={(e) => setEditCategory(e.target.value as any)}
                        className="w-full bg-white border border-neutral-200 rounded-lg px-3 py-2 text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10"
                      >
                        <option value="Editor">Editor</option>
                        <option value="Strategic">Strategic</option>
                        <option value="Assistant">Assistant</option>
                        <option value="Scheduler">Scheduler</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-neutral-600 font-semibold mb-1">Format</label>
                      <select
                        value={editFormat}
                        onChange={(e) => setEditFormat(e.target.value)}
                        className="w-full bg-white border border-neutral-200 rounded-lg px-3 py-2 text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10"
                      >
                        <option value="Reels">Reels (150 pts)</option>
                        <option value="Carousel">Carousel (150 pts)</option>
                        <option value="Single Foto">Single Foto (10 pts)</option>
                        <option value="Grafis">Grafis (25 pts)</option>
                        <option value="Story Video">Story Video (33 pts)</option>
                        <option value="Paket Static">Paket Static (75 pts)</option>
                        <option value="4 Jam">4 Jam (400 pts)</option>
                        <option value="8 Jam">8 Jam (800 pts)</option>
                        <option value="Per Post">Per Post (5 pts)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-neutral-600 font-semibold mb-1">Quantity (QTY)</label>
                      <input
                        type="number"
                        min={1}
                        max={999}
                        value={editQty}
                        onChange={(e) => setEditQty(Number(e.target.value))}
                        className="w-full bg-white border border-neutral-200 rounded-lg px-3 py-2 text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10"
                        required
                      />
                      {(editQty < 1 || editQty > 999) && (
                        <span className="text-[10px] text-red-600 font-semibold block mt-0.5">Quantity must be between 1 and 999.</span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-neutral-600 font-semibold mb-1">Posting Date</label>
                      <input
                        type="date"
                        value={editPostingDate}
                        onChange={(e) => setEditPostingDate(e.target.value)}
                        className="w-full bg-white border border-neutral-200 rounded-lg px-2 py-1.5 text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10"
                      />
                    </div>

                    <div>
                      <label className="block text-neutral-600 font-semibold mb-1">Priority</label>
                      <select
                        value={editPriority}
                        onChange={(e) => setEditPriority(e.target.value as any)}
                        className="w-full bg-white border border-neutral-200 rounded-lg px-2 py-1.5 text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10"
                      >
                        <option value="Low">Low</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-neutral-600 font-semibold mb-1">Status</label>
                      <select
                        value={editStatus}
                        onChange={(e) => setEditStatus(e.target.value as any)}
                        className="w-full bg-white border border-neutral-200 rounded-lg px-2 py-1.5 text-neutral-900 focus:outline-none"
                      >
                        {KANBAN_COLUMNS.map((col) => (
                          <option key={col} value={col}>
                            {col}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-neutral-600 font-semibold mb-1">Drive Folder Link</label>
                    <input
                      type="url"
                      placeholder="https://drive.google.com/..."
                      value={editDriveLink}
                      onChange={(e) => setEditDriveLink(e.target.value)}
                      className="w-full bg-white border border-neutral-200 rounded-lg px-3 py-2 text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10"
                    />
                  </div>

                  {/* Real-time score & cogs preview */}
                  <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-200/80 space-y-2">
                    <h4 className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Score & Budget Preview</h4>
                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="p-2 bg-white rounded-lg border border-neutral-200">
                        <span className="text-[10px] text-neutral-400 block font-semibold">Task Score</span>
                        <span className="font-bold text-neutral-900">{editScore} pts</span>
                      </div>
                      <div className="p-2 bg-white rounded-lg border border-neutral-200">
                        <span className="text-[10px] text-neutral-400 block font-semibold">COGS</span>
                        <span className="font-bold text-neutral-900">Rp {editCogs.toLocaleString()}</span>
                      </div>
                      <div className="p-2 bg-white rounded-lg border border-neutral-200">
                        <span className="text-[10px] text-neutral-400 block font-semibold">Remaining Budget</span>
                        <span
                          className={`font-bold ${
                            clients.find((c) => c.id === editClientId)?.remainingPoint! - (editScore - selectedTaskDetail.score) < 0
                              ? 'text-red-600'
                              : 'text-neutral-900'
                          }`}
                        >
                          {clients.find((c) => c.id === editClientId)?.remainingPoint! - (editScore - selectedTaskDetail.score)} pts
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-100">
                  <button
                    type="button"
                    onClick={() => setIsEditingDetail(false)}
                    className="px-4 py-2 rounded-lg text-xs text-neutral-600 hover:bg-neutral-100 font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={editQty < 1 || editQty > 999}
                    className="bg-neutral-900 hover:bg-neutral-800 disabled:opacity-50 text-white font-semibold text-xs px-5 py-2 rounded-lg shadow-xs"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            ) : (
              /* Read-only view with Edit button */
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-neutral-100 text-neutral-800 border border-neutral-200 font-mono">
                      {selectedTaskDetail.clientName}
                    </span>
                    <h2 className="text-lg font-bold text-neutral-900 mt-2">{selectedTaskDetail.title}</h2>
                  </div>
                  <button
                    onClick={() => setSelectedTaskDetail(null)}
                    className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs bg-neutral-50 p-3 rounded-xl border border-neutral-200">
                  <div>
                    <span className="text-neutral-500">Category / Type:</span>
                    <p className="font-semibold text-neutral-900">{selectedTaskDetail.category} ({selectedTaskDetail.taskType} - {selectedTaskDetail.format})</p>
                  </div>
                  <div>
                    <span className="text-neutral-500">Score & COGS:</span>
                    <p className="font-semibold text-emerald-800">{selectedTaskDetail.score} pts (Rp{(selectedTaskDetail.cogs || 0).toLocaleString()})</p>
                  </div>
                  <div>
                    <span className="text-neutral-500">Quantity:</span>
                    <p className="font-semibold text-neutral-900 font-mono">{selectedTaskDetail.qty || 1} Qty</p>
                  </div>
                  <div>
                    <span className="text-neutral-500">Priority & Stage:</span>
                    <p className="font-semibold text-neutral-900">{selectedTaskDetail.priority} • {selectedTaskDetail.status}</p>
                  </div>
                  <div>
                    <span className="text-neutral-500">Posting Date:</span>
                    <p className="font-semibold text-neutral-900">{selectedTaskDetail.postingDate || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-neutral-500">Deadline (Posting - 3 days):</span>
                    <p className="font-semibold text-amber-800">{selectedTaskDetail.deadline}</p>
                  </div>
                </div>

                {selectedTaskDetail.driveLink && (
                  <a
                    href={selectedTaskDetail.driveLink}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 text-xs text-neutral-900 font-semibold hover:underline bg-neutral-100 p-2.5 rounded-xl border border-neutral-200"
                  >
                    <ExternalLink className="w-4 h-4" /> Open Google Drive Folder
                  </a>
                )}

                <div className="flex items-center justify-between pt-4 border-t border-neutral-100">
                  <button
                    onClick={() => {
                      deleteTask(selectedTaskDetail.id);
                      setSelectedTaskDetail(null);
                    }}
                    className="text-xs text-red-600 hover:text-red-700 flex items-center gap-1.5 font-semibold"
                  >
                    <Trash2 className="w-4 h-4" /> Delete Task
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={startEditing}
                      className="bg-white hover:bg-neutral-50 text-neutral-700 border border-neutral-200 font-semibold text-xs px-4 py-2 rounded-lg"
                    >
                      Edit Task
                    </button>
                    <button
                      onClick={() => setSelectedTaskDetail(null)}
                      className="bg-neutral-900 hover:bg-neutral-800 text-white font-semibold text-xs px-4 py-2 rounded-lg"
                    >
                      Done
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create Task Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <form
            onSubmit={handleCreateTask}
            className="w-full max-w-lg bg-white border border-neutral-200 rounded-2xl shadow-xl p-6 space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <h3 className="text-base font-bold text-neutral-900">Create New Production Task</h3>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 text-neutral-400 hover:text-neutral-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-neutral-600 font-semibold mb-1">Task Title</label>
                <input
                  type="text"
                  placeholder="e.g. Sourdough Artisan Reel Video"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-white border border-neutral-200 rounded-lg px-3 py-2 text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-600 font-semibold mb-1">Client</label>
                  <select
                    value={newClientId}
                    onChange={(e) => setNewClientId(e.target.value)}
                    className="w-full bg-white border border-neutral-200 rounded-lg px-3 py-2 text-neutral-900"
                  >
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.remainingPoint} pts left)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-neutral-600 font-semibold mb-1">Category</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as any)}
                    className="w-full bg-white border border-neutral-200 rounded-lg px-3 py-2 text-neutral-900"
                  >
                    <option value="Editor">Editor</option>
                    <option value="Strategic">Strategic</option>
                    <option value="Assistant">Assistant</option>
                    <option value="Scheduler">Scheduler</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-600 font-semibold mb-1">Format</label>
                  <select
                    value={newFormat}
                    onChange={(e) => setNewFormat(e.target.value)}
                    className="w-full bg-white border border-neutral-200 rounded-lg px-3 py-2 text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10"
                  >
                    <option value="Reels">Reels (150 pts)</option>
                    <option value="Carousel">Carousel (150 pts)</option>
                    <option value="Single Foto">Single Foto (10 pts)</option>
                    <option value="Grafis">Grafis (25 pts)</option>
                    <option value="Story Video">Story Video (33 pts)</option>
                    <option value="Paket Static">Paket Static (75 pts)</option>
                    <option value="4 Jam">4 Jam (400 pts)</option>
                    <option value="8 Jam">8 Jam (800 pts)</option>
                    <option value="Per Post">Per Post (5 pts)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-neutral-600 font-semibold mb-1">Quantity (QTY)</label>
                  <input
                    type="number"
                    min={1}
                    max={999}
                    value={newQty}
                    onChange={(e) => setNewQty(Number(e.target.value))}
                    className="w-full bg-white border border-neutral-200 rounded-lg px-3 py-2 text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10"
                    required
                  />
                  {(newQty < 1 || newQty > 999) && (
                    <span className="text-[10px] text-red-600 font-semibold block mt-0.5">Quantity must be between 1 and 999.</span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-600 font-semibold mb-1">Posting Date</label>
                  <input
                    type="date"
                    value={newPostingDate}
                    onChange={(e) => setNewPostingDate(e.target.value)}
                    className="w-full bg-white border border-neutral-200 rounded-lg px-2.5 py-2 text-neutral-900"
                  />
                </div>

                <div>
                  <label className="block text-neutral-600 font-semibold mb-1">Auto Deadline</label>
                  <div className="bg-neutral-50 border border-neutral-200 rounded-lg px-2.5 py-2 text-neutral-900 font-mono font-bold">
                    {autoDeadline || 'N/A'}
                  </div>
                </div>
              </div>

              {/* Real-time score & cogs preview */}
              <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-200/80 space-y-2">
                <h4 className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Score & Budget Preview</h4>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-2 bg-white rounded-lg border border-neutral-200">
                    <span className="text-[10px] text-neutral-400 block font-semibold">Task Score</span>
                    <span className="font-bold text-neutral-900">{autoScore} pts</span>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-neutral-200">
                    <span className="text-[10px] text-neutral-400 block font-semibold">COGS</span>
                    <span className="font-bold text-neutral-900">Rp {autoCogs.toLocaleString()}</span>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-neutral-200">
                    <span className="text-[10px] text-neutral-400 block font-semibold">Remaining Budget</span>
                    <span
                      className={`font-bold ${
                        clients.find((c) => c.id === newClientId)
                          ? clients.find((c) => c.id === newClientId)!.remainingPoint - autoScore < 0
                            ? 'text-red-600'
                            : 'text-neutral-900'
                          : 'text-neutral-900'
                      }`}
                    >
                      {clients.find((c) => c.id === newClientId)
                        ? clients.find((c) => c.id === newClientId)!.remainingPoint - autoScore
                        : 0}{' '}
                      pts
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-100">
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="px-4 py-2 rounded-lg text-xs text-neutral-600 hover:bg-neutral-100 font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={newQty < 1 || newQty > 999}
                className="bg-neutral-900 hover:bg-neutral-800 disabled:opacity-50 text-white font-semibold text-xs px-5 py-2 rounded-lg shadow-xs"
              >
                Save Task
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
