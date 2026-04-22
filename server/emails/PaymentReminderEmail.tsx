import { Button, Hr, Section, Text } from "@react-email/components"

import { TerrazeaEmailLayout } from "./components/TerrazeaEmailLayout"

export type PaymentReminderVariant = "upcoming" | "overdue"

export interface PaymentReminderEmailProps {
  name: string
  variant: PaymentReminderVariant
  concept: string
  amountLabel: string
  dueDateLabel: string | null
  daysLabel: string
  projectName?: string | null
  paymentLink: string
  supportEmail?: string
}

export function PaymentReminderEmail({
  name,
  variant,
  concept,
  amountLabel,
  dueDateLabel,
  daysLabel,
  projectName,
  paymentLink,
  supportEmail = "hola@terrazea.com",
}: PaymentReminderEmailProps) {
  const greeting = name ? `Hola ${name},` : "Hola,"
  const isOverdue = variant === "overdue"
  const title = isOverdue ? "Tienes un pago pendiente" : "Recordatorio: pago próximo a vencer"
  const preview = isOverdue
    ? `Pago pendiente · ${concept}`
    : `${concept} vence en ${daysLabel}`

  return (
    <TerrazeaEmailLayout preview={preview} title={title}>
      <Text style={paragraphStyle}>{greeting}</Text>
      <Text style={paragraphStyle}>
        {isOverdue
          ? `El pago de "${concept}" tenía como fecha límite ${dueDateLabel ?? "una fecha ya pasada"} y aún no nos consta liquidado.`
          : `Te recordamos que el pago de "${concept}" vence ${daysLabel}${dueDateLabel ? ` (${dueDateLabel})` : ""}.`}
        {projectName ? ` Corresponde al proyecto ${projectName}.` : ""}
      </Text>

      <Section style={isOverdue ? amountBoxOverdue : amountBoxUpcoming}>
        <Text style={amountLabelStyle}>{isOverdue ? "Importe pendiente" : "Importe"}</Text>
        <Text style={amountValueStyle}>{amountLabel}</Text>
        {dueDateLabel ? (
          <Text style={amountHelpStyle}>
            {isOverdue ? `Fecha límite: ${dueDateLabel}` : `Vence: ${dueDateLabel}`}
          </Text>
        ) : null}
      </Section>

      <Section style={{ textAlign: "center", margin: "20px 0 24px" }}>
        <Button style={buttonStyle} href={paymentLink}>
          {isOverdue ? "Completar pago ahora" : "Ver y pagar"}
        </Button>
      </Section>

      <Text style={paragraphStyle}>
        {isOverdue
          ? "Si ya lo has pagado por otro canal, avísanos respondiendo a este correo para actualizar nuestro registro."
          : "Puedes pagar hoy mismo o cuando quieras antes de la fecha indicada. El enlace está operativo las 24 horas."}
      </Text>

      <Hr style={{ borderColor: "#F3EFE5", margin: "32px 0 16px" }} />
      <Text style={smallText}>
        ¿Dudas sobre este pago? Escríbenos a <a href={`mailto:${supportEmail}`}>{supportEmail}</a> y lo revisamos
        contigo.
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

const amountBoxUpcoming: React.CSSProperties = {
  backgroundColor: "#F8F7F4",
  border: "1px solid #E8E6E0",
  borderRadius: "18px",
  padding: "20px",
  textAlign: "center",
  margin: "8px 0 4px",
}

const amountBoxOverdue: React.CSSProperties = {
  ...amountBoxUpcoming,
  backgroundColor: "#FEF2F2",
  border: "1px solid #FCA5A5",
}

const amountLabelStyle: React.CSSProperties = {
  fontSize: "11px",
  letterSpacing: "0.25em",
  textTransform: "uppercase",
  color: "#6B7280",
  margin: "0 0 6px",
  fontWeight: 600,
}

const amountValueStyle: React.CSSProperties = {
  fontSize: "28px",
  fontWeight: 700,
  color: "#2F4F4F",
  margin: "0 0 6px",
}

const amountHelpStyle: React.CSSProperties = {
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
