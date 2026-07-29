import { UserPersona, UserRole } from './types';

export const PERMANENT_USERS: UserPersona[] = [
  {
    id: 'u-devi',
    name: 'Devi',
    email: 'devi@personaos.com',
    avatar: '',
    roles: ['Admin', 'Owner', 'Strategist'],
    monthlyCapacity: 12000,
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
    monthlyCapacity: 12000,
    hourlyPoint: 100,
    costPerPoint: 250,
    active: true,
  },
  {
    id: 'u-gigie',
    name: 'Gigie',
    email: 'gigie@personaos.com',
    avatar: '',
    roles: ['Strategist'],
    monthlyCapacity: 12000,
    hourlyPoint: 100,
    costPerPoint: 250,
    active: true,
  },
  {
    id: 'u-dindong',
    name: 'Dinda',
    email: 'dinda@personaos.com',
    avatar: '',
    roles: ['Scheduler'],
    monthlyCapacity: 12000,
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
    monthlyCapacity: 12000,
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
    monthlyCapacity: 12000,
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
