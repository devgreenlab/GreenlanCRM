import {
  Calculator,
  FileText,
  LayoutDashboard,
  MessagesSquare,
  Receipt,
  Settings,
  ShoppingCart,
  Users,
  View,
} from 'lucide-react';

export type SubMenuItem = {
  href: string;
  title: string;
};

export type MenuItem = {
  href: string;
  title: string;
  icon: React.ElementType;
  subItems?: SubMenuItem[];
};

export const MENU_ITEMS: MenuItem[] = [
  {
    href: '/dashboard',
    title: 'Dashboard',
    icon: LayoutDashboard,
  },
  {
    href: '/obrolan',
    title: 'Obrolan',
    icon: MessagesSquare,
  },
  {
    href: '/kontak',
    title: 'Kontak',
    icon: Users,
  },
  {
    href: '/prospek',
    title: 'Prospek',
    icon: View,
  },
  {
    href: '/costing-harga',
    title: 'Costing Harga',
    icon: Calculator,
  },
  {
    href: '/penawaran',
    title: 'Penawaran',
    icon: FileText,
  },
  {
    href: '/tagihan',
    title: 'Tagihan',
    icon: Receipt,
  },
  {
    href: '/pesanan',
    title: 'Pesanan',
    icon: ShoppingCart,
  },
  {
    href: '/pengaturan',
    title: 'Pengaturan',
    icon: Settings,
    subItems: [
        { href: '/pengaturan/integrasi', title: 'Integrasi' },
        { href: '/pengaturan/users', title: 'Users' },
        { href: '/pengaturan/teams', title: 'Teams' },
        { href: '/pengaturan/pipeline', title: 'Pipeline' },
    ]
  },
];
