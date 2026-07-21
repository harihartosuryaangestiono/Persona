export type EventType =
  | 'TaskCreated'
  | 'TaskAssigned'
  | 'TaskMoved'
  | 'TaskCompleted'
  | 'TaskApproved'
  | 'TaskRejected'
  | 'WorklogImported'
  | 'AttendanceClockIn'
  | 'AttendanceClockOut'
  | 'LeaveSubmitted'
  | 'LeaveApproved'
  | 'BudgetExceeded'
  | 'CapacityExceeded'
  | 'WorkspaceCreated';

export interface SystemEventPayload {
  type: EventType;
  workspaceId?: string;
  userId?: string;
  userName?: string;
  entityId?: string;
  entityTitle?: string;
  data?: any;
  timestamp: string;
}

type EventListener = (payload: SystemEventPayload) => void;

class SystemEventBus {
  private listeners: Map<EventType, Set<EventListener>> = new Map();

  subscribe(eventType: EventType, listener: EventListener): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(listener);

    // Return unsubscribe function
    return () => {
      this.listeners.get(eventType)?.delete(listener);
    };
  }

  emit(payload: Omit<SystemEventPayload, 'timestamp'>) {
    const fullPayload: SystemEventPayload = {
      ...payload,
      timestamp: new Date().toISOString(),
    };

    const eventListeners = this.listeners.get(payload.type);
    if (eventListeners) {
      eventListeners.forEach((listener) => {
        try {
          listener(fullPayload);
        } catch (err) {
          console.error(`Error in EventBus listener for ${payload.type}:`, err);
        }
      });
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`⚡ [System Event Bus] Emitted: ${payload.type}`, fullPayload);
    }
  }
}

export const eventBus = new SystemEventBus();
