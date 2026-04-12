import type { Metadata, Viewport } from 'next';
import '@/styles/globals.css';
import { AppProvider } from '@/components/AppProvider';
import { TopBar } from '@/components/TopBar';
import { BottomNav } from '@/components/BottomNav';

export const metadata: Metadata = {
  title: 'openEBM — Evidence-based medicine, powered by Claude',
  description:
    'A premium evidence-based medicine assistant. Verified citations, multilingual answers, interactive simulations.',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/favicon.png', sizes: '64x64', type: 'image/png' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'openEBM',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#0b0f17',
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AppProvider>
          <div className="ebm-app">
            <TopBar />
            <main className="ebm-main">{children}</main>
            <BottomNav />
          </div>
        </AppProvider>
      </body>
    </html>
  );
}
