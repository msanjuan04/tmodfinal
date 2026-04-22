import { Hr, Section, Text } from "@react-email/components"

import { TerrazeaEmailLayout } from "./components/TerrazeaEmailLayout"

export type PaymentStatusVariant = "failed" | "refunded" | "canceled"

export interface PaymentStatusEmailProps {
  name: string
  variant: PaymentStatusVariant
  concept: string
  amountLabel: string
  projectName?: string | null
  reason?: string | null
  supportEmail?: string
}

const COPY: Record<
  PaymentStatusVariant,
  { title: string; preview: string; body: (concept: string, projectName: string | null) => string; accent: "red" | "amber" | "slate" }
> = {
  failed: {
    title: "No pudimos procesar tu pago",
    preview: "Pago no completado en Terrazea",
    body: (concept, projectName) =>
      `No hemos podido cobrar el pago correspondiente a "${concept}"${projectName ? ` del proyecto ${projectName}` : ""}. Suele deberse a un error del banco o datos de la tarjeta.`,
    accent: "red",
  },
  refunded: {
    title: "Hemos emitido tu reembolso",
    preview: "Reembolso Terrazea",
    body: (concept, projectName) =>
      `Hemos procesado la devolución del pago de "${concept}"${projectName ? ` del proyecto ${projectName}` : ""}. Según tu banco puede tardar entre 3 y 10 días laborables en reflejarse en tu cuenta.`,
    accent: "slate",
  },
  canceled: {
    title: "Pago cancelado",
    preview: "Pago cancelado en Terrazea",
    body: (concept, projectName) =>
      `Hemos cancelado el pago pendiente de "${concept}"${projectName ? ` del proyecto ${projectName}` : ""}. Ya no aparece como pendiente en tu portal.`,
    accent: "amber",
  },
}

export function PaymentStatusEmail({
  name,
  variant,
  concept,
  amountLabel,
  projectName,
  reason,
  supportEmail = "hola@terrazea.com",
}: PaymentStatusEmailProps) {
  const greeting = name ? `Hola ${name},` : "Hola,"
  const copy = COPY[variant]
  const boxStyle = copy.accent === "red" ? accentRed : copy.accent === "amber" ? accentAmber : accentSlate

  return (
    <TerrazeaEmailLayout preview={copy.preview} title={copy.title}>
      <Text style={paragraphStyle}>{greeting}</Text>
      <Text style={paragraphStyle}>{copy.body(concept, projectName ?? null)}</Text>

      <Section style={boxStyle}>
        <Text style={amountLabelStyle}>Importe</Text>
        <Text style={amountValueStyle}>{amountLabel}</Text>
        {reason ? <Text style={amountHelpStyle}>Motivo: {reason}</Text> : null}
      </Section>

      <Text style={paragraphStyle}>
        {variant === "failed"
          ? "Si deseas reintentarlo, el pago sigue disponible en tu portal o podemos generar uno nuevo. Responde a este correo y lo resolvemos juntos."
          : variant === "refunded"
            ? "Si tras 10 días laborables no lo ves acreditado, contáctanos con el nombre del banco y te ayudamos a localizarlo."
            : "Si creías que seguía pendiente, avísanos y lo revisamos."}
      </Text>

      <Hr style={{ borderColor: "#F3EFE5", margin: "32px 0 16px" }} />
      <Text style={smallText}>
        ¿Dudas? Escribe a <a href={`mailto:${supportEmail}`}>{supportEmail}</a> con la referencia de este pago.
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

const amountBoxBase: React.CSSProperties = {
  borderRadius: "18px",
  padding: "20px",
  textAlign: "center",
  margin: "8px 0 20px",
}

const accentRed: React.CSSProperties = {
  ...amountBoxBase,
  backgroundColor: "#FEF2F2",
  border: "1px solid #FCA5A5",
}

const accentAmber: React.CSSProperties = {
  ...amountBoxBase,
  backgroundColor: "#FFF7ED",
  border: "1px solid #FED7AA",
}

const accentSlate: React.CSSProperties = {
  ...amountBoxBase,
  backgroundColor: "#F8F7F4",
  border: "1px solid #E8E6E0",
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

const smallText: React.CSSProperties = {
  fontSize: "12px",
  lineHeight: "20px",
  color: "#94A3B8",
  margin: 0,
}
