import type { Metadata } from 'next';
import { Inspector } from 'react-dev-inspector';
import './globals.css';

export const metadata: Metadata = {
  title: '金融投资智能体运营工作台',
  description: '由七个岗位 Agent、确定性任务 DAG、质量门禁、人工审批和完整审计记录组成的金融数据与量化模型运营工作台',
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
