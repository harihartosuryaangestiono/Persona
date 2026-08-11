/**
 * Utility functions for attendance tracking and timezone operations.
 * Main timezone: Asia/Jakarta (WIB)
 */

/**
 * Formats a duration in minutes into a human-readable string.
 * Examples:
 * - 0 -> "0m"
 * - 45 -> "45m"
 * - 480 -> "8h 00m"
 * - 525 -> "8h 45m"
 * - 617 -> "10h 17m"
 */
export function formatWorkingMinutes(minutes: number): string {
  if (minutes === undefined || minutes === null || minutes < 0) {
    return '0m';
  }
  const hrs = Math.floor(minutes / 60);
  const mins = Math.floor(minutes % 60);
  if (hrs === 0) {
    return `${mins}m`;
  }
  return `${hrs}h ${mins.toString().padStart(2, '0')}m`;
}

/**
 * Gets the current date string (YYYY-MM-DD) in Asia/Jakarta timezone.
 */
export function getJakartaDateString(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/**
 * Gets the hour and minute in Asia/Jakarta timezone as numbers.
 */
export function getJakartaTime(date: Date = new Date()): { hour: number; minute: number } {
  const formatted = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Jakarta',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  }).format(date);
  
  const [hour, minute] = formatted.split(':').map(Number);
  return { hour, minute };
}

/**
 * Converts a UTC Date object to a readable time format in Asia/Jakarta.
 * Example: "08:57 AM" or "05:21 PM"
 */
export function formatJakartaTime(dateStr: string | Date): string {
  if (!dateStr) return '—';
  const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  if (isNaN(date.getTime())) return '—';
  
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Jakarta',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

/**
 * Formats a Date object or ISO string to a human-readable date in Jakarta timezone.
 * Example: "Tuesday, August 11, 2026"
 */
export function formatJakartaFullDate(dateStr: string | Date): string {
  if (!dateStr) return '—';
  const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  if (isNaN(date.getTime())) return '—';

  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Jakarta',
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}
