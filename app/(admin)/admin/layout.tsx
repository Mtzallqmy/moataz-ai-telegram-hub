import { AppShell } from "@/components/app-shell";
import { requirePermission } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requirePermission("admin.access");
  return (
    <AppShell admin title="إدارة المنصة">
      {children}
    </AppShell>
  );
}
