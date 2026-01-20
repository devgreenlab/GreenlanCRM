'use client';

import * as React from 'react';
import { collection, query, where, orderBy, limit, Timestamp } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { FIRESTORE_COLLECTIONS } from '@/lib/firestore/collections';
import type { Lead, Message } from '@/lib/firestore/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/shared/error-state';
import { EmptyState } from '@/components/shared/empty-state';
import { MessageSquare, Send, CornerUpLeft, Search } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useUserProfile } from '@/hooks/use-user-profile';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { format, isToday, isYesterday } from 'date-fns';
import { cn } from '@/lib/utils';
import { useUser } from '@/firebase';


function getInitials(name?: string, phone?: string) {
    const targetName = name && name.trim() ? name : phone;
    if (!targetName) return "??";
    
    const parts = targetName.split(' ').filter(Boolean);
    if (parts.length > 1) {
        return (parts[0][0] + (parts.pop() || '')[0]).toUpperCase();
    }
    if (parts.length === 1 && parts[0]) {
        return parts[0].substring(0, 2).toUpperCase();
    }
    return "??";
}

function formatChatTimestamp(ts?: Timestamp) {
    if (!ts) return '';
    const date = ts.toDate();
    if (isToday(date)) {
        return format(date, 'HH:mm');
    }
    if (isYesterday(date)) {
        return 'Yesterday';
    }
    return format(date, 'dd/MM/yyyy');
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
  const displayName = (lead.customerName || lead.phone || "Unknown").trim();
  
  return (
    <div
      className={cn(
        'flex items-start gap-3 p-2.5 rounded-lg cursor-pointer transition-colors',
        isSelected ? 'bg-muted' : 'hover:bg-muted/50'
      )}
      onClick={onSelect}
    >
      <Avatar className="h-12 w-12 border">
        <AvatarImage src={`https://i.pravatar.cc/150?u=${lead.chatId}`} />
        <AvatarFallback>{getInitials(displayName, lead.phone)}</AvatarFallback>
      </Avatar>
      <div className="flex-1 overflow-hidden border-b pb-2.5">
        <div className="flex justify-between items-center">
          <div className="font-semibold truncate text-sm">{displayName}</div>
          {lead.lastMessageAt && (
            <div className="text-xs text-muted-foreground whitespace-nowrap">
              {formatChatTimestamp(lead.lastMessageAt)}
            </div>
          )}
        </div>
        <p className="text-sm text-muted-foreground truncate mt-1">
          {lead.lastMessagePreview || 'Click to view messages...'}
        </p>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isOutbound = message.direction === 'out';
  
  return (
    <div className={cn('flex items-end gap-2 w-full', isOutbound ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-md p-2.5 rounded-lg shadow-sm',
          isOutbound ? 'bg-green-100 dark:bg-green-900/50' : 'bg-background'
        )}
      >
        <p className="whitespace-pre-wrap text-sm">{message.text}</p>
        <div className="text-xs opacity-60 mt-1.5 text-right">
          {message.timestamp && format(message.timestamp.toDate(), 'HH:mm')}
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

  const messagesQuery = useMemoFirebase(() => {
    if (!firestore || !lead) return null;
    return query(
      collection(firestore, FIRESTORE_COLLECTIONS.leads, lead.id, 'messages'),
      orderBy('timestamp', 'asc'),
      limit(50)
    );
  }, [firestore, lead]);

  const { data: messages, isLoading, error } = useCollection<Message>(messagesQuery);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  React.useEffect(() => {
    if (messages && messages.length > 0) {
        scrollToBottom();
    }
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !lead || !authUser) return;

    setIsSending(true);
    try {
        const token = await authUser.getIdToken();
        const response = await fetch('/api/wa/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`},
            body: JSON.stringify({ message, leadId: lead.id }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Failed to send message.');
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
      <div className="h-full hidden md:flex flex-col items-center justify-center bg-muted/50 rounded-lg">
        <CornerUpLeft className="h-16 w-16 text-muted-foreground/50" />
        <p className="mt-4 text-lg text-muted-foreground">Select a conversation to start</p>
      </div>
    );
  }

  return (
    <Card className="h-full flex flex-col border-0 md:border">
      <CardHeader className="flex flex-row items-center gap-4 border-b p-3">
        <Avatar className="h-10 w-10 border">
          <AvatarImage src={`https://i.pravatar.cc/150?u=${lead.chatId}`} />
          <AvatarFallback>{getInitials(lead.customerName, lead.phone)}</AvatarFallback>
        </Avatar>
        <div>
          <div className="font-semibold">{displayName}</div>
          <div className="text-sm text-muted-foreground">{lead.phone}</div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 p-0 bg-muted/20">
        <ScrollArea className="h-full">
          <div className="p-4 space-y-4">
            {isLoading && <Skeleton className="h-16 w-1/2" />}
            {error && <ErrorState onRetry={() => {}} message="Failed to load messages." />}
            {messages && messages.length === 0 && (
                <EmptyState icon={MessageSquare} title="No Messages Yet" description="Start the conversation by sending the first message." />
            )}
            {messages?.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
      </CardContent>
      <CardFooter className="p-2 border-t bg-background">
        <form onSubmit={handleSendMessage} className="flex w-full items-center gap-2">
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 resize-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
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
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-0 h-full">
        <div className="col-span-1 border-r p-2">
            <div className="space-y-2">
                {[...Array(9)].map((_, i) => (
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
        <div className="col-span-1 md:col-span-2 lg:col-span-3 hidden md:block p-2">
             <Skeleton className="h-full w-full rounded-lg" />
        </div>
    </div>
  );
}

export default function ObrolanPage() {
  const firestore = useFirestore();
  const { userProfile, isLoading: isProfileLoading, error: profileError } = useUserProfile();
  const [selectedLead, setSelectedLead] = React.useState<Lead | null>(null);
  const [searchQuery, setSearchQuery] = React.useState("");

  const whatsappLeadsQuery = useMemoFirebase(() => {
    if (!firestore || !userProfile) return null;
    const coll = collection(firestore, FIRESTORE_COLLECTIONS.leads);
    // REMOVED: orderBy('lastMessageAt', 'desc')
    const baseFilters = [where('source', '==', 'whatsapp')];

    if (userProfile.role === 'SUPER_ADMIN') {
      return query(coll, ...baseFilters);
    } 
    if (userProfile.role === 'HEAD_SALES' && userProfile.teamId) {
      return query(coll, where('teamId', '==', userProfile.teamId), ...baseFilters);
    } 
    if (userProfile.role === 'SALES') {
      return query(coll, where('ownerUid', '==', userProfile.id), ...baseFilters);
    }

    return query(coll, where('ownerUid', '==', 'user-has-no-permission'));
  }, [firestore, userProfile]);

  const { data: leads, isLoading: isLoadingLeads, error: leadsError } = useCollection<Lead>(whatsappLeadsQuery);

  const isLoading = isProfileLoading || isLoadingLeads;
  const error = profileError || leadsError;

  const handleRetry = () => window.location.reload();
  
  const filteredLeads = React.useMemo(() => {
    if (!leads) return [];
    
    // Client-side sorting
    const sortedLeads = [...leads].sort((a, b) => {
        const timeA = a.lastMessageAt?.toMillis() || a.createdAt?.toMillis() || 0;
        const timeB = b.lastMessageAt?.toMillis() || b.createdAt?.toMillis() || 0;
        return timeB - timeA;
    });

    if (!searchQuery) return sortedLeads;

    return sortedLeads.filter(lead => 
        (lead.customerName && lead.customerName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (lead.phone && lead.phone.includes(searchQuery))
    );
  }, [leads, searchQuery]);
  
  React.useEffect(() => {
    // Automatically select the first lead when the list is loaded or filtered
    if (filteredLeads.length > 0 && !selectedLead) {
      setSelectedLead(filteredLeads[0]);
    } else if (filteredLeads.length > 0 && selectedLead) {
      // If a lead is already selected, check if it still exists in the filtered list.
      // If not, select the new first lead. This handles cases where a search query
      // removes the currently selected lead from view.
      const selectedExists = filteredLeads.some(lead => lead.id === selectedLead.id);
      if (!selectedExists) {
        setSelectedLead(filteredLeads[0]);
      }
    } else if (filteredLeads.length === 0) {
      // If there are no leads, clear the selection
      setSelectedLead(null);
    }
  }, [filteredLeads, selectedLead]);


  const renderContent = () => {
    if (isLoading) return <PageSkeleton />;
    if (error) return <ErrorState onRetry={handleRetry} message="Failed to load chat list." />;
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 h-full border rounded-lg overflow-hidden">
            <div className={cn(
                "col-span-1 border-r flex-col",
                selectedLead ? "hidden md:flex" : "flex"
            )}>
                 <div className="p-2 border-b">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input 
                            placeholder="Search chats..." 
                            className="pl-8"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                 </div>
                 <ScrollArea className="flex-1">
                    {filteredLeads.length === 0 ? (
                         <EmptyState icon={MessageSquare} title="No WhatsApp Chats" description="Leads from WhatsApp will appear here." className="border-0 shadow-none"/>
                    ) : (
                        <div className="p-2 space-y-1">
                            {filteredLeads.map((lead) => (
                                <ChatListItem
                                    key={lead.id}
                                    lead={lead}
                                    isSelected={selectedLead?.id === lead.id}
                                    onSelect={() => setSelectedLead(lead)}
                                />
                            ))}
                        </div>
                    )}
                </ScrollArea>
            </div>
            <div className={cn(
              "md:col-span-2 lg:col-span-3 flex-col",
              selectedLead ? "flex" : "hidden md:flex"
            )}>
               <ChatWindow lead={selectedLead} />
            </div>
        </div>
    );
  };

  return (
    <div className="h-[calc(100vh-57px)] flex flex-col p-4 sm:p-6 lg:p-8">
      <div className="pb-4">
        <h1 className="text-3xl font-bold tracking-tight font-headline">Chat</h1>
        <p className="text-muted-foreground mt-2 font-serif">
          Manage your WhatsApp conversations with leads.
        </p>
      </div>
      <div className="flex-1 overflow-hidden">
        {renderContent()}
      </div>
    </div>
  );
}
