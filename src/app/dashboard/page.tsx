'use client';

import * as React from 'react';
import { DollarSign, BadgePercent, Users, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { FIRESTORE_COLLECTIONS } from '@/lib/firestore/collections';
import type { Deal, Lead } from '@/lib/firestore/types';
import { ErrorState } from '@/components/shared/error-state';
import { useUserProfile } from '@/hooks/use-user-profile';

function PageSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Skeleton className="h-32 rounded-lg" />
      <Skeleton className="h-32 rounded-lg" />
      <Skeleton className="h-32 rounded-lg" />
      <Skeleton className="h-32 rounded-lg" />
    </div>
  );
}

function KpiCard({
  title,
  value,
  icon: Icon,
  description,
}: {
  title: string;
  value: string;
  icon: React.ElementType;
  description: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

function DashboardKpis() {
  const firestore = useFirestore();
  const { userProfile, isLoading: isProfileLoading, error: profileError } = useUserProfile();

  const leadsQuery = useMemoFirebase(() => {
    if (!firestore || !userProfile) return null;
    const coll = collection(firestore, FIRESTORE_COLLECTIONS.leads);
    if (userProfile.role === 'SUPER_ADMIN') {
      return query(coll);
    }
    if (userProfile.role === 'HEAD_SALES') {
      return query(coll, where('teamId', '==', userProfile.teamId));
    }
    // SALES role
    return query(coll, where('ownerUid', '==', userProfile.id));
  }, [firestore, userProfile]);

  const dealsQuery = useMemoFirebase(() => {
    if (!firestore || !userProfile) return null;
    const coll = collection(firestore, FIRESTORE_COLLECTIONS.deals);
    if (userProfile.role === 'SUPER_ADMIN') {
      return query(coll);
    }
    if (userProfile.role === 'HEAD_SALES') {
      return query(coll, where('teamId', '==', userProfile.teamId));
    }
    // SALES role
    return query(coll, where('ownerUid', '==', userProfile.id));
  }, [firestore, userProfile]);
  
  const { data: leads, isLoading: isLoadingLeads, error: leadsError } = useCollection<Lead>(leadsQuery);
  const { data: deals, isLoading: isLoadingDeals, error: dealsError } = useCollection<Deal>(dealsQuery);

  const isLoading = isProfileLoading || isLoadingLeads || isLoadingDeals;
  const error = profileError || leadsError || dealsError;

  const handleRetry = () => {
    // This is a placeholder for a more robust retry mechanism
    window.location.reload();
  };

  if (isLoading) {
    return <PageSkeleton />;
  }

  if (error) {
    return <ErrorState onRetry={handleRetry} message="Gagal memuat data KPI." />;
  }

  const totalLeads = leads?.length ?? 0;
  const totalDeals = deals?.length ?? 0;

  const totalRevenue =
    deals
      ?.filter((deal) => deal.stage === 'selesai') // Assuming 'selesai' is equivalent to 'closed won'
      .reduce((sum, deal) => sum + (deal.valueEstimate || 0), 0) ?? 0;

  const dealsWon = deals?.filter((deal) => deal.stage === 'selesai').length ?? 0;
  const conversionRate = totalDeals > 0 ? (dealsWon / totalDeals) * 100 : 0;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <KpiCard
        title="Total Revenue"
        value={new Intl.NumberFormat('id-ID', {
          style: 'currency',
          currency: 'IDR',
        }).format(totalRevenue)}
        icon={DollarSign}
        description="Total pendapatan dari deal yang dimenangkan."
      />
      <KpiCard
        title="Total Leads"
        value={`${totalLeads}`}
        icon={Users}
        description="Jumlah prospek yang masuk."
      />
      <KpiCard
        title="Total Deals"
        value={`${totalDeals}`}
        icon={TrendingUp}
        description="Jumlah deal yang sedang berjalan."
      />
      <KpiCard
        title="Conversion Rate"
        value={`${conversionRate.toFixed(1)}%`}
        icon={BadgePercent}
        description="Persentase deal yang berhasil dimenangkan."
      />
    </div>
  );
}


export default function DashboardPage() {
  const { userProfile } = useUserProfile();
  const [greeting, setGreeting] = React.useState('');

  React.useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 4 && hour < 12) {
      setGreeting('Selamat Pagi');
    } else if (hour >= 12 && hour < 15) {
      setGreeting('Selamat Siang');
    } else if (hour >= 15 && hour < 19) {
      setGreeting('Selamat Sore');
    } else {
      setGreeting('Selamat Malam');
    }
  }, []);

  const formatRole = (role?: string) => {
    if (!role) return '';
    return role.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  const firstName = userProfile?.name?.split(' ')[0] ?? '';


  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline">
            {greeting && firstName ? `${greeting}, ${firstName}!` : 'Dashboard'}
          </h1>
          <p className="text-muted-foreground mt-2 font-serif">
            Selamat datang kembali.{userProfile?.role ? ` Anda login sebagai ${formatRole(userProfile.role)}.` : ''}
          </p>
        </div>
      </div>

      <div className="mt-8">
        <DashboardKpis />
      </div>
    </div>
  );
}
