import { ReactNode } from 'react';

interface DashboardLayoutProps {
  children: ReactNode;
}

export const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  return (
    <main className="flex-1 p-6 lg:p-8 bg-slate-900 overflow-y-auto">
      <div className="max-w-6xl mx-auto">
        {children}
      </div>
    </main>
  );
};

