import type { Metadata } from 'next';
import { Heebo, Frank_Ruhl_Libre } from 'next/font/google';
import './globals.css';
import { RouteShell } from '@/components/route-shell';
import { getBranding } from '@/lib/onboarding';

const sans = Heebo({
  subsets: ['latin', 'latin-ext', 'hebrew'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-sans',
  display: 'swap',
});

const display = Frank_Ruhl_Libre({
  subsets: ['latin', 'hebrew'],
  weight: ['500', '700', '900'],
  variable: '--font-display',
  display: 'swap',
});

export const metadata: Metadata = {
  title: process.env.BUSINESS_NAME || 'Agency OS',
  description: 'Client onboarding, service updates, invoicing and payment follow-up for small businesses.',
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const branding = await getBranding();
  return (
    <html lang="he" className={`${sans.variable} ${display.variable}`}>
      <body className={sans.className}>
        <RouteShell branding={branding}>{children}</RouteShell>
      </body>
    </html>
  );
}
