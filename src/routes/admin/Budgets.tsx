import type React from "react"
import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { TerrazeaBrand } from "@/components/terrazea-brand"
import {
  fetchAdminClients,
  fetchAdminBudgetProducts,
  createAdminBudgetProduct,
  updateAdminBudgetProduct,
  deleteAdminBudgetProduct,
  fetchAdminBudgets,
  createAdminBudget,
  updateAdminBudget,
  deleteAdminBudget,
} from "@app/lib/api/admin"
import type { AdminClientOverview, AdminBudgetProduct, AdminBudgetRecord, AdminBudgetLine } from "@app/types/admin"
import {
  AlertCircle,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Download,
  FileSpreadsheet,
  Image as ImageIcon,
  Loader2,
  PackagePlus,
  ShoppingCart,
  UserPlus,
  X,
  CreditCard,
} from "lucide-react"

type CatalogProduct = {
  id: string
  name: string
  description?: string | null
  price: number
  tags: string[]
  imageDataUrl?: string | null
  createdAt: string
}

type BudgetLine = AdminBudgetLine
type BudgetRecord = AdminBudgetRecord

const PRODUCTS_STORAGE_KEY = "terrazea_admin_budget_products_v1"
const BUDGETS_STORAGE_KEY = "terrazea_admin_budgets_v1"

function safeId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID()
  return Math.random().toString(36).slice(2)
}

function formatCurrency(amount: number, currency = "EUR") {
  if (!Number.isFinite(amount)) return "—"
  try {
    return new Intl.NumberFormat("es-ES", { style: "currency", currency }).format(amount)
  } catch {
    return `${amount.toFixed(2)} ${currency}`
  }
}

function getApiErrorMessage(error: unknown, fallback: string): string {
  try {
    if (error && typeof error === "object" && "response" in error) {
      const response = (error as any).response
      if (response && typeof response === "object" && "data" in response) {
        const data = (response as any).data
        if (data && typeof data === "object" && typeof (data as any).message === "string") {
          const message = (data as any).message.trim()
          if (message.length > 0) return message
        }
      }
    }
  } catch {
    // Ignoramos y usamos el mensaje por defecto
  }
  return fallback
}

const INITIAL_PRODUCT_FORM = {
  name: "",
  description: "",
  price: "",
  tags: "",
  imageDataUrl: null as string | null,
}

const INITIAL_BUDGET_FORM = {
  title: "",
  clientType: "existing" as "existing" | "new",
  clientId: "",
  clientName: "",
  clientEmail: "",
  notes: "",
  taxRate: 21 as number,
}

export function AdminBudgetsPage() {
  const navigate = useNavigate()
  const [products, setProducts] = useState<CatalogProduct[]>([])
  const [budgets, setBudgets] = useState<BudgetRecord[]>([])
  const [activeBudgetId, setActiveBudgetId] = useState<string | null>(null)
  const [clients, setClients] = useState<AdminClientOverview[]>([])
  const [clientsLoading, setClientsLoading] = useState(false)
  const [catalogOpen, setCatalogOpen] = useState(false)

  const [productForm, setProductForm] = useState(INITIAL_PRODUCT_FORM)
  const [productError, setProductError] = useState<string | null>(null)
  const [editingProduct, setEditingProduct] = useState<CatalogProduct | null>(null)
  const [editProductOpen, setEditProductOpen] = useState(false)
  const [editProductForm, setEditProductForm] = useState(INITIAL_PRODUCT_FORM)

  const [budgetForm, setBudgetForm] = useState(INITIAL_BUDGET_FORM)
  const [budgetLines, setBudgetLines] = useState<BudgetLine[]>([])
  const [expandedLineId, setExpandedLineId] = useState<string | null>(null)
  const [budgetError, setBudgetError] = useState<string | null>(null)
  const [budgetSuccess, setBudgetSuccess] = useState<string | null>(null)

  const [catalogSearch, setCatalogSearch] = useState("")
  const [catalogTagFilter, setCatalogTagFilter] = useState<string | null>(null)
  const [catalogPriceMin, setCatalogPriceMin] = useState<string>("")
  const [catalogPriceMax, setCatalogPriceMax] = useState<string>("")

  useEffect(() => {
    void (async () => {
      try {
        const [serverProducts, serverBudgets] = await Promise.all([fetchAdminBudgetProducts(), fetchAdminBudgets()])

        setProducts(
          serverProducts.map((product: AdminBudgetProduct) => ({
            id: product.id,
            name: product.name,
            description: product.description,
            price: product.unitPrice,
            tags: product.tags ?? [],
            imageDataUrl: product.imageUrl ?? null,
            createdAt: product.createdAt,
          })),
        )

        setBudgets(
          (serverBudgets ?? []).map((budget) => ({
            ...budget,
            taxRate: typeof budget.taxRate === "number" ? budget.taxRate : 21,
          })),
        )
      } catch (error) {
        console.error("No se pudieron cargar productos o presupuestos", error)
        setProductError(
          getApiErrorMessage(
            error,
            "No se pudieron cargar los productos del catálogo. Inténtalo de nuevo en unos minutos.",
          ),
        )
      }
    })()
  }, [])

  useEffect(() => {
    setClientsLoading(true)
    void (async () => {
      try {
        const data = await fetchAdminClients()
        setClients(data)
      } catch (error) {
        console.error("Error obteniendo clientes", error)
        setBudgetError(
          getApiErrorMessage(error, "No se pudieron cargar los clientes. Inténtalo de nuevo en unos minutos."),
        )
        setClients([])
      } finally {
        setClientsLoading(false)
      }
    })()
  }, [])

  useEffect(() => {
    if (budgetLines.length === 0) {
      const firstProduct = products[0]
      const id = safeId()
      setBudgetLines([
        {
          id,
          parentId: null,
          productId: firstProduct?.id,
          name: firstProduct?.name ?? "Producto personalizado",
          price: firstProduct ? firstProduct.price.toString() : "",
          quantity: 1,
          imageDataUrl: firstProduct?.imageDataUrl,
        },
      ])
      setExpandedLineId(id)
    }
  }, [products, budgetLines.length])

  const budgetTotal = useMemo(
    () =>
      budgetLines.reduce((acc, line) => {
        const priceNumber = Number(line.price.toString().replace(",", "."))
        const qty = Number(line.quantity)
        if (!Number.isFinite(priceNumber) || !Number.isFinite(qty)) return acc
        return acc + priceNumber * Math.max(qty, 0)
      }, 0),
    [budgetLines],
  )

  const handleProductImage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      setProductForm((prev) => ({ ...prev, imageDataUrl: null }))
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      setProductForm((prev) => ({ ...prev, imageDataUrl: reader.result as string }))
    }
    reader.readAsDataURL(file)
  }

  const handleEditProductImage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      setEditProductForm((prev) => ({ ...prev, imageDataUrl: null }))
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      setEditProductForm((prev) => ({ ...prev, imageDataUrl: reader.result as string }))
    }
    reader.readAsDataURL(file)
  }

  const addProduct = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setProductError(null)
    const priceNumber = Number(productForm.price.toString().replace(",", "."))
    if (!productForm.name.trim() || !Number.isFinite(priceNumber) || priceNumber <= 0) {
      setProductError("Añade un nombre y un precio válido.")
      return
    }

    const rawTags = productForm.tags
      .split(",")
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0)

    void (async () => {
      try {
        const imagePayload =
          productForm.imageDataUrl && productForm.imageDataUrl.length > 10 ? productForm.imageDataUrl : undefined

        const created = await createAdminBudgetProduct({
          name: productForm.name.trim(),
          description: productForm.description?.trim() || undefined,
          unitPrice: priceNumber,
          tags: rawTags,
          imageDataUrl: imagePayload,
        })

        const mapped: CatalogProduct = {
          id: created.id,
          name: created.name,
          description: created.description,
          price: created.unitPrice,
          tags: created.tags ?? [],
          imageDataUrl: created.imageUrl ?? null,
          createdAt: created.createdAt,
        }

        setProducts((prev) => [mapped, ...prev])
        setProductForm(INITIAL_PRODUCT_FORM)
      } catch (error) {
        console.error("No se pudo guardar el producto", error)
        setProductError(
          getApiErrorMessage(error, "No se pudo guardar el producto en el catálogo. Inténtalo de nuevo."),
        )
      }
    })()
  }

  const saveEditedProduct = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!editingProduct) return

    setProductError(null)
    const priceNumber = Number(editProductForm.price.toString().replace(",", "."))
    if (!editProductForm.name.trim() || !Number.isFinite(priceNumber) || priceNumber <= 0) {
      setProductError("Añade un nombre y un precio válido.")
      return
    }

    const rawTags = editProductForm.tags
      .split(",")
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0)

    const imagePayload =
      editProductForm.imageDataUrl && editProductForm.imageDataUrl.length > 10
        ? editProductForm.imageDataUrl
        : undefined

    void (async () => {
      try {
        const updated = await updateAdminBudgetProduct(editingProduct.id, {
          name: editProductForm.name.trim(),
          description: editProductForm.description?.trim() || null,
          unitPrice: priceNumber,
          tags: rawTags,
          imageDataUrl: imagePayload,
        })

        const mapped: CatalogProduct = {
          id: updated.id,
          name: updated.name,
          description: updated.description,
          price: updated.unitPrice,
          tags: updated.tags ?? [],
          imageDataUrl: updated.imageUrl ?? editingProduct.imageDataUrl ?? null,
          createdAt: updated.createdAt,
        }

        setProducts((prev) => prev.map((p) => (p.id === mapped.id ? mapped : p)))
        setEditProductOpen(false)
        setEditingProduct(null)
      } catch (error) {
        console.error("No se pudo guardar el producto", error)
        setProductError(
          getApiErrorMessage(error, "No se pudo guardar el producto en el catálogo. Inténtalo de nuevo."),
        )
      }
    })()
  }

  const addBudgetLine = () => {
    const baseProduct = products[0]
    const id = safeId()
    setBudgetLines((prev) => [
      ...prev,
      {
        id,
        parentId: null,
        productId: baseProduct?.id,
        name: baseProduct?.name ?? "Producto personalizado",
        price: baseProduct ? baseProduct.price.toString() : "",
        quantity: 1,
        imageDataUrl: baseProduct?.imageDataUrl,
      },
    ])
    setExpandedLineId(id)
  }

  const addBudgetSubLine = (parentId: string) => {
    const parent = budgetLines.find((line) => line.id === parentId)
    const id = safeId()
    const baseName = ""
    const newLine: BudgetLine = {
      id,
      parentId,
      productId: parent?.productId,
      name: baseName,
      price: "",
      quantity: 1,
      imageDataUrl: parent?.imageDataUrl,
      notes: "",
    }

    setBudgetLines((prev) => {
      const index = prev.findIndex((line) => line.id === parentId)
      if (index === -1) return [...prev, newLine]
      const next = [...prev]
      // Insert justo después del padre y de sus sublíneas actuales
      let insertIndex = index + 1
      while (insertIndex < next.length && next[insertIndex].parentId === parentId) {
        insertIndex += 1
      }
      next.splice(insertIndex, 0, newLine)
      return next
    })
    setExpandedLineId(parentId)
  }

  const updateBudgetLine = (lineId: string, patch: Partial<BudgetLine>) => {
    setBudgetLines((prev) => prev.map((line) => (line.id === lineId ? { ...line, ...patch } : line)))
  }

  const handleLineProductChange = (lineId: string, productId: string) => {
    const product = products.find((item) => item.id === productId)
    updateBudgetLine(lineId, {
      productId,
      name: product?.name ?? "Producto personalizado",
      price: product ? product.price.toString() : "",
      imageDataUrl: product?.imageDataUrl,
      notes: product?.description,
    })
  }

  const removeBudgetLine = (lineId: string) => {
    setExpandedLineId((current) => (current === lineId ? null : current))
    setBudgetLines((prev) => prev.filter((line) => line.id !== lineId && line.parentId !== lineId))
  }

  const resetBudgetForm = () => {
    setBudgetForm(INITIAL_BUDGET_FORM)
    setBudgetLines([])
    setExpandedLineId(null)
    setActiveBudgetId(null)
  }

  const loadBudget = (budget: BudgetRecord, options?: { autoPrint?: boolean }) => {
    setBudgetError(null)
    setBudgetSuccess(null)

    setActiveBudgetId(budget.id)
    setBudgetForm({
      title: budget.title,
      clientType: budget.clientType,
      clientId: budget.clientId ?? "",
      clientName: budget.clientName,
      clientEmail: budget.clientEmail ?? "",
      notes: budget.notes ?? "",
      taxRate: budget.taxRate ?? 21,
    })
    setBudgetLines(budget.items as BudgetLine[])
    setExpandedLineId(null)
    setBudgetSuccess("Presupuesto cargado. Ya puedes editarlo o descargarlo en PDF.")

    // Llevamos al usuario al inicio del formulario
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" })
    }

    if (options?.autoPrint) {
      // Damos un pequeño margen para que React pinte la vista previa antes de llamar a print
      setTimeout(() => {
        handlePrintPreview()
      }, 300)
    }
  }

  const handleGeneratePaymentFromBudget = (budget: BudgetRecord) => {
    const params = new URLSearchParams()
    params.set("fromBudgetId", budget.id)
    params.set("budgetTitle", budget.title)
    params.set("budgetTotal", String(budget.total ?? 0))
    if (budget.clientName) params.set("budgetClient", budget.clientName)
    navigate(`/dashboard/payments?${params.toString()}`)
  }

  const saveBudget = async () => {
    setBudgetError(null)
    setBudgetSuccess(null)
    const trimmedTitle = budgetForm.title.trim()
    if (!trimmedTitle) {
      setBudgetError("Ponle un título al presupuesto para reconocerlo rápido.")
      return
    }
    if (budgetLines.length === 0) {
      setBudgetError("Añade al menos un producto al presupuesto.")
      return
    }

    let targetClientName = budgetForm.clientName.trim()
    let targetClientEmail = budgetForm.clientEmail.trim()
    let targetClientId: string | undefined

    if (budgetForm.clientType === "existing") {
      const selectedClient = clients.find((client) => client.id === budgetForm.clientId)
      if (!selectedClient) {
        setBudgetError("Selecciona un cliente existente o elige crear uno nuevo.")
        return
      }
      targetClientName = selectedClient.fullName
      targetClientEmail = selectedClient.email
      targetClientId = selectedClient.id
    } else {
      if (!targetClientName || !targetClientEmail) {
        setBudgetError("Introduce nombre y correo del nuevo cliente.")
        return
      }
    }

    const normalizedLines = budgetLines.map((line) => ({
      ...line,
      name: line.name.trim() || "Línea sin nombre",
      quantity: Math.max(1, Number(line.quantity) || 1),
      price: line.price.toString().trim(),
    }))

    const payload = {
      title: trimmedTitle,
      clientType: budgetForm.clientType,
      clientId: targetClientId ?? null,
      clientName: targetClientName,
      clientEmail: targetClientEmail,
      items: normalizedLines,
      notes: budgetForm.notes?.trim() || undefined,
      total: budgetTotal,
      taxRate: Number.isFinite(budgetForm.taxRate) ? budgetForm.taxRate : 21,
    }

    try {
      let saved: BudgetRecord
      if (activeBudgetId) {
        saved = await updateAdminBudget(activeBudgetId, payload)
      } else {
        saved = await createAdminBudget(payload as any)
      }

      setBudgets((prev) => {
        const existingIndex = prev.findIndex((item) => item.id === saved.id)
        if (existingIndex === -1) {
          return [saved, ...prev]
        }
        const next = [...prev]
        next[existingIndex] = saved
        return next
      })

      setBudgetSuccess("Presupuesto guardado correctamente en Terrazea.")
      resetBudgetForm()
    } catch (error) {
      console.error("No se pudo guardar el presupuesto", error)
      setBudgetError(
        getApiErrorMessage(
          error,
          "No se pudo guardar el presupuesto en la base de datos. Revisa los datos e inténtalo de nuevo.",
        ),
      )
    }
  }

  const totalProducts = products.length
  const totalBudgets = budgets.length

  const selectedClient = useMemo(
    () => clients.find((client) => client.id === budgetForm.clientId),
    [clients, budgetForm.clientId],
  )

  const catalogTags = useMemo(() => {
    const set = new Set<string>()
    for (const product of products) {
      for (const tag of product.tags ?? []) {
        const trimmed = tag.trim()
        if (trimmed.length > 0) set.add(trimmed)
      }
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "es"))
  }, [products])

  const filteredProducts = useMemo(() => {
    const search = catalogSearch.trim().toLowerCase()
    const min = Number(catalogPriceMin.replace(",", "."))
    const max = Number(catalogPriceMax.replace(",", "."))

    return products.filter((product) => {
      if (search.length > 0) {
        const haystack = `${product.name} ${product.description ?? ""}`.toLowerCase()
        if (!haystack.includes(search)) return false
      }

      if (catalogTagFilter) {
        if (!product.tags || !product.tags.map((t) => t.toLowerCase()).includes(catalogTagFilter.toLowerCase())) {
          return false
        }
      }

      if (Number.isFinite(min) && min > 0 && product.price < min) return false
      if (Number.isFinite(max) && max > 0 && product.price > max) return false

      return true
    })
  }, [products, catalogSearch, catalogTagFilter, catalogPriceMin, catalogPriceMax])

  const handlePrintPreview = () => {
    if (typeof window === "undefined") return

    const previewElement = document.getElementById("budget-preview")
    if (!previewElement) {
      window.print()
      return
    }

    const inlineStyles = `
      @page {
        size: auto;
        margin: 16mm;
      }

      html,
      body {
        width: 100%;
        min-height: 100%;
        margin: 0;
        padding: 0;
        background: #f6f4f1;
      }

      body {
        font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        color: #111827;
        display: flex;
        justify-content: center;
        align-items: flex-start;
      }

      .budget-wrapper {
        width: 100%;
        padding: 6mm 0 12mm;
        display: flex;
        justify-content: center;
      }

      #budget-preview {
        width: min(840px, 100%);
        max-width: 100%;
        margin: 0 auto;
      }

      table {
        border-collapse: collapse;
        width: 100%;
      }

      *,
      *::before,
      *::after {
        box-sizing: border-box;
      }
    `

    const headStyles = Array.from(document.head.querySelectorAll("style, link[rel='stylesheet']"))
      .map((node) => node.outerHTML)
      .join("\n")

    const previewHtml = previewElement.outerHTML

    const printWindow = window.open("", "_blank", "width=960,height=1200")
    if (!printWindow) {
      window.print()
      return
    }

    printWindow.document.open()
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Presupuesto Terrazea</title>
          ${headStyles}
          <style>${inlineStyles}</style>
        </head>
        <body>
          <div class="budget-wrapper">
            ${previewHtml}
          </div>
        </body>
      </html>
    `)
    printWindow.document.close()

    const triggerPrint = () => {
      const cleanup = () => {
        try {
          if (!printWindow.closed) {
            printWindow.close()
          }
        } catch {
          // Ignored: window might already be closed or blocked by the browser
        }
      }

      const handleAfterPrint = (_event: Event) => {
        cleanup()
        printWindow.removeEventListener("afterprint", handleAfterPrint)
      }

      printWindow.addEventListener("afterprint", handleAfterPrint)
      printWindow.focus()
      printWindow.print()
    }

    if (printWindow.document.readyState === "complete") {
      triggerPrint()
    } else {
      printWindow.onload = triggerPrint
    }
  }

  return (
    <div className="space-y-10">
      <section className="rounded-[2rem] border border-[#E8E6E0] bg-white/90 p-8 shadow-apple-xl">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#E8E6E0] bg-[#F8F7F4] px-4 py-2 text-xs uppercase tracking-[0.3em] text-[#C6B89E]">
              <FileSpreadsheet className="h-4 w-4" />
              Presupuestos
            </span>
            <h1 className="font-heading text-3xl font-semibold text-[#2F4F4F]">Configura y envía presupuestos</h1>
            <p className="text-sm text-[#6B7280]">
              Crea un catálogo de productos propio (con o sin imagen) y monta presupuestos para nuevos clientes o cuentas
              existentes sin salir del panel.
            </p>
          </div>
          <div className="flex w-full max-w-xl flex-col gap-3">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <SummaryTile icon={PackagePlus} label="Productos" value={totalProducts} />
              <SummaryTile icon={ShoppingCart} label="Presupuestos" value={totalBudgets} />
              <SummaryTile icon={CheckCircle} label="Valor bruto" value={formatCurrency(budgetTotal)} accent />
            </div>
            <div className="flex justify-end">
              <Button
                variant="outline"
                className="rounded-full border-[#2F4F4F] px-5 font-semibold text-[#2F4F4F] shadow-apple hover:bg-[#2F4F4F] hover:text-white"
                onClick={() => setCatalogOpen(true)}
              >
                Gestionar catálogo
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="md:flex md:items-start md:gap-6">
        <div className="md:w-2/3 md:h-full md:overflow-y-auto md:pr-2">
          <Card className="rounded-[1.75rem] border border-[#E8E6E0] bg-white/95 shadow-apple-lg">
          <CardHeader className="space-y-2">
            <CardTitle className="flex items-center gap-2 text-[#2F4F4F]">
              <ShoppingCart className="h-5 w-5" />
              Crear presupuesto
            </CardTitle>
            <CardDescription className="text-[#6B7280]">Elige cliente, añade líneas y guarda el borrador.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="budget-title" className="text-xs font-semibold uppercase tracking-[0.3em] text-[#C6B89E]">
                  Título interno
                </Label>
                <Input
                  id="budget-title"
                  value={budgetForm.title}
                  onChange={(event) => setBudgetForm((prev) => ({ ...prev, title: event.target.value }))}
                  placeholder="Presupuesto reforma ático"
                  className="h-12 rounded-[1rem] border border-[#E8E6E0] bg-[#F8F7F4] px-4 text-sm text-[#2F4F4F]"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-[0.3em] text-[#C6B89E]">Tipo de cliente</Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setBudgetForm((prev) => ({ ...prev, clientType: "existing" }))}
                    className={`flex items-center justify-center gap-2 rounded-[0.9rem] border px-3 py-2 text-sm transition ${
                      budgetForm.clientType === "existing" ? "border-[#2F4F4F] bg-[#2F4F4F] text-white" : "border-[#E8E6E0] bg-[#F8F7F4] text-[#2F4F4F]"
                    }`}
                  >
                    <UserPlus className="h-4 w-4" />
                    Existente
                  </button>
                  <button
                    type="button"
                    onClick={() => setBudgetForm((prev) => ({ ...prev, clientType: "new" }))}
                    className={`flex items-center justify-center gap-2 rounded-[0.9rem] border px-3 py-2 text-sm transition ${
                      budgetForm.clientType === "new" ? "border-[#2F4F4F] bg-[#2F4F4F] text-white" : "border-[#E8E6E0] bg-[#F8F7F4] text-[#2F4F4F]"
                    }`}
                  >
                    <UserPlus className="h-4 w-4" />
                    Nuevo
                  </button>
                </div>
              </div>
            </div>

            {budgetForm.clientType === "existing" ? (
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-[0.3em] text-[#C6B89E]">Selecciona cliente</Label>
                <div className="relative">
                  <select
                    value={budgetForm.clientId}
                    onChange={(event) => setBudgetForm((prev) => ({ ...prev, clientId: event.target.value }))}
                    className="w-full rounded-[1rem] border border-[#E8E6E0] bg-[#F8F7F4] px-4 py-3 text-sm text-[#2F4F4F] focus:border-[#2F4F4F] focus:outline-none"
                  >
                    <option value="">{clientsLoading ? "Cargando clientes..." : "Elige un cliente"}</option>
                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.fullName} · {client.email}
                      </option>
                    ))}
                  </select>
                  {clientsLoading ? (
                    <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-[#6B7280]" />
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-[0.3em] text-[#C6B89E]">Nombre del cliente</Label>
                  <Input
                    value={budgetForm.clientName}
                    onChange={(event) => setBudgetForm((prev) => ({ ...prev, clientName: event.target.value }))}
                    placeholder="Laura Martínez"
                    className="h-12 rounded-[1rem] border border-[#E8E6E0] bg-[#F8F7F4] px-4 text-sm text-[#2F4F4F]"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-[0.3em] text-[#C6B89E]">Correo</Label>
                  <Input
                    type="email"
                    value={budgetForm.clientEmail}
                    onChange={(event) => setBudgetForm((prev) => ({ ...prev, clientEmail: event.target.value }))}
                    placeholder="cliente@ejemplo.com"
                    className="h-12 rounded-[1rem] border border-[#E8E6E0] bg-[#F8F7F4] px-4 text-sm text-[#2F4F4F]"
                  />
                </div>
              </div>
            )}

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold uppercase tracking-[0.3em] text-[#C6B89E]">Líneas del presupuesto</Label>
                <Button type="button" variant="outline" className="rounded-full border-[#2F4F4F] text-[#2F4F4F]" onClick={addBudgetLine}>
                  Añadir línea
                </Button>
              </div>
              <div className="space-y-3">
                {budgetLines
                  .filter((line) => !line.parentId)
                  .map((line) => {
                    const childLines = budgetLines.filter((child) => child.parentId === line.id)
                    const lineSubtotal = Number(line.price) * Math.max(1, Number(line.quantity) || 1)
                    return (
                  <div key={line.id} className="space-y-2 rounded-[1.25rem] border border-[#E8E6E0] bg-[#F8F7F4] p-3">
                    <button
                      type="button"
                      className="flex w-full items-center justify-between gap-3 text-left"
                      onClick={() => setExpandedLineId((current) => (current === line.id ? null : line.id))}
                    >
                      <div className="flex items-center gap-2">
                        {expandedLineId === line.id ? (
                          <ChevronDown className="h-4 w-4 text-[#4B5563]" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-[#4B5563]" />
                        )}
                        <div>
                          <p className="text-sm font-medium text-[#2F4F4F]">
                            {line.name || "Línea sin nombre"}
                          </p>
                          <p className="text-xs text-[#6B7280]">
                            {Math.max(1, Number(line.quantity) || 1)} x{" "}
                            {line.price ? formatCurrency(Number(line.price)) : "—"}
                          </p>
                        </div>
                      </div>
                      <Badge variant="secondary" className="bg-white text-[#2F4F4F]">
                        {formatCurrency(lineSubtotal)}
                      </Badge>
                    </button>

                    {expandedLineId === line.id && (
                      <div className="space-y-3 pt-3">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-4">
                          <div className="flex-1 space-y-2">
                            <Label className="text-xs font-semibold uppercase tracking-[0.3em] text-[#C6B89E]">
                              Producto
                            </Label>
                            <select
                              value={line.productId ?? ""}
                              onChange={(event) => handleLineProductChange(line.id, event.target.value)}
                              className="w-full rounded-[0.9rem] border border-[#E8E6E0] bg-white px-3 py-2.5 text-sm text-[#2F4F4F] focus:border-[#2F4F4F] focus:outline-none"
                            >
                              <option value="">Personalizado</option>
                              {products.map((product) => (
                                <option key={product.id} value={product.id}>
                                  {product.name} ({formatCurrency(product.price)})
                                </option>
                              ))}
                            </select>
                            <Input
                              value={line.name}
                              onChange={(event) => updateBudgetLine(line.id, { name: event.target.value })}
                              placeholder="Nombre visible en el presupuesto"
                              className="h-11 rounded-[0.9rem] border border-[#E8E6E0] bg-white px-3 text-sm text-[#2F4F4F]"
                            />
                          </div>
                          <div className="grid w-full grid-cols-2 gap-3 lg:w-[320px]">
                            <div className="space-y-2">
                              <Label className="text-xs font-semibold uppercase tracking-[0.3em] text-[#C6B89E]">
                                Cantidad
                              </Label>
                              <Input
                                type="number"
                                min="1"
                                value={line.quantity}
                                onChange={(event) => updateBudgetLine(line.id, { quantity: Number(event.target.value) })}
                                className="h-11 rounded-[0.9rem] border border-[#E8E6E0] bg-white px-3 text-sm text-[#2F4F4F]"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs font-semibold uppercase tracking-[0.3em] text-[#C6B89E]">
                                Precio (€)
                              </Label>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                value={line.price}
                                onChange={(event) => updateBudgetLine(line.id, { price: event.target.value })}
                                className="h-11 rounded-[0.9rem] border border-[#E8E6E0] bg-white px-3 text-sm text-[#2F4F4F]"
                              />
                            </div>
                          </div>
                        </div>
                        <Textarea
                          value={line.notes ?? ""}
                          onChange={(event) => updateBudgetLine(line.id, { notes: event.target.value })}
                          placeholder="Notas o detalles específicos para este producto."
                          className="min-h-[80px] rounded-[0.9rem] border border-[#E8E6E0] bg-white px-3 text-sm text-[#2F4F4F]"
                        />
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-center gap-2 text-sm text-[#2F4F4F]">
                            {line.imageDataUrl ? (
                              <Badge className="bg-[#2F4F4F] text-white">Imagen disponible</Badge>
                            ) : (
                              <Badge className="bg-[#E8E6E0] text-[#2F4F4F]">Sin imagen</Badge>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              className="h-8 rounded-full border-[#E5E7EB] px-3 text-xs text-[#374151]"
                              onClick={() => addBudgetSubLine(line.id)}
                            >
                              Añadir sublínea
                            </Button>
                          <Button variant="ghost" className="text-[#B91C1C]" onClick={() => removeBudgetLine(line.id)}>
                            <X className="mr-2 h-4 w-4" />
                            Quitar
                          </Button>
                          </div>
                        </div>

                        {childLines.length > 0 && (
                          <div className="space-y-2 border-t border-dashed border-[#E5E7EB] pt-3">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#9CA3AF]">
                              Sublíneas de este concepto
                            </p>
                            <div className="space-y-2">
                              {childLines.map((child) => (
                                <div
                                  key={child.id}
                                  className="ml-6 space-y-2 rounded-[0.9rem] border border-[#E5E7EB] bg-white px-3 py-2 md:ml-8"
                                >
                                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                                    <div className="flex-1 space-y-1">
                                      <Input
                                        value={child.name}
                                        onChange={(event) => updateBudgetLine(child.id, { name: event.target.value })}
                                        placeholder="Concepto de la sublínea"
                                        className="h-9 rounded-[0.7rem] border-[#E5E7EB] text-sm text-[#111827]"
                                      />
                                    </div>
                                    <div className="grid w-full grid-cols-2 gap-2 md:w-[260px]">
                                      <Input
                                        type="number"
                                        min="1"
                                        value={child.quantity}
                                        onChange={(event) =>
                                          updateBudgetLine(child.id, { quantity: Number(event.target.value) })
                                        }
                                        className="h-9 rounded-[0.7rem] border-[#E5E7EB] text-sm text-[#111827]"
                                        placeholder="Cant."
                                      />
                                      <Input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={child.price}
                                        onChange={(event) => updateBudgetLine(child.id, { price: event.target.value })}
                                        className="h-9 rounded-[0.7rem] border-[#E5E7EB] text-sm text-[#111827]"
                                        placeholder="Precio €"
                                      />
                                    </div>
                                  </div>
                                  <Textarea
                                    value={child.notes ?? ""}
                                    onChange={(event) => updateBudgetLine(child.id, { notes: event.target.value })}
                                    placeholder="Detalle específico de esta sublínea."
                                    className="min-h-[60px] rounded-[0.7rem] border border-[#E5E7EB] bg-[#F9FAFB] px-3 text-xs text-[#4B5563]"
                                  />
                                  <div className="flex items-center justify-between text-xs text-[#4B5563]">
                                    <span>
                                      Subtotal:{" "}
                                      <strong>
                                        {formatCurrency(Number(child.price) * Math.max(1, Number(child.quantity) || 1))}
                                      </strong>
                                    </span>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      className="h-7 px-2 text-xs text-[#B91C1C]"
                                      onClick={() => removeBudgetLine(child.id)}
                                    >
                                      Quitar sublínea
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  )
                })}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-[minmax(0,2fr),minmax(0,1fr)]">
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-[0.3em] text-[#C6B89E]">Notas internas</Label>
                <Textarea
                  value={budgetForm.notes}
                  onChange={(event) => setBudgetForm((prev) => ({ ...prev, notes: event.target.value }))}
                  placeholder="Condiciones, recordatorios o acuerdos para este presupuesto."
                  className="min-h-[100px] rounded-[1rem] border border-[#E8E6E0] bg-[#F8F7F4] px-4 text-sm text-[#2F4F4F]"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-[0.3em] text-[#C6B89E]">IVA aplicado</Label>
                <select
                  value={budgetForm.taxRate}
                  onChange={(event) =>
                    setBudgetForm((prev) => ({ ...prev, taxRate: Number(event.target.value) || 0 }))
                  }
                  className="w-full rounded-[1rem] border border-[#E8E6E0] bg-[#F8F7F4] px-4 py-3 text-sm text-[#2F4F4F] focus:border-[#2F4F4F] focus:outline-none"
                >
                  <option value={21}>21% (general)</option>
                  <option value={10}>10% (reducido)</option>
                  <option value={0}>0% (exento)</option>
                </select>
                <p className="text-xs text-[#6B7280]">
                  Este tipo se usará para calcular el IVA y el total del presupuesto.
                </p>
              </div>
            </div>

            {budgetError ? (
              <p className="flex items-center gap-2 rounded-[0.9rem] border border-[#FEE2E2] bg-[#FEF2F2] px-3 py-2 text-sm text-[#B91C1C]">
                <AlertCircle className="h-4 w-4" />
                {budgetError}
              </p>
            ) : null}
            {budgetSuccess ? (
              <p className="flex items-center gap-2 rounded-[0.9rem] border border-[#DCFCE7] bg-[#F0FDF4] px-3 py-2 text-sm text-[#047857]">
                <CheckCircle className="h-4 w-4" />
                {budgetSuccess}
              </p>
            ) : null}

            <div className="flex flex-col gap-3 border-t border-[#E8E6E0] pt-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-[#6B7280]">
                Base imponible (sin IVA):{" "}
                <span className="font-semibold text-[#2F4F4F]">{formatCurrency(budgetTotal)}</span>
                {budgetForm.taxRate
                  ? ` · IVA ${budgetForm.taxRate}% aplicado en el cálculo del total`
                  : " · IVA 0% (exento)"}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="rounded-full border-[#E8E6E0] text-[#2F4F4F]" onClick={resetBudgetForm}>
                  Limpiar
                </Button>
                <Button className="rounded-full bg-[#2F4F4F] text-white shadow-apple hover:bg-[#1F3535]" onClick={saveBudget}>
                  Guardar borrador
                </Button>
              </div>
            </div>
          </CardContent>
          </Card>
        </div>

        <Card className="mt-6 rounded-[1.75rem] border border-[#E8E6E0] bg-white/95 shadow-apple-lg md:mt-0 md:w-1/3 md:sticky md:top-24">
          <CardHeader className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-[#2F4F4F]">
                <FileSpreadsheet className="h-5 w-5" />
                Vista previa del presupuesto
              </CardTitle>
              <CardDescription className="text-[#6B7280]">
                Se actualizará en tiempo real mientras completas el formulario de la izquierda.
              </CardDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              className="hidden rounded-full border-[#2F4F4F] text-xs font-semibold text-[#2F4F4F] shadow-apple hover:bg-[#2F4F4F] hover:text-white print:hidden md:inline-flex"
              onClick={handlePrintPreview}
            >
              <Download className="mr-2 h-4 w-4" />
              Descargar PDF
            </Button>
          </CardHeader>
          <CardContent className="md:max-h-[calc(100vh-14rem)] md:overflow-y-auto">
            <div className="flex justify-center pb-2">
              <div
                id="budget-preview"
                className="relative w-full max-w-[800px] rounded-xl border border-[#E5E7EB] bg-white p-8 text-sm text-[#111827] shadow-md print:shadow-none"
              >
                <BudgetPreviewDocument form={budgetForm} lines={budgetLines} total={budgetTotal} client={selectedClient} />
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <Card className="rounded-[1.75rem] border border-[#E8E6E0] bg-white/95 shadow-apple-lg">
        <CardHeader className="space-y-2">
          <CardTitle className="flex items-center gap-2 text-[#2F4F4F]">
            <FileSpreadsheet className="h-5 w-5" />
            Presupuestos recientes
          </CardTitle>
          <CardDescription className="text-[#6B7280]">Guardados en Terrazea para que no se pierdan.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {budgets.length === 0 ? (
            <div className="rounded-[1.25rem] border border-dashed border-[#E8E6E0] bg-[#F8F7F4] p-8 text-center text-sm text-[#6B7280]">
              Cuando guardes un presupuesto, lo verás aquí.
            </div>
          ) : (
            budgets.map((budget) => (
              <div key={budget.id} className="space-y-3 rounded-[1.25rem] border border-[#E8E6E0] bg-white/95 p-4 shadow-apple">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-base font-semibold text-[#2F4F4F]">{budget.title}</p>
                    <p className="text-xs uppercase tracking-[0.25em] text-[#C6B89E]">
                      {budget.clientType === "existing" ? "Cliente existente" : "Cliente nuevo"} ·{" "}
                      {new Date(budget.createdAt).toLocaleDateString("es-ES")}
                    </p>
                  </div>
                  <Badge className="bg-[#2F4F4F] text-white">{formatCurrency(budget.total)}</Badge>
                </div>
                <div className="rounded-[1rem] border border-[#E8E6E0] bg-[#F8F7F4] p-3 text-sm text-[#2F4F4F]">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-[#6B7280]">
                    <UserPlus className="h-4 w-4" />
                    <span>
                      {budget.clientName} {budget.clientEmail ? `· ${budget.clientEmail}` : ""}
                    </span>
                  </div>
                  <div className="mt-2 space-y-2">
                    {budget.items.map((item) => (
                      <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-[0.75rem] bg-white px-3 py-2">
                        <div className="space-y-0.5">
                          <p className="text-sm font-medium text-[#2F4F4F]">{item.name}</p>
                          <p className="text-xs text-[#6B7280]">
                            {item.quantity} x {formatCurrency(Number(item.price))}
                          </p>
                        </div>
                        <Badge variant="secondary" className="bg-[#E8E6E0] text-[#2F4F4F]">
                          {formatCurrency(Number(item.price) * Math.max(1, Number(item.quantity) || 1))}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
                {budget.notes ? <p className="text-sm text-[#6B7280]">Notas: {budget.notes}</p> : null}
                <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-8 rounded-full border-[#E5E7EB] px-3 text-xs text-[#111827]"
                    onClick={() => loadBudget(budget)}
                  >
                    Editar borrador
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-8 rounded-full border-[#E5E7EB] px-3 text-xs text-[#111827]"
                    onClick={() => loadBudget(budget, { autoPrint: true })}
                  >
                    Descargar PDF
                  </Button>
                  <Button
                    type="button"
                    className="h-8 rounded-full bg-[#0D9488] px-3 text-xs font-semibold text-white shadow-apple hover:bg-[#0F766E]"
                    onClick={() => void handleGeneratePaymentFromBudget(budget)}
                  >
                    <CreditCard className="mr-1.5 h-3 w-3" />
                    Generar pago
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-8 px-3 text-xs text-[#B91C1C]"
                    onClick={() => {
                      if (!window.confirm("¿Seguro que quieres borrar este borrador de presupuesto?")) return
                      setBudgets((prev) => prev.filter((item) => item.id !== budget.id))
                    }}
                  >
                    Eliminar
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Sheet open={catalogOpen} onOpenChange={setCatalogOpen}>
        <SheetContent
          side="center"
          className="w-full max-w-[1120px] sm:max-w-[1120px] md:max-w-[1280px] lg:max-w-[1400px]"
        >
          <SheetHeader>
            <SheetTitle className="text-xl text-[#2F4F4F]">Catálogo de productos</SheetTitle>
            <p className="text-sm text-[#6B7280]">Añade o ajusta referencias para reutilizarlas en tus presupuestos.</p>
          </SheetHeader>
          <div className="flex-1 space-y-5 overflow-y-auto px-2 pb-4 md:px-4">
            {/* Alta rápida: nuevo producto */}
            <div className="rounded-[1.25rem] border border-[#E8E6E0] bg-white/95 p-4 shadow-apple md:p-5">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-[#2F4F4F]">Nuevo producto</p>
                  <p className="text-xs text-[#6B7280]">
                    Imagen opcional. Los datos principales se guardan en el catálogo de Terrazea.
                  </p>
                </div>
                <Badge className="bg-[#2F4F4F] text-white">
                  {totalProducts} guardado{totalProducts === 1 ? "" : "s"}
                </Badge>
              </div>
              <form className="space-y-4" onSubmit={addProduct}>
                <div className="space-y-2">
                  <Label htmlFor="product-name" className="text-xs font-semibold uppercase tracking-[0.3em] text-[#C6B89E]">
                    Nombre del producto
                  </Label>
                  <Input
                    id="product-name"
                    value={productForm.name}
                    onChange={(event) => setProductForm((prev) => ({ ...prev, name: event.target.value }))}
                    placeholder="Módulo cocina a medida"
                    className="h-12 rounded-[1rem] border border-[#E8E6E0] bg-[#F8F7F4] px-4 text-sm text-[#2F4F4F]"
                    required
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="product-price" className="text-xs font-semibold uppercase tracking-[0.3em] text-[#C6B89E]">
                      Precio base (€)
                    </Label>
                    <Input
                      id="product-price"
                      type="number"
                      step="0.01"
                      min="0"
                      value={productForm.price}
                      onChange={(event) => setProductForm((prev) => ({ ...prev, price: event.target.value }))}
                      placeholder="1250"
                      className="h-12 rounded-[1rem] border border-[#E8E6E0] bg-[#F8F7F4] px-4 text-sm text-[#2F4F4F]"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase tracking-[0.3em] text-[#C6B89E]">Imagen (opcional)</Label>
                    <div className="flex items-center gap-3 rounded-[1rem] border border-dashed border-[#E8E6E0] bg-[#F8F7F4] px-3 py-2 text-sm">
                      <label className="flex cursor-pointer items-center gap-2 text-[#2F4F4F]">
                        <ImageIcon className="h-4 w-4" />
                        <span className="underline">Subir archivo</span>
                        <input type="file" accept="image/*" className="hidden" onChange={handleProductImage} />
                      </label>
                      {productForm.imageDataUrl ? <Badge className="bg-[#2F4F4F] text-white">Imagen lista</Badge> : <span className="text-xs text-[#6B7280]">PNG/JPG</span>}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="product-description" className="text-xs font-semibold uppercase tracking-[0.3em] text-[#C6B89E]">
                    Descripción corta
                  </Label>
                  <Textarea
                    id="product-description"
                    value={productForm.description}
                    onChange={(event) => setProductForm((prev) => ({ ...prev, description: event.target.value }))}
                    placeholder="Detalles, materiales o notas internas que quieras recordar."
                    className="min-h-[100px] rounded-[1rem] border border-[#E8E6E0] bg-[#F8F7F4] px-4 text-sm text-[#2F4F4F]"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="product-tags" className="text-xs font-semibold uppercase tracking-[0.3em] text-[#C6B89E]">
                    Etiquetas (separadas por comas)
                  </Label>
                  <Input
                    id="product-tags"
                    value={productForm.tags}
                    onChange={(event) => setProductForm((prev) => ({ ...prev, tags: event.target.value }))}
                    placeholder="pavimento, pérgola, iluminación exterior"
                    className="h-10 rounded-[1rem] border border-[#E8E6E0] bg-[#F8F7F4] px-4 text-xs text-[#2F4F4F]"
                  />
                  {catalogTags.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      <span className="text-[11px] text-[#9CA3AF]">Etiquetas existentes:</span>
                      {catalogTags.map((tag) => {
                        const currentTags = productForm.tags
                          .split(",")
                          .map((value) => value.trim())
                          .filter((value) => value.length > 0)
                        const isActive = currentTags.includes(tag)
                        return (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => {
                              let next = currentTags
                              if (isActive) {
                                next = currentTags.filter((value) => value !== tag)
                              } else {
                                next = [...currentTags, tag]
                              }
                              setProductForm((prev) => ({ ...prev, tags: next.join(", ") }))
                            }}
                            className={`rounded-full px-3 py-1 text-xs ${
                              isActive
                                ? "bg-[#2F4F4F] text-white"
                                : "bg-[#E5E7EB] text-[#374151] hover:bg-[#D1D5DB]"
                            }`}
                          >
                            {tag}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>

                {productError ? (
                  <p className="flex items-center gap-2 rounded-[0.9rem] border border-[#FEE2E2] bg-[#FEF2F2] px-3 py-2 text-sm text-[#B91C1C]">
                    <AlertCircle className="h-4 w-4" />
                    {productError}
                  </p>
                ) : null}

                <Button type="submit" className="h-11 w-full rounded-full bg-[#2F4F4F] text-sm font-semibold text-white shadow-apple transition hover:bg-[#1F3535]">
                  Añadir al catálogo
                </Button>
              </form>
            </div>

            {/* Catálogo digital: filtros a la izquierda, grid de productos a la derecha */}
            <div className="grid gap-4 rounded-[1.25rem] border border-[#E8E6E0] bg-white/95 p-4 shadow-apple md:grid-cols-[260px,1fr] md:p-5">
              {/* Panel de filtros */}
              <aside className="space-y-4 border-b border-[#E5E7EB] pb-4 md:border-b-0 md:border-r md:pb-0 md:pr-4">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-[#2F4F4F]">Catálogo digital</p>
                  <p className="text-xs text-[#6B7280]">
                    Explora, filtra y arrastra productos a tus presupuestos.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-[11px] font-semibold uppercase tracking-[0.25em] text-[#C6B89E]">
                    Buscar
                  </Label>
                  <Input
                    value={catalogSearch}
                    onChange={(event) => setCatalogSearch(event.target.value)}
                    placeholder="Nombre o descripción…"
                    className="h-9 rounded-full border-[#E5E7EB] bg-[#F8F7F4] px-3 text-xs text-[#111827]"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[11px] font-semibold uppercase tracking-[0.25em] text-[#C6B89E]">
                    Etiquetas
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setCatalogTagFilter(null)}
                      className={`rounded-full px-3 py-1 text-[11px] ${
                        !catalogTagFilter
                          ? "bg-[#2F4F4F] text-white"
                          : "bg-[#E5E7EB] text-[#374151] hover:bg-[#D1D5DB]"
                      }`}
                    >
                      Todas
                    </button>
                    {catalogTags.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => setCatalogTagFilter(tag)}
                        className={`rounded-full px-3 py-1 text-[11px] ${
                          catalogTagFilter === tag
                            ? "bg-[#2F4F4F] text-white"
                            : "bg-[#F3F4F6] text-[#374151] hover:bg-[#E5E7EB]"
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[11px] font-semibold uppercase tracking-[0.25em] text-[#C6B89E]">
                    Rango de precio
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder="€ mín"
                      value={catalogPriceMin}
                      onChange={(event) => setCatalogPriceMin(event.target.value)}
                      className="h-9 w-1/2 rounded-full border-[#E5E7EB] bg-[#F8F7F4] px-3 text-xs text-[#111827]"
                    />
                    <Input
                      type="number"
                      placeholder="€ máx"
                      value={catalogPriceMax}
                      onChange={(event) => setCatalogPriceMax(event.target.value)}
                      className="h-9 w-1/2 rounded-full border-[#E5E7EB] bg-[#F8F7F4] px-3 text-xs text-[#111827]"
                    />
                  </div>
                </div>
                <div className="pt-1 text-xs text-[#6B7280]">
                  Mostrando{" "}
                  <span className="font-semibold text-[#2F4F4F]">
                    {filteredProducts.length} de {totalProducts}
                  </span>{" "}
                  productos.
                </div>
              </aside>

              {/* Grid de productos */}
              <section className="space-y-3">
                {products.length === 0 ? (
                  <div className="rounded-[1rem] border border-dashed border-[#E8E6E0] bg-[#F8F7F4] p-6 text-center text-sm text-[#6B7280]">
                    Todavía no has añadido productos al catálogo.
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {filteredProducts.map((product) => (
                      <div
                        key={product.id}
                        className="group flex flex-col overflow-hidden rounded-[1.1rem] border border-[#E8E6E0] bg-white/95 shadow-apple transition hover:-translate-y-1 hover:shadow-apple-lg"
                      >
                        <div className="relative h-36 w-full overflow-hidden bg-[#F3F4F6]">
                          {product.imageDataUrl ? (
                            <img
                              src={product.imageDataUrl}
                              alt={product.name}
                              className="h-full w-full object-cover transition group-hover:scale-105"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center gap-2 text-xs text-[#6B7280]">
                              <ImageIcon className="h-4 w-4" />
                              Sin imagen
                            </div>
                          )}
                          <Button
                            type="button"
                            size="sm"
                            className="absolute bottom-2 left-2 h-7 rounded-full bg-white/90 px-3 text-xs font-semibold text-[#2F4F4F] shadow-md hover:bg-white"
                            onClick={() => {
                              const id = safeId()
                              setBudgetLines((prev) => [
                                ...prev,
                                {
                                  id,
                                  parentId: null,
                                  productId: product.id,
                                  name: product.name,
                                  price: product.price.toString(),
                                  quantity: 1,
                                  imageDataUrl: product.imageDataUrl ?? null,
                                  notes: product.description ?? "",
                                },
                              ])
                              setExpandedLineId(id)
                              setBudgetSuccess(`Producto "${product.name}" añadido al presupuesto.`)
                            }}
                          >
                            Usar en presupuesto
                          </Button>
                          <Badge className="absolute right-2 top-2 bg-[#2F4F4F] text-xs text-white">
                            {formatCurrency(product.price)}
                          </Badge>
                        </div>
                        <div className="flex flex-1 flex-col gap-2 p-4">
                          <div className="space-y-1">
                            <p className="line-clamp-2 text-sm font-semibold text-[#2F4F4F]">{product.name}</p>
                            <p className="text-[11px] uppercase tracking-[0.25em] text-[#C6B89E]">
                              {new Date(product.createdAt).toLocaleDateString("es-ES")}
                            </p>
                          </div>
                          {product.description ? (
                            <p className="line-clamp-3 text-xs text-[#6B7280]">{product.description}</p>
                          ) : null}
                          {product.tags && product.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 pt-1">
                              {product.tags.map((tag) => (
                                <span
                                  key={tag}
                                  className="rounded-full bg-[#F3F4F6] px-2 py-0.5 text-[10px] text-[#4B5563]"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                          <div className="mt-auto flex items-center justify-end gap-2 pt-2">
                            <Button
                              type="button"
                              variant="outline"
                              className="h-7 rounded-full border-[#E5E7EB] px-3 text-[11px] text-[#111827]"
                              onClick={() => {
                                setEditingProduct(product)
                                setEditProductForm({
                                  name: product.name,
                                  description: product.description ?? "",
                                  price: String(product.price),
                                  tags: (product.tags ?? []).join(", "),
                                  imageDataUrl: null,
                                })
                                setEditProductOpen(true)
                              }}
                            >
                              Editar
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              className="h-7 px-3 text-[11px] text-[#B91C1C]"
                              onClick={() => {
                                if (!window.confirm("¿Seguro que quieres eliminar este producto del catálogo?")) return
                                void (async () => {
                                  try {
                                    await deleteAdminBudgetProduct(product.id)
                                    setProducts((prev) => prev.filter((p) => p.id !== product.id))
                                    if (editingProduct?.id === product.id) {
                                      setEditingProduct(null)
                                      setEditProductOpen(false)
                                    }
                                  } catch (error) {
                                console.error("No se pudo eliminar el producto", error)
                                alert(
                                  getApiErrorMessage(
                                    error,
                                    "No se pudo eliminar el producto del catálogo. Inténtalo de nuevo.",
                                  ),
                                )
                                  }
                                })()
                              }}
                            >
                              Eliminar
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </div>
          <SheetFooter className="border-t border-[#E8E6E0]">
            <Button variant="outline" className="rounded-full border-[#E8E6E0] text-[#2F4F4F]" onClick={() => setCatalogOpen(false)}>
              Cerrar catálogo
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Edición de producto del catálogo */}
      <Sheet
        open={editProductOpen}
        onOpenChange={(open) => {
          setEditProductOpen(open)
          if (!open) {
            setEditingProduct(null)
          }
        }}
      >
        <SheetContent side="right" className="sm:max-w-[480px]">
          <SheetHeader>
            <SheetTitle className="text-xl text-[#2F4F4F]">
              {editingProduct ? `Editar producto: ${editingProduct.name}` : "Editar producto"}
            </SheetTitle>
            <p className="text-sm text-[#6B7280]">
              Ajusta el nombre, descripción, precio, etiquetas o imagen de este producto del catálogo.
            </p>
          </SheetHeader>
          <div className="flex-1 space-y-4 overflow-y-auto px-1 pb-4 pt-2">
            {editingProduct ? (
              <form className="space-y-4" onSubmit={saveEditedProduct}>
                <div className="space-y-2">
                  <Label htmlFor="edit-product-name" className="text-xs font-semibold uppercase tracking-[0.3em] text-[#C6B89E]">
                    Nombre del producto
                  </Label>
                  <Input
                    id="edit-product-name"
                    value={editProductForm.name}
                    onChange={(event) =>
                      setEditProductForm((prev) => ({ ...prev, name: event.target.value }))
                    }
                    className="h-10 rounded-[1rem] border border-[#E8E6E0] bg-[#F8F7F4] px-3 text-sm text-[#2F4F4F]"
                    required
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="edit-product-price" className="text-xs font-semibold uppercase tracking-[0.3em] text-[#C6B89E]">
                      Precio base (€)
                    </Label>
                    <Input
                      id="edit-product-price"
                      type="number"
                      step="0.01"
                      min="0"
                      value={editProductForm.price}
                      onChange={(event) =>
                        setEditProductForm((prev) => ({ ...prev, price: event.target.value }))
                      }
                      className="h-10 rounded-[1rem] border border-[#E8E6E0] bg-[#F8F7F4] px-3 text-sm text-[#2F4F4F]"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase tracking-[0.3em] text-[#C6B89E]">
                      Imagen (opcional)
                    </Label>
                    <div className="flex items-center gap-3 rounded-[1rem] border border-dashed border-[#E8E6E0] bg-[#F8F7F4] px-3 py-2 text-sm">
                      <label className="flex cursor-pointer items-center gap-2 text-[#2F4F4F]">
                        <ImageIcon className="h-4 w-4" />
                        <span className="underline">Actualizar imagen</span>
                        <input type="file" accept="image/*" className="hidden" onChange={handleEditProductImage} />
                      </label>
                    </div>
                    {(editProductForm.imageDataUrl || editingProduct.imageDataUrl) && (
                      <div className="overflow-hidden rounded-xl border border-[#E8E6E0]">
                        <img
                          src={editProductForm.imageDataUrl ?? editingProduct.imageDataUrl ?? ""}
                          alt={editingProduct.name}
                          className="h-24 w-full object-cover"
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-product-description" className="text-xs font-semibold uppercase tracking-[0.3em] text-[#C6B89E]">
                    Descripción corta
                  </Label>
                  <Textarea
                    id="edit-product-description"
                    value={editProductForm.description}
                    onChange={(event) =>
                      setEditProductForm((prev) => ({ ...prev, description: event.target.value }))
                    }
                    className="min-h-[80px] rounded-[1rem] border border-[#E8E6E0] bg-[#F8F7F4] px-3 text-sm text-[#2F4F4F]"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-product-tags" className="text-xs font-semibold uppercase tracking-[0.3em] text-[#C6B89E]">
                    Etiquetas (separadas por comas)
                  </Label>
                  <Input
                    id="edit-product-tags"
                    value={editProductForm.tags}
                    onChange={(event) =>
                      setEditProductForm((prev) => ({ ...prev, tags: event.target.value }))
                    }
                    className="h-10 rounded-[1rem] border border-[#E8E6E0] bg-[#F8F7F4] px-3 text-xs text-[#2F4F4F]"
                  />
                </div>

                <SheetFooter className="mt-2 flex justify-end gap-2 border-t border-[#E5E7EB] pt-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="border-[#E5E7EB] text-[#374151]"
                    onClick={() => {
                      setEditProductOpen(false)
                      setEditingProduct(null)
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" className="bg-[#2F4F4F] text-white hover:bg-[#1F3535]">
                    Guardar cambios
                  </Button>
                </SheetFooter>
              </form>
            ) : (
              <p className="text-sm text-[#6B7280]">Selecciona un producto para editarlo.</p>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}

function SummaryTile({ icon: Icon, label, value, accent }: { icon: React.ElementType; label: string; value: string | number; accent?: boolean }) {
  return (
    <div
      className={`flex flex-col gap-2 rounded-[1.25rem] border px-4 py-3 shadow-apple ${
        accent ? "border-[#2F4F4F] bg-[#2F4F4F] text-white" : "border-[#E8E6E0] bg-white/95 text-[#2F4F4F]"
      }`}
    >
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-[#C6B89E]">
        <Icon className={`h-4 w-4 ${accent ? "text-white" : "text-[#2F4F4F]"}`} />
        {label}
      </div>
      <p className="text-2xl font-semibold">{value}</p>
    </div>
  )
}

interface BudgetPreviewProps {
  form: typeof INITIAL_BUDGET_FORM
  lines: BudgetLine[]
  total: number
  client?: AdminClientOverview | undefined
}

function BudgetPreviewDocument({ form, lines, total, client }: BudgetPreviewProps) {
  const hasLines = lines.length > 0
  const today = new Date()
  const formattedDate = today.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })

  const clientLabel =
    form.clientType === "existing"
      ? client?.fullName || "Cliente pendiente de seleccionar"
      : form.clientName || "Cliente sin nombre"

  const clientEmail =
    form.clientType === "existing"
      ? client?.email ?? "—"
      : form.clientEmail || "—"

  const taxRateValue = Number.isFinite(form.taxRate) ? form.taxRate : 21
  const taxRate = Math.max(0, taxRateValue) / 100
  const taxAmount = Math.max(0, total * taxRate)
  const grandTotal = Math.max(0, total + taxAmount)

  return (
    <div className="space-y-6 text-xs leading-relaxed text-[#111827]">
      <header className="flex items-start justify-between border-b border-[#D1D5DB] pb-4">
        <div className="space-y-1">
          <TerrazeaBrand subtitle="Terrazea BCN S.L." />
          <p className="max-w-xs text-[11px] text-[#4B5563]">
            Avenida Canyada, 41-43 · 08173 Sant Cugat del Vallès · B56252554
          </p>
        </div>
        <div className="text-right text-[11px] text-[#4B5563]">
          <p className="font-semibold uppercase tracking-[0.2em] text-[#111827]">PRESUPUESTO</p>
          <p>
            Data: <span className="font-medium">{formattedDate}</span>
          </p>
          <p className="mt-2">
            Cliente: <span className="font-medium">{clientLabel}</span>
          </p>
          {form.clientEmail ? <p>{form.clientEmail}</p> : null}
        </div>
      </header>

      <section className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#4B5563]">
          Solicitado por
        </p>
        <div className="grid grid-cols-[2fr,1fr,1fr] gap-2 text-[11px]">
          <div className="border-b border-[#D1D5DB] pb-1">Nombre: {clientLabel}</div>
          <div className="border-b border-[#D1D5DB] pb-1">Correo: {clientEmail}</div>
          <div className="border-b border-[#D1D5DB] pb-1">Tel: —</div>
        </div>
      </section>

      <section className="space-y-2">
        <div className="flex items-baseline justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#4B5563]">
            Líneas del presupuesto
          </p>
          <p className="text-[11px] text-[#4B5563]">
            Total línies: <span className="font-semibold text-[#111827]">{lines.length}</span>
          </p>
        </div>

        <div className="overflow-hidden rounded-md border border-[#D1D5DB]">
          <table className="w-full border-collapse text-[11px]">
            <thead className="bg-[#F3F4F6]">
              <tr>
                <th className="border-b border-[#D1D5DB] px-2 py-1.5 text-left font-semibold text-[#374151]">
                  Descripción
                </th>
                <th className="w-16 border-b border-[#D1D5DB] px-2 py-1.5 text-right font-semibold text-[#374151]">
                  UT
                </th>
                <th className="w-28 border-b border-[#D1D5DB] px-2 py-1.5 text-right font-semibold text-[#374151]">
                  PVP
                </th>
                <th className="w-32 border-b border-[#D1D5DB] px-2 py-1.5 text-right font-semibold text-[#374151]">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {hasLines ? (
                lines.map((line) => {
                  const isChild = Boolean(line.parentId)
                  const qty = Math.max(1, Number(line.quantity) || 1)
                  const unit = Number(line.price.toString().replace(",", ".")) || 0
                  const lineTotal = unit * qty
                  return (
                    <tr key={line.id} className="align-top">
                      <td
                        className={`border-b border-[#E5E7EB] py-2 ${
                          isChild ? "pl-6 pr-2 lg:pl-8" : "px-2"
                        }`}
                      >
                        <p className="text-[#111827] text-sm font-normal">
                          {line.name || "Línia sense nom"}
                        </p>
                        {line.notes ? (
                          <p className="mt-1 whitespace-pre-line text-[10px] text-[#4B5563]">{line.notes}</p>
                        ) : null}
                      </td>
                      <td className="border-b border-[#E5E7EB] px-2 py-2 text-right text-[#111827]">{qty}</td>
                      <td className="border-b border-[#E5E7EB] px-2 py-2 text-right text-[#111827]">
                        {unit ? formatCurrency(unit) : "—"}
                      </td>
                      <td className="border-b border-[#E5E7EB] px-2 py-2 text-right font-semibold text-[#111827]">
                        {lineTotal ? formatCurrency(lineTotal) : "—"}
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={4} className="px-3 py-4 text-center text-[11px] text-[#6B7280]">
                    Añade líneas en el formulario de la izquierda para ver aquí la vista previa detallada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="flex justify-end">
        <div className="w-64 space-y-1 text-[11px]">
          <div className="flex items-center justify-between">
            <span className="text-[#4B5563]">Subtotal (sin IVA)</span>
            <span className="font-semibold text-[#111827]">{formatCurrency(total)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[#4B5563]">IVA 21%</span>
            <span className="font-semibold text-[#111827]">{formatCurrency(taxAmount)}</span>
          </div>
          <div className="mt-1 flex items-center justify-between border-t border-[#D1D5DB] pt-1">
            <span className="font-semibold text-[#111827]">Total presupuesto</span>
            <span className="font-semibold text-[#111827]">{formatCurrency(grandTotal)}</span>
          </div>
        </div>
      </section>

      {form.notes ? (
        <section className="mt-4 rounded-md border border-dashed border-[#E5E7EB] bg-[#F9FAFB] p-3 text-[11px] text-[#4B5563]">
          <p className="mb-1 font-semibold uppercase tracking-[0.16em] text-[#6B7280]">Notas internas</p>
          <p className="whitespace-pre-line">{form.notes}</p>
        </section>
      ) : null}
    </div>
  )
}
