import type { Metadata } from 'next';
import './globals.css';
import { UserProvider } from '@/context/UserContext';
import { DataProvider } from '@/context/DataContext';
import { WorkspaceProvider } from '@/context/WorkspaceContext';
import { AuthWrapper } from '@/components/layout/AuthWrapper';

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
              <AuthWrapper>
                {children}
              </AuthWrapper>
            </DataProvider>
          </WorkspaceProvider>
        </UserProvider>
      </body>
    </html>
  );
}
