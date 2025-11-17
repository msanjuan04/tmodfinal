import { Button, Hr, Section, Text } from "@react-email/components"

import { TerrazeaEmailLayout } from "./components/TerrazeaEmailLayout"

export interface EventReminderEmailProps {
  name: string
  eventTitle: string
  startsAtLabel: string
  projectName?: string | null
  location?: string | null
  ctaUrl: string
}

export function EventReminderEmail({ name, eventTitle, startsAtLabel, projectName, location, ctaUrl }: EventReminderEmailProps) {
  const preview = `Recordatorio: ${eventTitle}`
  const greeting = name ? `Hola ${name},` : "Hola,"

  return (
    <TerrazeaEmailLayout preview={preview} title="Recordatorio de tu proyecto">
      <Text style={paragraphStyle}>{greeting}</Text>
      <Text style={paragraphStyle}>
        Te recordamos el próximo evento{projectName ? ` del proyecto ${projectName}` : ""}. Aquí tienes los detalles:
      </Text>
      <Section style={infoCard}>
        <Text style={infoLabel}>Actividad</Text>
        <Text style={infoValue}>{eventTitle}</Text>
        <Text style={{ ...infoLabel, marginTop: "16px" }}>Fecha</Text>
        <Text style={infoValue}>{startsAtLabel}</Text>
        {location ? (
          <>
            <Text style={{ ...infoLabel, marginTop: "16px" }}>Ubicación</Text>
            <Text style={infoValue}>{location}</Text>
          </>
        ) : null}
      </Section>
      <Section style={{ textAlign: "center", margin: "24px 0 8px" }}>
        <Button style={buttonStyle} href={ctaUrl}>
          Ver en Terrazea
        </Button>
      </Section>
      <Text style={paragraphStyle}>Si necesitas ajustar la fecha responde directamente desde el portal.</Text>
      <Hr style={{ borderColor: "#F3EFE5", margin: "32px 0 16px" }} />
      <Text style={smallText}>Este recordatorio se envía automáticamente 24 horas antes.</Text>
    </TerrazeaEmailLayout>
  )
}

const paragraphStyle: React.CSSProperties = {
  fontSize: "15px",
  lineHeight: "24px",
  margin: "0 0 16px",
  color: "#4B5563",
}

const infoCard: React.CSSProperties = {
  backgroundColor: "#F8F7F4",
  borderRadius: "24px",
  border: "1px solid #E8E6E0",
  padding: "20px 24px",
}

const infoLabel: React.CSSProperties = {
  textTransform: "uppercase",
  letterSpacing: "0.3em",
  fontSize: "11px",
  color: "#C6B89E",
  margin: 0,
}

const infoValue: React.CSSProperties = {
  fontSize: "16px",
  lineHeight: "24px",
  fontWeight: 600,
  color: "#2F4F4F",
  margin: "4px 0 0",
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
