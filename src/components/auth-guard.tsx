'use client';

import { useUser } from '@/firebase';
import { usePathname, redirect } from 'next/navigation';
import { useEffect } from 'react';
import { Skeleton } from './ui/skeleton';
import { Logo } from './logo';

export function AuthGuard({ children }: { children: React.ReactNode }) {
    const { user, isUserLoading } = useUser();
    const pathname = usePathname();

    useEffect(() => {
        if (!isUserLoading && !user) {
            redirect(`/login?redirect=${pathname}`);
        }
    }, [isUserLoading, user, pathname]);

    if (isUserLoading || !user) {
        // Show a loading screen while checking auth state or redirecting
        return (
            <div className="flex h-screen w-screen flex-col items-center justify-center gap-4">
                <Logo />
                <div className="w-1/4 space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                </div>
            </div>
        );
    }
    
    // User is authenticated, render the children
    return <>{children}</>;
}
