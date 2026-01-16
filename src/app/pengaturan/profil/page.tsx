'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { updateProfile, updateEmail, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';

import { useAuth, useUser, useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { useUserProfile } from '@/hooks/use-user-profile';
import { FIRESTORE_COLLECTIONS } from '@/lib/firestore/collections';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ShieldAlert } from 'lucide-react';

// --- Schemas ---
const profileFormSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters.'),
});

const emailFormSchema = z.object({
  email: z.string().email('Please enter a valid email address.'),
  currentPassword: z.string().min(1, 'Current password is required.'),
});

const passwordFormSchema = z.object({
    currentPassword: z.string().min(1, 'Current password is required.'),
    newPassword: z.string().min(6, 'New password must be at least 6 characters.'),
    confirmPassword: z.string(),
}).refine(data => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
});

// --- Component ---
export default function ProfilPage() {
    const auth = useAuth();
    const { user: authUser } = useUser();
    const { userProfile, isLoading: isProfileLoading } = useUserProfile();
    const firestore = useFirestore();
    const { toast } = useToast();

    // --- Forms ---
    const profileForm = useForm<z.infer<typeof profileFormSchema>>({
        resolver: zodResolver(profileFormSchema),
        defaultValues: { name: '' },
    });
    const emailForm = useForm<z.infer<typeof emailFormSchema>>({
        resolver: zodResolver(emailFormSchema),
        defaultValues: { email: '', currentPassword: '' },
    });
    const passwordForm = useForm<z.infer<typeof passwordFormSchema>>({
        resolver: zodResolver(passwordFormSchema),
        defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
    });

    // --- State ---
    const [isReauthenticating, setIsReauthenticating] = React.useState(false);

    // --- Effects ---
    React.useEffect(() => {
        if (userProfile) {
            profileForm.reset({ name: userProfile.name });
            emailForm.reset({ email: userProfile.email, currentPassword: '' });
        }
    }, [userProfile, profileForm, emailForm]);

    // --- Handlers ---
    const handleReauthenticate = async (password: string) => {
        if (!authUser || !authUser.email) {
            toast({
                variant: 'destructive',
                title: 'Authentication Error',
                description: 'User information is not available.',
            });
            return false;
        };
        setIsReauthenticating(true);
        try {
            const credential = EmailAuthProvider.credential(authUser.email, password);
            await reauthenticateWithCredential(authUser, credential);
            return true;
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Authentication Failed',
                description: 'The password you entered is incorrect.',
            });
            return false;
        } finally {
            setIsReauthenticating(false);
        }
    };

    async function onProfileSubmit(data: z.infer<typeof profileFormSchema>) {
        if (!authUser || !firestore) return;
        profileForm.formState.isSubmitting;
        try {
            const userDocRef = doc(firestore, FIRESTORE_COLLECTIONS.users, authUser.uid);
            await updateProfile(authUser, { displayName: data.name });
            await updateDoc(userDocRef, { name: data.name });
            toast({ title: 'Success', description: 'Your profile has been updated.' });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        }
    }

    async function onEmailSubmit(data: z.infer<typeof emailFormSchema>) {
        if (!authUser || !firestore) return;
        emailForm.formState.isSubmitting;

        const isReauthenticated = await handleReauthenticate(data.currentPassword);
        if (!isReauthenticated) return;
        
        try {
            const userDocRef = doc(firestore, FIRESTORE_COLLECTIONS.users, authUser.uid);
            await updateEmail(authUser, data.email);
            await updateDoc(userDocRef, { email: data.email });
            toast({ title: 'Success', description: 'Your email has been updated. Please log in again.' });
            // For security, you might want to force a sign-out here.
            signOut(auth);
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        } finally {
            emailForm.reset({ ...data, currentPassword: '' });
        }
    }

    async function onPasswordSubmit(data: z.infer<typeof passwordFormSchema>) {
        if (!authUser) return;
        passwordForm.formState.isSubmitting;

        const isReauthenticated = await handleReauthenticate(data.currentPassword);
        if (!isReauthenticated) return;

        try {
            await updatePassword(authUser, data.newPassword);
            toast({ title: 'Success', description: 'Your password has been updated.' });
            passwordForm.reset({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        }
    }
    
    const isSubmitting = profileForm.formState.isSubmitting || emailForm.formState.isSubmitting || passwordForm.formState.isSubmitting || isReauthenticating;

    if (isProfileLoading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-64 w-full" />
                <Skeleton className="h-64 w-full" />
                <Skeleton className="h-64 w-full" />
            </div>
        );
    }
    
    // Check if the user signed in with a password.
    const isPasswordProvider = authUser?.providerData.some(p => p.providerId === 'password');
    
    return (
        <div className="grid gap-6">
            {/* Profile Information Card */}
            <Card>
                <CardHeader>
                    <CardTitle>Informasi Profil</CardTitle>
                    <CardDescription>Perbarui nama tampilan Anda.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...profileForm}>
                        <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
                            <FormField
                                control={profileForm.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Nama Lengkap</FormLabel>
                                        <FormControl>
                                            <Input {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Menyimpan...' : 'Simpan Perubahan'}</Button>
                        </form>
                    </Form>
                </CardContent>
            </Card>

            {/* Email & Password Management */}
            {isPasswordProvider ? (
                <>
                    {/* Update Email Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Ubah Alamat Email</CardTitle>
                            <CardDescription>
                                Anda mungkin perlu memverifikasi email baru Anda. Mengubah email akan membuat Anda keluar.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Form {...emailForm}>
                                <form onSubmit={emailForm.handleSubmit(onEmailSubmit)} className="space-y-4">
                                    <FormField
                                        control={emailForm.control}
                                        name="email"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Email Baru</FormLabel>
                                                <FormControl><Input type="email" {...field} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={emailForm.control}
                                        name="currentPassword"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Password Saat Ini (untuk konfirmasi)</FormLabel>
                                                <FormControl><Input type="password" {...field} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <Button type="submit" variant="outline" disabled={isSubmitting}>{isSubmitting ? 'Memproses...' : 'Ubah Email'}</Button>
                                </form>
                            </Form>
                        </CardContent>
                    </Card>

                    {/* Update Password Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Ubah Password</CardTitle>
                            <CardDescription>Pastikan Anda menggunakan password yang kuat.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Form {...passwordForm}>
                                <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
                                    <FormField control={passwordForm.control} name="currentPassword" render={({ field }) => (<FormItem><FormLabel>Password Saat Ini</FormLabel><FormControl><Input type="password" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                    <FormField control={passwordForm.control} name="newPassword" render={({ field }) => (<FormItem><FormLabel>Password Baru</FormLabel><FormControl><Input type="password" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                    <FormField control={passwordForm.control} name="confirmPassword" render={({ field }) => (<FormItem><FormLabel>Konfirmasi Password Baru</FormLabel><FormControl><Input type="password" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                    <Button type="submit" variant="outline" disabled={isSubmitting}>{isSubmitting ? 'Memproses...' : 'Ubah Password'}</Button>
                                </form>
                            </Form>
                        </CardContent>
                    </Card>
                </>
            ) : (
                <Alert>
                    <ShieldAlert className="h-4 w-4" />
                    <AlertTitle>Manajemen Akun Terbatas</AlertTitle>
                    <AlertDescription>
                        Akun Anda dikelola melalui penyedia pihak ketiga (misalnya, Google, Facebook). Silakan ubah email atau password Anda melalui layanan tersebut.
                    </AlertDescription>
                </Alert>
            )}
        </div>
    );
}
