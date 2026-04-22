import { Button, Hr, Section, Text } from "@react-email/components"

import { TerrazeaEmailLayout } from "./components/TerrazeaEmailLayout"

export interface AccountActivatedEmailProps {
  name: string
  loginUrl: string
  activatedAtLabel: string
  supportEmail?: string
}

export function AccountActivatedEmail({
  name,
  loginUrl,
  activatedAtLabel,
  supportEmail = "hola@terrazea.com",
}: AccountActivatedEmailProps) {
  const greeting = name ? `Hola ${name},` : "Hola,"

  return (
    <TerrazeaEmailLayout
      preview="Tu cuenta Terrazea ya está activa."
      title="Cuenta activa"
    >
      <Text style={paragraphStyle}>{greeting}</Text>
      <Text style={paragraphStyle}>
        Tu cuenta Terrazea quedó activada el <strong>{activatedAtLabel}</strong>. A partir de ahora entrarás siempre con
        tu correo y contraseña: el código Terrazea inicial ya no es válido.
      </Text>

      <Section style={confirmBox}>
        <Text style={confirmLabel}>✓ Todo listo</Text>
        <Text style={confirmBody}>
          Guarda tu contraseña en un gestor seguro. Nadie del equipo Terrazea puede verla ni restablecerla sin tu
          permiso.
        </Text>
      </Section>

      <Section style={{ textAlign: "center", margin: "24px 0" }}>
        <Button style={buttonStyle} href={loginUrl}>
          Entrar en el portal
        </Button>
      </Section>

      <Text style={paragraphStyle}>
        Si tú no activaste esta cuenta o detectas un acceso que no reconoces, escríbenos de inmediato a{" "}
        <a href={`mailto:${supportEmail}`}>{supportEmail}</a>.
      </Text>

      <Hr style={{ borderColor: "#F3EFE5", margin: "32px 0 16px" }} />
      <Text style={smallText}>
        Este correo es una confirmación de seguridad. Si olvidas tu contraseña en el futuro podrás recuperarla con el
        enlace «¿Olvidaste tu contraseña?» en la pantalla de acceso.
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

const confirmBox: React.CSSProperties = {
  backgroundColor: "#ECFDF5",
  border: "1px solid #A7F3D0",
  borderRadius: "16px",
  padding: "14px 18px",
  margin: "8px 0 20px",
}

const confirmLabel: React.CSSProperties = {
  fontSize: "13px",
  fontWeight: 600,
  color: "#047857",
  margin: "0 0 4px",
}

const confirmBody: React.CSSProperties = {
  fontSize: "13px",
  lineHeight: "20px",
  color: "#065F46",
  margin: 0,
}

const smallText: React.CSSProperties = {
  fontSize: "12px",
  lineHeight: "20px",
  color: "#94A3B8",
  margin: 0,
}
