'use client';
import {useEffect} from 'react';
import {trackEvent} from '@/lib/analytics';

export default function Experience() {
  useEffect(() => {
    const root = document.documentElement;
    const onClick = (event: MouseEvent) => {
      const link = (event.target as HTMLElement).closest<HTMLAnchorElement>('a[href]');
      if (!link) return;
      const href = link.href;
      if (href.includes('wa.me/')) trackEvent('whatsapp_click');
      else if (href.includes('instagram.com/')) trackEvent('instagram_click');
      else if (href.includes('google.com/maps') || href.includes('maps.google.com')) trackEvent('map_click');
      else if (link.hash === '#agendar') trackEvent('booking_cta_click');
    };
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - innerHeight;
      root.style.setProperty('--scroll', `${max ? (scrollY / max) * 100 : 0}%`);
    };

    const targets = Array.from(document.querySelectorAll<HTMLElement>([
      '.valueStrip article',
      '.bookingIntro > *',
      '.bookingCard',
      '.sectionHead > *',
      '.service',
      '.portfolioCopy > *',
      '.portfolioCarousel',
      '.barber',
      '.reviews > *',
      '.location > *',
      'footer > *',
    ].join(',')));

    targets.forEach((element, index) => {
      element.classList.add('reveal');
      element.style.setProperty('--delay', `${Math.min(index % 4, 3) * 70}ms`);
    });

    if (!('IntersectionObserver' in window)) {
      targets.forEach((element) => element.classList.add('visible'));
      onScroll();
      addEventListener('scroll', onScroll, {passive: true});
      addEventListener('click', onClick);
      return () => {
        removeEventListener('scroll', onScroll);
        removeEventListener('click', onClick);
      };
    }

    const observer = new IntersectionObserver((entries) => entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    }), {threshold: 0.08, rootMargin: '0px 0px -6%'});

    targets.forEach((element) => observer.observe(element));
    onScroll();
    addEventListener('scroll', onScroll, {passive: true});
    addEventListener('click', onClick);

    return () => {
      removeEventListener('scroll', onScroll);
      removeEventListener('click', onClick);
      observer.disconnect();
    };
  }, []);
  return <div className="scrollProgress" />;
}
