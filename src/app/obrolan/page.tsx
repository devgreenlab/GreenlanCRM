'use client';

import { ChatLayout } from '@/components/chat/chat-layout';
import { Card, CardContent } from '@/components/ui/card';
import { MessagesSquare } from 'lucide-react';

export default function ObrolanPage() {
  
  return (
    <ChatLayout>
        <div className="h-full flex items-center justify-center">
            <Card className="w-full max-w-md text-center">
                <CardContent className="p-10">
                    <MessagesSquare className="mx-auto h-12 w-12 text-muted-foreground" />
                    <h2 className="mt-4 text-xl font-semibold">Pilih Obrolan</h2>
                    <p className="mt-2 text-muted-foreground">
                        Pilih obrolan dari daftar di sebelah kiri untuk melihat pesan.
                    </p>
                </CardContent>
            </Card>
        </div>
    </ChatLayout>
  );
}
