import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getPublishedPageBySlug } from '@/services/pages';
import { HomePage } from './HomePage';
import { NotFoundPage } from './NotFoundPage';
import { CustomPage } from './CustomPage';

const RESERVED_SLUGS = new Set(['tienda', 'producto', 'checkout', 'registro', 'mi-cuenta', 'favoritos']);

function InjectPageAssets({
  headInject,
  bodyInject,
  children,
}: {
  headInject: string;
  bodyInject: string;
  children: React.ReactNode;
}) {
  const headRef = useRef<Node[]>([]);
  const bodyRef = useRef<Node[]>([]);

  useEffect(() => {
    if (headInject.trim()) {
      const div = document.createElement('div');
      div.innerHTML = headInject;
      const nodes: Node[] = [];
      while (div.firstChild) {
        const n = div.firstChild;
        document.head.appendChild(n);
        nodes.push(n);
      }
      headRef.current = nodes;
    }
    if (bodyInject.trim()) {
      const div = document.createElement('div');
      div.innerHTML = bodyInject;
      const nodes: Node[] = [];
      while (div.firstChild) {
        const n = div.firstChild;
        document.body.appendChild(n);
        nodes.push(n);
      }
      bodyRef.current = nodes;
    }
    return () => {
      headRef.current.forEach((n) => n.parentNode?.removeChild(n));
      bodyRef.current.forEach((n) => n.parentNode?.removeChild(n));
      headRef.current = [];
      bodyRef.current = [];
    };
  }, [headInject, bodyInject]);

  return <>{children}</>;
}

export const PageBySlug = () => {
  const { slug } = useParams<{ slug: string }>();
  const [resolved, setResolved] = useState<
    | { type: 'custom' }
    | { type: 'system'; slug: string; headInject: string; bodyInject: string }
    | { type: 'notfound' }
    | null
  >(null);

  useEffect(() => {
    if (!slug) {
      setResolved({ type: 'notfound' });
      return;
    }
    if (RESERVED_SLUGS.has(slug)) {
      setResolved({ type: 'notfound' });
      return;
    }
    getPublishedPageBySlug(slug)
      .then((page) => {
        if (!page) {
          setResolved({ type: 'notfound' });
          return;
        }
        if (page.type === 'custom') {
          setResolved({ type: 'custom' });
          return;
        }
        setResolved({
          type: 'system',
          slug: page.slug,
          headInject: page.headInject ?? '',
          bodyInject: page.bodyInject ?? '',
        });
      })
      .catch(() => setResolved({ type: 'notfound' }));
  }, [slug]);

  if (resolved === null) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-teal-500 border-t-transparent" />
      </div>
    );
  }

  if (resolved.type === 'notfound') {
    return <NotFoundPage />;
  }

  if (resolved.type === 'custom') {
    return <CustomPage />;
  }

  if (resolved.slug === 'inicio') {
    return (
      <InjectPageAssets headInject={resolved.headInject} bodyInject={resolved.bodyInject}>
        <HomePage />
      </InjectPageAssets>
    );
  }

  if (resolved.slug === 'carrito') {
    return (
      <InjectPageAssets headInject={resolved.headInject} bodyInject={resolved.bodyInject}>
        <div className="p-6 text-slate-300">
          El carrito se gestiona desde el widget del header. Puedes configurar scripts en esta
          página de sistema.
        </div>
      </InjectPageAssets>
    );
  }

  return <NotFoundPage />;
};
