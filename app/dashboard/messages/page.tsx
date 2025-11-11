import { requireAdminSession } from "@/lib/auth/guards"
import { DashboardLayout } from "@/components/dashboard-layout"
import { MessagesView } from "@/components/messages-view"
import { getMessages } from "@/lib/supabase/queries"

export default async function MessagesPage() {
  await requireAdminSession()
  const messagesData = await getMessages()

  return (
    <DashboardLayout>
      <MessagesView data={messagesData} viewerType="team_member" />
    </DashboardLayout>
  )
}
