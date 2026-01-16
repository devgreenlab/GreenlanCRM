'use client';

import { useMemo, useState } from 'react';
import { collection, query, where, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { FIRESTORE_COLLECTIONS } from '@/lib/firestore/collections';
import type { Lead, PipelineSettings } from '@/lib/firestore/types';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/shared/error-state';
import { EmptyState } from '@/components/shared/empty-state';
import { View } from 'lucide-react';
import { useUserProfile } from '@/hooks/use-user-profile';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';


function LeadCard({ lead }: { lead: Lead }) {
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, leadId: string) => {
    e.dataTransfer.setData('leadId', leadId);
  };

  return (
    <Card 
      className="mb-2 cursor-grab active:cursor-grabbing"
      draggable
      onDragStart={(e) => handleDragStart(e, lead.id)}
    >
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

function KanbanColumn({ 
    title, 
    leads,
    onDragOver,
    onDrop,
    isDraggingOver,
}: { 
    title: string; 
    leads: Lead[];
    onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
    onDrop: (e: React.DragEvent<HTMLDivElement>) => void;
    isDraggingOver: boolean;
}) {
  return (
    <div 
        className={cn(
            "flex-1 min-w-[280px] bg-muted/50 rounded-lg p-2 transition-colors",
            isDraggingOver && "bg-accent/20"
        )}
        onDragOver={onDragOver}
        onDrop={onDrop}
    >
      <h3 className="font-semibold p-2 mb-2 capitalize">{title} ({leads.length})</h3>
      <div className="h-full overflow-y-auto">
        {leads.length > 0 ? (
          leads.map((lead) => <LeadCard key={lead.id} lead={lead} />)
        ) : (
          <div className="p-4 text-center text-sm text-muted-foreground h-20 flex items-center justify-center rounded-lg border-2 border-dashed">
              Jatuhkan di sini
          </div>
        )}
      </div>
    </div>
  );
}


function KanbanBoard({ leads, stages }: { leads: Lead[]; stages: string[] }) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [draggedOverColumn, setDraggedOverColumn] = useState<string | null>(null);

  const leadsByStage = useMemo(() => {
    const initial: Record<string, Lead[]> = {};
    stages.forEach(stage => {
        initial[stage] = [];
    });
    
    return leads.reduce((acc, lead) => {
      const stage = lead.stage || stages[0]; // Default to first stage if not set
      if (!acc[stage]) {
        acc[stage] = [];
      }
      acc[stage].push(lead);
      return acc;
    }, initial);
  }, [leads, stages]);
  
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, stage: string) => {
    e.preventDefault();
    setDraggedOverColumn(stage);
  };
  
  const handleDragLeave = () => {
    setDraggedOverColumn(null);
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>, newStage: string) => {
    e.preventDefault();
    setDraggedOverColumn(null);
    const leadId = e.dataTransfer.getData('leadId');
    if (!leadId || !firestore) return;

    const currentLead = leads.find(l => l.id === leadId);
    if(currentLead?.stage === newStage) return;

    const leadRef = doc(firestore, FIRESTORE_COLLECTIONS.leads, leadId);
    try {
        await updateDoc(leadRef, { 
            stage: newStage,
            updatedAt: serverTimestamp() 
        });
        toast({
            title: 'Prospek Diperbarui',
            description: `Prospek telah dipindahkan ke tahapan "${newStage}".`
        });
    } catch(error: any) {
        console.error("Error updating lead stage:", error);
        toast({
            variant: 'destructive',
            title: 'Gagal Memperbarui Prospek',
            description: error.message || 'Tidak dapat memindahkan prospek.'
        });
    }
  };


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
    <ScrollArea className="w-full whitespace-nowrap" onDragLeave={handleDragLeave}>
        <div className="flex gap-4 pb-4">
            {stages.map((stage) => (
                <KanbanColumn 
                    key={stage} 
                    title={stage} 
                    leads={leadsByStage[stage] ?? []}
                    onDragOver={(e) => handleDragOver(e, stage)}
                    onDrop={(e) => handleDrop(e, stage)}
                    isDraggingOver={draggedOverColumn === stage}
                />
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
    if (!leads) { 
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
        Kelola alur prospek Anda menggunakan papan Kanban. Pindahkan kartu antar kolom untuk memperbarui status.
      </p>
      <div className="mt-8 flex-1">
        {renderContent()}
      </div>
    </div>
  );
}
