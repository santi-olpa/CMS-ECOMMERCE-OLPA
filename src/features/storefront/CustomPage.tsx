import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getPublishedPageBySlug } from '@/services/pages';
import { NotFoundPage } from './NotFoundPage';

/**
 * Parsea un string de HTML e inyecta los nodos en el target (head o body).
 * Devuelve los nodos añadidos para poder eliminarlos en el cleanup.
 */
function injectHtml(html: string, target: 'head' | 'body'): Node[] {
  if (!html.trim()) return [];
  const container = document.createElement('div');
  container.innerHTML = html;
  const nodes: Node[] = [];
  const dest = target === 'head' ? document.head : document.body;
  while (container.firstChild) {
    const node = container.firstChild;
    dest.appendChild(node);
    nodes.push(node);
  }
  return nodes;
}

export const CustomPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const injectedRef = useRef<{ head: Node[]; body: Node[] }>({ head: [], body: [] });

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    setNotFound(false);
    getPublishedPageBySlug(slug)
      .then((page) => {
        if (!page) {
          setNotFound(true);
          setContent('');
          return;
        }
        if (page.type !== 'custom') {
          setNotFound(true);
          return;
        }
        setContent(page.content);
        const headNodes = injectHtml(page.headInject || '', 'head');
        const bodyNodes = injectHtml(page.bodyInject || '', 'body');
        injectedRef.current = { head: headNodes, body: bodyNodes };
      })
      .finally(() => setLoading(false));

    return () => {
      injectedRef.current.head.forEach((n) => n.parentNode?.removeChild(n));
      injectedRef.current.body.forEach((n) => n.parentNode?.removeChild(n));
      injectedRef.current = { head: [], body: [] };
    };
  }, [slug]);

  useEffect(() => {
    return () => {
      injectedRef.current.head.forEach((n) => n.parentNode?.removeChild(n));
      injectedRef.current.body.forEach((n) => n.parentNode?.removeChild(n));
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-teal-500 border-t-transparent" />
      </div>
    );
  }

  if (notFound) {
    return <NotFoundPage />;
  }

  return (
    <div
      className="prose prose-invert max-w-none px-4 py-8 mx-auto"
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
};
