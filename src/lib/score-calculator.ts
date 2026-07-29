import { MasterScoreItem } from './types';

// Master score static lookup table fallback matching company requirements
export const MASTER_SCORES_STATIC: Omit<MasterScoreItem, 'id'>[] = [
  { category: 'Editor', taskType: 'Editing', format: 'Single Foto', score: 10 },
  { category: 'Editor', taskType: 'Editing', format: 'Grafis', score: 25 },
  { category: 'Editor', taskType: 'Editing', format: 'Story Video', score: 33 },
  { category: 'Editor', taskType: 'Editing', format: 'Paket Static', score: 75 },
  { category: 'Editor', taskType: 'Editing', format: 'Carousel', score: 150 },
  { category: 'Editor', taskType: 'Editing', format: 'Reels', score: 150 },
  { category: 'Editor', taskType: 'Revisi', format: 'Minor', score: 10 },
  { category: 'Editor', taskType: 'Revisi', format: 'Medium', score: 25 },
  { category: 'Editor', taskType: 'Revisi', format: 'Major', score: 50 },
  { category: 'Assistant', taskType: 'Production Assistant', format: '4 Jam', score: 400 },
  { category: 'Assistant', taskType: 'Production Assistant', format: '8 Jam', score: 800 },
  { category: 'Strategic', taskType: 'Content Plan', format: '4 Jam', score: 400 },
  { category: 'Strategic', taskType: 'Content Plan', format: '8 Jam', score: 800 },
  { category: 'Strategic', taskType: 'Production Lead', format: '4 Jam', score: 400 },
  { category: 'Strategic', taskType: 'Production Lead', format: '8 Jam', score: 800 },
  { category: 'Strategic', taskType: 'Editing Plan', format: 'Per Item', score: 25 },
  { category: 'Strategic', taskType: 'Supervisi', format: 'Per Check', score: 50 },
  { category: 'Strategic', taskType: 'Presentasi', format: 'Per Session', score: 100 },
  { category: 'Scheduler', taskType: 'Scheduling', format: 'Per Post', score: 5 },
];

export function calculateTaskScore(
  category: string,
  taskType?: string,
  format?: string,
  qty: number = 1
): number {
  if (!taskType || !format) return 0;

  const match = MASTER_SCORES_STATIC.find(
    (item) =>
      item.category.toLowerCase() === category.toLowerCase() &&
      item.taskType.toLowerCase() === taskType.toLowerCase() &&
      item.format.toLowerCase() === format.toLowerCase()
  );

  const baseScore = match ? match.score : 10;
  return baseScore * (qty > 0 ? qty : 1);
}

export const EMPLOYEE_POINT_VALUE_IDR = 250;
export const CLIENT_POINT_VALUE_IDR = 1500;

export function calculateCOGS(score: number, costPerPoint: number = 250): number {
  return score * costPerPoint;
}

export function calculateEmployeePayroll(points: number): number {
  return points * EMPLOYEE_POINT_VALUE_IDR;
}

export function calculateClientBudgetValue(points: number): number {
  return points * CLIENT_POINT_VALUE_IDR;
}


export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function calculateAutoDeadline(postingDateStr: string, offsetDays: number = -3): string {
  if (!postingDateStr) return '';
  const date = new Date(postingDateStr);
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().split('T')[0];
}

export function getCapacityHealth(
  usedPoints: number,
  maxCapacity: number = 12000
): { status: 'GREEN' | 'YELLOW' | 'RED'; percent: number; colorClass: string } {
  const percent = Math.min(100, Math.round((usedPoints / maxCapacity) * 100));
  if (percent >= 90) {
    return { status: 'RED', percent, colorClass: 'text-rose-500 bg-rose-500/10 border-rose-500/20' };
  } else if (percent >= 70) {
    return { status: 'YELLOW', percent, colorClass: 'text-amber-500 bg-amber-500/10 border-amber-500/20' };
  }
  return { status: 'GREEN', percent, colorClass: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' };
}

export function calculatePriority(
  deadlineStr: string | Date,
  status: string = 'Brief',
  postingDateStr?: string | Date | null
): 'Low' | 'Medium' | 'Urgent' | 'Overdue' {
  if (!deadlineStr) return 'Low';
  const deadline = new Date(deadlineStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  deadline.setHours(0, 0, 0, 0);

  const diffTime = deadline.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return 'Overdue';
  }

  // Check if posting date is tomorrow or today, and task is not yet posted (it is in pre-posting stages)
  if (postingDateStr) {
    const postingDate = new Date(postingDateStr);
    postingDate.setHours(0, 0, 0, 0);
    const daysToPost = Math.ceil((postingDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    const isPrePostedStage = [
      'Brief', 'Content Proposal', 'Script', 'Script & Shotlist', 'Editorial Calendar',
      'Ready for Production', 'Production', 'Editing', 'Revision', 'Approval', 'Ready to Post', 'Scheduling'
    ].includes(status);

    if (daysToPost <= 1 && isPrePostedStage) {
      return 'Urgent';
    }
  }

  if (diffDays <= 3) {
    return 'Urgent';
  } else if (diffDays <= 7) {
    return 'Medium';
  } else {
    return 'Low';
  }
}

export function getPriorityColorClass(priority: string): string {
  switch (priority) {
    case 'Overdue':
      return 'text-red-700 bg-red-50 border-red-200';
    case 'Urgent':
      return 'text-amber-700 bg-amber-50 border-amber-250';
    case 'Medium':
      return 'text-blue-700 bg-blue-50 border-blue-200';
    case 'Low':
    default:
      return 'text-neutral-600 bg-neutral-50 border-neutral-200';
  }
}

