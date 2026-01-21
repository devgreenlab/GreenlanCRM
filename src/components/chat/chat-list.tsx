'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow, isToday, format } from 'date-fns';
import { id } from 'date-fns/locale';
import { Search } from 'lucide-react';
import type { Lead } from '@/lib/firestore/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/hooks/use-translation';

interface ChatListProps {
  leads: Lead[];
  activeLeadId?: string;
}

export function ChatList({ leads, activeLeadId }: ChatListProps) {
  const router = useRouter();
  const { locale } = useTranslation();
  const [searchTerm, setSearchTerm] = React.useState('');

  const sortedLeads = React.useMemo(() => {
    return [...leads].sort((a, b) => {
      const timeA = a.lastMessageAt?.toMillis() || a.createdAt?.toMillis() || 0;
      const timeB = b.lastMessageAt?.toMillis() || b.createdAt?.toMillis() || 0;
      return timeB - timeA;
    });
  }, [leads]);

  const filteredLeads = React.useMemo(() => {
    if (!searchTerm) return sortedLeads;
    return sortedLeads.filter(lead =>
      lead.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.phone.includes(searchTerm)
    );
  }, [sortedLeads, searchTerm]);

  const formatTimestamp = (ts: any) => {
    if (!ts) return '';
    const date = ts.toDate();
    if (isToday(date)) {
      return format(date, 'HH:mm');
    }
    return format(date, 'dd/MM/yy');
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari atau mulai obrolan baru"
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>
      <ScrollArea className="flex-1">
        {filteredLeads.map((lead) => (
          <button
            key={lead.id}
            className={cn(
              'flex w-full items-start gap-3 p-4 text-left transition-colors hover:bg-muted/50',
              lead.id === activeLeadId && 'bg-muted'
            )}
            onClick={() => router.push(`/obrolan/${lead.id}`)}
          >
            <Avatar className="h-10 w-10">
                <AvatarFallback>{lead.customerName?.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex-1 overflow-hidden">
              <div className="flex justify-between items-center">
                <p className="font-semibold truncate">{lead.customerName}</p>
                <time className="text-xs text-muted-foreground">
                  {formatTimestamp(lead.lastMessageAt)}
                </time>
              </div>
              <div className="flex justify-between items-center mt-1">
                <p className="text-sm text-muted-foreground truncate">
                    {lead.lastMessagePreview || '...'}
                </p>
                {lead.unreadCount && lead.unreadCount > 0 && (
                    <Badge className="h-5 min-w-[20px] justify-center px-1.5">{lead.unreadCount}</Badge>
                )}
              </div>
            </div>
          </button>
        ))}
      </ScrollArea>
    </div>
  );
}
