import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/auth/guards";
export default async function AccountLayout({children}:{children:React.ReactNode}){await requireUser();return <AppShell title="مساحتك الخاصة">{children}</AppShell>;}
