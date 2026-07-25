'use client';

import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({ title = '加载失败', message = '数据加载出错，请稍后重试。', onRetry }: ErrorStateProps) {
  return (
    <Card className="border-red-200 bg-red-50/50">
      <CardContent className="flex flex-col items-center justify-center py-12">
        <AlertCircle className="h-12 w-12 text-red-400 mb-4" />
        <h3 className="text-lg font-semibold text-red-800 mb-2">{title}</h3>
        <p className="text-sm text-red-600 mb-4 text-center max-w-md">{message}</p>
        {onRetry && (
          <Button variant="outline" onClick={onRetry} className="border-red-300 text-red-700 hover:bg-red-100">
            <RefreshCw className="h-4 w-4 mr-2" />
            重试
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

interface EmptyStateProps {
  title?: string;
  message?: string;
  action?: React.ReactNode;
}

export function EmptyState({ title = '暂无数据', message = '当前没有可显示的内容。', action }: EmptyStateProps) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-12">
        <h3 className="text-lg font-semibold text-gray-600 mb-2">{title}</h3>
        <p className="text-sm text-gray-500 mb-4 text-center max-w-md">{message}</p>
        {action}
      </CardContent>
    </Card>
  );
}
