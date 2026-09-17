import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AH Ledger | WoW US',
  description: 'Precios de Armor de World of Warcraft para mercados US.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><body>{children}</body></html>;
}
