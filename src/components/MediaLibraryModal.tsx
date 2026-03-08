import { useEffect, useMemo, useState } from 'react';
import { getMediaLibrary, uploadMedia, type MediaItem } from '@/services/media';

interface MediaLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (url: string) => void;
}

type Tab = 'upload' | 'library';

export const MediaLibraryModal = ({
  isOpen,
  onClose,
  onSelect,
}: MediaLibraryModalProps) => {
  const [activeTab, setActiveTab] = useState<Tab>('upload');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [media, setMedia] = useState<MediaItem[]>([]);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [libraryError, setLibraryError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    if (activeTab !== 'library') return;

    const load = async () => {
      setLibraryLoading(true);
      setLibraryError(null);
      try {
        const items = await getMediaLibrary();
        setMedia(items);
      } catch (err) {
        setLibraryError(
          err instanceof Error
            ? err.message
            : 'No se pudo cargar la biblioteca de medios.',
        );
      } finally {
        setLibraryLoading(false);
      }
    };

    load();
  }, [isOpen, activeTab]);

  const filteredMedia = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return media;
    return media.filter((item) =>
      item.name.toLowerCase().includes(term),
    );
  }, [media, search]);

  const handleFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadProgress(0);
    setUploadError(null);

    try {
      const item = await uploadMedia(file, (p) => setUploadProgress(p));
      setMedia((prev) => [item, ...prev]);
      setActiveTab('library');
    } catch (err) {
      setUploadError(
        err instanceof Error
          ? err.message
          : 'No se pudo subir el archivo.',
      );
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleBackdropClick = (
    e: React.MouseEvent<HTMLDivElement>,
  ) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/80"
      onClick={handleBackdropClick}
    >
      <div className="relative w-full max-w-4xl max-h-[80vh] rounded-xl border border-slate-800 bg-slate-950 shadow-xl overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
          <div>
            <h2 className="text-sm font-semibold text-slate-100">
              Biblioteca de medios
            </h2>
            <p className="text-xs text-slate-500">
              Sube imágenes y selecciona archivos para usarlos en tus
              productos.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-slate-400 hover:text-slate-100"
          >
            Cerrar
          </button>
        </div>

        <div className="flex border-b border-slate-800 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`px-4 py-2 border-b-2 ${
              activeTab === 'upload'
                ? 'border-brand-500 text-brand-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Subir archivos
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('library')}
            className={`px-4 py-2 border-b-2 ${
              activeTab === 'library'
                ? 'border-brand-500 text-brand-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Biblioteca
          </button>
        </div>

        <div className="flex-1 overflow-hidden">
          {activeTab === 'upload' && (
            <div className="p-4 space-y-4">
              <div
                className="border border-dashed border-slate-700 rounded-lg p-6 text-center text-xs text-slate-400 bg-slate-950/60"
              >
                <p className="mb-3">
                  Arrastra y suelta una imagen aquí o selecciona un
                  archivo. Tamaño máximo 2MB.
                </p>
                <label className="inline-flex items-center justify-center px-3 py-2 rounded-md bg-brand-600 text-xs font-semibold text-white cursor-pointer hover:bg-brand-700">
                  Elegir archivo
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileChange}
                    disabled={uploading}
                  />
                </label>
              </div>

              {uploading && (
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span>Subiendo archivo...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="h-1 w-full rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-brand-500 transition-all"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {uploadError && (
                <div className="text-[11px] text-rose-300">
                  {uploadError}
                </div>
              )}
            </div>
          )}

          {activeTab === 'library' && (
            <div className="flex h-full flex-col">
              <div className="p-3 border-b border-slate-800 flex items-center gap-2">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar por nombre..."
                  className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-600"
                />
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                {libraryLoading && (
                  <p className="text-xs text-slate-400">
                    Cargando biblioteca de medios...
                  </p>
                )}
                {libraryError && (
                  <p className="text-xs text-rose-300">{libraryError}</p>
                )}
                {!libraryLoading && !libraryError && filteredMedia.length === 0 && (
                  <p className="text-xs text-slate-400">
                    No hay imágenes en la biblioteca.
                  </p>
                )}
                {!libraryLoading && !libraryError && filteredMedia.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {filteredMedia.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          onSelect(item.url);
                          onClose();
                        }}
                        className="group rounded-lg border border-slate-800 bg-slate-950/80 overflow-hidden text-left"
                      >
                        <div className="aspect-square overflow-hidden bg-slate-900">
                          <img
                            src={item.url}
                            alt={item.name}
                            className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                          />
                        </div>
                        <div className="px-2 py-1.5">
                          <p className="truncate text-[11px] text-slate-100">
                            {item.name}
                          </p>
                          <p className="text-[10px] text-slate-500">
                            {(item.size / 1024).toFixed(0)} KB
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

