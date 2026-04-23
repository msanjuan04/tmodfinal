"use client"

import { useEffect, useMemo, useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Award,
  Calendar,
  Download,
  ExternalLink,
  Eye,
  File,
  FileImage,
  FileSpreadsheet,
  FileText,
  Filter,
  Folder,
  Image as ImageIcon,
  LayoutGrid,
  List,
  Loader2,
  Scale,
  Search,
  Tag,
  Wallet,
  X,
} from "lucide-react"

import type { DocumentsData } from "@app/types/documents"

type DocumentItem = DocumentsData["documents"][number]

interface DocumentsViewProps {
  data: DocumentsData
  showHeader?: boolean
}

type ViewMode = "grid" | "list"
type TypeFilter = "all" | "images" | "pdf" | "docs" | "spreadsheets" | "others"
type DateFilter = "all" | "last7" | "last30" | "older"
type CategoryTab = "all" | "planos" | "certificados" | "legal" | "presupuestos" | "garantias"

// -----------------------------------------------------------------------------
// Componente principal
// -----------------------------------------------------------------------------

export function DocumentsView({ data, showHeader = true }: DocumentsViewProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [viewMode, setViewMode] = useState<ViewMode>("grid")
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all")
  const [dateFilter, setDateFilter] = useState<DateFilter>("all")
  const [categoryTab, setCategoryTab] = useState<CategoryTab>("all")
  const [previewDoc, setPreviewDoc] = useState<DocumentItem | null>(null)

  const filteredDocuments = useMemo(() => {
    const query = searchQuery.toLowerCase().trim()
    return data.documents.filter((doc) => {
      const matchesQuery =
        !query || doc.name.toLowerCase().includes(query) || doc.category.toLowerCase().includes(query)

      const normalizedType = resolveDocumentType(doc)
      const matchesType = typeFilter === "all" || normalizedType === typeFilter

      const uploadedAt = doc.uploadedAt ? new Date(doc.uploadedAt) : null
      let matchesDate = true
      if (uploadedAt && dateFilter !== "all") {
        const diffDays = Math.floor((Date.now() - uploadedAt.getTime()) / (1000 * 60 * 60 * 24))
        if (dateFilter === "last7") matchesDate = diffDays <= 7
        if (dateFilter === "last30") matchesDate = diffDays <= 30
        if (dateFilter === "older") matchesDate = diffDays > 30
      }

      const normalizedCategory = doc.category.toLowerCase()
      const matchesCategory =
        categoryTab === "all" ||
        normalizedCategory === categoryTab ||
        (categoryTab === "garantias" && normalizedCategory.includes("garant"))

      return matchesQuery && matchesType && matchesDate && matchesCategory
    })
  }, [data.documents, searchQuery, typeFilter, dateFilter, categoryTab])

  const activeFilters =
    (typeFilter !== "all" ? 1 : 0) + (dateFilter !== "all" ? 1 : 0) + (searchQuery.trim() ? 1 : 0)

  const stats = data.stats
  const newLabel =
    stats.newThisWeek === 0
      ? "Sin cambios esta semana"
      : `${stats.newThisWeek} añadido${stats.newThisWeek === 1 ? "" : "s"} esta semana`

  return (
    <div className="space-y-6 pb-16">
      {showHeader ? (
        <section className="rounded-[1.75rem] border border-[#E8E6E0] bg-white/95 p-6 shadow-apple-md lg:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F4F1EA] text-[#2F4F4F]">
                  <FileText className="h-4 w-4" />
                </div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[#C6B89E]">
                  Gestión documental
                </p>
              </div>
              <h1 className="font-heading text-3xl font-semibold leading-tight text-[#2F4F4F] sm:text-4xl">
                Documentos del proyecto
              </h1>
              <p className="max-w-2xl text-sm leading-relaxed text-[#6B7280]">
                Consulta planos, certificados, documentación legal y presupuestos en un solo lugar. Usa los filtros o
                la búsqueda para encontrar rápido lo que necesitas.
              </p>
            </div>
          </div>
        </section>
      ) : null}

      {/* Stats: 5 tarjetas compactas con acento de color */}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard icon={FileText} label="Total" value={stats.total} hint={newLabel} tone="slate" />
        <StatCard icon={FileImage} label="Planos" value={stats.plans} hint="Arquitectónicos y técnicos" tone="teal" />
        <StatCard icon={Award} label="Certificados" value={stats.certificates} hint="Vigentes" tone="amber" />
        <StatCard icon={Scale} label="Garantías" value={stats.warranties} hint="Materiales y trabajo" tone="green" />
        <StatCard icon={Wallet} label="Presupuestos" value={stats.budgets} hint="Adjuntos a pagos" tone="sand" />
      </section>

      {/* Toolbar: búsqueda + vista + filtros */}
      <section className="rounded-[1.25rem] border border-[#E8E6E0] bg-white/95 p-4 shadow-apple-sm lg:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
            <Input
              placeholder="Buscar por nombre o categoría…"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="h-10 rounded-full border-[#E8E6E0] bg-[#F8F7F4] pl-10 text-sm focus-visible:ring-[#2F4F4F]"
            />
          </div>
          <div className="flex items-center gap-2">
            <FilterPill
              icon={Tag}
              label="Tipo"
              value={typeFilter}
              onChange={(v) => setTypeFilter(v as TypeFilter)}
              options={[
                { value: "all", label: "Todos los tipos" },
                { value: "images", label: "Imágenes" },
                { value: "pdf", label: "PDF" },
                { value: "docs", label: "Documentos (Word)" },
                { value: "spreadsheets", label: "Hojas (Excel)" },
                { value: "others", label: "Otros" },
              ]}
            />
            <FilterPill
              icon={Calendar}
              label="Fecha"
              value={dateFilter}
              onChange={(v) => setDateFilter(v as DateFilter)}
              options={[
                { value: "all", label: "Siempre" },
                { value: "last7", label: "Últimos 7 días" },
                { value: "last30", label: "Últimos 30 días" },
                { value: "older", label: "Más antiguos" },
              ]}
            />
            <div className="inline-flex rounded-full border border-[#E8E6E0] bg-[#F8F7F4] p-1">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                aria-label="Vista de galería"
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  viewMode === "grid" ? "bg-white text-[#2F4F4F] shadow-apple-sm" : "text-[#6B7280] hover:text-[#2F4F4F]"
                }`}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("list")}
                aria-label="Vista de lista"
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  viewMode === "list" ? "bg-white text-[#2F4F4F] shadow-apple-sm" : "text-[#6B7280] hover:text-[#2F4F4F]"
                }`}
              >
                <List className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

        {activeFilters > 0 ? (
          <div className="mt-3 flex items-center gap-2 text-xs text-[#6B7280]">
            <Filter className="h-3.5 w-3.5" />
            <span>{filteredDocuments.length} resultado{filteredDocuments.length === 1 ? "" : "s"}</span>
            <button
              type="button"
              onClick={() => {
                setSearchQuery("")
                setTypeFilter("all")
                setDateFilter("all")
              }}
              className="ml-1 rounded-full border border-[#E8E6E0] bg-white px-3 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#2F4F4F] transition hover:bg-[#F4F1EA]"
            >
              Limpiar filtros
            </button>
          </div>
        ) : null}
      </section>

      {/* Tabs por categoría */}
      <nav className="flex flex-wrap items-center gap-2">
        <CategoryTabButton active={categoryTab === "all"} onClick={() => setCategoryTab("all")} label="Todos" count={data.documents.length} />
        <CategoryTabButton
          active={categoryTab === "planos"}
          onClick={() => setCategoryTab("planos")}
          label="Planos"
          count={data.documents.filter((d) => d.category.toLowerCase() === "planos").length}
        />
        <CategoryTabButton
          active={categoryTab === "certificados"}
          onClick={() => setCategoryTab("certificados")}
          label="Certificados"
          count={data.documents.filter((d) => d.category.toLowerCase() === "certificados").length}
        />
        <CategoryTabButton
          active={categoryTab === "legal"}
          onClick={() => setCategoryTab("legal")}
          label="Legal"
          count={data.documents.filter((d) => d.category.toLowerCase() === "legal").length}
        />
        <CategoryTabButton
          active={categoryTab === "presupuestos"}
          onClick={() => setCategoryTab("presupuestos")}
          label="Presupuestos"
          count={data.documents.filter((d) => d.category.toLowerCase() === "presupuestos").length}
        />
        <CategoryTabButton
          active={categoryTab === "garantias"}
          onClick={() => setCategoryTab("garantias")}
          label="Garantías"
          count={data.documents.filter((d) => d.category.toLowerCase().includes("garant")).length}
        />
      </nav>

      {/* Contenido */}
      {filteredDocuments.length === 0 ? (
        <EmptyState hasFilters={activeFilters > 0} />
      ) : viewMode === "grid" ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredDocuments.map((doc) => (
            <DocumentCard key={doc.id} doc={doc} onPreview={() => setPreviewDoc(doc)} />
          ))}
        </div>
      ) : (
        <ul className="space-y-2">
          {filteredDocuments.map((doc) => (
            <DocumentRow key={doc.id} doc={doc} onPreview={() => setPreviewDoc(doc)} />
          ))}
        </ul>
      )}

      <DocumentPreview doc={previewDoc} onClose={() => setPreviewDoc(null)} />
    </div>
  )
}

// -----------------------------------------------------------------------------
// Sub-componentes UI
// -----------------------------------------------------------------------------

const TONE_CLASSES = {
  slate: { bg: "bg-[#F4F1EA]", text: "text-[#2F4F4F]" },
  teal: { bg: "bg-[#DBEAFE]", text: "text-[#1D4ED8]" },
  amber: { bg: "bg-[#FEF3C7]", text: "text-[#B45309]" },
  green: { bg: "bg-[#DCFCE7]", text: "text-[#047857]" },
  sand: { bg: "bg-[#EDE9FE]", text: "text-[#6D28D9]" },
} as const

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: typeof FileText
  label: string
  value: number
  hint: string
  tone: keyof typeof TONE_CLASSES
}) {
  const t = TONE_CLASSES[tone]
  return (
    <div className="rounded-[1.25rem] border border-[#E8E6E0] bg-white/95 p-4 shadow-apple-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[#C6B89E]">{label}</p>
          <p className="mt-1 text-2xl font-bold text-[#2F4F4F]">{value}</p>
        </div>
        <div className={`flex h-8 w-8 items-center justify-center rounded-full ${t.bg} ${t.text}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="mt-2 text-xs text-[#6B7280]">{hint}</p>
    </div>
  )
}

function CategoryTabButton({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean
  onClick: () => void
  label: string
  count: number
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-medium transition ${
        active
          ? "border-[#2F4F4F] bg-[#2F4F4F] text-white shadow-apple-sm"
          : "border-[#E8E6E0] bg-white text-[#4B5563] hover:border-[#2F4F4F]/40 hover:text-[#2F4F4F]"
      }`}
    >
      <span>{label}</span>
      <span
        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
          active ? "bg-white/20 text-white" : "bg-[#F8F7F4] text-[#6B7280]"
        }`}
      >
        {count}
      </span>
    </button>
  )
}

function FilterPill({
  icon: Icon,
  label,
  value,
  onChange,
  options,
}: {
  icon: typeof Tag
  label: string
  value: string
  onChange: (v: string) => void
  options: Array<{ value: string; label: string }>
}) {
  return (
    <div className="relative inline-flex items-center gap-2 rounded-full border border-[#E8E6E0] bg-[#F8F7F4] pl-3 pr-1">
      <Icon className="h-3.5 w-3.5 text-[#6B7280]" />
      <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#C6B89E]">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 cursor-pointer appearance-none rounded-full bg-transparent pr-8 text-sm font-medium text-[#2F4F4F] focus:outline-none"
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

function DocumentCard({ doc, onPreview }: { doc: DocumentItem; onPreview: () => void }) {
  const type = resolveDocumentType(doc)
  const isImage = type === "images" && doc.viewUrl
  const iconMeta = typeIconMeta(type)
  const updated = formatUpdatedAt(doc.uploadedAt)

  return (
    <article className="group flex flex-col overflow-hidden rounded-[1.5rem] border border-[#E8E6E0] bg-white shadow-apple-sm transition hover:-translate-y-0.5 hover:shadow-apple-md">
      <button
        type="button"
        onClick={onPreview}
        className="relative flex h-40 w-full items-center justify-center overflow-hidden bg-[#F8F7F4]"
        aria-label={`Vista previa de ${doc.name}`}
      >
        {isImage ? (
          <img
            src={doc.viewUrl ?? ""}
            alt={doc.name}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className={`flex h-16 w-16 items-center justify-center rounded-2xl ${iconMeta.bg} ${iconMeta.text}`}>
            <iconMeta.Icon className="h-7 w-7" />
          </div>
        )}
        <span className="absolute right-3 top-3 rounded-full bg-white/90 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#2F4F4F] shadow-apple-sm backdrop-blur">
          {formatFileLabel(doc)}
        </span>
      </button>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className="rounded-full border-[#E8E6E0] bg-[#F8F7F4] px-3 py-0.5 text-[10px] font-semibold uppercase tracking-[0.25em] text-[#C6B89E]">
            {doc.category}
          </Badge>
          <Badge className={`rounded-full border-transparent px-3 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] ${statusBadgeClass(doc.status)}`}>
            {formatStatus(doc.status)}
          </Badge>
        </div>
        <p className="line-clamp-2 font-heading text-base leading-snug text-[#2F4F4F]">{doc.name}</p>
        <p className="text-xs text-[#6B7280]">
          {doc.sizeLabel ?? "Tamaño no disponible"} · {updated}
        </p>
        <div className="mt-auto flex items-center justify-between gap-2 pt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onPreview}
            className="h-9 gap-2 rounded-full px-3 text-xs font-semibold text-[#2F4F4F] hover:bg-[#F4F1EA]"
          >
            <Eye className="h-3.5 w-3.5" />
            Vista previa
          </Button>
          {doc.downloadUrl ? (
            <Button
              asChild
              variant="outline"
              size="sm"
              className="h-9 gap-2 rounded-full border-[#E8E6E0] bg-white px-3 text-xs font-semibold text-[#2F4F4F] hover:bg-[#F4F1EA]"
            >
              <a href={doc.downloadUrl} download={doc.name}>
                <Download className="h-3.5 w-3.5" />
                Descargar
              </a>
            </Button>
          ) : null}
        </div>
      </div>
    </article>
  )
}

function DocumentRow({ doc, onPreview }: { doc: DocumentItem; onPreview: () => void }) {
  const type = resolveDocumentType(doc)
  const iconMeta = typeIconMeta(type)
  const updated = formatUpdatedAt(doc.uploadedAt)

  return (
    <li className="rounded-[1.25rem] border border-[#E8E6E0] bg-white/95 shadow-apple-sm transition hover:shadow-apple-md">
      <div className="flex items-center gap-4 p-4 sm:p-5">
        <div className={`hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl sm:flex ${iconMeta.bg} ${iconMeta.text}`}>
          <iconMeta.Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="rounded-full border-[#E8E6E0] bg-[#F8F7F4] px-3 py-0.5 text-[10px] font-semibold uppercase tracking-[0.25em] text-[#C6B89E]">
              {doc.category}
            </Badge>
            <Badge className="rounded-full border-transparent bg-[#2F4F4F]/90 px-3 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-white">
              {formatFileLabel(doc)}
            </Badge>
            <Badge className={`rounded-full border-transparent px-3 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] ${statusBadgeClass(doc.status)}`}>
              {formatStatus(doc.status)}
            </Badge>
          </div>
          <p className="mt-2 truncate font-heading text-sm font-semibold text-[#2F4F4F] sm:text-base">{doc.name}</p>
          <p className="text-xs text-[#6B7280]">
            {doc.sizeLabel ?? "Tamaño no disponible"} · {updated}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={onPreview}
            aria-label={`Vista previa de ${doc.name}`}
            className="h-9 w-9 rounded-full text-[#2F4F4F] hover:bg-[#F4F1EA]"
          >
            <Eye className="h-4 w-4" />
          </Button>
          {doc.downloadUrl ? (
            <Button
              asChild
              variant="ghost"
              size="icon"
              aria-label={`Descargar ${doc.name}`}
              className="h-9 w-9 rounded-full text-[#2F4F4F] hover:bg-[#F4F1EA]"
            >
              <a href={doc.downloadUrl} download={doc.name}>
                <Download className="h-4 w-4" />
              </a>
            </Button>
          ) : null}
        </div>
      </div>
    </li>
  )
}

function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className="rounded-[1.5rem] border border-dashed border-[#E8E6E0] bg-white/60 px-8 py-16 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#F4F1EA] text-[#C6B89E]">
        <Folder className="h-5 w-5" />
      </div>
      <p className="mt-3 font-heading text-lg text-[#2F4F4F]">
        {hasFilters ? "Sin resultados con esos filtros" : "Aún no hay documentos publicados"}
      </p>
      <p className="mt-1 text-sm text-[#6B7280]">
        {hasFilters
          ? "Prueba a relajar los filtros o busca por otro término."
          : "Cuando tu equipo Terrazea publique documentos, aparecerán aquí."}
      </p>
    </div>
  )
}

// -----------------------------------------------------------------------------
// Modal de preview. Detecta el tipo y elige visor:
//  · imagen → <img>
//  · PDF    → <iframe> con la URL directa
//  · office → <iframe> con Microsoft Office Online Viewer (más fiable que
//             Google Docs Viewer para xlsx/docx)
//  · otros  → mensaje + botón descargar
//
// Además añadimos un timeout de 8 s: si el iframe no ha disparado onLoad para
// entonces, asumimos que el visor no responde y mostramos el fallback para
// que el usuario tenga al menos el botón de abrir/descargar.
// -----------------------------------------------------------------------------

const PREVIEW_TIMEOUT_MS = 8000

function DocumentPreview({ doc, onClose }: { doc: DocumentItem | null; onClose: () => void }) {
  const [iframeLoading, setIframeLoading] = useState(true)
  const [iframeFailed, setIframeFailed] = useState(false)

  useEffect(() => {
    if (!doc) return
    setIframeLoading(true)
    setIframeFailed(false)

    // Timeout de seguridad: si el visor externo no responde, mostramos fallback
    // en vez de dejar al usuario viendo un spinner infinito.
    const timeoutId = window.setTimeout(() => {
      setIframeLoading(false)
      setIframeFailed(true)
    }, PREVIEW_TIMEOUT_MS)

    // Cerrar con Escape.
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKey)
    // Bloquear scroll del body mientras está abierto.
    const previous = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      window.clearTimeout(timeoutId)
      document.removeEventListener("keydown", onKey)
      document.body.style.overflow = previous
    }
  }, [doc, onClose])

  if (!doc) return null

  const type = resolveDocumentType(doc)
  const previewSrc = buildPreviewUrl(doc, type)
  const hasPreview = Boolean(previewSrc)
  const externalUrl = doc.viewUrl ?? null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 backdrop-blur-sm sm:p-6"
      role="dialog"
      aria-modal="true"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="relative flex h-full max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-[1.75rem] border border-white/30 bg-white shadow-apple-xl">
        {/* Header del modal */}
        <header className="flex items-start justify-between gap-4 border-b border-[#E8E6E0] bg-white/95 px-5 py-4 sm:px-6">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[#C6B89E]">Vista previa</p>
            <h2 className="mt-1 truncate font-heading text-lg text-[#2F4F4F] sm:text-xl">{doc.name}</h2>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[#6B7280]">
              <Badge className="rounded-full border-[#E8E6E0] bg-[#F8F7F4] px-2.5 py-0 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#C6B89E]">
                {doc.category}
              </Badge>
              <Badge className="rounded-full border-transparent bg-[#2F4F4F]/90 px-2.5 py-0 text-[10px] font-semibold uppercase tracking-[0.2em] text-white">
                {formatFileLabel(doc)}
              </Badge>
              <span>{doc.sizeLabel ?? "Tamaño no disponible"}</span>
              <span className="text-[#D6D2C4]">·</span>
              <span>{formatUpdatedAt(doc.uploadedAt)}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F8F7F4] text-[#2F4F4F] transition hover:bg-[#E8E6E0]"
            aria-label="Cerrar vista previa"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        {/* Body con el visor */}
        <div className="relative flex-1 overflow-auto bg-[#0F172A]">
          {hasPreview ? (
            <>
              {iframeLoading ? (
                <div className="absolute inset-0 flex items-center justify-center text-white/70">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : null}

              {type === "images" ? (
                <div className="flex h-full min-h-[50vh] items-center justify-center bg-[#0F172A] p-4">
                  <img
                    src={previewSrc ?? ""}
                    alt={doc.name}
                    className="max-h-full max-w-full rounded-xl object-contain shadow-2xl"
                    onLoad={() => setIframeLoading(false)}
                    onError={() => {
                      setIframeLoading(false)
                      setIframeFailed(true)
                    }}
                  />
                </div>
              ) : (
                <iframe
                  key={previewSrc ?? ""}
                  src={previewSrc ?? ""}
                  title={doc.name}
                  className="h-full min-h-[70vh] w-full border-0"
                  onLoad={() => setIframeLoading(false)}
                  onError={() => {
                    setIframeLoading(false)
                    setIframeFailed(true)
                  }}
                />
              )}

              {iframeFailed ? <PreviewUnavailable message="No hemos podido incrustar el archivo. Ábrelo en una nueva pestaña o descárgalo." /> : null}
            </>
          ) : (
            <PreviewUnavailable message="Este tipo de archivo no tiene vista previa incrustada." />
          )}
        </div>

        {/* Footer con acciones */}
        <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-[#E8E6E0] bg-white/95 px-5 py-3 sm:px-6">
          {externalUrl ? (
            <Button
              asChild
              variant="outline"
              className="h-10 gap-2 rounded-full border-[#E8E6E0] bg-white text-xs font-semibold text-[#2F4F4F] hover:bg-[#F4F1EA]"
            >
              <a href={externalUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3.5 w-3.5" />
                Abrir en nueva pestaña
              </a>
            </Button>
          ) : null}
          {doc.downloadUrl ? (
            <Button
              asChild
              className="h-10 gap-2 rounded-full bg-[#2F4F4F] text-xs font-semibold text-white hover:bg-[#1F3535]"
            >
              <a href={doc.downloadUrl} download={doc.name}>
                <Download className="h-3.5 w-3.5" />
                Descargar
              </a>
            </Button>
          ) : null}
        </footer>
      </div>
    </div>
  )
}

function PreviewUnavailable({ message }: { message: string }) {
  return (
    <div className="flex h-full min-h-[50vh] flex-col items-center justify-center gap-3 bg-[#0F172A] px-6 text-center text-white/70">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10">
        <File className="h-5 w-5" />
      </div>
      <p className="max-w-sm text-sm">{message}</p>
    </div>
  )
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function buildPreviewUrl(doc: DocumentItem, type: ReturnType<typeof resolveDocumentType>): string | null {
  if (!doc.viewUrl) return null

  if (type === "images" || type === "pdf") {
    // Imagen y PDF los incrusta el navegador directamente desde la URL pública.
    return doc.viewUrl
  }

  if (type === "docs" || type === "spreadsheets") {
    // Microsoft Office Online Viewer es más fiable que Google Docs Viewer para
    // archivos .xlsx/.docx. Requiere que la URL origen sea HTTPS y pública
    // (Supabase Storage con getPublicUrl lo es).
    const encoded = encodeURIComponent(doc.viewUrl)
    return `https://view.officeapps.live.com/op/embed.aspx?src=${encoded}`
  }

  // Para otros formatos (zip, txt…) dejamos que el iframe lo intente por si el
  // navegador sabe renderizarlo; si falla, onError muestra el fallback.
  return doc.viewUrl
}

function resolveDocumentType(doc: DocumentItem): "images" | "pdf" | "docs" | "spreadsheets" | "others" {
  const type = doc.fileType?.toLowerCase() ?? ""
  if (type.includes("image") || /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(doc.name)) return "images"
  if (type.includes("pdf") || doc.name.toLowerCase().endsWith(".pdf")) return "pdf"
  if (type.includes("sheet") || /\.(xls|xlsx|csv)$/i.test(doc.name)) return "spreadsheets"
  if (type.includes("word") || /\.(doc|docx)$/i.test(doc.name)) return "docs"
  return "others"
}

function typeIconMeta(type: ReturnType<typeof resolveDocumentType>): {
  Icon: typeof FileText
  bg: string
  text: string
} {
  switch (type) {
    case "images":
      return { Icon: ImageIcon, bg: "bg-[#EDE9FE]", text: "text-[#6D28D9]" }
    case "pdf":
      return { Icon: FileText, bg: "bg-[#FEE2E2]", text: "text-[#B91C1C]" }
    case "docs":
      return { Icon: FileText, bg: "bg-[#DBEAFE]", text: "text-[#1D4ED8]" }
    case "spreadsheets":
      return { Icon: FileSpreadsheet, bg: "bg-[#DCFCE7]", text: "text-[#047857]" }
    default:
      return { Icon: File, bg: "bg-[#F4F1EA]", text: "text-[#6B7280]" }
  }
}

function formatDate(value: string | null): string {
  if (!value) return "Sin fecha"
  return new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value))
}

function formatUpdatedAt(value: string | null): string {
  const formatted = formatDate(value)
  if (formatted === "Sin fecha") return "Pendiente"
  return formatted
}

function formatStatus(status: DocumentItem["status"]): string {
  return String(status).replace(/_/g, " ").replace(/^\w/u, (char) => char.toUpperCase())
}

function statusBadgeClass(status: DocumentItem["status"]): string {
  switch (status) {
    case "aprobado":
      return "bg-[#DCFCE7] text-[#166534]"
    case "vigente":
      return "bg-[#DBEAFE] text-[#1D4ED8]"
    case "actualizado":
      return "bg-[#FFF7ED] text-[#C2410C]"
    default:
      return "bg-[#F4F1EA] text-[#6B7280]"
  }
}

function formatFileLabel(doc: DocumentItem): string {
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
