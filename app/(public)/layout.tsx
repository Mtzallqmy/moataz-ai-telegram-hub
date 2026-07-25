import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
export default function PublicLayout({children}:{children:React.ReactNode}){return <div className="site-page"><SiteHeader/>{children}<SiteFooter/></div>;}
