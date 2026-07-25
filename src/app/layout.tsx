import type { Metadata } from 'next';
import { Inspector } from 'react-dev-inspector';
import './globals.css';

export const metadata: Metadata = {
  title: '\u91D1\u878D\u6295\u8D44\u667A\u80FD\u4F53\u8FD0\u8425\u5DE5\u4F5C\u53F0',
  description: '\u7531\u4E03\u4E2A\u5C97\u4F4D Agent\u3001\u786E\u5B9A\u6027\u4EFB\u52A1 DAG\u3001\u8D28\u91CF\u95E8\u7981\u3001\u4EBA\u5DE5\u5BA1\u6279\u548C\u5B8C\u6574\u5BA1\u8BA1\u8BB0\u5F55\u7EC4\u6210\u7684\u91D1\u878D\u6570\u636E\u4E0E\u91CF\u5316\u6A21\u578B\u8FD0\u8425\u5DE5\u4F5C\u53F0',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const isDev = process.env.COZE_PROJECT_ENV === 'DEV';

  return (
    <html lang="zh-CN">
      <body className="antialiased bg-gray-50 text-gray-900">
        {isDev && <Inspector />}
        {children}
      </body>
    </html>
  );
}
