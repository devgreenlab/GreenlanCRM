'use client';

import * as React from 'react';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { MoreHorizontal } from 'lucide-react';
import { useFirestore, useUser } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { FIRESTORE_COLLECTIONS } from '@/lib/firestore/collections';
import type { UserProfile, Team } from '@/lib/firestore/types';

import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { UserForm } from './user-form';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface UsersTableProps {
  users: UserProfile[];
  teams: Team[];
  allUsers: UserProfile[];
}

export function UsersTable({ users, teams, allUsers }: UsersTableProps) {
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);
  const [isDeactivateDialogOpen, setIsDeactivateDialogOpen] = React.useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [selectedUser, setSelectedUser] = React.useState<UserProfile | null>(null);

  const firestore = useFirestore();
  const { toast } = useToast();
  const { user: authUser } = useUser();

  const teamsMap = React.useMemo(() => {
    return new Map(teams.map((team) => [team.id, team.name]));
  }, [teams]);

  const handleEdit = (user: UserProfile) => {
    setSelectedUser(user);
    setIsEditDialogOpen(true);
  };
  
  const handleToggleActivate = (user: UserProfile) => {
    setSelectedUser(user);
    setIsDeactivateDialogOpen(true);
  };

  const handleDelete = (user: UserProfile) => {
    setSelectedUser(user);
    setIsDeleteDialogOpen(true);
  };

  const confirmToggleActivate = async () => {
    if (!firestore || !selectedUser) return;
    
    const userRef = doc(firestore, FIRESTORE_COLLECTIONS.users, selectedUser.id);
    const newStatus = !selectedUser.isActive;

    try {
        await updateDoc(userRef, { isActive: newStatus });
        toast({
            title: 'Success',
            description: `User has been ${newStatus ? 'activated' : 'deactivated'}.`,
        });
    } catch(error: any) {
        toast({
            variant: 'destructive',
            title: 'Error',
            description: error.message || 'Could not update user status.',
        });
    } finally {
        setIsDeactivateDialogOpen(false);
        setSelectedUser(null);
    }
  };

  const confirmDelete = async () => {
    if (!firestore || !selectedUser) return;

    if (authUser?.uid === selectedUser.id) {
        toast({ variant: 'destructive', title: 'Error', description: 'You cannot delete your own account.' });
        setIsDeleteDialogOpen(false);
        return;
    }
    
    const userRef = doc(firestore, FIRESTORE_COLLECTIONS.users, selectedUser.id);
    try {
        await deleteDoc(userRef);
        toast({
            title: 'Success',
            description: `User '${selectedUser.name}' has been removed from the CRM. Their login account still exists.`,
        });
    } catch(error: any) {
        toast({
            variant: 'destructive',
            title: 'Error',
            description: error.message || 'Could not delete user data.',
        });
    } finally {
        setIsDeleteDialogOpen(false);
        setSelectedUser(null);
    }
  };


  return (
    <>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Team</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => {
                const isCurrentUser = authUser?.uid === user.id;
                return (
                    <TableRow key={user.id}>
                        <TableCell className="font-medium">
                            <div>{user.name}</div>
                            <div className="text-sm text-muted-foreground">{user.email}</div>
                        </TableCell>
                        <TableCell>
                        <Badge variant="secondary">{user.role.replace('_', ' ')}</Badge>
                        </TableCell>
                        <TableCell>{user.teamId ? teamsMap.get(user.teamId) ?? 'N/A' : '-'}</TableCell>
                        <TableCell>
                        <Badge variant={user.isActive ? 'default' : 'outline'}>
                            {user.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                        </TableCell>
                        <TableCell>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                            <Button aria-haspopup="true" size="icon" variant="ghost">
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">Toggle menu</span>
                            </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onSelect={() => handleEdit(user)}>Edit</DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => handleToggleActivate(user)}>
                                {user.isActive ? 'Deactivate' : 'Activate'}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                                onSelect={() => handleDelete(user)} 
                                className="text-destructive"
                                disabled={isCurrentUser}
                            >
                                Delete
                            </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        </TableCell>
                    </TableRow>
                );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Make changes to the user profile below.
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <ScrollArea className="max-h-[70vh] pr-6">
              <UserForm
                user={selectedUser}
                teams={teams}
                allUsers={allUsers}
                onSave={() => setIsEditDialogOpen(false)}
                className="pr-1"
              />
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Deactivation/Activation Alert Dialog */}
      <AlertDialog open={isDeactivateDialogOpen} onOpenChange={setIsDeactivateDialogOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    You are about to {selectedUser?.isActive ? 'deactivate' : 'activate'} the user '{selectedUser?.name}'.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={confirmToggleActivate}>Continue</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Deletion Alert Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This will permanently remove '{selectedUser?.name}' from the CRM application. This action cannot be undone.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={confirmDelete} className={buttonVariants({ variant: "destructive" })}>Delete User Data</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
