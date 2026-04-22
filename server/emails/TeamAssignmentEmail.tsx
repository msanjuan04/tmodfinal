import { Button, Hr, Section, Text } from "@react-email/components"

import { TerrazeaEmailLayout } from "./components/TerrazeaEmailLayout"

export interface TeamAssignmentEmailProps {
  recipientName: string
  projectName: string
  clientName?: string | null
  roleLabel: string
  startDate?: string | null
  estimatedDelivery?: string | null
  ctaUrl: string
  supportEmail?: string
}

export function TeamAssignmentEmail({
  recipientName,
  projectName,
  clientName,
  roleLabel,
  startDate,
  estimatedDelivery,
  ctaUrl,
  supportEmail = "hola@terrazea.com",
}: TeamAssignmentEmailProps) {
  const greeting = recipientName ? `Hola ${recipientName},` : "Hola,"
  const preview = `Te hemos asignado al proyecto ${projectName}`

  return (
    <TerrazeaEmailLayout preview={preview} title="Nuevo proyecto asignado">
      <Text style={paragraphStyle}>{greeting}</Text>
      <Text style={paragraphStyle}>
        Se te ha asignado un nuevo proyecto en Terrazea: <strong>{projectName}</strong>
        {clientName ? ` · cliente ${clientName}` : ""}.
      </Text>

      <Section style={metaBox}>
        <div style={metaRow}>
          <Text style={metaLabel}>Tu rol</Text>
          <Text style={metaValue}>{roleLabel}</Text>
        </div>
        {startDate ? (
          <div style={metaRow}>
            <Text style={metaLabel}>Inicio</Text>
            <Text style={metaValue}>{startDate}</Text>
          </div>
        ) : null}
        {estimatedDelivery ? (
          <div style={metaRow}>
            <Text style={metaLabel}>Entrega estimada</Text>
            <Text style={metaValue}>{estimatedDelivery}</Text>
          </div>
        ) : null}
      </Section>

      <Section style={{ textAlign: "center", margin: "20px 0 24px" }}>
        <Button style={buttonStyle} href={ctaUrl}>
          Abrir el proyecto
        </Button>
      </Section>

      <Text style={paragraphStyle}>
        Ya tienes acceso a tareas, documentos, calendario y mensajes del proyecto. Si falta algún permiso o información,
        escribe a <a href={`mailto:${supportEmail}`}>{supportEmail}</a>.
      </Text>

      <Hr style={{ borderColor: "#F3EFE5", margin: "32px 0 16px" }} />
      <Text style={smallText}>
        Recibes este correo porque formas parte del equipo Terrazea y se te ha asignado un proyecto activo.
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

const metaBox: React.CSSProperties = {
  backgroundColor: "#F8F7F4",
  border: "1px solid #E8E6E0",
  borderRadius: "18px",
  padding: "14px 18px",
  margin: "0 0 20px",
}

const metaRow: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "baseline",
  padding: "6px 0",
  borderBottom: "1px solid #F3EFE5",
}

const metaLabel: React.CSSProperties = {
  fontSize: "12px",
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: "#6B7280",
  margin: 0,
  fontWeight: 600,
}

const metaValue: React.CSSProperties = {
  fontSize: "14px",
  color: "#2F4F4F",
  margin: 0,
  fontWeight: 600,
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
