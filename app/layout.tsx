import type { Metadata } from 'next';
import './globals.css';

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
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400..600;1,9..40,400..600&family=IBM+Plex+Mono:wght@400;500;600&family=Plus+Jakarta+Sans:wght@500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        suppressHydrationWarning
        className="font-sans bg-[#F6F7F9] text-slate-900 antialiased selection:bg-red-100 selection:text-red-900"
      >
        {children}
      </body>
    </html>
  );
}
