import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import type { Role } from '@/features/auth/types';

interface RequireRoleProps {
  children: React.ReactNode;
  role: Role;
}

export const RequireRole = ({ children, role }: RequireRoleProps) => {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (profile?.role !== role) {
    return <Navigate to="/admin" replace />;
  }

  return <>{children}</>;
};
