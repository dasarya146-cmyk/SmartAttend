import type { Metadata } from 'next';
import './globals.css';
import Providers from '@/components/Providers';

export const metadata: Metadata = {
  title: 'SmartAttend — Multi-College Geo Attendance Platform',
  description: 'AI-powered GPS and face-verified attendance system for colleges and institutions.',
};

export const viewport = {
  themeColor: '#080c14',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Outfit:wght@600;700;800;900&display=swap" rel="stylesheet" />
      </head>
      <body>
        <Providers>
          {/* Background Scene */}
          <div className="bg-scene" aria-hidden="true">
            <div className="bg-orb bg-orb-1" />
            <div className="bg-orb bg-orb-2" />
            <div className="bg-orb bg-orb-3" />
          </div>
          <div className="bg-grid" aria-hidden="true" />
          {children}
        </Providers>
      </body>
    </html>
  );
}
