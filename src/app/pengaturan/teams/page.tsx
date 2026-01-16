'use client';

import * as React from 'react';
import { PlusCircle, Shield, Users } from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { FIRESTORE_COLLECTIONS } from '@/lib/firestore/collections';
import type { Team, UserProfile } from '@/lib/firestore/types';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/shared/error-state';
import { EmptyState } from '@/components/shared/empty-state';
import { TeamForm } from '@/components/admin/teams/team-form';

function PageSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {[...Array(3)].map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-4 w-1/4 mt-2" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-4 w-3/4" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function TeamsPage() {
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [selectedTeam, setSelectedTeam] = React.useState<Team | null>(null);

  const firestore = useFirestore();

  const teamsQuery = useMemoFirebase(
    () =>
      firestore
        ? query(collection(firestore, FIRESTORE_COLLECTIONS.teams), orderBy('name', 'asc'))
        : null,
    [firestore]
  );
  const { data: teams, isLoading: isLoadingTeams, error: teamsError } = useCollection<Team>(teamsQuery);

  const usersQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, FIRESTORE_COLLECTIONS.users)) : null),
    [firestore]
  );
  const { data: users, isLoading: isLoadingUsers, error: usersError } = useCollection<UserProfile>(usersQuery);

  const isLoading = isLoadingTeams || isLoadingUsers;
  const error = teamsError || usersError;

  const handleRetry = () => window.location.reload();

  const handleEdit = (team: Team) => {
    setSelectedTeam(team);
    setIsFormOpen(true);
  };
  
  const handleAddNew = () => {
    setSelectedTeam(null);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setSelectedTeam(null);
  };
  
  const usersByTeam = React.useMemo(() => {
    const map = new Map<string, number>();
    users?.forEach(user => {
        if(user.teamId) {
            map.set(user.teamId, (map.get(user.teamId) || 0) + 1);
        }
    });
    return map;
  }, [users]);
  
  const headSalesUsers = React.useMemo(() => {
    return users?.filter(user => user.role === 'HEAD_SALES') ?? [];
  }, [users]);

  const renderContent = () => {
    if (isLoading) {
      return <PageSkeleton />;
    }
    if (error) {
      return <ErrorState onRetry={handleRetry} message="Gagal memuat data tim." />;
    }
    if (!teams || teams.length === 0) {
      return (
        <EmptyState
          icon={Shield}
          title="Belum ada tim"
          description="Buat tim pertama Anda untuk mulai mengorganisir pengguna."
          action={
            <Button onClick={handleAddNew}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Buat Tim
            </Button>
          }
        />
      );
    }
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {teams.map((team) => (
          <Card key={team.id}>
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                {team.name}
                <Button variant="outline" size="sm" onClick={() => handleEdit(team)}>Edit</Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex items-center text-muted-foreground text-sm">
                    <Users className="mr-2 h-4 w-4" />
                    <span>{usersByTeam.get(team.id) || 0} Anggota</span>
                </div>
                {team.headSalesUid && (
                    <div className="text-sm mt-2">
                        <span className="font-semibold">Head Sales: </span>
                        {headSalesUsers.find(u => u.id === team.headSalesUid)?.name || 'N/A'}
                    </div>
                )}
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <Dialog open={isFormOpen} onOpenChange={handleCloseForm}>
        <div className="flex items-center justify-between">
            <div />
            <Button onClick={handleAddNew}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Buat Tim
            </Button>
        </div>
      <div className="mt-6">{renderContent()}</div>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>{selectedTeam ? 'Edit Tim' : 'Buat Tim Baru'}</DialogTitle>
        </DialogHeader>
        <TeamForm
          team={selectedTeam}
          headSalesUsers={headSalesUsers}
          onSave={handleCloseForm}
        />
      </DialogContent>
    </Dialog>
  );
}
    