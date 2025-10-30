import { Navigate, Route, Routes } from "react-router-dom"

import { ClientLayout } from "./routes/client/ClientLayout"
import { ClientDashboardPage } from "./routes/client/Dashboard"
import { LoginPage } from "./routes/login/LoginPage"
import { RequireAuth } from "./routes/common/RequireAuth"
import { ClientProjectsPage } from "./routes/client/Projects"
import { ClientCalendarPage } from "./routes/client/Calendar"
import { ClientDocumentsPage } from "./routes/client/Documents"
import { ClientMessagesPage } from "./routes/client/Messages"
import { ClientPaymentsPage } from "./routes/client/Payments"
import { ClientProfilePage } from "./routes/client/Profile"
import { AdminLayout } from "./routes/admin/AdminLayout"
import { AdminOverviewPage } from "./routes/admin/Overview"
import { AdminCalendarPage } from "./routes/admin/Calendar"
import { AdminClientsPage } from "./routes/admin/Clients"
import { AdminProjectsPage } from "./routes/admin/Projects"
import { AdminDocumentsPage } from "./routes/admin/Documents"
import { AdminProjectDetailsPage } from "./routes/admin/ProjectDetails"
import { AdminTeamPage } from "./routes/admin/Team"
import { LandingPage } from "./routes/home/LandingPage"

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/client"
        element={
          <RequireAuth role="client">
            <ClientLayout />
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<ClientDashboardPage />} />
        <Route path="projects" element={<ClientProjectsPage />} />
        <Route path="calendar" element={<ClientCalendarPage />} />
        <Route path="documents" element={<ClientDocumentsPage />} />
        <Route path="messages" element={<ClientMessagesPage />} />
        <Route path="payments" element={<ClientPaymentsPage />} />
        <Route path="profile" element={<ClientProfilePage />} />
      </Route>
      <Route
        path="/dashboard"
        element={
          <RequireAuth role="admin">
            <AdminLayout />
          </RequireAuth>
        }
      >
        <Route index element={<AdminOverviewPage />} />
        <Route path="calendar" element={<AdminCalendarPage />} />
        <Route path="clients" element={<AdminClientsPage />} />
        <Route path="team" element={<AdminTeamPage />} />
        <Route path="projects/:projectId" element={<AdminProjectDetailsPage />} />
        <Route path="projects" element={<AdminProjectsPage />} />
        <Route path="documents" element={<AdminDocumentsPage />} />
      </Route>
      <Route path="/admin/projects/:projectId" element={<AdminProjectDetailsPage />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}
