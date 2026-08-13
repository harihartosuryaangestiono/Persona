import { UserPersona, UserRole } from './types';

const CANONICAL_ROLES: UserRole[] = ['Admin', 'Owner', 'Strategist', 'Production Assistant', 'Editor', 'Scheduler'];

const ROLE_ALIASES: Record<string, UserRole> = {
  admin: 'Admin',
  owner: 'Owner',
  ceo: 'Owner',
  director: 'Owner',
  strategist: 'Strategist',
  strategy: 'Strategist',
  strategic: 'Strategist',
  'production assistant': 'Production Assistant',
  pa: 'Production Assistant',
  'prod asst': 'Production Assistant',
  productionassistant: 'Production Assistant',
  production: 'Production Assistant',
  shooting: 'Production Assistant',
  'shooting team': 'Production Assistant',
  'production team': 'Production Assistant',
  assistant: 'Production Assistant',
  editor: 'Editor',
  editing: 'Editor',
  'video editor': 'Editor',
  'content editor': 'Editor',
  'photo editor': 'Editor',
  edit: 'Editor',
  scheduler: 'Scheduler',
  scheduling: 'Scheduler',
  schedule: 'Scheduler',
  'content scheduler': 'Scheduler',
  'social media scheduler': 'Scheduler',
  'social media': 'Scheduler',
  sm: 'Scheduler',
};

export function normalizeRole(rawRole: string | null | undefined): UserRole | null {
  if (!rawRole) return null;
  const r = String(rawRole).trim().toLowerCase().replace(/[\s_\-/]+/g, ' ').trim();
  if (!r) return null;
  if (ROLE_ALIASES[r]) return ROLE_ALIASES[r];
  const exact = CANONICAL_ROLES.find((cr) => cr.toLowerCase() === r);
  if (exact) return exact;
  const partial = CANONICAL_ROLES.find((cr) => cr.toLowerCase().includes(r) || r.includes(cr.toLowerCase()));
  return partial || null;
}

export function normalizeRoles(rawRoles: string[] | string | null | undefined): UserRole[] {
  if (!rawRoles) return [];
  const list: string[] = Array.isArray(rawRoles)
    ? rawRoles.map((r) => String(r))
    : [String(rawRoles)];
  const set = new Set<UserRole>();
  for (const raw of list) {
    const canonical = normalizeRole(raw);
    if (canonical) set.add(canonical);
  }
  return Array.from(set);
}

export function hasRole(user: { roles: string[] | string }, role: UserRole): boolean {
  const roles = normalizeRoles(user.roles);
  return roles.includes(role);
}

export function hasAnyRole(user: { roles: string[] | string }, targetRoles: UserRole[]): boolean {
  const roles = normalizeRoles(user.roles);
  return targetRoles.some((r) => roles.includes(r));
}

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
    name: 'Gigi',
    email: 'gigi@personaos.com',
    avatar: '',
    roles: ['Strategist', 'Production Assistant', 'Editor', 'Scheduler'],
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
    name: 'Prisca',
    email: 'prisca@personaos.com',
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
  if (hasAnyRole(user, ['Owner', 'Admin'])) return true;

  switch (action) {
    case 'CREATE_PROJECTS':
    case 'APPROVE_TASKS':
      return hasRole(user, 'Strategist');
    case 'VIEW_REPORTS':
      return hasRole(user, 'Strategist') || hasRole(user, 'Admin');
    case 'MANAGE_CLIENTS':
    case 'MANAGE_SETTINGS':
    case 'EDIT_MASTER_SCORE':
      return hasAnyRole(user, ['Admin', 'Owner']);
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
    case 'Waiting for Approval':
      return 'Owner';
    case 'Scheduling':
      return 'Scheduler';
    default:
      return 'Owner';
  }
}

export function canUserEditStage(user: UserPersona, stage: string): boolean {
  if (stage === 'Posted') return false;
  if (hasAnyRole(user, ['Owner', 'Admin'])) return true;

  const requiredRole = getStageOwnerRole(stage);
  return hasRole(user, requiredRole);
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
    case 'Waiting for Approval':
      return ['status', 'comments'];
    case 'Scheduling':
      return ['postingDate', 'previewLink', 'status'];
    default:
      return [];
  }
}

export function isPicAllowedForTaskType(roles: string[], taskType: string): boolean {
  const canonical = normalizeRoles(roles);
  if (canonical.includes('Admin') || canonical.includes('Owner')) return true;

  const typeLower = taskType.toLowerCase();
  if (typeLower.includes('editing') || typeLower.includes('revisi') || typeLower.includes('edit')) {
    return canonical.includes('Editor');
  }
  if (typeLower.includes('scheduling') || typeLower.includes('schedule')) {
    return canonical.includes('Scheduler');
  }
  if (typeLower.includes('production assistant') || typeLower.includes('pa') || typeLower.includes('shooting') || typeLower.includes('shoot')) {
    return canonical.includes('Production Assistant');
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
    return canonical.includes('Strategist');
  }

  return false;
}

function safeReadJsonArray(value: string | unknown | null | undefined): any[] {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string') return [];

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function checkTaskAccess(
  user: { id: string; name: string; roles: string[] },
  task: { assignedUserIds: string; stages?: string | null; status?: string }
): boolean {
  const userRoles = normalizeRoles(user.roles);
  if (userRoles.includes('Admin') || userRoles.includes('Owner') || userRoles.includes('Strategist')) {
    return true;
  }

  const boardRoleCoverage = ['Production Assistant', 'Editor', 'Scheduler'] as const;
  if (userRoles.some((r) => (boardRoleCoverage as readonly string[]).includes(r))) {
    return true;
  }

  const userIsScheduler = userRoles.includes('Scheduler');
  const taskStatus = task.status || '';
  if (userIsScheduler && (taskStatus === 'Scheduling' || taskStatus === 'Ready to Post')) {
    return true;
  }

  const assignedIds: string[] = safeReadJsonArray(task.assignedUserIds);
  if (assignedIds.includes(user.id) || assignedIds.includes(user.name)) {
    return true;
  }

  const stages = safeReadJsonArray(task.stages);
  if (Array.isArray(stages) && stages.some((s: any) => s.userId === user.id || s.userName === user.name)) {
    return true;
  }

  if (userIsScheduler && Array.isArray(stages) && stages.some((s: any) => (s.role === 'Scheduler' || s.role === 'Scheduling') || (s.taskType && String(s.taskType).toLowerCase().includes('scheduling')))) {
    return true;
  }

  return false;
}

export function checkWorklogAccess(user: { id: string; name: string; roles: string[] }, worklog: { userId: string; stages?: string | null }): boolean {
  const userRoles = normalizeRoles(user.roles);
  if (userRoles.includes('Admin') || userRoles.includes('Owner') || userRoles.includes('Strategist')) {
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

