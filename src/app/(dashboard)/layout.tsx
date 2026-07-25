'use client';

import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { RunProvider, useRunContext } from '@/components/dashboard/run-context';

const NAV_ITEMS = [
  { href: '/dashboard', label: '总览', icon: '⌂' },
  { href: '/agents', label: 'Agent 岗位', icon: '⚙' },
  { href: '/dag', label: 'DAG 运行', icon: '⇆' },
  { href: '/quality', label: '数据质量', icon: '✓' },
  { href: '/models', label: '模型与信号', icon: '⚛' },
  { href: '/approvals', label: '审批中心', icon: '✉' },
  { href: '/audit', label: '审计日志', icon: '☰' },
];

function CurrentRunBadge() {
  const { currentRunId } = useRunContext();
  if (!currentRunId) return null;
  return (
    <div className="px-3 py-2">
      <div className="bg-blue-900/30 border border-blue-700/50 rounded px-2 py-1.5 text-xs text-blue-300">
        <span className="text-blue-400">当前运行:</span>{' '}
        <span className="font-mono">{currentRunId.slice(0, 16)}</span>
      </div>
    </div>
  );
}

function SidebarContent() {
  const pathname = usePathname();
  const router = useRouter();

  const handleNavigate = (href: string) => {
    router.push(href);
  };

  return (
    <aside className="w-60 bg-slate-900 text-white flex flex-col shrink-0">
      <div className="p-4 border-b border-slate-700">
        <h1 className="text-sm font-bold tracking-wide">金融投资智能体</h1>
        <p className="text-xs text-slate-400 mt-1">运营工作台</p>
      </div>
      <div className="px-3 py-2">
        <div className="bg-amber-900/30 border border-amber-700/50 rounded px-2 py-1.5 text-xs text-amber-300">
          模拟环境 · 生产功能未启用
        </div>
      </div>
      <CurrentRunBadge />
      <nav className="flex-1 px-2 py-2 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || 
            (item.href !== '/dashboard' && pathname.startsWith(item.href + '/')) ||
            pathname.startsWith(item.href);
          return (
            <button
              key={item.href}
              type="button"
              onClick={() => handleNavigate(item.href)}
              className={cn(
                'flex items-center gap-2.5 px-3 py-2 rounded text-sm transition-colors w-full text-left cursor-pointer',
                isActive
                  ? 'bg-slate-700 text-white font-medium'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              )}
              data-testid={`nav-${item.href.slice(1)}`}
            >
              <span className="text-base w-5 text-center">{item.icon}</span>
              {item.label}
            </button>
          );
        })}
      </nav>
      <div className="p-3 border-t border-slate-700 text-xs text-slate-500">
        v0.1.0 · Phase 1 (Mock)
      </div>
    </aside>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <RunProvider>
      <div className="flex h-screen overflow-hidden">
        <SidebarContent />
        <main className="flex-1 overflow-y-auto" data-testid="main-content">
          {children}
        </main>
      </div>
    </RunProvider>
  );
}
