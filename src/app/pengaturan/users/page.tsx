'use client';

import * as React from 'react';
import { PlusCircle, Users } from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { FIRESTORE_COLLECTIONS } from '@/lib/firestore/collections';
import type { UserProfile, Team } from '@/lib/firestore/types';

import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/shared/error-state';
import { EmptyState } from '@/components/shared/empty-state';
import { UsersTable } from '@/components/admin/users/users-table';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { UserForm } from '@/components/admin/users/user-form';


function PageSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-10 w-28" />
      </div>
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function UsersPage() {
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const firestore = useFirestore();

  const usersQuery = useMemoFirebase(
    () =>
      firestore
        ? query(collection(firestore, FIRESTORE_COLLECTIONS.users), orderBy('createdAt', 'desc'))
        : null,
    [firestore]
  );
  const { data: users, isLoading: isLoadingUsers, error: usersError } = useCollection<UserProfile>(usersQuery);

  const teamsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, FIRESTORE_COLLECTIONS.teams)) : null),
    [firestore]
  );
  const { data: teams, isLoading: isLoadingTeams, error: teamsError } = useCollection<Team>(teamsQuery);

  const isLoading = isLoadingUsers || isLoadingTeams;
  const error = usersError || teamsError;

  const handleRetry = () => window.location.reload();
  const handleAddNew = () => setIsFormOpen(true);
  const handleCloseForm = () => setIsFormOpen(false);


  const renderContent = () => {
    if (isLoading) {
      return <PageSkeleton />;
    }
    if (error) {
      return <ErrorState onRetry={handleRetry} message="Gagal memuat data pengguna." />;
    }
    if (!users || users.length === 0) {
      return (
        <EmptyState
          icon={Users}
          title="Belum ada pengguna terdaftar"
          description="Daftarkan akun pertama melalui halaman signup untuk menjadi Super Admin, yang kemudian dapat mengelola pengguna lain."
          action={
            <Button onClick={handleAddNew}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Tambah Pengguna
            </Button>
          }
        />
      );
    }
    return <UsersTable users={users} teams={teams ?? []} />;
  };

  return (
    <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
      <div className="flex items-center justify-between">
        <div />
        <Button onClick={handleAddNew}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Tambah Pengguna
        </Button>
      </div>
      <div className="mt-6">{renderContent()}</div>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tambah Pengguna Baru</DialogTitle>
          <DialogDescription>
            Setelah membuat pengguna, Anda akan otomatis logout. Harap login kembali dengan akun admin Anda.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh] pr-6">
          <UserForm
            user={null}
            teams={teams ?? []}
            onSave={handleCloseForm}
            className="pr-1"
          />
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
