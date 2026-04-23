import { Link } from "react-router-dom"
import { Calendar, FileText, FolderCog, MessageSquare, Users, Wallet } from "lucide-react"

import { TERRAZEA_BRAND_ICON_URL } from "@/lib/constants/brand"

const FEATURES: Array<{ icon: typeof FolderCog; title: string; description: string }> = [
  {
    icon: FolderCog,
    title: "Proyectos por fases",
    description:
      "Inicial, diseño, presupuesto, planificación, ejecución y cierre. Cada cambio de fase avisa automáticamente al cliente.",
  },
  {
    icon: Calendar,
    title: "Calendario y recordatorios",
    description:
      "Visitas, entregas e hitos en un solo calendario. Recordatorios por correo 24 h antes del evento.",
  },
  {
    icon: Wallet,
    title: "Pagos con Stripe",
    description:
      "Genera pagos, cobros online y recibos. Avisos automáticos si un pago vence, falla o se reembolsa.",
  },
  {
    icon: FileText,
    title: "Documentación centralizada",
    description:
      "Planos, certificados y entregables visibles al cliente. Al reemplazar o retirar un documento se le notifica.",
  },
  {
    icon: MessageSquare,
    title: "Mensajería cliente ↔ equipo",
    description:
      "Conversaciones por proyecto con digest automático si se acumulan mensajes sin leer.",
  },
  {
    icon: Users,
    title: "Equipo asignado por rol",
    description:
      "Directores, arquitectos, ingenieros e instaladores por proyecto. Cada asignación llega por correo.",
  },
]

export function LandingPage() {
  return (
    <div className="min-h-screen bg-[#F4F1EA] text-[#2F4F4F]">
      <header className="flex items-center justify-between px-6 py-6 sm:px-10">
        <Link to="/" className="flex items-center gap-3">
          <img src={TERRAZEA_BRAND_ICON_URL} alt="Terrazea" className="h-10 w-10" />
          <div>
            <p className="font-heading text-xl font-semibold tracking-wide">Terrazea</p>
            <p className="text-xs uppercase tracking-[0.35em] text-[#C6B89E]">Portal de gestión</p>
          </div>
        </Link>
      </header>

      <main className="relative overflow-hidden px-6 pb-16 pt-10 sm:px-10">
        <div className="absolute left-[-10%] top-[-20%] h-96 w-96 rounded-full bg-[#C6B89E]/20 blur-3xl" />
        <div className="absolute right-[-20%] top-[10%] h-[28rem] w-[28rem] rounded-full bg-[#2F4F4F]/15 blur-[120px]" />
        <div className="absolute bottom-[-25%] right-[-10%] h-80 w-80 rounded-full bg-[#2F4F4F]/10 blur-3xl" />

        <section className="relative mx-auto flex max-w-6xl flex-col gap-12 lg:flex-row lg:items-center">
          <div className="flex-1 space-y-6">
            <span className="inline-flex items-center rounded-full bg-white/70 px-4 py-2 text-xs font-medium uppercase tracking-[0.35em] text-[#C6B89E] shadow-sm">
              Portal de gestión
            </span>
            <h1 className="font-heading text-4xl font-semibold leading-tight sm:text-5xl lg:text-[3.4rem]">
              Un único sitio para operar tus proyectos.
            </h1>
            <p className="max-w-xl text-base text-[#4B5563] sm:text-lg">
              Clientes, proyectos, pagos, documentación, calendario y mensajería en un mismo entorno. Con
              notificaciones automáticas por correo para no perder nada.
            </p>
          </div>

          <div className="flex-1 space-y-4 rounded-[2.5rem] border border-[#E8E6E0] bg-white/70 p-8 shadow-apple-xl backdrop-blur-xl">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.35em] text-[#C6B89E]">Acceder</p>
              <h2 className="font-heading text-2xl font-semibold text-[#2F4F4F]">Entra según tu rol</h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Link
                to="/login?target=client&fresh=1"
                className="group rounded-[1.75rem] border border-[#E8E6E0] bg-[#2F4F4F] p-6 text-left text-white transition hover:shadow-apple-md"
              >
                <p className="font-heading text-lg font-semibold">Zona Cliente</p>
                <p className="mt-2 text-xs uppercase tracking-[0.3em] text-[#C6B89E]">Seguimiento · Documentos · Pagos</p>
                <p className="mt-3 text-sm text-white/80">
                  Consulta avances, descarga documentación y paga online desde un espacio privado.
                </p>
              </Link>
              <Link
                to="/login?target=admin&fresh=1"
                className="group rounded-[1.75rem] border border-[#E8E6E0] bg-[#F8F7F4] p-6 text-left transition hover:border-[#2F4F4F] hover:shadow-apple-md"
              >
                <p className="font-heading text-lg font-semibold text-[#2F4F4F]">Portal Admin</p>
                <p className="mt-2 text-xs uppercase tracking-[0.3em] text-[#C6B89E]">Clientes · Proyectos · Equipo</p>
                <p className="mt-3 text-sm text-[#4B5563]">
                  Gestiona clientes, crea proyectos, asigna equipo y controla pagos en un único panel.
                </p>
              </Link>
            </div>
            <div className="rounded-[1.75rem] border border-dashed border-[#E8E6E0] bg-[#F8F7F4] p-5 text-sm text-[#4B5563]">
              <p className="font-semibold text-[#2F4F4F]">¿Problemas con el acceso?</p>
              <p className="mt-1 text-sm text-[#6B7280]">
                Escríbenos a <span className="font-medium text-[#2F4F4F]">hola@terrazea.com</span>.
              </p>
            </div>
          </div>
        </section>

        <section className="relative mx-auto mt-20 max-w-6xl">
          <div className="mb-8 flex flex-col gap-2">
            <p className="text-xs uppercase tracking-[0.35em] text-[#C6B89E]">Qué hace el portal</p>
            <h2 className="font-heading text-3xl font-semibold text-[#2F4F4F]">
              Todo lo que necesitas para llevar un proyecto de principio a fin.
            </h2>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="rounded-[1.75rem] border border-[#E8E6E0] bg-white/80 p-6 shadow-apple-md backdrop-blur-sm"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F4F1EA] text-[#2F4F4F]">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <h3 className="mt-4 font-heading text-lg font-semibold text-[#2F4F4F]">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#4B5563]">{description}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-[#E8E6E0] bg-white/60 px-6 py-6 text-center text-xs text-[#6B7280] sm:px-10">
        Portal interno Terrazea · Acceso privado por invitación
      </footer>
    </div>
  )
}
