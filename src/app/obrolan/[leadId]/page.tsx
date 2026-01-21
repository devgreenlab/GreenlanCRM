'use client';

import * as React from 'react';
import { notFound } from 'next/navigation';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';

import { ChatMessages } from '@/components/chat/chat-messages';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/shared/error-state';

interface ChatPageProps {
  params: {
    leadId?: string; 
  };
}

function MessagesSkeleton() {
  return (
    <div className="p-4 space-y-4">
      <Skeleton className="h-16 w-3/4" />
      <Skeleton className="h-16 w-3/4 ml-auto" />
      <Skeleton className="h-10 w-1/2" />
      <Skeleton className="h-16 w-3/4 ml-auto" />
    </div>
  )
}

export default function ObrolanLeadIdPage({ params }: ChatPageProps) {
  const firestore = useFirestore();
  const { leadId } = params;

  // If there is no leadId, this is the index page for /obrolan
  if (!leadId) {
    return (
      <div className="h-full flex items-center justify-center bg-secondary">
        <p className="text-muted-foreground">Pilih obrolan untuk memulai.</p>
      </div>
    );
  }

  const leadRef = useMemoFirebase(
    () => (firestore && leadId ? doc(firestore, 'leads', leadId) : null),
    [firestore, leadId]
  );
  const { data: lead, isLoading, error } = useDoc(leadRef);
  
  if (isLoading) {
    return <MessagesSkeleton />;
  }

  if (error) {
    return <ErrorState message="Gagal memuat data prospek." onRetry={() => window.location.reload()} />;
  }

  if (!lead) {
    notFound();
  }

  return <ChatMessages lead={lead} />;
}
