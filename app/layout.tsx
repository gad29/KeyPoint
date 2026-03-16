import type { Metadata } from 'next';
import './globals.css';
import { AppShell } from '@/components/layout';

export const metadata: Metadata = {
  title: 'KeyPoint',
  description: 'Client portal and office dashboard scaffold for an Israel-focused mortgage advisor workflow.',
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
