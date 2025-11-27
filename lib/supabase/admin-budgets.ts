// @ts-nocheck

import { createServerSupabaseClient } from "./server"

export interface AdminBudgetLine {
  id: string
  parentId?: string | null
  productId?: string | null
  name: string
  price: string
  quantity: number
  imageDataUrl?: string | null
  notes?: string | null
}

interface BudgetRow {
  id: string
  client_name: string
  client_email: string | null
  issue_date: string | null
  status: string
  currency: string
  subtotal: number
  tax: number
  total: number
  message: string | null
  created_at: string
  updated_at: string
}

interface BudgetItemRow {
  id: string
  budget_id: string
  product_id: string | null
  product_name: string
  unit_price: number
  quantity: number
  discount: number
  notes: string | null
}

export interface AdminBudgetRecord {
  id: string
  title: string
  clientType: "existing" | "new"
  clientId: string | null
  clientName: string
  clientEmail: string | null
  items: AdminBudgetLine[]
  notes: string | null
  total: number
  taxRate: number
  createdBy: string | null
  createdAt: string
  updatedAt: string
}

function mapBudgetRow(row: BudgetRow, items: AdminBudgetLine[]): AdminBudgetRecord {
  return {
    id: row.id,
    title: row.message || "Presupuesto sin título",
    clientType: "existing",
    clientId: null,
    clientName: row.client_name,
    clientEmail: row.client_email,
    items,
    notes: row.message,
    total: Number(row.total ?? 0),
    taxRate: 21,
    createdBy: null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function listAdminBudgets(): Promise<AdminBudgetRecord[]> {
  const supabase = createServerSupabaseClient()
  const { data: budgetRows, error } = await supabase
    .from("budgets")
    .select("id, client_name, client_email, issue_date, status, currency, subtotal, tax, total, message, created_at, updated_at")
    .order("created_at", { ascending: false })

  if (error) throw error

  const rows = (budgetRows as BudgetRow[]) ?? []
  if (rows.length === 0) return []

  const ids = rows.map((row) => row.id)
  const { data: itemRows, error: itemsError } = await supabase
    .from("budget_items")
    .select("id, budget_id, product_id, product_name, unit_price, quantity, discount, notes")
    .in("budget_id", ids)

  if (itemsError) throw itemsError

  const itemsByBudget: Record<string, AdminBudgetLine[]> = {}
  for (const item of (itemRows as BudgetItemRow[]) ?? []) {
    const line: AdminBudgetLine = {
      id: item.id,
      parentId: null,
      productId: item.product_id,
      name: item.product_name,
      price: String(item.unit_price),
      quantity: Number(item.quantity ?? 1),
      notes: item.notes,
    }
    if (!itemsByBudget[item.budget_id]) itemsByBudget[item.budget_id] = []
    itemsByBudget[item.budget_id].push(line)
  }

  return rows.map((row) => mapBudgetRow(row, itemsByBudget[row.id] ?? []))
}

export interface CreateAdminBudgetInput {
  title: string
  clientType: "existing" | "new"
  clientId?: string | null
  clientName: string
  clientEmail?: string | null
  items: AdminBudgetLine[]
  notes?: string | null
  total: number
  taxRate: number
  createdBy: string
}

export async function createAdminBudget(input: CreateAdminBudgetInput): Promise<AdminBudgetRecord> {
  const supabase = createServerSupabaseClient()
  const subtotal = input.total
  const tax = 0
  const total = input.total

  const { data, error } = await supabase
    .from("budgets")
    .insert({
      client_name: input.clientName.trim(),
      client_email: input.clientEmail?.trim() || null,
      issue_date: new Date().toISOString().slice(0, 10),
      status: "draft",
      currency: "EUR",
      subtotal,
      tax,
      total,
      message: input.title.trim(),
    })
    .select("id, client_name, client_email, issue_date, status, currency, subtotal, tax, total, message, created_at, updated_at")
    .maybeSingle()

  if (error || !data) {
    throw error ?? new Error("No se pudo crear el presupuesto")
  }

  const budgetRow = data as BudgetRow

  if (input.items && input.items.length > 0) {
    const itemsPayload = input.items.map((item) => ({
      budget_id: budgetRow.id,
      product_id: item.productId ?? null,
      product_name: item.name,
      unit_price: Number(item.price.replace(",", ".")) || 0,
      quantity: item.quantity ?? 1,
      discount: 0,
      notes: item.notes ?? null,
    }))
    const { error: itemsError } = await supabase.from("budget_items").insert(itemsPayload)
    if (itemsError) throw itemsError
  }

  return mapBudgetRow(budgetRow, input.items ?? [])
}

export interface UpdateAdminBudgetInput {
  title?: string
  clientType?: "existing" | "new"
  clientId?: string | null
  clientName?: string
  clientEmail?: string | null
  items?: AdminBudgetLine[]
  notes?: string | null
  total?: number
  taxRate?: number
}

export async function updateAdminBudget(id: string, input: UpdateAdminBudgetInput): Promise<AdminBudgetRecord> {
  const supabase = createServerSupabaseClient()
  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }

  if (input.clientName !== undefined) patch.client_name = input.clientName.trim()
  if (input.clientEmail !== undefined) patch.client_email = input.clientEmail?.trim() || null
  if (input.total !== undefined) {
    patch.subtotal = input.total
    patch.tax = 0
    patch.total = input.total
  }
  if (input.title !== undefined || input.notes !== undefined) {
    const pieces = []
    if (input.title) pieces.push(input.title.trim())
    if (input.notes) pieces.push(input.notes.trim())
    patch.message = pieces.join(" — ")
  }

  const { data, error } = await supabase
    .from("budgets")
    .update(patch)
    .eq("id", id)
    .select("id, client_name, client_email, issue_date, status, currency, subtotal, tax, total, message, created_at, updated_at")
    .maybeSingle()

  if (error || !data) {
    throw error ?? new Error("No se pudo actualizar el presupuesto")
  }

  const budgetRow = data as BudgetRow

  if (input.items) {
    const { error: deleteError } = await supabase.from("budget_items").delete().eq("budget_id", id)
    if (deleteError) throw deleteError

    if (input.items.length > 0) {
      const itemsPayload = input.items.map((item) => ({
        budget_id: id,
        product_id: item.productId ?? null,
        product_name: item.name,
        unit_price: Number(item.price.replace(",", ".")) || 0,
        quantity: item.quantity ?? 1,
        discount: 0,
        notes: item.notes ?? null,
      }))
      const { error: itemsError } = await supabase.from("budget_items").insert(itemsPayload)
      if (itemsError) throw itemsError
    }
  }

  const lines: AdminBudgetLine[] = (input.items as AdminBudgetLine[]) ?? []
  return mapBudgetRow(budgetRow, lines)
}

export async function deleteAdminBudget(id: string) {
  const supabase = createServerSupabaseClient()
  const { error } = await supabase.from("budgets").delete().eq("id", id)
  if (error) throw error
}


