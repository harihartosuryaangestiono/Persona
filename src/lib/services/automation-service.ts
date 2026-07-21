import { eventBus, SystemEventPayload } from '@/lib/event-bus';

export interface AutomationRuleItem {
  id: string;
  name: string;
  triggerEvent: string;
  actions: string[];
  active: boolean;
}

export const DEFAULT_AUTOMATIONS: AutomationRuleItem[] = [
  {
    id: 'auto-1',
    name: 'Auto-Schedule Approved Tasks & Update Client Budget',
    triggerEvent: 'TaskApproved',
    actions: [
      'Move status to Scheduling',
      'Notify Scheduler (Dindong)',
      'Deduct task points from Client Monthly Budget',
      'Create Activity Log record',
    ],
    active: true,
  },
  {
    id: 'auto-2',
    name: 'Capacity Overload Alert',
    triggerEvent: 'CapacityExceeded',
    actions: [
      'Notify Owner/Devi',
      'Trigger AI Workload Optimizer Rebalancing recommendation',
    ],
    active: true,
  },
];

export class AutomationService {
  static init() {
    eventBus.subscribe('TaskApproved', (payload) => {
      console.log('⚡ [Automation Engine] Triggered TaskApproved rule for task:', payload.entityTitle);
    });

    eventBus.subscribe('WorklogImported', (payload) => {
      console.log('⚡ [Automation Engine] Worklogs imported. Updating capacity metrics.');
    });
  }
}
