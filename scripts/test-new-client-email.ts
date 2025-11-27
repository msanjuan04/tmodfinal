import { sendNewClientProjectEmail } from "../server/services/email"
import { env } from "../server/config/env"

async function main() {
  const to = "marcsanjuansard@gmail.com"
  const name = "Marc San Juan"
  const projectName = "Terraza Mediterránea Barcelona"
  const projectCode = "TRZ-2025-ABCD"

  console.log("=== Configuración Resend ===")
  console.log("From Email:", env.resend.fromEmail)
  console.log("BCC Email:", env.resend.bccEmail ?? "ninguno")
  console.log("Dry Run:", env.resend.dryRun)
  console.log("API Key presente:", env.resend.apiKey ? "Sí" : "No")
  console.log("")

  console.log(`Enviando correo de cliente nuevo a ${to}...`)
  console.log(`Proyecto: ${projectName} (${projectCode})`)

  try {
    const result = await sendNewClientProjectEmail({
      to,
      name,
      projectName,
      projectCode,
      forceSend: true,
    })
    console.log("✅ Correo enviado correctamente")
    console.log("Resultado:", result)
  } catch (error) {
    console.error("❌ Error al enviar el correo:", error)
    if (error instanceof Error) {
      console.error("Mensaje:", error.message)
      console.error("Stack:", error.stack)
    }
    process.exitCode = 1
  }
}

main().catch((error) => {
  console.error("Error:", error)
  process.exitCode = 1
})

