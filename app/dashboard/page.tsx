import { DashboardLayout } from "@/components/dashboard-layout"
import { DashboardOverview } from "@/components/dashboard-overview"
import { requireAdminSession } from "@/lib/auth/guards"
import { getDashboardData } from "@/lib/supabase/queries"

export default async function DashboardPage() {
  await requireAdminSession()
  const dashboardData = await getDashboardData()

  return (
    <DashboardLayout>
      <DashboardOverview data={dashboardData} />
    </DashboardLayout>
  )
}
