import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import AppLayout from '../components/mobile/layout/AppLayout';
import './globals.css';
import Provider from './Provider';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Checkpoint',
  description: 'QR-gestützte Gästeverwaltung',
  appleWebApp: { statusBarStyle: 'default', title: 'Checkpoint' },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#000', // optional
  viewportFit: 'cover',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <Provider>
          <AppLayout>{children}</AppLayout>
        </Provider>
      </body>
    </html>
  );
}
