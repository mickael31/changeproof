import { AppSidebar } from "@/components/layout/sidebar"
import { InitJobs } from "@/components/layout/init-jobs"
import { AppHeader } from "@/components/layout/header"
import { AnimatedShell } from "@/components/motion/animated-shell"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-shell min-h-screen">
      <InitJobs />
      <AppSidebar />
      <div className="min-h-screen lg:pl-[280px]">
        <AppHeader />
        <main className="px-4 py-5 sm:px-6 lg:px-8">
          <AnimatedShell className="page-shell space-y-6">{children}</AnimatedShell>
        </main>
      </div>
    </div>
  )
}
