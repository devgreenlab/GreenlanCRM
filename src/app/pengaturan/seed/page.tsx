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
import { useAuth, useFirestore } from '@/firebase';
import { collection, addDoc, getDocs, query, where, serverTimestamp, writeBatch, doc, setDoc } from 'firebase/firestore';
import { FIRESTORE_COLLECTIONS } from '@/lib/firestore/collections';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';

export default function SeedPage() {
  const { toast } = useToast();
  const firestore = useFirestore();
  const auth = useAuth();
  const [isInitializing, setIsInitializing] = React.useState(false);
  const [isCreatingAdmin, setIsCreatingAdmin] = React.useState(false);


  const handleInitSetup = async () => {
    if (!firestore) {
      toast({ variant: 'destructive', title: 'Error', description: 'Firestore is not initialized.' });
      return;
    }
    setIsInitializing(true);

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
            leadStages: ['new', 'qualified', 'unqualified'],
            dealStages: ['prospek', 'negosiasi', 'deal', 'produksi', 'selesai', 'lost']
        }, { merge: true });

        batch.set(navRef, {
            roleAccess: {
                SUPER_ADMIN: ["dashboard","obrolan","kontak","prospek","costing-harga","penawaran","tagihan","pesanan","pengaturan","profil","navigasi","integrasi","users","teams","pipeline", "sales-config"],
                HEAD_SALES: ["dashboard","obrolan","kontak","prospek","penawaran","tagihan","pesanan","pengaturan","profil"],
                SALES: ["dashboard","obrolan","kontak","prospek","pengaturan","profil"]
            }
        }, { merge: true });

        batch.set(integrationsRef, {
            waha: { baseUrl: "" },
            flags:{ inboundEnabled: false, outboundEnabled: false, captureFromNow: true }
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
        setIsInitializing(false);
    }
  };

  const handleCreateSuperAdmin = async () => {
    if (!firestore || !auth) {
      toast({ variant: 'destructive', title: 'Error', description: 'Firebase is not initialized.' });
      return;
    }
    setIsCreatingAdmin(true);

    const adminEmail = 'greenlab@gmail.com';
    const adminPassword = 'password123';

    try {
      // 1. Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        adminEmail,
        adminPassword,
      );
      const user = userCredential.user;

      // 2. Update user profile in Auth
      await updateProfile(user, { displayName: 'Greenlab Admin' });

      // 3. Create user document in Firestore with SUPER_ADMIN role
      const userRef = doc(firestore, FIRESTORE_COLLECTIONS.users, user.uid);
      await setDoc(userRef, {
        name: 'Greenlab Admin',
        email: adminEmail,
        role: 'SUPER_ADMIN',
        isActive: true,
        teamId: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      toast({
        title: 'Super Admin Created',
        description: `User ${adminEmail} created with SUPER_ADMIN role.`,
      });
    } catch (error: any) {
      console.error('Error creating super admin:', error);
      toast({
        variant: 'destructive',
        title: 'Creation Failed',
        description: error.code === 'auth/email-already-in-use'
          ? 'This super admin account already exists.'
          : error.message || 'Could not create super admin user.',
      });
    } finally {
      setIsCreatingAdmin(false);
    }
  };


  return (
    <Card>
      <CardHeader>
        <CardTitle>Seed & Initialization</CardTitle>
        <CardDescription>
          Use these actions to set up your CRM for the first time or for maintenance.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="p-4 border rounded-lg">
            <h3 className="font-semibold">Initial Setup</h3>
            <p className="text-sm text-muted-foreground mt-1">
                Creates the default team (MSBD) and necessary settings documents (pipeline, navigation, integrations). This only needs to be run once.
            </p>
            <Button onClick={handleInitSetup} disabled={isInitializing} className="mt-4">
            {isInitializing ? 'Initializing...' : 'Initialize Setup'}
            </Button>
        </div>
        <div className="p-4 border rounded-lg">
          <h3 className="font-semibold">Create Super Admin</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Creates a default SUPER_ADMIN user with email <code className="font-mono bg-muted px-1 py-0.5 rounded">greenlab@gmail.com</code> and password <code className="font-mono bg-muted px-1 py-0.5 rounded">password123</code>.
          </p>
          <Button onClick={handleCreateSuperAdmin} disabled={isCreatingAdmin} variant="secondary" className="mt-4">
            {isCreatingAdmin ? 'Creating...' : 'Create Super Admin'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
