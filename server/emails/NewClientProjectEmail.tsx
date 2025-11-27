import type React from "react"
import { Hr, Text } from "@react-email/components"

import { TerrazeaEmailLayout } from "./components/TerrazeaEmailLayout"

export interface NewClientProjectEmailProps {
  name: string
  projectName: string
  projectCode: string
  supportEmail?: string
}

export function NewClientProjectEmail({
  name,
  projectName,
  projectCode,
  supportEmail = "hola@terrazea.com",
}: NewClientProjectEmailProps) {
  const greeting = name ? `Hola ${name},` : "Hola,"
  const preview = `Tu terraza ${projectName} ya está registrada en Terrazea`

  return (
    <TerrazeaEmailLayout preview={preview} title="Tu proyecto Terrazea ha sido creado">
      <Text style={paragraphStyle}>{greeting}</Text>
      <Text style={paragraphStyle}>
        Hemos dado de alta tu terraza <strong>{projectName}</strong> en Terrazea. Guarda este código porque lo
        necesitarás para identificar tu proyecto en cualquier comunicación:
      </Text>
      <Text style={highlightBox}>
        Código Terrazea: <strong>{projectCode}</strong>
      </Text>
      <Text style={paragraphStyle}>
        En breve recibirás las instrucciones para acceder al portal de clientes, donde podrás seguir el avance, revisar
        documentos y escribir al equipo.
      </Text>
      <Text style={paragraphStyle}>
        Si tienes dudas o necesitas apoyo adicional, escríbenos a <a href={`mailto:${supportEmail}`}>{supportEmail}</a>.
      </Text>
      <Hr style={{ borderColor: "#F3EFE5", margin: "32px 0 16px" }} />
      <Text style={smallText}>
        Este mensaje se ha enviado automáticamente tras crear tu proyecto en Terrazea. Si crees que es un error, por
        favor, contáctanos.
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

const highlightBox: React.CSSProperties = {
  ...paragraphStyle,
  backgroundColor: "#F8F7F4",
  borderRadius: "16px",
  padding: "12px 16px",
  border: "1px solid #E8E6E0",
  fontWeight: 600,
  color: "#2F4F4F",
}

const smallText: React.CSSProperties = {
  fontSize: "12px",
  lineHeight: "20px",
  color: "#94A3B8",
  margin: 0,
}

