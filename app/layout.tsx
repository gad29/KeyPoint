import type { Metadata } from 'next';
import './globals.css';
import { AppShell } from '@/components/layout';

export const metadata: Metadata = {
  title: 'KeyPoint',
  description: 'Bilingual mortgage case management for intake, client communication, and office operations.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
