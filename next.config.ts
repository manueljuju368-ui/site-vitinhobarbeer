import type {NextConfig} from 'next';

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === 'development' ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co",
  'frame-src https://www.google.com https://maps.google.com',
].join('; ');

const nextConfig: NextConfig = {
  devIndicators: false,
  outputFileTracingRoot: process.cwd(),
  poweredByHeader: false,
  eslint: {
    // Lint runs as an explicit release gate with the flat ESLint 10 configuration.
    ignoreDuringBuilds: true,
  },
  images: {
    // All visual assets are already compressed WebP files. Serving them directly
    // avoids a dynamic /_next/image request that can fail in older mobile
    // browsers and in embedded WebViews.
    unoptimized: true,
  },
  async headers() {
    return [{
      source: '/:path*',
      headers: [
        {key: 'Content-Security-Policy', value: contentSecurityPolicy},
        {key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin'},
        {key: 'X-Content-Type-Options', value: 'nosniff'},
        {key: 'X-Frame-Options', value: 'DENY'},
        {key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()'},
        {key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains'},
      ],
    }];
  },
};

export default nextConfig;
