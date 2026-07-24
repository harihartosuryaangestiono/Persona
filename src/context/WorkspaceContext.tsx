'use client';

import React, { createContext, useContext, useState } from 'react';
import { WorkspaceItem, DEFAULT_WORKSPACE, WORKSPACES } from '@/lib/services/workspace-service';

interface WorkspaceContextType {
  currentWorkspace: WorkspaceItem;
  workspaces: WorkspaceItem[];
  switchWorkspace: (workspaceId: string) => void;
  createWorkspace: (name: string) => void;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [workspaces, setWorkspaces] = useState<WorkspaceItem[]>(WORKSPACES);
  const [currentWorkspace, setCurrentWorkspace] = useState<WorkspaceItem>(DEFAULT_WORKSPACE);

  const switchWorkspace = (workspaceId: string) => {
    const found = workspaces.find((w) => w.id === workspaceId);
    if (found) setCurrentWorkspace(found);
  };

  const createWorkspace = (name: string) => {
    const newWs: WorkspaceItem = {
      id: `ws-${Date.now()}`,
      name,
      slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      logo: '',
      ownerId: 'u-devi',
      billingPlan: 'ENTERPRISE',
      createdAt: new Date().toISOString(),
    };
    setWorkspaces((prev) => [...prev, newWs]);
    setCurrentWorkspace(newWs);
  };

  return (
    <WorkspaceContext.Provider
      value={{
        currentWorkspace,
        workspaces,
        switchWorkspace,
        createWorkspace,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) throw new Error('useWorkspace must be used within WorkspaceProvider');
  return context;
}
