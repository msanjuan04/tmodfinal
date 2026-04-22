import { Button, Hr, Section, Text } from "@react-email/components"

import { TerrazeaEmailLayout } from "./components/TerrazeaEmailLayout"

export interface UnreadConversationSummary {
  teamMemberName: string
  projectName?: string | null
  unreadCount: number
  lastMessagePreview?: string | null
  lastMessageLabel?: string | null
}

export interface UnreadMessagesDigestEmailProps {
  name: string
  totalUnread: number
  conversations: UnreadConversationSummary[]
  ctaUrl: string
  supportEmail?: string
}

export function UnreadMessagesDigestEmail({
  name,
  totalUnread,
  conversations,
  ctaUrl,
  supportEmail = "hola@terrazea.com",
}: UnreadMessagesDigestEmailProps) {
  const greeting = name ? `Hola ${name},` : "Hola,"
  const preview = `${totalUnread} mensaje${totalUnread === 1 ? "" : "s"} sin leer en tu portal`

  return (
    <TerrazeaEmailLayout preview={preview} title="Mensajes pendientes de leer">
      <Text style={paragraphStyle}>{greeting}</Text>
      <Text style={paragraphStyle}>
        El equipo Terrazea te ha escrito y todavía no has entrado al portal. Aquí tienes un resumen rápido para que no
        se te pase nada importante.
      </Text>

      <Section style={countBox}>
        <Text style={countValue}>
          {totalUnread} mensaje{totalUnread === 1 ? "" : "s"} sin leer
        </Text>
        <Text style={countHelp}>
          En {conversations.length} conversación{conversations.length === 1 ? "" : "es"}
        </Text>
      </Section>

      <Section style={listBox}>
        {conversations.map((conversation, index) => (
          <div key={index} style={conversationRow}>
            <div style={conversationHeader}>
              <Text style={conversationName}>{conversation.teamMemberName}</Text>
              <Text style={conversationBadge}>
                {conversation.unreadCount}{" "}
                {conversation.unreadCount === 1 ? "nuevo" : "nuevos"}
              </Text>
            </div>
            {conversation.projectName ? (
              <Text style={conversationProject}>Proyecto: {conversation.projectName}</Text>
            ) : null}
            {conversation.lastMessagePreview ? (
              <Text style={conversationPreview}>« {conversation.lastMessagePreview} »</Text>
            ) : null}
            {conversation.lastMessageLabel ? (
              <Text style={conversationWhen}>{conversation.lastMessageLabel}</Text>
            ) : null}
          </div>
        ))}
      </Section>

      <Section style={{ textAlign: "center", margin: "20px 0 24px" }}>
        <Button style={buttonStyle} href={ctaUrl}>
          Abrir mis mensajes
        </Button>
      </Section>

      <Text style={paragraphStyle}>
        Al entrar en el portal los mensajes se marcan como leídos automáticamente. Si prefieres responder desde aquí,
        contesta a este correo y haremos llegar tu respuesta al equipo.
      </Text>

      <Hr style={{ borderColor: "#F3EFE5", margin: "32px 0 16px" }} />
      <Text style={smallText}>
        Enviamos este resumen como máximo una vez al día y solo cuando hay más de un mensaje sin leer. Puedes pedirnos
        desactivarlo escribiendo a <a href={`mailto:${supportEmail}`}>{supportEmail}</a>.
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

const countBox: React.CSSProperties = {
  backgroundColor: "#F8F7F4",
  border: "1px solid #E8E6E0",
  borderRadius: "18px",
  padding: "18px 20px",
  margin: "8px 0 16px",
  textAlign: "center",
}

const countValue: React.CSSProperties = {
  fontSize: "22px",
  fontWeight: 700,
  color: "#2F4F4F",
  margin: "0 0 4px",
}

const countHelp: React.CSSProperties = {
  fontSize: "12px",
  color: "#6B7280",
  margin: 0,
}

const listBox: React.CSSProperties = {
  margin: "0 0 12px",
}

const conversationRow: React.CSSProperties = {
  backgroundColor: "#FFFFFF",
  border: "1px solid #E8E6E0",
  borderRadius: "16px",
  padding: "14px 16px",
  margin: "0 0 10px",
}

const conversationHeader: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "baseline",
  margin: "0 0 4px",
}

const conversationName: React.CSSProperties = {
  fontSize: "14px",
  fontWeight: 700,
  color: "#2F4F4F",
  margin: 0,
}

const conversationBadge: React.CSSProperties = {
  fontSize: "11px",
  backgroundColor: "#2F4F4F",
  color: "#FFFFFF",
  borderRadius: "999px",
  padding: "2px 10px",
  margin: 0,
  fontWeight: 600,
}

const conversationProject: React.CSSProperties = {
  fontSize: "11px",
  color: "#C6B89E",
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  margin: "0 0 6px",
  fontWeight: 600,
}

const conversationPreview: React.CSSProperties = {
  fontSize: "13px",
  color: "#4B5563",
  margin: "0 0 4px",
  fontStyle: "italic",
}

const conversationWhen: React.CSSProperties = {
  fontSize: "11px",
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
