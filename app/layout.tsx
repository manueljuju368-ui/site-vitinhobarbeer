import type {Metadata, Viewport} from 'next';
import {Manrope, Oswald} from 'next/font/google';
import './globals.css';
import './booking.css';
import './booking-v2.css';
import './credits.css';
import './polish.css';
import './mobile-polish.css';
import './professional-finish.css';
import './human-finish.css';
import './mobile-redesign.css';
import './final-pass.css';
import './launch-ready.css';
import './portfolio-carousel.css';
import Experience from '@/components/Experience';
import {address, whatsapp} from '@/lib/data';
import {googleMapsUrl, siteUrl} from '@/lib/site';

const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-manrope',
  display: 'swap',
});

const oswald = Oswald({
  subsets: ['latin'],
  variable: '--font-oswald',
  display: 'swap',
});

const socialImageUrl = `${siteUrl}/social-preview-vitinho-v1.jpg`;

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#08090a',
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Vitinho Barber | Barbearia em São Leopoldo',
    template: '%s | Vitinho Barber',
  },
  description: 'Corte masculino, degradê, barba, luzes e platinado no bairro Santos Dumont, em São Leopoldo. Consulte os horários e agende online.',
  keywords: ['barbearia em São Leopoldo', 'barbearia Santos Dumont', 'corte degradê São Leopoldo', 'Vitinho Barber'],
  alternates: {
    canonical: '/',
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || undefined,
  },
  icons: {
    icon: [{url: '/logo-vitinho-compact-v1.webp', type: 'image/webp'}],
    shortcut: '/logo-vitinho-compact-v1.webp',
    apple: '/apple-touch-icon-v1.png',
  },
  openGraph: {
    title: 'Vitinho Barber',
    description: 'Corte, barba e acabamento no bairro Santos Dumont, em São Leopoldo.',
    url: siteUrl,
    siteName: 'Vitinho Barber',
    locale: 'pt_BR',
    type: 'website',
    images: [{
      url: socialImageUrl,
      secureUrl: socialImageUrl,
      width: 1200,
      height: 630,
      type: 'image/jpeg',
      alt: 'Logo oficial da Vitinho Barber',
    }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Vitinho Barber | Barbearia em São Leopoldo',
    description: 'Escolha o serviço, consulte os horários e agende online.',
    images: [socialImageUrl],
  },
};

const businessSchema = {
  '@context': 'https://schema.org',
  '@type': 'BarberShop',
  name: 'Vitinho Barber',
  url: siteUrl,
  image: `${siteUrl}/hero-campaign-v2.webp`,
  telephone: `+${whatsapp}`,
  priceRange: 'R$ 15–140',
  openingHoursSpecification: [
    {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: 'Monday',
      opens: '14:00',
      closes: '20:00',
    },
    {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      opens: '09:00',
      closes: '20:00',
    },
  ],
  address: {
    '@type': 'PostalAddress',
    streetAddress: address.split(', Santos Dumont')[0],
    addressLocality: 'São Leopoldo',
    addressRegion: 'RS',
    postalCode: '93115-380',
    addressCountry: 'BR',
  },
  sameAs: ['https://instagram.com/vitinhobarber_ofc', googleMapsUrl],
};

export default function Layout({children}: {children: React.ReactNode}) {
  return (
    <html lang="pt-BR">
      <body className={`${manrope.variable} ${oswald.variable}`}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{__html: JSON.stringify(businessSchema)}}
        />
        <Experience />
        {children}
      </body>
    </html>
  );
}
