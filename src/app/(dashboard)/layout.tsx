import { AppSidebar } from "@/components/layout/sidebar"
import { InitJobs } from "@/components/layout/init-jobs"
import { AppHeader } from "@/components/layout/header"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background">
      <InitJobs />
      <AppSidebar />
      <div className="ml-64">
        <AppHeader />
        <main className="p-6">{children}</main>
      </div>
    </div>
  )
}
