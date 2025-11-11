export type DocumentStatus = "aprobado" | "vigente" | "actualizado" | string

export interface DocumentRow {
  id: string
  name: string
  category: string
  fileType: string
  sizeLabel: string | null
  uploadedAt: string | null
  status: DocumentStatus
  viewUrl: string | null
  downloadUrl: string | null
}

export interface DocumentsStats {
  total: number
  newThisWeek: number
  plans: number
  certificates: number
  warranties: number
  budgets: number
}

export interface DocumentsData {
  documents: DocumentRow[]
  stats: DocumentsStats
}
