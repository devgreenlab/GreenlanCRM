'use client';

import * as React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useUser } from '@/firebase';
import { useToast } from '@/hooks/use-toast';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ShieldAlert, CheckCircle, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUserProfile } from '@/hooks/use-user-profile';


interface WahaConfig {
    baseUrl: string;
    authMode: 'X-Api-Key' | 'Bearer';
    keySet: boolean;
}

function PageSkeleton() {
    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <Skeleton className="h-8 w-1/2" />
                    <Skeleton className="h-4 w-3/4 mt-2" />
                </CardHeader>
                <CardContent className="space-y-6">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-24" />
                </CardContent>
            </Card>
             <Card>
                <CardHeader>
                    <Skeleton className="h-8 w-1/3" />
                </CardHeader>
                <CardContent className="space-y-4">
                    <Skeleton className="h-10 w-full" />
                </CardContent>
            </Card>
        </div>
    )
}

export default function IntegrasiPage() {
  const { userProfile, isLoading: isProfileLoading } = useUserProfile();
  const { user: authUser } = useUser();
  const { toast } = useToast();
  
  const [config, setConfig] = React.useState<Partial<WahaConfig>>({});
  const [isFetching, setIsFetching] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [isSettingKey, setIsSettingKey] = React.useState(false);
  const [isTesting, setIsTesting] = React.useState(false);

  const [apiKey, setApiKey] = React.useState('');

  const { register, handleSubmit, control, reset, formState: { errors } } = useForm<Omit<WahaConfig, 'keySet'>>({
    defaultValues: {
        baseUrl: '',
        authMode: 'X-Api-Key',
    },
  });

  const getAuthHeader = async () => {
    if (!authUser) throw new Error("User not authenticated.");
    const token = await authUser.getIdToken();
    return { 'Authorization': `Bearer ${token}` };
  };

  const fetchConfig = React.useCallback(async () => {
    if (!authUser) return;
    setIsFetching(true);
    try {
        const headers = await getAuthHeader();
        const response = await fetch('/api/admin/waha/config', { headers });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to fetch settings');
        }
        const data: WahaConfig = await response.json();
        setConfig(data);
        reset({
            baseUrl: data.baseUrl || '',
            authMode: data.authMode || 'X-Api-Key',
        });
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
        setIsFetching(false);
    }
  }, [reset, toast, authUser]);

  React.useEffect(() => {
    if (userProfile?.role === 'SUPER_ADMIN' && authUser) {
        fetchConfig();
    }
  }, [userProfile, authUser, fetchConfig]);


  async function onSaveConfig(data: Omit<WahaConfig, 'keySet'>) {
    setIsSaving(true);
    try {
        const headers = await getAuthHeader();
        const response = await fetch('/api/admin/waha/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...headers },
            body: JSON.stringify(data),
        });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || 'Failed to save settings');
        }
        toast({ title: 'Success', description: 'Settings saved successfully.' });
        await fetchConfig();
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Error saving settings', description: error.message });
    } finally {
        setIsSaving(false);
    }
  }

  async function onSetApiKey() {
    if (!apiKey) {
        toast({ variant: 'destructive', title: 'Error', description: 'API Key cannot be empty.' });
        return;
    }
    setIsSettingKey(true);
    try {
        const headers = await getAuthHeader();
        const response = await fetch('/api/admin/waha/key', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...headers },
            body: JSON.stringify({ apiKey }),
        });
         if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || 'Failed to set API key.');
        }
        toast({ title: 'Success', description: 'WAHA API Key has been set.' });
        setApiKey('');
        await fetchConfig();
    } catch(error: any) {
         toast({ variant: 'destructive', title: 'Error setting key', description: error.message });
    } finally {
        setIsSettingKey(false);
    }
  }

  async function onTestConnection() {
    setIsTesting(true);
     try {
        const headers = await getAuthHeader();
        const response = await fetch('/api/admin/waha/test', { 
            method: 'POST',
            headers
        });
        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.error || 'Failed to test connection.');
        }
        toast({ title: 'Success', description: result.message });
    } catch(error: any) {
        toast({ variant: 'destructive', title: 'Connection Failed', description: error.message });
    } finally {
        setIsTesting(false);
    }
  }

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
          <CardTitle>WAHA Integration</CardTitle>
          <CardDescription>Configure the connection to your WAHA (WhatsApp HTTP API) instance.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSaveConfig)} className="space-y-6">
            <div className="space-y-2">
                <Label htmlFor="baseUrl">WAHA Base URL</Label>
                <Input 
                    id="baseUrl" 
                    {...register('baseUrl', { required: 'Base URL is required.'})} 
                    placeholder="https://waha.example.com" 
                />
                {errors.baseUrl && <p className="text-sm text-destructive">{errors.baseUrl.message}</p>}
            </div>

            <div className="space-y-2">
                <Label>Authentication Mode</Label>
                 <Controller
                    control={control}
                    name="authMode"
                    render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select auth method" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="X-Api-Key">Header: X-Api-Key</SelectItem>
                                <SelectItem value="Bearer">Header: Authorization Bearer</SelectItem>
                            </SelectContent>
                        </Select>
                    )}
                />
            </div>
            
            <Button type="submit" disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Save Settings'}
            </Button>
          </form>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
            <CardTitle>API Key Management</CardTitle>
            <CardDescription>The API Key is write-only and stored securely on the server. It can't be read back.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="flex items-start justify-between rounded-lg border p-4">
                <div>
                    <h4 className="font-medium">Connection Status</h4>
                    {config.keySet ? (
                        <Badge variant="secondary" className="mt-2">
                           <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                           Key is set
                        </Badge>
                    ) : (
                         <Badge variant="destructive" className="mt-2">
                            <XCircle className="mr-2 h-4 w-4" />
                            Key not set
                         </Badge>
                    )}
                </div>
                <Button variant="outline" onClick={onTestConnection} disabled={isTesting || !config.keySet}>
                    {isTesting ? 'Testing...' : 'Test Connection'}
                </Button>
            </div>

            <div className="space-y-2">
                <Label htmlFor="waha-key">Set WAHA API Key</Label>
                <div className="flex gap-2">
                    <Input 
                        id="waha-key" 
                        type="password"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder="Enter new API key..." 
                    />
                    <Button onClick={onSetApiKey} disabled={isSettingKey || !apiKey}>
                        {isSettingKey ? 'Setting...' : 'Set Key'}
                    </Button>
                </div>
                 <p className="text-xs text-muted-foreground">Setting a key will overwrite any existing key.</p>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
    