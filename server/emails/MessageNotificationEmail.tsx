import { Button, Hr, Section, Text } from "@react-email/components"

import { TerrazeaEmailLayout } from "./components/TerrazeaEmailLayout"

export interface MessageNotificationEmailProps {
  recipientName: string
  senderName: string
  projectName?: string | null
  messageSnippet: string
  ctaUrl: string
  audience: "client" | "team"
}

export function MessageNotificationEmail({ recipientName, senderName, projectName, messageSnippet, ctaUrl, audience }: MessageNotificationEmailProps) {
  const preview = `Nuevo mensaje de ${senderName}`
  const title = audience === "client" ? "Tienes novedades de Terrazea" : "Nuevo mensaje del cliente"
  const greeting = recipientName ? `Hola ${recipientName},` : "Hola,"

  return (
    <TerrazeaEmailLayout preview={preview} title={title}>
      <Text style={paragraphStyle}>{greeting}</Text>
      <Text style={paragraphStyle}>
        {audience === "client" ? "El equipo Terrazea" : "Tu cliente"} ha escrito un mensaje{projectName ? ` en el proyecto ${projectName}` : ""}.
      </Text>
      <Section style={messageBox}>
        <Text style={messageLabel}>Mensaje de {senderName}</Text>
        <Text style={messageContent}>"{messageSnippet}"</Text>
      </Section>
      <Section style={{ textAlign: "center", margin: "24px 0 8px" }}>
        <Button style={buttonStyle} href={ctaUrl}>
          Abrir conversación
        </Button>
      </Section>
      <Text style={paragraphStyle}>Responder desde el portal ayuda a mantener todas las decisiones documentadas en un solo lugar.</Text>
      <Hr style={{ borderColor: "#F3EFE5", margin: "32px 0 16px" }} />
      <Text style={smallText}>No respondas a este correo; inicia sesión en Terrazea Cliente.</Text>
    </TerrazeaEmailLayout>
  )
}

const paragraphStyle: React.CSSProperties = {
  fontSize: "15px",
  lineHeight: "24px",
  margin: "0 0 16px",
  color: "#4B5563",
}

const messageBox: React.CSSProperties = {
  backgroundColor: "#FFFFFF",
  borderRadius: "20px",
  border: "1px solid #E8E6E0",
  padding: "16px 20px",
  boxShadow: "inset 0 0 0 1px rgba(47,79,79,0.05)",
}

const messageLabel: React.CSSProperties = {
  fontSize: "12px",
  textTransform: "uppercase",
  letterSpacing: "0.2em",
  color: "#C6B89E",
  margin: "0 0 8px",
}

const messageContent: React.CSSProperties = {
  fontSize: "15px",
  lineHeight: "24px",
  color: "#2F4F4F",
  margin: 0,
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
