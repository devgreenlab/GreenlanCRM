export default function PengaturanLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <h1 className="text-3xl font-bold tracking-tight font-headline">Pengaturan (Settings)</h1>
      <p className="text-muted-foreground mt-2 font-serif">
        Kelola pengaturan aplikasi dan preferensi pengguna Anda.
      </p>
      
      <div className="mt-6">{children}</div>
    </div>
  );
}
