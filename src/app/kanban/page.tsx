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
  Play,
  CheckCircle2
} from 'lucide-react';
import { calculateTaskScore, calculateCOGS, calculateAutoDeadline, calculatePriority, getPriorityColorClass } from '@/lib/score-calculator';
import { TaskItem, ClientItem, UserPersona } from '@/lib/types';
import { normalizeRoles, hasRole, hasAnyRole, isUserMatch, resolvePrimaryEmployee } from '@/lib/rbac';

// Updated column configurations (Requirement 12)
const STRATEGIC_COLUMNS: TaskItem['status'][] = ['Brief', 'Content Proposal', 'Editorial Calendar', 'Script & Shotlist', 'Ready for Production', 'Production / Shooting' as any, 'Completed'];
const PRODUCTION_COLUMNS: TaskItem['status'][] = ['Editing', 'Revision', 'Waiting for Approval', 'Approval', 'Ready to Post', 'Scheduling', 'Posted'];
const MAIN_COLUMNS: TaskItem['status'][] = [
  'Brief', 'Content Proposal', 'Editorial Calendar', 'Script & Shotlist', 'Ready for Production', 'Production / Shooting' as any, 'Completed',
  'Editing', 'Revision', 'Waiting for Approval', 'Approval', 'Ready to Post', 'Scheduling', 'Posted'
];
// Columns PA is allowed to see in the Strategic Pipeline
const PA_STRATEGIC_COLUMNS: string[] = ['Production / Shooting', 'Completed'];
// Helper: statuses grouped under the merged Production/Shooting column
const PRODUCTION_SHOOTING_STATUSES = ['Production', 'Shooting'];

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

function formatUrl(url: string): string {
  if (!url) return '';
  const trimmed = url.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

export default function KanbanPage() {
  const { tasks, clients, worklogs, addTask, updateTask, updateTaskStatus, deleteTask, addWorklog, addNotification, activities, addActivity } = useData();
  const { currentUser, allUsers } = useUser();
  const { currentWorkspace } = useWorkspace();
  const { showToast } = useToast();

  const canAccessTaskDetails = (task: TaskItem) => {
    if (!currentUser) return false;
    const isExecutive = hasAnyRole(currentUser, ['Admin', 'Owner', 'Strategist']);
    if (isExecutive) return true;

    const isSchedulerRole = hasRole(currentUser, 'Scheduler');
    const stages = task.stages ? (typeof task.stages === 'string' ? JSON.parse(task.stages) : task.stages) : [];
    const isSchedulingStatus = ['Scheduling', 'Ready to Post', 'Posted'].includes(task.status);
    const hasSchedulingStage = Array.isArray(stages) && stages.some((s: any) => s.role === 'Scheduler' || s.role === 'Scheduling' || (s.taskType && String(s.taskType).toLowerCase().includes('scheduling')));
    if (isSchedulerRole && (isSchedulingStatus || hasSchedulingStage)) return true;

    const assignedIds: string[] = task.assignedUserIds ? (typeof task.assignedUserIds === 'string' ? JSON.parse(task.assignedUserIds) : task.assignedUserIds) : [];
    const isAssigned = assignedIds.some((id: string) => isUserMatch(id, currentUser));

    const isStageAssignee = Array.isArray(stages) && stages.some((s: any) => isUserMatch(s.userId, currentUser) || isUserMatch(s.userName, currentUser));

    return isAssigned || isStageAssignee;
  };

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
  const isSubmittingRef = React.useRef(false);
  const [createSuccess, setCreateSuccess] = useState(false);
  const [selectedTaskDetail, setSelectedTaskDetail] = useState<TaskItem | null>(null);
  const [isEditingDetail, setIsEditingDetail] = useState(false);

  // Handover Modal State
  const [isHandoverModalOpen, setIsHandoverModalOpen] = useState(false);
  const [handoverTask, setHandoverTask] = useState<TaskItem | null>(null);
  const [handoverPaUserId, setHandoverPaUserId] = useState('');
  const [handoverPaFormat, setHandoverPaFormat] = useState('4 Jam');
  const [handoverEditorUserId, setHandoverEditorUserId] = useState('');
  const [handoverEditorFormat, setHandoverEditorFormat] = useState('Reels');
  const [handoverEditorQty, setHandoverEditorQty] = useState(1);

  // Drag and Drop
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<TaskItem['status'] | null>(null);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const currentDate = new Date();
  const currentMonthName = monthNames[currentDate.getMonth()];
  const currentYear = currentDate.getFullYear();

  // Form State - Task Creation
  const [newTitle, setNewTitle] = useState('');
  const [newClientId, setNewClientId] = useState('');
  const [newCategory, setNewCategory] = useState<'Strategic' | 'Production' | 'Editing' | 'Scheduling'>('Strategic');
  const [newPostingDate, setNewPostingDate] = useState(new Date().toISOString().split('T')[0]);
  const [newDeadline, setNewDeadline] = useState(calculateAutoDeadline(new Date().toISOString().split('T')[0], -3));
  const [newMonth, setNewMonth] = useState(currentMonthName);
  const [newYear, setNewYear] = useState(currentYear);
  const [newDriveLink, setNewDriveLink] = useState('');
  const [newStages, setNewStages] = useState<TaskStage[]>([]);

  // Form State - Edit Task
  const [editTitle, setEditTitle] = useState('');
  const [editClientId, setEditClientId] = useState('');
  const [editPostingDate, setEditPostingDate] = useState('');
  const [editDeadline, setEditDeadline] = useState('');
  const [editMonth, setEditMonth] = useState(currentMonthName);
  const [editYear, setEditYear] = useState(currentYear);
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
          // PA, Editor, Scheduler all default to production board
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

  // Workspace filtering — task must match currentWorkspace or be MotoDW
  const workspaceTasks = tasks.filter((t) => {
    if (t.workspaceId === currentWorkspace.id) return true;
    const isMotoDW = (t.clientName && t.clientName.toLowerCase().includes('motodw')) || (t.clientId && t.clientId.toLowerCase().includes('motodw'));
    if (isMotoDW) return true;
    if (!t.workspaceId) {
      const taskClient = clients.find((c) => c.id === t.clientId);
      return taskClient ? (taskClient.workspaceId === currentWorkspace.id || taskClient.name?.toLowerCase().includes('motodw')) : false;
    }
    return false;
  });

  // Board columns based on active board state
  const columns = activeBoard === 'strategic' ? STRATEGIC_COLUMNS : activeBoard === 'production' ? PRODUCTION_COLUMNS : MAIN_COLUMNS;

  // Filter columns based on user role (Requirement 18)
  const getVisibleColumns = () => {
    if (!currentUser) return [];
    const roles = currentUser.roles;
    const isManager = roles.includes('Admin') || roles.includes('Owner') || roles.includes('Strategist');
    if (isManager) {
      return columns;
    }

    // PA on strategic board: ONLY show Production/Shooting merged column + Completed
    const isPA = roles.includes('Production Assistant') && !isManager;
    if (isPA && activeBoard === 'strategic') {
      return columns.filter((col) => PA_STRATEGIC_COLUMNS.includes(col as any));
    }
    // PA on production board: sees all production columns (full visibility)
    if (isPA && activeBoard === 'production') {
      return columns; // all PRODUCTION_COLUMNS visible
    }

    const allowed = new Set<string>();

    if (roles.includes('Production Assistant')) {
      allowed.add('Production');
      allowed.add('Shooting');
    }
    if (roles.includes('Editor')) {
      allowed.add('Editing');
      allowed.add('Revision');
    }
    if (roles.includes('Scheduler')) {
      allowed.add('Waiting for Approval');
      allowed.add('Approval');
      allowed.add('Ready to Post');
      allowed.add('Scheduling');
      allowed.add('Posted');
    }

    allowed.add('Waiting for Approval');

    // Always include status columns of tasks explicitly assigned to currentUser
    workspaceTasks.forEach((t) => {
      if (t.isArchived) return;
      const assignedIds = t.assignedUserIds
        ? (typeof t.assignedUserIds === 'string' ? JSON.parse(t.assignedUserIds) : t.assignedUserIds)
        : [];
      const isAssigned = currentUser && assignedIds.some((id: string) => isUserMatch(id, currentUser));
      const logStages = t.stages ? (typeof t.stages === 'string' ? JSON.parse(t.stages) : t.stages) : [];
      const isStageAssignee = currentUser && Array.isArray(logStages) && logStages.some(
        (s: any) => isUserMatch(s.userId, currentUser) || isUserMatch(s.userName, currentUser)
      );
      if (isAssigned || isStageAssignee) {
        allowed.add(t.status);
      }
    });

    return columns.filter((col) => allowed.has(col));
  };

  const visibleColumns = getVisibleColumns();

  // Filtered tasks for presentation
  const filteredTasks = workspaceTasks.filter((t) => {
    // Exclude archived tasks from active board (Requirement 4)
    if (t.isArchived) return false;

    // Check if task is explicitly assigned to currentUser
    const assignedIds = t.assignedUserIds
      ? (typeof t.assignedUserIds === 'string' ? JSON.parse(t.assignedUserIds) : t.assignedUserIds)
      : [];
    const isAssignedToCurrentUser = currentUser && assignedIds.some((id: string) => isUserMatch(id, currentUser));
    const logStages = t.stages ? (typeof t.stages === 'string' ? JSON.parse(t.stages) : t.stages) : [];
    const isStageAssigneeToCurrentUser = currentUser && Array.isArray(logStages) && logStages.some(
      (s: any) => isUserMatch(s.userId, currentUser) || isUserMatch(s.userName, currentUser)
    );
    const isExplicitlyAssigned = isAssignedToCurrentUser || isStageAssigneeToCurrentUser;

    // Filter by Active Board type (Requirement 5: Correct Workflow Detection based on Task Category)
    // Assigned tasks bypass board category filters so team members never miss tasks assigned to them
    if (!isExplicitlyAssigned) {
      if (activeBoard === 'strategic') {
        const isStrategicTask = t.category === 'Strategic';
        const isProductionStatusTask = t.status === 'Production' || t.status === 'Shooting';
        if (!isStrategicTask && !isProductionStatusTask) return false;
      }
      if (activeBoard === 'production') {
        const isProductionStatus = PRODUCTION_COLUMNS.includes(t.status as any);
        const isProductionCategory = t.category !== 'Strategic';
        if (!isProductionStatus && !isProductionCategory) return false;
      }
    }

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
      const assignedIds = typeof t.assignedUserIds === 'string' ? JSON.parse(t.assignedUserIds) : (t.assignedUserIds || []);
      const userObj = allUsers.find((u) => u.id === selectedPICFilter);
      const isAssigned = assignedIds.includes(selectedPICFilter) || (userObj && assignedIds.includes(userObj.name));
      const logStages = t.stages ? (typeof t.stages === 'string' ? JSON.parse(t.stages) : t.stages) : [];
      const isStageAssignee = logStages.some((s: any) => s.userId === selectedPICFilter || (userObj && s.userName === userObj.name));
      if (!isAssigned && !isStageAssignee) return false;
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
    const isManager = currentUser.roles.includes('Admin') || currentUser.roles.includes('Owner') || currentUser.roles.includes('Strategist');
    if (isAdmin || isManager) return true;

    let matchesCategory = false;
    const catStr = t.category as string;
    if (currentUser.roles.includes('Strategist') && (catStr === 'Strategic' || catStr === 'Strategist')) matchesCategory = true;
    if (currentUser.roles.includes('Editor') && (catStr === 'Editor' || catStr === 'Editing')) matchesCategory = true;
    if (currentUser.roles.includes('Scheduler') && (catStr === 'Scheduler' || catStr === 'Scheduling')) matchesCategory = true;
    if (currentUser.roles.includes('Production Assistant') && (catStr === 'Production' || catStr === 'Assistant')) matchesCategory = true;

    const isCreator = (t as any).createdBy === currentUser.id || (t as any).createdBy === currentUser.name;

    // Allow any Scheduler role to view Scheduling-stage tasks (workspace-wide visibility for scheduling)
    const isSchedulerRole = currentUser.roles.includes('Scheduler');
    const isSchedulingStatus = t.status === 'Scheduling' || t.status === 'Ready to Post';
    const hasSchedulingStage = Array.isArray(logStages) && logStages.some((s: any) => (s.role === 'Scheduler' || (s.taskType && String(s.taskType).toLowerCase().includes('scheduling'))));
    if (isSchedulerRole && (isSchedulingStatus || hasSchedulingStage)) return true;

    return isAssignedToCurrentUser || isStageAssigneeToCurrentUser || matchesCategory || isCreator;
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
    if (type === 'Production Assistant' || type === 'PA') return ['1 Jam', '4 Jam', '8 Jam'];
    if (type === 'Content Plan' || type === 'Production Lead') return ['4 Jam', '8 Jam'];
    if (type === 'Editing Plan') return ['Per Item'];
    if (type === 'Supervisi') return ['Per Check'];
    if (type === 'Presentasi' || type === 'Meeting Brief' || type === 'Content Proposal') return ['Per Session'];
    return [];
  };

  // Add work stage to task form helper
  const handleAddStage = (isEdit: boolean) => {
    const initialFormat = (isEdit && selectedTaskDetail?.format) ? selectedTaskDetail.format : 'Reels';
    const defaultStage: TaskStage = {
      id: `stg-${Date.now()}-${Math.random()}`,
      role: 'Editor',
      userId: allUsers[0]?.id || '',
      userName: allUsers[0]?.name || '',
      taskType: 'Editing',
      format: initialFormat,
      qty: 1,
      score: calculateTaskScore('Editor', 'Editing', initialFormat, 1),
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
        const matchingUser = allUsers.find((u) => hasRole(u, value as any));
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
        else if (value === 'Presentasi' || value === 'Meeting Brief' || value === 'Content Proposal') newStage.format = 'Per Session';
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
    if (!newTitle.trim() || isCreatingTask || isSubmittingRef.current) return;
    isSubmittingRef.current = true;

    // Permissions check (Requirement 7)
    const isExecutive = currentUser.roles.includes('Admin') || currentUser.roles.includes('Owner');
    if (!isExecutive) {
      if (newCategory === 'Strategic' && !currentUser.roles.includes('Strategist')) {
        showToast('Unauthorized: Only Strategists can create Strategic tasks', 'warning');
        isSubmittingRef.current = false;
        return;
      }
      if (newCategory === 'Production' && currentUser.roles.includes('Scheduler')) {
        showToast('Unauthorized: Schedulers cannot create Production tasks', 'warning');
        isSubmittingRef.current = false;
        return;
      }
    }

    setIsCreatingTask(true);
    try {
      const targetClient = clients.find((c) => c.id === newClientId) || clients[0];
      const totalScore = getStagesTotalScore(newStages);
      const assignedIds = Array.from(new Set(newStages.map((s) => s.userId)));
      const startingStatus = getFirstStatus(newCategory);

      const editorOrContentStage = newStages.find((s) => s.role === 'Editor' || s.taskType === 'Editing' || ['Single Foto', 'Grafis', 'Story Video', 'Paket Static', 'Carousel', 'Reels'].includes(s.format)) || newStages[0];
      const taskFormat = editorOrContentStage ? editorOrContentStage.format : 'Reels';
      const taskType = editorOrContentStage ? editorOrContentStage.taskType : 'Editing';

      const formattedDriveLink = newDriveLink ? formatUrl(newDriveLink) : '';
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
        driveLink: formattedDriveLink,
        stages: newStages,
        category: newCategory,
        format: taskFormat,
        taskType: taskType,
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
      isSubmittingRef.current = false;
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

    const isAnggiOrGigie = currentUser?.id === 'u-anggi' || currentUser?.id === 'u-gigie' || currentUser?.name?.toLowerCase() === 'anggi' || currentUser?.name?.toLowerCase() === 'gigie';
    const isProductionTask = selectedTaskDetail.category !== 'Strategic';
    if (isProductionTask && isAnggiOrGigie) {
      showToast('Unauthorized: Anggi and Gigie can only view Production tasks and cannot modify them.', 'warning');
      return;
    }

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

    const formattedDrive = editDriveLink ? formatUrl(editDriveLink) : '';
    const formattedPreview = editPreviewLink ? formatUrl(editPreviewLink) : '';
    const editorOrContentStage = editStages.find((s) => s.role === 'Editor' || s.taskType === 'Editing' || ['Single Foto', 'Grafis', 'Story Video', 'Paket Static', 'Carousel', 'Reels'].includes(s.format)) || editStages[0];
    const primaryFormat = editorOrContentStage ? editorOrContentStage.format : selectedTaskDetail.format;
    const primaryTaskType = editorOrContentStage ? editorOrContentStage.taskType : selectedTaskDetail.taskType;
    const primaryQty = editorOrContentStage ? (editorOrContentStage.qty || 1) : (selectedTaskDetail.qty || 1);
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
      driveLink: formattedDrive,
      previewLink: formattedPreview,
      stages: editStages,
      format: primaryFormat,
      taskType: primaryTaskType,
      qty: primaryQty,
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

  // Open Handover to Production Modal helper
  const openHandoverModal = (task: TaskItem) => {
    setHandoverTask(task);
    const paUser = allUsers.find((u) => hasRole(u, 'Production Assistant') || u.name.toLowerCase().includes('jabin')) || allUsers[0];
    const editorUser = allUsers.find((u) => hasRole(u, 'Editor') || u.name.toLowerCase().includes('dinda')) || allUsers[0];
    setHandoverPaUserId(paUser?.id || '');
    setHandoverPaFormat('4 Jam');
    setHandoverEditorUserId(editorUser?.id || '');
    const initialFormat = task.format && ['Single Foto', 'Grafis', 'Story Video', 'Paket Static', 'Carousel', 'Reels'].includes(task.format) ? task.format : 'Reels';
    setHandoverEditorFormat(initialFormat);
    setHandoverEditorQty(task.qty || 1);
    setIsHandoverModalOpen(true);
  };

  // Unified Single Lifecycle Handover Form Submit
  const handleConfirmSendToProduction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!handoverTask) return;

    const paUser = allUsers.find((u) => u.id === handoverPaUserId) || allUsers[0];
    const editorUser = allUsers.find((u) => u.id === handoverEditorUserId) || allUsers[0];

    const paScore = calculateTaskScore('Assistant', 'Production Assistant', handoverPaFormat, 1);
    const editorScore = calculateTaskScore('Editor', 'Editing', handoverEditorFormat, handoverEditorQty);
    const totalHandoverScore = paScore + editorScore;

    const prodStages = [
      {
        id: `stg-${Date.now()}`,
        role: 'Production Assistant' as const,
        userId: paUser?.id || '',
        userName: paUser?.name || 'Unknown PA',
        taskType: 'Production Assistant',
        format: handoverPaFormat,
        qty: 1,
        score: paScore,
      },
      {
        id: `stg-${Date.now()}-2`,
        role: 'Editor' as const,
        userId: editorUser?.id || '',
        userName: editorUser?.name || 'Unknown Editor',
        taskType: 'Editing',
        format: handoverEditorFormat,
        qty: Number(handoverEditorQty) || 1,
        score: editorScore,
      }
    ];

    const timeline = handoverTask.workflowTimeline ? JSON.parse(handoverTask.workflowTimeline) : [];
    timeline.push({
      status: 'Production',
      timestamp: new Date().toISOString(),
      userId: currentUser?.id || 'u-system',
    });

    const assignedIds = Array.from(new Set([paUser?.id, editorUser?.id].filter(Boolean)));

    await updateTask(handoverTask.id, {
      category: 'Production',
      status: 'Production',
      taskType: 'Editing',
      format: handoverEditorFormat,
      qty: Number(handoverEditorQty) || 1,
      assignedUserIds: assignedIds,
      score: totalHandoverScore,
      cogs: calculateCOGS(totalHandoverScore),
      stages: prodStages,
      workflowTimeline: JSON.stringify(timeline),
    } as any);

    addActivity(currentUser?.id || 'u-system', 'TASK', handoverTask.id, 'MOVED', `Handed over content "${handoverTask.title}" to Production (${editorUser?.name}, ${handoverEditorFormat} x ${handoverEditorQty})`);

    const productionTeam = allUsers.filter(u => {
      const roles = typeof u.roles === 'string' ? JSON.parse(u.roles) : u.roles;
      return roles.some((r: any) => ['Production Assistant', 'Editor', 'Scheduler'].includes(r));
    });

    for (const member of productionTeam) {
      await addNotification({
        userId: member.id,
        type: 'ASSIGNMENT',
        title: 'New Production Handover',
        message: `Content "${handoverTask.title}" has been handed over to Production.`,
        link: '/kanban',
      });
    }

    showToast(`Content "${handoverTask.title}" handed over to Production successfully!`, 'success');
    setIsHandoverModalOpen(false);
    setHandoverTask(null);
    setSelectedTaskDetail(null);
  };

  const handleCompleteInStrategic = async (task: TaskItem) => {
    const rawTimeline = task.workflowTimeline || '[]';
    let timeline: any[] = [];
    try {
      timeline = JSON.parse(rawTimeline);
    } catch {
      timeline = [];
    }
    timeline.push({
      status: 'Completed',
      timestamp: new Date().toISOString(),
      userId: currentUser?.id || 'u-system',
    });

    await updateTask(task.id, {
      status: 'Completed',
      category: 'Strategic',
      workflowTimeline: JSON.stringify(timeline),
    } as any);

    addActivity(
      currentUser?.id || 'u-system',
      'TASK',
      task.id,
      'MOVED',
      `Completed content "${task.title}" directly in Strategic board without sending to Production`
    );

    showToast(`Task "${task.title}" completed directly in Strategic board!`, 'success');
  };

  // Task Status updates (via drag & drop)
  const handleUpdateStatusWithWorklog = (taskId: string, newStatus: TaskItem['status']) => {
    const isAnggiOrGigie = currentUser?.id === 'u-anggi' || currentUser?.id === 'u-gigie' || currentUser?.name?.toLowerCase() === 'anggi' || currentUser?.name?.toLowerCase() === 'gigie';
    const isProductionCol = PRODUCTION_COLUMNS.includes(newStatus);
    if (isProductionCol && isAnggiOrGigie) {
      showToast('Unauthorized: Anggi and Gigie can only view the Production Kanban board and cannot modify it.', 'warning');
      return;
    }

    updateTaskStatus(taskId, newStatus);

    const taskObj = tasks.find((t) => t.id === taskId);
    if (taskObj && newStatus === 'Posted') {
      triggerAutomatedWorklog({ ...taskObj, status: newStatus });
    }
  };

  // Worklog automation trigger helper (Upserts stage logs under a single Worklog)
  const triggerAutomatedWorklog = (task: TaskItem) => {
    const primaryAssignedUser = resolvePrimaryEmployee(task.stages, task.assignedUserIds, allUsers, currentUser);
    addWorklog({
      clientId: task.clientId,
      clientName: task.clientName,
      contentTitle: task.title,
      userId: primaryAssignedUser?.id,
      userName: primaryAssignedUser?.name,
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

    // 2. Board-level move guard is intentionally permissive for the Kanban workflow.
    // Server-side task PATCH remains the authority for RBAC and shape enforcement.
    // This keeps the Kanban UI aligned with the product spec: all visible tasks can be
    // moved across the supported workflow columns in the board.

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
          {currentUser && (() => {
            const roles = currentUser.roles;
            const isAdmin = roles.includes('Admin') || roles.includes('Owner');
            const isStrategist = roles.includes('Strategist');
            const isPA = roles.includes('Production Assistant') && !isAdmin && !isStrategist;

            // Admin & Owner: all 3 boards
            if (isAdmin) {
              return (
                <div className="flex items-center bg-white border border-neutral-200 p-1 rounded-xl shadow-2xs">
                  {(['main', 'strategic', 'production'] as const).map((b) => (
                    <button
                      key={b}
                      onClick={() => setActiveBoard(b)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold capitalize transition ${
                        activeBoard === b ? 'bg-neutral-900 text-white shadow-xs' : 'text-neutral-500 hover:text-neutral-900'
                      }`}
                    >
                      {b === 'main' ? 'All Pipelines' : `${b} Pipeline`}
                    </button>
                  ))}
                </div>
              );
            }

            // Strategist: strategic + production boards
            if (isStrategist) {
              return (
                <div className="flex items-center bg-white border border-neutral-200 p-1 rounded-xl shadow-2xs">
                  {(['strategic', 'production'] as const).map((b) => (
                    <button
                      key={b}
                      onClick={() => setActiveBoard(b)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold capitalize transition ${
                        activeBoard === b ? 'bg-neutral-900 text-white shadow-xs' : 'text-neutral-500 hover:text-neutral-900'
                      }`}
                    >
                      {b === 'strategic' ? 'Strategic Pipeline' : 'Production Pipeline'}
                    </button>
                  ))}
                </div>
              );
            }

            // PA: TWO tabs — Production Pipeline (default) + Strategic Pipeline (restricted)
            if (isPA) {
              return (
                <div className="flex items-center bg-white border border-neutral-200 p-1 rounded-xl shadow-2xs">
                  {(['production', 'strategic'] as const).map((b) => (
                    <button
                      key={b}
                      onClick={() => setActiveBoard(b)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold capitalize transition ${
                        activeBoard === b ? 'bg-neutral-900 text-white shadow-xs' : 'text-neutral-500 hover:text-neutral-900'
                      }`}
                    >
                      {b === 'production' ? 'Production Pipeline' : 'Strategic Pipeline'}
                    </button>
                  ))}
                </div>
              );
            }

            // Other roles: allow tab switching between Production, Strategic, and All Pipelines
            return (
              <div className="flex items-center bg-white border border-neutral-200 p-1 rounded-xl shadow-2xs">
                {(['production', 'strategic', 'main'] as const).map((b) => (
                  <button
                    key={b}
                    onClick={() => setActiveBoard(b)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold capitalize transition ${
                      activeBoard === b ? 'bg-neutral-900 text-white shadow-xs' : 'text-neutral-500 hover:text-neutral-900'
                    }`}
                  >
                    {b === 'main' ? 'All Pipelines' : b === 'strategic' ? 'Strategic Pipeline' : 'Production Pipeline'}
                  </button>
                ))}
              </div>
            );
          })()}

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
            {visibleColumns.map((col) => (
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
                {visibleColumns.map((c) => (
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
          {visibleColumns.map((col) => {
            // Merged column: show tasks from both Production and Shooting statuses
            const isMergedCol = (col as string) === 'Production / Shooting';
            const colTasks = isMergedCol
              ? filteredTasks.filter((t) => PRODUCTION_SHOOTING_STATUSES.includes(t.status))
              : filteredTasks.filter((t) => t.status === col);
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
                onDrop={() => handleDrop(isMergedCol ? 'Production' as any : col)}
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
                      const stageNames = task.stages
                        ? Array.from(new Set((typeof task.stages === 'string' ? JSON.parse(task.stages) : task.stages).map((s: any) => s.userName)))
                        : [];
                      const assignedIds = task.assignedUserIds
                        ? (typeof task.assignedUserIds === 'string' ? JSON.parse(task.assignedUserIds) : task.assignedUserIds)
                        : [];
                      const assignedNames = assignedIds
                        .map((id: string) => allUsers.find((u) => u.id === id)?.name || id)
                        .filter(Boolean);
                      const uniqueUserNames = Array.from(new Set([...stageNames, ...assignedNames]));

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
                          onClick={() => {
                            if (canAccessTaskDetails(task)) {
                              setSelectedTaskDetail(task);
                            } else {
                              showToast('Unauthorized: You are not assigned to this task.', 'warning');
                            }
                          }}
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
                              {task.status === 'Revision' && (
                                <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full border ${
                                  task.revisionSeverity === 'Major' || (task.comments && JSON.stringify(task.comments).includes('Major'))
                                    ? 'bg-rose-100 text-rose-800 border-rose-300'
                                    : task.revisionSeverity === 'Medium' || (task.comments && JSON.stringify(task.comments).includes('Medium'))
                                    ? 'bg-amber-100 text-amber-800 border-amber-300'
                                    : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                }`}>
                                  Revisi {task.revisionSeverity || (JSON.stringify(task.comments || '').includes('Major') ? 'Major' : JSON.stringify(task.comments || '').includes('Medium') ? 'Medium' : 'Minor')}
                                </span>
                              )}
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

                          {/* Production / Shooting completion choice buttons */}
                          {((col as string) === 'Production / Shooting' || (task.status as any) === 'Production / Shooting' || task.status === 'Shooting' || task.status === 'Production') && task.category === 'Strategic' && (
                            <div className="pt-2 border-t border-neutral-100 space-y-1.5" onClick={(e) => e.stopPropagation()}>
                              <div className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider">Finish Shooting Choice:</div>
                              <div className="grid grid-cols-2 gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => openHandoverModal(task)}
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[9px] py-1.5 px-1 rounded-lg transition flex items-center justify-center gap-1 shadow-xs"
                                  title="Complete & move to Production / Editing pipeline"
                                >
                                  <Play className="w-3 h-3 shrink-0" /> Complete & Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleCompleteInStrategic(task)}
                                  className="bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-[9px] py-1.5 px-1 rounded-lg transition flex items-center justify-center gap-1 shadow-xs"
                                  title="Complete directly in Strategic without sending to Production pipeline"
                                >
                                  <CheckCircle2 className="w-3 h-3 shrink-0" /> Complete in Strategic
                                </button>
                              </div>
                            </div>
                          )}
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
                        <div className="flex items-center justify-center gap-1.5">
                          {t.category === 'Strategic' && ((t.status as any) === 'Production / Shooting' || t.status === 'Shooting' || t.status === 'Production' || t.status === 'Ready for Production') && (
                            <>
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); openHandoverModal(t); }}
                                className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded-lg flex items-center gap-1 shadow-xs"
                                title="Complete & move to Production / Editing pipeline"
                              >
                                <Play className="w-3 h-3 shrink-0" /> Edit
                              </button>
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); handleCompleteInStrategic(t); }}
                                className="px-2 py-1 bg-neutral-900 hover:bg-neutral-800 text-white text-[10px] font-bold rounded-lg flex items-center gap-1 shadow-xs"
                                title="Complete directly in Strategic without sending to Production pipeline"
                              >
                                <CheckCircle2 className="w-3 h-3 shrink-0" /> Strategic
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => {
                              if (canAccessTaskDetails(t)) {
                                setSelectedTaskDetail(t);
                              } else {
                                showToast('Unauthorized: You are not assigned to this task.', 'warning');
                              }
                            }}
                            className="p-1 rounded-lg hover:bg-neutral-100 text-neutral-500 hover:text-neutral-800 transition"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </div>
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
                  type="text"
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
                    const matchingUsers = allUsers.filter((u) => hasRole(u, stage.role));

                    // Types based on role
                    let typeOptions = ['Editing', 'Revisi'];
                    if (stage.role === 'Strategist') typeOptions = ['Content Plan', 'Production Lead', 'Editing Plan', 'Supervisi', 'Presentasi', 'Meeting Brief', 'Content Proposal'];
                    else if (stage.role === 'Production Assistant') typeOptions = ['Production Assistant'];
                    else if (stage.role === 'Scheduler') typeOptions = ['Scheduling'];

                    // Formats based on type
                    const formatOptions = getStrategicFormats(stage.taskType).length > 0 ? getStrategicFormats(stage.taskType) :
                      (stage.taskType === 'Scheduling' ? ['Per Post'] :
                      (stage.taskType === 'Production Assistant' ? ['1 Jam', '4 Jam', '8 Jam'] :
                      (stage.taskType === 'Editing' ? ['Single Foto', 'Grafis', 'Story Video', 'Paket Static', 'Carousel', 'Reels'] : ['Minor', 'Medium', 'Major'])));

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
                      {visibleColumns.map((col) => (
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
                      type="text"
                      value={editDriveLink}
                      onChange={(e) => setEditDriveLink(e.target.value)}
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2 text-neutral-900 focus:outline-hidden"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-neutral-700 font-semibold">Post Link (Proof of Posting)</label>
                    <input
                      type="text"
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
                      const matchingUsers = allUsers.filter((u) => hasRole(u, stage.role));

                      let typeOptions = ['Editing', 'Revisi'];
                      if (stage.role === 'Strategist') typeOptions = ['Content Plan', 'Production Lead', 'Editing Plan', 'Supervisi', 'Presentasi', 'Meeting Brief', 'Content Proposal'];
                      else if (stage.role === 'Production Assistant') typeOptions = ['Production Assistant'];
                      else if (stage.role === 'Scheduler') typeOptions = ['Scheduling'];

                      const formatOptions = getStrategicFormats(stage.taskType).length > 0 ? getStrategicFormats(stage.taskType) :
                        (stage.taskType === 'Scheduling' ? ['Per Post'] :
                        (stage.taskType === 'Production Assistant' ? ['1 Jam', '4 Jam', '8 Jam'] :
                        (stage.taskType === 'Editing' ? ['Single Foto', 'Grafis', 'Story Video', 'Paket Static', 'Carousel', 'Reels'] : ['Minor', 'Medium', 'Major'])));

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
                    <span className="text-neutral-550 font-semibold block">Post Link</span>
                    {selectedTaskDetail.previewLink ? (
                      <a
                        href={selectedTaskDetail.previewLink}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-700 font-semibold hover:bg-emerald-100 transition"
                      >
                        <span className="flex items-center gap-2">
                          <Video className="w-4 h-4" /> Post Link
                        </span>
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    ) : (
                      <div className="p-3 bg-neutral-50 border border-neutral-200 border-dashed rounded-xl text-neutral-400 text-center">
                        No Post Link Added
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

                  {/* Shooting Completion Choice Buttons (Complete & Edit OR Complete in Strategic) */}
                  {selectedTaskDetail.category === 'Strategic' && ((selectedTaskDetail.status as any) === 'Production / Shooting' || selectedTaskDetail.status === 'Shooting' || selectedTaskDetail.status === 'Production' || selectedTaskDetail.status === 'Ready for Production') && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const targetTask = selectedTaskDetail;
                          setSelectedTaskDetail(null);
                          openHandoverModal(targetTask);
                        }}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3.5 py-2 rounded-lg transition flex items-center gap-1.5 text-xs shadow-xs"
                        title="Complete & move to Production / Editing pipeline"
                      >
                        <Play className="w-3.5 h-3.5" /> Complete & Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const targetTask = selectedTaskDetail;
                          setSelectedTaskDetail(null);
                          handleCompleteInStrategic(targetTask);
                        }}
                        className="bg-neutral-900 hover:bg-neutral-800 text-white font-bold px-3.5 py-2 rounded-lg transition flex items-center gap-1.5 text-xs shadow-xs"
                        title="Complete directly in Strategic without sending to Production pipeline"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Complete in Strategic
                      </button>
                    </div>
                  )}

                  {!(selectedTaskDetail.category !== 'Strategic' && (currentUser?.id === 'u-anggi' || currentUser?.id === 'u-gigie' || currentUser?.name?.toLowerCase() === 'anggi' || currentUser?.name?.toLowerCase() === 'gigie')) && (selectedTaskDetail.status === 'Posted' || selectedTaskDetail.status === 'Completed' || currentUser?.roles.includes('Admin') || currentUser?.roles.includes('Owner')) && (
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

                  {!(selectedTaskDetail.category !== 'Strategic' && (currentUser?.id === 'u-anggi' || currentUser?.id === 'u-gigie' || currentUser?.name?.toLowerCase() === 'anggi' || currentUser?.name?.toLowerCase() === 'gigie')) && (
                    <button
                      onClick={startEditing}
                      className="bg-neutral-900 hover:bg-neutral-800 text-white font-semibold px-4 py-2 rounded-lg transition"
                    >
                      Edit Specifications
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Handover to Production Modal */}
      {isHandoverModalOpen && handoverTask && (
        <div className="fixed inset-0 bg-neutral-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-neutral-100 space-y-5">
            <div className="flex justify-between items-center pb-3 border-b border-neutral-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md">
                  <Play className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-neutral-900">Send to Production Handover</h3>
                  <p className="text-xs text-neutral-400">Atur penugasan tim & spesifikasi format konten</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsHandoverModalOpen(false);
                  setHandoverTask(null);
                }}
                className="text-neutral-400 hover:text-neutral-600 p-1.5 rounded-xl hover:bg-neutral-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmSendToProduction} className="space-y-4 text-xs">
              <div className="bg-neutral-50 p-3 rounded-2xl border border-neutral-200/80">
                <div className="text-xs font-bold text-neutral-900 mb-0.5">{handoverTask.title}</div>
                <div className="text-[11px] text-neutral-500 font-medium">Client: {handoverTask.clientName}</div>
              </div>

              {/* PA Assignee & Format */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-700 font-bold mb-1">Production Assistant (PA)</label>
                  <select
                    value={handoverPaUserId}
                    onChange={(e) => setHandoverPaUserId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-200 focus:outline-hidden focus:ring-2 focus:ring-neutral-900 font-medium bg-white"
                  >
                    {allUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.roles.join(', ')})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-neutral-700 font-bold mb-1">PA Work Hours</label>
                  <select
                    value={handoverPaFormat}
                    onChange={(e) => setHandoverPaFormat(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-200 focus:outline-hidden focus:ring-2 focus:ring-neutral-900 font-medium bg-white"
                  >
                    <option value="1 Jam">1 Jam (100 pts)</option>
                    <option value="4 Jam">4 Jam (400 pts)</option>
                    <option value="8 Jam">8 Jam (800 pts)</option>
                  </select>
                </div>
              </div>

              {/* Editor Assignee */}
              <div>
                <label className="block text-neutral-700 font-bold mb-1">Editor Assignee</label>
                <select
                  value={handoverEditorUserId}
                  onChange={(e) => setHandoverEditorUserId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-neutral-200 focus:outline-hidden focus:ring-2 focus:ring-neutral-900 font-medium bg-white"
                >
                  {allUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.roles.join(', ')})
                    </option>
                  ))}
                </select>
              </div>

              {/* Editor Format & Qty */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-700 font-bold mb-1">Editing Content Format</label>
                  <select
                    value={handoverEditorFormat}
                    onChange={(e) => setHandoverEditorFormat(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-200 focus:outline-hidden focus:ring-2 focus:ring-neutral-900 font-medium bg-white"
                  >
                    <option value="Single Foto">Single Foto (10 pts)</option>
                    <option value="Grafis">Grafis (25 pts)</option>
                    <option value="Story Video">Story Video (33 pts)</option>
                    <option value="Paket Static">Paket Static (75 pts)</option>
                    <option value="Carousel">Carousel (150 pts)</option>
                    <option value="Reels">Reels (150 pts)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-neutral-700 font-bold mb-1">Editing Qty</label>
                  <input
                    type="number"
                    min="1"
                    value={handoverEditorQty}
                    onChange={(e) => setHandoverEditorQty(Math.max(1, Number(e.target.value)))}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-200 focus:outline-hidden focus:ring-2 focus:ring-neutral-900 font-bold font-mono"
                  />
                </div>
              </div>

              {/* Total Live Score Summary */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-emerald-900">Total Handover Score</div>
                  <div className="text-[11px] text-emerald-700">
                    PA ({calculateTaskScore('Assistant', 'Production Assistant', handoverPaFormat, 1)} pts) + Editor ({calculateTaskScore('Editor', 'Editing', handoverEditorFormat, handoverEditorQty)} pts)
                  </div>
                </div>
                <div className="text-base font-extrabold font-mono text-emerald-700">
                  {calculateTaskScore('Assistant', 'Production Assistant', handoverPaFormat, 1) + calculateTaskScore('Editor', 'Editing', handoverEditorFormat, handoverEditorQty)} pts
                </div>
              </div>

              {/* Buttons */}
              <div className="pt-2 flex items-center justify-end gap-3 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsHandoverModalOpen(false);
                    setHandoverTask(null);
                  }}
                  className="bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-semibold px-4 py-2.5 rounded-xl transition"
                >
                  Batal
                </button>

                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-2.5 rounded-xl shadow-md transition flex items-center gap-1.5"
                >
                  <Play className="w-4 h-4" /> Confirm & Send to Production
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
