import { Button, Hr, Section, Text } from "@react-email/components"

import { TerrazeaEmailLayout } from "./components/TerrazeaEmailLayout"

export interface PaymentReceiptEmailProps {
  name: string
  concept: string
  amount: string
  projectName?: string | null
  paidAtLabel?: string
  receiptUrl?: string | null
}

export function PaymentReceiptEmail({ name, concept, amount, projectName, paidAtLabel, receiptUrl }: PaymentReceiptEmailProps) {
  const preview = `Pago recibido: ${concept}`
  const greeting = name ? `Hola ${name},` : "Hola,"

  return (
    <TerrazeaEmailLayout preview={preview} title="Hemos recibido tu pago">
      <Text style={paragraphStyle}>{greeting}</Text>
      <Text style={paragraphStyle}>
        El pago {projectName ? `del proyecto ${projectName}` : ""} se ha procesado correctamente. Aquí tienes un resumen:
      </Text>
      <Section style={infoCard}>
        <Text style={infoLabel}>Concepto</Text>
        <Text style={infoValue}>{concept}</Text>
        <Text style={{ ...infoLabel, marginTop: "16px" }}>Importe</Text>
        <Text style={{ ...infoValue, fontSize: "24px" }}>{amount}</Text>
        {paidAtLabel ? (
          <>
            <Text style={{ ...infoLabel, marginTop: "16px" }}>Fecha</Text>
            <Text style={infoValue}>{paidAtLabel}</Text>
          </>
        ) : null}
      </Section>
      {receiptUrl ? (
        <Section style={{ textAlign: "center", margin: "24px 0 8px" }}>
          <Button style={buttonStyle} href={receiptUrl}>
            Descargar recibo
          </Button>
        </Section>
      ) : null}
      <Text style={paragraphStyle}>Puedes consultar el estado en la sección Pagos del portal Terrazea.</Text>
      <Hr style={{ borderColor: "#F3EFE5", margin: "32px 0 16px" }} />
      <Text style={smallText}>Gracias por confiar en nosotros. Si tienes alguna duda contáctanos cuando quieras.</Text>
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
