import { MetadataRoute } from 'next';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://ixtabox.com';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = siteUrl;
  const now = new Date();

  return [
    // Homepage - highest priority
    {
      url: baseUrl,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 1.0,
    },
    // Main guest/browse page
    {
      url: `${baseUrl}/guest`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    // Booking page
    {
      url: `${baseUrl}/guest/bookings`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.8,
    },
    // Support/FAQ page - important for SEO
    {
      url: `${baseUrl}/support`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    // Auth pages (public, but lower priority)
    {
      url: `${baseUrl}/auth/login`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/auth/signup`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.3,
    },
  ];
}
