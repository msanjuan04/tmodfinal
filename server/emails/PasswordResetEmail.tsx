import { Button, Hr, Section, Text } from "@react-email/components"

import { TerrazeaEmailLayout } from "./components/TerrazeaEmailLayout"

export interface PasswordResetEmailProps {
  name: string
  resetUrl: string
  expiresAtLabel: string
  supportEmail?: string
}

export function PasswordResetEmail({
  name,
  resetUrl,
  expiresAtLabel,
  supportEmail = "hola@terrazea.com",
}: PasswordResetEmailProps) {
  const greeting = name ? `Hola ${name},` : "Hola,"

  return (
    <TerrazeaEmailLayout
      preview="Restablece tu contraseña Terrazea."
      title="Restablece tu contraseña"
    >
      <Text style={paragraphStyle}>{greeting}</Text>
      <Text style={paragraphStyle}>
        Hemos recibido una solicitud para cambiar la contraseña de tu cuenta Terrazea. Si has sido tú, pulsa el botón y
        crea una contraseña nueva.
      </Text>

      <Section style={{ textAlign: "center", margin: "24px 0" }}>
        <Button style={buttonStyle} href={resetUrl}>
          Crear nueva contraseña
        </Button>
      </Section>

      <Section style={noticeBox}>
        <Text style={noticeTitle}>⏱ Enlace temporal</Text>
        <Text style={noticeBody}>
          Caduca el <strong>{expiresAtLabel}</strong>. Si expira, solicita otro desde la pantalla de acceso.
        </Text>
      </Section>

      <Text style={paragraphStyle}>
        Si no fuiste tú, ignora este correo: tu contraseña actual seguirá funcionando y nadie podrá acceder sin el
        enlace.
      </Text>

      <Hr style={{ borderColor: "#F3EFE5", margin: "32px 0 16px" }} />
      <Text style={smallText}>
        ¿Problemas? Escribe a <a href={`mailto:${supportEmail}`}>{supportEmail}</a> y te ayudamos.
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

const noticeBox: React.CSSProperties = {
  backgroundColor: "#FFF7ED",
  border: "1px solid #FED7AA",
  borderRadius: "16px",
  padding: "14px 18px",
  margin: "8px 0 20px",
}

const noticeTitle: React.CSSProperties = {
  fontSize: "13px",
  fontWeight: 600,
  color: "#9A3412",
  margin: "0 0 4px",
}

const noticeBody: React.CSSProperties = {
  fontSize: "13px",
  lineHeight: "20px",
  color: "#7C2D12",
  margin: 0,
}

const smallText: React.CSSProperties = {
  fontSize: "12px",
  lineHeight: "20px",
  color: "#94A3B8",
  margin: 0,
}
