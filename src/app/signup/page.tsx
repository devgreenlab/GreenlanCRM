'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, serverTimestamp, getDocs, collection, query, limit } from 'firebase/firestore';

import { useAuth, useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { FIRESTORE_COLLECTIONS } from '@/lib/firestore/collections';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Logo } from '@/components/logo';

const signupFormSchema = z.object({
  name: z.string().min(2, 'Nama harus lebih dari 2 karakter.'),
  email: z.string().email('Masukkan alamat email yang valid.'),
  password: z.string().min(6, 'Password minimal 6 karakter.'),
});

type SignupFormValues = z.infer<typeof signupFormSchema>;

export default function SignupPage() {
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState(false);

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupFormSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
    },
  });

  async function onSubmit(data: SignupFormValues) {
    setIsLoading(true);
    try {
      if (!firestore) {
        throw new Error("Firestore is not initialized.");
      }
      // 1. Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        data.email,
        data.password
      );
      const user = userCredential.user;

      // 2. Update user profile in Auth
      await updateProfile(user, { displayName: data.name });

      // 3. Check if this is the first user to determine the role
      const usersCollectionRef = collection(firestore, FIRESTORE_COLLECTIONS.users);
      const firstUserQuery = query(usersCollectionRef, limit(1));
      const userDocs = await getDocs(firstUserQuery);
      const isFirstUser = userDocs.empty;
      const role = isFirstUser ? 'SUPER_ADMIN' : 'SALES';

      // 4. Create user document in Firestore
      const userRef = doc(firestore, FIRESTORE_COLLECTIONS.users, user.uid);
      await setDoc(userRef, {
        name: data.name,
        email: data.email,
        role: role,
        isActive: true,
        teamId: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      
      toast({
        title: 'Pendaftaran Berhasil',
        description: isFirstUser ? 'Selamat, akun Super Admin Anda telah dibuat!' : 'Selamat datang di Greenlab CRM!',
      });
      router.push('/dashboard');

    } catch (error: any) {
      console.error('Signup error:', error);
      toast({
        variant: 'destructive',
        title: 'Pendaftaran Gagal',
        description: error.code === 'auth/email-already-in-use' 
            ? 'Email ini sudah terdaftar. Silakan gunakan email lain atau login.'
            : error.message || 'Terjadi kesalahan. Silakan coba lagi.',
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        <Card>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Logo />
            </div>
            <CardTitle>Buat Akun Baru</CardTitle>
            <CardDescription>Mulai perjalanan Anda dengan Greenlab CRM</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nama Lengkap</FormLabel>
                      <FormControl>
                        <Input placeholder="John Doe" {...field} autoComplete="name" />
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
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="contoh@greenlab.com"
                          {...field}
                          autoComplete="email"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••••" {...field} autoComplete="new-password" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Memproses...' : 'Daftar'}
                </Button>
              </form>
            </Form>
            <p className="mt-6 text-center text-sm text-muted-foreground">
              Sudah punya akun?{' '}
              <Link href="/login" className="font-semibold text-primary hover:underline">
                Masuk di sini
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
