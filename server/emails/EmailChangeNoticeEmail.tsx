import { Hr, Section, Text } from "@react-email/components"

import { TerrazeaEmailLayout } from "./components/TerrazeaEmailLayout"

export interface EmailChangeNoticeEmailProps {
  name: string
  newEmail: string
  changedAtLabel: string
  supportEmail?: string
}

export function EmailChangeNoticeEmail({
  name,
  newEmail,
  changedAtLabel,
  supportEmail = "hola@terrazea.com",
}: EmailChangeNoticeEmailProps) {
  const greeting = name ? `Hola ${name},` : "Hola,"

  return (
    <TerrazeaEmailLayout
      preview="Hemos cambiado el correo asociado a tu cuenta Terrazea."
      title="Cambio de correo en tu cuenta"
    >
      <Text style={paragraphStyle}>{greeting}</Text>
      <Text style={paragraphStyle}>
        Te avisamos de un cambio de seguridad: el correo asociado a tu cuenta Terrazea ha sido modificado.
      </Text>

      <Section style={alertBox}>
        <Text style={alertLabel}>Nuevo correo de acceso</Text>
        <Text style={alertValue}>{newEmail}</Text>
        <Text style={alertHelp}>Cambio realizado el {changedAtLabel}</Text>
      </Section>

      <Text style={paragraphStyle}>
        A partir de ahora deberás iniciar sesión con el correo nuevo. Tu contraseña y el resto de datos de la cuenta se
        mantienen sin cambios.
      </Text>

      <Section style={warningBox}>
        <Text style={warningTitle}>⚠️ ¿No fuiste tú?</Text>
        <Text style={warningBody}>
          Escríbenos inmediatamente a <a href={`mailto:${supportEmail}`}>{supportEmail}</a> o responde a este correo.
          Bloquearemos el acceso y revisaremos la actividad de tu cuenta.
        </Text>
      </Section>

      <Hr style={{ borderColor: "#F3EFE5", margin: "32px 0 16px" }} />
      <Text style={smallText}>
        Enviamos este aviso al correo anterior para que puedas detectar cualquier cambio no autorizado. Por seguridad,
        guardamos registro de quién y cuándo ejecutó el cambio.
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

const alertBox: React.CSSProperties = {
  backgroundColor: "#F8F7F4",
  border: "1px solid #E8E6E0",
  borderRadius: "18px",
  padding: "18px 20px",
  margin: "8px 0 20px",
  textAlign: "center",
}

const alertLabel: React.CSSProperties = {
  fontSize: "11px",
  letterSpacing: "0.25em",
  textTransform: "uppercase",
  color: "#C6B89E",
  margin: "0 0 6px",
  fontWeight: 600,
}

const alertValue: React.CSSProperties = {
  fontSize: "20px",
  fontWeight: 700,
  color: "#2F4F4F",
  margin: "0 0 6px",
}

const alertHelp: React.CSSProperties = {
  fontSize: "12px",
  color: "#6B7280",
  margin: 0,
}

const warningBox: React.CSSProperties = {
  backgroundColor: "#FEF2F2",
  border: "1px solid #FCA5A5",
  borderRadius: "18px",
  padding: "16px 18px",
  margin: "0 0 20px",
}

const warningTitle: React.CSSProperties = {
  fontSize: "13px",
  fontWeight: 600,
  color: "#B91C1C",
  margin: "0 0 6px",
}

const warningBody: React.CSSProperties = {
  fontSize: "13px",
  lineHeight: "20px",
  color: "#7F1D1D",
  margin: 0,
}

const smallText: React.CSSProperties = {
  fontSize: "12px",
  lineHeight: "20px",
  color: "#94A3B8",
  margin: 0,
}
