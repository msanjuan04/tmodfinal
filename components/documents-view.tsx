"use client"

import { useMemo, useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Calendar,
  ChevronRight,
  Download,
  Eye,
  File,
  FileSpreadsheet,
  FileText,
  Filter,
  Folder,
  ImageIcon,
  LayoutGrid,
  List,
  Search,
  Tag,
  X,
} from "lucide-react"

import type { DocumentsData } from "@app/types/documents"

interface DocumentsViewProps {
  data: DocumentsData
  showHeader?: boolean
}

export function DocumentsView({ data, showHeader = true }: DocumentsViewProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [typeFilter, setTypeFilter] = useState<"all" | "images" | "pdf" | "docs" | "spreadsheets" | "others">("all")
  const [dateFilter, setDateFilter] = useState<"all" | "last7" | "last30" | "older">("all")
  const [previewDoc, setPreviewDoc] = useState<DocumentsData["documents"][number] | null>(null)

  const filteredDocuments = useMemo(() => {
    const query = searchQuery.toLowerCase().trim()
    return data.documents.filter((doc) => {
      const matchesQuery =
        !query || doc.name.toLowerCase().includes(query) || doc.category.toLowerCase().includes(query)

      const normalizedType = resolveDocumentType(doc)
      const matchesType = typeFilter === "all" || normalizedType === typeFilter

      const uploadedAt = doc.uploadedAt ? new Date(doc.uploadedAt) : null
      const now = new Date()
      let matchesDate = true
      if (uploadedAt && dateFilter !== "all") {
        const diffDays = Math.floor((now.getTime() - uploadedAt.getTime()) / (1000 * 60 * 60 * 24))
        if (dateFilter === "last7") matchesDate = diffDays <= 7
        if (dateFilter === "last30") matchesDate = diffDays <= 30
        if (dateFilter === "older") matchesDate = diffDays > 30
      }

      return matchesQuery && matchesType && matchesDate
    })
  }, [data.documents, searchQuery, typeFilter, dateFilter])

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
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6b7280]" />
              <Input
                placeholder="Buscar documentos..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="border-[#e8e6e0] pl-10 focus-visible:ring-[#2f4f4f]"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                className={`rounded-full border-[#E8E6E0] px-4 py-2 text-xs font-semibold ${
                  viewMode === "grid" ? "bg-[#2F4F4F] text-white" : "text-[#2F4F4F]"
                }`}
                onClick={() => setViewMode("grid")}
                aria-label="Vista de galería"
              >
                <LayoutGrid className="mr-2 h-4 w-4" />
                Galería
              </Button>
              <Button
                variant="outline"
                className={`rounded-full border-[#E8E6E0] px-4 py-2 text-xs font-semibold ${
                  viewMode === "list" ? "bg-[#2F4F4F] text-white" : "text-[#2F4F4F]"
                }`}
                onClick={() => setViewMode("list")}
                aria-label="Vista de lista"
              >
                <List className="mr-2 h-4 w-4" />
                Lista
              </Button>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <FilterPill
              label="Tipo"
              icon={Tag}
              options={[
                { value: "all", label: "Todos" },
                { value: "images", label: "Imágenes" },
                { value: "pdf", label: "PDF" },
                { value: "docs", label: "Docs" },
                { value: "spreadsheets", label: "Hojas" },
                { value: "others", label: "Otros" },
              ]}
              value={typeFilter}
              onChange={(value) => setTypeFilter(value as typeof typeFilter)}
            />
            <FilterPill
              label="Fecha"
              icon={Calendar}
              options={[
                { value: "all", label: "Siempre" },
                { value: "last7", label: "Últimos 7 días" },
                { value: "last30", label: "Últimos 30 días" },
                { value: "older", label: "Más antiguos" },
              ]}
              value={dateFilter}
              onChange={(value) => setDateFilter(value as typeof dateFilter)}
            />
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

        <DocumentTab
          id="all"
          title="Todos los documentos"
          description="Listado completo"
          documents={filteredDocuments}
          viewMode={viewMode}
          onPreview={setPreviewDoc}
        />
        <DocumentTab
          id="plans"
          title="Planos"
          description="Documentación gráfica y técnica"
          documents={plansDocuments}
          emptyMessage="No hay documentos de planos disponibles."
          viewMode={viewMode}
          onPreview={setPreviewDoc}
        />
        <DocumentTab
          id="certificates"
          title="Certificados"
          description="Certificaciones y homologaciones"
          documents={certificatesDocuments}
          emptyMessage="No hay certificados almacenados."
          viewMode={viewMode}
          onPreview={setPreviewDoc}
        />
        <DocumentTab
          id="legal"
          title="Legal"
          description="Permisos y documentación legal"
          documents={legalDocuments}
          emptyMessage="No hay documentos legales registrados."
          viewMode={viewMode}
          onPreview={setPreviewDoc}
        />
        <DocumentTab
          id="budgets"
          title="Presupuestos"
          description="Presupuestos y propuestas económicas adjuntas"
          documents={budgetDocuments}
          emptyMessage="No se han registrado presupuestos."
          viewMode={viewMode}
          onPreview={setPreviewDoc}
        />
      </Tabs>

      <DocumentPreview previewDoc={previewDoc} onClose={() => setPreviewDoc(null)} />
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
  viewMode,
  onPreview,
}: {
  id: string
  title: string
  description: string
  documents: DocumentsData["documents"]
  emptyMessage?: string
  viewMode: "grid" | "list"
  onPreview: (doc: DocumentsData["documents"][number] | null) => void
}) {
  return (
    <TabsContent value={id} className="space-y-4">
      <Card className="border-[#e8e6e0]">
        <CardHeader>
          <CardTitle className="font-serif text-xl text-[#2f4f4f]">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          {documents.length === 0 ? (
            <p className="text-sm text-[#6b7280]">{emptyMessage ?? "No hay documentos disponibles."}</p>
          ) : viewMode === "grid" ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {documents.map((doc) => (
                <DocumentGalleryCard key={doc.id} doc={doc} onPreview={() => onPreview(doc)} />
              ))}
            </div>
          ) : (
            <div className="grid gap-4">
              {documents.map((doc) => (
                <DocumentRow key={doc.id} doc={doc} onPreview={() => onPreview(doc)} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </TabsContent>
  )
}

function DocumentRow({ doc, onPreview }: { doc: DocumentsData["documents"][number]; onPreview: () => void }) {
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
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Vista previa de ${doc.name}`}
              className="text-[#2F4F4F] hover:bg-[#F4F1EA]"
              onClick={onPreview}
            >
              <Eye className="h-4 w-4" />
            </Button>
            {doc.downloadUrl ? (
              <Button
                asChild
                variant="ghost"
                size="icon"
                aria-label={`Descargar ${doc.name}`}
                className="text-[#2F4F4F] hover:bg-[#F4F1EA] disabled:text-[#C5C9D1]"
              >
                <a href={doc.downloadUrl!} download={doc.name}>
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

function DocumentGalleryCard({
  doc,
  onPreview,
}: {
  doc: DocumentsData["documents"][number]
  onPreview: () => void
}) {
  const type = resolveDocumentType(doc)
  const updatedLabel = formatUpdatedAt(doc.uploadedAt)
  const isImage = type === "images" && doc.viewUrl

  return (
    <div className="group rounded-[1.5rem] border border-[#E8E6E0] bg-white/90 shadow-apple-md transition hover:-translate-y-1 hover:shadow-apple-xl">
      <div className="relative h-48 overflow-hidden rounded-t-[1.5rem] bg-[#F8F7F4]">
        {isImage ? (
          <img
            src={doc.viewUrl ?? ""}
            alt={doc.name}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
            onClick={onPreview}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-[#C6B89E]">
            <Folder className="h-12 w-12" />
          </div>
        )}
        <div className="absolute right-3 top-3 flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-[11px] font-semibold text-[#2F4F4F] shadow-apple">
          {typeLabel(type)}
        </div>
      </div>
      <div className="space-y-3 p-5">
        <div className="flex items-center gap-2">
          <Badge className="rounded-full border-[#E8E6E0] bg-[#F8F7F4] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-[#C6B89E]">
            {doc.category}
          </Badge>
        </div>
        <p className="line-clamp-2 font-heading text-base text-[#2F4F4F]">{doc.name}</p>
        <p className="text-xs text-[#6B7280]">{updatedLabel}</p>
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-[#2F4F4F] hover:bg-[#F4F1EA]"
            onClick={onPreview}
          >
            Vista previa
          </Button>
          {doc.downloadUrl ? (
            <Button
              asChild
              size="icon"
              variant="ghost"
              className="rounded-full bg-[#F8F7F4] text-[#2F4F4F] hover:bg-[#E8E6E0]"
            >
              <a href={doc.downloadUrl} download={doc.name}>
                <Download className="h-4 w-4" />
              </a>
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function DocumentPreview({
  previewDoc,
  onClose,
}: {
  previewDoc: DocumentsData["documents"][number] | null
  onClose: () => void
}) {
  if (!previewDoc) return null
  const isImage = resolveDocumentType(previewDoc) === "images" && previewDoc.viewUrl

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-4xl rounded-3xl bg-white p-6 shadow-apple-xl">
        <button
          className="absolute right-4 top-4 rounded-full bg-[#F8F7F4] p-2 text-[#2F4F4F] hover:bg-[#E8E6E0]"
          onClick={onClose}
          aria-label="Cerrar vista previa"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="space-y-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-[#C6B89E]">Vista previa</p>
            <h3 className="mt-1 font-heading text-2xl text-[#2F4F4F]">{previewDoc.name}</h3>
          </div>
          <div className="max-h-[60vh] overflow-auto rounded-[1.5rem] border border-[#E8E6E0] bg-[#F8F7F4]">
            {isImage ? (
              <img src={previewDoc.viewUrl ?? ""} alt={previewDoc.name} className="w-full object-contain" />
            ) : previewDoc.viewUrl ? (
              <iframe src={previewDoc.viewUrl} className="h-[60vh] w-full rounded-[1.5rem]" title={previewDoc.name} />
            ) : (
              <div className="flex h-[40vh] flex-col items-center justify-center space-y-3 text-sm text-[#6B7280]">
                <Eye className="h-6 w-6 text-[#C6B89E]" />
                <p>No hay vista previa disponible para este documento.</p>
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {previewDoc.downloadUrl ? (
              <Button asChild className="rounded-full bg-[#2F4F4F] text-white hover:bg-[#1F3535]">
                <a href={previewDoc.downloadUrl} download={previewDoc.name}>
                  <Download className="mr-2 h-4 w-4" />
                  Descargar
                </a>
              </Button>
            ) : null}
            <span className="text-xs text-[#6B7280]">{formatUpdatedAt(previewDoc.uploadedAt)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function FilterPill({
  label,
  icon: Icon,
  options,
  value,
  onChange,
}: {
  label: string
  icon: typeof Tag
  options: Array<{ value: string; label: string }>
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-[#E8E6E0] bg-white px-3 py-1">
      <Icon className="h-4 w-4 text-[#6B7280]" />
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="bg-transparent text-sm font-medium text-[#2F4F4F] focus:outline-none"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
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

function resolveDocumentType(doc: DocumentsData["documents"][number]): "images" | "pdf" | "docs" | "spreadsheets" | "others" {
  const type = doc.fileType?.toLowerCase() ?? ""
  if (type.includes("image") || /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(doc.name)) return "images"
  if (type.includes("pdf") || doc.name.toLowerCase().endsWith(".pdf")) return "pdf"
  if (type.includes("sheet") || /\.(xls|xlsx|csv)$/i.test(doc.name)) return "spreadsheets"
  if (type.includes("word") || /\.(doc|docx)$/i.test(doc.name)) return "docs"
  return "others"
}

function typeLabel(type: ReturnType<typeof resolveDocumentType>): string {
  switch (type) {
    case "images":
      return "Imagen"
    case "pdf":
      return "PDF"
    case "docs":
      return "Doc"
    case "spreadsheets":
      return "Hoja"
    default:
      return "Archivo"
  }
}
