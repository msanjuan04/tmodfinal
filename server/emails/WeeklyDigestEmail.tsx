import { Button, Hr, Section, Text } from "@react-email/components"

import { TerrazeaEmailLayout } from "./components/TerrazeaEmailLayout"

export interface WeeklyDigestProjectSummary {
  projectName: string
  statusLabel?: string | null
  documentsAdded: number
  tasksCompleted: number
  upcoming: Array<{ title: string; whenLabel: string }>
}

export interface WeeklyDigestEmailProps {
  name: string
  weekLabel: string
  projects: WeeklyDigestProjectSummary[]
  ctaUrl: string
  supportEmail?: string
}

export function WeeklyDigestEmail({
  name,
  weekLabel,
  projects,
  ctaUrl,
  supportEmail = "hola@terrazea.com",
}: WeeklyDigestEmailProps) {
  const greeting = name ? `Hola ${name},` : "Hola,"
  const preview = `Tu resumen semanal Terrazea · ${weekLabel}`

  return (
    <TerrazeaEmailLayout preview={preview} title="Resumen semanal">
      <Text style={paragraphStyle}>{greeting}</Text>
      <Text style={paragraphStyle}>
        Este es el resumen de la <strong>{weekLabel}</strong> en tus proyectos Terrazea. Así tienes a mano lo que se
        movió y las fechas clave que vienen.
      </Text>

      {projects.map((project, index) => (
        <Section key={index} style={projectCard}>
          <Text style={projectTitle}>{project.projectName}</Text>
          {project.statusLabel ? <Text style={projectStatus}>Fase: {project.statusLabel}</Text> : null}

          <div style={statsRow}>
            <div style={statBox}>
              <Text style={statValue}>{project.tasksCompleted}</Text>
              <Text style={statLabel}>tareas completadas</Text>
            </div>
            <div style={statBox}>
              <Text style={statValue}>{project.documentsAdded}</Text>
              <Text style={statLabel}>documentos nuevos</Text>
            </div>
          </div>

          {project.upcoming.length > 0 ? (
            <>
              <Text style={upcomingTitle}>Próximas fechas clave</Text>
              <div style={upcomingList}>
                {project.upcoming.map((event, i) => (
                  <div key={i} style={upcomingRow}>
                    <Text style={upcomingWhen}>{event.whenLabel}</Text>
                    <Text style={upcomingEvent}>{event.title}</Text>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <Text style={upcomingEmpty}>Sin citas clave esta próxima quincena.</Text>
          )}
        </Section>
      ))}

      <Section style={{ textAlign: "center", margin: "20px 0 24px" }}>
        <Button style={buttonStyle} href={ctaUrl}>
          Abrir mi portal
        </Button>
      </Section>

      <Text style={paragraphStyle}>
        ¿Algo no cuadra o tienes dudas? Respóndenos a este correo o escríbenos a{" "}
        <a href={`mailto:${supportEmail}`}>{supportEmail}</a>: lo revisamos contigo.
      </Text>

      <Hr style={{ borderColor: "#F3EFE5", margin: "32px 0 16px" }} />
      <Text style={smallText}>
        Recibes este resumen los lunes por la mañana. Puedes desactivarlo pidiéndonoslo a{" "}
        <a href={`mailto:${supportEmail}`}>{supportEmail}</a>.
      </Text>
    </TerrazeaEmailLayout>
  )
}

const paragraphStyle: React.CSSProperties = {
  fontSize: "15px",
  lineHeight: "24px",
  margin: "0 0 16px",
  color: "#4B5563",
}

const projectCard: React.CSSProperties = {
  backgroundColor: "#F8F7F4",
  border: "1px solid #E8E6E0",
  borderRadius: "20px",
  padding: "18px 20px",
  margin: "0 0 16px",
}

const projectTitle: React.CSSProperties = {
  fontSize: "18px",
  fontWeight: 700,
  color: "#2F4F4F",
  margin: "0 0 4px",
}

const projectStatus: React.CSSProperties = {
  fontSize: "12px",
  color: "#6B7280",
  margin: "0 0 12px",
  fontWeight: 600,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
}

const statsRow: React.CSSProperties = {
  display: "flex",
  gap: "10px",
  margin: "0 0 14px",
}

const statBox: React.CSSProperties = {
  flex: 1,
  backgroundColor: "#FFFFFF",
  border: "1px solid #E8E6E0",
  borderRadius: "14px",
  padding: "12px",
  textAlign: "center",
}

const statValue: React.CSSProperties = {
  fontSize: "26px",
  fontWeight: 700,
  color: "#2F4F4F",
  margin: "0 0 2px",
}

const statLabel: React.CSSProperties = {
  fontSize: "11px",
  color: "#6B7280",
  margin: 0,
  lineHeight: "14px",
}

const upcomingTitle: React.CSSProperties = {
  fontSize: "11px",
  letterSpacing: "0.2em",
  textTransform: "uppercase",
  color: "#2F4F4F",
  fontWeight: 600,
  margin: "0 0 8px",
}

const upcomingList: React.CSSProperties = {
  margin: 0,
}

const upcomingRow: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "baseline",
  padding: "4px 0",
  borderTop: "1px solid #E8E6E0",
}

const upcomingWhen: React.CSSProperties = {
  fontSize: "12px",
  color: "#C6B89E",
  margin: 0,
  fontWeight: 600,
}

const upcomingEvent: React.CSSProperties = {
  fontSize: "13px",
  color: "#2F4F4F",
  margin: 0,
}

const upcomingEmpty: React.CSSProperties = {
  fontSize: "12px",
  color: "#6B7280",
  margin: 0,
  fontStyle: "italic",
}

const buttonStyle: React.CSSProperties = {
  backgroundColor: "#2F4F4F",
  color: "#FFFFFF",
  padding: "14px 28px",
  borderRadius: "999px",
  textDecoration: "none",
  fontWeight: 600,
  fontSize: "15px",
  display: "inline-block",
}

const smallText: React.CSSProperties = {
  fontSize: "12px",
  lineHeight: "20px",
  color: "#94A3B8",
  margin: 0,
}
