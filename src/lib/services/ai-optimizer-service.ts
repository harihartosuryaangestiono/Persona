import { UserPersona, TaskItem, WorklogItem } from '@/lib/types';
import { getCapacityHealth, calculateUserPointsForPeriod } from '@/lib/score-calculator';

export interface WorkloadRecommendation {
  employee: UserPersona;
  currentPoints: number;
  remainingCapacity: number;
  capacityPercent: number;
  status: 'GREEN' | 'YELLOW' | 'RED';
  isRecommended: boolean;
  reason: string;
}

export class AiOptimizerService {
  static recommendAssignees(
    allUsers: UserPersona[],
    worklogs: WorklogItem[],
    tasks: TaskItem[],
    requiredScore: number = 150,
    month: string = 'August',
    year: number = 2026
  ): WorkloadRecommendation[] {
    const recommendations: WorkloadRecommendation[] = allUsers.map((usr) => {
      const currentPoints = calculateUserPointsForPeriod(usr, month, year, worklogs, tasks);

      const capacity = usr.monthlyCapacity || 16000;
      const remainingCapacity = Math.max(0, capacity - currentPoints);
      const health = getCapacityHealth(currentPoints, capacity);

      const isRecommended = health.status !== 'RED' && remainingCapacity >= requiredScore;

      let reason = '';
      if (health.status === 'RED') {
        reason = `Overload Warning: ${currentPoints}/${capacity} pts (${health.percent}% full). Workload nearly exhausted.`;
      } else if (health.status === 'YELLOW') {
        reason = `Moderate Load: ${currentPoints}/${capacity} pts (${health.percent}%). Available for priority tasks.`;
      } else {
        reason = `Optimal Capacity: ${currentPoints}/${capacity} pts (${health.percent}%). Ideal candidate for assignment.`;
      }

      return {
        employee: usr,
        currentPoints,
        remainingCapacity,
        capacityPercent: health.percent,
        status: health.status,
        isRecommended,
        reason,
      };
    });

    // Sort by most available capacity
    return recommendations.sort((a, b) => b.remainingCapacity - a.remainingCapacity);
  }
}
