import { Link } from "react-router-dom"

export function LandingPage() {
  return (
    <div className="min-h-screen bg-[#F4F1EA] text-[#2F4F4F]">
      <header className="flex items-center justify-between px-6 py-6 sm:px-10">
        <Link to="/" className="flex items-center gap-3">
          <img src="/placeholder-logo.svg" alt="Terrazea" className="h-10 w-10 rounded-xl border border-[#E8E6E0] bg-white p-1.5 shadow-sm" />
          <div>
            <p className="font-heading text-xl font-semibold tracking-wide">Terrazea</p>
            <p className="text-xs uppercase tracking-[0.35em] text-[#C6B89E]">Diseño exterior & Liquid Glass</p>
          </div>
        </Link>
        <div className="hidden items-center gap-3 sm:flex">
          <Link
            to="/login?target=client&fresh=1"
            className="rounded-full border border-[#2F4F4F] px-4 py-2 text-sm font-medium transition hover:bg-[#2F4F4F] hover:text-white"
          >
            Acceso Cliente
          </Link>
          <Link
            to="/login?target=admin&fresh=1"
            className="rounded-full border border-[#2F4F4F] px-4 py-2 text-sm font-medium transition hover:bg-[#2F4F4F] hover:text-white"
          >
            Acceso Admin
          </Link>
        </div>
      </header>

      <main className="relative overflow-hidden px-6 pb-16 pt-10 sm:px-10">
        <div className="absolute left-[-10%] top-[-20%] h-96 w-96 rounded-full bg-[#C6B89E]/20 blur-3xl" />
        <div className="absolute right-[-20%] top-[10%] h-[28rem] w-[28rem] rounded-full bg-[#2F4F4F]/15 blur-[120px]" />
        <div className="absolute bottom-[-25%] right-[-10%] h-80 w-80 rounded-full bg-[#2F4F4F]/10 blur-3xl" />

        <section className="relative mx-auto flex max-w-6xl flex-col gap-12 lg:flex-row lg:items-center">
          <div className="flex-1 space-y-6">
            <span className="inline-flex items-center rounded-full bg-white/70 px-4 py-2 text-xs font-medium uppercase tracking-[0.35em] text-[#C6B89E] shadow-sm">
              CLIENT ZONE
            </span>
            <h1 className="font-heading text-4xl font-semibold leading-tight sm:text-5xl lg:text-[3.4rem]">
              Elige cómo quieres entrar en tu universo Terrazea.
            </h1>
            <p className="max-w-xl text-base text-[#4B5563] sm:text-lg">
              Clientes y equipo acceden desde el mismo portal, cada uno con su experiencia: seguimiento de proyectos,
              calendarios, documentos y comunicación cuidada con acabado liquid glass.
            </p>
            <div className="flex flex-col gap-4 sm:flex-row">
              <Link
                to="/login?target=client&fresh=1"
                className="inline-flex items-center justify-center rounded-full bg-[#2F4F4F] px-6 py-3 text-sm font-semibold text-white shadow-apple transition hover:bg-[#1F3535]"
              >
                Soy cliente Terrazea
              </Link>
              <Link
                to="/login?target=admin&fresh=1"
                className="inline-flex items-center justify-center rounded-full border border-[#2F4F4F] px-6 py-3 text-sm font-semibold text-[#2F4F4F] shadow-apple transition hover:bg-[#2F4F4F] hover:text-white"
              >
                Soy parte del equipo
              </Link>
            </div>
          </div>

          <div className="flex-1 space-y-6 rounded-[2.5rem] border border-[#E8E6E0] bg-white/70 p-8 shadow-apple-xl backdrop-blur-xl">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.35em] text-[#C6B89E]">Portal Terrazea</p>
              <h2 className="font-heading text-2xl font-semibold text-[#2F4F4F]">Dos accesos, un mismo universo</h2>
              <p className="text-sm text-[#6B7280]">
                Elige tu acceso para continuar con la mayor tranquilidad. Los clientes siguen su proyecto, el equipo gestiona la operación.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Link
                to="/login?target=client&fresh=1"
                className="group rounded-[1.75rem] border border-[#E8E6E0] bg-[#F8F7F4] p-6 text-left transition hover:border-[#2F4F4F] hover:shadow-apple-md"
              >
                <p className="font-heading text-lg font-semibold text-[#2F4F4F]">Zona Cliente</p>
                <p className="mt-2 text-xs uppercase tracking-[0.3em] text-[#C6B89E]">Proyectos · Calendario · Documentos</p>
                <p className="mt-3 text-sm text-[#4B5563]">
                  Visualiza avances, hitos y documentación con la calma del acabado Terrazea.
                </p>
              </Link>
              <Link
                to="/login?target=admin&fresh=1"
                className="group rounded-[1.75rem] border border-[#E8E6E0] bg-[#2F4F4F] p-6 text-left text-white transition hover:shadow-apple-md"
              >
                <p className="font-heading text-lg font-semibold">Portal Admin</p>
                <p className="mt-2 text-xs uppercase tracking-[0.3em] text-[#C6B89E]">Clientes · Proyectos · Calendario global</p>
                <p className="mt-3 text-sm text-white/80">
                  Organiza clientes, crea proyectos, gestiona eventos y documentación en un solo lugar.
                </p>
              </Link>
            </div>
            <div className="rounded-[1.75rem] border border-dashed border-[#E8E6E0] bg-[#F8F7F4] p-6 text-sm text-[#4B5563]">
              <p className="font-semibold text-[#2F4F4F]">¿Necesitas ayuda con el acceso?</p>
              <p className="mt-2 text-sm text-[#6B7280]">Escríbenos a <span className="font-medium text-[#2F4F4F]">hola@terrazea.com</span> y te ayudamos enseguida.</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
