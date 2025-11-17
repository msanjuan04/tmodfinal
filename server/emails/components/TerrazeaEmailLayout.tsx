import type { ReactNode } from "react"
import { Body, Container, Head, Hr, Html, Preview, Section, Text } from "@react-email/components"

const bodyStyle: React.CSSProperties = {
  margin: 0,
  backgroundColor: "#F4F1EA",
  fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  color: "#2F4F4F",
}

const containerStyle: React.CSSProperties = {
  margin: "0 auto",
  padding: "24px 0",
  width: "100%",
  maxWidth: "640px",
}

const cardStyle: React.CSSProperties = {
  backgroundColor: "#FFFFFF",
  borderRadius: "28px",
  border: "1px solid #E8E6E0",
  boxShadow: "0 20px 40px rgba(15, 23, 42, 0.08)",
  padding: "32px",
}

const headerStyle: React.CSSProperties = {
  textAlign: "center",
  marginBottom: "24px",
}

const footerStyle: React.CSSProperties = {
  marginTop: "32px",
  textAlign: "center",
  fontSize: "12px",
  color: "#6B7280",
  lineHeight: "20px",
}

interface TerrazeaEmailLayoutProps {
  preview?: string
  title?: string
  children: ReactNode
}

export function TerrazeaEmailLayout({ preview, title, children }: TerrazeaEmailLayoutProps) {
  return (
    <Html lang="es">
      <Head />
      {preview ? <Preview>{preview}</Preview> : null}
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          <Section style={headerStyle}>
            <Text style={{ fontSize: "20px", fontWeight: 600, margin: 0 }}>Terrazea</Text>
            <Text style={{ fontSize: "13px", textTransform: "uppercase", letterSpacing: "0.4em", color: "#C6B89E", margin: "8px 0 0" }}>
              Zona Cliente
            </Text>
          </Section>
          <Section style={cardStyle}>
            {title ? (
              <>
                <Text style={{ fontSize: "22px", fontWeight: 600, margin: "0 0 12px" }}>{title}</Text>
                <Hr style={{ borderColor: "#F3EFE5", margin: "0 0 24px" }} />
              </>
            ) : null}
            {children}
          </Section>
          <Section style={footerStyle}>
            <Text style={{ margin: 0 }}>© {new Date().getFullYear()} Terrazea. Arquitectura y construcción consciente.</Text>
            <Text style={{ margin: "4px 0 0" }}>hola@terrazea.com · +34 600 000 000</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}
