'use client';

import * as React from 'react';
import { useUser } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ShieldAlert, Server, CheckCircle, XCircle } from 'lucide-react';
import { useUserProfile } from '@/hooks/use-user-profile';

interface WahaEnvStatus {
    isBaseUrlSet: boolean;
    isApiKeySet: boolean;
    isWebhookSecretSet: boolean;
}

function PageSkeleton() {
    return (
        <Card>
            <CardHeader>
                <Skeleton className="h-8 w-1/2" />
                <Skeleton className="h-4 w-3/4 mt-2" />
            </CardHeader>
            <CardContent className="space-y-4">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
            </CardContent>
        </Card>
    );
}

function StatusRow({ label, isSet }: { label: string; isSet: boolean }) {
    return (
        <div className="flex items-center justify-between py-2 border-b">
            <span className="text-sm font-medium text-muted-foreground">{label}</span>
            {isSet ? (
                <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="h-4 w-4" />
                    <span className="text-sm font-semibold">Set</span>
                </div>
            ) : (
                <div className="flex items-center gap-2 text-red-600">
                    <XCircle className="h-4 w-4" />
                    <span className="text-sm font-semibold">Not Set</span>
                </div>
            )}
        </div>
    );
}

export default function IntegrasiPage() {
    const { userProfile, isLoading: isProfileLoading } = useUserProfile();
    const { user: authUser } = useUser();
    const { toast } = useToast();
    
    const [envStatus, setEnvStatus] = React.useState<WahaEnvStatus | null>(null);
    const [isFetching, setIsFetching] = React.useState(true);

    React.useEffect(() => {
        const fetchEnvStatus = async () => {
            if (!authUser) return;
            setIsFetching(true);
            try {
                const token = await authUser.getIdToken();
                const response = await fetch('/api/admin/waha/config', {
                    headers: { 'Authorization': `Bearer ${token}` },
                });
                
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Failed to fetch environment status');
                }
                const data: WahaEnvStatus = await response.json();
                setEnvStatus(data);
            } catch (error: any) {
                toast({ variant: 'destructive', title: 'Error Fetching Status', description: error.message });
            } finally {
                setIsFetching(false);
            }
        };

        if (userProfile?.role === 'SUPER_ADMIN' && authUser) {
            fetchEnvStatus();
        }
    }, [userProfile, authUser, toast]);

    if (isProfileLoading || (userProfile?.role === 'SUPER_ADMIN' && isFetching)) {
        return <PageSkeleton />;
    }

    if (userProfile?.role !== 'SUPER_ADMIN') {
        return (
            <Alert variant="destructive">
                <ShieldAlert className="h-4 w-4" />
                <AlertTitle>Access Denied</AlertTitle>
                <AlertDescription>Only Super Admins can access this page.</AlertDescription>
            </Alert>
        );
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>WAHA Integration Status</CardTitle>
                    <CardDescription>
                        This page shows the status of the server-side environment variables required for the WAHA integration.
                        These values must be set directly on the server and cannot be changed from this UI.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {envStatus ? (
                        <div>
                            <StatusRow label="WAHA_BASE_URL" isSet={envStatus.isBaseUrlSet} />
                            <StatusRow label="WAHA_API_KEY" isSet={envStatus.isApiKeySet} />
                            <StatusRow label="WAHA_WEBHOOK_SECRET" isSet={envStatus.isWebhookSecretSet} />
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground">Could not load environment status.</p>
                    )}
                </CardContent>
            </Card>
            <Alert>
                <Server className="h-4 w-4" />
                <AlertTitle>Server-Side Configuration</AlertTitle>
                <AlertDescription>
                    To enable the integration, please set the `WAHA_BASE_URL`, `WAHA_API_KEY`, and `WAHA_WEBHOOK_SECRET` environment variables in your deployment environment.
                </AlertDescription>
            </Alert>
        </div>
    );
}
