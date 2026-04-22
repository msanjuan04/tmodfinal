import { Button, Hr, Section, Text } from "@react-email/components"

import { TerrazeaEmailLayout } from "./components/TerrazeaEmailLayout"

export interface ProjectFeedbackEmailProps {
  name: string
  projectName: string
  replyToEmail: string
  reviewUrl?: string | null
  supportEmail?: string
}

export function ProjectFeedbackEmail({
  name,
  projectName,
  replyToEmail,
  reviewUrl,
  supportEmail = "hola@terrazea.com",
}: ProjectFeedbackEmailProps) {
  const greeting = name ? `Hola ${name},` : "Hola,"
  const preview = `¿Nos cuentas qué te ha parecido ${projectName}?`
  const mailtoUrl = `mailto:${replyToEmail}?subject=${encodeURIComponent(`Feedback sobre ${projectName}`)}`

  return (
    <TerrazeaEmailLayout preview={preview} title="¿Cómo ha ido la experiencia?">
      <Text style={paragraphStyle}>{greeting}</Text>
      <Text style={paragraphStyle}>
        Han pasado unos días desde que cerramos <strong>{projectName}</strong> y queríamos preguntarte cómo te sientes
        con el resultado. Tu feedback nos ayuda a mejorar y, si nos lo permites, a compartir experiencias reales con
        otros clientes.
      </Text>

      <Section style={sectionTitle}>Tres cosas en las que nos encantaría oírte</Section>

      <Section style={promptsBox}>
        <Text style={promptItem}>
          <strong>1.</strong> ¿Qué ha funcionado especialmente bien durante el proyecto?
        </Text>
        <Text style={promptItem}>
          <strong>2.</strong> ¿Hay algo que pulirías o harías de otra forma si volvieras a empezar?
        </Text>
        <Text style={promptItem}>
          <strong>3.</strong> Del 1 al 10, ¿cuánto recomendarías Terrazea a alguien cercano?
        </Text>
      </Section>

      <Section style={{ textAlign: "center", margin: "20px 0 18px" }}>
        <Button style={primaryButton} href={mailtoUrl}>
          Responder por correo
        </Button>
      </Section>

      {reviewUrl ? (
        <>
          <Text style={paragraphStyle}>
            Y si tienes 1 minuto, una reseña pública hace mucho por proyectos como el tuyo:
          </Text>
          <Section style={{ textAlign: "center", margin: "0 0 20px" }}>
            <Button style={secondaryButton} href={reviewUrl}>
              Dejar una reseña
            </Button>
          </Section>
        </>
      ) : null}

      <Text style={paragraphStyle}>
        Gracias por confiar en nosotros para diseñar este espacio. Seguimos a tu disposición para cualquier
        mantenimiento o proyecto futuro — escribe a <a href={`mailto:${supportEmail}`}>{supportEmail}</a> cuando lo
        necesites.
      </Text>

      <Hr style={{ borderColor: "#F3EFE5", margin: "32px 0 16px" }} />
      <Text style={smallText}>
        Este correo es una invitación. Responder es totalmente opcional y nunca te escribiremos más de una vez sobre el
        mismo proyecto.
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

const sectionTitle: React.CSSProperties = {
  fontSize: "13px",
  textTransform: "uppercase",
  letterSpacing: "0.2em",
  color: "#2F4F4F",
  fontWeight: 600,
  margin: "8px 0 12px",
}

const promptsBox: React.CSSProperties = {
  backgroundColor: "#F8F7F4",
  border: "1px solid #E8E6E0",
  borderRadius: "18px",
  padding: "18px 20px",
  margin: "0 0 20px",
}

const promptItem: React.CSSProperties = {
  fontSize: "14px",
  lineHeight: "22px",
  color: "#4B5563",
  margin: "0 0 10px",
}

const primaryButton: React.CSSProperties = {
  backgroundColor: "#2F4F4F",
  color: "#FFFFFF",
  padding: "14px 28px",
  borderRadius: "999px",
  textDecoration: "none",
  fontWeight: 600,
  fontSize: "15px",
  display: "inline-block",
}

const secondaryButton: React.CSSProperties = {
  backgroundColor: "#FFFFFF",
  color: "#2F4F4F",
  padding: "12px 24px",
  borderRadius: "999px",
  textDecoration: "none",
  fontWeight: 600,
  fontSize: "14px",
  display: "inline-block",
  border: "1px solid #2F4F4F",
}

const smallText: React.CSSProperties = {
  fontSize: "12px",
  lineHeight: "20px",
  color: "#94A3B8",
  margin: 0,
}
