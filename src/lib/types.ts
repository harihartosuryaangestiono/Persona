export type UserRole =
  | 'Admin'
  | 'Owner'
  | 'Strategist'
  | 'Production Assistant'
  | 'Editor'
  | 'Scheduler';

export interface UserPersona {
  id: string;
  name: string;
  email: string;
  avatar: string;
  password?: string;
  roles: UserRole[];
  monthlyCapacity: number; // 16000
  hourlyPoint: number;     // 100
  costPerPoint: number;    // 250
  active: boolean;
}

export interface ClientItem {
  id: string;
  name: string;
  code: string;
  workspaceId: string;
  monthlyPointBudget: number;
  remainingPoint: number;
  usedPoint: number;
  clientColor: string;
  logo?: string;
  active: boolean;
  status?: string;
  notes?: string;
}

export interface MasterScoreItem {
  id: string;
  category: 'Editor' | 'Assistant' | 'Strategic' | 'Scheduler' | 'Production' | 'Editing' | 'Scheduling';
  taskType: string;
  format: string;
  score: number;
}

export interface TaskItem {
  id: string;
  projectId?: string;
  clientId: string;
  clientName?: string;
  clientColor?: string;
  workspaceId: string;
  title: string;
  description?: string;
  category: 'Editor' | 'Assistant' | 'Strategic' | 'Scheduler' | 'Production' | 'Editing' | 'Scheduling';
  taskType?: string;
  format?: string;
  qty: number;
  priority: 'High' | 'Medium' | 'Low' | 'Urgent' | 'Overdue';
  postingDate?: string;
  deadline: string;
  status:
    | 'Brief'
    | 'Content Proposal'
    | 'Script'
    | 'Script & Shotlist'
    | 'Editorial Calendar'
    | 'Ready for Production'
    | 'Completed'
    | 'Production'
    | 'Editing'
    | 'Revision'
    | 'Approval'
    | 'Waiting for Approval'
    | 'Ready to Post'
    | 'Scheduling'
    | 'Posted'
    | 'Editorial Plan'
    | 'Shooting';
  assignedUserIds: string[];
  assignedUsers?: UserPersona[];
  files?: string[];
  driveLink?: string;
  previewLink?: string;
  score: number;
  cogs: number;
  stages?: any;
  checklist?: { id: string; label: string; done: boolean }[];
  comments?: { id: string; userName: string; userAvatar?: string; text: string; createdAt: string }[];
  createdAt: string;
  updatedAt: string;
  month: string;
  year: number;
  contentId: string;
  isArchived: boolean;
  handoverUserId?: string;
  handoverTime?: string;
  workflowTimeline?: string;
}

export interface WorklogItem {
  id: string;
  date: string;
  userId: string;
  userName?: string;
  userAvatar?: string;
  clientId: string;
  clientName?: string;
  contentTitle: string;
  taskType: string;
  format: string;
  qty: number;
  score: number;
  cogs: number;
  status: string;
  source: 'Manual' | 'Imported' | 'Automated';
  stages?: any;
  deadline?: string;
  previewLink?: string;
  driveLink?: string;
  month: string;
  year: number;
  contentId: string;
  isArchived: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface AttendanceItem {
  id: string;
  userId: string;
  userName?: string;
  userAvatar?: string;
  date: string;
  clockIn: string;
  clockOut?: string | null;
  locationMode: 'OFFICE' | 'REMOTE' | 'GPS';
  status: string;
  workingHours: number;
  workingMinutes?: number;
  isLate?: boolean;
  lateMinutes?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface LeaveRequestItem {
  id: string;
  userId: string;
  userName?: string;
  startDate: string;
  endDate: string;
  reason: string;
  type: 'ANNUAL' | 'SICK' | 'EMERGENCY';
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  approvedByUserId?: string;
  createdAt: string;
}

export interface ClientMonthlyBudgetItem {
  id: string;
  clientId: string;
  clientName?: string;
  month: string; // e.g. "2026-07"
  budget: number;
  used: number;
  remaining: number;
}

export interface ActivityLogItem {
  id: string;
  userId: string;
  userName?: string;
  entityType: string;
  entityId: string;
  action: string;
  details: string;
  createdAt: string;
}
