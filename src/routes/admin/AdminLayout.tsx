import { Outlet } from "react-router-dom"

import { DashboardLayout } from "@/components/dashboard-layout"

export function AdminLayout() {
  return (
    <DashboardLayout>
      <Outlet />
    </DashboardLayout>
  )
}
