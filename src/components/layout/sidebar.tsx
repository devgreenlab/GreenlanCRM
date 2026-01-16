'use client';

import * as React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ChevronRight, LogOut } from 'lucide-react';
import { useUser, useAuth } from '@/firebase';
import { signOut } from 'firebase/auth';

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
} from '@/components/ui/sidebar';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

import { MENU_ITEMS, type SubMenuItem } from '@/lib/menu-items';
import { Logo } from '@/components/logo';

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();

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

  return (
    <Sidebar variant="sidebar" collapsible="icon">
      <SidebarHeader>
        <Logo />
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {MENU_ITEMS.map((item) =>
            item.subItems ? (
              <SidebarMenuItem key={item.href}>
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
                        <SidebarMenuSubItem key={subItem.href}>
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
              <SidebarMenuItem key={item.href}>
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
