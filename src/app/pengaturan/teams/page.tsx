import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";

export default function TeamsPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Teams</CardTitle>
        <CardDescription>
          Kelola tim di dalam organisasi Anda.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">
          Belum ada data tim.
        </p>
      </CardContent>
    </Card>
  );
}
