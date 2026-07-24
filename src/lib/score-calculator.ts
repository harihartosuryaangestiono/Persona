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
