'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useFirestore } from '@/firebase';
import { collection, addDoc, getDocs, query, where, serverTimestamp, writeBatch, doc } from 'firebase/firestore';
import { FIRESTORE_COLLECTIONS } from '@/lib/firestore/collections';

export default function SeedPage() {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [isLoading, setIsLoading] = React.useState(false);

  const handleInitSetup = async () => {
    if (!firestore) {
      toast({ variant: 'destructive', title: 'Error', description: 'Firestore is not initialized.' });
      return;
    }
    setIsLoading(true);

    try {
        const batch = writeBatch(firestore);

        // 1. Create default team if not exists
        const teamsRef = collection(firestore, FIRESTORE_COLLECTIONS.teams);
        const teamQuery = query(teamsRef, where('name', '==', 'MSBD'));
        const teamSnapshot = await getDocs(teamQuery);
        if (teamSnapshot.empty) {
            const newTeamRef = doc(teamsRef);
            batch.set(newTeamRef, {
                name: 'MSBD',
                createdAt: serverTimestamp(),
            });
        }

        // 2. Create default settings docs if they don't exist
        const pipelineRef = doc(firestore, 'settings', 'pipeline');
        const navRef = doc(firestore, 'settings', 'navigation');
        const integrationsRef = doc(firestore, 'integrations', 'settings');

        batch.set(pipelineRef, {
            stages: ["prospek","negosiasi","deal","produksi","selesai","lost"],
            slaHours: { prospek:24, negosiasi:48, deal:72, produksi:96, selesai:0, lost:0 }
        }, { merge: true });

        batch.set(navRef, {
            menu: [
                { key:"dashboard", title:"Dashboard", href:"/dashboard", order:1 },
                { key:"obrolan", title:"Obrolan", href:"/obrolan", order:2 },
                { key:"kontak", title:"Kontak", href:"/kontak", order:3 },
                { key:"prospek", title:"Prospek", href:"/prospek", order:4 },
                { key:"costing", title:"Costing Harga", href:"/costing-harga", order:5 },
                { key:"penawaran", title:"Penawaran", href:"/penawaran", order:6 },
                { key:"tagihan", title:"Tagihan", href:"/tagihan", order:7 },
                { key:"pesanan", title:"Pesanan", href:"/pesanan", order:8 },
                { key:"pengaturan", title:"Pengaturan", href:"/pengaturan", order:9 }
            ],
            roleAccess: {
                SUPER_ADMIN: ["dashboard","obrolan","kontak","prospek","costing","penawaran","tagihan","pesanan","pengaturan"],
                HEAD_SALES: ["dashboard","obrolan","kontak","prospek","penawaran","tagihan","pesanan"],
                SALES: ["dashboard","obrolan","kontak","prospek"]
            }
        }, { merge: true });

        batch.set(integrationsRef, {
            N8N_WEBHOOK_URL:"",
            CRM_PUBLIC_WEBHOOK_SECRET:"",
            WAHA_API_URL:"",
            flags:{ inboundEnabled:false, outboundEnabled:false }
        }, { merge: true });
        
        await batch.commit();

      toast({ title: 'Success', description: 'Initial setup completed successfully.' });
    } catch (error: any) {
      console.error('Error during initial setup:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Could not complete initial setup.',
      });
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Seed & Initialization</CardTitle>
        <CardDescription>
          Use these actions to set up your CRM for the first time.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="p-4 border rounded-lg">
            <h3 className="font-semibold">Initial Setup</h3>
            <p className="text-sm text-muted-foreground mt-1">
                Creates the default team (MSBD) and necessary settings documents (pipeline, navigation). This only needs to be run once.
            </p>
            <Button onClick={handleInitSetup} disabled={isLoading} className="mt-4">
            {isLoading ? 'Initializing...' : 'Initialize Setup'}
            </Button>
        </div>
      </CardContent>
    </Card>
  );
}
