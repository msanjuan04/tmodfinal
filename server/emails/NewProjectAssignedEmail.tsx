import { Button, Hr, Section, Text } from "@react-email/components"

import { TerrazeaEmailLayout } from "./components/TerrazeaEmailLayout"

export interface NewProjectAssignedEmailProps {
  name: string
  projectName: string
  projectCode?: string | null
  projectUrl: string
  supportEmail?: string
}

/**
 * Correo que recibe un cliente YA activado cuando le asignamos un nuevo
 * proyecto. A diferencia de ClientInviteEmail, no le pedimos que active nada
 * (ya tiene contraseña) — solo le avisamos del proyecto nuevo y le damos el
 * enlace directo.
 */
export function NewProjectAssignedEmail({
  name,
  projectName,
  projectCode,
  projectUrl,
  supportEmail = "hola@terrazea.com",
}: NewProjectAssignedEmailProps) {
  const greeting = name ? `Hola ${name},` : "Hola,"
  const preview = `Tienes un nuevo proyecto en Terrazea: ${projectName}`

  return (
    <TerrazeaEmailLayout preview={preview} title="Nuevo proyecto disponible">
      <Text style={paragraphStyle}>{greeting}</Text>
      <Text style={paragraphStyle}>
        Hemos añadido un proyecto nuevo a tu cuenta Terrazea:{" "}
        <strong>{projectName}</strong>. Ya puedes seguir su avance, consultar documentos y comunicarte con el equipo
        desde tu portal.
      </Text>

      {projectCode ? (
        <Section style={codeBox}>
          <Text style={codeLabel}>Código del proyecto</Text>
          <Text style={codeValue}>{projectCode}</Text>
          <Text style={codeHelp}>Lo usarás como referencia en cualquier comunicación con Terrazea.</Text>
        </Section>
      ) : null}

      <Section style={{ textAlign: "center", margin: "24px 0" }}>
        <Button style={buttonStyle} href={projectUrl}>
          Abrir el proyecto
        </Button>
      </Section>

      <Text style={paragraphStyle}>
        Recuerda: entras con tu correo y la contraseña que ya tienes. Si olvidaste la contraseña, usa el enlace «¿Olvidaste tu contraseña?» de la pantalla de acceso.
      </Text>

      <Hr style={{ borderColor: "#F3EFE5", margin: "32px 0 16px" }} />
      <Text style={smallText}>
        ¿Alguna duda? Escríbenos a <a href={`mailto:${supportEmail}`}>{supportEmail}</a>.
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
  fontSize: "24px",
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
