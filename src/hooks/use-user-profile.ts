'use client';

import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { FIRESTORE_COLLECTIONS } from '@/lib/firestore/collections';
import type { UserProfile } from '@/lib/firestore/types';

export function useUserProfile() {
    const { user: authUser, isUserLoading: isAuthLoading } = useUser();
    const firestore = useFirestore();

    const userProfileRef = useMemoFirebase(
        () => (firestore && authUser) ? doc(firestore, FIRESTORE_COLLECTIONS.users, authUser.uid) : null,
        [firestore, authUser]
    );

    const { data: userProfile, isLoading: isProfileLoading, error } = useDoc<UserProfile>(userProfileRef);

    return {
        userProfile,
        isLoading: isAuthLoading || isProfileLoading,
        error,
    };
}
