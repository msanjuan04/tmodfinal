import { Button, Hr, Section, Text } from "@react-email/components"

import { TerrazeaEmailLayout } from "./components/TerrazeaEmailLayout"

export interface DocumentSharedEmailProps {
  name: string
  documentName: string
  documentCategory?: string | null
  projectName?: string | null
  documentUrl: string
}

export function DocumentSharedEmail({ name, documentName, documentCategory, projectName, documentUrl }: DocumentSharedEmailProps) {
  const preview = `Nuevo documento disponible: ${documentName}`
  const greeting = name ? `Hola ${name},` : "Hola,"

  return (
    <TerrazeaEmailLayout preview={preview} title="Nuevo documento en tu carpeta">
      <Text style={paragraphStyle}>{greeting}</Text>
      <Text style={paragraphStyle}>
        Hemos compartido un nuevo documento{projectName ? ` del proyecto ${projectName}` : ""} dentro de Terrazea Cliente.
      </Text>
      <Section style={infoCard}>
        <Text style={infoLabel}>Documento</Text>
        <Text style={infoValue}>{documentName}</Text>
        {documentCategory ? (
          <>
            <Text style={{ ...infoLabel, marginTop: "16px" }}>Categoría</Text>
            <Text style={infoValue}>{documentCategory}</Text>
          </>
        ) : null}
      </Section>
      <Section style={{ textAlign: "center", margin: "24px 0 8px" }}>
        <Button style={buttonStyle} href={documentUrl}>
          Abrir documento
        </Button>
      </Section>
      <Text style={paragraphStyle}>También puedes acceder desde la pestaña Documentos del portal, donde verás el histórico completo.</Text>
      <Hr style={{ borderColor: "#F3EFE5", margin: "32px 0 16px" }} />
      <Text style={smallText}>Este correo se envía cuando hay nuevos archivos disponibles para ti.</Text>
    </TerrazeaEmailLayout>
  )
}

const paragraphStyle: React.CSSProperties = {
  fontSize: "15px",
  lineHeight: "24px",
  margin: "0 0 16px",
  color: "#4B5563",
}

const infoCard: React.CSSProperties = {
  backgroundColor: "#F8F7F4",
  borderRadius: "24px",
  border: "1px solid #E8E6E0",
  padding: "20px 24px",
}

const infoLabel: React.CSSProperties = {
  textTransform: "uppercase",
  letterSpacing: "0.3em",
  fontSize: "11px",
  color: "#C6B89E",
  margin: 0,
}

const infoValue: React.CSSProperties = {
  fontSize: "16px",
  lineHeight: "24px",
  fontWeight: 600,
  color: "#2F4F4F",
  margin: "4px 0 0",
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
