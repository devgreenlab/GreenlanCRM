import {
  Calculator,
  FileText,
  LayoutDashboard,
  ListFilter,
  MessagesSquare,
  Network,
  Plug,
  Receipt,
  Settings,
  Shield,
  ShoppingCart,
  Smartphone,
  User,
  UserCog,
  Users,
  View,
} from 'lucide-react';

export type SubMenuItem = {
  key: string;
  href: string;
  title: string;
  icon: React.ElementType;
};

export type MenuItem = {
  key: string;
  href: string;
  title: string;
  icon: React.ElementType;
  subItems?: SubMenuItem[];
};

export const MENU_ITEMS: MenuItem[] = [
  {
    key: 'dashboard',
    href: '/dashboard',
    title: 'Dashboard',
    icon: LayoutDashboard,
  },
  {
    key: 'obrolan',
    href: '/obrolan',
    title: 'Obrolan',
    icon: MessagesSquare,
  },
  {
    key: 'kontak',
    href: '/kontak',
    title: 'Kontak',
    icon: Users,
  },
  {
    key: 'prospek',
    href: '/prospek',
    title: 'Prospek',
    icon: View,
  },
  {
    key: 'costing-harga',
    href: '/costing-harga',
    title: 'Costing Harga',
    icon: Calculator,
  },
  {
    key: 'penawaran',
    href: '/penawaran',
    title: 'Penawaran',
    icon: FileText,
  },
  {
    key: 'tagihan',
    href: '/tagihan',
    title: 'Tagihan',
    icon: Receipt,
  },
  {
    key: 'pesanan',
    href: '/pesanan',
    title: 'Pesanan',
    icon: ShoppingCart,
  },
  {
    key: 'pengaturan',
    href: '/pengaturan',
    title: 'Pengaturan',
    icon: Settings,
    subItems: [
      { key: 'profil', href: '/pengaturan/profil', title: 'Profil', icon: User },
      { key: 'navigasi', href: '/pengaturan/navigasi', title: 'Navigasi', icon: ListFilter },
      { key: 'integrasi', href: '/pengaturan/integrasi', title: 'Integrasi', icon: Plug },
      { key: 'users', href: '/pengaturan/users', title: 'Users', icon: UserCog },
      { key: 'teams', href: '/pengaturan/teams', title: 'Teams', icon: Shield },
      { key: 'pipeline', href: '/pengaturan/pipeline', title: 'Pipeline', icon: Network },
      { key: 'sales-config', href: '/pengaturan/sales-config', title: 'Sales Config', icon: Smartphone },
    ],
  },
];

    