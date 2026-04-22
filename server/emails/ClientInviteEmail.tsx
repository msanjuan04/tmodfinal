import { Button, Hr, Section, Text } from "@react-email/components"

import { TerrazeaEmailLayout } from "./components/TerrazeaEmailLayout"

export interface ClientInviteEmailProps {
  name: string
  portalUrl: string
  projectCode?: string | null
  projectName?: string | null
  supportEmail?: string
}

export function ClientInviteEmail({
  name,
  portalUrl,
  projectCode,
  projectName,
  supportEmail = "hola@terrazea.com",
}: ClientInviteEmailProps) {
  const hasProject = Boolean(projectName && projectName.trim().length > 0)
  const preview = hasProject
    ? `Tu proyecto ${projectName} ya está en Terrazea. Activa tu acceso en 3 pasos.`
    : "Bienvenido al portal Terrazea. Activa tu acceso en 3 pasos."
  const greeting = name ? `Hola ${name},` : "Hola,"

  return (
    <TerrazeaEmailLayout preview={preview} title="Bienvenido al Portal Terrazea">
      <Text style={paragraphStyle}>{greeting}</Text>
      {hasProject ? (
        <Text style={paragraphStyle}>
          Hemos dado de alta tu proyecto <strong>{projectName}</strong> en Terrazea. A partir de ahora podrás seguir su
          avance, consultar documentos y comunicarte con el equipo desde el portal cliente.
        </Text>
      ) : (
        <Text style={paragraphStyle}>
          Te damos la bienvenida a <strong>Terrazea Cliente</strong>, el espacio privado donde podrás seguir tu
          proyecto, revisar la documentación y comunicarte con el equipo en tiempo real.
        </Text>
      )}

      {projectCode ? (
        <Section style={codeBox}>
          <Text style={codeLabel}>Tu código Terrazea</Text>
          <Text style={codeValue}>{projectCode}</Text>
          <Text style={codeHelp}>Te pedirán este código la primera vez que entres.</Text>
        </Section>
      ) : null}

      <Text style={sectionTitle}>Cómo activar tu cuenta</Text>

      <Section style={stepsBox}>
        <Text style={stepItem}>
          <strong>1.</strong> Abre el Portal Terrazea y elige la opción <strong>“Código de proyecto”</strong> en la
          pantalla de acceso.
        </Text>
        <Text style={stepItem}>
          <strong>2.</strong> Introduce el código de arriba y crea tu <strong>contraseña personal</strong>. Solo tú la
          conocerás: ni siquiera nosotros.
        </Text>
        <Text style={stepItem}>
          <strong>3.</strong> A partir de ese momento entrarás siempre con tu <strong>correo y contraseña</strong>. El
          código dejará de ser válido.
        </Text>
      </Section>

      <Section style={{ textAlign: "center", margin: "24px 0" }}>
        <Button style={buttonStyle} href={portalUrl}>
          Activar mi acceso
        </Button>
      </Section>

      <Text style={paragraphStyle}>
        Si necesitas ayuda en cualquier paso escribe a <a href={`mailto:${supportEmail}`}>{supportEmail}</a> y te
        acompañamos.
      </Text>
      <Hr style={{ borderColor: "#F3EFE5", margin: "32px 0 16px" }} />
      <Text style={smallText}>
        Este correo se ha enviado automáticamente al abrirse tu proyecto en Terrazea. Si tú no lo esperabas, avísanos y
        bloquearemos el acceso.
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

const sectionTitle: React.CSSProperties = {
  fontSize: "13px",
  textTransform: "uppercase",
  letterSpacing: "0.2em",
  color: "#2F4F4F",
  fontWeight: 600,
  margin: "8px 0 12px",
}

const stepsBox: React.CSSProperties = {
  backgroundColor: "#FFFFFF",
  borderRadius: "18px",
  border: "1px solid #E8E6E0",
  padding: "18px 20px",
  margin: "0 0 20px",
}

const stepItem: React.CSSProperties = {
  fontSize: "14px",
  lineHeight: "22px",
  color: "#4B5563",
  margin: "0 0 10px",
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
