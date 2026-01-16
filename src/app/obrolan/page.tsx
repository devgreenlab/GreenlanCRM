'use client';

import { collection, query, where } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { FIRESTORE_COLLECTIONS } from '@/lib/firestore/collections';
import type { Lead } from '@/lib/firestore/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/shared/error-state';
import { EmptyState } from '@/components/shared/empty-state';
import { MessageCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useUserProfile } from '@/hooks/use-user-profile';

function ChatListItem({ lead }: { lead: Lead }) {
    // In a real app, you'd fetch the contact details
  return (
    <div className="flex items-center gap-4 p-2 hover:bg-muted rounded-lg cursor-pointer">
      <Avatar>
         <AvatarImage src={`https://i.pravatar.cc/150?u=${lead.customerName}`} />
        <AvatarFallback>{lead.customerName.charAt(0)}</AvatarFallback>
      </Avatar>
      <div className="flex-1">
        <div className="font-semibold">{lead.customerName}</div>
        <p className="text-sm text-muted-foreground truncate">
          {lead.lastMessagePreview || 'Klik untuk melihat pesan...'}
        </p>
      </div>
      <Badge variant="secondary">{lead.source}</Badge>
    </div>
  );
}

function PageSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(7)].map((_, i) => (
        <div key={i} className="flex items-center space-x-4 p-2">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ObrolanPage() {
  const firestore = useFirestore();
  const { userProfile, isLoading: isProfileLoading, error: profileError } = useUserProfile();

  const whatsappLeadsQuery = useMemoFirebase(() => {
    if (!firestore || !userProfile) return null;
    
    const coll = collection(firestore, FIRESTORE_COLLECTIONS.leads);
    const filters = [where('source', '==', 'whatsapp')];

    if (userProfile.role === 'HEAD_SALES' && userProfile.teamId) {
      filters.push(where('teamId', '==', userProfile.teamId));
    } else if (userProfile.role === 'SALES') {
      filters.push(where('ownerUid', '==', userProfile.id));
    } else if (userProfile.role !== 'SUPER_ADMIN') {
        // A non-super-admin without a team sees nothing.
        return null; 
    }

    return query(coll, ...filters);
  }, [firestore, userProfile]);
  
  const { data: leads, isLoading: isLoadingLeads, error: leadsError } = useCollection<Lead>(whatsappLeadsQuery);
  
  const isLoading = isProfileLoading || isLoadingLeads;
  const error = profileError || leadsError;

  const handleRetry = () => window.location.reload();

  const renderContent = () => {
    if (isLoading) {
      return <PageSkeleton />;
    }
    if (error) {
      return (
        <ErrorState
          onRetry={handleRetry}
          message="Gagal memuat daftar obrolan."
        />
      );
    }
    if (!leads || leads.length === 0) {
      return (
        <EmptyState
          icon={MessageCircle}
          title="Tidak ada obrolan WhatsApp"
          description="Prospek yang berasal dari WhatsApp akan muncul di sini."
        />
      );
    }
    return (
        <ScrollArea className="h-[calc(100vh-200px)]">
            <div className="space-y-2">
                {leads.map((lead) => (
                    <ChatListItem key={lead.id} lead={lead} />
                ))}
            </div>
        </ScrollArea>
    );
  };
  
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <h1 className="text-3xl font-bold tracking-tight font-headline">Obrolan (Chat)</h1>
      <p className="text-muted-foreground mt-2 font-serif">
        Prospek dari WhatsApp akan ditampilkan di sini.
      </p>
      <div className="mt-8 border rounded-lg p-4">
        {renderContent()}
      </div>
    </div>
  );
}
