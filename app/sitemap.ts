import type {MetadataRoute} from 'next';
import {siteUrl} from '@/lib/site';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {url: siteUrl, changeFrequency: 'weekly' as const, priority: 1},
    {url: `${siteUrl}/privacidade`, changeFrequency: 'yearly' as const, priority: 0.3},
  ];
}
