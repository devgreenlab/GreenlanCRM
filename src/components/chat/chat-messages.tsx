'use client';

import * as React from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import type { Lead, Message } from '@/lib/firestore/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ChatComposer } from './chat-composer';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Skeleton } from '../ui/skeleton';

interface ChatMessagesProps {
  lead: Lead;
}

function MessagesSkeleton() {
  return (
    <div className="p-4 space-y-4">
      <Skeleton className="h-16 w-3/4 rounded-lg" />
      <Skeleton className="h-16 w-3/4 ml-auto rounded-lg" />
      <Skeleton className="h-10 w-1/2 rounded-lg" />
      <Skeleton className="h-16 w-3/4 ml-auto rounded-lg" />
    </div>
  )
}

export function ChatMessages({ lead }: ChatMessagesProps) {
  const firestore = useFirestore();
  const scrollAreaRef = React.useRef<HTMLDivElement>(null);

  const messagesQuery = useMemoFirebase(
    () =>
      firestore
        ? query(collection(firestore, 'leads', lead.id, 'messages'), orderBy('timestamp', 'asc'))
        : null,
    [firestore, lead.id]
  );
  const { data: messages, isLoading } = useCollection<Message>(messagesQuery);
  
  React.useEffect(() => {
    if (scrollAreaRef.current) {
        setTimeout(() => {
             if(scrollAreaRef.current) {
                scrollAreaRef.current.scrollTo({ top: scrollAreaRef.current.scrollHeight });
             }
        }, 100);
    }
  }, [messages]);
  

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center gap-4 border-b p-4">
        <Avatar>
            <AvatarFallback>{lead.customerName.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div>
            <p className="font-semibold">{lead.customerName}</p>
            <p className="text-sm text-muted-foreground">{lead.phone}</p>
        </div>
      </header>
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full" viewportRef={scrollAreaRef}>
          {isLoading ? (
            <MessagesSkeleton />
          ) : (
            <div className="p-4 space-y-4">
              {messages?.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    'flex items-end gap-2 max-w-md',
                    msg.direction === 'out' ? 'ml-auto flex-row-reverse' : 'mr-auto'
                  )}
                >
                  <div
                    className={cn(
                      'rounded-lg px-3 py-2',
                      msg.direction === 'out'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    )}
                  >
                    <p className="text-sm">{msg.text}</p>
                    <p className={cn(
                        "text-xs mt-1",
                        msg.direction === 'out' ? 'text-primary-foreground/70' : 'text-muted-foreground'
                    )}>
                        {msg.timestamp ? format(msg.timestamp.toDate(), 'HH:mm') : ''}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>
      <footer className="border-t p-4">
        <ChatComposer leadId={lead.id} />
      </footer>
    </div>
  );
}
