import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";

export default function UsersPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Users</CardTitle>
        <CardDescription>
          Kelola pengguna dan izin mereka.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">
          Belum ada data pengguna.
        </p>
      </CardContent>
    </Card>
  );
}
