import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AH Ledger | WoW US',
  description: 'Precios de la Casa de Subastas de World of Warcraft Retail para mercados US.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><head>
    <script dangerouslySetInnerHTML={{ __html: 'window.whTooltips={colorLinks:false,iconizeLinks:true,renameLinks:false,hide:{droppedby:true,dropchance:true}};' }} />
    <script async src="https://wow.zamimg.com/js/tooltips.js" />
  </head><body>{children}</body></html>;
}
