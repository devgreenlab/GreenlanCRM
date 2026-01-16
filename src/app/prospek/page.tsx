'use client';

import { useMemo } from 'react';
import { collection, query, where, doc } from 'firebase/firestore';
import { useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { FIRESTORE_COLLECTIONS } from '@/lib/firestore/collections';
import type { Lead, PipelineSettings } from '@/lib/firestore/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/shared/error-state';
import { EmptyState } from '@/components/shared/empty-state';
import { View, GripVertical } from 'lucide-react';
import { useUserProfile } from '@/hooks/use-user-profile';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

function LeadCard({ lead }: { lead: Lead }) {
  return (
    <Card className="mb-2">
      <CardContent className="p-3">
        <div className="flex justify-between items-start">
            <div>
                <p className="font-semibold text-sm">{lead.customerName}</p>
                <p className="text-xs text-muted-foreground">{lead.companyName || lead.phone}</p>
            </div>
            <Badge variant="secondary" className="capitalize">{lead.source}</Badge>
        </div>
      </CardContent>
    </Card>
  );
}

function KanbanColumn({ title, leads }: { title: string; leads: Lead[] }) {
  return (
    <div className="flex-1 min-w-[280px] bg-muted/50 rounded-lg p-2">
      <h3 className="font-semibold p-2 mb-2 capitalize">{title} ({leads.length})</h3>
      <div className="h-full overflow-y-auto">
        {leads.length > 0 ? (
          leads.map((lead) => <LeadCard key={lead.id} lead={lead} />)
        ) : (
          <div className="p-4 text-center text-sm text-muted-foreground">Tidak ada prospek</div>
        )}
      </div>
    </div>
  );
}


function KanbanBoard({ leads, stages }: { leads: Lead[]; stages: string[] }) {
  const leadsByStage = useMemo(() => {
    const initial: Record<string, Lead[]> = {};
    stages.forEach(stage => {
        initial[stage] = [];
    });
    
    return leads.reduce((acc, lead) => {
      const stage = lead.stage || stages[0]; // Default to first stage if not set
      if (!acc[stage]) {
        acc[stage] = []; // Handle leads with stages not in settings
      }
      acc[stage].push(lead);
      return acc;
    }, initial);
  }, [leads, stages]);

  if (stages.length === 0) {
    return (
      <EmptyState
        icon={View}
        title="Konfigurasi Pipeline Dibutuhkan"
        description="Harap atur tahapan prospek di halaman Pengaturan > Pipeline terlebih dahulu."
      />
    );
  }

  return (
    <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex gap-4 pb-4">
            {stages.map((stage) => (
                <KanbanColumn key={stage} title={stage} leads={leadsByStage[stage] ?? []} />
            ))}
        </div>
        <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}


function PageSkeleton() {
  return (
    <div className="flex gap-4">
        {[...Array(4)].map((_, i) => (
            <div key={i} className="flex-1 min-w-[280px] bg-muted/50 rounded-lg p-2 space-y-4">
                <Skeleton className="h-6 w-1/2" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
            </div>
        ))}
    </div>
  )
}

export default function ProspekPage() {
  const firestore = useFirestore();
  const { userProfile, isLoading: isProfileLoading, error: profileError } = useUserProfile();

  const leadsQuery = useMemoFirebase(() => {
    if (!firestore || !userProfile) return null;
    const coll = collection(firestore, FIRESTORE_COLLECTIONS.leads);
    if (userProfile.role === 'SUPER_ADMIN') {
      return query(coll);
    }
    if (userProfile.role === 'HEAD_SALES' && userProfile.teamId) {
      return query(coll, where('teamId', '==', userProfile.teamId));
    }
    if (userProfile.role === 'SALES') {
      return query(coll, where('ownerUid', '==', userProfile.id));
    }
    return null;
  }, [firestore, userProfile]);

  const pipelineSettingsRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return doc(firestore, 'settings', 'pipeline');
  }, [firestore]);
  
  const { data: leads, isLoading: isLoadingLeads, error: leadsError } = useCollection<Lead>(leadsQuery);
  const { data: pipelineSettings, isLoading: isLoadingSettings, error: settingsError } = useDoc<PipelineSettings>(pipelineSettingsRef);
  
  const isLoading = isProfileLoading || isLoadingLeads || isLoadingSettings;
  const error = profileError || leadsError || settingsError;
  
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
    if (!leads || leads.length === 0) { 
      return (
        <EmptyState
          icon={View}
          title="Belum ada prospek"
          description="Data prospek akan muncul di sini setelah Anda menambahkannya."
        />
      );
    }
    return <KanbanBoard leads={leads} stages={pipelineSettings?.leadStages || []} />;
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 h-full flex flex-col">
      <h1 className="text-3xl font-bold tracking-tight font-headline">Prospek (Leads)</h1>
      <p className="text-muted-foreground mt-2 font-serif">
        Kelola alur prospek Anda menggunakan papan Kanban.
      </p>
      <div className="mt-8 flex-1">
        {renderContent()}
      </div>
    </div>
  );
}
