import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  getPages,
  ensureSystemPages,
  updatePage,
  deletePage,
  createPage,
  isSystemSlug,
  getPageBySlug,
  type Page,
} from '@/services/pages';

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

export const PagesListPage = () => {
  const navigate = useNavigate();
  const [pages, setPages] = useState<(Page & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    ensureSystemPages()
      .then(() => getPages())
      .then((list) => {
        if (isMounted) setPages(list);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleMoveToTrash = async (id: string, slug: string) => {
    if (isSystemSlug(slug)) return;
    if (!window.confirm('¿Mover esta página a la papelera?')) return;
    try {
      await updatePage(id, { status: 'papelera' });
      setPages((prev) => prev.map((p) => (p.id === id ? { ...p, status: 'papelera' } : p)));
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error al mover a papelera');
    }
  };

  const handleDelete = async (id: string, slug: string) => {
    if (isSystemSlug(slug)) return;
    if (!window.confirm('¿Eliminar definitivamente esta página?')) return;
    try {
      await deletePage(id);
      setPages((prev) => prev.filter((p) => p.id !== id));
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error al eliminar');
    }
  };

  const handleNewPage = async () => {
    const title = window.prompt('Título de la nueva página');
    if (!title?.trim()) return;
    const slug = slugify(title.trim());
    const existing = await getPageBySlug(slug);
    if (existing) {
      alert('Ya existe una página con ese slug. Elige otro título.');
      return;
    }
    try {
      const id = await createPage({
        title: title.trim(),
        slug,
        type: 'custom',
        content: '',
        headInject: '',
        bodyInject: '',
        status: 'borrador',
      });
      setPages((prev) => [{ id, title: title.trim(), slug, type: 'custom', content: '', headInject: '', bodyInject: '', status: 'borrador', createdAt: new Date().toISOString() } as Page & { id: string }, ...prev]);
      navigate(`/admin/paginas/${id}/editar`);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error al crear');
    }
  };

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      publicado: 'bg-emerald-500/20 text-emerald-300',
      borrador: 'bg-amber-500/20 text-amber-300',
      papelera: 'bg-slate-500/20 text-slate-400',
    };
    return (
      <span className={`rounded px-2 py-0.5 text-xs ${styles[status] ?? 'bg-slate-500/20'}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-slate-100">Páginas</h1>
        <button
          type="button"
          onClick={handleNewPage}
          className="rounded-lg px-4 py-2 text-sm font-medium bg-brand-600 text-white hover:bg-brand-700"
        >
          Nueva página
        </button>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-12 rounded-lg bg-slate-800" />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-950/60">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/80">
                <th className="text-left px-4 py-3 text-slate-300 font-medium">Título</th>
                <th className="text-left px-4 py-3 text-slate-300 font-medium">Slug</th>
                <th className="text-left px-4 py-3 text-slate-300 font-medium">Tipo</th>
                <th className="text-left px-4 py-3 text-slate-300 font-medium">Estado</th>
                <th className="text-right px-4 py-3 text-slate-300 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {pages.map((p) => (
                <tr key={p.id} className="border-b border-slate-800/80 hover:bg-slate-800/30">
                  <td className="px-4 py-3 text-slate-200">{p.title}</td>
                  <td className="px-4 py-3 text-slate-400 font-mono">{p.slug}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-slate-400">
                      {p.type === 'system' ? 'Sistema' : 'Personalizada'}
                    </span>
                  </td>
                  <td className="px-4 py-3">{statusBadge(p.status)}</td>
                  <td className="px-4 py-3 text-right">
                    <a
                      href={`/${p.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand-400 hover:text-brand-300 mr-3"
                    >
                      Ver
                    </a>
                    <Link
                      to={`/admin/paginas/${p.id}/editar`}
                      className="text-slate-300 hover:text-white mr-3"
                    >
                      Editar
                    </Link>
                    {!isSystemSlug(p.slug) && (
                      <>
                        {p.status !== 'papelera' ? (
                          <button
                            type="button"
                            onClick={() => handleMoveToTrash(p.id!, p.slug)}
                            className="text-amber-400 hover:text-amber-300 mr-3"
                          >
                            Papelera
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleDelete(p.id!, p.slug)}
                            className="text-rose-400 hover:text-rose-300"
                          >
                            Eliminar
                          </button>
                        )}
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
