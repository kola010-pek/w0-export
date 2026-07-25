'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { href: '/dashboard', label: '\u603B\u89C8', icon: '\u2302' },
  { href: '/agents', label: 'Agent \u5C97\u4F4D', icon: '\u2699' },
  { href: '/dag', label: 'DAG \u8FD0\u884C', icon: '\u21C6' },
  { href: '/quality', label: '\u6570\u636E\u8D28\u91CF', icon: '\u2713' },
  { href: '/models', label: '\u6A21\u578B\u4E0E\u4FE1\u53F7', icon: '\u269B' },
  { href: '/approvals', label: '\u5BA1\u6279\u4E2D\u5FC3', icon: '\u2709' },
  { href: '/audit', label: '\u5BA1\u8BA1\u65E5\u5FD7', icon: '\u2630' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="w-60 bg-slate-900 text-white flex flex-col shrink-0">
        <div className="p-4 border-b border-slate-700">
          <h1 className="text-sm font-bold tracking-wide">\u91D1\u878D\u6295\u8D44\u667A\u80FD\u4F53</h1>
          <p className="text-xs text-slate-400 mt-1">\u8FD0\u8425\u5DE5\u4F5C\u53F0</p>
        </div>
        <div className="px-3 py-2">
          <div className="bg-amber-900/30 border border-amber-700/50 rounded px-2 py-1.5 text-xs text-amber-300">
            \u6A21\u62DF\u73AF\u5883 \u00B7 \u751F\u4EA7\u529F\u80FD\u672A\u542F\u7528
          </div>
        </div>
        <nav className="flex-1 px-2 py-2 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-2.5 px-3 py-2 rounded text-sm transition-colors',
                  isActive
                    ? 'bg-slate-700 text-white font-medium'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                )}
              >
                <span className="text-base w-5 text-center">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-slate-700 text-xs text-slate-500">
          v0.1.0 \u00B7 Phase 1 (Mock)
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
