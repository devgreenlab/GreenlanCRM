'use client';

import * as React from 'react';
import { Send } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/firebase';

interface ChatComposerProps {
  leadId: string;
}

export function ChatComposer({ leadId }: ChatComposerProps) {
  const [text, setText] = React.useState('');
  const [isSending, setIsSending] = React.useState(false);
  const { toast } = useToast();
  const { user } = useUser();

  const handleSend = async () => {
    if (!text.trim() || !user) return;
    setIsSending(true);
    try {
        const token = await user.getIdToken();
        const response = await fetch('/api/wa/send', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ leadId, text })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to send message.');
        }

        setText('');
    } catch (error: any) {
        toast({
            variant: 'destructive',
            title: 'Error Sending Message',
            description: error.message
        });
    } finally {
        setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };


  return (
    <div className="flex items-start gap-2">
      <Textarea
        placeholder="Ketik pesan Anda..."
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        rows={1}
        className="min-h-0 resize-none"
        disabled={isSending}
      />
      <Button onClick={handleSend} disabled={!text.trim() || isSending}>
        <Send className="h-4 w-4" />
        <span className="sr-only">Kirim</span>
      </Button>
    </div>
  );
}
