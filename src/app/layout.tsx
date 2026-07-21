import type { Metadata } from 'next';
import './globals.css';
import { UserProvider } from '@/context/UserContext';
import { DataProvider } from '@/context/DataContext';
import { WorkspaceProvider } from '@/context/WorkspaceContext';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { FloatingQuickAction } from '@/components/layout/FloatingQuickAction';

export const metadata: Metadata = {
  title: 'Persona OS — Minimalist Agency Operating System',
  description: 'Role-Based Experience Agency Operating System designed after Apple, Linear, Notion, Vercel & Arc Browser.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#F8F9FB] text-neutral-900 flex antialiased selection:bg-neutral-900 selection:text-white font-sans">
        <UserProvider>
          <WorkspaceProvider>
            <DataProvider>
              <div className="flex min-h-screen w-full relative bg-[#F8F9FB]">
                <Sidebar />
                <div className="flex-1 flex flex-col min-w-0">
                  <Header />
                  <main className="flex-1 p-6 md:p-8 overflow-y-auto max-w-7xl mx-auto w-full space-y-8">
                    {children}
                  </main>
                </div>
                <FloatingQuickAction />
              </div>
            </DataProvider>
          </WorkspaceProvider>
        </UserProvider>
      </body>
    </html>
  );
}
