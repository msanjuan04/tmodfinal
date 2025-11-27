import { Resend } from "resend"
import { env } from "../server/config/env"

async function main() {
  const resend = new Resend(env.resend.apiKey)
  const to = "marcsanjuansard@gmail.com"

  console.log("=== Probando dominio actual ===")
  console.log("From:", env.resend.fromEmail)
  
  try {
    const result1 = await resend.emails.send({
      from: env.resend.fromEmail,
      to,
      subject: "Test desde dominio configurado",
      html: "<p>Test desde " + env.resend.fromEmail + "</p>",
    })
    
    if (result1.error) {
      console.error("❌ Error con dominio configurado:", result1.error)
    } else {
      console.log("✅ Éxito con dominio configurado:", result1.data)
    }
  } catch (error) {
    console.error("❌ Excepción:", error)
  }

  console.log("\n=== Probando dominio de prueba de Resend ===")
  
  try {
    const result2 = await resend.emails.send({
      from: "onboarding@resend.dev",
      to,
      subject: "Test desde dominio de prueba Resend",
      html: "<p>Este correo viene del dominio de prueba de Resend (onboarding@resend.dev)</p>",
    })
    
    if (result2.error) {
      console.error("❌ Error con dominio de prueba:", result2.error)
    } else {
      console.log("✅ Éxito con dominio de prueba:", result2.data)
      console.log("\n💡 Solución: Verifica el dominio 'terrazea.com' en Resend o usa 'onboarding@resend.dev' temporalmente")
    }
  } catch (error) {
    console.error("❌ Excepción:", error)
  }
}

main().catch((error) => {
  console.error("Error:", error)
  process.exitCode = 1
})

