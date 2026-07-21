'use client';
import {useEffect} from 'react';

export default function Experience() {
  useEffect(() => {
    const root = document.documentElement;
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - innerHeight;
      root.style.setProperty('--scroll', `${max ? (scrollY / max) * 100 : 0}%`);
    };
    const targets = document.querySelectorAll('.sectionHead,.service,.barber,.portfolio>*,.bookingIntro,.bookingCard,.reviews>*,.location>*');
    targets.forEach((element, index) => {
      element.classList.add('reveal');
      (element as HTMLElement).style.setProperty('--delay', `${Math.min(index % 3, 2) * 60}ms`);
    });
    const observer = new IntersectionObserver((entries) => entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    }), {threshold: 0.08, rootMargin: '0px 0px -24px'});
    targets.forEach((element) => observer.observe(element));
    onScroll();
    addEventListener('scroll', onScroll, {passive: true});
    return () => { removeEventListener('scroll', onScroll); observer.disconnect(); };
  }, []);
  return <div className="scrollProgress" />;
}
