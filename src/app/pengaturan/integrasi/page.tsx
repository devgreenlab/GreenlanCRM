'use client';

import * as React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useUserProfile } from '@/hooks/use-user-profile';
import { useToast } from '@/hooks/use-toast';
import type { IntegrationSettings } from '@/lib/firestore/types';
import { format } from 'date-fns';
import { useUser } from '@/firebase';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ShieldAlert, CheckCircle, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';


const settingsFormSchema = z.object({
  waha: z.object({
    baseUrl: z.string().url('Must be a valid URL (e.g., https://waha.example.com)').or(z.literal('')),
  }),
  secrets: z.object({
    crmWebhookSecret: z.string(),
  }),
  flags: z.object({
    inboundEnabled: z.boolean(),
    outboundEnabled: z.boolean(),
    captureFromNow: z.boolean(),
  }),
});


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
                    <Skeleton className="h-10 w-full" />
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
  
  const [settings, setSettings] = React.useState<Partial<IntegrationSettings>>({});
  const [isFetching, setIsFetching] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [isSettingKey, setIsSettingKey] = React.useState(false);
  const [isTesting, setIsTesting] = React.useState(false);

  const [wahaApiKey, setWahaApiKey] = React.useState('');

  const form = useForm<z.infer<typeof settingsFormSchema>>({
    resolver: zodResolver(settingsFormSchema),
    defaultValues: {
        waha: { baseUrl: '' },
        secrets: { crmWebhookSecret: '' },
        flags: { inboundEnabled: false, outboundEnabled: false, captureFromNow: true },
    },
  });

  const getAuthHeader = async () => {
    if (!authUser) throw new Error("User not authenticated.");
    const token = await authUser.getIdToken();
    return { 'Authorization': `Bearer ${token}` };
  };

  const fetchSettings = React.useCallback(async () => {
    if (!authUser) return;
    setIsFetching(true);
    try {
        const headers = await getAuthHeader();
        const response = await fetch('/api/admin/integrations/settings', { headers });
        if (!response.ok) throw new Error('Failed to fetch settings');
        const data = await response.json();
        setSettings(data);
        form.reset({
            waha: { baseUrl: data.waha?.baseUrl || '' },
            secrets: { crmWebhookSecret: data.secrets?.crmWebhookSecret || '' },
            flags: { 
              inboundEnabled: data.flags?.inboundEnabled || false, 
              outboundEnabled: data.flags?.outboundEnabled || false,
              captureFromNow: data.flags?.captureFromNow === undefined ? true : data.flags.captureFromNow
            },
        });
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
        setIsFetching(false);
    }
  }, [form, toast, authUser]);

  React.useEffect(() => {
    if (userProfile?.role === 'SUPER_ADMIN' && authUser) {
        fetchSettings();
    }
  }, [userProfile, authUser, fetchSettings]);


  async function onSaveSettings(data: z.infer<typeof settingsFormSchema>) {
    setIsSaving(true);
    try {
        const headers = await getAuthHeader();
        const response = await fetch('/api/admin/integrations/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...headers },
            body: JSON.stringify(data),
        });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || 'Failed to save settings');
        }
        toast({ title: 'Success', description: 'Settings saved successfully.' });
        await fetchSettings();
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
        setIsSaving(false);
    }
  }

  async function onSetWahaKey() {
    if (!wahaApiKey) {
        toast({ variant: 'destructive', title: 'Error', description: 'API Key cannot be empty.' });
        return;
    }
    setIsSettingKey(true);
    try {
        const headers = await getAuthHeader();
        const response = await fetch('/api/admin/integrations/waha-key', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...headers },
            body: JSON.stringify({ apiKey: wahaApiKey }),
        });
         if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || 'Failed to set API key.');
        }
        toast({ title: 'Success', description: 'WAHA API Key has been set.' });
        setWahaApiKey('');
        await fetchSettings();
    } catch(error: any) {
         toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
        setIsSettingKey(false);
    }
  }

  async function onClearWahaKey() {
      try {
        const headers = await getAuthHeader();
        const response = await fetch('/api/admin/integrations/waha-key', { method: 'DELETE', headers });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || 'Failed to clear API key.');
        }
        toast({ title: 'Success', description: 'WAHA API Key has been cleared.' });
        await fetchSettings();
    } catch(error: any) {
        toast({ variant: 'destructive', title: 'Error', description: error.message });
    }
  }

  async function onTestConnection() {
    setIsTesting(true);
     try {
        const headers = await getAuthHeader();
        const response = await fetch('/api/admin/integrations/test-waha', { 
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

  if (isProfileLoading || isFetching) {
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
          <CardTitle>Integration Settings</CardTitle>
          <CardDescription>Configure integrations with third-party services like WAHA (WhatsApp).</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSaveSettings)} className="space-y-8">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">WAHA (WhatsApp)</h3>
              <div className="space-y-2">
                  <Label htmlFor="waha.baseUrl">Base URL</Label>
                  <Input id="waha.baseUrl" {...form.register('waha.baseUrl')} placeholder="https://waha.example.com" />
                  {form.formState.errors.waha?.baseUrl && <p className="text-sm text-destructive">{form.formState.errors.waha.baseUrl.message}</p>}
              </div>
            </div>
            
            <div className="space-y-4">
                <h3 className="text-lg font-medium">Secrets</h3>
                 <div className="space-y-2">
                    <Label htmlFor="secrets.crmWebhookSecret">CRM Webhook Secret</Label>
                    <Input id="secrets.crmWebhookSecret" {...form.register('secrets.crmWebhookSecret')} type="password" />
                     <p className="text-xs text-muted-foreground">Shared secret for validating inbound webhooks from WAHA.</p>
                    {form.formState.errors.secrets?.crmWebhookSecret && <p className="text-sm text-destructive">{form.formState.errors.secrets.crmWebhookSecret.message}</p>}
                </div>
            </div>

            <div className="space-y-4">
                <h3 className="text-lg font-medium">Flags</h3>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between rounded-lg border p-4 gap-4">
                    <div className="space-y-0.5">
                        <Label>Enable Inbound Messages</Label>
                        <p className="text-xs text-muted-foreground">Allow processing of incoming messages from WhatsApp.</p>
                    </div>
                    <Controller
                        control={form.control}
                        name="flags.inboundEnabled"
                        render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} />}
                    />
                </div>
                 <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between rounded-lg border p-4 gap-4">
                    <div className="space-y-0.5">
                        <Label>Enable Outbound Messages</Label>
                        <p className="text-xs text-muted-foreground">Allow sending messages from the CRM via WAHA.</p>
                    </div>
                     <Controller
                        control={form.control}
                        name="flags.outboundEnabled"
                        render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} />}
                    />
                </div>
                 <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between rounded-lg border p-4 gap-4">
                    <div className="space-y-0.5">
                        <Label>Capture Messages From Now</Label>
                        <p className="text-xs text-muted-foreground">If enabled, ignore webhook events for messages sent before the service was started.</p>
                    </div>
                     <Controller
                        control={form.control}
                        name="flags.captureFromNow"
                        render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} />}
                    />
                </div>
            </div>
            
            <Button type="submit" disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Save Settings'}
            </Button>
          </form>
        </CardContent>
      </Card>
      
      <Separator />

      <Card>
        <CardHeader>
            <CardTitle>WAHA API Key Management</CardTitle>
            <CardDescription>The API Key is write-only and stored securely on the server. It can't be read back.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="flex items-start justify-between rounded-lg border p-4">
                <div>
                    <h4 className="font-medium">API Key Status</h4>
                    {settings.secrets?.wahaApiKeyLast4 ? (
                        <Badge variant="secondary" className="mt-2">
                           <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                           Key set, ending in ****{settings.secrets.wahaApiKeyLast4}
                        </Badge>
                    ) : (
                         <Badge variant="destructive" className="mt-2">
                            <XCircle className="mr-2 h-4 w-4" />
                            Key not set
                         </Badge>
                    )}
                    {settings.secrets?.wahaApiKeyRotatedAt && (
                        <p className="text-xs text-muted-foreground mt-2">
                            Last set: {format(new Date((settings.secrets.wahaApiKeyRotatedAt as any).toDate()), "PPP p")}
                        </p>
                    )}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={onTestConnection} disabled={isTesting || !settings.secrets?.wahaApiKeyLast4}>
                      {isTesting ? 'Testing...' : 'Test Connection'}
                  </Button>
                  <AlertDialog>
                      <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="sm" disabled={!settings.secrets?.wahaApiKeyLast4}>Clear Key</Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                          <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently clear the WAHA API Key. You will need to set a new one to re-enable the integration.</AlertDialogDescription></AlertDialogHeader>
                          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={onClearWahaKey}>Confirm</AlertDialogAction></AlertDialogFooter>
                      </AlertDialogContent>
                  </AlertDialog>
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="waha-key">Set New WAHA API Key</Label>
                <div className="flex gap-2">
                    <Input 
                        id="waha-key" 
                        type="password"
                        value={wahaApiKey}
                        onChange={(e) => setWahaApiKey(e.target.value)}
                        placeholder="Enter new API key..." 
                    />
                    <Button onClick={onSetWahaKey} disabled={isSettingKey || !wahaApiKey}>
                        {isSettingKey ? 'Setting...' : 'Set/Rotate Key'}
                    </Button>
                </div>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
