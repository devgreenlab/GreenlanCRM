'use client';

import * as React from 'react';
import { collection, query, where, orderBy } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { FIRESTORE_COLLECTIONS } from '@/lib/firestore/collections';
import type { Lead, Activity } from '@/lib/firestore/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/shared/error-state';
import { EmptyState } from '@/components/shared/empty-state';
import { MessageCircle, Send, CornerUpLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useUserProfile } from '@/hooks/use-user-profile';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useUser } from '@/firebase';


function getInitials(name = '') {
    if (!name) return 'U'; // U for Unknown
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
}


function ChatListItem({
  lead,
  isSelected,
  onSelect,
}: {
  lead: Lead;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const displayName = lead.customerName || lead.phone || "Unknown";
  return (
    <div
      className={cn(
        'flex items-start gap-4 p-3 rounded-lg cursor-pointer transition-colors',
        isSelected ? 'bg-muted' : 'hover:bg-muted/50'
      )}
      onClick={onSelect}
    >
      <Avatar>
        <AvatarImage src={`https://i.pravatar.cc/150?u=${lead.chatId}`} />
        <AvatarFallback>{getInitials(displayName)}</AvatarFallback>
      </Avatar>
      <div className="flex-1 overflow-hidden">
        <div className="flex justify-between items-center">
          <div className="font-semibold truncate">{displayName}</div>
          {lead.lastInboundAt && (
            <div className="text-xs text-muted-foreground whitespace-nowrap">
              {formatDistanceToNow(lead.lastInboundAt.toDate(), {
                addSuffix: true,
                locale: idLocale,
              })}
            </div>
          )}
        </div>
        <p className="text-sm text-muted-foreground truncate">
          {lead.lastMessagePreview || 'Klik untuk melihat pesan...'}
        </p>
      </div>
    </div>
  );
}

function ActivityBubble({ activity }: { activity: Activity }) {
  const isOutbound = activity.type === 'whatsapp_out';
  return (
    <div className={cn('flex items-end gap-2', isOutbound ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-xs lg:max-w-md p-3 rounded-xl',
          isOutbound ? 'bg-primary text-primary-foreground' : 'bg-muted'
        )}
      >
        <p className="whitespace-pre-wrap">{activity.content}</p>
        <div className="text-xs opacity-70 mt-1 text-right">
          {activity.createdAt && formatDistanceToNow(activity.createdAt.toDate(), { addSuffix: true, locale: idLocale })}
        </div>
      </div>
    </div>
  );
}

function ChatWindow({ lead }: { lead: Lead | null }) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { user: authUser } = useUser();
  const [message, setMessage] = React.useState('');
  const [isSending, setIsSending] = React.useState(false);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  const activitiesQuery = useMemoFirebase(() => {
    if (!firestore || !lead) return null;
    return query(
      collection(firestore, FIRESTORE_COLLECTIONS.activities),
      where('leadId', '==', lead.id),
      orderBy('createdAt', 'asc')
    );
  }, [firestore, lead]);

  const { data: activities, isLoading, error } = useCollection<Activity>(activitiesQuery);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  React.useEffect(() => {
    scrollToBottom();
  }, [activities]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !lead || !authUser) return;

    setIsSending(true);
    try {
        const token = await authUser.getIdToken();
      const response = await fetch('/api/wa/send', {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ message, leadId: lead.id }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to send message.');
      }

      toast({ title: 'Sukses', description: 'Pesan berhasil dikirim.' });
      setMessage('');
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setIsSending(false);
    }
  };
  
  const displayName = lead?.customerName || lead?.phone || "Unknown";

  if (!lead) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-muted/50 rounded-lg">
        <CornerUpLeft className="h-16 w-16 text-muted-foreground/50" />
        <p className="mt-4 text-lg text-muted-foreground">Pilih percakapan untuk memulai</p>
      </div>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex flex-row items-center gap-4 border-b">
        <Avatar>
          <AvatarImage src={`https://i.pravatar.cc/150?u=${lead.chatId}`} />
          <AvatarFallback>{getInitials(displayName)}</AvatarFallback>
        </Avatar>
        <div>
          <div className="font-semibold">{displayName}</div>
          <div className="text-sm text-muted-foreground">{lead.chatId}</div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 p-0">
        <ScrollArea className="h-full">
          <div className="p-4 space-y-4">
            {isLoading && <Skeleton className="h-16 w-1/2" />}
            {error && <ErrorState onRetry={() => {}} message="Gagal memuat pesan." />}
            {activities && activities.length === 0 && (
                <EmptyState icon={MessageCircle} title="Belum Ada Pesan" description="Mulai percakapan dengan mengirim pesan pertama." />
            )}
            {activities?.map((activity) => (
              <ActivityBubble key={activity.id} activity={activity} />
            ))}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
      </CardContent>
      <CardFooter className="p-4 border-t">
        <form onSubmit={handleSendMessage} className="flex w-full items-center gap-2">
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Ketik pesan Anda..."
            className="flex-1 resize-none"
            rows={1}
            disabled={isSending}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage(e);
              }
            }}
          />
          <Button type="submit" size="icon" disabled={isSending || !message.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </CardFooter>
    </Card>
  );
}

function PageSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 h-full">
        <div className="col-span-1 border-r pr-4">
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
        </div>
        <div className="col-span-1 md:col-span-2 lg:col-span-3">
             <Skeleton className="h-full w-full rounded-lg" />
        </div>
    </div>
  );
}

export default function ObrolanPage() {
  const firestore = useFirestore();
  const { userProfile, isLoading: isProfileLoading, error: profileError } = useUserProfile();
  const [selectedLead, setSelectedLead] = React.useState<Lead | null>(null);

  const whatsappLeadsQuery = useMemoFirebase(() => {
    if (!firestore || !userProfile) {
      return null;
    }

    const coll = collection(firestore, FIRESTORE_COLLECTIONS.leads);
    const baseFilter = where('source', '==', 'whatsapp');

    if (userProfile.role === 'SUPER_ADMIN') {
      // Super admin sees all whatsapp leads.
      return query(coll, baseFilter, orderBy('lastInboundAt', 'desc'));
    } 
    
    if (userProfile.role === 'HEAD_SALES' && userProfile.teamId) {
      // Head of Sales sees whatsapp leads from their own team.
      return query(coll, baseFilter, where('teamId', '==', userProfile.teamId), orderBy('lastInboundAt', 'desc'));
    } 
    
    if (userProfile.role === 'SALES') {
      // Sales see their own assigned whatsapp leads.
      return query(coll, baseFilter, where('ownerUid', '==', userProfile.id), orderBy('lastInboundAt', 'desc'));
    }

    // For any other case (e.g., role not set, sales/head of sales without team/id),
    // return a query that finds nothing to ensure no data is leaked and no error is thrown.
    return query(coll, where('ownerUid', '==', 'user-has-no-permission'));
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
      return <ErrorState onRetry={handleRetry} message="Gagal memuat daftar obrolan." />;
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
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 h-full">
            <div className="col-span-1 border-r">
                 <ScrollArea className="h-full pr-4">
                    <div className="space-y-1">
                        {leads.map((lead) => (
                            <ChatListItem
                                key={lead.id}
                                lead={lead}
                                isSelected={selectedLead?.id === lead.id}
                                onSelect={() => setSelectedLead(lead)}
                            />
                        ))}
                    </div>
                </ScrollArea>
            </div>
            <div className="col-span-1 md:col-span-2 lg:col-span-3">
               <ChatWindow lead={selectedLead} />
            </div>
        </div>
    );
  };

  return (
    <div className="h-[calc(100vh-57px)] flex flex-col">
      <div className="p-4 sm:p-6 lg:p-8 border-b">
        <h1 className="text-3xl font-bold tracking-tight font-headline">Obrolan (Chat)</h1>
        <p className="text-muted-foreground mt-2 font-serif">
          Kelola percakapan WhatsApp dengan prospek Anda.
        </p>
      </div>
      <div className="flex-1 p-4 sm:p-6 lg:p-8 overflow-hidden">
        {renderContent()}
      </div>
    </div>
  );
}
