'use client';

import * as React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ChevronRight, LogOut } from 'lucide-react';
import { useUser, useAuth, useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { signOut } from 'firebase/auth';
import { doc } from 'firebase/firestore';

import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

import { MENU_ITEMS, type MenuItem, type SubMenuItem } from '@/lib/menu-items';
import { Logo } from '@/components/logo';
import { useUserProfile } from '@/hooks/use-user-profile';
import type { NavigationSettings } from '@/lib/firestore/types';


function SidebarSkeleton() {
    return (
        <div className="flex flex-col gap-2 p-2">
            {[...Array(8)].map((_, i) => (
                <div key={i} className="flex items-center gap-2 p-2">
                    <Skeleton className="h-6 w-6 rounded" />
                    <Skeleton className="h-4 w-32 group-data-[collapsible=icon]:hidden" />
                </div>
            ))}
        </div>
    )
}

function StaticSidebarSkeleton() {
    return (
        <Sidebar variant="sidebar" collapsible="icon">
            <SidebarHeader className="flex items-center justify-between">
                <Logo />
                <SidebarTrigger className="hidden md:flex" />
            </SidebarHeader>
            <SidebarContent>
                <SidebarSkeleton />
            </SidebarContent>
            <SidebarFooter>
                <div className="flex items-center gap-3 p-2">
                    <Skeleton className="h-9 w-9 rounded-full" />
                </div>
            </SidebarFooter>
        </Sidebar>
    );
}

export function AppSidebar() {
  const [hasMounted, setHasMounted] = React.useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const auth = useAuth();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const { userProfile, isLoading: isProfileLoading } = useUserProfile();

  const navSettingsRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'settings', 'navigation') : null),
    [firestore]
  );
  const { data: navSettings, isLoading: isNavLoading } = useDoc<NavigationSettings>(navSettingsRef);

  React.useEffect(() => {
    setHasMounted(true);
  }, []);

  const visibleMenuItems = React.useMemo(() => {
    if (isProfileLoading || isNavLoading || !userProfile) {
      return [];
    }

    // Super Admins see everything. This is a safeguard.
    if (userProfile.role === 'SUPER_ADMIN') {
        return MENU_ITEMS;
    }

    if (!navSettings?.roleAccess) {
        return [];
    }

    const userPermissions = navSettings.roleAccess[userProfile.role] || [];
    
    const buildMenu = (items: MenuItem[]): MenuItem[] => {
      return items
        .map(item => {
          // Create a new item object to avoid modifying the original MENU_ITEMS
          const newItem = { ...item };
          if (newItem.subItems) {
            // If the item has sub-items, filter them based on permissions
            newItem.subItems = newItem.subItems.filter(subItem => 
              userPermissions.includes(subItem.key)
            );
          }
          return newItem;
        })
        .filter(item => {
          // An item is visible if its key is in permissions OR if it has any visible sub-items
          return userPermissions.includes(item.key) || (item.subItems && item.subItems.length > 0);
        });
    };

    return buildMenu(MENU_ITEMS);
  }, [userProfile, navSettings, isProfileLoading, isNavLoading]);
  

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/login');
    } catch (error) {
      console.error('Logout failed', error);
    }
  };

  const getInitials = (name = '') => {
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('');
  }

  const isSubItemActive = (subItems?: SubMenuItem[]): boolean => {
    if (!subItems) return false;
    return subItems.some((item) => pathname.startsWith(item.href));
  };

  const isLoading = isUserLoading || isProfileLoading || isNavLoading;

  if (!hasMounted) {
    return <StaticSidebarSkeleton />;
  }

  return (
    <Sidebar variant="sidebar" collapsible="icon">
      <SidebarHeader className="flex items-center justify-between">
        <Logo />
        <SidebarTrigger className="hidden md:flex" />
      </SidebarHeader>
      <SidebarContent>
        { isLoading ? <SidebarSkeleton /> : (
            <SidebarMenu>
            {visibleMenuItems.map((item) =>
                item.subItems && item.subItems.length > 0 ? (
                <SidebarMenuItem key={item.key}>
                    <Collapsible defaultOpen={isSubItemActive(item.subItems)}>
                    <CollapsibleTrigger asChild>
                        <SidebarMenuButton
                        isActive={isSubItemActive(item.subItems)}
                        tooltip={{ children: item.title }}
                        >
                        <div className="flex w-full items-center justify-between">
                            <div className="flex items-center gap-2">
                            <item.icon />
                            <span>{item.title}</span>
                            </div>
                            <ChevronRight className="h-4 w-4 shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-90" />
                        </div>
                        </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                        <SidebarMenuSub>
                        {item.subItems.map((subItem) => (
                            <SidebarMenuSubItem key={subItem.key}>
                            <SidebarMenuSubButton
                                isActive={pathname === subItem.href}
                                onClick={() => router.push(subItem.href)}
                            >
                                <subItem.icon />
                                <span>{subItem.title}</span>
                            </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                        ))}
                        </SidebarMenuSub>
                    </CollapsibleContent>
                    </Collapsible>
                </SidebarMenuItem>
                ) : (
                <SidebarMenuItem key={item.key}>
                    <SidebarMenuButton
                    isActive={pathname.startsWith(item.href)}
                    tooltip={{ children: item.title }}
                    onClick={() => router.push(item.href)}
                    >
                    <item.icon />
                    <span>{item.title}</span>
                    </SidebarMenuButton>
                </SidebarMenuItem>
                )
            )}
            </SidebarMenu>
        )}
      </SidebarContent>
      <SidebarFooter>
        { isUserLoading ? (
            <div className="flex items-center gap-3 p-2">
                <Skeleton className="h-9 w-9 rounded-full" />
                <div className="flex flex-col gap-1.5 group-data-[collapsible=icon]:hidden">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-3 w-28" />
                </div>
            </div>
        ) : user ? (
            <div className="flex items-center gap-3 p-2 rounded-md transition-colors">
            <Avatar className="h-9 w-9">
              <AvatarImage src={`https://i.pravatar.cc/150?u=${user.email}`} data-ai-hint="profile picture" alt={user.displayName || 'User'} />
              <AvatarFallback>{getInitials(user.displayName || '')}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col group-data-[collapsible=icon]:hidden">
              <span className="text-sm font-medium">{user.displayName}</span>
              <span className="text-xs text-sidebar-foreground/70">{user.email}</span>
            </div>
            <Button variant="ghost" size="icon" className="ml-auto h-8 w-8 group-data-[collapsible=icon]:hidden" onClick={handleLogout}>
                <LogOut className="h-4 w-4"/>
            </Button>
          </div>
        ) : null}
      </SidebarFooter>
    </Sidebar>
  );
}
