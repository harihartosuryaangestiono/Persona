'use client';

import React from 'react';
import { useUser } from '@/context/UserContext';
import { LoginPage } from './LoginPage';
import { WelcomeModal } from './WelcomeModal';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { FloatingQuickAction } from './FloatingQuickAction';
import PersonaAIFloatingWidget from '../persona-ai/PersonaAIFloatingWidget';

interface AuthWrapperProps {
  children: React.ReactNode;
}

export function AuthWrapper({ children }: AuthWrapperProps) {
  const { isLoggedIn } = useUser();

  if (!isLoggedIn) {
    return <LoginPage />;
  }

  return (
    <div className="flex min-h-screen w-full relative bg-[#F8F9FB] animate-fadeIn">
      <div className="print:hidden flex shrink-0">
        <Sidebar />
      </div>
      <div className="flex-1 flex flex-col min-w-0">
        <div className="print:hidden">
          <Header />
        </div>
        <main className="flex-1 p-6 md:p-8 overflow-y-auto max-w-7xl mx-auto w-full space-y-8 print:p-0 print:max-w-full print:space-y-4">
          {children}
        </main>
      </div>
      <div className="print:hidden">
        <PersonaAIFloatingWidget />
        <WelcomeModal />
      </div>
    </div>
  );
}
