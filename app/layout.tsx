import type { Metadata } from 'next';
import './globals.css';
import { RouteShell } from '@/components/route-shell';

export const metadata: Metadata = {
  title: 'KeyPoint',
  description: 'Mortgage file intake and progress for clients; office workspace for staff.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <RouteShell>{children}</RouteShell>
      </body>
    </html>
  );
}
