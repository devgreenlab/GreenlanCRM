'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  addDoc,
  collection,
  doc,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';

import { useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { FIRESTORE_COLLECTIONS } from '@/lib/firestore/collections';
import type { Team, UserProfile } from '@/lib/firestore/types';
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

const teamFormSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters.'),
  headSalesUid: z.string().nullable().optional(),
});

type TeamFormValues = z.infer<typeof teamFormSchema>;

interface TeamFormProps {
  team?: Team | null;
  headSalesUsers: UserProfile[];
  onSave: () => void;
  className?: string;
}

export function TeamForm({ team, headSalesUsers, onSave, className }: TeamFormProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState(false);

  const form = useForm<TeamFormValues>({
    resolver: zodResolver(teamFormSchema),
    defaultValues: {
      name: team?.name ?? '',
      headSalesUid: team?.headSalesUid ?? null,
    },
  });

  async function onSubmit(data: TeamFormValues) {
    if (!firestore) return;
    setIsLoading(true);
    try {
      if (team) {
        const teamRef = doc(firestore, FIRESTORE_COLLECTIONS.teams, team.id);
        await updateDoc(teamRef, data);
        toast({ title: 'Success', description: 'Team updated successfully.' });
      } else {
        const teamsRef = collection(firestore, FIRESTORE_COLLECTIONS.teams);
        await addDoc(teamsRef, {
          ...data,
          createdAt: serverTimestamp(),
        });
        toast({ title: 'Success', description: 'Team created successfully.' });
      }
      onSave();
    } catch (error: any) {
      console.error('Error saving team:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Could not save team.',
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
              <FormLabel>Team Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Marketing, Sales West" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="headSalesUid"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Head of Sales</FormLabel>
              <Select
                onValueChange={(value) => field.onChange(value === 'none' ? null : value)}
                value={field.value ?? 'none'}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a Head of Sales" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {headSalesUsers.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                Assign a user with the 'Head of Sales' role to lead this team.
              </FormDescription>
              <FormMessage />
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
