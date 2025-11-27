import { Resend } from "resend"
import { env } from "../server/config/env"

async function main() {
  console.log("=== Verificando API Key de Resend ===")
  console.log("API Key (primeros 10 chars):", env.resend.apiKey.substring(0, 10) + "...")
  console.log("API Key length:", env.resend.apiKey.length)
  console.log("")

  const resend = new Resend(env.resend.apiKey)

  try {
    // Intentar listar dominios para verificar que la API key funciona
    console.log("Intentando verificar la API key listando dominios...")
    const domains = await resend.domains.list()
    
    if (domains.error) {
      console.error("❌ Error al listar dominios:", domains.error)
      console.log("\n💡 Posibles causas:")
      console.log("  1. La API key no es válida")
      console.log("  2. La API key no tiene permisos suficientes")
      console.log("  3. Hay un problema con la cuenta de Resend")
    } else {
      console.log("✅ API key válida")
      console.log("Dominios disponibles:", domains.data?.data?.map(d => d.name) || [])
    }
  } catch (error) {
    console.error("❌ Error al verificar API key:", error)
  }

  // Intentar enviar un correo simple
  console.log("\n=== Intentando enviar correo de prueba ===")
  try {
    const result = await resend.emails.send({
      from: "onboarding@resend.dev",
      to: "marcsanjuansard@gmail.com",
      subject: "Test Resend API Key",
      html: "<p>Test</p>",
    })

    if (result.error) {
      console.error("❌ Error al enviar:", result.error)
      if (result.error.message?.includes("domain")) {
        console.log("\n💡 El dominio no está verificado. Verifica 'terrazea.com' en tu dashboard de Resend.")
      }
    } else {
      console.log("✅ Correo enviado exitosamente:", result.data)
    }
  } catch (error) {
    console.error("❌ Excepción al enviar:", error)
  }
}

main().catch((error) => {
  console.error("Error:", error)
  process.exitCode = 1
})

