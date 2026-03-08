import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useStorefront } from '@/contexts/StorefrontContext';
import { getProfile, updateUserProfile } from '@/services/users';
import type { ShippingAddress } from '@/features/auth/types';

const emptyShipping: ShippingAddress = {
  direccion: '',
  ciudad: '',
  provincia: '',
  codigoPostal: '',
};

export const CustomerProfilePage = () => {
  const { user } = useAuth();
  const { settings } = useStorefront();
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [shippingAddress, setShippingAddress] = useState<ShippingAddress>(emptyShipping);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<'saved' | 'error' | null>(null);

  const palette = settings?.colorPalette ?? { cardBackground: '#1e293b', primaryAction: '#0d9488' };
  const cardBg = palette.cardBackground;
  const primary = palette.primaryAction ?? '#0d9488';

  useEffect(() => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }
    getProfile(user.uid)
      .then((profile) => {
        if (profile) {
          setDisplayName(profile.displayName ?? '');
          setPhone(profile.phone ?? '');
          setShippingAddress(profile.shippingAddress ?? { ...emptyShipping });
        }
      })
      .finally(() => setLoading(false));
  }, [user?.uid]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.uid) return;
    setSaving(true);
    setMessage(null);
    try {
      await updateUserProfile(user.uid, {
        displayName: displayName.trim() || undefined,
        phone: phone.trim() || undefined,
        shippingAddress:
          shippingAddress.direccion || shippingAddress.ciudad || shippingAddress.provincia || shippingAddress.codigoPostal
            ? shippingAddress
            : null,
      });
      setMessage('saved');
    } catch {
      setMessage('error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/30 border-t-white" />
      </div>
    );
  }

  return (
    <section>
      <h2 className="text-lg font-semibold text-white mb-4">Mis Datos</h2>
      <form
        onSubmit={handleSubmit}
        className="rounded-xl border border-white/10 p-6 space-y-6 max-w-xl"
        style={{ backgroundColor: cardBg }}
      >
        {message === 'saved' && (
          <p className="text-sm text-emerald-300">Datos guardados correctamente.</p>
        )}
        {message === 'error' && (
          <p className="text-sm text-rose-300">Error al guardar. Intentá de nuevo.</p>
        )}

        <div>
          <label className="block text-sm font-medium text-white/80 mb-1">Nombre</label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-white/30"
            placeholder="Tu nombre"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-white/80 mb-1">Email</label>
          <p className="text-white/70 text-sm">{user?.email ?? '—'}</p>
          <p className="text-xs text-white/50 mt-0.5">El email no se puede cambiar desde aquí.</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-white/80 mb-1">Teléfono</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-white/30"
            placeholder="+54 11 1234-5678"
          />
        </div>

        <div className="border-t border-white/10 pt-4">
          <h3 className="text-sm font-semibold text-white mb-3">Dirección de envío</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-white/60 mb-1">Calle y número</label>
              <input
                type="text"
                value={shippingAddress.direccion}
                onChange={(e) =>
                  setShippingAddress((s) => ({ ...s, direccion: e.target.value }))
                }
                className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-white/30"
                placeholder="Calle, número, piso/depto"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-white/60 mb-1">Ciudad</label>
                <input
                  type="text"
                  value={shippingAddress.ciudad}
                  onChange={(e) =>
                    setShippingAddress((s) => ({ ...s, ciudad: e.target.value }))
                  }
                  className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-white/30"
                  placeholder="CABA"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-white/60 mb-1">Provincia</label>
                <input
                  type="text"
                  value={shippingAddress.provincia}
                  onChange={(e) =>
                    setShippingAddress((s) => ({ ...s, provincia: e.target.value }))
                  }
                  className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-white/30"
                  placeholder="Buenos Aires"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-white/60 mb-1">Código postal</label>
              <input
                type="text"
                value={shippingAddress.codigoPostal}
                onChange={(e) =>
                  setShippingAddress((s) => ({ ...s, codigoPostal: e.target.value }))
                }
                className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-white/30 max-w-[140px]"
                placeholder="1043"
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 disabled:cursor-not-allowed"
          style={{ backgroundColor: primary }}
        >
          {saving ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </form>
    </section>
  );
};
