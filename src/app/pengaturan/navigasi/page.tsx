'use client';

import * as React from 'react';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { useUserProfile } from '@/hooks/use-user-profile';
import { doc, updateDoc } from 'firebase/firestore';
import type { NavigationSettings, RoleAccess } from '@/lib/firestore/types';
import { MENU_ITEMS } from '@/lib/menu-items';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { ErrorState } from '@/components/shared/error-state';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ShieldAlert } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

function PageSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-4 w-3/4 mt-2" />
      </CardHeader>
      <CardContent className="space-y-6">
        {[...Array(3)].map((_, i) => (
          <div key={i}>
            <div className="flex justify-between items-center">
              <Skeleton className="h-6 w-1/4" />
              <div className="flex gap-8">
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-6 w-16" />
              </div>
            </div>
            <div className="pl-6 mt-4 space-y-4">
              <div className="flex justify-between items-center">
                <Skeleton className="h-5 w-1/3" />
                <div className="flex gap-8">
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-5 w-16" />
                   <Skeleton className="h-5 w-16" />
                </div>
              </div>
            </div>
          </div>
        ))}
        <Skeleton className="h-10 w-28 mt-6" />
      </CardContent>
    </Card>
  );
}

export default function NavigasiPage() {
  const { userProfile, isLoading: isProfileLoading } = useUserProfile();
  const firestore = useFirestore();
  const { toast } = useToast();

  const navSettingsRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'settings', 'navigation') : null),
    [firestore]
  );
  const { data: navSettings, isLoading: isNavLoading, error: navError } = useDoc<NavigationSettings>(navSettingsRef);

  const [roleAccess, setRoleAccess] = React.useState<RoleAccess | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);

  React.useEffect(() => {
    if (navSettings) {
        setRoleAccess({
            SUPER_ADMIN: navSettings.roleAccess?.SUPER_ADMIN ?? [],
            HEAD_SALES: navSettings.roleAccess?.HEAD_SALES ?? [],
            SALES: navSettings.roleAccess?.SALES ?? [],
        });
    }
  }, [navSettings]);

  const handleToggle = (role: keyof RoleAccess, key: string, isSubItem: boolean) => {
    if (role === 'SUPER_ADMIN') {
        return; // Super Admin permissions cannot be changed
    }

    setRoleAccess((prev) => {
      if (!prev) return null;
      const newAccess = { ...prev };
      const currentPermissions = newAccess[role] || [];
      const hasPermission = currentPermissions.includes(key);

      if (hasPermission) {
        newAccess[role] = currentPermissions.filter((k) => k !== key);
        // If a parent menu is disabled, disable all its children
        if (!isSubItem) {
          const parent = MENU_ITEMS.find(item => item.key === key);
          if (parent?.subItems) {
            const subItemKeys = parent.subItems.map(sub => sub.key);
            newAccess[role] = newAccess[role].filter(k => !subItemKeys.includes(k));
          }
        }
      } else {
        newAccess[role] = [...currentPermissions, key];
        // If a subitem is enabled, ensure its parent is also enabled
        if (isSubItem) {
          const parent = MENU_ITEMS.find(item => item.subItems?.some(sub => sub.key === key));
          if (parent && !newAccess[role].includes(parent.key)) {
            newAccess[role].push(parent.key);
          }
        }
      }

      return newAccess;
    });
  };

  const handleSaveChanges = async () => {
    if (!firestore || !roleAccess) return;
    setIsSaving(true);
    try {
      const settingsRef = doc(firestore, 'settings', 'navigation');
      await updateDoc(settingsRef, { roleAccess });
      toast({ title: 'Sukses', description: 'Pengaturan navigasi berhasil disimpan.' });
    } catch (error: any) {
      console.error('Error saving navigation settings:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Gagal menyimpan pengaturan.',
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  const isLoading = isProfileLoading || isNavLoading;

  if (isLoading) {
    return <PageSkeleton />;
  }

  if (userProfile?.role !== 'SUPER_ADMIN') {
    return (
        <Alert variant="destructive">
            <ShieldAlert className="h-4 w-4" />
            <AlertTitle>Akses Ditolak</AlertTitle>
            <AlertDescription>
                Hanya Super Admin yang dapat mengakses halaman ini.
            </AlertDescription>
        </Alert>
    );
  }
  
  if (navError || !roleAccess) {
      return <ErrorState onRetry={() => window.location.reload()} message="Gagal memuat pengaturan navigasi." />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pengaturan Navigasi</CardTitle>
        <CardDescription>
          Centang item menu mana yang dapat dilihat oleh setiap peran. Super Admin selalu memiliki akses ke semua menu, dan pengaturannya tidak dapat diubah.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="flex items-center px-4 font-semibold text-muted-foreground">
            <div className="flex-1">Item Menu</div>
            <div className="w-24 text-center">Super Admin</div>
            <div className="w-24 text-center">Head Sales</div>
            <div className="w-24 text-center">Sales</div>
          </div>
          <Separator />
          {MENU_ITEMS.map((item) => (
            <div key={item.key}>
              <div className="flex items-center px-4 py-2 hover:bg-muted/50 rounded-md">
                <div className="flex-1 font-medium">{item.title}</div>
                <div className="w-24 flex justify-center">
                    <Checkbox
                        checked={true}
                        disabled={true}
                        aria-label={`Toggle ${item.title} for Super Admin`}
                        id={`sa-main-${item.key}`}
                    />
                </div>
                <div className="w-24 flex justify-center">
                  <Checkbox
                    checked={roleAccess.HEAD_SALES.includes(item.key)}
                    onCheckedChange={() => handleToggle('HEAD_SALES', item.key, false)}
                    aria-label={`Toggle ${item.title} for Head Sales`}
                    id={`hs-main-${item.key}`}
                  />
                </div>
                <div className="w-24 flex justify-center">
                  <Checkbox
                    checked={roleAccess.SALES.includes(item.key)}
                    onCheckedChange={() => handleToggle('SALES', item.key, false)}
                    aria-label={`Toggle ${item.title} for Sales`}
                    id={`s-main-${item.key}`}
                  />
                </div>
              </div>
              {item.subItems && (
                <div className="pl-10 mt-2 space-y-1">
                  {item.subItems.map((subItem) => (
                    <div key={subItem.key} className="flex items-center pr-4 py-2 hover:bg-muted/50 rounded-md">
                      <div className="flex-1 text-muted-foreground">{subItem.title}</div>
                      <div className="w-24 flex justify-center">
                        <Checkbox
                            checked={true}
                            disabled={true}
                            aria-label={`Toggle ${subItem.title} for Super Admin`}
                            id={`sa-sub-${subItem.key}`}
                        />
                      </div>
                      <div className="w-24 flex justify-center">
                        <Checkbox
                          checked={roleAccess.HEAD_SALES.includes(subItem.key)}
                          onCheckedChange={() => handleToggle('HEAD_SALES', subItem.key, true)}
                          aria-label={`Toggle ${subItem.title} for Head Sales`}
                          id={`hs-sub-${subItem.key}`}
                        />
                      </div>
                      <div className="w-24 flex justify-center">
                        <Checkbox
                          checked={roleAccess.SALES.includes(subItem.key)}
                          onCheckedChange={() => handleToggle('SALES', subItem.key, true)}
                          aria-label={`Toggle ${subItem.title} for Sales`}
                          id={`s-sub-${subItem.key}`}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="mt-8">
            <Button onClick={handleSaveChanges} disabled={isSaving}>
                {isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
            </Button>
        </div>
      </CardContent>
    </Card>
  );
}
