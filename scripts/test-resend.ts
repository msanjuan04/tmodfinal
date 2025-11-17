import { sendEmail } from "../server/services/email/resend"
import { env } from "../server/config/env"

async function main() {
  const to =
    process.env.TEST_EMAIL_TO ||
    process.env.RESEND_TEST_TO ||
    env.resend.bccEmail ||
    env.resend.fromEmail

  if (!to) {
    throw new Error("Define TEST_EMAIL_TO or RESEND_TEST_TO to specify a destination address.")
  }

  const subject = `Terrazea Resend smoke test ${new Date().toISOString()}`
  const html = `
    <div style="font-family: sans-serif">
      <h1>Resend smoke test</h1>
      <p>Este es un correo de prueba enviado desde Terrazea ClientZone.</p>
      <p>Enviado a: ${to}</p>
    </div>
  `

  console.log(`Sending test email to ${to}...`)
  await sendEmail({
    to,
    subject,
    html,
    text: `Resend smoke test enviado a ${to}`,
    forceSend: true,
  })
  console.log("Test email sent successfully.")
}

main().catch((error) => {
  console.error("Test email failed:", error)
  process.exitCode = 1
})

