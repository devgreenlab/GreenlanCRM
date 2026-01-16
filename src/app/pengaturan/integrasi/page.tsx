import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";

export default function IntegrasiPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Integrasi</CardTitle>
        <CardDescription>
          Kelola integrasi Anda dengan layanan pihak ketiga.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">
          Belum ada data integrasi.
        </p>
      </CardContent>
    </Card>
  );
}
