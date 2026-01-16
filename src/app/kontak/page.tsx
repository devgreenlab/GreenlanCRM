'use client';

import { collection, query } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { FIRESTORE_COLLECTIONS } from '@/lib/firestore/collections';
import type { Contact } from '@/lib/firestore/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/shared/error-state';
import { EmptyState } from '@/components/shared/empty-state';
import { Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';


function ContactsTable({ contacts }: { contacts: Contact[] }) {
  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[64px]">Avatar</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Company</TableHead>
            <TableHead>Phone</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {contacts.map((contact) => (
            <TableRow key={contact.id}>
              <TableCell>
                <Avatar>
                  <AvatarImage src={`https://i.pravatar.cc/150?u=${contact.id}`} />
                  <AvatarFallback>
                    {contact.firstName.charAt(0)}
                    {contact.lastName.charAt(0)}
                  </AvatarFallback>
                </Avatar>
              </TableCell>
              <TableCell>
                <div className="font-medium">{`${contact.firstName} ${contact.lastName}`}</div>
                {contact.title && <div className="text-sm text-muted-foreground">{contact.title}</div>}
              </TableCell>
              <TableCell>{contact.email}</TableCell>
              <TableCell>{contact.company ?? '-'}</TableCell>
              <TableCell>{contact.phone ?? '-'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function PageSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-12 w-full rounded-t-lg" />
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center space-x-4 p-4 border-b">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-[250px]" />
            <Skeleton className="h-4 w-[200px]" />
          </div>
        </div>
      ))}
    </div>
  );
}


export default function KontakPage() {
  const firestore = useFirestore();
  const contactsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, FIRESTORE_COLLECTIONS.contacts)) : null),
    [firestore]
  );
  
  const { data: contacts, isLoading, error } = useCollection<Contact>(contactsQuery);

  const handleRetry = () => window.location.reload();

  const renderContent = () => {
    if (isLoading) {
      return <PageSkeleton />;
    }
    if (error) {
      return (
        <ErrorState
          onRetry={handleRetry}
          message="Gagal memuat data kontak."
        />
      );
    }
    if (!contacts || contacts.length === 0) {
      return (
        <EmptyState
          icon={Users}
          title="Belum ada kontak"
          description="Data kontak akan muncul di sini setelah Anda menambahkannya."
        />
      );
    }
    return <ContactsTable contacts={contacts} />;
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <h1 className="text-3xl font-bold tracking-tight font-headline">Kontak</h1>
      <p className="text-muted-foreground mt-2 font-serif">
        Sistem terpusat untuk mengelola informasi pelanggan Anda.
      </p>
      <div className="mt-8">
        {renderContent()}
      </div>
    </div>
  );
}
