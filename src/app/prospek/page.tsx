'use client';

import { useMemo } from 'react';
import { collection, query } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { FIRESTORE_COLLECTIONS } from '@/lib/firestore/collections';
import type { Lead } from '@/lib/firestore/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/shared/error-state';
import { EmptyState } from '@/components/shared/empty-state';
import { View } from 'lucide-react';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';

const chartConfig = {
  count: {
    label: 'Count',
    color: 'hsl(var(--chart-1))',
  },
} satisfies ChartConfig;


function StageDistributionChart({ leads }: { leads: Lead[] }) {
  const stageCounts = useMemo(() => {
    const counts: { [key: string]: number } = {};
    for (const lead of leads) {
      counts[lead.stage] = (counts[lead.stage] || 0) + 1;
    }
    return Object.entries(counts).map(([stage, count]) => ({ stage, count }));
  }, [leads]);
  
  if (stageCounts.length === 0) {
      return (
        <EmptyState
          icon={View}
          title="Belum ada prospek"
          description="Distribusi tahapan prospek akan muncul di sini."
        />
      )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Distribusi Tahapan Prospek</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stageCounts} margin={{ top: 20, right: 20, bottom: 5, left: 0 }}>
              <XAxis dataKey="stage" tickLine={false} axisLine={false} />
              <YAxis allowDecimals={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="count" fill="var(--color-count)" radius={4} />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}


function PageSkeleton() {
  return (
    <Card>
        <CardHeader>
            <Skeleton className="h-6 w-1/2" />
        </CardHeader>
        <CardContent>
            <Skeleton className="h-[300px] w-full" />
        </CardContent>
    </Card>
  )
}

export default function ProspekPage() {
  const firestore = useFirestore();
  const leadsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, FIRESTORE_COLLECTIONS.leads)) : null),
    [firestore]
  );
  
  const { data: leads, isLoading, error } = useCollection<Lead>(leadsQuery);
  const handleRetry = () => window.location.reload();

  const renderContent = () => {
    if (isLoading) {
      return <PageSkeleton />;
    }
    if (error) {
      return (
        <ErrorState
          onRetry={handleRetry}
          message="Gagal memuat data prospek."
        />
      );
    }
    if (!leads) { // Also covers empty array case for the chart
      return (
        <EmptyState
          icon={View}
          title="Belum ada prospek"
          description="Data prospek akan muncul di sini setelah Anda menambahkannya."
        />
      );
    }
    return <StageDistributionChart leads={leads} />;
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <h1 className="text-3xl font-bold tracking-tight font-headline">Prospek (Leads)</h1>
      <p className="text-muted-foreground mt-2 font-serif">
        Visualisasikan distribusi prospek Anda berdasarkan tahapan saat ini.
      </p>
      <div className="mt-8">
        {renderContent()}
      </div>
    </div>
  );
}
