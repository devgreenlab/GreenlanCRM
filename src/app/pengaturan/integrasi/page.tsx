'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { useUserProfile } from '@/hooks/use-user-profile';
import { useToast } from '@/hooks/use-toast';

import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ShieldAlert, KeyRound, Trash2, Loader2, CheckCircle, XCircle } from 'lucide-react';

const integrationSettingsSchema = z.object({
  waha: z.object({
    baseUrl: z.string().url('Please enter a valid HTTPS URL.').startsWith('https://', 'URL must start with https://'),
    session: z.string().min(1, 'Session name is required.'),
  }),
  n8n: z.object({
    outboundWebhookUrl: z.string().url('Please enter a valid HTTPS URL.').startsWith('https://', 'URL must start with https://'),
  }),
  secrets: z.object({
    crmWebhookSecret: z.string().min(16, 'Secret must be at least 16 characters long.'),
  }),
  flags: z.object({
    inboundEnabled: z.boolean(),
    outboundEnabled: z.boolean(),
  }),
});

type IntegrationSettingsFormValues = z.infer<typeof integrationSettingsSchema>;

const apiKeySchema = z.object({
  apiKey: z.string().min(1, 'API Key is required.'),
});

function PageSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-48 w-full" />
      <Skeleton className="h-48 w-full" />
      <Skeleton className="h-48 w-full" />
    </div>
  );
}

export default function IntegrasiPage() {
  const { userProfile, isLoading: isProfileLoading } = useUserProfile();
  const { toast } = useToast();
  
  const [settings, setSettings] = React.useState<any>(null);
  const [isLoadingSettings, setIsLoadingSettings] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);

  const [isTestingWaha, setIsTestingWaha] = React.useState(false);
  const [wahaTestResult, setWahaTestResult] = React.useState<{ success: boolean; message: string } | null>(null);
  const [isTestingSumoPod, setIsTestingSumoPod] = React.useState(false);
  const [sumoPodTestResult, setSumoPodTestResult] = React.useState<{ success: boolean; message: string } | null>(null);

  const form = useForm<IntegrationSettingsFormValues>({
    resolver: zodResolver(integrationSettingsSchema),
    defaultValues: {
      waha: { baseUrl: '', session: 'default' },
      n8n: { outboundWebhookUrl: '' },
      secrets: { crmWebhookSecret: '' },
      flags: { inboundEnabled: false, outboundEnabled: false },
    },
  });
  
  const wahaApiKeyForm = useForm<{ apiKey: string }>({
    resolver: zodResolver(apiKeySchema),
    defaultValues: { apiKey: '' },
  });

  const sumoPodApiKeyForm = useForm<{ apiKey: string }>({
    resolver: zodResolver(apiKeySchema),
    defaultValues: { apiKey: '' },
  });

  const fetchSettings = React.useCallback(async () => {
    setIsLoadingSettings(true);
    try {
      const response = await fetch('/api/admin/integrations/settings');
      if (!response.ok) throw new Error('Failed to fetch settings');
      const data = await response.json();
      setSettings(data);
      form.reset({
        waha: { baseUrl: data.waha?.baseUrl || '', session: data.waha?.session || 'default' },
        n8n: { outboundWebhookUrl: data.n8n?.outboundWebhookUrl || '' },
        secrets: { crmWebhookSecret: data.secrets?.crmWebhookSecret || '' },
        flags: { inboundEnabled: data.flags?.inboundEnabled || false, outboundEnabled: data.flags?.outboundEnabled || false },
      });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setIsLoadingSettings(false);
    }
  }, [form, toast]);

  React.useEffect(() => {
    if (userProfile?.role === 'SUPER_ADMIN') {
      fetchSettings();
    }
  }, [userProfile, fetchSettings]);

  const handleSaveSettings = async (values: IntegrationSettingsFormValues) => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/admin/integrations/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save settings');
      }
      toast({ title: 'Success', description: 'Integration settings saved successfully.' });
      fetchSettings();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSetKey = async (service: 'waha' | 'sumopod', data: { apiKey: string }) => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/admin/integrations/${service}-key`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: data.apiKey }),
      });
      if (!response.ok) throw new Error(`Failed to set ${service.toUpperCase()} API key`);
      toast({ title: 'Success', description: `${service.toUpperCase()} API Key has been set securely.` });
      if (service === 'waha') wahaApiKeyForm.reset();
      if (service === 'sumopod') sumoPodApiKeyForm.reset();
      fetchSettings();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleClearKey = async (service: 'waha' | 'sumopod') => {
    if (!confirm(`Are you sure you want to clear the ${service.toUpperCase()} API Key? This action cannot be undone.`)) return;
    setIsSaving(true);
    try {
      const response = await fetch(`/api/admin/integrations/${service}-key`, { method: 'DELETE' });
      if (!response.ok) throw new Error(`Failed to clear ${service.toUpperCase()} API key`);
      toast({ title: 'Success', description: `${service.toUpperCase()} API Key has been cleared.` });
      fetchSettings();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async (service: 'waha' | 'sumopod') => {
    if (service === 'waha') setIsTestingWaha(true);
    if (service === 'sumopod') setIsTestingSumoPod(true);
    
    if (service === 'waha') setWahaTestResult(null);
    if (service === 'sumopod') setSumoPodTestResult(null);

    try {
        const response = await fetch(`/api/admin/integrations/test-${service}`, { method: 'POST' });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Test failed');
        const testResult = { success: true, message: result.message };
        if (service === 'waha') setWahaTestResult(testResult);
        if (service === 'sumopod') setSumoPodTestResult(testResult);
        toast({ title: 'Test Success', description: result.message });
    } catch (error: any) {
        const testResult = { success: false, message: error.message };
        if (service === 'waha') setWahaTestResult(testResult);
        if (service === 'sumopod') setSumoPodTestResult(testResult);
        toast({ variant: 'destructive', title: 'Test Failed', description: error.message });
    } finally {
        if (service === 'waha') setIsTestingWaha(false);
        if (service === 'sumopod') setIsTestingSumoPod(false);
    }
  };


  if (isProfileLoading || isLoadingSettings) {
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
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSaveSettings)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>WAHA (WhatsApp) Configuration</CardTitle>
              <CardDescription>Configure the connection to your WAHA instance.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField name="waha.baseUrl" control={form.control} render={({ field }) => (
                <FormItem>
                  <FormLabel>WAHA Base URL</FormLabel>
                  <FormControl><Input placeholder="https://waha.your-domain.com" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField name="waha.session" control={form.control} render={({ field }) => (
                <FormItem>
                  <FormLabel>WAHA Session Name</FormLabel>
                  <FormControl><Input placeholder="default" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>n8n Configuration</CardTitle>
              <CardDescription>Set up the webhook for sending outbound messages via n8n.</CardDescription>
            </CardHeader>
            <CardContent>
              <FormField name="n8n.outboundWebhookUrl" control={form.control} render={({ field }) => (
                <FormItem>
                  <FormLabel>n8n Outbound Webhook URL</FormLabel>
                  <FormControl><Input placeholder="https://n8n.your-domain.com/webhook/..." {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Security & Feature Flags</CardTitle>
              <CardDescription>Manage security tokens and enable/disable integration features.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField name="secrets.crmWebhookSecret" control={form.control} render={({ field }) => (
                <FormItem>
                  <FormLabel>CRM Webhook Secret</FormLabel>
                  <FormControl><Input type="password" placeholder="A long, random, secret string" {...field} /></FormControl>
                  <FormDescription>This secret is sent to n8n to verify requests from the CRM.</FormDescription>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField name="flags.inboundEnabled" control={form.control} render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Inbound Messages</FormLabel>
                      <FormDescription>Allow receiving messages from WhatsApp.</FormDescription>
                    </div>
                    <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )} />
                <FormField name="flags.outboundEnabled" control={form.control} render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Outbound Messages</FormLabel>
                      <FormDescription>Allow sending messages from the CRM.</FormDescription>
                    </div>
                    <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )} />
              </div>
            </CardContent>
          </Card>
          
          <Button type="submit" disabled={isSaving}>
            {isSaving ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>) : 'Save All Settings'}
          </Button>
        </form>
      </Form>
      
      {/* WAHA API Key Management */}
      <Card>
        <CardHeader>
          <CardTitle>WAHA API Key Management</CardTitle>
          <CardDescription>Securely set, rotate, or clear your WAHA API Key. The key is write-only and cannot be read back.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="flex items-center gap-4 p-4 border rounded-lg">
                <KeyRound className="h-6 w-6 text-muted-foreground" />
                <div>
                    <div className="font-semibold">API Key Status</div>
                    {settings?.waha?.apiKeyLast4 ? (
                        <Badge variant="default" className="bg-green-600">Key is set (ends in ••••{settings.waha.apiKeyLast4})</Badge>
                    ) : (
                        <Badge variant="destructive">Key is not set</Badge>
                    )}
                </div>
                {settings?.waha?.apiKeyRotatedAt && (
                    <div className="text-sm text-muted-foreground ml-auto">
                        Last updated: {format(new Date(settings.waha.apiKeyRotatedAt.seconds * 1000), 'PPp')}
                    </div>
                )}
            </div>

            <Form {...wahaApiKeyForm}>
                <form onSubmit={wahaApiKeyForm.handleSubmit((data) => handleSetKey('waha', data))} className="flex items-end gap-2">
                    <FormField name="apiKey" control={wahaApiKeyForm.control} render={({ field }) => (
                        <FormItem className="flex-grow">
                            <FormLabel>Set or Rotate WAHA API Key</FormLabel>
                            <FormControl><Input type="password" placeholder="Enter new WAHA API Key" {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />
                    <Button type="submit" variant="secondary" disabled={isSaving}>
                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Set Key'}
                    </Button>
                </form>
            </Form>
            
            <div className="flex items-center justify-between pt-4 border-t">
                <div>
                    <Button onClick={() => handleTestConnection('waha')} disabled={isTestingWaha || !settings?.waha?.apiKeyLast4}>
                        {isTestingWaha ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Testing...</>) : 'Test WAHA Connection'}
                    </Button>
                    {wahaTestResult && (
                        <div className={`flex items-center gap-2 mt-2 text-sm ${wahaTestResult.success ? 'text-green-600' : 'text-red-600'}`}>
                            {wahaTestResult.success ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                            {wahaTestResult.message}
                        </div>
                    )}
                </div>
                
                <Button onClick={() => handleClearKey('waha')} variant="destructive" disabled={isSaving || !settings?.waha?.apiKeyLast4}>
                    <Trash2 className="mr-2 h-4 w-4" /> Clear Key
                </Button>
            </div>
        </CardContent>
      </Card>
      
      {/* SumoPod API Key Management */}
      <Card>
        <CardHeader>
          <CardTitle>SumoPod API Key Management</CardTitle>
          <CardDescription>Securely set, rotate, or clear your SumoPod API Key.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="flex items-center gap-4 p-4 border rounded-lg">
                <KeyRound className="h-6 w-6 text-muted-foreground" />
                <div>
                    <div className="font-semibold">API Key Status</div>
                    {settings?.sumopod?.apiKeyLast4 ? (
                        <Badge variant="default" className="bg-green-600">Key is set (ends in ••••{settings.sumopod.apiKeyLast4})</Badge>
                    ) : (
                        <Badge variant="destructive">Key is not set</Badge>
                    )}
                </div>
                {settings?.sumopod?.apiKeyRotatedAt && (
                    <div className="text-sm text-muted-foreground ml-auto">
                        Last updated: {format(new Date(settings.sumopod.apiKeyRotatedAt.seconds * 1000), 'PPp')}
                    </div>
                )}
            </div>

            <Form {...sumoPodApiKeyForm}>
                <form onSubmit={sumoPodApiKeyForm.handleSubmit((data) => handleSetKey('sumopod', data))} className="flex items-end gap-2">
                    <FormField name="apiKey" control={sumoPodApiKeyForm.control} render={({ field }) => (
                        <FormItem className="flex-grow">
                            <FormLabel>Set or Rotate SumoPod API Key</FormLabel>
                            <FormControl><Input type="password" placeholder="Enter new SumoPod API Key" {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />
                    <Button type="submit" variant="secondary" disabled={isSaving}>
                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Set Key'}
                    </Button>
                </form>
            </Form>
            
            <div className="flex items-center justify-between pt-4 border-t">
                <div>
                    <Button onClick={() => handleTestConnection('sumopod')} disabled={isTestingSumoPod || !settings?.sumopod?.apiKeyLast4}>
                        {isTestingSumoPod ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Testing...</>) : 'Test SumoPod Connection'}
                    </Button>
                    {sumoPodTestResult && (
                        <div className={`flex items-center gap-2 mt-2 text-sm ${sumoPodTestResult.success ? 'text-green-600' : 'text-red-600'}`}>
                            {sumoPodTestResult.success ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                            {sumoPodTestResult.message}
                        </div>
                    )}
                </div>
                
                <Button onClick={() => handleClearKey('sumopod')} variant="destructive" disabled={isSaving || !settings?.sumopod?.apiKeyLast4}>
                    <Trash2 className="mr-2 h-4 w-4" /> Clear Key
                </Button>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
