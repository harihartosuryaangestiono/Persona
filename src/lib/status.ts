/**
 * Centralized Status Definitions for Persona OS
 * Single source of truth mapping database statuses to UI labels and vice versa.
 */

export const ALL_STATUS_OPTIONS = [
  { value: 'Brief', label: 'Brief' },
  { value: 'Editing', label: 'In Progress / Editing' },
  { value: 'Revision', label: 'Revision' },
  { value: 'Waiting for Approval', label: 'Waiting for Approval' },
  { value: 'Approval', label: 'Approval' },
  { value: 'Ready to Post', label: 'Ready to Post' },
  { value: 'Scheduling', label: 'Scheduling' },
  { value: 'Posted', label: 'Posted' },
  { value: 'Completed', label: 'Completed' },
  { value: 'Production', label: 'Production' },
  { value: 'Draft', label: 'Draft' },
  { value: 'Script & Shotlist', label: 'Script & Shotlist' },
  { value: 'Editorial Calendar', label: 'Editorial Calendar' },
  { value: 'Ready for Production', label: 'Ready for Production' },
  { value: 'Shooting', label: 'Shooting' },
] as const;

export const DATABASE_TO_UI_STATUS: Record<string, string> = {
  'Editing': 'In Progress',
  'InProgress': 'In Progress',
  'In Progress': 'In Progress',
  'Posted': 'Posted',
  'Draft': 'Draft',
  'Approved': 'Approved',
  'Approval': 'Approval',
  'Waiting Approval': 'Waiting for Approval',
  'Waiting for Approval': 'Waiting for Approval',
  'Revision': 'Revision',
  'Production': 'Production',
  'Brief': 'Brief',
  'Script': 'Script',
  'Script & Shotlist': 'Script & Shotlist',
  'Editorial Calendar': 'Editorial Calendar',
  'Ready for Production': 'Ready for Production',
  'Ready to Post': 'Ready to Post',
  'Ready To Post': 'Ready to Post',
  'Scheduling': 'Scheduling',
  'Completed': 'Completed',
  'Editorial Plan': 'Editorial Plan',
  'Shooting': 'Shooting',
};

export const UI_TO_DATABASE_STATUS: Record<string, string> = {
  'In Progress': 'Editing',
  'Posted': 'Posted',
  'Draft': 'Draft',
  'Approved': 'Approved',
  'Approval': 'Approval',
  'Waiting for Approval': 'Waiting for Approval',
  'Waiting Approval': 'Waiting for Approval',
  'Revision': 'Revision',
  'Production': 'Production',
  'Brief': 'Brief',
  'Script': 'Script',
  'Script & Shotlist': 'Script & Shotlist',
  'Editorial Calendar': 'Editorial Calendar',
  'Ready for Production': 'Ready for Production',
  'Ready to Post': 'Ready to Post',
  'Scheduling': 'Scheduling',
  'Completed': 'Completed',
  'Editorial Plan': 'Brief',
  'Shooting': 'Shooting',
};

/**
 * Get the user-facing status label for a given database status.
 */
export function getStatusLabel(dbStatus: string | null | undefined): string {
  if (!dbStatus) return 'Brief';
  const clean = dbStatus.trim();
  const matchKey = Object.keys(DATABASE_TO_UI_STATUS).find(
    (k) => k.toLowerCase() === clean.toLowerCase()
  );
  return matchKey ? DATABASE_TO_UI_STATUS[matchKey] : clean;
}

/**
 * Get the database status for a given user-facing UI status.
 */
export function getDbStatus(uiStatus: string | null | undefined): string {
  if (!uiStatus) return 'Brief';
  const clean = uiStatus.trim();
  const matchKey = Object.keys(UI_TO_DATABASE_STATUS).find(
    (k) => k.toLowerCase() === clean.toLowerCase()
  );
  return matchKey ? UI_TO_DATABASE_STATUS[matchKey] : clean;
}

export const STRATEGIC_STATUS_OPTIONS = [
  'Brief',
  'Content Proposal',
  'Editorial Calendar',
  'Script & Shotlist',
  'Ready for Production',
  'Completed',
] as const;

export const PRODUCTION_STATUS_OPTIONS = [
  'Production',
  'Shooting',
  'Editing',
  'Revision',
  'Waiting for Approval',
  'Approval',
  'Ready to Post',
  'Scheduling',
  'Posted',
  'Completed',
] as const;

export function isStrategicPipeline(category?: string | null, taskType?: string | null): boolean {
  if (category === 'Strategic') return true;
  const strTypes = [
    'content plan',
    'meeting brief',
    'presentasi',
    'brief',
    'content proposal',
    'editorial calendar',
    'script & shotlist',
    'script',
    'ready for production',
  ];
  if (taskType && strTypes.includes(taskType.trim().toLowerCase())) {
    return true;
  }
  return false;
}

export function hasSchedulerStage(
  category?: string | null,
  taskType?: string | null,
  stages?: any,
  assignedUserIds?: any
): boolean {
  if (category === 'Scheduler' || taskType === 'Scheduling') return true;

  if (stages) {
    let parsed: any[] = [];
    if (typeof stages === 'string') {
      try { parsed = JSON.parse(stages); } catch {}
    } else if (Array.isArray(stages)) {
      parsed = stages;
    }
    if (parsed.some((s: any) =>
      s.role === 'Scheduler' ||
      s.taskType === 'Scheduling' ||
      (s.userName && s.userName.toLowerCase().includes('dinda')) ||
      (s.userId && (s.userId === 'u-dindong' || String(s.userId).toLowerCase().includes('dinda')))
    )) {
      return true;
    }
  }

  if (assignedUserIds) {
    let parsedIds: any[] = [];
    if (typeof assignedUserIds === 'string') {
      try { parsedIds = JSON.parse(assignedUserIds); } catch {}
    } else if (Array.isArray(assignedUserIds)) {
      parsedIds = assignedUserIds;
    }
    if (parsedIds.some((id: string) => String(id).toLowerCase().includes('dindong') || String(id).toLowerCase().includes('dinda'))) {
      return true;
    }
  }

  return false;
}

/**
 * Normalizes status based on pipeline requirement:
 * - If status is 'Completed' (or 'Complete') AND task has a Scheduler stage (or Dinda as Scheduler) -> status becomes 'Posted'
 * - If status is 'Completed' AND task does NOT have a Scheduler stage -> status remains 'Completed'
 */
export function normalizeStatusForPipeline(
  status: string | null | undefined,
  category?: string | null,
  taskType?: string | null,
  stages?: any,
  assignedUserIds?: any
): string {
  if (!status) return 'Brief';
  const resolved = getDbStatus(status);

  if ((resolved === 'Completed' || resolved === 'Complete') && hasSchedulerStage(category, taskType, stages, assignedUserIds)) {
    return 'Posted';
  }

  return resolved.trim();
}

export function formatWorkflowCategory(category?: string | null): string {
  if (!category) return 'Scheduler';
  const c = category.trim().toLowerCase();
  if (c === 'scheduling' || c === 'scheduler') return 'Scheduler';
  if (c === 'editing' || c === 'editor') return 'Editor';
  if (c === 'production' || c === 'assistant') return 'Production';
  if (c === 'strategic' || c === 'strategist') return 'Strategic';
  return category;
}



