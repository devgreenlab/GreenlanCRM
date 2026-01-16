'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

const TABS = [
  { value: 'integrasi', label: 'Integrasi' },
  { value: 'users', label: 'Users' },
  { value: 'teams', label: 'Teams' },
  { value: 'pipeline', label: 'Pipeline' },
];

export default function PengaturanLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  
  const currentTab = pathname.split('/').pop() || 'integrasi';

  const handleTabChange = (value: string) => {
    router.push(`/pengaturan/${value}`);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <h1 className="text-3xl font-bold tracking-tight font-headline">Pengaturan (Settings)</h1>
      <p className="text-muted-foreground mt-2 font-serif">
        Kelola pengaturan aplikasi dan preferensi pengguna Anda.
      </p>

      <Tabs value={currentTab} onValueChange={handleTabChange} className="mt-6">
        <TabsList className="w-full sm:w-auto">
          {TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      
      <div className="mt-6">{children}</div>
    </div>
  );
}
