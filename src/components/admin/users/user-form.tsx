'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  doc,
  serverTimestamp,
  updateDoc,
  setDoc,
} from 'firebase/firestore';
import { createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';

import { useFirestore, useAuth } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { FIRESTORE_COLLECTIONS } from '@/lib/firestore/collections';
import type { UserProfile, Team } from '@/lib/firestore/types';
import { cn } from '@/lib/utils';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

const userFormSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters.'),
  email: z.string().email('Invalid email address.'),
  password: z.string().min(6, 'Password must be at least 6 characters.').optional(),
  role: z.enum(['SUPER_ADMIN', 'HEAD_SALES', 'SALES']),
  teamId: z.string().nullable().optional(),
  isActive: z.boolean(),
});

type UserFormValues = z.infer<typeof userFormSchema>;

interface UserFormProps {
  user?: UserProfile | null;
  teams: Team[];
  onSave: () => void;
  className?: string;
}

export function UserForm({ user, teams, onSave, className }: UserFormProps) {
  const firestore = useFirestore();
  const auth = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState(false);

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      name: user?.name ?? '',
      email: user?.email ?? '',
      role: user?.role ?? 'SALES',
      teamId: user?.teamId ?? null,
      isActive: user?.isActive ?? true,
    },
  });
  
  const handlePasswordReset = async () => {
    if (!user || !auth) return;
    try {
      await sendPasswordResetEmail(auth, user.email);
      toast({
        title: 'Email Terkirim',
        description: `Email untuk reset kata sandi telah dikirim ke ${user.email}.`,
      });
    } catch (error: any) {
      console.error('Password reset error:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Tidak dapat mengirim email reset kata sandi.',
      });
    }
  };

  async function onSubmit(data: UserFormValues) {
    if (!firestore || !auth) return;
    setIsLoading(true);
    try {
      if (user) {
        // Update existing user
        const userRef = doc(firestore, FIRESTORE_COLLECTIONS.users, user.id);
        const { password, ...updateData } = data; // Don't save password on update
        await updateDoc(userRef, {
          ...updateData,
          updatedAt: serverTimestamp(),
        });
        toast({ title: 'Success', description: 'User updated successfully.' });
        onSave();
      } else {
        // Create new user
        if (!data.password) {
            form.setError('password', { type: 'manual', message: 'Password is required for new users.' });
            setIsLoading(false);
            return;
        }
        
        // 1. Create user in Auth
        const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
        const newUser = userCredential.user;

        // 2. Create user document in Firestore with the UID as document ID
        const userRef = doc(firestore, FIRESTORE_COLLECTIONS.users, newUser.uid);
        await setDoc(userRef, {
          name: data.name,
          email: data.email,
          role: data.role,
          teamId: data.teamId,
          isActive: data.isActive,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        toast({ title: 'Success', description: 'User created successfully. Please log back in as admin.' });
        // The onSave() will close the dialog, and AuthGuard will redirect to login.
        onSave();
      }
    } catch (error: any) {
      console.error('Error saving user:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Could not save user.',
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className={cn('space-y-8', className)}>
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full Name</FormLabel>
              <FormControl>
                <Input placeholder="John Doe" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email (Username)</FormLabel>
              <FormControl>
                <Input placeholder="user@example.com" {...field} disabled={!!user} />
              </FormControl>
              <FormDescription>
                Email cannot be changed after creation.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        {user ? (
            <div className="space-y-2">
                <FormLabel>Password</FormLabel>
                <Button type="button" variant="outline" onClick={handlePasswordReset}>
                    Kirim Email Reset Kata Sandi
                </Button>
                <FormDescription>
                    Pengguna akan menerima email untuk mengatur ulang kata sandi mereka.
                </FormDescription>
            </div>
        ) : (
           <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
        )}
        <FormField
          control={form.control}
          name="role"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Role</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="SALES">Sales</SelectItem>
                  <SelectItem value="HEAD_SALES">Head of Sales</SelectItem>
                  <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="teamId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Team</FormLabel>
              <Select
                onValueChange={(value) => field.onChange(value === 'none' ? null : value)}
                value={field.value ?? 'none'}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a team" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="none">No Team</SelectItem>
                  {teams.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="isActive"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel>Active Status</FormLabel>
                <FormDescription>
                  Inactive users cannot be assigned to new leads or deals.
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Saving...' : 'Save Changes'}
        </Button>
      </form>
    </Form>
  );
}
