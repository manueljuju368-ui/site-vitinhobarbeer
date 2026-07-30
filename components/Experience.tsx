'use client';
import {useEffect} from 'react';

export default function Experience() {
  useEffect(() => {
    const root = document.documentElement;
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
      return () => removeEventListener('scroll', onScroll);
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

    return () => {
      removeEventListener('scroll', onScroll);
      observer.disconnect();
    };
  }, []);
  return <div className="scrollProgress" />;
}
