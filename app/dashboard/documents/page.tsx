import { requireAdminSession } from "@/lib/auth/guards"
import { DashboardLayout } from "@/components/dashboard-layout"
import { DocumentsView } from "@/components/documents-view"
import { getDocuments } from "@/lib/supabase/queries"

export default async function DocumentsPage() {
  await requireAdminSession()
  const documentsData = await getDocuments()

  return (
    <DashboardLayout>
      <DocumentsView data={documentsData} />
    </DashboardLayout>
  )
}
