export const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL || 'https://vitinhobarbeer-oficial.vercel.app'
).replace(/\/+$/, '');

export const instagramUrl = 'https://www.instagram.com/vitinhobarber_ofc';

const googleBusinessCid = '10751965307132235080';

export const googleMapsUrl = `https://www.google.com/maps?cid=${googleBusinessCid}`;

export const googleReviewUrl = googleMapsUrl;

export const googleMapsEmbedUrl = (
  `https://maps.google.com/maps?cid=${googleBusinessCid}&output=embed`
);

export const whatsappLink = (phone: string, message: string) => (
  `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
);
