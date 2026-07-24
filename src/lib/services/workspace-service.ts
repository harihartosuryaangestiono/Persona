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

export const WORKSPACES: WorkspaceItem[] = [
  {
    id: 'ws-team-anggi',
    name: 'Persona OS - Team Anggi',
    slug: 'persona-os-team-anggi',
    logo: 'https://avatar.vercel.sh/team-anggi',
    ownerId: 'u-devi',
    billingPlan: 'ENTERPRISE',
    createdAt: new Date('2026-07-24T00:00:00Z').toISOString(),
  },
  {
    id: 'ws-inhouse',
    name: 'Persona OS - Inhouse',
    slug: 'persona-os-inhouse',
    logo: 'https://avatar.vercel.sh/inhouse',
    ownerId: 'u-devi',
    billingPlan: 'ENTERPRISE',
    createdAt: new Date('2026-07-24T00:00:00Z').toISOString(),
  },
];

export const DEFAULT_WORKSPACE = WORKSPACES[0];

export class WorkspaceService {
  static async getWorkspacesForUser(userId: string): Promise<WorkspaceItem[]> {
    try {
      const dbWorkspaces = await prisma.workspace.findMany();
      if (dbWorkspaces.length === 0) {
        return WORKSPACES;
      }
      return dbWorkspaces.map((w) => ({
        ...w,
        logo: w.logo || undefined,
        createdAt: w.createdAt.toISOString(),
      }));
    } catch (e) {
      return WORKSPACES;
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
