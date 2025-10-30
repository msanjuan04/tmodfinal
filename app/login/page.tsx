import Image from "next/image"
import Link from "next/link"
import { redirect } from "next/navigation"

import { getSession } from "@/lib/auth/session"
import { LoginForm } from "./login-form"

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ redirect?: string; reason?: string }> }) {
  const session = await getSession()
  if (session) {
    const params = await searchParams
    redirect(params.redirect || "/client/dashboard")
  }

  const params = await searchParams
  const redirectTo = params.redirect
  const reason = params.reason

  return (
    <div className="flex min-h-screen flex-col bg-[#F4F1EA]">
      <header className="flex items-center justify-between px-6 py-4 sm:px-10">
        <Link href="/" className="flex items-center gap-3 text-[#2F4F4F]">
          <Image src="/placeholder-logo.svg" alt="Terrazea" width={36} height={36} className="h-9 w-9" />
          <span className="font-heading text-lg font-semibold tracking-wide">Terrazea</span>
        </Link>
        <Link
          href="/"
          className="inline-flex items-center rounded-full border border-[#2F4F4F] px-5 py-2 text-sm font-medium text-[#2F4F4F] transition hover:bg-[#2F4F4F] hover:text-white"
        >
          Volver al inicio
        </Link>
      </header>

      <main className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-6 pb-16 sm:px-10">
        <div className="absolute left-[-10%] top-[-20%] h-80 w-80 rounded-full bg-[#C6B89E]/30 blur-3xl" />
        <div className="absolute bottom-[-15%] right-[-10%] h-96 w-96 rounded-full bg-[#2F4F4F]/20 blur-3xl" />

        <div className="relative w-full max-w-3xl rounded-[2.25rem] border border-[#E8E6E0] bg-white/70 p-10 shadow-apple-xl backdrop-blur-xl">
          <div className="flex flex-col gap-10 lg:flex-row">
            <div className="flex-1 space-y-6">
              <div className="rounded-full bg-[#E8E6E0]/60 px-4 py-2 text-sm font-medium text-[#2F4F4F]">
                Zona Cliente Terrazea
              </div>
              <h1 className="font-heading text-4xl font-semibold text-[#2F4F4F] leading-tight">
                Accede a tu refugio Terrazea con un toque de vidrio líquido
              </h1>
              <p className="text-base text-[#4B5563]">
                Gestiona proyectos, documentos y mensajes con la misma transparencia que llevamos a tus materiales. Solo
                necesitamos tu correo electrónico o el código de tu proyecto.
              </p>
              <div className="rounded-[1.5rem] border border-[#E8E6E0] bg-[#F4F1EA] p-6 text-sm text-[#4B5563]">
                <p className="font-semibold text-[#2F4F4F]">¿Es tu primera vez?</p>
                <p className="mt-2">
                  Si eres cliente Terrazea, introduce el correo con el que trabajamos contigo. Recibirás acceso inmediato a tu
                  panel privado.
                </p>
              </div>
            </div>

            <div className="flex-1 rounded-[1.75rem] border border-[#E8E6E0] bg-white p-8 shadow-apple-md">
              <LoginForm redirectTo={redirectTo} reason={reason} />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
