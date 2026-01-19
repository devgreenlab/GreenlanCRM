'use client';

import * as React from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { useUserProfile } from '@/hooks/use-user-profile';
import { collection, query, where, doc, updateDoc } from 'firebase/firestore';
import type { UserProfile } from '@/lib/firestore/types';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ShieldAlert, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { EmptyState } from '@/components/shared/empty-state';

// State to manage input fields for each user
type SalesConfigState = {
  [userId: string]: {
    wahaSession: string;
    waNumber: string;
  };
};

function PageSkeleton() {
    return (
        <Card>
            <CardHeader>
                <Skeleton className="h-8 w-1/2" />
                <Skeleton className="h-4 w-3/4 mt-2" />
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="flex items-center space-x-4 p-4 border-b">
                            <div className="space-y-2 flex-1">
                                <Skeleton className="h-4 w-[250px]" />
                            </div>
                            <Skeleton className="h-10 w-[200px]" />
                            <Skeleton className="h-10 w-[200px]" />
                            <Skeleton className="h-10 w-[80px]" />
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}


export default function SalesConfigPage() {
  const { userProfile, isLoading: isProfileLoading } = useUserProfile();
  const firestore = useFirestore();
  const { toast } = useToast();

  const salesUsersQuery = useMemoFirebase(
    () =>
      firestore
        ? query(collection(firestore, 'users'), where('role', '==', 'SALES'))
        : null,
    [firestore]
  );

  const { data: salesUsers, isLoading: isLoadingUsers } = useCollection<UserProfile>(salesUsersQuery);

  const [configs, setConfigs] = React.useState<SalesConfigState>({});
  const [savingStates, setSavingStates] = React.useState<{[userId: string]: boolean}>({});

  // Initialize or update local state when users are fetched
  React.useEffect(() => {
    if (salesUsers) {
      const initialConfigs = salesUsers.reduce((acc, user) => {
        acc[user.id] = {
          wahaSession: user.wahaSession || '',
          waNumber: user.waNumber || '',
        };
        return acc;
      }, {} as SalesConfigState);
      setConfigs(initialConfigs);
    }
  }, [salesUsers]);

  const handleInputChange = (userId: string, field: 'wahaSession' | 'waNumber', value: string) => {
    setConfigs(prev => ({
      ...prev,
      [userId]: {
        ...prev[userId],
        [field]: value,
      },
    }));
  };

  const handleSaveChanges = async (userId: string) => {
    if (!firestore) return;
    
    const userConfig = configs[userId];
    if (!userConfig.wahaSession) {
        toast({
            variant: 'destructive',
            title: 'Validation Error',
            description: 'WAHA Session is a required field.',
        });
        return;
    }

    setSavingStates(prev => ({ ...prev, [userId]: true }));

    const userRef = doc(firestore, 'users', userId);
    try {
      await updateDoc(userRef, {
        wahaSession: userConfig.wahaSession,
        waNumber: userConfig.waNumber,
      });
      toast({ title: 'Success', description: 'Sales configuration saved.' });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Could not save configuration.',
      });
    } finally {
      setSavingStates(prev => ({ ...prev, [userId]: false }));
    }
  };

  const isLoading = isProfileLoading || isLoadingUsers;

  if (isLoading) {
    return <PageSkeleton />;
  }

  if (userProfile?.role !== 'SUPER_ADMIN') {
    return (
      <Alert variant="destructive">
        <ShieldAlert className="h-4 w-4" />
        <AlertTitle>Access Denied</AlertTitle>
        <AlertDescription>Only Super Admins can access this page.</AlertDescription>
      </Alert>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sales Agent Configuration</CardTitle>
        <CardDescription>
          Assign a unique WAHA session and display number to each sales agent for WhatsApp message routing.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {(!salesUsers || salesUsers.length === 0) ? (
            <EmptyState
                icon={Users}
                title="No Sales Agents Found"
                description="Create users with the 'SALES' role to configure them here."
            />
        ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Agent Name</TableHead>
                <TableHead>WAHA Session</TableHead>
                <TableHead>WhatsApp Number</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {salesUsers.map(user => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">
                    <div>{user.name}</div>
                    <div className="text-sm text-muted-foreground">{user.email}</div>
                  </TableCell>
                  <TableCell>
                    <Input
                      value={configs[user.id]?.wahaSession || ''}
                      onChange={e => handleInputChange(user.id, 'wahaSession', e.target.value)}
                      placeholder="e.g., sales_agent_1"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={configs[user.id]?.waNumber || ''}
                      onChange={e => handleInputChange(user.id, 'waNumber', e.target.value)}
                      placeholder="e.g., 628123456789"
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button 
                        size="sm" 
                        onClick={() => handleSaveChanges(user.id)}
                        disabled={savingStates[user.id]}
                    >
                      {savingStates[user.id] ? 'Saving...' : 'Save'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        )}
      </CardContent>
    </Card>
  );
}
