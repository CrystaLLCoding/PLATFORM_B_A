import type { Metadata } from 'next';
import './globals.css';
import { Navbar } from '@/components/Navbar';

export const metadata: Metadata = {
  title: 'DataAudit AI — Платформа бизнес-советов на основе клиентских данных с видеопересказом',
  description: 'Глубокий анализ реальных данных малого бизнеса (Excel, PDF, фото, регламенты, ссылки) с нулевой галлюцинацией и встроенным видеопересказом NotebookLM.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <body>
        <div className="ambient-glow" />
        <Navbar />
        <main style={{ minHeight: 'calc(100vh - 72px)', paddingBottom: '60px' }}>
          {children}
        </main>
      </body>
    </html>
  );
}
