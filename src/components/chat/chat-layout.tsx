'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import { useUserProfile } from '@/hooks/use-user-profile';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { FIRESTORE_COLLECTIONS } from '@/lib/firestore/collections';
import type { Lead } from '@/lib/firestore/types';
import { ChatList } from './chat-list';
import { Skeleton } from '../ui/skeleton';
import { ErrorState } from '../shared/error-state';
import { EmptyState } from '../shared/empty-state';
import { MessagesSquare } from 'lucide-react';


function ChatListSkeleton() {
    return (
        <div className="p-2 space-y-2">
            {[...Array(10)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-2">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-1">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                    </div>
                </div>
            ))}
        </div>
    )
}

export function ChatLayout({ children }: { children: React.ReactNode }) {
  const { leadId: activeLeadId } = useParams();
  const { userProfile, isLoading: isProfileLoading, error: profileError } = useUserProfile();
  const firestore = useFirestore();

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
    return query(coll, where('ownerUid', '==', 'user-has-no-permission'));
  }, [firestore, userProfile]);

  const { data: leads, isLoading: isLoadingLeads, error: leadsError } = useCollection<Lead>(leadsQuery);

  const isLoading = isProfileLoading || isLoadingLeads;
  const error = profileError || leadsError;
  
  const renderChatList = () => {
    if (isLoading) {
        return <ChatListSkeleton />;
    }
    if (error) {
        return <ErrorState message="Gagal memuat daftar obrolan." onRetry={() => window.location.reload()} />;
    }
    if (!leads || leads.length === 0) {
        return (
            <div className="p-4">
                <EmptyState 
                    icon={MessagesSquare}
                    title="Tidak Ada Obrolan"
                    description="Pesan masuk dari pelanggan baru akan muncul di sini secara otomatis."
                />
            </div>
        );
    }
    return <ChatList leads={leads} activeLeadId={Array.isArray(activeLeadId) ? activeLeadId[0] : activeLeadId} />;
  }

  return (
    <div className="h-[calc(100vh-theme(height.14))] grid md:grid-cols-[350px_1fr]">
      <aside className="hidden md:flex flex-col border-r">
        {renderChatList()}
      </aside>
      <main className="flex flex-col">
        {children}
      </main>
    </div>
  );
}
