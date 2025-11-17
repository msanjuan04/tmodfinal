import { Button, Hr, Section, Text } from "@react-email/components"

import { TerrazeaEmailLayout } from "./components/TerrazeaEmailLayout"

export interface ClientInviteEmailProps {
  name: string
  portalUrl: string
  temporaryPassword?: string
  projectCode?: string | null
  supportEmail?: string
}

export function ClientInviteEmail({ name, portalUrl, temporaryPassword, projectCode, supportEmail = "hola@terrazea.com" }: ClientInviteEmailProps) {
  const preview = "Bienvenido al portal Terrazea. Activa tu cuenta en minutos."
  const greeting = name ? `Hola ${name},` : "Hola,"

  return (
    <TerrazeaEmailLayout preview={preview} title="Bienvenido al Portal Terrazea">
      <Text style={paragraphStyle}>{greeting}</Text>
      <Text style={paragraphStyle}>
        Ya tienes acceso a Terrazea Cliente, el espacio donde podrás seguir tu proyecto, revisar documentos y comunicarte con el equipo en tiempo real.
      </Text>
      {projectCode ? (
        <Text style={highlightBox}>
          Código de proyecto: <strong>{projectCode}</strong>
        </Text>
      ) : null}
      {temporaryPassword ? (
        <Text style={highlightBox}>
          Contraseña temporal: <strong>{temporaryPassword}</strong>
        </Text>
      ) : (
        <Text style={paragraphStyle}>Solo necesitas definir tu contraseña para comenzar.</Text>
      )}
      <Section style={{ textAlign: "center", margin: "24px 0" }}>
        <Button style={buttonStyle} href={portalUrl}>
          Activar mi acceso
        </Button>
      </Section>
      <Text style={paragraphStyle}>
        El enlace expira en 48 horas por seguridad. Si necesitas ayuda escribe a <a href={`mailto:${supportEmail}`}>{supportEmail}</a>.
      </Text>
      <Hr style={{ borderColor: "#F3EFE5", margin: "32px 0 16px" }} />
      <Text style={smallText}>
        Este correo se ha enviado automáticamente tras darte de alta como cliente Terrazea. Si tú no lo solicitaste, avísanos para bloquear el acceso.
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

const highlightBox: React.CSSProperties = {
  ...paragraphStyle,
  backgroundColor: "#F8F7F4",
  borderRadius: "16px",
  padding: "12px 16px",
  border: "1px solid #E8E6E0",
  fontWeight: 600,
  color: "#2F4F4F",
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
