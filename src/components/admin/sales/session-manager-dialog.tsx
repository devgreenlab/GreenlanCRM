'use client';

import * as React from 'react';
import Image from 'next/image';
import { useUser } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import type { UserProfile } from '@/lib/firestore/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { RefreshCw, QrCode, Play, StopCircle, LogOut } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface SessionManagerDialogProps {
  user: UserProfile;
}

type WahaStatus = 'STOPPED' | 'STARTING' | 'SCAN_QR_CODE' | 'WORKING' | 'FAILED' | 'UNKNOWN' | null;

interface StatusResponse {
  status: WahaStatus;
  qrCode?: string;
  error?: string;
}

const statusVariant: { [key: string]: 'default' | 'secondary' | 'destructive' | 'outline' } = {
  WORKING: 'default',
  STARTING: 'secondary',
  SCAN_QR_CODE: 'secondary',
  STOPPED: 'outline',
  FAILED: 'destructive',
  UNKNOWN: 'destructive',
};

const statusText: { [key: string]: string } = {
  WORKING: 'Terhubung',
  STARTING: 'Memulai...',
  SCAN_QR_CODE: 'Pindai Kode QR',
  STOPPED: 'Dihentikan',
  FAILED: 'Gagal',
  UNKNOWN: 'Tidak Diketahui',
};

export function SessionManagerDialog({ user }: SessionManagerDialogProps) {
  const { user: authUser } = useUser();
  const { toast } = useToast();

  const [status, setStatus] = React.useState<WahaStatus>(null);
  const [qrCode, setQrCode] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const getAuthHeader = async () => {
    if (!authUser) throw new Error('User not authenticated.');
    const token = await authUser.getIdToken();
    return { Authorization: `Bearer ${token}` };
  };

  const fetchStatus = React.useCallback(async () => {
    if (!user.wahaSession) return;
    setIsLoading(true);
    setError(null);
    setQrCode(null);
    try {
      const headers = await getAuthHeader();
      const response = await fetch(`/api/admin/waha/status?session=${user.wahaSession}`, { headers });
      const data: StatusResponse = await response.json();
      if (!response.ok) throw new Error(data.error || 'Gagal mengambil status.');

      setStatus(data.status);
      if (data.status === 'SCAN_QR_CODE' && data.qrCode) {
        setQrCode(data.qrCode);
      }
    } catch (e: any) {
      setError(e.message);
      setStatus('FAILED');
    } finally {
      setIsLoading(false);
    }
  }, [user.wahaSession, authUser]);

  React.useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleSessionAction = async (action: 'start' | 'stop' | 'logout') => {
    setIsLoading(true);
    setError(null);
    setQrCode(null);
    try {
      const headers = await getAuthHeader();
      const response = await fetch(`/api/admin/waha/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ session: user.wahaSession }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || `Gagal melakukan aksi: ${action}`);
      toast({ title: 'Sukses', description: `Sesi berhasil ${action}.` });
      
      // The start action might return a QR code immediately
      if(action === 'start' && data.status === 'SCAN_QR_CODE' && data.qrCode) {
        setStatus(data.status);
        setQrCode(data.qrCode);
      } else {
        // Otherwise, just refetch the status
        await fetchStatus();
      }

    } catch (e: any) {
      setError(e.message);
      setStatus('FAILED');
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-lg border p-4">
        <div className="font-medium">Status Sesi</div>
        {isLoading ? (
          <Skeleton className="h-6 w-24" />
        ) : (
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={fetchStatus}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            {status && <Badge variant={statusVariant[status]}>{statusText[status]}</Badge>}
          </div>
        )}
      </div>

      {error && (
         <Alert variant="destructive">
            <AlertTitle>Terjadi Kesalahan</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {isLoading && qrCode === null && (
        <div className="flex items-center justify-center h-48">
            <Skeleton className="h-40 w-40" />
        </div>
      )}

      {status === 'SCAN_QR_CODE' && qrCode && (
        <div className="flex flex-col items-center justify-center">
          <p className="text-sm text-muted-foreground mb-2 text-center">Pindai dengan aplikasi WhatsApp di ponsel Anda untuk menghubungkan.</p>
          <Image src={qrCode} alt="WhatsApp QR Code" width={256} height={256} className="rounded-lg border bg-white" />
        </div>
      )}
      
      <div className="grid grid-cols-2 gap-2 pt-4">
        {status === 'STOPPED' || status === 'FAILED' ? (
             <Button onClick={() => handleSessionAction('start')} disabled={isLoading}>
                <Play className="mr-2 h-4 w-4" /> Mulai Sesi
            </Button>
        ): (
             <Button variant="secondary" onClick={() => handleSessionAction('stop')} disabled={isLoading}>
                <StopCircle className="mr-2 h-4 w-4" /> Hentikan Sesi
            </Button>
        )}
       
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={isLoading || status === 'STOPPED'}>
                    <LogOut className="mr-2 h-4 w-4" /> Logout
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Apakah Anda yakin ingin logout?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Tindakan ini akan memutuskan hubungan akun WhatsApp dari sesi ini. Anda perlu memindai ulang Kode QR untuk menghubungkannya kembali.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Batal</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleSessionAction('logout')}>Ya, Logout</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
