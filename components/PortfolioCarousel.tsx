'use client';

import {useRef, useState} from 'react';
import Image from 'next/image';
import {ChevronLeft, ChevronRight, MoveHorizontal} from 'lucide-react';

const portfolio = [
  {
    src: '/portfolio-real-risco-v1.webp',
    title: 'Degradê com risco',
    alt: 'Degradê com risco curvo realizado na Vitinho Barber',
  },
  {
    src: '/portfolio-real-freestyle-v1.webp',
    title: 'Freestyle geométrico',
    alt: 'Corte masculino com freestyle geométrico realizado na Vitinho Barber',
  },
  {
    src: '/portfolio-real-mullet-prata-v1.webp',
    title: 'Mullet prata',
    alt: 'Mullet com tonalidade prata realizado na Vitinho Barber',
  },
  {
    src: '/portfolio-real-platinado-v1.webp',
    title: 'Platinado com desenho',
    alt: 'Corte platinado com desenho lateral realizado na Vitinho Barber',
  },
  {
    src: '/portfolio-real-infantil-v1.webp',
    title: 'Platinado infantil',
    alt: 'Corte infantil platinado com desenho realizado na Vitinho Barber',
  },
  {
    src: '/portfolio-real-mullet-texturizado-v1.webp',
    title: 'Mullet texturizado',
    alt: 'Mullet castanho texturizado realizado na Vitinho Barber',
  },
  {
    src: '/corte-luzes-v2.webp',
    title: 'Luzes e textura',
    alt: 'Corte masculino com luzes realizado na Vitinho Barber',
  },
  {
    src: '/corte-degrade-v2.webp',
    title: 'Degradê e freestyle',
    alt: 'Corte degradê com risco realizado na Vitinho Barber',
  },
  {
    src: '/corte-platinado-v2.webp',
    title: 'Platinado',
    alt: 'Corte platinado realizado na Vitinho Barber',
  },
];

export default function PortfolioCarousel() {
  const trackRef = useRef<HTMLDivElement>(null);
  const [current, setCurrent] = useState(0);

  function updateCurrent() {
    const track = trackRef.current;
    if (!track) return;

    const trackCenter = track.scrollLeft + track.clientWidth / 2;
    const cards = Array.from(track.querySelectorAll<HTMLElement>('figure'));
    let closestIndex = 0;
    let closestDistance = Number.POSITIVE_INFINITY;

    cards.forEach((card, index) => {
      const cardCenter = card.offsetLeft + card.offsetWidth / 2;
      const distance = Math.abs(cardCenter - trackCenter);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = index;
      }
    });

    setCurrent(closestIndex);
  }

  function goTo(index: number) {
    const nextIndex = Math.max(0, Math.min(index, portfolio.length - 1));
    const track = trackRef.current;
    const card = track?.querySelectorAll<HTMLElement>('figure')[nextIndex];
    if (!track || !card) return;

    track.scrollTo({
      left: card.offsetLeft - (track.clientWidth - card.offsetWidth) / 2,
      behavior: 'smooth',
    });
    setCurrent(nextIndex);
  }

  return (
    <div className="portfolioCarousel">
      <div className="portfolioCarouselTop">
        <span><MoveHorizontal /> Arraste para ver os trabalhos</span>
        <div className="portfolioControls" aria-label="Navegação das fotos">
          <button
            type="button"
            onClick={() => goTo(current - 1)}
            disabled={current === 0}
            aria-label="Foto anterior"
          >
            <ChevronLeft />
          </button>
          <strong aria-live="polite">
            {String(current + 1).padStart(2, '0')}
            <small> / {String(portfolio.length).padStart(2, '0')}</small>
          </strong>
          <button
            type="button"
            onClick={() => goTo(current + 1)}
            disabled={current === portfolio.length - 1}
            aria-label="Próxima foto"
          >
            <ChevronRight />
          </button>
        </div>
      </div>

      <div
        className="portfolioGallery"
        ref={trackRef}
        onScroll={updateCurrent}
        role="region"
        aria-label="Carrossel de trabalhos reais"
        tabIndex={0}
      >
        {portfolio.map((image, index) => (
          <figure key={image.src}>
            <Image
              src={image.src}
              alt={image.alt}
              fill
              sizes="(max-width: 600px) 82vw, (max-width: 1050px) 44vw, 26vw"
            />
            <figcaption>
              <span>{String(index + 1).padStart(2, '0')}</span>
              {image.title}
            </figcaption>
          </figure>
        ))}
      </div>

      <div className="portfolioProgress" aria-hidden="true">
        <i style={{width: `${((current + 1) / portfolio.length) * 100}%`}} />
      </div>
    </div>
  );
}
