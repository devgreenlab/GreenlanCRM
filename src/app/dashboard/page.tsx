'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Package } from 'lucide-react';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';

type PageStatus = 'loading' | 'error' | 'empty' | 'ready';

function PageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-6 w-1/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Skeleton className="h-32 rounded-lg" />
        <Skeleton className="h-32 rounded-lg" />
        <Skeleton className="h-32 rounded-lg" />
        <Skeleton className="h-32 rounded-lg" />
      </div>
      <Skeleton className="h-64 rounded-lg" />
    </div>
  );
}

export default function DashboardPage() {
  const [status, setStatus] = useState<PageStatus>('loading');

  // Simulate loading data and then randomly showing empty or error state
  useEffect(() => {
    const timer = setTimeout(() => {
      setStatus('empty');
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  const handleRetry = () => {
    setStatus('loading');
    setTimeout(() => {
      // For demonstration, we'll succeed this time
      setStatus('empty');
    }, 1000);
  };

  const renderContent = () => {
    switch (status) {
      case 'loading':
        return <PageSkeleton />;
      case 'error':
        return (
          <ErrorState
            onRetry={handleRetry}
            message="Gagal memuat data dashboard. Silakan coba lagi."
          />
        );
      case 'empty':
        return (
          <EmptyState
            icon={Package}
            title="Belum ada data"
            description="Dashboard Anda masih kosong. Metrik utama akan muncul di sini setelah Anda mulai menggunakan aplikasi."
            action={<Button onClick={() => setStatus('loading')}>Muat Ulang Data</Button>}
          />
        );
      case 'ready':
        // This is where the actual dashboard with data would be rendered
        return <div>Data dashboard sudah siap!</div>;
      default:
        return null;
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline">Dashboard</h1>
          <p className="text-muted-foreground mt-2 font-serif">
            Selamat datang di dashboard Greenlab CRM Anda.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setStatus('loading')}>Tampilkan Loading</Button>
          <Button variant="outline" size="sm" onClick={() => setStatus('empty')}>Tampilkan Kosong</Button>
          <Button variant="outline" size="sm" onClick={() => setStatus('error')}>Tampilkan Error</Button>
        </div>
      </div>

      <div className="mt-8">
        {renderContent()}
      </div>
    </div>
  );
}
