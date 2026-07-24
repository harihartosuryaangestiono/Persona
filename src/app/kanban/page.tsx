'use client';

import React, { useState, useEffect } from 'react';
import { useData } from '@/context/DataContext';
import { useUser } from '@/context/UserContext';
import { useWorkspace } from '@/context/WorkspaceContext';
import {
  Plus,
  Search,
  Filter,
  X,
  Trash2,
  Edit2,
  ListTodo,
  ExternalLink,
  ChevronDown,
  LayoutGrid,
  CheckSquare,
  Users as UsersIcon,
  Video,
  FileText,
  Clock,
  ArrowRight,
  FolderOpen
} from 'lucide-react';
import { calculateTaskScore, calculateCOGS, calculateAutoDeadline } from '@/lib/score-calculator';
import { TaskItem, ClientItem } from '@/lib/types';

// Columns configurations
const STRATEGIC_COLUMNS: TaskItem['status'][] = ['Brief', 'Content Proposal', 'Script', 'Editorial Plan', 'Posted'];
const PRODUCTION_COLUMNS: TaskItem['status'][] = ['Shooting', 'Editing', 'Revision', 'Approval', 'Scheduling', 'Posted'];
const MAIN_COLUMNS: TaskItem['status'][] = ['Brief', 'Content Proposal', 'Script', 'Editorial Plan', 'Shooting', 'Editing', 'Revision', 'Approval', 'Scheduling', 'Posted'];

interface TaskStage {
  id: string;
  role: 'Strategist' | 'Production Assistant' | 'Editor' | 'Scheduler';
  userId: string;
  userName: string;
  taskType: string;
  format: string;
  qty: number;
  score: number;
}

export default function KanbanPage() {
  const { tasks, clients, worklogs, addTask, updateTask, updateTaskStatus, deleteTask, addWorklog } = useData();
  const { currentUser, allUsers } = useUser();
  const { currentWorkspace } = useWorkspace();

  // View state
  const [viewType, setViewType] = useState<'kanban' | 'table'>('kanban');
  const [activeBoard, setActiveBoard] = useState<'main' | 'strategic' | 'production'>('main');

  // Search and filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClientFilter, setSelectedClientFilter] = useState('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('ALL');
  const [selectedPriorityFilter, setSelectedPriorityFilter] = useState('ALL');
  const [selectedPICFilter, setSelectedPICFilter] = useState('ALL');

  // Sort state
  const [sortField, setSortField] = useState<string>('deadline');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Bulk Select
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [bulkStageTarget, setBulkStageTarget] = useState<string>('');
  const [bulkAssignTarget, setBulkAssignTarget] = useState<string>('');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedTaskDetail, setSelectedTaskDetail] = useState<TaskItem | null>(null);
  const [isEditingDetail, setIsEditingDetail] = useState(false);

  // Drag and Drop
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<TaskItem['status'] | null>(null);

  // Form State - Task
  const [newTitle, setNewTitle] = useState('');
  const [newClientId, setNewClientId] = useState('');
  const [newPriority, setNewPriority] = useState<'High' | 'Medium' | 'Low'>('Medium');
  const [newPostingDate, setNewPostingDate] = useState(new Date().toISOString().split('T')[0]);
  const [newDriveLink, setNewDriveLink] = useState('');
  const [newStages, setNewStages] = useState<TaskStage[]>([]);

  // Form State - Edit Task
  const [editTitle, setEditTitle] = useState('');
  const [editClientId, setEditClientId] = useState('');
  const [editPriority, setEditPriority] = useState<'High' | 'Medium' | 'Low'>('Medium');
  const [editPostingDate, setEditPostingDate] = useState('');
  const [editDriveLink, setEditDriveLink] = useState('');
  const [editPreviewLink, setEditPreviewLink] = useState('');
  const [editStatus, setEditStatus] = useState<TaskItem['status']>('Brief');
  const [editStages, setEditStages] = useState<TaskStage[]>([]);

  // Check user role to default board type
  useEffect(() => {
    if (currentUser) {
      const roles = currentUser.roles;
      const isAdmin = roles.includes('Admin') || roles.includes('Owner');
      if (isAdmin) {
        setActiveBoard('main');
      } else if (roles.includes('Strategist')) {
        setActiveBoard('strategic');
      } else {
        setActiveBoard('production');
      }
    }
  }, [currentUser]);

  // Set default client on mount
  const activeClients = clients.filter((c) => c.status === 'Active' || c.active);
  useEffect(() => {
    if (activeClients.length > 0 && !newClientId) {
      setNewClientId(activeClients[0].id);
    }
  }, [activeClients, newClientId]);

  // Workspace filtering
  const workspaceTasks = tasks.filter((t) => t.workspaceId === currentWorkspace.id);

  // Board columns based on active board state
  const columns = activeBoard === 'strategic' ? STRATEGIC_COLUMNS : activeBoard === 'production' ? PRODUCTION_COLUMNS : MAIN_COLUMNS;

  // Filtered tasks for presentation
  const filteredTasks = workspaceTasks.filter((t) => {
    // Client Filter
    if (selectedClientFilter !== 'ALL' && t.clientId !== selectedClientFilter) return false;
    // Status Filter (mainly for table view)
    if (selectedStatusFilter !== 'ALL' && t.status !== selectedStatusFilter) return false;
    // Priority Filter
    if (selectedPriorityFilter !== 'ALL' && t.priority !== selectedPriorityFilter) return false;
    // PIC Filter
    if (selectedPICFilter !== 'ALL') {
      const assignedIds = typeof t.assignedUserIds === 'string' ? JSON.parse(t.assignedUserIds) : t.assignedUserIds;
      if (!assignedIds.includes(selectedPICFilter)) return false;
    }
    // Search Query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const matchTitle = t.title.toLowerCase().includes(query);
      const matchClient = t.clientName?.toLowerCase().includes(query) || false;
      if (!matchTitle && !matchClient) return false;
    }

    // Role & Task Visibility Constraint:
    // Admin & Owner see everything.
    // Staff see tasks if:
    // 1. Task category matches their active roles.
    // 2. OR, they are in the assigned PIC list of the task.
    // 3. OR, they are assigned to one of the stages of the task.
    const isAdmin = currentUser.roles.includes('Admin') || currentUser.roles.includes('Owner');
    if (isAdmin) return true;

    const assignedIds = t.assignedUserIds
      ? (typeof t.assignedUserIds === 'string' ? JSON.parse(t.assignedUserIds) : t.assignedUserIds)
      : [];
    const isAssigned = assignedIds.includes(currentUser.id) || assignedIds.includes(currentUser.name);

    const logStages = t.stages ? (typeof t.stages === 'string' ? JSON.parse(t.stages) : t.stages) : [];
    const isStageAssignee = logStages.some((s: any) => s.userId === currentUser.id || s.userName === currentUser.name);

    let matchesCategory = false;
    if (currentUser.roles.includes('Strategist') && t.category === 'Strategic') matchesCategory = true;
    if (currentUser.roles.includes('Editor') && t.category === 'Editor') matchesCategory = true;
    if (currentUser.roles.includes('Scheduler') && t.category === 'Scheduler') matchesCategory = true;
    if (currentUser.roles.includes('Production Assistant') && t.category === 'Assistant') matchesCategory = true;

    return isAssigned || isStageAssignee || matchesCategory;
  });

  // Sort tasks for table view
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    let fieldA: any = a[sortField as keyof TaskItem] || '';
    let fieldB: any = b[sortField as keyof TaskItem] || '';

    if (sortField === 'deadline' || sortField === 'postingDate') {
      fieldA = new Date(fieldA || 0).getTime();
      fieldB = new Date(fieldB || 0).getTime();
    }

    if (fieldA < fieldB) return sortOrder === 'asc' ? -1 : 1;
    if (fieldA > fieldB) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  // Calculate task scores from stages helper
  const getStagesTotalScore = (stages: TaskStage[]) => {
    return stages.reduce((sum, s) => sum + s.score, 0);
  };

  // Strategic Formats Mapping based on Selected Task Type
  const getStrategicFormats = (type: string) => {
    if (type === 'Content Plan' || type === 'Production Lead') return ['4 Jam', '8 Jam'];
    if (type === 'Editing Plan') return ['Per Item'];
    if (type === 'Supervisi') return ['Per Check'];
    if (type === 'Presentasi') return ['Per Session'];
    return [];
  };

  // Add work stage to task form helper
  const handleAddStage = (isEdit: boolean) => {
    const defaultStage: TaskStage = {
      id: `stg-${Date.now()}-${Math.random()}`,
      role: 'Editor',
      userId: allUsers[0]?.id || '',
      userName: allUsers[0]?.name || '',
      taskType: 'Editing',
      format: 'Reels',
      qty: 1,
      score: 150,
    };
    if (isEdit) {
      setEditStages([...editStages, defaultStage]);
    } else {
      setNewStages([...newStages, defaultStage]);
    }
  };

  // Remove stage from form helper
  const handleRemoveStage = (id: string, isEdit: boolean) => {
    if (isEdit) {
      setEditStages(editStages.filter((s) => s.id !== id));
    } else {
      setNewStages(newStages.filter((s) => s.id !== id));
    }
  };

  // Handle stage field change helper
  const handleStageFieldChange = (
    stageId: string,
    field: keyof TaskStage,
    value: any,
    isEdit: boolean
  ) => {
    const listToMap = isEdit ? editStages : newStages;
    const updated = listToMap.map((stage) => {
      if (stage.id !== stageId) return stage;

      const newStage = { ...stage, [field]: value };

      // Reset values if role changes
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
        // Match user with this role
        const matchingUser = allUsers.find((u) => {
          const roles = typeof u.roles === 'string' ? JSON.parse(u.roles) : u.roles;
          return roles.includes(value);
        });
        if (matchingUser) {
          newStage.userId = matchingUser.id;
          newStage.userName = matchingUser.name;
        }
      }

      // Reset format if taskType changes
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

      // Re-calculate score
      let cat = 'Editor';
      if (newStage.role === 'Strategist') cat = 'Strategic';
      else if (newStage.role === 'Production Assistant') cat = 'Assistant';
      else if (newStage.role === 'Scheduler') cat = 'Scheduler';

      newStage.score = calculateTaskScore(cat, newStage.taskType, newStage.format, newStage.qty);

      return newStage;
    });

    if (isEdit) {
      setEditStages(updated);
    } else {
      setNewStages(updated);
    }
  };

  // Create task submit
  const handleCreateTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const targetClient = clients.find((c) => c.id === newClientId) || clients[0];
    const totalScore = getStagesTotalScore(newStages);

    const assignedIds = Array.from(new Set(newStages.map((s) => s.userId)));

    await addTask({
      title: newTitle,
      clientId: targetClient.id,
      clientName: targetClient.name,
      clientColor: targetClient.clientColor,
      workspaceId: currentWorkspace.id,
      priority: newPriority,
      postingDate: newPostingDate,
      deadline: calculateAutoDeadline(newPostingDate, -3),
      status: activeBoard === 'production' ? 'Shooting' : 'Brief',
      assignedUserIds: assignedIds,
      score: totalScore,
      cogs: totalScore * 250,
      driveLink: newDriveLink,
      stages: newStages,
    });

    // Reset Form
    setNewTitle('');
    setNewDriveLink('');
    setNewStages([]);
    setIsCreateModalOpen(false);
  };

  // Start edit task helper
  const startEditing = () => {
    if (!selectedTaskDetail) return;
    setEditTitle(selectedTaskDetail.title);
    setEditClientId(selectedTaskDetail.clientId);
    setEditPriority(selectedTaskDetail.priority || 'Medium');
    setEditPostingDate(selectedTaskDetail.postingDate ? selectedTaskDetail.postingDate.substring(0, 10) : new Date().toISOString().split('T')[0]);
    setEditDriveLink(selectedTaskDetail.driveLink || '');
    setEditPreviewLink(selectedTaskDetail.previewLink || '');
    setEditStatus(selectedTaskDetail.status);
    setEditStages(selectedTaskDetail.stages ? (typeof selectedTaskDetail.stages === 'string' ? JSON.parse(selectedTaskDetail.stages) : selectedTaskDetail.stages) : []);
    setIsEditingDetail(true);
  };

  // Save edit task submit
  const handleSaveEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTaskDetail) return;

    const targetClient = clients.find((c) => c.id === editClientId) || clients[0];
    const totalScore = getStagesTotalScore(editStages);
    const assignedIds = Array.from(new Set(editStages.map((s) => s.userId)));

    const updates: Partial<TaskItem> = {
      title: editTitle,
      clientId: targetClient.id,
      clientName: targetClient.name,
      clientColor: targetClient.clientColor,
      priority: editPriority,
      postingDate: editPostingDate,
      deadline: calculateAutoDeadline(editPostingDate, -3),
      status: editStatus,
      assignedUserIds: assignedIds,
      score: totalScore,
      cogs: totalScore * 250,
      driveLink: editDriveLink,
      previewLink: editPreviewLink,
      stages: editStages,
    };

    updateTask(selectedTaskDetail.id, updates);

    // If status updated to Completed or Posted, automate worklog mapping
    if (editStatus === 'Posted') {
      triggerAutomatedWorklog({ ...selectedTaskDetail, ...updates });
    }

    setIsEditingDetail(false);
    setSelectedTaskDetail(null);
  };

  // Task Status updates (via drag & drop)
  const handleUpdateStatusWithWorklog = (taskId: string, newStatus: TaskItem['status']) => {
    updateTaskStatus(taskId, newStatus);

    const taskObj = tasks.find((t) => t.id === taskId);
    if (taskObj && newStatus === 'Posted') {
      triggerAutomatedWorklog({ ...taskObj, status: newStatus });
    }
  };

  // Worklog automation trigger helper
  const triggerAutomatedWorklog = (task: TaskItem) => {
    const alreadyLogged = worklogs.some((w) => w.contentTitle === task.title && w.clientId === task.clientId);
    if (!alreadyLogged) {
      addWorklog({
        clientId: task.clientId,
        clientName: task.clientName,
        contentTitle: task.title,
        taskType: task.taskType || 'Editing',
        format: task.format || 'Reels',
        qty: task.qty || 1,
        score: task.score || 0,
        previewLink: task.previewLink || '',
        stages: task.stages || null,
        date: new Date().toISOString(),
        source: 'Automated',
      });
    }
  };

  // Bulk status update helper
  const handleBulkMove = () => {
    if (!bulkStageTarget || selectedTaskIds.length === 0) return;
    selectedTaskIds.forEach((id) => {
      handleUpdateStatusWithWorklog(id, bulkStageTarget as TaskItem['status']);
    });
    setBulkStageTarget('');
    setSelectedTaskIds([]);
  };

  // Bulk PIC assign helper
  const handleBulkAssign = () => {
    if (!bulkAssignTarget || selectedTaskIds.length === 0) return;
    const uObj = allUsers.find((u) => u.id === bulkAssignTarget);
    if (!uObj) return;

    selectedTaskIds.forEach((id) => {
      const task = tasks.find((t) => t.id === id);
      if (task) {
        const assignedIds = typeof task.assignedUserIds === 'string' ? JSON.parse(task.assignedUserIds) : task.assignedUserIds;
        const updatedIds = Array.from(new Set([...assignedIds, bulkAssignTarget]));
        updateTask(id, { assignedUserIds: updatedIds });
      }
    });
    setBulkAssignTarget('');
    setSelectedTaskIds([]);
  };

  // Bulk delete helper
  const handleBulkDelete = () => {
    if (selectedTaskIds.length === 0) return;
    if (confirm(`Are you sure you want to delete these ${selectedTaskIds.length} tasks?`)) {
      selectedTaskIds.forEach((id) => {
        deleteTask(id);
      });
      setSelectedTaskIds([]);
    }
  };

  // Toggle selection helper
  const handleSelectTask = (id: string) => {
    setSelectedTaskIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedTaskIds(sortedTasks.map((t) => t.id));
    } else {
      setSelectedTaskIds([]);
    }
  };

  // Drag-and-drop actions
  const handleDragStart = (taskId: string) => {
    setDraggedTaskId(taskId);
  };

  const handleDrop = (column: TaskItem['status']) => {
    if (draggedTaskId) {
      handleUpdateStatusWithWorklog(draggedTaskId, column);
    }
    setDraggedTaskId(null);
    setDragOverColumn(null);
  };

  return (
    <div className="space-y-6 text-neutral-900 animate-fadeIn">
      {/* Top Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900 flex items-center gap-2">
            Kanban Board / Table <span className="text-xs font-mono bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-full border border-neutral-200">{currentWorkspace.name}</span>
          </h1>
          <p className="text-xs text-neutral-500">
            Operations center for tasks and campaigns. Switch between visual Kanban or searchable grids.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Board selector */}
          {(currentUser?.roles.includes('Admin') || currentUser?.roles.includes('Owner') || currentUser?.roles.length! > 1) && (
            <div className="flex bg-neutral-100 p-0.5 rounded-lg border border-neutral-200 text-xs font-semibold">
              {(currentUser?.roles.includes('Admin') || currentUser?.roles.includes('Owner')) && (
                <button
                  onClick={() => setActiveBoard('main')}
                  className={`px-3 py-1 rounded-md transition ${
                    activeBoard === 'main' ? 'bg-white text-neutral-900 shadow-xs' : 'text-neutral-500 hover:text-neutral-900'
                  }`}
                >
                  Main Pipeline
                </button>
              )}
              <button
                onClick={() => setActiveBoard('strategic')}
                className={`px-3 py-1 rounded-md transition ${
                  activeBoard === 'strategic' ? 'bg-white text-neutral-900 shadow-xs' : 'text-neutral-500 hover:text-neutral-900'
                }`}
              >
                Strategic Workflow
              </button>
              <button
                onClick={() => setActiveBoard('production')}
                className={`px-3 py-1 rounded-md transition ${
                  activeBoard === 'production' ? 'bg-white text-neutral-900 shadow-xs' : 'text-neutral-500 hover:text-neutral-900'
                }`}
              >
                Production Board
              </button>
            </div>
          )}

          {/* View Switcher */}
          <div className="flex bg-neutral-100 p-0.5 rounded-lg border border-neutral-200 text-xs font-semibold">
            <button
              onClick={() => setViewType('kanban')}
              className={`px-3 py-1 rounded-md transition flex items-center gap-1.5 ${
                viewType === 'kanban' ? 'bg-white text-neutral-900 shadow-xs' : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" /> Kanban
            </button>
            <button
              onClick={() => setViewType('table')}
              className={`px-3 py-1 rounded-md transition flex items-center gap-1.5 ${
                viewType === 'table' ? 'bg-white text-neutral-900 shadow-xs' : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >
              <CheckSquare className="w-3.5 h-3.5" /> Table
            </button>
          </div>

          {/* Create Button */}
          {(currentUser?.roles.includes('Admin') || currentUser?.roles.includes('Owner') || currentUser?.roles.includes('Strategist')) && (
            <button
              onClick={() => {
                setNewStages([]);
                setIsCreateModalOpen(true);
              }}
              className="flex items-center gap-1.5 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition"
            >
              <Plus className="w-4 h-4" /> Create Task
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Panel */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs font-medium shadow-xs">
        <div className="flex flex-1 items-center gap-2 bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-1.5 w-full md:max-w-sm">
          <Search className="w-4 h-4 text-neutral-400" />
          <input
            type="text"
            placeholder="Search content, clients..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent focus:outline-hidden text-neutral-900 w-full font-normal"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Client Filter */}
          <div className="flex items-center gap-1">
            <span className="text-neutral-500">Client:</span>
            <select
              value={selectedClientFilter}
              onChange={(e) => setSelectedClientFilter(e.target.value)}
              className="bg-neutral-50 border border-neutral-200 rounded-lg px-2.5 py-1.5 text-neutral-800 focus:outline-hidden"
            >
              <option value="ALL">All Clients</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* PIC Filter */}
          <div className="flex items-center gap-1">
            <span className="text-neutral-500">PIC:</span>
            <select
              value={selectedPICFilter}
              onChange={(e) => setSelectedPICFilter(e.target.value)}
              className="bg-neutral-50 border border-neutral-200 rounded-lg px-2.5 py-1.5 text-neutral-800 focus:outline-hidden"
            >
              <option value="ALL">All PICs</option>
              {allUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>

          {/* Priority Filter */}
          <div className="flex items-center gap-1">
            <span className="text-neutral-500">Priority:</span>
            <select
              value={selectedPriorityFilter}
              onChange={(e) => setSelectedPriorityFilter(e.target.value)}
              className="bg-neutral-50 border border-neutral-200 rounded-lg px-2.5 py-1.5 text-neutral-800 focus:outline-hidden"
            >
              <option value="ALL">All Priorities</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>
        </div>
      </div>

      {/* Bulk Action Controls */}
      {selectedTaskIds.length > 0 && (
        <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs shadow-xs">
          <div className="flex items-center gap-2 font-bold text-neutral-800">
            <span>{selectedTaskIds.length} tasks selected</span>
          </div>

          <div className="flex items-center gap-3">
            {/* Bulk Move */}
            <div className="flex items-center gap-1.5">
              <select
                value={bulkStageTarget}
                onChange={(e) => setBulkStageTarget(e.target.value)}
                className="bg-white border border-neutral-200 rounded-lg px-2.5 py-1.5 focus:outline-hidden"
              >
                <option value="">Move status to...</option>
                {columns.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <button
                onClick={handleBulkMove}
                disabled={!bulkStageTarget}
                className="bg-neutral-900 hover:bg-neutral-800 text-white font-semibold px-3 py-1.5 rounded-lg disabled:opacity-50 transition"
              >
                Apply
              </button>
            </div>

            {/* Bulk Assign */}
            <div className="flex items-center gap-1.5">
              <select
                value={bulkAssignTarget}
                onChange={(e) => setBulkAssignTarget(e.target.value)}
                className="bg-white border border-neutral-200 rounded-lg px-2.5 py-1.5 focus:outline-hidden"
              >
                <option value="">Assign user...</option>
                {allUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
              <button
                onClick={handleBulkAssign}
                disabled={!bulkAssignTarget}
                className="bg-neutral-900 hover:bg-neutral-800 text-white font-semibold px-3 py-1.5 rounded-lg disabled:opacity-50 transition"
              >
                Assign
              </button>
            </div>

            {/* Bulk Delete */}
            <button
              onClick={handleBulkDelete}
              className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1 transition"
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </button>
          </div>
        </div>
      )}

      {/* Presentation Views */}
      {viewType === 'kanban' ? (
        /* KANBAN BOARD VIEW */
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin select-none">
          {columns.map((col) => {
            const colTasks = filteredTasks.filter((t) => t.status === col);
            const isDragOver = dragOverColumn === col;

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
                onDrop={() => handleDrop(col)}
                className={`flex-shrink-0 w-80 rounded-2xl p-4 transition-all flex flex-col justify-between min-h-[400px] border ${
                  isDragOver ? 'bg-neutral-100 border-neutral-400' : 'bg-neutral-50/50 border-neutral-200'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between pb-3 mb-2 border-b border-neutral-100">
                    <span className="text-xs font-bold text-neutral-800 flex items-center gap-1.5">
                      {col}
                      <span className="text-[10px] bg-neutral-200/80 px-1.5 py-0.5 rounded-full font-semibold">
                        {colTasks.length}
                      </span>
                    </span>
                  </div>

                  <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                    {colTasks.map((task) => {
                      const isBeingDragged = draggedTaskId === task.id;
                      const hasStages = task.stages && (typeof task.stages === 'string' ? JSON.parse(task.stages) : task.stages).length > 0;
                      const uniqueUserNames = task.stages
                        ? Array.from(new Set((typeof task.stages === 'string' ? JSON.parse(task.stages) : task.stages).map((s: any) => s.userName)))
                        : [];

                      return (
                        <div
                          key={task.id}
                          draggable
                          onDragStart={() => handleDragStart(task.id)}
                          onDragEnd={() => {
                            setDraggedTaskId(null);
                            setDragOverColumn(null);
                          }}
                          onClick={() => setSelectedTaskDetail(task)}
                          className={`bg-white border border-neutral-200/80 rounded-xl p-4 hover:border-neutral-400 hover:shadow-xs transition cursor-pointer space-y-2 relative ${
                            isBeingDragged ? 'opacity-40 border-neutral-900' : ''
                          }`}
                        >
                          <div className="flex justify-between items-start">
                            <span
                              className="text-[9px] font-bold px-2 py-0.5 rounded"
                              style={{ backgroundColor: `${task.clientColor}15`, color: task.clientColor }}
                            >
                              {task.clientName}
                            </span>
                            <span className="text-[9px] font-mono text-neutral-400 font-bold">{task.score} pts</span>
                          </div>

                          <h4 className="text-xs font-bold text-neutral-900 line-clamp-2 leading-tight">
                            {task.title}
                          </h4>

                          <div className="flex items-center justify-between pt-2 border-t border-neutral-50 text-[10px] text-neutral-400">
                            <span>PIC: <strong className="text-neutral-600">{uniqueUserNames.join(', ') || 'Unassigned'}</strong></span>
                            <span className="font-mono">{task.deadline ? task.deadline.substring(5, 10) : ''}</span>
                          </div>
                        </div>
                      );
                    })}

                    {colTasks.length === 0 && (
                      <div className="text-center py-8 text-neutral-400 text-xs italic">
                        Empty column
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50 text-neutral-500 font-semibold uppercase tracking-wider border-b border-neutral-200 whitespace-nowrap">
                <tr>
                  <th className="px-4 py-3.5 w-10">
                    <input
                      type="checkbox"
                      onChange={handleSelectAll}
                      checked={sortedTasks.length > 0 && selectedTaskIds.length === sortedTasks.length}
                      className="rounded border-neutral-300 text-neutral-900 focus:ring-neutral-950"
                    />
                  </th>
                  <th className="px-4 py-3.5">Content</th>
                  <th className="px-4 py-3.5">Client</th>
                  <th className="px-4 py-3.5">Assignees</th>
                  <th className="px-4 py-3.5">Deadline</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5">Priority</th>
                  <th className="px-4 py-3.5 text-right">Score</th>
                  <th className="px-4 py-3.5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 text-neutral-700">
                {sortedTasks.map((t) => {
                  const uniqueUserNames = t.stages
                    ? Array.from(new Set((typeof t.stages === 'string' ? JSON.parse(t.stages) : t.stages).map((s: any) => s.userName)))
                    : [];

                  return (
                    <tr key={t.id} className="hover:bg-neutral-50/50 transition">
                      <td className="px-4 py-3.5">
                        <input
                          type="checkbox"
                          checked={selectedTaskIds.includes(t.id)}
                          onChange={() => handleSelectTask(t.id)}
                          className="rounded border-neutral-300 text-neutral-900 focus:ring-neutral-950"
                        />
                      </td>
                      <td className="px-4 py-3.5 font-bold text-neutral-900">{t.title}</td>
                      <td className="px-4 py-3.5 font-semibold text-neutral-800">
                        <span
                          className="px-2 py-0.5 rounded text-[10px]"
                          style={{ backgroundColor: `${t.clientColor}15`, color: t.clientColor }}
                        >
                          {t.clientName}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-neutral-600 font-semibold">
                        {uniqueUserNames.join(', ') || 'Unassigned'}
                      </td>
                      <td className="px-4 py-3.5 font-mono text-neutral-500 font-semibold">{t.deadline}</td>
                      <td className="px-4 py-3.5">
                        <span className="badge-draft text-[10px] px-2 py-0.5 rounded border border-neutral-200 font-bold">
                          {t.status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`text-[10px] font-bold ${
                            t.priority === 'High' ? 'text-rose-600' : t.priority === 'Medium' ? 'text-amber-600' : 'text-neutral-500'
                          }`}
                        >
                          {t.priority}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono font-bold text-neutral-900">{t.score}</td>
                      <td className="px-4 py-3.5 text-center">
                        <button
                          onClick={() => setSelectedTaskDetail(t)}
                          className="p-1 rounded-lg hover:bg-neutral-100 text-neutral-500 hover:text-neutral-800 transition"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CREATE TASK MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-neutral-950/40 backdrop-filter backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white border border-neutral-200 shadow-xl rounded-2xl w-full max-w-3xl overflow-hidden animate-scaleUp">
            <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between">
              <h2 className="text-base font-bold text-neutral-900">Create New Content Task</h2>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-neutral-400 hover:text-neutral-600 text-sm">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTaskSubmit} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-neutral-700 font-semibold">Content Title</label>
                  <input
                    type="text"
                    required
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="e.g. POV Jepang Short Video"
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
                    {activeClients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.remainingPoint} pts remaining)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-neutral-700 font-semibold">Priority</label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as any)}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2 text-neutral-900 focus:outline-hidden"
                  >
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-neutral-700 font-semibold">Target Posting Date</label>
                  <input
                    type="date"
                    value={newPostingDate}
                    onChange={(e) => setNewPostingDate(e.target.value)}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2 text-neutral-900 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-neutral-700 font-semibold">Asset Folder (Drive Link)</label>
                <input
                  type="url"
                  value={newDriveLink}
                  onChange={(e) => setNewDriveLink(e.target.value)}
                  placeholder="https://drive.google.com/..."
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2 text-neutral-900 focus:outline-hidden"
                />
              </div>

              {/* Stages List Editor */}
              <div className="space-y-2 pt-2 border-t border-neutral-100">
                <div className="flex items-center justify-between">
                  <label className="text-neutral-800 font-bold flex items-center gap-1.5">
                    Work stages allocation
                    <span className="text-[10px] bg-neutral-100 font-mono text-neutral-600 px-1.5 py-0.5 rounded border">
                      Score: {getStagesTotalScore(newStages)} pts
                    </span>
                  </label>
                  <button
                    type="button"
                    onClick={() => handleAddStage(false)}
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

                    // Types based on role
                    let typeOptions = ['Editing', 'Revisi'];
                    if (stage.role === 'Strategist') typeOptions = ['Content Plan', 'Production Lead', 'Editing Plan', 'Supervisi', 'Presentasi'];
                    else if (stage.role === 'Production Assistant') typeOptions = ['Production Assistant'];
                    else if (stage.role === 'Scheduler') typeOptions = ['Scheduling'];

                    // Formats based on type
                    const formatOptions = getStrategicFormats(stage.taskType).length > 0 ? getStrategicFormats(stage.taskType) :
                      (stage.taskType === 'Scheduling' ? ['Per Post'] :
                      (stage.taskType === 'Editing' ? ['Single Foto', 'Grafis', 'Story Video', 'Paket Static', 'Carousel', 'Reels'] : ['Minor', 'Medium', 'Major']));

                    return (
                      <div key={stage.id} className="bg-neutral-50 border border-neutral-200 rounded-xl p-3 flex flex-wrap items-center gap-3">
                        {/* Role Select */}
                        <div className="flex-1 min-w-[120px]">
                          <select
                            value={stage.role}
                            onChange={(e) => handleStageFieldChange(stage.id, 'role', e.target.value, false)}
                            className="w-full bg-white border border-neutral-200 rounded-lg px-2 py-1 focus:outline-hidden"
                          >
                            <option value="Strategist">Strategist</option>
                            <option value="Production Assistant">PA</option>
                            <option value="Editor">Editor</option>
                            <option value="Scheduler">Scheduler</option>
                          </select>
                        </div>

                        {/* User Select */}
                        <div className="flex-1 min-w-[120px]">
                          <select
                            value={stage.userId}
                            onChange={(e) => handleStageFieldChange(stage.id, 'userId', e.target.value, false)}
                            className="w-full bg-white border border-neutral-200 rounded-lg px-2 py-1 focus:outline-hidden"
                          >
                            {matchingUsers.map((u) => (
                              <option key={u.id} value={u.id}>
                                {u.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Task Type Select */}
                        <div className="flex-1 min-w-[120px]">
                          <select
                            value={stage.taskType}
                            onChange={(e) => handleStageFieldChange(stage.id, 'taskType', e.target.value, false)}
                            className="w-full bg-white border border-neutral-200 rounded-lg px-2 py-1 focus:outline-hidden"
                          >
                            {typeOptions.map((t) => (
                              <option key={t} value={t}>
                                {t}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Format Select */}
                        <div className="flex-1 min-w-[120px]">
                          <select
                            value={stage.format}
                            onChange={(e) => handleStageFieldChange(stage.id, 'format', e.target.value, false)}
                            className="w-full bg-white border border-neutral-200 rounded-lg px-2 py-1 focus:outline-hidden"
                          >
                            {formatOptions.map((f) => (
                              <option key={f} value={f}>
                                {f}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Qty Input */}
                        <div className="w-16">
                          <input
                            type="number"
                            min="1"
                            value={stage.qty}
                            onChange={(e) => handleStageFieldChange(stage.id, 'qty', Number(e.target.value), false)}
                            className="w-full bg-white border border-neutral-200 rounded-lg px-2 py-1 text-center focus:outline-hidden font-mono font-bold"
                          />
                        </div>

                        {/* Display Score */}
                        <div className="w-16 text-right font-mono font-bold text-neutral-800">
                          {stage.score} pts
                        </div>

                        {/* Remove */}
                        <button
                          type="button"
                          onClick={() => handleRemoveStage(stage.id, false)}
                          className="text-red-500 hover:text-red-700"
                        >
                          ✕
                        </button>
                      </div>
                    );
                  })}

                  {newStages.length === 0 && (
                    <div className="text-center py-4 text-neutral-400 italic">
                      No stages added. Add a work stage to calculate points.
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="bg-neutral-100 hover:bg-neutral-200 text-neutral-850 font-semibold px-4 py-2 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-neutral-900 hover:bg-neutral-800 text-white font-semibold px-4 py-2 rounded-lg transition"
                >
                  Save Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TASK DETAIL & EDIT MODAL */}
      {selectedTaskDetail && (
        <div className="fixed inset-0 bg-neutral-950/40 backdrop-filter backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white border border-neutral-200 shadow-xl rounded-2xl w-full max-w-3xl overflow-hidden animate-scaleUp">
            <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between">
              <h2 className="text-base font-bold text-neutral-900">
                {isEditingDetail ? 'Edit Task Specifications' : 'Task Specification Detail'}
              </h2>
              <button
                onClick={() => {
                  setSelectedTaskDetail(null);
                  setIsEditingDetail(false);
                }}
                className="text-neutral-400 hover:text-neutral-600 text-sm"
              >
                ✕
              </button>
            </div>

            {isEditingDetail ? (
              /* EDIT MODE */
              <form onSubmit={handleSaveEditSubmit} className="p-6 space-y-4 text-xs">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-neutral-700 font-semibold">Title</label>
                    <input
                      type="text"
                      required
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2 text-neutral-900 focus:outline-hidden"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-neutral-700 font-semibold">Client</label>
                    <select
                      value={editClientId}
                      onChange={(e) => setEditClientId(e.target.value)}
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2 text-neutral-900 focus:outline-hidden"
                    >
                      {activeClients.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-neutral-700 font-semibold">Priority</label>
                    <select
                      value={editPriority}
                      onChange={(e) => setEditPriority(e.target.value as any)}
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2 text-neutral-900 focus:outline-hidden"
                    >
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                      <option value="Low">Low</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-neutral-700 font-semibold">Target Posting Date</label>
                    <input
                      type="date"
                      value={editPostingDate}
                      onChange={(e) => setEditPostingDate(e.target.value)}
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2 text-neutral-900 focus:outline-hidden"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-neutral-700 font-semibold">Pipeline Stage (Status)</label>
                    <select
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value as any)}
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2 text-neutral-900 focus:outline-hidden font-semibold"
                    >
                      {columns.map((col) => (
                        <option key={col} value={col}>
                          {col}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-neutral-700 font-semibold">Drive Link</label>
                    <input
                      type="url"
                      value={editDriveLink}
                      onChange={(e) => setEditDriveLink(e.target.value)}
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2 text-neutral-900 focus:outline-hidden"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-neutral-700 font-semibold">Preview Link</label>
                    <input
                      type="url"
                      value={editPreviewLink}
                      onChange={(e) => setEditPreviewLink(e.target.value)}
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2 text-neutral-900 focus:outline-hidden"
                    />
                  </div>
                </div>

                {/* Stages List Editor */}
                <div className="space-y-2 pt-2 border-t border-neutral-100">
                  <div className="flex items-center justify-between">
                    <label className="text-neutral-800 font-bold flex items-center gap-1.5">
                      Work stages allocation
                      <span className="text-[10px] bg-neutral-100 font-mono text-neutral-600 px-1.5 py-0.5 rounded border">
                        Score: {getStagesTotalScore(editStages)} pts
                      </span>
                    </label>
                    <button
                      type="button"
                      onClick={() => handleAddStage(true)}
                      className="text-neutral-900 hover:text-neutral-700 font-semibold text-[10px] flex items-center gap-0.5"
                    >
                      + Add Stage
                    </button>
                  </div>

                  <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                    {editStages.map((stage) => {
                      const matchingUsers = allUsers.filter((u) => {
                        const roles = typeof u.roles === 'string' ? JSON.parse(u.roles) : u.roles;
                        return roles.includes(stage.role);
                      });

                      // Types based on role
                      let typeOptions = ['Editing', 'Revisi'];
                      if (stage.role === 'Strategist') typeOptions = ['Content Plan', 'Production Lead', 'Editing Plan', 'Supervisi', 'Presentasi'];
                      else if (stage.role === 'Production Assistant') typeOptions = ['Production Assistant'];
                      else if (stage.role === 'Scheduler') typeOptions = ['Scheduling'];

                      // Formats based on type
                      const formatOptions = getStrategicFormats(stage.taskType).length > 0 ? getStrategicFormats(stage.taskType) :
                        (stage.taskType === 'Scheduling' ? ['Per Post'] :
                        (stage.taskType === 'Editing' ? ['Single Foto', 'Grafis', 'Story Video', 'Paket Static', 'Carousel', 'Reels'] : ['Minor', 'Medium', 'Major']));

                      return (
                        <div key={stage.id} className="bg-neutral-50 border border-neutral-200 rounded-xl p-3 flex flex-wrap items-center gap-3">
                          {/* Role Select */}
                          <div className="flex-1 min-w-[120px]">
                            <select
                              value={stage.role}
                              onChange={(e) => handleStageFieldChange(stage.id, 'role', e.target.value, true)}
                              className="w-full bg-white border border-neutral-200 rounded-lg px-2 py-1 focus:outline-hidden"
                            >
                              <option value="Strategist">Strategist</option>
                              <option value="Production Assistant">PA</option>
                              <option value="Editor">Editor</option>
                              <option value="Scheduler">Scheduler</option>
                            </select>
                          </div>

                          {/* User Select */}
                          <div className="flex-1 min-w-[120px]">
                            <select
                              value={stage.userId}
                              onChange={(e) => handleStageFieldChange(stage.id, 'userId', e.target.value, true)}
                              className="w-full bg-white border border-neutral-200 rounded-lg px-2 py-1 focus:outline-hidden"
                            >
                              {matchingUsers.map((u) => (
                                <option key={u.id} value={u.id}>
                                  {u.name}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Task Type Select */}
                          <div className="flex-1 min-w-[120px]">
                            <select
                              value={stage.taskType}
                              onChange={(e) => handleStageFieldChange(stage.id, 'taskType', e.target.value, true)}
                              className="w-full bg-white border border-neutral-200 rounded-lg px-2 py-1 focus:outline-hidden"
                            >
                              {typeOptions.map((t) => (
                                <option key={t} value={t}>
                                  {t}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Format Select */}
                          <div className="flex-1 min-w-[120px]">
                            <select
                              value={stage.format}
                              onChange={(e) => handleStageFieldChange(stage.id, 'format', e.target.value, true)}
                              className="w-full bg-white border border-neutral-200 rounded-lg px-2 py-1 focus:outline-hidden"
                            >
                              {formatOptions.map((f) => (
                                <option key={f} value={f}>
                                  {f}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Qty Input */}
                          <div className="w-16">
                            <input
                              type="number"
                              min="1"
                              value={stage.qty}
                              onChange={(e) => handleStageFieldChange(stage.id, 'qty', Number(e.target.value), true)}
                              className="w-full bg-white border border-neutral-200 rounded-lg px-2 py-1 text-center focus:outline-hidden font-mono font-bold"
                            />
                          </div>

                          {/* Display Score */}
                          <div className="w-16 text-right font-mono font-bold text-neutral-800">
                            {stage.score} pts
                          </div>

                          {/* Remove */}
                          <button
                            type="button"
                            onClick={() => handleRemoveStage(stage.id, true)}
                            className="text-red-500 hover:text-red-700"
                          >
                            ✕
                          </button>
                        </div>
                      );
                    })}

                    {editStages.length === 0 && (
                      <div className="text-center py-4 text-neutral-400 italic">
                        No stages added.
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-4 flex items-center justify-between border-t border-neutral-100">
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm('Delete this task permanently?')) {
                        deleteTask(selectedTaskDetail.id);
                        setSelectedTaskDetail(null);
                        setIsEditingDetail(false);
                      }
                    }}
                    className="flex items-center gap-1 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 px-3 py-2 rounded-lg font-semibold transition"
                  >
                    <Trash2 className="w-4 h-4" /> Delete Task
                  </button>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setIsEditingDetail(false)}
                      className="bg-neutral-100 hover:bg-neutral-200 text-neutral-850 font-semibold px-4 py-2 rounded-lg transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="bg-neutral-900 hover:bg-neutral-800 text-white font-semibold px-4 py-2 rounded-lg transition"
                    >
                      Save Specifications
                    </button>
                  </div>
                </div>
              </form>
            ) : (
              /* READ-ONLY DETAIL VIEW */
              <div className="p-6 space-y-6 text-xs text-neutral-800">
                <div className="flex justify-between items-start gap-4">
                  <div className="space-y-1">
                    <span
                      className="text-[9px] font-bold px-2 py-0.5 rounded"
                      style={{ backgroundColor: `${selectedTaskDetail.clientColor}15`, color: selectedTaskDetail.clientColor }}
                    >
                      {selectedTaskDetail.clientName}
                    </span>
                    <h3 className="text-base font-bold text-neutral-900">{selectedTaskDetail.title}</h3>
                  </div>

                  <div className="text-right">
                    <span className="text-lg font-mono font-bold text-neutral-900">{selectedTaskDetail.score}</span>
                    <span className="text-[10px] text-neutral-400 block font-semibold">Total points</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-xl bg-neutral-50 border border-neutral-200/60 font-semibold text-neutral-600">
                  <div>
                    <span className="text-neutral-400 block text-[10px]">Deadline:</span>
                    <strong className="text-neutral-800 font-mono">{selectedTaskDetail.deadline}</strong>
                  </div>
                  <div>
                    <span className="text-neutral-400 block text-[10px]">Posting Date:</span>
                    <strong className="text-neutral-800 font-mono">{selectedTaskDetail.postingDate || '-'}</strong>
                  </div>
                  <div>
                    <span className="text-neutral-400 block text-[10px]">Priority:</span>
                    <strong
                      className={`font-bold ${
                        selectedTaskDetail.priority === 'High' ? 'text-rose-600' : 'text-neutral-800'
                      }`}
                    >
                      {selectedTaskDetail.priority}
                    </strong>
                  </div>
                  <div>
                    <span className="text-neutral-400 block text-[10px]">Stage:</span>
                    <strong className="text-neutral-800 uppercase font-mono">{selectedTaskDetail.status}</strong>
                  </div>
                </div>

                {/* Stages List Display */}
                <div className="space-y-2 border-t border-neutral-100 pt-4">
                  <h4 className="font-bold text-neutral-900">Work Stages Allocations</h4>
                  <div className="space-y-2">
                    {selectedTaskDetail.stages ? (
                      (typeof selectedTaskDetail.stages === 'string' ? JSON.parse(selectedTaskDetail.stages) : selectedTaskDetail.stages).map((s: any) => (
                        <div key={s.id} className="bg-neutral-50 border border-neutral-200/80 rounded-xl p-3 flex justify-between items-center text-xs">
                          <div>
                            <span className="font-bold text-neutral-900">{s.userName}</span>
                            <span className="text-neutral-400 mx-2">|</span>
                            <span className="text-neutral-500 font-semibold">{s.role}</span>
                            <span className="text-neutral-400 mx-2">|</span>
                            <span className="text-neutral-600 font-mono">{s.taskType} ({s.format})</span>
                          </div>
                          <div className="text-right font-mono font-bold text-neutral-900">
                            {s.score} pts
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="bg-neutral-50 border border-neutral-200/80 rounded-xl p-3 flex justify-between items-center text-xs">
                        <div>
                          <span className="font-bold text-neutral-900">Legacy Task Assignee</span>
                          <span className="text-neutral-400 mx-2">|</span>
                          <span className="text-neutral-600 font-mono">{selectedTaskDetail.taskType} ({selectedTaskDetail.format})</span>
                        </div>
                        <div className="text-right font-mono font-bold text-neutral-900">
                          {selectedTaskDetail.score} pts
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Links */}
                <div className="space-y-2 border-t border-neutral-100 pt-4">
                  <h4 className="font-bold text-neutral-900">Assets & Previews</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {selectedTaskDetail.driveLink ? (
                      <a
                        href={selectedTaskDetail.driveLink}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between p-3 bg-blue-50 border border-blue-100 rounded-xl text-blue-700 font-semibold hover:bg-blue-100 transition"
                      >
                        <span className="flex items-center gap-2">
                          <FolderOpen className="w-4 h-4" /> Drive Folder
                        </span>
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    ) : (
                      <div className="p-3 bg-neutral-50 border border-neutral-200 border-dashed rounded-xl text-neutral-400 text-center">
                        No Drive Link Added
                      </div>
                    )}

                    {selectedTaskDetail.previewLink ? (
                      <a
                        href={selectedTaskDetail.previewLink}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-700 font-semibold hover:bg-emerald-100 transition"
                      >
                        <span className="flex items-center gap-2">
                          <Video className="w-4 h-4" /> Preview Link
                        </span>
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    ) : (
                      <div className="p-3 bg-neutral-50 border border-neutral-200 border-dashed rounded-xl text-neutral-400 text-center">
                        No Preview Link Added
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-4 flex items-center justify-end gap-3 border-t border-neutral-100">
                  <button
                    onClick={() => {
                      setSelectedTaskDetail(null);
                    }}
                    className="bg-neutral-100 hover:bg-neutral-200 text-neutral-850 font-semibold px-4 py-2 rounded-lg transition"
                  >
                    Close
                  </button>

                  <button
                    onClick={startEditing}
                    className="bg-neutral-900 hover:bg-neutral-800 text-white font-semibold px-4 py-2 rounded-lg transition"
                  >
                    Edit Specifications
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
