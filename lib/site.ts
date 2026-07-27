export const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL || 'https://vitinhobarber.com.br'
).replace(/\/+$/, '');

export const instagramUrl = 'https://www.instagram.com/vitinhobarber_ofc';

export const googleReviewUrl = 'https://www.google.com/search?q=Vitinhobarber_ofc+São+Leopoldo';

export const googleMapsUrl = (address: string) => (
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
);

export const whatsappLink = (phone: string, message: string) => (
  `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
);
