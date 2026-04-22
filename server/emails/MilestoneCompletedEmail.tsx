import { Button, Hr, Section, Text } from "@react-email/components"

import { TerrazeaEmailLayout } from "./components/TerrazeaEmailLayout"

export interface MilestoneCompletedEmailProps {
  name: string
  projectName: string
  milestoneTitle: string
  milestoneSummary?: string | null
  projectProgressPercent?: number | null
  ctaUrl: string
  supportEmail?: string
}

export function MilestoneCompletedEmail({
  name,
  projectName,
  milestoneTitle,
  milestoneSummary,
  projectProgressPercent,
  ctaUrl,
  supportEmail = "hola@terrazea.com",
}: MilestoneCompletedEmailProps) {
  const greeting = name ? `Hola ${name},` : "Hola,"
  const preview = `¡Hito completado en ${projectName}!`
  const progress = typeof projectProgressPercent === "number" ? Math.round(projectProgressPercent) : null

  return (
    <TerrazeaEmailLayout preview={preview} title="Hito completado">
      <Text style={paragraphStyle}>{greeting}</Text>
      <Text style={paragraphStyle}>
        Tenemos una buena noticia que compartirte: hemos completado un hito en tu proyecto{" "}
        <strong>{projectName}</strong>.
      </Text>

      <Section style={milestoneBox}>
        <Text style={milestoneBadge}>✓ Hito completado</Text>
        <Text style={milestoneTitleStyle}>{milestoneTitle}</Text>
        {milestoneSummary ? <Text style={milestoneSummaryStyle}>{milestoneSummary}</Text> : null}
      </Section>

      {progress !== null ? (
        <Section style={progressBox}>
          <Text style={progressLabel}>Avance general del proyecto</Text>
          <Text style={progressValue}>{progress}%</Text>
          <div style={progressBarOuter}>
            <div style={{ ...progressBarInner, width: `${Math.min(100, Math.max(0, progress))}%` }} />
          </div>
        </Section>
      ) : null}

      <Section style={{ textAlign: "center", margin: "20px 0 24px" }}>
        <Button style={buttonStyle} href={ctaUrl}>
          Ver el avance completo
        </Button>
      </Section>

      <Text style={paragraphStyle}>
        Si quieres conocer el detalle técnico o tienes comentarios, respóndenos aquí o escríbenos a{" "}
        <a href={`mailto:${supportEmail}`}>{supportEmail}</a>.
      </Text>

      <Hr style={{ borderColor: "#F3EFE5", margin: "32px 0 16px" }} />
      <Text style={smallText}>
        Te avisamos automáticamente cada vez que cerramos un hito importante en tu proyecto.
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

const milestoneBox: React.CSSProperties = {
  backgroundColor: "#ECFDF5",
  borderRadius: "18px",
  border: "1px solid #A7F3D0",
  padding: "20px",
  margin: "8px 0 20px",
}

const milestoneBadge: React.CSSProperties = {
  fontSize: "11px",
  letterSpacing: "0.25em",
  textTransform: "uppercase",
  color: "#047857",
  margin: "0 0 6px",
  fontWeight: 600,
}

const milestoneTitleStyle: React.CSSProperties = {
  fontSize: "22px",
  fontWeight: 700,
  color: "#065F46",
  margin: "0 0 10px",
}

const milestoneSummaryStyle: React.CSSProperties = {
  fontSize: "14px",
  lineHeight: "22px",
  color: "#065F46",
  margin: 0,
}

const progressBox: React.CSSProperties = {
  backgroundColor: "#F8F7F4",
  border: "1px solid #E8E6E0",
  borderRadius: "18px",
  padding: "18px 20px",
  margin: "0 0 16px",
}

const progressLabel: React.CSSProperties = {
  fontSize: "11px",
  letterSpacing: "0.25em",
  textTransform: "uppercase",
  color: "#6B7280",
  margin: "0 0 4px",
  fontWeight: 600,
}

const progressValue: React.CSSProperties = {
  fontSize: "24px",
  fontWeight: 700,
  color: "#2F4F4F",
  margin: "0 0 10px",
}

const progressBarOuter: React.CSSProperties = {
  backgroundColor: "#E8E6E0",
  borderRadius: "999px",
  height: "8px",
  overflow: "hidden",
}

const progressBarInner: React.CSSProperties = {
  backgroundColor: "#2F4F4F",
  height: "100%",
  borderRadius: "999px",
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
