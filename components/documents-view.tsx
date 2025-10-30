"use client"

import { useMemo, useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ChevronRight, Download, Eye, File, FileSpreadsheet, FileText, Filter, ImageIcon, Search } from "lucide-react"

import type { DocumentsData } from "@app/types/documents"

export function DocumentsView({ data }: { data: DocumentsData }) {
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

  return (
    <div className="space-y-8">
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

      <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
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
        <TabsList className="border border-[#e8e6e0] bg-white">
          <TabsTrigger value="all">Todos</TabsTrigger>
          <TabsTrigger value="plans">Planos</TabsTrigger>
          <TabsTrigger value="certificates">Certificados</TabsTrigger>
          <TabsTrigger value="legal">Legal</TabsTrigger>
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
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-[#e8e6e0] p-4">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Badge className="bg-[#2f4f4f] text-white">{doc.fileType}</Badge>
          <span className="text-sm font-medium text-[#2f4f4f]">{doc.name}</span>
        </div>
        <p className="text-xs text-[#6b7280]">{doc.category}</p>
        <p className="text-xs text-[#9ca3af]">Actualizado el {formatDate(doc.uploadedAt)}</p>
      </div>
      <div className="flex items-center gap-4 text-sm text-[#6b7280]">
        <span>{doc.sizeLabel ?? "—"}</span>
        <Badge className={statusBadgeClass(doc.status)}>{formatStatus(doc.status)}</Badge>
        <Button variant="ghost" size="icon" className="text-[#2f4f4f] hover:bg-[#f4f1ea]">
          <Eye className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="text-[#2f4f4f] hover:bg-[#f4f1ea]">
          <Download className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

function formatDate(value: string | null): string {
  if (!value) return "Sin fecha"
  return new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value))
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
