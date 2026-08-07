/**
 * Centralized Status Definitions for Persona OS
 * Single source of truth mapping database statuses to UI labels and vice versa.
 */

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
  'Shooting': 'Production',
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
