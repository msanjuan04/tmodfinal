import { Button, Hr, Section, Text } from "@react-email/components"

import { TerrazeaEmailLayout } from "./components/TerrazeaEmailLayout"

// Mismos valores que AdminProjectStatus, duplicados aquí para mantener el
// paquete de emails autocontenido (sin depender del cliente front).
export type ProjectStatusKey =
  | "inicial"
  | "diseno"
  | "presupuesto"
  | "planificacion"
  | "obra_ejecucion"
  | "cierre"
  | "archivado"
  | "cancelado"

export interface ProjectStatusChangeEmailProps {
  name: string
  projectName: string
  status: ProjectStatusKey
  statusLabel: string
  description: string
  nextSteps: string[]
  ctaUrl: string
  supportEmail?: string
}

export function ProjectStatusChangeEmail({
  name,
  projectName,
  statusLabel,
  description,
  nextSteps,
  ctaUrl,
  supportEmail = "hola@terrazea.com",
}: ProjectStatusChangeEmailProps) {
  const greeting = name ? `Hola ${name},` : "Hola,"
  const preview = `${projectName} ha pasado a ${statusLabel.toLowerCase()}`

  return (
    <TerrazeaEmailLayout preview={preview} title="Tu proyecto avanza">
      <Text style={paragraphStyle}>{greeting}</Text>
      <Text style={paragraphStyle}>
        Queríamos contarte que <strong>{projectName}</strong> entra ahora en la fase de{" "}
        <strong>{statusLabel.toLowerCase()}</strong>.
      </Text>

      <Section style={phaseBox}>
        <Text style={phaseLabel}>Fase actual</Text>
        <Text style={phaseValue}>{statusLabel}</Text>
        <Text style={phaseDescription}>{description}</Text>
      </Section>

      {nextSteps.length > 0 ? (
        <>
          <Text style={sectionTitle}>Qué significa en el día a día</Text>
          <Section style={listBox}>
            {nextSteps.map((step, index) => (
              <Text key={index} style={listItem}>
                <strong>·</strong> {step}
              </Text>
            ))}
          </Section>
        </>
      ) : null}

      <Section style={{ textAlign: "center", margin: "24px 0" }}>
        <Button style={buttonStyle} href={ctaUrl}>
          Ver el proyecto
        </Button>
      </Section>

      <Text style={paragraphStyle}>
        Cualquier duda o aportación, respóndenos por aquí o escríbenos a{" "}
        <a href={`mailto:${supportEmail}`}>{supportEmail}</a>. Nos encanta oír feedback en cada fase.
      </Text>

      <Hr style={{ borderColor: "#F3EFE5", margin: "32px 0 16px" }} />
      <Text style={smallText}>
        Te avisamos automáticamente cada vez que tu proyecto cambia de fase para que tengas visibilidad en tiempo real.
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

const phaseBox: React.CSSProperties = {
  backgroundColor: "#F8F7F4",
  borderRadius: "18px",
  border: "1px solid #E8E6E0",
  padding: "20px",
  margin: "8px 0 24px",
}

const phaseLabel: React.CSSProperties = {
  fontSize: "11px",
  letterSpacing: "0.25em",
  textTransform: "uppercase",
  color: "#C6B89E",
  margin: "0 0 6px",
  fontWeight: 600,
}

const phaseValue: React.CSSProperties = {
  fontSize: "22px",
  fontWeight: 700,
  color: "#2F4F4F",
  margin: "0 0 10px",
}

const phaseDescription: React.CSSProperties = {
  fontSize: "14px",
  lineHeight: "22px",
  color: "#4B5563",
  margin: 0,
}

const sectionTitle: React.CSSProperties = {
  fontSize: "13px",
  textTransform: "uppercase",
  letterSpacing: "0.2em",
  color: "#2F4F4F",
  fontWeight: 600,
  margin: "8px 0 12px",
}

const listBox: React.CSSProperties = {
  backgroundColor: "#FFFFFF",
  border: "1px solid #E8E6E0",
  borderRadius: "18px",
  padding: "14px 18px",
  margin: "0 0 20px",
}

const listItem: React.CSSProperties = {
  fontSize: "14px",
  lineHeight: "22px",
  color: "#4B5563",
  margin: "0 0 8px",
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
