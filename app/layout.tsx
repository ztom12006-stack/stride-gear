import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'STRIDE · 运动装备管家',
  description: '管理运动装备、记录每一次出发，探索属于你的运动穿搭。',
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
