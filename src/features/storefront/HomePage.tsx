import { useEffect, useState } from 'react';
import { getPublishedPageBySlug } from '@/services/pages';
import { useStorefront } from '@/contexts/StorefrontContext';

export const HomePage = () => {
  const { settings } = useStorefront();
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [homePage, setHomePage] = useState<Awaited<ReturnType<typeof getPublishedPageBySlug>>>(null);

  const carouselImages =
    (homePage?.carouselImages?.length ? homePage.carouselImages : null) ??
    settings?.carouselImages ??
    [];
  const homeContent = homePage?.content?.trim() ?? '';

  useEffect(() => {
    let isMounted = true;
    getPublishedPageBySlug('inicio').then((p) => {
      if (isMounted) setHomePage(p);
    });
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (carouselImages.length <= 1) return;
    const t = setInterval(() => {
      setCarouselIndex((i) => (i + 1) % carouselImages.length);
    }, 5000);
    return () => clearInterval(t);
  }, [carouselImages.length]);

  return (
    <div className="flex flex-col">
      {/* Carrusel */}
      {carouselImages.length > 0 ? (
        <section className="relative w-full aspect-[21/9] md:aspect-[3/1] bg-slate-900 overflow-hidden">
          {carouselImages.map((url, i) => (
            <div
              key={`${url}-${i}`}
              className={`absolute inset-0 transition-opacity duration-500 ${
                i === carouselIndex ? 'opacity-100 z-10' : 'opacity-0 z-0'
              }`}
            >
              <img
                src={url}
                alt=""
                className="w-full h-full object-cover"
              />
            </div>
          ))}
          {carouselImages.length > 1 && (
            <div className="absolute bottom-3 left-0 right-0 z-20 flex justify-center gap-2">
              {carouselImages.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`Slide ${i + 1}`}
                  onClick={() => setCarouselIndex(i)}
                  className={`h-2 rounded-full transition-all ${
                    i === carouselIndex ? 'w-6 bg-white' : 'w-2 bg-white/50'
                  }`}
                />
              ))}
            </div>
          )}
        </section>
      ) : null}

      {/* Contenido HTML personalizado (debajo del carrusel) */}
      {homeContent ? (
        <section
          className="max-w-7xl mx-auto w-full px-4 py-6 prose prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: homeContent }}
        />
      ) : null}
    </div>
  );
};
