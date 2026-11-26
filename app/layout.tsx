import type { Metadata } from 'next';
import { Plus_Jakarta_Sans, DM_Sans, IBM_Plex_Mono } from 'next/font/google';
import './globals.css';

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-display',
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-sans',
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: 'Paga a tu Ritmo — Caja Trujillo | Evaluación de Créditos Variables',
  description:
    'Plataforma de análisis crediticio con OCR inteligente, predicción de ingresos estacionales, optimización matemática de cuotas y asistente conversacional para Caja Trujillo.',
  openGraph: {
    title: 'Paga a tu Ritmo — Caja Trujillo',
    description:
      'Cuotas que se adaptan al flujo del negocio con control de riesgo bancario y análisis predictivo.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Paga a tu Ritmo — Caja Trujillo',
    description:
      'Cuotas que se adaptan al flujo del negocio con control de riesgo bancario y análisis predictivo.',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="es"
      className={`${plusJakarta.variable} ${dmSans.variable} ${ibmPlexMono.variable}`}
    >
      <body
        suppressHydrationWarning
        className="font-sans bg-[#F6F7F9] text-slate-900 antialiased selection:bg-red-100 selection:text-red-900"
      >
        {children}
      </body>
    </html>
  );
}
