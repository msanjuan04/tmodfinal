import { Button, Hr, Section, Text } from "@react-email/components"

import { TerrazeaEmailLayout } from "./components/TerrazeaEmailLayout"

export interface ActivationReminderEmailProps {
  name: string
  portalUrl: string
  projectCode?: string | null
  projectName?: string | null
  supportEmail?: string
}

export function ActivationReminderEmail({
  name,
  portalUrl,
  projectCode,
  projectName,
  supportEmail = "hola@terrazea.com",
}: ActivationReminderEmailProps) {
  const greeting = name ? `Hola ${name},` : "Hola,"
  const projectLine = projectName
    ? `Tu proyecto ${projectName} te está esperando en el portal.`
    : "Tu proyecto te está esperando en el portal."

  return (
    <TerrazeaEmailLayout
      preview="Aún no has activado tu acceso a Terrazea."
      title="Aún no has activado tu cuenta"
    >
      <Text style={paragraphStyle}>{greeting}</Text>
      <Text style={paragraphStyle}>
        Hace un par de días te enviamos las instrucciones para entrar al Portal Terrazea y vemos que aún no has
        terminado de activar tu cuenta. {projectLine}
      </Text>

      {projectCode ? (
        <Section style={codeBox}>
          <Text style={codeLabel}>Tu código Terrazea</Text>
          <Text style={codeValue}>{projectCode}</Text>
          <Text style={codeHelp}>Válido una sola vez: al introducirlo crearás tu contraseña.</Text>
        </Section>
      ) : null}

      <Section style={{ textAlign: "center", margin: "24px 0" }}>
        <Button style={buttonStyle} href={portalUrl}>
          Activar mi acceso ahora
        </Button>
      </Section>

      <Text style={paragraphStyle}>
        Pasos rápidos: abrir el portal → elegir «Código de proyecto» → introducir el código de arriba → crear tu
        contraseña. En menos de un minuto estás dentro.
      </Text>

      <Hr style={{ borderColor: "#F3EFE5", margin: "32px 0 16px" }} />
      <Text style={smallText}>
        ¿Algún problema con el código o el correo? Respóndenos o escríbenos a{" "}
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

const codeBox: React.CSSProperties = {
  backgroundColor: "#F8F7F4",
  borderRadius: "18px",
  padding: "20px 20px 16px",
  border: "1px solid #E8E6E0",
  textAlign: "center",
  margin: "8px 0 24px",
}

const codeLabel: React.CSSProperties = {
  fontSize: "11px",
  letterSpacing: "0.25em",
  textTransform: "uppercase",
  color: "#C6B89E",
  margin: "0 0 6px",
  fontWeight: 600,
}

const codeValue: React.CSSProperties = {
  fontSize: "26px",
  letterSpacing: "0.2em",
  color: "#2F4F4F",
  fontWeight: 700,
  margin: "0 0 8px",
}

const codeHelp: React.CSSProperties = {
  fontSize: "12px",
  color: "#6B7280",
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
