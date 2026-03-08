import { useEffect, useState } from 'react';
import { listUsers, setUserRole } from '@/services/users';
import { useAuth } from '@/contexts/AuthContext';
import type { Role, UserProfile } from '@/features/auth/types';
import { ROLE_LABELS } from '@/features/auth/types';

type LoadingState = 'idle' | 'loading' | 'success' | 'error';

export const UsersPage = () => {
  const { profile } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loadingState, setLoadingState] = useState<LoadingState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [updatingUid, setUpdatingUid] = useState<string | null>(null);

  const isAdmin = profile?.role === 'admin';
  const isLoading = loadingState === 'loading' || loadingState === 'idle';

  useEffect(() => {
    if (!isAdmin) return;

    let isMounted = true;

    const load = async () => {
      setLoadingState('loading');
      setError(null);
      try {
        const data = await listUsers();
        if (!isMounted) return;
        setUsers(data);
        setLoadingState('success');
      } catch (err) {
        if (!isMounted) return;
        const message =
          err instanceof Error
            ? err.message
            : 'Ha ocurrido un error al cargar los usuarios.';
        setError(message);
        setLoadingState('error');
      }
    };

    load();

    return () => {
      isMounted = false;
    };
  }, [isAdmin]);

  const handleRoleChange = async (uid: string, newRole: Role) => {
    try {
      setUpdatingUid(uid);
      setError(null);
      await setUserRole(uid, newRole);
      setUsers((prev) =>
        prev.map((u) => (u.uid === uid ? { ...u, role: newRole } : u)),
      );
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'No se pudo actualizar el rol del usuario.';
      setError(message);
    } finally {
      setUpdatingUid(null);
    }
  };

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-50">
          Usuarios
        </h1>
        <p className="text-sm text-slate-400">
          Gestiona los perfiles y roles de los usuarios del panel.
        </p>
      </div>

      <div className="bg-slate-950/60 border border-slate-800 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-800">
          <div className="text-xs text-slate-400">
            {isLoading && 'Cargando usuarios...'}
            {!isLoading && users.length === 0 && 'No hay usuarios con perfil aún.'}
            {!isLoading &&
              users.length > 0 &&
              `${users.length} usuario(s) en el sistema.`}
          </div>
        </div>

        {error && (
          <div className="px-4 py-2 text-xs text-rose-100 bg-rose-950/40 border-b border-rose-500/40">
            {error}
          </div>
        )}

        <div className="relative overflow-x-auto">
          <table className="min-w-full text-left text-xs text-slate-200">
            <thead className="bg-slate-950/80 border-b border-slate-800">
              <tr>
                <th className="px-4 py-3 font-medium text-slate-400 uppercase tracking-wide text-[11px]">
                  Email
                </th>
                <th className="px-4 py-3 font-medium text-slate-400 uppercase tracking-wide text-[11px]">
                  Nombre
                </th>
                <th className="px-4 py-3 font-medium text-slate-400 uppercase tracking-wide text-[11px]">
                  Rol
                </th>
                <th className="px-4 py-3 font-medium text-slate-400 uppercase tracking-wide text-[11px] text-right">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {isLoading &&
                Array.from({ length: 3 }).map((_, index) => (
                  <tr key={index} className="animate-pulse">
                    <td className="px-4 py-3">
                      <div className="h-3 w-40 rounded-full bg-slate-800" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-3 w-24 rounded-full bg-slate-800" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-5 w-20 rounded-full bg-slate-800" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-7 w-24 rounded-md bg-slate-800 ml-auto" />
                    </td>
                  </tr>
                ))}

              {!isLoading &&
                users.map((u) => (
                  <tr key={u.uid} className="hover:bg-slate-900/60 transition-colors">
                    <td className="px-4 py-3 align-middle">
                      <span className="text-slate-100">{u.email}</span>
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <span className="text-slate-300">
                        {u.displayName || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <span className="text-[11px] text-slate-300">
                        {ROLE_LABELS[u.role]}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-middle text-right">
                      <select
                        value={u.role}
                        onChange={(e) =>
                          handleRoleChange(u.uid, e.target.value as Role)
                        }
                        disabled={updatingUid === u.uid}
                        className="rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-[11px] text-slate-100 focus:outline-none focus:ring-1 focus:ring-brand-600 disabled:opacity-60"
                      >
                        {(Object.entries(ROLE_LABELS) as [Role, string][]).map(
                          ([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ),
                        )}
                      </select>
                      {updatingUid === u.uid && (
                        <span className="ml-2 text-[10px] text-slate-500">
                          Guardando...
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
