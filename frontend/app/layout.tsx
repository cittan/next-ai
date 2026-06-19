import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Super Agent',
  description: 'Super Agent 智能助手',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}