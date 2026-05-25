import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  const ICON_URL = "https://slytlppadlmnnloszuwd.supabase.co/storage/v1/object/public/Banner/IMG_20260525_122039_723.jpg?v=5.0";
  
  return {
    name: 'Flex Pay',
    short_name: 'Flex Pay',
    description: 'Fast, secure digital payments.',
    start_url: '/',
    display: 'standalone',
    background_color: '#F8FAFC',
    theme_color: '#2563eb',
    icons: [
      {
        src: ICON_URL,
        sizes: '192x192',
        type: 'image/jpeg',
        purpose: 'maskable',
      },
      {
        src: ICON_URL,
        sizes: '512x512',
        type: 'image/jpeg',
        purpose: 'any',
      },
    ],
  };
}
