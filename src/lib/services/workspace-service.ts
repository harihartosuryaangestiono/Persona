import { prisma } from '@/lib/db';
import { eventBus } from '@/lib/event-bus';

export interface WorkspaceItem {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  ownerId: string;
  billingPlan: string;
  createdAt: string;
}

export const DEFAULT_WORKSPACE: WorkspaceItem = {
  id: 'ws-persona',
  name: 'Persona OS Agency',
  slug: 'persona-os',
  logo: 'https://avatar.vercel.sh/persona-os',
  ownerId: 'u-devi',
  billingPlan: 'ENTERPRISE',
  createdAt: new Date().toISOString(),
};

export class WorkspaceService {
  static async getWorkspacesForUser(userId: string): Promise<WorkspaceItem[]> {
    try {
      const dbWorkspaces = await prisma.workspace.findMany();
      if (dbWorkspaces.length === 0) {
        return [DEFAULT_WORKSPACE];
      }
      return dbWorkspaces.map((w) => ({
        ...w,
        logo: w.logo || undefined,
        createdAt: w.createdAt.toISOString(),
      }));
    } catch (e) {
      return [DEFAULT_WORKSPACE];
    }
  }

  static async createWorkspace(name: string, ownerId: string): Promise<WorkspaceItem> {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const newWs = await prisma.workspace.create({
      data: {
        name,
        slug,
        ownerId,
        billingPlan: 'ENTERPRISE',
      },
    });

    eventBus.emit({
      type: 'WorkspaceCreated',
      workspaceId: newWs.id,
      userId: ownerId,
      entityId: newWs.id,
      entityTitle: name,
    });

    return {
      ...newWs,
      logo: newWs.logo || undefined,
      createdAt: newWs.createdAt.toISOString(),
    };
  }
}
