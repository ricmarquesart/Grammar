import type { Metadata } from 'next';
import './globals.css';
import { Nav } from './components/Nav';
import PwaRegister from './components/PwaRegister';

export const metadata: Metadata = {
  title: 'CELPIP Grammar Daily MVP',
  description: 'Daily grammar study with progress tracking.',
  manifest: '/manifest.webmanifest',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <PwaRegister />
        <main className="container">
          <h1>CELPIP Grammar Study</h1>
          <Nav />
          {children}
        </main>
      </body>
    </html>
  );
}
