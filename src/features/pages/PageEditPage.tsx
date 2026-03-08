import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getPageById, updatePage, type Page, type PagePayload } from '@/services/pages';
import { MediaLibraryModal } from '@/components/MediaLibraryModal';

export const PageEditPage = () => {
  const { pageId } = useParams<{ pageId: string }>();
  const [page, setPage] = useState<(Page & { id: string }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mediaTarget, setMediaTarget] = useState<'carousel' | null>(null);

  useEffect(() => {
    if (!pageId) return;
    getPageById(pageId)
      .then(setPage)
      .finally(() => setLoading(false));
  }, [pageId]);

  const handleSave = async () => {
    if (!page) return;
    setSaving(true);
    try {
      const payload: Partial<PagePayload> = {
        title: page.title,
        headInject: page.headInject,
        bodyInject: page.bodyInject,
        status: page.status,
      };
      if (page.type === 'custom') {
        payload.content = page.content;
      }
      if (page.slug === 'inicio') {
        payload.content = page.content;
        payload.carouselImages = page.carouselImages;
      }
      await updatePage(page.id!, payload);
      setPage((p) => (p ? { ...p, ...payload } : null));
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleAddCarouselImage = (url: string) => {
    if (!page) return;
    setPage((p) =>
      p ? { ...p, carouselImages: [...(p.carouselImages ?? []), url] } : null,
    );
  };
  const handleRemoveCarouselImage = (index: number) => {
    if (!page) return;
    const next = (page.carouselImages ?? []).filter((_, i) => i !== index);
    setPage((p) => (p ? { ...p, carouselImages: next } : null));
  };

  if (loading || !page) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-slate-100">Editar página: {page.title}</h1>
        <div className="flex items-center gap-3">
          <a
            href={`/${page.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg px-4 py-2 text-sm font-medium bg-slate-700 text-slate-200 hover:bg-slate-600"
          >
            Ver página
          </a>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg px-4 py-2 text-sm font-medium bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>

      <div className="space-y-6 rounded-xl border border-slate-800 bg-slate-950/60 p-6">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Título</label>
          <input
            value={page.title}
            onChange={(e) => setPage((p) => (p ? { ...p, title: e.target.value } : null))}
            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100"
          />
        </div>

        {page.type === 'custom' && (
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Contenido HTML
            </label>
            <textarea
              value={page.content}
              onChange={(e) => setPage((p) => (p ? { ...p, content: e.target.value } : null))}
              rows={16}
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 font-mono text-sm"
              placeholder="<h1>Mi página</h1>..."
            />
          </div>
        )}

        {page.slug === 'inicio' && (
          <>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Carrusel de la portada
              </label>
              <p className="text-xs text-slate-500 mb-2">
                Imágenes a ancho completo en la parte superior de la página de inicio.
              </p>
              <div className="flex flex-wrap gap-3">
                {(page.carouselImages ?? []).map((url, i) => (
                  <div key={`${url}-${i}`} className="relative group">
                    <img
                      src={url}
                      alt=""
                      className="h-20 w-32 object-cover rounded-lg border border-slate-700"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveCarouselImage(i)}
                      className="absolute inset-0 rounded-lg bg-slate-900/80 opacity-0 group-hover:opacity-100 flex items-center justify-center text-rose-400 text-xs"
                    >
                      Quitar
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setMediaTarget('carousel')}
                  className="h-20 w-32 rounded-lg border border-dashed border-slate-600 flex items-center justify-center text-slate-500 text-xs hover:border-slate-500 hover:text-slate-400"
                >
                  + Añadir imagen
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Contenido HTML (debajo del carrusel)
              </label>
              <p className="text-xs text-slate-500 mb-1">
                HTML personalizado que se muestra entre el carrusel y la grilla de productos.
              </p>
              <textarea
                value={page.content}
                onChange={(e) => setPage((p) => (p ? { ...p, content: e.target.value } : null))}
                rows={10}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 font-mono text-sm"
                placeholder="<section>...</section>"
              />
            </div>
          </>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">
            Inyectar en &lt;head&gt; (scripts, estilos)
          </label>
          <textarea
            value={page.headInject}
            onChange={(e) => setPage((p) => (p ? { ...p, headInject: e.target.value } : null))}
            rows={4}
            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 font-mono text-sm"
            placeholder="<style>...</style> o <script>...</script>"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">
            Inyectar al final del &lt;body&gt; (scripts)
          </label>
          <textarea
            value={page.bodyInject}
            onChange={(e) => setPage((p) => (p ? { ...p, bodyInject: e.target.value } : null))}
            rows={4}
            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 font-mono text-sm"
            placeholder="<script>...</script>"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Estado</label>
          <select
            value={page.status}
            onChange={(e) =>
              setPage((p) =>
                p ? { ...p, status: e.target.value as Page['status'] } : null,
              )
            }
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100"
          >
            <option value="publicado">Publicado</option>
            <option value="borrador">Borrador</option>
            <option value="papelera">Papelera</option>
          </select>
        </div>
      </div>
      {page.slug === 'inicio' && mediaTarget === 'carousel' && (
        <MediaLibraryModal
          isOpen
          onClose={() => setMediaTarget(null)}
          onSelect={(url) => {
            handleAddCarouselImage(url);
            setMediaTarget(null);
          }}
        />
      )}
    </div>
  );
};
