'use client';

import * as React from 'react';
import { DollarSign, BadgePercent, Users, TrendingUp, Briefcase } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { FIRESTORE_COLLECTIONS } from '@/lib/firestore/collections';
import type { Deal, Lead, UserProfile, Timestamp } from '@/lib/firestore/types';
import { ErrorState } from '@/components/shared/error-state';
import { EmptyState } from '@/components/shared/empty-state';
import { useUserProfile } from '@/hooks/use-user-profile';
import { useTranslation } from '@/hooks/use-translation';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';


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
  const { t, locale } = useTranslation();

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
    return <ErrorState onRetry={handleRetry} message={t('kpi.error')} />;
  }

  const totalLeads = leads?.length ?? 0;
  const totalDeals = deals?.length ?? 0;

  const totalRevenue =
    deals
      ?.filter((deal) => deal.stage === 'selesai') // Assuming 'selesai' is equivalent to 'closed won'
      .reduce((sum, deal) => sum + (deal.amount || 0), 0) ?? 0;

  const dealsWon = deals?.filter((deal) => deal.stage === 'selesai').length ?? 0;
  const conversionRate = totalDeals > 0 ? (dealsWon / totalDeals) * 100 : 0;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <KpiCard
        title={t('kpi.totalRevenue')}
        value={new Intl.NumberFormat(locale === 'id' ? 'id-ID' : 'en-US', {
          style: 'currency',
          currency: locale === 'id' ? 'IDR' : 'USD',
          minimumFractionDigits: 0,
        }).format(totalRevenue)}
        icon={DollarSign}
        description={t('kpi.totalRevenue.desc')}
      />
      <KpiCard
        title={t('kpi.totalLeads')}
        value={`${totalLeads}`}
        icon={Users}
        description={t('kpi.totalLeads.desc')}
      />
      <KpiCard
        title={t('kpi.totalDeals')}
        value={`${totalDeals}`}
        icon={TrendingUp}
        description={t('kpi.totalDeals.desc')}
      />
      <KpiCard
        title={t('kpi.conversionRate')}
        value={`${conversionRate.toFixed(1)}%`}
        icon={BadgePercent}
        description={t('kpi.conversionRate.desc')}
      />
    </div>
  );
}


function TeamPerformanceDashboard() {
  const firestore = useFirestore();
  const { userProfile, isLoading: isProfileLoading, error: profileError } = useUserProfile();
  const { t, locale } = useTranslation();

  // 1. Get SALES users in the team
  const salesUsersQuery = useMemoFirebase(() => {
    if (!firestore || !userProfile?.teamId) return null;
    return query(
      collection(firestore, FIRESTORE_COLLECTIONS.users),
      where('teamId', '==', userProfile.teamId),
      where('role', '==', 'SALES')
    );
  }, [firestore, userProfile?.teamId]);
  const { data: salesUsers, isLoading: isLoadingUsers, error: usersError } = useCollection<UserProfile>(salesUsersQuery);

  // 2. Fetch leads for each sales user manually
  const [teamLeads, setTeamLeads] = React.useState<Lead[] | null>(null);
  const [isLoadingLeads, setIsLoadingLeads] = React.useState(true);
  const [leadsError, setLeadsError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    if (!firestore || !salesUsers) {
      if (salesUsers === null) setIsLoadingLeads(true); // Still waiting for salesUsers
      if (salesUsers && salesUsers.length === 0) {
        setTeamLeads([]);
        setIsLoadingLeads(false);
      }
      return;
    }

    const fetchLeadsForAllSales = async () => {
      setIsLoadingLeads(true);
      setLeadsError(null);
      try {
        const leadsCollection = collection(firestore, FIRESTORE_COLLECTIONS.leads);
        const leadsPromises = salesUsers.map(user => 
          getDocs(query(leadsCollection, where('ownerUid', '==', user.id)))
        );

        const snapshots = await Promise.all(leadsPromises);
        const allLeads = snapshots.flatMap(snapshot => 
          snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Lead))
        );
        setTeamLeads(allLeads);
      } catch (err: any) {
        setLeadsError(err);
        console.error("Failed to fetch team leads", err);
      } finally {
        setIsLoadingLeads(false);
      }
    };
    
    fetchLeadsForAllSales();
  }, [firestore, salesUsers]);
  

  const isLoading = isProfileLoading || isLoadingUsers || isLoadingLeads;
  const error = profileError || usersError || leadsError;
  
  // 3. Process data
  const performanceData = React.useMemo(() => {
    if (!salesUsers || !teamLeads) return [];

    const leadsByOwner = new Map<string, Lead[]>();
    for (const lead of teamLeads) {
      if (!leadsByOwner.has(lead.ownerUid)) {
        leadsByOwner.set(lead.ownerUid, []);
      }
      leadsByOwner.get(lead.ownerUid)!.push(lead);
    }

    const data = salesUsers.map(sales => {
      const userLeads = leadsByOwner.get(sales.id) || [];
      
      const stagesCount = userLeads.reduce((acc, lead) => {
        const stage = lead.stage || 'unknown';
        acc[stage] = (acc[stage] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const lastActivity = userLeads.reduce((latest, lead) => {
        const leadTs = lead.lastMessageAt || lead.updatedAt;
        if (leadTs && (!latest || leadTs.toMillis() > latest.toMillis())) {
          return leadTs;
        }
        return latest;
      }, null as Timestamp | null);

      const unreadCount = userLeads.reduce((sum, lead) => sum + (lead.unreadCount || 0), 0);

      return {
        id: sales.id,
        name: sales.name,
        totalLeads: userLeads.length,
        stages: stagesCount,
        lastActivity: lastActivity,
        unreadCount: unreadCount,
      };
    });

    // Sort by total leads descending
    return data.sort((a, b) => b.totalLeads - a.totalLeads);

  }, [salesUsers, teamLeads]);
  
  // Table Skeleton
  const TableSkeleton = () => (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            {[...Array(5)].map((_, i) => <TableHead key={i}><Skeleton className="h-5 w-24" /></TableHead>)}
          </TableRow>
        </TableHeader>
        <TableBody>
          {[...Array(3)].map((_, i) => (
            <TableRow key={i}>
              <TableCell><Skeleton className="h-5 w-32" /></TableCell>
              <TableCell><Skeleton className="h-5 w-16" /></TableCell>
              <TableCell><Skeleton className="h-5 w-48" /></TableCell>
              <TableCell><Skeleton className="h-5 w-24" /></TableCell>
              <TableCell><Skeleton className="h-5 w-16" /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  const handleRetry = () => window.location.reload();

  const renderContent = () => {
    if (isLoading) {
      return <TableSkeleton />;
    }
    if (error) {
      return <ErrorState onRetry={handleRetry} message="Gagal memuat data performa tim." />;
    }
    if (!performanceData || performanceData.length === 0) {
      return (
        <EmptyState
          icon={Briefcase}
          title="Tidak ada data performa"
          description="Data performa tim akan muncul di sini setelah ada prospek yang ditugaskan ke anggota tim sales Anda."
        />
      );
    }
    
    return (
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama Sales</TableHead>
              <TableHead>Total Prospek</TableHead>
              <TableHead>Prospek per Tahapan</TableHead>
              <TableHead>Aktivitas Terakhir</TableHead>
              <TableHead>Belum Dibaca</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {performanceData.map(sales => (
              <TableRow key={sales.id}>
                <TableCell className="font-medium">{sales.name}</TableCell>
                <TableCell>{sales.totalLeads}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(sales.stages).map(([stage, count]) => (
                      <Badge key={stage} variant="secondary" className="capitalize">
                        {stage}: {count}
                      </Badge>
                    ))}
                    {Object.keys(sales.stages).length === 0 && '-'}
                  </div>
                </TableCell>
                <TableCell>
                  {sales.lastActivity 
                    ? formatDistanceToNow(sales.lastActivity.toDate(), { addSuffix: true, locale: locale === 'id' ? idLocale : undefined }) 
                    : '-'}
                </TableCell>
                <TableCell>{sales.unreadCount}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  };
  
  return (
     <Card>
      <CardHeader>
        <CardTitle>Performa Tim Sales</CardTitle>
        <CardDescription>Pantau metrik utama untuk setiap anggota tim sales Anda.</CardDescription>
      </CardHeader>
      <CardContent>
        {renderContent()}
      </CardContent>
    </Card>
  );
}


export default function DashboardPage() {
  const { userProfile } = useUserProfile();
  const { t } = useTranslation();
  const [greeting, setGreeting] = React.useState('');

  React.useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 4 && hour < 12) {
      setGreeting(t('dashboard.greeting.morning'));
    } else if (hour >= 12 && hour < 15) {
      setGreeting(t('dashboard.greeting.afternoon'));
    } else if (hour >= 15 && hour < 19) {
      setGreeting(t('dashboard.greeting.evening'));
    } else {
      setGreeting(t('dashboard.greeting.night'));
    }
  }, [t]);

  const formatRole = (role?: string) => {
    if (!role) return '';
    return role.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  const firstName = userProfile?.name?.split(' ')[0] ?? '';
  const welcomeMessage = t('dashboard.welcome');
  const loggedInAs = userProfile?.role ? ` ${t('dashboard.loggedInAs', { role: formatRole(userProfile.role) })}` : '';


  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline">
            {greeting && firstName ? `${greeting}, ${firstName}!` : t('dashboard.title')}
          </h1>
          <p className="text-muted-foreground mt-2 font-serif">
            {welcomeMessage}{loggedInAs}
          </p>
        </div>
      </div>

      <div className="mt-8">
        <DashboardKpis />
      </div>

      {userProfile?.role === 'HEAD_SALES' && (
        <div className="mt-8">
          <TeamPerformanceDashboard />
        </div>
      )}
    </div>
  );
}
