"use client"

import { useMemo, useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ChevronRight, Download, Eye, File, FileSpreadsheet, FileText, Filter, ImageIcon, Search } from "lucide-react"

import type { DocumentsData } from "@app/types/documents"

interface DocumentsViewProps {
  data: DocumentsData
  showHeader?: boolean
}

export function DocumentsView({ data, showHeader = true }: DocumentsViewProps) {
  const [searchQuery, setSearchQuery] = useState("")

  const filteredDocuments = useMemo(() => {
    const query = searchQuery.toLowerCase().trim()
    if (!query) return data.documents
    return data.documents.filter(
      (doc) => doc.name.toLowerCase().includes(query) || doc.category.toLowerCase().includes(query),
    )
  }, [data.documents, searchQuery])

  const plansDocuments = filteredDocuments.filter((doc) => doc.category.toLowerCase() === "planos")
  const certificatesDocuments = filteredDocuments.filter((doc) => doc.category.toLowerCase() === "certificados")
  const legalDocuments = filteredDocuments.filter((doc) => doc.category.toLowerCase() === "legal")
  const budgetDocuments = filteredDocuments.filter((doc) => doc.category.toLowerCase() === "presupuestos")

  return (
    <div className="space-y-8">
      {showHeader ? (
        <header>
          <div className="flex items-center gap-2 text-sm text-[#6b7280]">
            <span>Dashboard</span>
            <ChevronRight className="h-4 w-4" />
            <span className="text-[#2f4f4f]">Documentos</span>
          </div>
          <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="font-serif text-3xl font-bold text-[#2f4f4f] sm:text-4xl">Documentos del Proyecto</h1>
              <p className="mt-2 text-lg text-[#6b7280]">Accede a toda la documentación técnica y legal</p>
            </div>
            <Button className="bg-[#2f4f4f] text-white hover:bg-[#1f3535]">
              <Download className="mr-2 h-4 w-4" />
              Descargar Todo
            </Button>
          </div>
        </header>
      ) : null}

      <section className="grid gap-6 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          title="Total Documentos"
          icon={FileText}
          value={data.stats.total}
          description={
            data.stats.newThisWeek === 0
              ? "Sin cambios esta semana"
              : `${data.stats.newThisWeek} añadido${data.stats.newThisWeek === 1 ? "" : "s"} esta semana`
          }
        />
        <StatCard title="Planos" icon={ImageIcon} value={data.stats.plans} description="Arquitectónicos y técnicos" />
        <StatCard title="Certificados" icon={File} value={data.stats.certificates} description="Todos vigentes" />
        <StatCard title="Garantías" icon={FileSpreadsheet} value={data.stats.warranties} description="Materiales y trabajos" />
        <StatCard title="Presupuestos" icon={FileText} value={data.stats.budgets} description="Adjuntos a pagos" />
      </section>

      <Card className="border-[#e8e6e0]">
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6b7280]" />
              <Input
                placeholder="Buscar documentos..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="border-[#e8e6e0] pl-10 focus-visible:ring-[#2f4f4f]"
              />
            </div>
            <Button variant="outline" className="border-[#e8e6e0] bg-transparent text-[#2f4f4f] hover:bg-[#f4f1ea]">
              <Filter className="mr-2 h-4 w-4" />
              Filtrar
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="all" className="space-y-6">
        <TabsList className="flex flex-wrap items-center gap-2 rounded-full border border-[#E8E6E0] bg-white p-1 shadow-sm">
          <TabsTrigger
            value="all"
            className="rounded-full px-4 py-2 text-sm font-medium text-[#4B5563] transition-colors data-[state=active]:bg-[#2F4F4F] data-[state=active]:text-white"
          >
            Todos
          </TabsTrigger>
          <TabsTrigger
            value="plans"
            className="rounded-full px-4 py-2 text-sm font-medium text-[#4B5563] transition-colors data-[state=active]:bg-[#2F4F4F] data-[state=active]:text-white"
          >
            Planos
          </TabsTrigger>
          <TabsTrigger
            value="certificates"
            className="rounded-full px-4 py-2 text-sm font-medium text-[#4B5563] transition-colors data-[state=active]:bg-[#2F4F4F] data-[state=active]:text-white"
          >
            Certificados
          </TabsTrigger>
          <TabsTrigger
            value="legal"
            className="rounded-full px-4 py-2 text-sm font-medium text-[#4B5563] transition-colors data-[state=active]:bg-[#2F4F4F] data-[state=active]:text-white"
          >
            Legal
          </TabsTrigger>
          <TabsTrigger
            value="budgets"
            className="rounded-full px-4 py-2 text-sm font-medium text-[#4B5563] transition-colors data-[state=active]:bg-[#2F4F4F] data-[state=active]:text-white"
          >
            Presupuestos
          </TabsTrigger>
        </TabsList>

        <DocumentTab id="all" title="Todos los documentos" description="Listado completo" documents={filteredDocuments} />
        <DocumentTab
          id="plans"
          title="Planos"
          description="Documentación gráfica y técnica"
          documents={plansDocuments}
          emptyMessage="No hay documentos de planos disponibles."
        />
        <DocumentTab
          id="certificates"
          title="Certificados"
          description="Certificaciones y homologaciones"
          documents={certificatesDocuments}
          emptyMessage="No hay certificados almacenados."
        />
        <DocumentTab
          id="legal"
          title="Legal"
          description="Permisos y documentación legal"
          documents={legalDocuments}
          emptyMessage="No hay documentos legales registrados."
        />
        <DocumentTab
          id="budgets"
          title="Presupuestos"
          description="Presupuestos y propuestas económicas adjuntas"
          documents={budgetDocuments}
          emptyMessage="No se han registrado presupuestos."
        />
      </Tabs>
    </div>
  )
}

function StatCard({
  title,
  icon: Icon,
  value,
  description,
}: {
  title: string
  icon: typeof FileText
  value: number
  description: string
}) {
  return (
    <Card className="border-[#e8e6e0]">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-[#6b7280]">{title}</CardTitle>
        <Icon className="h-4 w-4 text-[#2f4f4f]" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-[#2f4f4f]">{value}</div>
        <p className="mt-1 text-xs text-[#6b7280]">{description}</p>
      </CardContent>
    </Card>
  )
}

function DocumentTab({
  id,
  title,
  description,
  documents,
  emptyMessage,
}: {
  id: string
  title: string
  description: string
  documents: DocumentsData["documents"]
  emptyMessage?: string
}) {
  return (
    <TabsContent value={id} className="space-y-4">
      <Card className="border-[#e8e6e0]">
        <CardHeader>
          <CardTitle className="font-serif text-xl text-[#2f4f4f]">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {documents.map((doc) => (
              <DocumentRow key={doc.id} doc={doc} />
            ))}
            {documents.length === 0 && <p className="text-sm text-[#6b7280]">{emptyMessage ?? "No hay documentos disponibles."}</p>}
          </div>
        </CardContent>
      </Card>
    </TabsContent>
  )
}

function DocumentRow({ doc }: { doc: DocumentsData["documents"][number] }) {
  const fileLabel = formatFileLabel(doc)
  const updatedLabel = formatUpdatedAt(doc.uploadedAt)

  return (
    <div className="rounded-[1.25rem] border border-[#E8E6E0] bg-white/80 p-6 shadow-[0_10px_30px_rgba(47,79,79,0.05)] transition-colors">
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="rounded-full border-[#E8E6E0] bg-[#F8F7F4] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-[#C6B89E]">
              {doc.category}
            </Badge>
            <Badge className="rounded-full border-transparent bg-[#2F4F4F] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white">
              {fileLabel}
            </Badge>
          </div>
          <h3 className="font-heading text-lg text-[#2F4F4F] sm:text-xl">{doc.name}</h3>
          <div className="flex flex-wrap items-center gap-3 text-xs text-[#6B7280]">
            <span>{doc.sizeLabel ?? "Tamaño no disponible"}</span>
            <span className="hidden text-[#D6D2C4] sm:inline">•</span>
            <span>{updatedLabel}</span>
          </div>
        </div>
        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-4">
          <Badge className={`rounded-full border-transparent px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${statusBadgeClass(doc.status)}`}>
            {formatStatus(doc.status)}
          </Badge>
          <div className="flex items-center gap-2">
            {doc.viewUrl ? (
              <Button
                asChild
                variant="ghost"
                size="icon"
                aria-label={`Ver ${doc.name}`}
                className="text-[#2F4F4F] hover:bg-[#F4F1EA] disabled:text-[#C5C9D1]"
              >
                <a href={doc.viewUrl} target="_blank" rel="noopener noreferrer">
                  <Eye className="h-4 w-4" />
                  <span className="sr-only">{`Ver ${doc.name}`}</span>
                </a>
              </Button>
            ) : (
              <Button variant="ghost" size="icon" disabled className="text-[#C5C9D1]">
                <Eye className="h-4 w-4" />
                <span className="sr-only">{`Ver ${doc.name}`}</span>
              </Button>
            )}
            {doc.downloadUrl ? (
              <Button
                asChild
                variant="ghost"
                size="icon"
                aria-label={`Descargar ${doc.name}`}
                className="text-[#2F4F4F] hover:bg-[#F4F1EA] disabled:text-[#C5C9D1]"
              >
                <a href={doc.downloadUrl} download={doc.name}>
                  <Download className="h-4 w-4" />
                  <span className="sr-only">{`Descargar ${doc.name}`}</span>
                </a>
              </Button>
            ) : (
              <Button variant="ghost" size="icon" disabled className="text-[#C5C9D1]">
                <Download className="h-4 w-4" />
                <span className="sr-only">{`Descargar ${doc.name}`}</span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function formatDate(value: string | null): string {
  if (!value) return "Sin fecha"
  return new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value))
}

function formatUpdatedAt(value: string | null): string {
  const formatted = formatDate(value)
  if (formatted === "Sin fecha") return "Actualización pendiente"
  return `Actualizado el ${formatted}`
}

function formatStatus(status: DocumentsData["documents"][number]["status"]): string {
  return status.replace(/_/g, " ").replace(/^\w/u, (char) => char.toUpperCase())
}

function statusBadgeClass(status: DocumentsData["documents"][number]["status"]): string {
  const base = "hover:bg-opacity-90"
  switch (status) {
    case "aprobado":
      return `bg-green-500/10 text-green-700 ${base}`
    case "vigente":
      return `bg-blue-500/10 text-blue-700 ${base}`
    case "actualizado":
      return `bg-orange-500/10 text-orange-700 ${base}`
    default:
      return `bg-gray-500/10 text-gray-700 ${base}`
  }
}

function formatFileLabel(doc: DocumentsData["documents"][number]): string {
  const extension = doc.name.split(".").pop()
  if (extension && extension.length <= 4) {
    return extension.toUpperCase()
  }

  return formatMimeLabel(doc.fileType)
}

function formatMimeLabel(fileType: string): string {
  if (!fileType) return "ARCHIVO"
  const clean = fileType.split("/").pop() ?? fileType

  switch (clean) {
    case "pdf":
      return "PDF"
    case "jpeg":
    case "jpg":
      return "JPG"
    case "png":
      return "PNG"
    case "msword":
      return "DOC"
    case "vnd.ms-excel":
      return "XLS"
    case "vnd.openxmlformats-officedocument.spreadsheetml.sheet":
      return "XLSX"
    case "vnd.openxmlformats-officedocument.wordprocessingml.document":
      return "DOCX"
    case "zip":
      return "ZIP"
    default:
      return clean.replace(/[\.\-_]/g, " ").toUpperCase()
  }
}
