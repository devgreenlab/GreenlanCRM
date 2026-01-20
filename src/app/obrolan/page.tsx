'use client';

import * as React from 'react';
import { useUser } from '@/firebase';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Smartphone, WifiOff, AlertTriangle, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { EmptyState } from '@/components/shared/empty-state';

// This represents the structure of a session object from the WAHA /api/sessions endpoint
type WahaSession = {
  name: string;
  status: 'WORKING' | 'STARTING' | 'SCAN_QR_CODE' | 'STOPPED' | 'FAILED';
  me?: {
    pushname: string;
    wid: string;
  };
};

function SessionCard({ session }: { session: WahaSession }) {
  const statusVariant: { [key: string]: 'default' | 'secondary' | 'destructive' | 'outline' } = {
    WORKING: 'default',
    STARTING: 'secondary',
    SCAN_QR_CODE: 'secondary',
    STOPPED: 'outline',
    FAILED: 'destructive',
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg">{session.name}</CardTitle>
          <Badge variant={statusVariant[session.status] || 'secondary'}>{session.status}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {session.status === 'WORKING' && session.me ? (
          <div>
            <p className="text-sm font-medium">{session.me.pushname}</p>
            <p className="text-xs text-muted-foreground">{session.me.wid.split('@')[0]}</p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            {session.status === 'SCAN_QR_CODE' ? 'Waiting for QR scan...' : 'Session not connected.'}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function PageSkeleton() {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {[...Array(4)].map((_, i) => (
            <Card key={i}>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <Skeleton className="h-6 w-24" />
                        <Skeleton className="h-6 w-20" />
                    </div>
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-4 w-32 mb-1" />
                    <Skeleton className="h-3 w-24" />
                </CardContent>
            </Card>
        ))}
      </div>
    );
}

export default function ObrolanPage() {
  const { user: authUser } = useUser();
  const { toast } = useToast();
  const [sessions, setSessions] = React.useState<WahaSession[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const fetchSessions = React.useCallback(async () => {
    if (!authUser) return;

    setIsLoading(true);
    setError(null);
    try {
      const token = await authUser.getIdToken();
      const response = await fetch('/api/waha/sessions', {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch sessions.');
      }
      setSessions(data);
    } catch (e: any) {
      setError(e.message);
      toast({
        variant: 'destructive',
        title: 'Error Loading Sessions',
        description: e.message,
      });
    } finally {
      setIsLoading(false);
    }
  }, [authUser, toast]);

  React.useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const renderContent = () => {
    if (isLoading) {
      return <PageSkeleton />;
    }

    if (error) {
      return (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Could Not Connect to WAHA</AlertTitle>
          <AlertDescription>
            {error}
            <div className="mt-4">
                <Button variant="destructive" onClick={fetchSessions}>Retry Connection</Button>
            </div>
          </AlertDescription>
        </Alert>
      );
    }

    if (sessions.length === 0) {
        return (
            <EmptyState 
                icon={WifiOff}
                title="No Active WAHA Sessions"
                description="Either no sessions are configured in WAHA, or the integration settings are incorrect. Please check the Integrations page."
                action={<Button onClick={fetchSessions}>Refresh Sessions</Button>}
            />
        )
    }

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {sessions.map((session) => (
                <SessionCard key={session.name} session={session} />
            ))}
        </div>
    );
  };


  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
            <h1 className="text-3xl font-bold tracking-tight font-headline">Obrolan (WAHA Sessions)</h1>
            <p className="text-muted-foreground mt-2 font-serif">
                Live status of all connected WhatsApp sessions.
            </p>
        </div>
        <Button variant="outline" onClick={fetchSessions} disabled={isLoading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
        </Button>
      </div>

      {renderContent()}
    </div>
  );
}
