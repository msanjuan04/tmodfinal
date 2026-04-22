import { Button, Hr, Section, Text } from "@react-email/components"

import { TerrazeaEmailLayout } from "./components/TerrazeaEmailLayout"

export type DocumentLifecycleVariant = "replaced" | "deleted"

export interface DocumentLifecycleEmailProps {
  name: string
  variant: DocumentLifecycleVariant
  documentName: string
  documentCategory?: string | null
  projectName?: string | null
  documentUrl?: string | null
  supportEmail?: string
}

const COPY: Record<
  DocumentLifecycleVariant,
  {
    title: string
    preview: (doc: string) => string
    body: (doc: string, project: string | null) => string
    hasCta: boolean
    ctaLabel: string
    accent: "slate" | "amber"
  }
> = {
  replaced: {
    title: "Documento actualizado",
    preview: (doc) => `Actualizamos: ${doc}`,
    body: (doc, project) =>
      `Hemos subido una versión nueva de "${doc}"${project ? ` del proyecto ${project}` : ""}. La anterior ha sido reemplazada; al abrir el portal verás la última revisión.`,
    hasCta: true,
    ctaLabel: "Abrir la versión nueva",
    accent: "slate",
  },
  deleted: {
    title: "Documento retirado",
    preview: (doc) => `Hemos retirado: ${doc}`,
    body: (doc, project) =>
      `Hemos eliminado "${doc}"${project ? ` del proyecto ${project}` : ""} del portal. Si tienes una copia descargada, ya no es la referencia válida. Si necesitas recuperarla, respóndenos a este correo.`,
    hasCta: false,
    ctaLabel: "",
    accent: "amber",
  },
}

export function DocumentLifecycleEmail({
  name,
  variant,
  documentName,
  documentCategory,
  projectName,
  documentUrl,
  supportEmail = "hola@terrazea.com",
}: DocumentLifecycleEmailProps) {
  const greeting = name ? `Hola ${name},` : "Hola,"
  const copy = COPY[variant]
  const boxStyle = copy.accent === "amber" ? amberBox : slateBox

  return (
    <TerrazeaEmailLayout preview={copy.preview(documentName)} title={copy.title}>
      <Text style={paragraphStyle}>{greeting}</Text>
      <Text style={paragraphStyle}>{copy.body(documentName, projectName ?? null)}</Text>

      <Section style={boxStyle}>
        <Text style={docLabel}>{variant === "deleted" ? "Documento retirado" : "Documento actualizado"}</Text>
        <Text style={docName}>{documentName}</Text>
        {documentCategory ? <Text style={docCategory}>{documentCategory}</Text> : null}
      </Section>

      {copy.hasCta && documentUrl ? (
        <Section style={{ textAlign: "center", margin: "20px 0 24px" }}>
          <Button style={buttonStyle} href={documentUrl}>
            {copy.ctaLabel}
          </Button>
        </Section>
      ) : null}

      <Text style={paragraphStyle}>
        Si tienes dudas sobre este cambio, escríbenos a <a href={`mailto:${supportEmail}`}>{supportEmail}</a> y te lo
        explicamos.
      </Text>

      <Hr style={{ borderColor: "#F3EFE5", margin: "32px 0 16px" }} />
      <Text style={smallText}>
        Te avisamos siempre que un documento marcado como visible para ti cambia de estado.
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

const slateBox: React.CSSProperties = {
  backgroundColor: "#F8F7F4",
  border: "1px solid #E8E6E0",
  borderRadius: "18px",
  padding: "18px 20px",
  margin: "8px 0 20px",
}

const amberBox: React.CSSProperties = {
  ...slateBox,
  backgroundColor: "#FFF7ED",
  border: "1px solid #FED7AA",
}

const docLabel: React.CSSProperties = {
  fontSize: "11px",
  letterSpacing: "0.25em",
  textTransform: "uppercase",
  color: "#C6B89E",
  margin: "0 0 6px",
  fontWeight: 600,
}

const docName: React.CSSProperties = {
  fontSize: "18px",
  fontWeight: 700,
  color: "#2F4F4F",
  margin: "0 0 6px",
}

const docCategory: React.CSSProperties = {
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
