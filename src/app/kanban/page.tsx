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
  FolderOpen,
  Calendar as CalendarIcon,
  Zap,
  Play
} from 'lucide-react';
import { calculateTaskScore, calculateCOGS, calculateAutoDeadline, calculatePriority, getPriorityColorClass } from '@/lib/score-calculator';
import { TaskItem, ClientItem, UserPersona } from '@/lib/types';

// Updated column configurations (Requirement 12)
const STRATEGIC_COLUMNS: TaskItem['status'][] = ['Brief', 'Content Proposal', 'Script & Shotlist', 'Editorial Calendar', 'Ready for Production', 'Completed'];
const PRODUCTION_COLUMNS: TaskItem['status'][] = ['Production', 'Editing', 'Revision', 'Approval', 'Ready to Post', 'Scheduling', 'Posted'];
const MAIN_COLUMNS: TaskItem['status'][] = [
  'Brief', 'Content Proposal', 'Script & Shotlist', 'Editorial Calendar', 'Ready for Production', 'Completed',
  'Production', 'Editing', 'Revision', 'Approval', 'Ready to Post', 'Scheduling', 'Posted'
];

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

import { useToast } from '@/context/ToastContext';

export default function KanbanPage() {
  const { tasks, clients, worklogs, addTask, updateTask, updateTaskStatus, deleteTask, addWorklog, addNotification, activities, addActivity } = useData();
  const { currentUser, allUsers } = useUser();
  const { currentWorkspace } = useWorkspace();
  const { showToast } = useToast();

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
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [createSuccess, setCreateSuccess] = useState(false);
  const [selectedTaskDetail, setSelectedTaskDetail] = useState<TaskItem | null>(null);
  const [isEditingDetail, setIsEditingDetail] = useState(false);

  // Drag and Drop
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<TaskItem['status'] | null>(null);

  // Form State - Task Creation
  const [newTitle, setNewTitle] = useState('');
  const [newClientId, setNewClientId] = useState('');
  const [newCategory, setNewCategory] = useState<'Strategic' | 'Production' | 'Editing' | 'Scheduling'>('Strategic');
  const [newPostingDate, setNewPostingDate] = useState(new Date().toISOString().split('T')[0]);
  const [newDeadline, setNewDeadline] = useState(calculateAutoDeadline(new Date().toISOString().split('T')[0], -3));
  const [newMonth, setNewMonth] = useState('July');
  const [newYear, setNewYear] = useState(2026);
  const [newDriveLink, setNewDriveLink] = useState('');
  const [newStages, setNewStages] = useState<TaskStage[]>([]);

  // Form State - Edit Task
  const [editTitle, setEditTitle] = useState('');
  const [editClientId, setEditClientId] = useState('');
  const [editPostingDate, setEditPostingDate] = useState('');
  const [editDeadline, setEditDeadline] = useState('');
  const [editMonth, setEditMonth] = useState('July');
  const [editYear, setEditYear] = useState(2026);
  const [editDriveLink, setEditDriveLink] = useState('');
  const [editPreviewLink, setEditPreviewLink] = useState('');
  const [editStatus, setEditStatus] = useState<TaskItem['status']>('Brief');
  const [editStages, setEditStages] = useState<TaskStage[]>([]);

  const [hasInitializedBoard, setHasInitializedBoard] = useState(false);
  const [prevUserId, setPrevUserId] = useState<string | null>(null);

  // Check user role to default board type on initial load or user switch
  useEffect(() => {
    if (currentUser) {
      if (!hasInitializedBoard || currentUser.id !== prevUserId) {
        const roles = currentUser.roles;
        const isAdmin = roles.includes('Admin') || roles.includes('Owner');
        if (isAdmin) {
          setActiveBoard('main');
        } else if (roles.includes('Strategist')) {
          setActiveBoard('strategic');
        } else {
          setActiveBoard('production');
        }
        setHasInitializedBoard(true);
        setPrevUserId(currentUser.id);
      }
    }
  }, [currentUser, hasInitializedBoard, prevUserId]);

  // Set default client on mount
  const activeClients = clients.filter((c) => c.status === 'Active' || c.active);
  useEffect(() => {
    if (activeClients.length > 0 && !newClientId) {
      setNewClientId(activeClients[0].id);
    }
  }, [activeClients, newClientId]);

  // Sync Month/Year when Posting Date changes in Create Form
  useEffect(() => {
    if (newPostingDate) {
      const d = new Date(newPostingDate);
      if (!isNaN(d.getTime())) {
        const monthNames = [
          'January', 'February', 'March', 'April', 'May', 'June',
          'July', 'August', 'September', 'October', 'November', 'December'
        ];
        setNewMonth(monthNames[d.getMonth()]);
        setNewYear(d.getFullYear());
      }
      setNewDeadline(calculateAutoDeadline(newPostingDate, -3));
    }
  }, [newPostingDate]);

  // Sync Month/Year when Posting Date changes in Edit Form
  useEffect(() => {
    if (editPostingDate) {
      const d = new Date(editPostingDate);
      if (!isNaN(d.getTime())) {
        const monthNames = [
          'January', 'February', 'March', 'April', 'May', 'June',
          'July', 'August', 'September', 'October', 'November', 'December'
        ];
        setEditMonth(monthNames[d.getMonth()]);
        setEditYear(d.getFullYear());
      }
      setEditDeadline(calculateAutoDeadline(editPostingDate, -3));
    }
  }, [editPostingDate]);

  // Workspace filtering (fallback to current workspace if workspaceId is missing)
  const workspaceTasks = tasks.filter((t) => !t.workspaceId || t.workspaceId === currentWorkspace.id);

  // Board columns based on active board state
  const columns = activeBoard === 'strategic' ? STRATEGIC_COLUMNS : activeBoard === 'production' ? PRODUCTION_COLUMNS : MAIN_COLUMNS;

  // Filtered tasks for presentation
  const filteredTasks = workspaceTasks.filter((t) => {
    // Exclude archived tasks from active board (Requirement 4)
    if (t.isArchived) return false;

    // Filter by Active Board type (Requirement 5: Correct Workflow Detection based on Task Category)
    if (activeBoard === 'strategic' && t.category !== 'Strategic') return false;
    if (activeBoard === 'production' && t.category === 'Strategic') return false;

    // Client Filter
    if (selectedClientFilter !== 'ALL' && t.clientId !== selectedClientFilter) return false;
    // Status Filter (mainly for table view)
    if (selectedStatusFilter !== 'ALL' && t.status !== selectedStatusFilter) return false;
    // Priority Filter
    if (selectedPriorityFilter !== 'ALL') {
      const dynamicPriority = calculatePriority(t.deadline, t.status, t.postingDate);
      if (dynamicPriority !== selectedPriorityFilter) return false;
    }
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
    const isAdmin = currentUser.roles.includes('Admin') || currentUser.roles.includes('Owner');
    if (isAdmin) return true;

    const assignedIds = t.assignedUserIds
      ? (typeof t.assignedUserIds === 'string' ? JSON.parse(t.assignedUserIds) : t.assignedUserIds)
      : [];
    const isAssigned = assignedIds.includes(currentUser.id) || assignedIds.includes(currentUser.name);

    const logStages = t.stages ? (typeof t.stages === 'string' ? JSON.parse(t.stages) : t.stages) : [];
    const isStageAssignee = logStages.some((s: any) => s.userId === currentUser.id || s.userName === currentUser.name);

    let matchesCategory = false;
    const catStr = t.category as string;
    if (currentUser.roles.includes('Strategist') && (catStr === 'Strategic' || catStr === 'Strategist')) matchesCategory = true;
    if (currentUser.roles.includes('Editor') && (catStr === 'Editor' || catStr === 'Editing')) matchesCategory = true;
    if (currentUser.roles.includes('Scheduler') && (catStr === 'Scheduler' || catStr === 'Scheduling')) matchesCategory = true;
    if (currentUser.roles.includes('Production Assistant') && (catStr === 'Production' || catStr === 'Assistant')) matchesCategory = true;

    const isCreator = (t as any).createdBy === currentUser.id || (t as any).createdBy === currentUser.name;

    return isAssigned || isStageAssignee || matchesCategory || isCreator;
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
    if (type === 'Content Plan' || type === 'Production Lead' || type === 'Production Assistant' || type === 'PA') return ['4 Jam', '8 Jam'];
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

  // Determine starting status based on category (Requirement 8)
  const getFirstStatus = (cat: string) => {
    if (cat === 'Strategic') return 'Brief';
    if (cat === 'Production') return 'Production';
    if (cat === 'Editing') return 'Editing';
    return 'Scheduling';
  };

  // Create task submit
  const handleCreateTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || isCreatingTask) return;

    // Permissions check (Requirement 7)
    const isExecutive = currentUser.roles.includes('Admin') || currentUser.roles.includes('Owner');
    if (!isExecutive) {
      if (newCategory === 'Strategic' && !currentUser.roles.includes('Strategist')) {
        showToast('Unauthorized: Only Strategists can create Strategic tasks', 'warning');
        return;
      }
      if (newCategory === 'Production' && currentUser.roles.includes('Scheduler')) {
        showToast('Unauthorized: Schedulers cannot create Production tasks', 'warning');
        return;
      }
    }

    setIsCreatingTask(true);
    try {
      const targetClient = clients.find((c) => c.id === newClientId) || clients[0];
      const totalScore = getStagesTotalScore(newStages);
      const assignedIds = Array.from(new Set(newStages.map((s) => s.userId)));
      const startingStatus = getFirstStatus(newCategory);

      await addTask({
        title: newTitle,
        clientId: targetClient.id,
        clientName: targetClient.name,
        clientColor: targetClient.clientColor,
        workspaceId: currentWorkspace.id,
        postingDate: newPostingDate,
        deadline: newDeadline,
        status: startingStatus as any, // Correct Workflow Detection (Requirement 8)
        assignedUserIds: assignedIds,
        score: totalScore,
        cogs: totalScore * 250,
        driveLink: newDriveLink,
        stages: newStages,
        category: newCategory,
        month: newMonth,
        year: newYear,
        isArchived: false,
      });

      setCreateSuccess(true);
      
      // Reset Form
      setNewTitle('');
      setNewDriveLink('');
      setNewStages([]);
      
      setTimeout(() => {
        setIsCreateModalOpen(false);
        setCreateSuccess(false);
      }, 1500);
    } catch (err) {
      console.error(err);
      showToast('Failed to create task. Please try again.', 'error');
    } finally {
      setIsCreatingTask(false);
    }
  };

  // Start edit task helper
  const startEditing = () => {
    if (!selectedTaskDetail) return;
    setEditTitle(selectedTaskDetail.title);
    setEditClientId(selectedTaskDetail.clientId);
    setEditPostingDate(selectedTaskDetail.postingDate ? selectedTaskDetail.postingDate.substring(0, 10) : new Date().toISOString().split('T')[0]);
    setEditDeadline(selectedTaskDetail.deadline ? selectedTaskDetail.deadline.substring(0, 10) : new Date().toISOString().split('T')[0]);
    setEditMonth(selectedTaskDetail.month || 'July');
    setEditYear(selectedTaskDetail.year || 2026);
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

    // Enforce assignee restrictions (Requirement 7: PA/Editor/Scheduler cannot assign others)
    const isExecutive = currentUser.roles.includes('Admin') || currentUser.roles.includes('Owner');
    if (!isExecutive && !currentUser.roles.includes('Strategist')) {
      const originalAssigned = typeof selectedTaskDetail.assignedUserIds === 'string' ? JSON.parse(selectedTaskDetail.assignedUserIds) : selectedTaskDetail.assignedUserIds;
      const isSelfAssign = assignedIds.length <= 1 && (assignedIds.length === 0 || assignedIds[0] === currentUser.id);
      const noChange = JSON.stringify(assignedIds.sort()) === JSON.stringify(originalAssigned.sort());
      if (!isSelfAssign && !noChange) {
        showToast('Unauthorized: You cannot assign other employees to this task.', 'warning');
        return;
      }
    }

    const updates: Partial<TaskItem> = {
      title: editTitle,
      clientId: targetClient.id,
      clientName: targetClient.name,
      clientColor: targetClient.clientColor,
      postingDate: editPostingDate,
      deadline: editDeadline,
      status: editStatus,
      assignedUserIds: assignedIds,
      score: totalScore,
      cogs: totalScore * 250,
      driveLink: editDriveLink,
      previewLink: editPreviewLink,
      stages: editStages,
      month: editMonth,
      year: editYear,
    };

    updateTask(selectedTaskDetail.id, updates);

    // If status updated to Posted, automate worklog mapping
    if (editStatus === 'Posted') {
      triggerAutomatedWorklog({ ...selectedTaskDetail, ...updates });
    }

    setIsEditingDetail(false);
    setSelectedTaskDetail(null);
  };

  // Unified Single Lifecycle Handover (Requirement 1, 6, 7)
  const handleSendToProduction = async (task: TaskItem) => {
    const prodStages = [
      {
        id: `stg-${Date.now()}`,
        role: 'Production Assistant' as const,
        userId: 'u-jabin', // Default PA
        userName: 'Jabin',
        taskType: 'Production Assistant',
        format: '4 Jam',
        qty: 1,
        score: 400,
      },
      {
        id: `stg-${Date.now()}-2`,
        role: 'Editor' as const,
        userId: 'u-dindong', // Default Editor
        userName: 'Dinda',
        taskType: 'Editing',
        format: 'Reels',
        qty: 1,
        score: 150,
      }
    ];

    // Build timeline log event (Requirement 7)
    const timeline = task.workflowTimeline ? JSON.parse(task.workflowTimeline) : [];
    timeline.push({
      status: 'Production',
      timestamp: new Date().toISOString(),
      userId: currentUser?.id || 'u-system',
    });

    // Update current task to transition categories instead of duplicating (Requirement 1 & 16)
    await updateTask(task.id, {
      category: 'Production',
      status: 'Production',
      assignedUserIds: ['u-jabin', 'u-dindong'],
      score: 550,
      cogs: 550 * 250,
      stages: prodStages,
      workflowTimeline: JSON.stringify(timeline),
    } as any);

    // Create Activity Log (Requirement 6 & 13)
    addActivity(currentUser?.id || 'u-system', 'TASK', task.id, 'MOVED', `Strategic task handed over to Production (Single Lifecycle)`);

    // Notify Production Team members (PA, Editor, Scheduler)
    const productionTeam = allUsers.filter(u => {
      const roles = typeof u.roles === 'string' ? JSON.parse(u.roles) : u.roles;
      return roles.some((r: any) => ['Production Assistant', 'Editor', 'Scheduler'].includes(r));
    });

    for (const member of productionTeam) {
      await addNotification({
        userId: member.id,
        type: 'ASSIGNMENT',
        title: 'New Production Handover',
        message: `Content "${task.title}" has been handed over to Production.`,
        link: '/kanban',
      });
    }

    showToast('Handed over content task to Production successfully!', 'success');
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

  // Worklog automation trigger helper (Upserts stage logs under a single Worklog)
  const triggerAutomatedWorklog = (task: TaskItem) => {
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
      month: task.month,
      year: task.year,
      contentId: task.contentId || '',
      isArchived: false,
    });
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

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedTaskIds(sortedTasks.map((t) => t.id));
    } else {
      setSelectedTaskIds([]);
    }
  };

  const handleSelectTask = (taskId: string) => {
    setSelectedTaskIds((prev) =>
      prev.includes(taskId) ? prev.filter((id) => id !== taskId) : [...prev, taskId]
    );
  };

  const handleDragStart = (taskId: string) => {
    setDraggedTaskId(taskId);
  };

  // Safe drop verification (Requirement 12)
  const handleDrop = (column: TaskItem['status']) => {
    if (!draggedTaskId) return;
    
    const taskObj = tasks.find((t) => t.id === draggedTaskId);
    if (!taskObj) return;

    // 1. Enforce workflow category bounds
    const isStrategicCol = STRATEGIC_COLUMNS.includes(column);
    const isProductionCol = PRODUCTION_COLUMNS.includes(column);
    if (taskObj.category === 'Strategic' && !isStrategicCol) {
      showToast('Cannot move a Strategic task to a Production column', 'warning');
      setDraggedTaskId(null);
      setDragOverColumn(null);
      return;
    }
    if (taskObj.category !== 'Strategic' && !isProductionCol) {
      showToast('Cannot move a Production task to a Strategic column', 'warning');
      setDraggedTaskId(null);
      setDragOverColumn(null);
      return;
    }

    // 2. Enforce Role Permissions on moves
    const isExecutive = currentUser.roles.includes('Admin') || currentUser.roles.includes('Owner');
    if (!isExecutive) {
      if (taskObj.category === 'Strategic' && !currentUser.roles.includes('Strategist')) {
        showToast('Only Strategists can manage Strategic Workflow', 'warning');
        setDraggedTaskId(null);
        setDragOverColumn(null);
        return;
      }
      if (taskObj.category !== 'Strategic') {
        const hasProdRole = currentUser.roles.some((r: any) =>
          ['Production Assistant', 'Editor', 'Scheduler'].includes(r)
        );
        if (!hasProdRole) {
          showToast('Only Production, Editor, Scheduler, and Admin can manage Production Workflow', 'warning');
          setDraggedTaskId(null);
          setDragOverColumn(null);
          return;
        }
      }
    }

    handleUpdateStatusWithWorklog(draggedTaskId, column);
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

        {/* View Switcher */}
        <div className="flex items-center gap-3">
          {/* Board selector tabs */}
          {currentUser && (currentUser.roles.includes('Admin') || currentUser.roles.includes('Owner') || currentUser.roles.includes('Strategist')) ? (
            <div className="flex items-center bg-white border border-neutral-200 p-1 rounded-xl shadow-2xs">
              {(['main', 'strategic', 'production'] as const).map((b) => (
                <button
                  key={b}
                  onClick={() => setActiveBoard(b)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold capitalize transition ${
                    activeBoard === b
                      ? 'bg-neutral-900 text-white shadow-xs'
                      : 'text-neutral-500 hover:text-neutral-900'
                  }`}
                >
                  {b === 'main' ? 'All Pipelines' : `${b} Pipeline`}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex items-center bg-white border border-neutral-200 px-3 py-1.5 rounded-xl shadow-2xs text-xs font-bold text-neutral-800">
              Production Pipeline
            </div>
          )}

          <div className="flex items-center bg-white border border-neutral-200 p-1 rounded-xl shadow-2xs">
            <button
              onClick={() => setViewType('kanban')}
              className={`p-1.5 rounded-lg transition ${
                viewType === 'kanban' ? 'bg-neutral-900 text-white shadow-xs' : 'text-neutral-500 hover:text-neutral-900'
              }`}
              title="Kanban Board"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewType('table')}
              className={`p-1.5 rounded-lg transition ${
                viewType === 'table' ? 'bg-neutral-900 text-white shadow-xs' : 'text-neutral-500 hover:text-neutral-900'
              }`}
              title="Table Grid"
            >
              <ListTodo className="w-4 h-4" />
            </button>
          </div>

          {/* Create Task Button */}
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition shadow-xs"
          >
            <Plus className="w-4 h-4" /> Add Task
          </button>
        </div>
      </div>

      {/* Advanced Filters */}
      <div className="bg-white border border-neutral-200/80 rounded-2xl p-4 flex flex-wrap items-center gap-4 text-xs font-medium shadow-xs">
        <div className="flex items-center gap-1">
          <Filter className="w-3.5 h-3.5 text-neutral-450" />
          <span className="text-neutral-500">Filter By:</span>
        </div>

        {/* Search Input */}
        <div className="relative w-48">
          <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-2" />
          <input
            type="text"
            placeholder="Search content..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 pr-3 py-1.5 w-full bg-neutral-50 border border-neutral-200 rounded-lg text-neutral-800 focus:outline-hidden text-[11px]"
          />
        </div>

        {/* Client */}
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

        {/* Priority Filter */}
        <select
          value={selectedPriorityFilter}
          onChange={(e) => setSelectedPriorityFilter(e.target.value)}
          className="bg-neutral-50 border border-neutral-200 rounded-lg px-2.5 py-1.5 text-neutral-800 focus:outline-hidden font-mono"
        >
          <option value="ALL">All Priorities</option>
          <option value="Low">Low</option>
          <option value="Medium">Medium</option>
          <option value="Urgent">Urgent</option>
          <option value="Overdue">Overdue</option>
        </select>

        {/* PIC Filter */}
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

        {/* Status Filter (Table View only) */}
        {viewType === 'table' && (
          <select
            value={selectedStatusFilter}
            onChange={(e) => setSelectedStatusFilter(e.target.value)}
            className="bg-neutral-50 border border-neutral-200 rounded-lg px-2.5 py-1.5 text-neutral-800 focus:outline-hidden"
          >
            <option value="ALL">All Stages</option>
            {columns.map((col) => (
              <option key={col} value={col}>
                {col}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Bulk Action Controls */}
      {selectedTaskIds.length > 0 && (
        <div className="bg-neutral-50 border border-neutral-200 rounded-2xl p-4 flex items-center justify-between text-xs font-semibold animate-fadeIn shadow-2xs">
          <span className="text-neutral-700 font-mono">
            {selectedTaskIds.length} tasks selected
          </span>
          <div className="flex items-center gap-4">
            {/* Bulk status move */}
            <div className="flex items-center gap-1.5">
              <select
                value={bulkStageTarget}
                onChange={(e) => setBulkStageTarget(e.target.value)}
                className="bg-white border border-neutral-200 rounded-lg px-2 py-1.5"
              >
                <option value="">Move Stage To...</option>
                {columns.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <button
                onClick={handleBulkMove}
                disabled={!bulkStageTarget}
                className="bg-neutral-900 text-white hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed px-3 py-1.5 rounded-lg transition"
              >
                Go
              </button>
            </div>

            {/* Bulk PIC assign */}
            <div className="flex items-center gap-1.5">
              <select
                value={bulkAssignTarget}
                onChange={(e) => setBulkAssignTarget(e.target.value)}
                className="bg-white border border-neutral-200 rounded-lg px-2 py-1.5"
              >
                <option value="">Assign PIC to...</option>
                {allUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
              <button
                onClick={handleBulkAssign}
                disabled={!bulkAssignTarget}
                className="bg-neutral-900 text-white hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed px-3 py-1.5 rounded-lg transition"
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
                  isDragOver ? 'bg-neutral-100 border-neutral-450 shadow-inner' : 'bg-neutral-50/50 border-neutral-200'
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
                      const uniqueUserNames = task.stages
                        ? Array.from(new Set((typeof task.stages === 'string' ? JSON.parse(task.stages) : task.stages).map((s: any) => s.userName)))
                        : [];

                      // Calculate Dynamic Priority (Requirement 3)
                      const dynamicPriority = calculatePriority(task.deadline, task.status, task.postingDate);
                      const priorityColorClass = getPriorityColorClass(dynamicPriority);

                      // Calculate checklist progress (Requirement 11)
                      const checklist = task.checklist ? (typeof task.checklist === 'string' ? JSON.parse(task.checklist) : task.checklist) : [];
                      const doneChecklist = checklist.filter((item: any) => item.done).length;
                      const totalChecklist = checklist.length;

                      let progressPercent = 0;
                      if (totalChecklist > 0) {
                        progressPercent = Math.round((doneChecklist / totalChecklist) * 100);
                      } else {
                        // calculate progress based on active workflow stages
                        if (task.category === 'Strategic') {
                          const idx = STRATEGIC_COLUMNS.indexOf(task.status);
                          progressPercent = idx >= 0 ? Math.round(((idx + 1) / STRATEGIC_COLUMNS.length) * 100) : 0;
                        } else {
                          const idx = PRODUCTION_COLUMNS.indexOf(task.status);
                          progressPercent = idx >= 0 ? Math.round(((idx + 1) / PRODUCTION_COLUMNS.length) * 100) : 0;
                        }
                      }

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
                          className={`bg-white border border-neutral-200/80 rounded-xl p-4 hover:border-neutral-400 hover:shadow-md transition cursor-pointer space-y-3 relative ${
                            isBeingDragged ? 'opacity-40 border-neutral-900 shadow-inner' : 'shadow-2xs'
                          }`}
                        >
                          {/* Client, score, and priority tag */}
                          <div className="flex justify-between items-center gap-2">
                            <span
                              className="text-[9px] font-bold px-2 py-0.5 rounded truncate"
                              style={{ backgroundColor: `${task.clientColor}15`, color: task.clientColor }}
                            >
                              {task.clientName}
                            </span>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className={`text-[9px] font-bold px-2 py-0.5 rounded border font-mono ${priorityColorClass}`}>
                                {dynamicPriority}
                              </span>
                              <span className="text-[9px] font-mono text-neutral-400 font-bold">{task.score} pts</span>
                            </div>
                          </div>

                          {/* Content Title */}
                          <h4 className="text-xs font-bold text-neutral-900 line-clamp-2 leading-tight">
                            {task.title}
                          </h4>

                          {/* Month Period Tag & Stage */}
                          <div className="flex items-center justify-between text-[10px] text-neutral-500 font-semibold pt-1">
                            <span className="bg-neutral-50 border border-neutral-200 px-1.5 py-0.5 rounded font-mono text-[9px]">
                              Period: {task.month} {task.year}
                            </span>
                            <span className="text-[9px] uppercase font-bold text-neutral-400">
                              Stage: {task.status}
                            </span>
                          </div>

                          {/* Target Posting Date & Deadline */}
                          <div className="grid grid-cols-2 gap-2 border-t border-neutral-50 pt-2 text-[10px] font-mono text-neutral-500">
                            <div>
                              <span className="text-[8px] text-neutral-400 font-bold block uppercase tracking-wider">Post Date</span>
                              <span className="text-neutral-700 font-bold">{task.postingDate ? task.postingDate.substring(0, 10) : 'N/A'}</span>
                            </div>
                            <div>
                              <span className="text-[8px] text-neutral-400 font-bold block uppercase tracking-wider">Deadline</span>
                              <span className="text-amber-800 font-bold">{task.deadline ? task.deadline.substring(0, 10) : 'N/A'}</span>
                            </div>
                          </div>

                          {/* PIC Assignee list */}
                          <div className="border-t border-neutral-50 pt-2 text-[10px] text-neutral-500">
                            <span className="font-semibold text-neutral-400">Assignee:</span> <strong className="text-neutral-700">{uniqueUserNames.join(', ') || 'Unassigned'}</strong>
                          </div>

                          {/* Progress bar */}
                          <div className="space-y-1 pt-1.5">
                            <div className="flex justify-between text-[9px] font-bold text-neutral-550">
                              <span>Progress</span>
                              <span>{progressPercent}%</span>
                            </div>
                            <div className="w-full bg-neutral-100 h-1.5 rounded-full overflow-hidden border border-neutral-200">
                              <div
                                className="bg-neutral-900 h-full rounded-full transition-all duration-300"
                                style={{ width: `${progressPercent}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {colTasks.length === 0 && (
                      <div className="text-center py-8 text-neutral-400 text-xs italic bg-neutral-50/20 border border-neutral-200 border-dashed rounded-xl">
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
                  <th className="px-4 py-3.5">Stage</th>
                  <th className="px-4 py-3.5">Reporting Period</th>
                  <th className="px-4 py-3.5 text-center">Priority</th>
                  <th className="px-4 py-3.5">Posting Date</th>
                  <th className="px-4 py-3.5">Deadline</th>
                  <th className="px-4 py-3.5 text-right">Points</th>
                  <th className="px-4 py-3.5 text-center">Edit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 text-neutral-700">
                {sortedTasks.map((t) => {
                  const isChecked = selectedTaskIds.includes(t.id);
                  const dynamicPriority = calculatePriority(t.deadline, t.status, t.postingDate);
                  const priorityColorClass = getPriorityColorClass(dynamicPriority);

                  return (
                    <tr key={t.id} className="hover:bg-neutral-50 transition">
                      <td className="px-4 py-3.5">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleSelectTask(t.id)}
                          className="rounded border-neutral-300 text-neutral-900 focus:ring-neutral-950"
                        />
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="font-bold text-neutral-900">{t.title}</span>
                        <span className="text-[10px] text-neutral-400 font-mono block mt-0.5">{t.category} workflow</span>
                      </td>
                      <td className="px-4 py-3.5 font-semibold">{t.clientName}</td>
                      <td className="px-4 py-3.5">
                        <span className="font-mono text-neutral-700 font-bold bg-neutral-100 border px-2 py-0.5 rounded-lg">
                          {t.status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 font-semibold text-neutral-600">{t.month} {t.year}</td>
                      <td className="px-4 py-3.5 text-center">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border font-mono ${priorityColorClass}`}>
                          {dynamicPriority}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 font-mono font-semibold">{t.postingDate ? t.postingDate.substring(0, 10) : 'N/A'}</td>
                      <td className="px-4 py-3.5 font-mono text-amber-800 font-bold">{t.deadline ? t.deadline.substring(0, 10) : 'N/A'}</td>
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
          <div className="bg-white border border-neutral-200 shadow-xl rounded-2xl w-full max-w-3xl overflow-hidden animate-scaleUp relative">
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
                  <label className="block text-neutral-700 font-semibold">Task Category (Workflow)</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as any)}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2 text-neutral-900 focus:outline-hidden"
                  >
                    <option value="Strategic">Strategic</option>
                    <option value="Production">Production</option>
                    <option value="Editing">Editing</option>
                    <option value="Scheduling">Scheduling</option>
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

                {/* Period selection */}
                <div className="space-y-1">
                  <label className="block text-neutral-700 font-semibold">Month Period</label>
                  <select
                    value={newMonth}
                    onChange={(e) => setNewMonth(e.target.value)}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2 text-neutral-900 focus:outline-hidden font-bold"
                  >
                    {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-neutral-700 font-semibold">Year Period</label>
                  <input
                    type="number"
                    value={newYear}
                    onChange={(e) => setNewYear(Number(e.target.value))}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2 text-neutral-900 focus:outline-hidden font-mono font-bold"
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

                        {/* Delete Stage */}
                        <button
                          type="button"
                          onClick={() => handleRemoveStage(stage.id, false)}
                          className="p-1 hover:bg-red-50 text-red-500 rounded-lg transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                  {newStages.length === 0 && (
                    <p className="text-center text-neutral-400 py-4 italic">No work stages allocated. Click "+ Add Stage" above.</p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  disabled={isCreatingTask}
                  className="px-4 py-2 bg-neutral-100 text-neutral-700 font-semibold rounded-lg hover:bg-neutral-200 transition disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingTask}
                  className="px-5 py-2 bg-neutral-900 text-white font-semibold rounded-lg hover:bg-neutral-800 transition flex items-center gap-2 disabled:opacity-50"
                >
                  {isCreatingTask ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Task'
                  )}
                </button>
              </div>
            </form>

            {/* Success Overlay Popup */}
            {createSuccess && (
              <div className="absolute inset-0 bg-white/95 flex flex-col items-center justify-center space-y-3 z-[60] rounded-2xl animate-fadeIn">
                <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center border border-emerald-100 shadow-xs">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-sm font-bold text-neutral-900">Task Created Successfully!</h3>
                <p className="text-[10px] text-neutral-500">The new content has been added to the workspace.</p>
              </div>
            )}
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

                  <div className="space-y-1">
                    <label className="block text-neutral-700 font-semibold">Month Period</label>
                    <select
                      value={editMonth}
                      onChange={(e) => setEditMonth(e.target.value)}
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2 text-neutral-900 focus:outline-hidden font-bold"
                    >
                      {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-neutral-700 font-semibold">Year Period</label>
                    <input
                      type="number"
                      value={editYear}
                      onChange={(e) => setEditYear(Number(e.target.value))}
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2 text-neutral-900 focus:outline-hidden font-mono font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-neutral-700 font-semibold">Drive link</label>
                    <input
                      type="url"
                      value={editDriveLink}
                      onChange={(e) => setEditDriveLink(e.target.value)}
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2 text-neutral-900 focus:outline-hidden"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-neutral-700 font-semibold">Preview link</label>
                    <input
                      type="url"
                      value={editPreviewLink}
                      onChange={(e) => setEditPreviewLink(e.target.value)}
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2 text-neutral-900 focus:outline-hidden"
                    />
                  </div>
                </div>

                {/* Edit Stages List */}
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
                      className="text-neutral-900 hover:text-neutral-750 font-semibold text-[10px] flex items-center gap-0.5"
                    >
                      + Add Stage
                    </button>
                  </div>

                  <div className="space-y-3 max-h-[180px] overflow-y-auto pr-1">
                    {editStages.map((stage) => {
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
                          {/* Role */}
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

                          {/* User */}
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

                          {/* TaskType */}
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

                          {/* Format */}
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

                          {/* Qty */}
                          <div className="w-16">
                            <input
                              type="number"
                              min="1"
                              value={stage.qty}
                              onChange={(e) => handleStageFieldChange(stage.id, 'qty', Number(e.target.value), true)}
                              className="w-full bg-white border border-neutral-200 rounded-lg px-2 py-1 text-center focus:outline-hidden font-mono font-bold"
                            />
                          </div>

                          {/* Delete */}
                          <button
                            type="button"
                            onClick={() => handleRemoveStage(stage.id, true)}
                            className="p-1 hover:bg-red-50 text-red-500 rounded-lg transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })}
                    {editStages.length === 0 && (
                      <p className="text-center text-neutral-400 py-4 italic">No work stages allocated. Click "+ Add Stage" above.</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-neutral-100">
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm('Are you sure you want to delete this task?')) {
                        deleteTask(selectedTaskDetail.id);
                        setSelectedTaskDetail(null);
                      }
                    }}
                    className="text-red-650 hover:underline font-bold"
                  >
                    Delete Task
                  </button>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setIsEditingDetail(false)}
                      className="px-4 py-2 bg-neutral-100 text-neutral-700 font-semibold rounded-lg hover:bg-neutral-200 transition"
                    >
                      Back to details
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-neutral-900 text-white font-semibold rounded-lg hover:bg-neutral-850 transition"
                    >
                      Save Specifications
                    </button>
                  </div>
                </div>
              </form>
            ) : (
              /* DETAIL MODE (READ ONLY) */
              <div className="p-6 space-y-6 overflow-y-auto max-h-[90vh] text-xs">
                {/* Meta details */}
                <div className="flex flex-col sm:flex-row justify-between gap-4">
                  <div>
                    <span
                      className="text-[10px] font-bold px-2.5 py-0.5 rounded border"
                      style={{ backgroundColor: `${selectedTaskDetail.clientColor}15`, color: selectedTaskDetail.clientColor }}
                    >
                      {selectedTaskDetail.clientName}
                    </span>
                    <h3 className="text-base font-bold text-neutral-900 mt-2">{selectedTaskDetail.title}</h3>
                  </div>

                  <div className="text-right">
                    <span className="text-neutral-400 block font-semibold text-[10px]">Points Value</span>
                    <span className="text-lg font-mono font-bold text-neutral-900">{selectedTaskDetail.score}</span>
                  </div>
                </div>

                {/* Grid attributes */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-2xl bg-neutral-50 border border-neutral-200">
                  <div>
                    <span className="text-neutral-400 block mb-0.5 text-[10px] font-semibold uppercase tracking-wider">Deadline</span>
                    <strong className="text-neutral-800 font-mono text-xs">{selectedTaskDetail.deadline}</strong>
                  </div>
                  <div>
                    <span className="text-neutral-400 block mb-0.5 text-[10px] font-semibold uppercase tracking-wider">Posting Date</span>
                    <strong className="text-neutral-800 font-mono text-xs">{selectedTaskDetail.postingDate || '-'}</strong>
                  </div>
                  <div>
                    <span className="text-neutral-400 block mb-0.5 text-[10px] font-semibold uppercase tracking-wider">Priority (Auto)</span>
                    <strong className={`font-mono text-xs capitalize ${calculatePriority(selectedTaskDetail.deadline, selectedTaskDetail.status, selectedTaskDetail.postingDate) === 'Overdue' ? 'text-red-650 font-bold' : 'text-neutral-800'}`}>
                      {calculatePriority(selectedTaskDetail.deadline, selectedTaskDetail.status, selectedTaskDetail.postingDate)}
                    </strong>
                  </div>
                  <div>
                    <span className="text-neutral-400 block mb-0.5 text-[10px] font-semibold uppercase tracking-wider">Current Stage</span>
                    <strong className="text-neutral-850 uppercase font-mono text-xs">{selectedTaskDetail.status}</strong>
                  </div>
                </div>

                {/* Content Handover Audit metadata log (Requirement 6) */}
                {selectedTaskDetail.handoverUserId && (
                  <div className="p-3 bg-emerald-50 border border-emerald-150 rounded-xl text-[10px] text-emerald-800">
                    <span className="font-bold">Production Handover Audit:</span> Handed over from Strategy to Production by <strong className="text-emerald-950">{allUsers.find(u => u.id === selectedTaskDetail.handoverUserId)?.name || 'Unknown User'}</strong> on {new Date(selectedTaskDetail.handoverTime || '').toLocaleString('id-ID')}.
                  </div>
                )}

                {/* Work allocations list */}
                <div className="space-y-2.5">
                  <h4 className="font-bold text-neutral-850">Assigned Stage Allocations</h4>
                  <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                    {selectedTaskDetail.stages ? (
                      (typeof selectedTaskDetail.stages === 'string' ? JSON.parse(selectedTaskDetail.stages) : selectedTaskDetail.stages).map((s: any) => (
                        <div key={s.id} className="p-3 bg-neutral-50 border border-neutral-200 rounded-xl flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-neutral-900 text-white font-bold flex items-center justify-center text-[10px]">
                              {s.userName.charAt(0)}
                            </div>
                            <div>
                              <p className="font-bold text-neutral-900">{s.userName}</p>
                              <p className="text-[10px] text-neutral-500">{s.role} • <span className="text-neutral-600 font-mono">{s.taskType} ({s.format})</span></p>
                            </div>
                          </div>
                          <span className="font-mono font-bold text-neutral-850 bg-white border border-neutral-200 px-2.5 py-1 rounded-lg">
                            {s.score} pts
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-neutral-400 italic">No stage owners allocated.</p>
                    )}
                  </div>
                </div>

                {/* Workflow Audit Timeline logs (Requirement 7) */}
                <div className="space-y-2 pt-2 border-t border-neutral-100">
                  <h4 className="font-bold text-neutral-850 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-neutral-500" /> Content Workflow Timeline
                  </h4>
                  <div className="relative pl-4 border-l border-neutral-200 ml-2 space-y-3 py-1">
                    {(selectedTaskDetail.workflowTimeline ? JSON.parse(selectedTaskDetail.workflowTimeline) : []).map((item: any, idx: number) => {
                      const userObj = allUsers.find(u => u.id === item.userId);
                      return (
                        <div key={idx} className="relative text-[11px]">
                          <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-neutral-900 border-2 border-white" />
                          <p className="font-bold text-neutral-800">
                            Stage Activated: <span className="uppercase">{item.status}</span>
                          </p>
                          <p className="text-[10px] text-neutral-450 mt-0.5">
                            By {userObj?.name || 'System'} • {new Date(item.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} ({new Date(item.timestamp).toLocaleDateString('id-ID')})
                          </p>
                        </div>
                      );
                    })}
                    {(!selectedTaskDetail.workflowTimeline || JSON.parse(selectedTaskDetail.workflowTimeline).length === 0) && (
                      <p className="text-neutral-400 italic">No timeline entries logged.</p>
                    )}
                  </div>
                </div>

                {/* Recent Content Activities Timeline logs (Requirement 13) */}
                <div className="space-y-2 pt-2 border-t border-neutral-100">
                  <h4 className="font-bold text-neutral-850 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-neutral-500" /> Recent Content Activities
                  </h4>
                  <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                    {activities.filter(a => a.entityId === selectedTaskDetail.id).map((act) => (
                      <div key={act.id} className="p-2 bg-neutral-50 border border-neutral-200 rounded-lg text-[10px] flex justify-between items-center">
                        <div>
                          <span className="font-bold text-neutral-850">{act.userName || 'System'}</span> {act.details}
                        </div>
                        <span className="text-[9px] text-neutral-400 font-mono">
                          {new Date(act.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    ))}
                    {activities.filter(a => a.entityId === selectedTaskDetail.id).length === 0 && (
                      <p className="text-neutral-400 italic">No activity logs for this content.</p>
                    )}
                  </div>
                </div>

                {/* Links */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <span className="text-neutral-550 font-semibold block">Asset Drive Link</span>
                    {selectedTaskDetail.driveLink ? (
                      <a
                        href={selectedTaskDetail.driveLink}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between p-3 bg-blue-50 border border-blue-100 rounded-xl text-blue-700 font-semibold hover:bg-blue-100 transition"
                      >
                        <span className="flex items-center gap-2">
                          <FolderOpen className="w-4 h-4" /> Open Drive Assets
                        </span>
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    ) : (
                      <div className="p-3 bg-neutral-50 border border-neutral-200 border-dashed rounded-xl text-neutral-400 text-center">
                        No Drive Link Added
                      </div>
                    )}
                  </div>

                  <div className="space-y-1">
                    <span className="text-neutral-550 font-semibold block">Preview Link</span>
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

                {/* Footer Controls */}
                <div className="pt-4 flex items-center justify-end gap-3 border-t border-neutral-100">
                  <button
                    onClick={() => {
                      setSelectedTaskDetail(null);
                    }}
                    className="bg-neutral-100 hover:bg-neutral-200 text-neutral-850 font-semibold px-4 py-2 rounded-lg transition"
                  >
                    Close
                  </button>

                  {/* Send to Production Handover Action Button (Requirement 1, 6, 16) */}
                  {selectedTaskDetail.category === 'Strategic' && selectedTaskDetail.status === 'Ready for Production' && (currentUser?.roles.includes('Strategist') || currentUser?.roles.includes('Admin') || currentUser?.roles.includes('Owner')) && (
                    <button
                      onClick={() => handleSendToProduction(selectedTaskDetail)}
                      className="bg-emerald-600 hover:bg-emerald-750 text-white font-semibold px-4 py-2 rounded-lg transition flex items-center gap-1"
                    >
                      <Play className="w-3.5 h-3.5" /> Send to Production
                    </button>
                  )}

                  {(selectedTaskDetail.status === 'Posted' || selectedTaskDetail.status === 'Completed' || currentUser?.roles.includes('Admin') || currentUser?.roles.includes('Owner')) && (
                    <button
                      onClick={() => {
                        updateTask(selectedTaskDetail.id, { isArchived: true } as any);
                        showToast('Task moved to Archive!', 'success');
                        setSelectedTaskDetail(null);
                      }}
                      className="bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-semibold px-4 py-2 rounded-lg transition"
                    >
                      Archive Task
                    </button>
                  )}

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
