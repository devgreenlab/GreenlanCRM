import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";

export default function PipelinePage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Pipeline</CardTitle>
        <CardDescription>
          Konfigurasikan tahapan pipeline penjualan Anda.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">
          Belum ada data pipeline.
        </p>
      </CardContent>
    </Card>
  );
}
