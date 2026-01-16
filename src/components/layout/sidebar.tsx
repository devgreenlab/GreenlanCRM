'use client';

import * as React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ChevronRight } from 'lucide-react';

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
import { MENU_ITEMS, type SubMenuItem } from '@/lib/menu-items';
import { Logo } from '@/components/logo';

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();

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
                            {subItem.title}
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
        <div className="flex items-center gap-3 p-2 rounded-md transition-colors hover:bg-sidebar-accent">
          <Avatar className="h-9 w-9">
            <AvatarImage src="https://picsum.photos/seed/1/100/100" data-ai-hint="profile picture" alt="User" />
            <AvatarFallback>U</AvatarFallback>
          </Avatar>
          <div className="flex flex-col group-data-[collapsible=icon]:hidden">
            <span className="text-sm font-medium">User</span>
            <span className="text-xs text-sidebar-foreground/70">user@example.com</span>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
