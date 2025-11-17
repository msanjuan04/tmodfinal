import { Button, Hr, Section, Text } from "@react-email/components"

import { TerrazeaEmailLayout } from "./components/TerrazeaEmailLayout"

export interface PaymentRequestEmailProps {
  name: string
  concept: string
  amount: string
  dueDateLabel?: string | null
  paymentLink: string
  projectName?: string | null
}

export function PaymentRequestEmail({ name, projectName, concept, amount, dueDateLabel, paymentLink }: PaymentRequestEmailProps) {
  const preview = `Nuevo pago pendiente: ${concept}`
  const greeting = name ? `Hola ${name},` : "Hola,"

  return (
    <TerrazeaEmailLayout preview={preview} title="Tienes un pago disponible">
      <Text style={paragraphStyle}>{greeting}</Text>
      <Text style={paragraphStyle}>
        Hemos publicado un nuevo pago en tu portal Terrazea{projectName ? ` para el proyecto ${projectName}` : ""}. Puedes revisarlo y pagarlo online cuando quieras.
      </Text>
      <Section style={infoCard}>
        <Text style={infoLabel}>Concepto</Text>
        <Text style={infoValue}>{concept}</Text>
        <Text style={{ ...infoLabel, marginTop: "16px" }}>Importe</Text>
        <Text style={{ ...infoValue, fontSize: "24px" }}>{amount}</Text>
        {dueDateLabel ? (
          <>
            <Text style={{ ...infoLabel, marginTop: "16px" }}>Vencimiento</Text>
            <Text style={infoValue}>{dueDateLabel}</Text>
          </>
        ) : null}
      </Section>
      <Section style={{ textAlign: "center", margin: "24px 0 8px" }}>
        <Button style={buttonStyle} href={paymentLink}>
          Revisar y pagar
        </Button>
      </Section>
      <Text style={paragraphStyle}>También encontrarás este pago en la sección Pagos del portal, junto con el PDF adjunto y la actualización de estado.</Text>
      <Hr style={{ borderColor: "#F3EFE5", margin: "32px 0 16px" }} />
      <Text style={smallText}>Este mensaje es automático. Para cualquier consulta escribe a hola@terrazea.com.</Text>
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
