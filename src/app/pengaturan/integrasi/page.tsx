'use client';

import * as React from 'react';
import { useUser } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ShieldAlert, Server, CheckCircle, XCircle, Bot } from 'lucide-react';
import { useUserProfile } from '@/hooks/use-user-profile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface WahaConfigStatus {
    wahaBaseUrl: string;
    isApiKeySet: boolean;
    isWebhookSecretSet: boolean;
}

function PageSkeleton() {
    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <Skeleton className="h-8 w-1/2" />
                    <Skeleton className="h-4 w-3/4 mt-2" />
                </CardHeader>
                <CardContent className="space-y-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-32" />
                </CardContent>
            </Card>
            <Card>
                 <CardHeader>
                    <Skeleton className="h-8 w-1/3" />
                    <Skeleton className="h-4 w-2/3 mt-2" />
                </CardHeader>
                <CardContent className="space-y-4">
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                </CardContent>
            </Card>
        </div>
    );
}

function StatusRow({ label, isSet }: { label: string; isSet: boolean }) {
    return (
        <div className="flex items-center justify-between py-3 border-b">
            <span className="text-sm font-medium text-muted-foreground">{label}</span>
            {isSet ? (
                <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="h-4 w-4" />
                    <span className="text-sm font-semibold">Set</span>
                </div>
            ) : (
                <div className="flex items-center gap-2 text-red-600">
                    <XCircle className="h-4 w-4" />
                    <span className="text-sm font-semibold">Not Set on Server</span>
                </div>
            )}
        </div>
    );
}

export default function IntegrasiPage() {
    const { userProfile, isLoading: isProfileLoading } = useUserProfile();
    const { user: authUser } = useUser();
    const { toast } = useToast();
    
    const [config, setConfig] = React.useState<WahaConfigStatus | null>(null);
    const [isFetchingConfig, setIsFetchingConfig] = React.useState(true);
    const [baseUrlInput, setBaseUrlInput] = React.useState('');
    const [isSaving, setIsSaving] = React.useState(false);
    const [isPinging, setIsPinging] = React.useState(false);
    
    const isSuperAdmin = userProfile?.role === 'SUPER_ADMIN';

    const fetchConfig = React.useCallback(async () => {
        if (!authUser || !isSuperAdmin) {
            setIsFetchingConfig(false);
            return;
        };
        setIsFetchingConfig(true);
        try {
            const token = await authUser.getIdToken();
            const response = await fetch('/api/admin/waha/config', {
                headers: { 'Authorization': `Bearer ${token}` },
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to fetch config status');
            }
            const data: WahaConfigStatus = await response.json();
            setConfig(data);
            setBaseUrlInput(data.wahaBaseUrl);
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error Fetching Config', description: error.message });
        } finally {
            setIsFetchingConfig(false);
        }
    }, [authUser, toast, isSuperAdmin]);

    React.useEffect(() => {
        if (authUser) {
            fetchConfig();
        }
    }, [authUser, fetchConfig]);

    const handleSaveBaseUrl = async () => {
        if (!authUser || !isSuperAdmin) return;
        setIsSaving(true);
        try {
            const token = await authUser.getIdToken();
            const response = await fetch('/api/admin/waha/config', {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ wahaBaseUrl: baseUrlInput }),
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'Failed to save base URL.');
            }
            toast({ title: 'Success', description: 'WAHA Base URL saved.' });
            setConfig(prev => prev ? {...prev, wahaBaseUrl: baseUrlInput} : null);
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error Saving URL', description: error.message });
        } finally {
            setIsSaving(false);
        }
    };
    
    const handlePing = async () => {
        if (!authUser || !isSuperAdmin) return;
        setIsPinging(true);
        try {
            const token = await authUser.getIdToken();
            const response = await fetch('/api/admin/waha/ping', {
                headers: { 'Authorization': `Bearer ${token}` },
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'Ping failed.');
            }
            toast({ title: 'Ping Successful!', description: data.message || 'Connected to WAHA.' });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Ping Failed', description: error.message });
        } finally {
            setIsPinging(false);
        }
    };

    if (isProfileLoading) {
        return <PageSkeleton />;
    }

    if (!isSuperAdmin) {
        return (
            <Alert variant="destructive">
                <ShieldAlert className="h-4 w-4" />
                <AlertTitle>Access Denied</AlertTitle>
                <AlertDescription>Only Super Admins can access this page.</AlertDescription>
            </Alert>
        );
    }
    
    if (isFetchingConfig) {
        return <PageSkeleton />;
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>WAHA Integration</CardTitle>
                    <CardDescription>
                        Manage your WhatsApp HTTP API (WAHA) integration settings. The Base URL is saved here, while secrets like the API Key must be set on the server.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                     <div>
                        <label htmlFor="wahaBaseUrl" className="text-sm font-medium">WAHA Base URL</label>
                        <div className="flex gap-2 mt-1">
                            <Input
                                id="wahaBaseUrl"
                                placeholder="https://waha-instance.example.com"
                                value={baseUrlInput}
                                onChange={(e) => setBaseUrlInput(e.target.value)}
                            />
                            <Button onClick={handleSaveBaseUrl} disabled={isSaving}>
                                {isSaving ? 'Saving...' : 'Save'}
                            </Button>
                        </div>
                    </div>
                    
                    <Button onClick={handlePing} disabled={isPinging || !baseUrlInput} variant="outline">
                        <Bot className="mr-2 h-4 w-4"/>
                        {isPinging ? 'Pinging...' : 'Test Connection'}
                    </Button>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Server Environment Status</CardTitle>
                    <CardDescription>
                        These secret values must be set as environment variables on the server and cannot be changed from this UI.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {config ? (
                        <div>
                            <StatusRow label="WAHA_API_KEY" isSet={config.isApiKeySet} />
                            <StatusRow label="WAHA_WEBHOOK_SECRET" isSet={config.isWebhookSecretSet} />
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground">Could not load environment status.</p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
