import { UserPersona, UserRole } from './types';

export const PERMANENT_USERS: UserPersona[] = [
  {
    id: 'u-devi',
    name: 'Devi',
    email: 'devi@personaos.com',
    avatar: '',
    roles: ['Admin', 'Owner', 'Strategist'],
    monthlyCapacity: 16000,
    hourlyPoint: 100,
    costPerPoint: 250,
    active: true,
  },
  {
    id: 'u-anggi',
    name: 'Anggi',
    email: 'anggi@personaos.com',
    avatar: '',
    roles: ['Strategist', 'Production Assistant'],
    monthlyCapacity: 16000,
    hourlyPoint: 100,
    costPerPoint: 250,
    active: true,
  },
  {
    id: 'u-gigie',
    name: 'Gigie',
    email: 'gigie@personaos.com',
    avatar: '',
    roles: ['Strategist', 'Production Assistant'],
    monthlyCapacity: 16000,
    hourlyPoint: 100,
    costPerPoint: 250,
    active: true,
  },
  {
    id: 'u-dindong',
    name: 'Dinda',
    email: 'dinda@personaos.com',
    avatar: '',
    roles: ['Production Assistant', 'Editor', 'Scheduler'],
    monthlyCapacity: 16000,
    hourlyPoint: 100,
    costPerPoint: 250,
    active: true,
  },
  {
    id: 'u-jabin',
    name: 'Jabin',
    email: 'jabin@personaos.com',
    avatar: '',
    roles: ['Production Assistant', 'Editor'],
    monthlyCapacity: 16000,
    hourlyPoint: 100,
    costPerPoint: 250,
    active: true,
  },
  {
    id: 'u-priska',
    name: 'Priska',
    email: 'priska@personaos.com',
    avatar: '',
    roles: ['Production Assistant', 'Editor'],
    monthlyCapacity: 16000,
    hourlyPoint: 100,
    costPerPoint: 250,
    active: true,
  },
];

export function hasPermission(
  user: UserPersona,
  action:
    | 'MANAGE_SETTINGS'
    | 'MANAGE_CLIENTS'
    | 'APPROVE_TASKS'
    | 'CREATE_PROJECTS'
    | 'EDIT_MASTER_SCORE'
    | 'VIEW_REPORTS'
): boolean {
  if (user.roles.includes('Owner') || user.roles.includes('Admin')) {
    return true;
  }

  switch (action) {
    case 'CREATE_PROJECTS':
    case 'APPROVE_TASKS':
      return user.roles.includes('Strategist');
    case 'VIEW_REPORTS':
      return user.roles.includes('Strategist') || user.roles.includes('Admin');
    case 'MANAGE_CLIENTS':
    case 'MANAGE_SETTINGS':
    case 'EDIT_MASTER_SCORE':
      return user.roles.includes('Admin') || user.roles.includes('Owner');
    default:
      return false;
  }
}

export function getStageOwnerRole(stage: string): UserRole {
  switch (stage) {
    case 'Brief':
    case 'Content Proposal':
    case 'Script':
    case 'Editorial Plan':
      return 'Strategist';
    case 'Shooting':
      return 'Production Assistant';
    case 'Editing':
    case 'Revision':
      return 'Editor';
    case 'Approval':
      return 'Owner';
    case 'Scheduling':
      return 'Scheduler';
    default:
      return 'Owner';
  }
}

export function canUserEditStage(user: UserPersona, stage: string): boolean {
  if (stage === 'Posted') return false; // Posted is read-only
  if (user.roles.includes('Owner') || user.roles.includes('Admin')) return true;

  const requiredRole = getStageOwnerRole(stage);
  return user.roles.includes(requiredRole);
}

export function getEditableFieldsForStage(stage: string): string[] {
  switch (stage) {
    case 'Brief':
    case 'Content Proposal':
    case 'Script':
    case 'Editorial Plan':
      return ['title', 'description', 'clientId', 'category', 'taskType', 'format', 'priority', 'postingDate', 'deadline', 'assignedUserIds'];
    case 'Shooting':
      return ['driveLink', 'files', 'status', 'checklist'];
    case 'Editing':
    case 'Revision':
      return ['previewLink', 'driveLink', 'files', 'status', 'checklist', 'comments'];
    case 'Approval':
      return ['status', 'comments'];
    case 'Scheduling':
      return ['postingDate', 'previewLink', 'status'];
    default:
      return [];
  }
}

export function isPicAllowedForTaskType(roles: string[], taskType: string): boolean {
  if (roles.includes('Admin') || roles.includes('Owner')) return true;
  
  const typeLower = taskType.toLowerCase();
  if (typeLower.includes('editing') || typeLower.includes('revisi') || typeLower.includes('edit')) {
    return roles.includes('Editor');
  }
  if (typeLower.includes('scheduling') || typeLower.includes('schedule')) {
    return roles.includes('Scheduler');
  }
  if (typeLower.includes('production assistant') || typeLower.includes('pa') || typeLower.includes('shooting') || typeLower.includes('shoot')) {
    return roles.includes('Production Assistant');
  }
  if (
    typeLower.includes('content plan') ||
    typeLower.includes('proposal') ||
    typeLower.includes('script') ||
    typeLower.includes('lead') ||
    typeLower.includes('supervisi') ||
    typeLower.includes('presentasi') ||
    typeLower.includes('brief') ||
    typeLower.includes('strategic')
  ) {
    return roles.includes('Strategist');
  }
  
  return false;
}

export function checkTaskAccess(
  user: { id: string; name: string; roles: string[] },
  task: { assignedUserIds: string; stages?: string | null; status?: string }
): boolean {
  // Executive roles always have access (Strategist removed from blanket access)
  if (user.roles.includes('Admin') || user.roles.includes('Owner')) {
    return true;
  }

  // Allow Scheduler role to access scheduling-stage tasks globally
  const userIsScheduler = user.roles.includes('Scheduler');
  const taskStatus = task.status || '';
  if (userIsScheduler && (taskStatus === 'Scheduling' || taskStatus === 'Ready to Post')) {
    return true;
  }

  // Check assigned user IDs
  const assignedIds: string[] = task.assignedUserIds ? (typeof task.assignedUserIds === 'string' ? JSON.parse(task.assignedUserIds) : task.assignedUserIds) : [];
  if (assignedIds.includes(user.id) || assignedIds.includes(user.name)) {
    return true;
  }

  // Check explicit stages for ownership (including scheduler presence in stages)
  const stages = task.stages ? (typeof task.stages === 'string' ? JSON.parse(task.stages) : task.stages) : [];
  if (Array.isArray(stages) && stages.some((s: any) => s.userId === user.id || s.userName === user.name)) {
    return true;
  }

  // If scheduler role is present in stages, allow access
  if (userIsScheduler && Array.isArray(stages) && stages.some((s: any) => s.role === 'Scheduler' || (s.taskType && String(s.taskType).toLowerCase().includes('scheduling')))) {
    return true;
  }

  return false;
}

export function checkWorklogAccess(user: { id: string; name: string; roles: string[] }, worklog: { userId: string; stages?: string | null }): boolean {
  if (user.roles.includes('Admin') || user.roles.includes('Owner') || user.roles.includes('Strategist')) {
    return true;
  }
  
  if (worklog.userId === user.id) {
    return true;
  }
  
  const stages = worklog.stages ? (typeof worklog.stages === 'string' ? JSON.parse(worklog.stages) : worklog.stages) : [];
  if (Array.isArray(stages) && stages.some((s: any) => s.userId === user.id || s.userName === user.name)) {
    return true;
  }
  
  return false;
}

