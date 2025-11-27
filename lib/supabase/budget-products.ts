// @ts-nocheck
import { Buffer } from "node:buffer"
import type { SupabaseClient } from "@supabase/supabase-js"

import { createServerSupabaseClient } from "./server"

export interface BudgetProductRow {
  id: string
  name: string
  description: string | null
  unit_price: number
  image_path: string | null
  tags: string[] | null
  created_at: string
  updated_at: string
}

export interface AdminBudgetProduct {
  id: string
  name: string
  description: string | null
  unitPrice: number
  imagePath: string | null
  imageUrl: string | null
  tags: string[]
  createdAt: string
  updatedAt: string
}

const STORAGE_BUCKET = "project-assets"

async function ensureStorageBucketExists(supabase: SupabaseClient) {
  const { data: bucket, error } = await supabase.storage.getBucket(STORAGE_BUCKET)
  if (bucket) {
    if (!bucket.public) {
      const { error: updateError } = await supabase.storage.updateBucket(STORAGE_BUCKET, { public: true })
      if (updateError) throw updateError
    }
    return
  }

  if (error && !String(error.message ?? error).toLowerCase().includes("not found")) {
    throw error
  }

  const { error: createError } = await supabase.storage.createBucket(STORAGE_BUCKET, {
    public: true,
  })

  if (createError && !String(createError.message ?? createError).toLowerCase().includes("exists")) {
    throw createError
  }
}

function buildImageUrl(supabase: SupabaseClient, imagePath: string | null): string | null {
  if (!imagePath) return null
  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(imagePath)
  return data?.publicUrl ?? null
}

function mapRow(row: BudgetProductRow, supabase: SupabaseClient): AdminBudgetProduct {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    unitPrice: Number(row.unit_price ?? 0),
    imagePath: row.image_path,
    imageUrl: buildImageUrl(supabase, row.image_path),
    tags: Array.isArray(row.tags) ? (row.tags as string[]) : [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function listBudgetProducts(): Promise<AdminBudgetProduct[]> {
  const supabase = createServerSupabaseClient()
  const { data, error } = await supabase
    .from("budget_products")
    .select("id, name, description, unit_price, image_path, tags, created_at, updated_at")
    .order("created_at", { ascending: false })

  if (error) throw error
  return (data ?? []).map((row) => mapRow(row as BudgetProductRow, supabase))
}

export interface CreateBudgetProductInput {
  name: string
  description?: string | null
  unitPrice: number
  tags?: string[]
  imageDataUrl?: string | null
}

export async function createBudgetProduct(input: CreateBudgetProductInput): Promise<AdminBudgetProduct> {
  const supabase = createServerSupabaseClient()
  await ensureStorageBucketExists(supabase)
  const payload = {
    name: input.name.trim(),
    description: input.description?.trim() || null,
    unit_price: input.unitPrice,
    tags: input.tags && input.tags.length > 0 ? input.tags : [],
  }

  const { data, error } = await supabase
    .from("budget_products")
    .insert(payload)
    .select("id, name, description, unit_price, image_path, tags, created_at, updated_at")
    .maybeSingle()

  if (error || !data) {
    throw error ?? new Error("No se pudo crear el producto")
  }

  const row = data as BudgetProductRow

  // Subir imagen si viene en el payload
  if (input.imageDataUrl && typeof input.imageDataUrl === "string" && input.imageDataUrl.length > 10) {
    try {
      const base64 = input.imageDataUrl.includes(",")
        ? input.imageDataUrl.split(",").pop() ?? input.imageDataUrl
        : input.imageDataUrl
      const buffer = Buffer.from(base64, "base64")
      const path = `budget-products/${row.id}/${Date.now()}.jpg`
      const { error: uploadError } = await supabase.storage.from(STORAGE_BUCKET).upload(path, buffer, {
        contentType: "image/jpeg",
        upsert: true,
      })
      if (!uploadError) {
        await supabase.from("budget_products").update({ image_path: path }).eq("id", row.id)
        row.image_path = path
      }
    } catch (uploadError) {
      console.error("No se pudo subir la imagen del producto", uploadError)
    }
  }

  return mapRow(row, supabase)
}

export interface UpdateBudgetProductInput {
  name?: string
  description?: string | null
  unitPrice?: number
  tags?: string[]
  imageDataUrl?: string | null
}

export async function updateBudgetProduct(id: string, input: UpdateBudgetProductInput): Promise<AdminBudgetProduct> {
  const supabase = createServerSupabaseClient()
  await ensureStorageBucketExists(supabase)
  const patch: Record<string, unknown> = {}
  if (input.name !== undefined) patch.name = input.name.trim()
  if (input.description !== undefined) patch.description = input.description?.trim() || null
  if (input.unitPrice !== undefined) patch.unit_price = input.unitPrice
  if (input.tags !== undefined) patch.tags = input.tags

  const { data, error } = await supabase
    .from("budget_products")
    .update(patch)
    .eq("id", id)
    .select("id, name, description, unit_price, image_path, tags, created_at, updated_at")
    .maybeSingle()

  if (error || !data) {
    throw error ?? new Error("No se pudo actualizar el producto")
  }

  const row = data as BudgetProductRow

  if (input.imageDataUrl && typeof input.imageDataUrl === "string" && input.imageDataUrl.length > 10) {
    try {
      const base64 = input.imageDataUrl.includes(",")
        ? input.imageDataUrl.split(",").pop() ?? input.imageDataUrl
        : input.imageDataUrl
      const buffer = Buffer.from(base64, "base64")
      const path = `budget-products/${row.id}/${Date.now()}.jpg`
      const { error: uploadError } = await supabase.storage.from(STORAGE_BUCKET).upload(path, buffer, {
        contentType: "image/jpeg",
        upsert: true,
      })
      if (!uploadError) {
        await supabase.from("budget_products").update({ image_path: path }).eq("id", row.id)
        row.image_path = path
      }
    } catch (uploadError) {
      console.error("No se pudo actualizar la imagen del producto", uploadError)
    }
  }

  return mapRow(row, supabase)
}

export async function deleteBudgetProduct(id: string) {
  const supabase = createServerSupabaseClient()
  const { error } = await supabase.from("budget_products").delete().eq("id", id)
  if (error) throw error
}


