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
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';


import { useFirestore } from '@/firebase';
import { firebaseConfig } from '@/firebase/config';
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
  password: z.string().min(6, 'Password must be at least 6 characters.').optional().or(z.literal('')),
  role: z.enum(['SUPER_ADMIN', 'HEAD_SALES', 'SALES']),
  teamId: z.string().nullable().optional(),
  wahaSession: z.string().optional(),
  waNumber: z.string().optional(),
  isActive: z.boolean(),
}).refine(data => {
    // If role is SALES, wahaSession must be a non-empty string
    if (data.role === 'SALES') {
        return data.wahaSession && data.wahaSession.length > 0;
    }
    return true;
}, {
    message: 'WAHA Session is required for Sales role.',
    path: ['wahaSession'], // Path to the field that failed validation
});

type UserFormValues = z.infer<typeof userFormSchema>;

interface UserFormProps {
  user?: UserProfile | null;
  teams: Team[];
  allUsers: UserProfile[];
  onSave: () => void;
  className?: string;
}

export function UserForm({ user, teams, allUsers, onSave, className }: UserFormProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState(false);

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      name: user?.name ?? '',
      email: user?.email ?? '',
      password: '',
      role: user?.role ?? 'SALES',
      teamId: user?.teamId ?? null,
      wahaSession: user?.wahaSession ?? '',
      waNumber: user?.waNumber ?? '',
      isActive: user?.isActive ?? true,
    },
  });

  const role = form.watch('role');

  React.useEffect(() => {
    if (role === 'SUPER_ADMIN') {
      form.setValue('teamId', null);
      form.setValue('wahaSession', '');
    }
  }, [role, form]);

  async function onSubmit(data: UserFormValues) {
    if (!firestore) return;

    if (data.role === 'SUPER_ADMIN') {
      const superAdminCount = allUsers.filter(u => u.role === 'SUPER_ADMIN').length;
      
      const isCreatingNewSuperAdmin = !user;
      const isPromotingToSuperAdmin = user && user.role !== 'SUPER_ADMIN';

      if ((isCreatingNewSuperAdmin || isPromotingToSuperAdmin) && superAdminCount >= 3) {
        toast({
          variant: 'destructive',
          title: 'Batas Super Admin Tercapai',
          description: 'Anda tidak dapat menambahkan lebih dari 3 Super Admin.',
        });
        return;
      }
    }

    setIsLoading(true);

    if (user) {
      // --- UPDATE LOGIC ---
      try {
        const userRef = doc(firestore, FIRESTORE_COLLECTIONS.users, user.id);
        const { password, ...updateData } = data;
        await updateDoc(userRef, {
          ...updateData,
          teamId: data.role === 'SUPER_ADMIN' ? null : data.teamId,
          wahaSession: data.role === 'SALES' ? data.wahaSession : null,
          updatedAt: serverTimestamp(),
        });
        toast({ title: 'Success', description: 'User updated successfully.' });
        onSave();
      } catch (error: any) {
        console.error('Error updating user:', error);
        toast({
            variant: 'destructive',
            title: 'Error',
            description: error.message || 'Could not update user.',
        });
      } finally {
        setIsLoading(false);
      }
    } else {
      // --- CREATE LOGIC ---
      if (!data.password) {
        form.setError('password', { type: 'manual', message: 'Password is required for new users.' });
        setIsLoading(false);
        return;
      }

      // This temporary Firebase app instance is used for user creation.
      // It's a workaround to create a user without signing out the current admin.
      const tempAppName = `temp-user-creation-${Date.now()}`;
      const tempApp = initializeApp(firebaseConfig, tempAppName);
      const tempAuth = getAuth(tempApp);
      
      try {
        const userCredential = await createUserWithEmailAndPassword(tempAuth, data.email, data.password);
        const newUser = userCredential.user;

        const userRef = doc(firestore, FIRESTORE_COLLECTIONS.users, newUser.uid);
        const { password, ...userData } = data;

        await setDoc(userRef, {
          ...userData,
          teamId: data.role === 'SUPER_ADMIN' ? null : data.teamId,
          wahaSession: data.role === 'SALES' ? data.wahaSession : null,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        toast({ title: 'Success', description: 'User created successfully. They can now log in.' });
        onSave();
      } catch (error: any) {
        console.error('Error creating user:', error);
        toast({
          variant: 'destructive',
          title: 'Error creating user',
          description: error.code === 'auth/email-already-in-use' 
            ? 'This email is already in use by another account.'
            : error.message || 'Could not create user.',
        });
      } finally {
        await deleteApp(tempApp);
        setIsLoading(false);
      }
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
        {!user && (
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
        {role === 'SALES' && (
            <>
                <FormField
                    control={form.control}
                    name="wahaSession"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>WAHA Session Name</FormLabel>
                        <FormControl>
                            <Input placeholder="e.g., sales_john" {...field} />
                        </FormControl>
                         <FormDescription>
                            The unique session name for this sales agent in WAHA.
                        </FormDescription>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="waNumber"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>WhatsApp Number (Optional)</FormLabel>
                        <FormControl>
                            <Input placeholder="e.g., 628123456789" {...field} />
                        </FormControl>
                         <FormDescription>
                            The WhatsApp number associated with this account for display purposes.
                        </FormDescription>
                        <FormMessage />
                        </FormItem>
                    )}
                />
            </>
        )}
        <FormField
          control={form.control}
          name="teamId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Team</FormLabel>
              <Select
                onValueChange={(value) => field.onChange(value === 'none' ? null : value)}
                value={field.value ?? 'none'}
                disabled={role === 'SUPER_ADMIN'}
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
              <FormDescription>
                {role === 'SUPER_ADMIN'
                  ? 'Super Admins are independent and do not belong to a team.'
                  : 'Assign this user to a team.'}
              </FormDescription>
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
                  Inactive users cannot login or be assigned to new leads/deals.
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
