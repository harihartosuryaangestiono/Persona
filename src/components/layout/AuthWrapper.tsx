'use client';

import React from 'react';
import { useUser } from '@/context/UserContext';
import { LoginPage } from './LoginPage';
import { WelcomeModal } from './WelcomeModal';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { FloatingQuickAction } from './FloatingQuickAction';

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
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="flex-1 p-6 md:p-8 overflow-y-auto max-w-7xl mx-auto w-full space-y-8">
          {children}
        </main>
      </div>
      <FloatingQuickAction />
      <WelcomeModal />
    </div>
  );
}
