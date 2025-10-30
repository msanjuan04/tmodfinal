import type React from "react"

import { requireSession } from "@/lib/auth/guards"
import { getClientProjects } from "@/lib/supabase/client-data"
import { ClientShell } from "@/components/client/client-shell"

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession()
  const projects = session.clientId ? await getClientProjects(session.clientId) : []

  return <ClientShell user={session} projects={projects}>{children}</ClientShell>
}
