import { Buffer } from "node:buffer"
import { randomBytes } from "node:crypto"
import { Router } from "express"
import { z } from "zod"
import bcrypt from "bcryptjs"
import type { SupabaseClient } from "@supabase/supabase-js"

import { getAdminClientsOverview } from "../../lib/supabase/admin-data"
import { createClientDocumentRecord, getAdminClientDetail } from "../../lib/supabase/admin-clients"
import { getAdminDashboardData } from "../../lib/supabase/admin-dashboard"
import {
  createProjectEvent,
  deleteProjectEvent,
  getAdminGlobalEvents,
  getAdminProjectEventsBySlug,
  listProjectCalendarSummaries,
  projectEventWriteSchema,
  updateProjectEvent,
} from "../../lib/supabase/project-events"
import {
  createPersonalEvent,
  deletePersonalEvent,
  listAdminPersonalEvents,
  personalEventWriteSchema,
  updatePersonalEvent,
} from "../../lib/supabase/personal-events"
import {
  addTaskToCalendar,
  bulkUpdateProjectTasks,
  createProjectTask,
  deleteProjectTask,
  fetchTaskActivity,
  listProjectTasks,
  reorderProjectTasks,
  updateProjectTask,
  recalculateProjectProgress,
} from "../../lib/supabase/project-tasks"
import { createServerSupabaseClient } from "../../lib/supabase/server"
import { getDocuments, getMessages, ensureProjectConversation, sendTeamMemberConversationMessage } from "../../lib/supabase/queries"
import type { ListProjectTasksFilters, ListProjectTasksResult, ProjectTask } from "../../lib/supabase/project-tasks"
import type { ProjectTaskStatus } from "../../types/project-tasks"
import { addDays, isToday, isWithinInterval, startOfDay } from "date-fns"
import {
  createAdminTeamMember,
  listAdminTeamMembers,
  setTeamMemberProjects,
} from "../../lib/supabase/admin-team"
import {
  PROJECT_TEAM_ROLES,
  assignProjectTeamRoles,
  archiveAdminProject,
  createAdminProjectRecord,
  createProjectDocument,
  createProjectMilestone,
  createProjectPhase,
  createProjectPhoto,
  deleteAdminProjectRecord,
  deleteProjectDocument,
  deleteProjectMilestone,
  deleteProjectPhase,
  deleteProjectPhoto,
  duplicateAdminProject,
  getAdminProjectDetail,
  listAdminProjects,
  recordProjectTimelineEvent,
  reorderProjectMilestones,
  reorderProjectPhases,
  reorderProjectPhotos,
  updateAdminProjectBasics,
  updateProjectDocument,
  updateProjectMilestone,
  updateProjectPhase,
  updateProjectPhoto,
} from "../../lib/supabase/admin-projects"
import { requireAdminSession } from "../services/session"
import {
  PROTECTED_SECTIONS,
  grantSectionAccess,
  hasSectionAccess,
  revokeSectionAccess,
} from "../services/section-access"
import { verifySectionPassword } from "../../lib/supabase/admin-section-passwords"
import { asyncHandler } from "../utils/async-handler"
import { isProjectTaskStatus } from "../../types/project-tasks"
import {
  createProjectPayment,
  deleteProjectPayment,
  getAdminPaymentById,
  listAdminPayments,
  UpdateProjectPaymentInput,
  updateProjectPayment,
} from "../../lib/supabase/admin-payments"
import { ensureStripeCustomer, createCheckoutSessionForPayment } from "../../lib/payments/stripe"
import { env } from "../config/env"
import {
  sendClientWelcomeEmail,
  sendDocumentSharedEmail,
  sendNewProjectAssignedEmail,
  sendPaymentRequestEmail,
} from "../services/email"
import { createProjectNotification, listAdminNotifications, markAdminNotificationRead } from "../../lib/supabase/notifications"
import {
  createBudgetProduct,
  deleteBudgetProduct,
  listBudgetProducts,
  updateBudgetProduct,
} from "../../lib/supabase/budget-products"
import {
  createAdminBudget,
  deleteAdminBudget,
  listAdminBudgets,
  updateAdminBudget,
} from "../../lib/supabase/admin-budgets"
import type { AdminPaymentRecord } from "@app/types/admin"

type ProjectTeamRole = (typeof PROJECT_TEAM_ROLES)[number]

const createClientSchema = z.object({
  fullName: z.string().min(3).max(120),
  email: z.string().email(),
})

const createTeamMemberSchema = z.object({
  fullName: z.string().min(3).max(120),
  role: z.string().min(2).max(80),
  email: z
    .string()
    .email()
    .optional()
    .or(z.literal(""))
    .transform((value) => (value && value.trim().length > 0 ? value.trim() : undefined)),
  phone: z
    .string()
    .min(6)
    .max(40)
    .optional()
    .or(z.literal(""))
    .transform((value) => (value && value.trim().length > 0 ? value.trim() : undefined)),
  status: z
    .string()
    .optional()
    .transform((value) => (value && value.trim().length > 0 ? value.trim() : undefined)),
})

// `nullish()` acepta tanto `undefined` como `null` — el formulario del
// frontend manda `null` para los campos vacíos (fechas sin completar,
// ubicación sin rellenar) y zod reventaba con 400 al rechazarlos.
const createProjectSchema = z.object({
  name: z.string().min(1).max(160),
  slug: z
    .string()
    .max(120)
    .nullish()
    .transform((value) => (value && value.trim().length > 0 ? value.trim() : undefined)),
  code: z
    .string()
    .max(120)
    .nullish()
    .transform((value) => (value && value.trim().length > 0 ? value.trim() : undefined)),
  status: z
    .string()
    .max(80)
    .nullish()
    .transform((value) => (value && value.trim().length > 0 ? value.trim() : "inicial")),
  startDate: z
    .string()
    .nullish()
    .transform((value) => (value && value.length > 0 ? value : undefined)),
  estimatedDelivery: z
    .string()
    .nullish()
    .transform((value) => (value && value.length > 0 ? value : undefined)),
  locationCity: z
    .string()
    .nullish()
    .transform((value) => (value && value.length > 0 ? value : undefined)),
  locationNotes: z
    .string()
    .nullish()
    .transform((value) => (value && value.length > 0 ? value : undefined)),
  locationMapUrl: z
    .string()
    .nullish()
    .transform((value) => (value && value.trim().length > 0 ? value.trim() : undefined)),
  clientId: z.string().uuid().nullish(),
  createNewClient: z.boolean().nullish(),
  newClientFullName: z.string().nullish(),
  newClientEmail: z.string().nullish(),
  managerId: z.string().uuid().nullish(),
  teamAssignments: z.record(z.string(), z.string().uuid().nullable()).nullish(),
})

const updateProjectSchema = createProjectSchema.partial()

const assignmentsSchema = z.object({
  assignments: z.record(z.string(), z.string().uuid().nullable()),
})

const createConversationSchema = z.object({
  projectSlug: z.string().min(1).max(160).transform((value) => value.trim()),
  teamMemberId: z.string().uuid(),
})

const sendConversationMessageSchema = z.object({
  content: z
    .string()
    .max(4000)
    .transform((value) => value.trim())
    .refine((value) => value.length > 0, { message: "El mensaje no puede estar vacío" }),
})

const optionalDate = z
  .string()
  .optional()
  .transform((value) => (typeof value === "string" && value.length > 0 ? value : null))

const attachmentSchema = z.object({
  name: z.string().min(3).max(160),
  fileType: z
    .string()
    .min(5)
    .transform((value) => value.trim())
    .refine((value) => value.toLowerCase().includes("pdf"), { message: "El archivo debe ser un PDF" }),
  sizeLabel: z.string().max(120).optional(),
  content: z.string().min(20),
})

const amountSchema = z
  .union([z.number(), z.string()])
  .transform((value) => {
    if (typeof value === "number") return value
    const normalized = value.replace(",", ".")
    return Number(normalized)
  })
  .refine((value) => Number.isFinite(value) && value > 0, { message: "El importe debe ser mayor a cero" })

const createPaymentSchema = z.object({
  projectId: z.string().uuid(),
  concept: z
    .string()
    .min(3)
    .max(160)
    .transform((value) => value.trim()),
  description: z
    .string()
    .max(1000)
    .optional()
    .transform((value) => (value && value.trim().length > 0 ? value.trim() : null)),
  amount: amountSchema,
  currency: z
    .string()
    .optional()
    .transform((value) => {
      if (!value) return "EUR"
      const trimmed = value.trim()
      return trimmed.length > 0 ? trimmed.toUpperCase() : "EUR"
    }),
  dueDate: optionalDate,
  attachment: attachmentSchema.optional(),
  budgetId: z.string().uuid().optional(),
})

const updatePaymentSchema = z
  .object({
    concept: z
      .string()
      .min(3)
      .max(160)
      .optional()
      .transform((value) => (value && value.trim().length > 0 ? value.trim() : undefined)),
    description: z
      .string()
      .max(1000)
      .optional()
      .transform((value) => (value && value.trim().length > 0 ? value.trim() : null)),
    amount: amountSchema.optional(),
    currency: z
      .string()
      .optional()
      .transform((value) => (value && value.trim().length > 0 ? value.trim().toUpperCase() : undefined)),
    dueDate: optionalDate,
    attachment: attachmentSchema.optional(),
  })
  .refine(
    (data) =>
      data.concept !== undefined ||
      data.description !== undefined ||
      data.amount !== undefined ||
      data.currency !== undefined ||
      data.dueDate !== undefined ||
      data.attachment !== undefined,
    { message: "Debes proporcionar al menos un campo para actualizar." },
  )

const STORAGE_BUCKET = "project-assets"

function clientPortalBaseUrl() {
  return (env.clientAppUrl ?? "http://localhost:5173").replace(/\/$/, "")
}

function formatCurrencyLabel(amountCents: number, currency: string) {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: currency ?? "EUR",
    minimumFractionDigits: 2,
  }).format(amountCents / 100)
}

function formatDateLabel(value?: string | null) {
  if (!value) return null
  try {
    return new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "long", year: "numeric" }).format(new Date(value))
  } catch {
    return value
  }
}

interface EnsureClientAppUserResult {
  shouldInvite: boolean
  clientId: string
  clientEmail: string
  clientName: string
  projectCode?: string | null
}

async function ensureClientAppUser(
  supabase: SupabaseClient,
  clientId: string,
  options: { projectCode?: string | null },
): Promise<EnsureClientAppUserResult | null> {
  try {
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("id, full_name, email, password_initialized")
      .eq("id", clientId)
      .maybeSingle()

    if (clientError) {
      console.error("No se pudo obtener el cliente para crear usuario", clientError)
      return null
    }

    if (!client || !client.email) {
      return null
    }

    const email = client.email.trim().toLowerCase()
    const fullName = client.full_name?.trim() ?? "Cliente Terrazea"
    let shouldInvite = false

    const { data: existingUser, error: userError } = await supabase
      .from("app_users")
      .select("id, is_active, must_update_password, password_hash")
      .eq("email", email)
      .maybeSingle()

    if (userError) {
      console.error("No se pudo comprobar el usuario del cliente", userError)
      return null
    }

    if (!existingUser) {
      // Creamos la cuenta con un hash dummy aleatorio e inservible: nunca se
      // envía ni se comparte con nadie. El cliente lo sobrescribirá cuando
      // defina su contraseña real vía /client/setup-password tras entrar con
      // el código Terrazea. Esto permite dejar la columna NOT NULL intacta
      // hasta que se aplique la migración que la relaja a nullable.
      const dummyPassword = randomBytes(24).toString("base64url")
      const dummyHash = await bcrypt.hash(dummyPassword, 10)
      const { error: insertError } = await supabase.from("app_users").insert({
        email,
        full_name: fullName,
        password_hash: dummyHash,
        role: "client",
        must_update_password: true,
        is_active: true,
      })

      if (insertError) {
        console.error("No se pudo crear el usuario del cliente", insertError)
        return null
      }
      shouldInvite = true
    } else {
      if (!existingUser.is_active) {
        const { error: updateError } = await supabase
          .from("app_users")
          .update({ is_active: true, full_name: fullName })
          .eq("id", existingUser.id)
        if (updateError) {
          console.error("No se pudo reactivar el usuario del cliente", updateError)
        }
      }

      if (client.password_initialized === false) {
        shouldInvite = true
        if (existingUser.must_update_password !== true) {
          const { error: flagError } = await supabase
            .from("app_users")
            .update({ must_update_password: true })
            .eq("id", existingUser.id)
          if (flagError) {
            console.error("No se pudo marcar el usuario para crear contraseña", flagError)
          }
        }
      }
    }

    return {
      shouldInvite,
      clientId: client.id,
      clientEmail: email,
      clientName: fullName,
      projectCode: options.projectCode ?? null,
    }
  } catch (error) {
    console.error("No se pudo asegurar el usuario del cliente", error)
    return null
  }
}

async function sendDraftPayment(payment: AdminPaymentRecord): Promise<AdminPaymentRecord> {
  if (payment.status !== "draft") {
    return payment
  }

  const supabase = createServerSupabaseClient()
  const clientAppBase = clientPortalBaseUrl()

  const { data: client, error: clientError } = await supabase
    .from("clients")
    .select("id, full_name, email, stripe_customer_id")
    .eq("id", payment.clientId)
    .maybeSingle()

  const clientContact = !client || !client.email
    ? null
    : {
        id: client.id,
        name: client.full_name ?? payment.clientName ?? "Cliente Terrazea",
        email: client.email,
        stripeCustomerId: client.stripe_customer_id ?? payment.clientStripeCustomerId ?? payment.stripeCustomerId ?? null,
      }

  const notifyClientPayment = async (record: AdminPaymentRecord) => {
    if (!clientContact) return
    const paymentLink = record.paymentLink ?? `${clientAppBase}/client/payments?payment=${record.id}`
    const amountLabel = formatCurrencyLabel(record.amountCents, record.currency)
    const dueDateLabel = formatDateLabel(record.dueDate)
    try {
      await sendPaymentRequestEmail({
        to: clientContact.email,
        name: clientContact.name,
        concept: record.concept,
        amountCents: record.amountCents,
        currency: record.currency,
        paymentLink,
        dueDate: record.dueDate,
        projectName: record.projectName ?? payment.projectName ?? null,
      })
    } catch (emailError) {
      console.error("[email] No se pudo notificar el pago pendiente", emailError)
    }

    try {
      await createProjectNotification({
        audience: "client",
        clientId: clientContact.id,
        projectId: record.projectId,
        type: "payment_pending",
        title: `Nuevo pago: ${record.concept}`,
        description: dueDateLabel ? `${amountLabel} · vence ${dueDateLabel}` : amountLabel,
        linkUrl: paymentLink,
        relatedId: record.id,
        metadata: {
          paymentId: record.id,
          amountCents: record.amountCents,
          currency: record.currency,
          status: record.status,
        },
      })
    } catch (notificationError) {
      console.error("[notifications] No se pudo registrar el pago pendiente", notificationError)
    }
  }

  const fallbackPending = async (reason: string) => {
    console.warn(`[payments] Envío omitido (${reason}). Marcando pago ${payment.id} como pendiente (modo fallback).`)
    const { error: updateError } = await supabase
      .from("project_payments")
      .update({
        status: "pending",
        sent_at: new Date().toISOString(),
        payment_link: `${clientAppBase}/client/payments?payment=${payment.id}`,
        updated_at: new Date().toISOString(),
      })
      .eq("id", payment.id)
    if (updateError) {
      throw updateError
    }
    const updated = await getAdminPaymentById(payment.id)
    if (!updated) {
      throw new Error("No se pudo recuperar el pago enviado.")
    }

    await notifyClientPayment(updated)
    return updated
  }

  if (clientError || !client) {
    return fallbackPending("Cliente no disponible")
  }

  if (!client.email) {
    return fallbackPending("Cliente sin correo")
  }

  const stripeEnabled = Boolean(env.stripeSecretKey && env.stripeSecretKey.startsWith("sk_"))
  if (!stripeEnabled) {
    return fallbackPending("Stripe no configurado")
  }

  if (!clientContact) {
    return fallbackPending("Cliente sin datos de contacto")
  }

  try {
    const stripeCustomerId = await ensureStripeCustomer({
      id: clientContact.id,
      fullName: clientContact.name,
      email: clientContact.email,
      stripeCustomerId: clientContact.stripeCustomerId,
    })

    const checkoutSession = await createCheckoutSessionForPayment({
      payment,
      customerId: stripeCustomerId,
      successUrl: `${clientAppBase}/client/payments?status=success`,
      cancelUrl: `${clientAppBase}/client/payments?status=cancel`,
    })

    const paymentIntentId =
      typeof checkoutSession.payment_intent === "string"
        ? checkoutSession.payment_intent
        : checkoutSession.payment_intent?.id ?? null

    const invoiceId = typeof checkoutSession.invoice === "string" ? checkoutSession.invoice : null

    const { error: updateError } = await supabase
      .from("project_payments")
      .update({
        status: "pending",
        sent_at: new Date().toISOString(),
        payment_link: checkoutSession.url,
        stripe_payment_intent_id: paymentIntentId,
        stripe_invoice_id: invoiceId,
        stripe_customer_id: stripeCustomerId,
        stripe_checkout_session_id: checkoutSession.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", payment.id)

    if (updateError) {
      throw updateError
    }

    const updated = await getAdminPaymentById(payment.id)
    if (!updated) {
      throw new Error("No se pudo recuperar el pago enviado.")
    }
    await notifyClientPayment(updated)
    return updated
  } catch (error) {
    console.error("Error enviando pago", error)
    return fallbackPending("Error en Stripe")
  }
}

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

function slugifyName(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
}

async function uploadProjectAsset(projectId: string, type: "documents" | "photos", fileName: string, base64Content: string, contentType: string) {
  const supabase = createServerSupabaseClient()
  await ensureStorageBucketExists(supabase)
  const base64 = base64Content.includes(",") ? base64Content.split(",").pop() ?? base64Content : base64Content
  const buffer = Buffer.from(base64, "base64")
  const safeName = slugifyName(fileName || `${Date.now()}`)
  const path = `${type}/${projectId}/${Date.now()}-${safeName}`
  const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(path, buffer, { contentType, upsert: true })
  if (error) throw error
  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path)
  return { storagePath: path, publicUrl: data.publicUrl }
}

function isMissingRelationError(error: unknown, relation?: string) {
  if (!error || typeof error !== "object") return false
  const code = "code" in error ? (error as Record<string, unknown>).code : undefined
  if (code !== "42P01") return false
  if (!relation) return true
  const message = JSON.stringify(error)
  return message.toLowerCase().includes(relation.toLowerCase())
}

const SCHEMA_HINT =
  "Faltan tablas o políticas en Supabase. Ejecuta las migraciones de supabase/schema.sql (supabase db push) y reinicia la API."

const milestoneSchema = z.object({
  title: z.string().min(1),
  summary: z.string().optional(),
  scheduledStart: optionalDate,
  scheduledEnd: optionalDate,
  actualDate: optionalDate,
  weight: z.number().min(0.25).max(20).optional(),
  status: z.string().optional(),
  progressPercent: z.number().min(0).max(100).optional(),
})

const phaseSchema = z.object({
  name: z.string().min(1),
  summary: z.string().optional(),
  expectedStart: optionalDate,
  expectedEnd: optionalDate,
  actualEnd: optionalDate,
  weight: z.number().min(0.25).max(20).optional(),
  status: z.string().optional(),
  progressPercent: z.number().min(0).max(100).optional(),
})

const reorderSchema = z.object({
  items: z.array(
    z.object({
      id: z.string().uuid(),
      sortOrder: z.number().int(),
    }),
  ),
})

const documentUploadSchema = z.object({
  name: z.string().min(1),
  category: z.string().min(1),
  fileType: z.string().min(1),
  sizeLabel: z.string().optional(),
  notifyClient: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().nullable().optional(),
  uploadedBy: z.string().uuid().optional(),
  clientIds: z.array(z.string().min(1)).optional(),
  fileContent: z.string().min(10),
})

const documentUpdateSchema = z.object({
  name: z.string().optional(),
  category: z.string().optional(),
  fileType: z.string().optional(),
  sizeLabel: z.string().optional(),
  notifyClient: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
  status: z.string().optional(),
  notes: z.string().nullable().optional(),
})

const photoUploadSchema = z.object({
  caption: z.string().optional(),
  takenAt: optionalDate,
  tags: z.array(z.string()).optional(),
  isCover: z.boolean().optional(),
  fileType: z.string().min(1),
  fileContent: z.string().min(10),
})

const photoUpdateSchema = z.object({
  caption: z.string().optional(),
  takenAt: optionalDate,
  tags: z.array(z.string()).optional(),
  isCover: z.boolean().optional(),
})

const timelineSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  status: z.string().optional(),
  eventType: z.string().optional(),
})

const budgetProductSchema = z.object({
  name: z.string().min(1).max(200),
  description: z
    .string()
    .max(2000)
    .optional()
    .transform((value) => (value && value.trim().length > 0 ? value.trim() : undefined)),
  unitPrice: amountSchema,
  imageDataUrl: z
    .string()
    .min(10)
    .optional(),
  tags: z
    .array(z.string())
    .optional()
    .transform((value) =>
      (value ?? []).map((tag) => tag.trim()).filter((tag) => tag.length > 0),
    ),
})

const budgetLineSchema = z.object({
  id: z.string().min(1),
  parentId: z.string().optional().nullable(),
  productId: z.string().optional().nullable(),
  name: z.string().min(1),
  price: z.string().min(1),
  quantity: z.number().nonnegative(),
  imageDataUrl: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
})

const budgetSchema = z.object({
  title: z.string().min(1).max(200),
  clientType: z.enum(["existing", "new"]),
  clientId: z.string().uuid().optional().nullable(),
  clientName: z.string().min(1).max(200),
  clientEmail: z
    .string()
    .email()
    .optional()
    .or(z.literal(""))
    .transform((value) => (value && value.trim().length > 0 ? value.trim() : undefined)),
  items: z.array(budgetLineSchema).min(1),
  notes: z
    .string()
    .optional()
    .or(z.literal(""))
    .transform((value) => (value && value.trim().length > 0 ? value.trim() : undefined)),
  total: z.number().nonnegative(),
  taxRate: z.number().min(0).max(100),
})

function normalizeDateTime(value: unknown) {
  if (typeof value !== "string" || value.length === 0) {
    return undefined
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return undefined
  }

  return parsed.toISOString()
}

function parseEventPayload(body: unknown) {
  if (!body || typeof body !== "object") {
    return { success: false as const, error: "invalid" }
  }

  const raw = body as Record<string, unknown>

  const normalized = {
    ...raw,
    startsAt: normalizeDateTime(raw.startsAt) ?? raw.startsAt,
    endsAt: raw.endsAt === null ? null : normalizeDateTime(raw.endsAt) ?? raw.endsAt,
  }

  const parsed = projectEventWriteSchema.safeParse(normalized)
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.flatten().fieldErrors }
  }
  return { success: true as const, data: parsed.data }
}

function parsePersonalEventPayload(body: unknown) {
  if (!body || typeof body !== "object") {
    return { success: false as const, error: "invalid" }
  }

  const raw = body as Record<string, unknown>

  const normalized = {
    ...raw,
    startsAt: normalizeDateTime(raw.startsAt) ?? raw.startsAt,
    endsAt: raw.endsAt === null ? null : normalizeDateTime(raw.endsAt) ?? raw.endsAt,
  }

  const parsed = personalEventWriteSchema.safeParse(normalized)
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.flatten().fieldErrors }
  }
  return { success: true as const, data: parsed.data }
}

const router = Router()

router.use(
  asyncHandler(async (request, _response, next) => {
    requireAdminSession(request)
    next()
  }),
)

// --- Secciones protegidas por contraseña (Presupuestos / Facturación) ---
const sectionUnlockSchema = z.object({
  section: z.enum(["budgets", "payments"]),
  password: z.string().min(1).max(200),
})

const sectionLockSchema = z.object({
  section: z.enum(["budgets", "payments"]),
})

router.get(
  "/section-status",
  asyncHandler(async (request, response) => {
    const sections = Object.fromEntries(
      PROTECTED_SECTIONS.map((section) => [section, hasSectionAccess(request, section)]),
    ) as Record<(typeof PROTECTED_SECTIONS)[number], boolean>
    response.json({ sections })
  }),
)

router.post(
  "/section-unlock",
  asyncHandler(async (request, response) => {
    const parsed = sectionUnlockSchema.safeParse(request.body)
    if (!parsed.success) {
      response.status(400).json({
        message: "Datos inválidos",
        errors: parsed.error.flatten().fieldErrors,
      })
      return
    }
    const { section, password } = parsed.data
    const ok = await verifySectionPassword(section, password)
    if (!ok) {
      response.status(401).json({
        message: "Contraseña incorrecta",
        code: "SECTION_PASSWORD_INVALID",
      })
      return
    }
    grantSectionAccess(response, section)
    response.json({ success: true, section })
  }),
)

router.post(
  "/section-lock",
  asyncHandler(async (request, response) => {
    const parsed = sectionLockSchema.safeParse(request.body)
    if (!parsed.success) {
      response.status(400).json({ message: "Datos inválidos" })
      return
    }
    revokeSectionAccess(response, parsed.data.section)
    response.json({ success: true, section: parsed.data.section })
  }),
)

router.get(
  "/dashboard",
  asyncHandler(async (request, response) => {
    const status = typeof request.query.status === "string" && request.query.status.length > 0 ? request.query.status : undefined
    const managerId =
      typeof request.query.managerId === "string" && request.query.managerId.length > 0 ? request.query.managerId : undefined

    const data = await getAdminDashboardData({ status, managerId })

    response.json(data)
  }),
)

router.get(
  "/projects/calendars",
  asyncHandler(async (_request, response) => {
    const projects = await listProjectCalendarSummaries()
    response.json({ projects })
  }),
)

router.get(
  "/events",
  asyncHandler(async (request, response) => {
    const slug = typeof request.query.project === "string" ? request.query.project : null
    if (!slug) {
      response.status(400).json({ message: "Parámetro 'project' es obligatorio" })
      return
    }

    const result = await getAdminProjectEventsBySlug(slug)
    if (!result) {
      response.status(404).json({ message: "Proyecto no encontrado" })
      return
    }

    response.json(result)
  }),
)

router.get(
  "/events/global",
  asyncHandler(async (_request, response) => {
    const events = await getAdminGlobalEvents()
    response.json({ events })
  }),
)

router.post(
  "/events",
  asyncHandler(async (request, response) => {
    const payload = parseEventPayload(request.body)
    if (!payload.success) {
      response.status(400).json({ message: "Datos de evento inválidos", errors: payload.error })
      return
    }

    const session = requireAdminSession(request)
    const event = await createProjectEvent(payload.data, session.userId)
    response.status(201).json(event)
  }),
)

router.put(
  "/events/:eventId",
  asyncHandler(async (request, response) => {
    const payload = parseEventPayload(request.body)
    if (!payload.success) {
      response.status(400).json({ message: "Datos de evento inválidos", errors: payload.error })
      return
    }

    const eventId = request.params.eventId
    const event = await updateProjectEvent(eventId, payload.data)
    response.json(event)
  }),
)

router.delete(
  "/events/:eventId",
  asyncHandler(async (request, response) => {
    await deleteProjectEvent(request.params.eventId)
    response.status(204).end()
  }),
)

router.get(
  "/personal-events",
  asyncHandler(async (request, response) => {
    const session = requireAdminSession(request)
    const events = await listAdminPersonalEvents(session.userId)
    response.json({ events })
  }),
)

router.post(
  "/personal-events",
  asyncHandler(async (request, response) => {
    const payload = parsePersonalEventPayload(request.body)
    if (!payload.success) {
      response.status(400).json({ message: "Datos de evento personal inválidos", errors: payload.error })
      return
    }

    const session = requireAdminSession(request)
    const event = await createPersonalEvent(payload.data, session.userId)
    response.status(201).json(event)
  }),
)

router.put(
  "/personal-events/:eventId",
  asyncHandler(async (request, response) => {
    const payload = parsePersonalEventPayload(request.body)
    if (!payload.success) {
      response.status(400).json({ message: "Datos de evento personal inválidos", errors: payload.error })
      return
    }

    const session = requireAdminSession(request)
    const eventId = request.params.eventId
    const event = await updatePersonalEvent(eventId, payload.data, session.userId)
    response.json(event)
  }),
)

router.delete(
  "/personal-events/:eventId",
  asyncHandler(async (request, response) => {
    const session = requireAdminSession(request)
    await deletePersonalEvent(request.params.eventId, session.userId)
    response.status(204).end()
  }),
)

router.get(
  "/documents",
  asyncHandler(async (request, response) => {
    const slug = typeof request.query.project === "string" ? request.query.project : undefined
    const data = await getDocuments(slug)
    response.json(data)
  }),
)

router.get(
  "/messages",
  asyncHandler(async (request, response) => {
    requireAdminSession(request)
    const slug = typeof request.query.project === "string" ? request.query.project : undefined
    const data = await getMessages(slug)
    response.json(data)
  }),
)

router.post(
  "/messages",
  asyncHandler(async (request, response) => {
    requireAdminSession(request)
    const parsed = createConversationSchema.safeParse(request.body)

    if (!parsed.success) {
      response.status(400).json({
        message: "Datos de conversación inválidos",
        errors: parsed.error.flatten().fieldErrors,
      })
      return
    }

    try {
      const conversationId = await ensureProjectConversation(parsed.data.projectSlug, parsed.data.teamMemberId)
      response.status(201).json({ conversationId })
    } catch (error) {
      console.error("Error creating conversation", error)
      response.status(500).json({ message: "No se pudo crear la conversación." })
    }
  }),
)

router.post(
  "/messages/:conversationId/messages",
  asyncHandler(async (request, response) => {
    requireAdminSession(request)
    const parsed = sendConversationMessageSchema.safeParse(request.body)

    if (!parsed.success) {
      response.status(400).json({
        message: "Mensaje inválido",
        errors: parsed.error.flatten().fieldErrors,
      })
      return
    }

    try {
      const conversationId = request.params.conversationId
      if (!conversationId) {
        response.status(400).json({ message: "Conversación no especificada." })
        return
      }

      await sendTeamMemberConversationMessage(conversationId, parsed.data.content)
      response.status(201).json({ success: true })
    } catch (error) {
      const status = (error as Error & { status?: number }).status ?? 500
      if (status >= 400 && status < 500) {
        response.status(status).json({ message: (error as Error).message })
        return
      }
      throw error
    }
  }),
)

router.get(
  "/clients",
  asyncHandler(async (_request, response) => {
    const clients = await getAdminClientsOverview()
    response.json({ clients })
  }),
)

router.get(
  "/clients/:clientId",
  asyncHandler(async (request, response) => {
    requireAdminSession(request)
    const { clientId } = request.params
    if (!clientId) {
      response.status(400).json({ message: "Cliente no especificado" })
      return
    }
    try {
      const details = await getAdminClientDetail(clientId)
      response.json(details)
    } catch (error) {
      const status =
        typeof error === "object" && error !== null && "status" in error
          ? ((error as { status?: number }).status ?? 500)
          : 500
      if (status === 404) {
        response.status(404).json({ message: "Cliente no encontrado" })
        return
      }
      console.error("[admin] Error obteniendo ficha de cliente", error)
      response.status(500).json({ message: "No pudimos cargar el cliente." })
    }
  }),
)

router.get(
  "/team-members",
  asyncHandler(async (request, response) => {
    requireAdminSession(request)
    const view = typeof request.query.view === "string" ? request.query.view : "compact"
    const search = typeof request.query.search === "string" ? request.query.search : undefined
    const roles = typeof request.query.roles === "string" ? request.query.roles.split(",").map((value) => value.trim()).filter(Boolean) : undefined
    const status = typeof request.query.status === "string" ? request.query.status.split(",").map((value) => value.trim()).filter(Boolean) : undefined

    const result = await listAdminTeamMembers({
      search,
      roles,
      status,
    })

    response.json({
      teamMembers: result.members.map((member) => ({
        id: member.id,
        name: member.fullName,
        role: member.role,
        email: member.email,
        phone: member.phone,
        status: member.status,
        createdAt: member.createdAt,
        projects: view === "directory" ? member.projects : undefined,
      })),
      totals: result.totals,
    })
  }),
)

router.post(
  "/team-members",
  asyncHandler(async (request, response) => {
    requireAdminSession(request)
    const parsed = createTeamMemberSchema.safeParse(request.body)

    if (!parsed.success) {
      response.status(400).json({ message: "Datos del equipo inválidos", errors: parsed.error.flatten().fieldErrors })
      return
    }

    try {
      const member = await createAdminTeamMember(parsed.data)

      response.status(201).json({
        teamMember: {
          id: member.id,
          name: member.fullName,
          role: member.role,
          email: member.email,
          phone: member.phone,
          status: member.status,
          createdAt: member.createdAt,
          projects: [],
        },
      })
    } catch (error) {
      if (isMissingRelationError(error, "team_members")) {
        response.status(500).json({ message: SCHEMA_HINT })
        return
      }
      throw error
    }
  }),
)

// Reemplaza el set completo de proyectos asignados a un miembro del equipo.
// Body: { assignments: [{ projectId, role, isPrimary? }, ...] }
router.put(
  "/team-members/:memberId/projects",
  asyncHandler(async (request, response) => {
    requireAdminSession(request)
    const { memberId } = request.params
    const { assignments } = (request.body ?? {}) as {
      assignments?: Array<{ projectId?: unknown; role?: unknown; isPrimary?: unknown }>
    }

    if (!memberId) {
      response.status(400).json({ message: "Miembro no especificado" })
      return
    }
    if (!Array.isArray(assignments)) {
      response.status(400).json({ message: "assignments debe ser un array" })
      return
    }

    // Validación ligera: solo pasamos entradas con projectId y role válidos.
    const sanitized = assignments
      .filter((entry) => entry && typeof entry.projectId === "string" && typeof entry.role === "string")
      .map((entry) => ({
        projectId: (entry.projectId as string).trim(),
        role: (entry.role as string).trim(),
        isPrimary: entry.isPrimary === true,
      }))
      .filter((entry) => entry.projectId.length > 0 && entry.role.length > 0)

    try {
      await setTeamMemberProjects(memberId, sanitized)
      response.json({ success: true, assigned: sanitized.length })
    } catch (error) {
      console.error("[admin-team] Error asignando proyectos", error)
      response.status(500).json({
        message:
          error instanceof Error ? error.message : "No se pudieron guardar las asignaciones",
      })
    }
  }),
)

router.post(
  "/clients",
  asyncHandler(async (request, response) => {
    const parsed = createClientSchema.safeParse(request.body)
    if (!parsed.success) {
      response.status(400).json({ message: "Datos de cliente inválidos", errors: parsed.error.flatten().fieldErrors })
      return
    }

    const supabase = createServerSupabaseClient()
    const normalizedEmail = parsed.data.email.trim().toLowerCase()

    const { data, error } = await supabase
      .from("clients")
      .insert({
        full_name: parsed.data.fullName.trim(),
        email: normalizedEmail,
        password_initialized: false,
      })
      .select("id, full_name, email")
      .maybeSingle()

    if (error || !data) {
      const isUnique = error?.code === "23505"
      if (isUnique) {
        const { data: existingClient } = await supabase
          .from("clients")
          .select("id, full_name, email")
          .eq("email", normalizedEmail)
          .maybeSingle()

        if (existingClient) {
          response.json({ client: existingClient })
          return
        }
      }
      response.status(isUnique ? 409 : 500).json({
        message: isUnique ? "Ya existe un cliente con este correo." : "No se pudo crear el cliente.",
      })
      return
    }

      const ensured = await ensureClientAppUser(supabase, data.id, { projectCode: null })
      if (ensured?.shouldInvite) {
        const portalUrl = `${clientPortalBaseUrl()}/login?mode=code`
        try {
          await sendClientWelcomeEmail({
            to: ensured.clientEmail,
            name: ensured.clientName,
            projectCode: ensured.projectCode,
            forceSend: true,
          })
        } catch (emailError) {
          console.error("[email] No se pudo enviar la invitación al cliente", emailError)
        }

      try {
        await createProjectNotification({
          audience: "client",
          clientId: ensured.clientId,
          projectId: null,
          type: "client_invited",
          title: "Bienvenido al Portal Terrazea",
          description: "Activa tu acceso para empezar a seguir tu proyecto.",
          linkUrl: portalUrl,
          metadata: { email: ensured.clientEmail },
        })
      } catch (notificationError) {
        console.error("[notifications] No se pudo registrar la invitación de cliente", notificationError)
      }
    }

    try {
      await createProjectNotification({
        audience: "admin",
        clientId: data.id,
        projectId: null,
        type: "client_created",
        title: `Nuevo cliente: ${data.full_name}`,
        description: data.email,
        metadata: { clientId: data.id, email: data.email },
      })
    } catch (notificationError) {
      console.error("[notifications] No se pudo registrar el alta de cliente", notificationError)
    }

    response.status(201).json({ client: data })
  }),
)

router.get(
  "/payments",
  asyncHandler(async (request, response) => {
    requireAdminSession(request)
    const result = await listAdminPayments()
    response.json(result)
  }),
)

router.post(
  "/payments",
  asyncHandler(async (request, response) => {
    const session = requireAdminSession(request)
    const parsed = createPaymentSchema.safeParse(request.body)

    if (!parsed.success) {
      response.status(400).json({ message: "Datos de pago inválidos", errors: parsed.error.flatten().fieldErrors })
      return
    }

    const { projectId, concept, description, amount, currency, dueDate, attachment, budgetId } = parsed.data
    const amountCents = Math.round(amount * 100)
    let proposalDocumentId: string | null = null

    if (attachment) {
      try {
        const upload = await uploadProjectAsset(projectId, "documents", attachment.name, attachment.content, attachment.fileType)
        proposalDocumentId = await createProjectDocument(projectId, {
          name: attachment.name,
          category: "Presupuestos",
          fileType: attachment.fileType,
          sizeLabel: attachment.sizeLabel ?? null,
          storagePath: upload.storagePath,
          notifyClient: false,
          tags: ["presupuesto", "pagos"],
          notes: description ?? null,
          uploadedBy: session.userId,
        })
      } catch (error) {
        console.warn("No se pudo guardar el PDF adjunto. Continuamos sin documento.", error)
        proposalDocumentId = null
      }
    }

    try {
      const payment = await createProjectPayment({
        projectId,
        concept,
        description,
        amountCents,
        currency,
        dueDate,
        createdBy: session.userId,
        proposalDocumentId,
        budgetId,
      })
      let sentPayment = payment
      try {
        sentPayment = await sendDraftPayment(payment)
      } catch (error) {
        console.error("No se pudo enviar el pago automáticamente", error)
      }
      response.status(201).json({ payment: sentPayment })
    } catch (error) {
      if (isMissingRelationError(error, "project_payments")) {
        response.status(500).json({ message: SCHEMA_HINT })
        return
      }
      throw error
    }
  }),
)

router.post(
  "/payments/:paymentId/send",
  asyncHandler(async (request, response) => {
    requireAdminSession(request)
    const paymentId = request.params.paymentId
    if (!paymentId) {
      response.status(400).json({ message: "Pago no especificado" })
      return
    }

    const payment = await getAdminPaymentById(paymentId)
    if (!payment) {
      response.status(404).json({ message: "Pago no encontrado" })
      return
    }

    if (payment.status !== "draft") {
      response.json({ payment })
      return
    }

    try {
      const updated = await sendDraftPayment(payment)
      response.json({ payment: updated })
    } catch (error) {
      console.error("No se pudo reenviar el pago", error)
      response.status(500).json({ message: "No pudimos volver a enviar el pago. Inténtalo de nuevo.", payment })
    }
  }),
)

router.patch(
  "/payments/:paymentId",
  asyncHandler(async (request, response) => {
    const session = requireAdminSession(request)
    const { paymentId } = request.params
    const parsed = updatePaymentSchema.safeParse(request.body)
    if (!parsed.success) {
      response.status(400).json({ message: "Datos de pago inválidos", errors: parsed.error.flatten().fieldErrors })
      return
    }

    const payment = await getAdminPaymentById(paymentId)
    if (!payment) {
      response.status(404).json({ message: "Pago no encontrado" })
      return
    }

    if (payment.status === "paid") {
      response.status(400).json({ message: "Los pagos completados no pueden editarse." })
      return
    }

    const { concept, description, amount, currency, dueDate, attachment } = parsed.data
    let proposalDocumentId = payment.proposalDocumentId ?? null

    if (attachment) {
      try {
        const upload = await uploadProjectAsset(payment.projectId, "documents", attachment.name, attachment.content, attachment.fileType)
        proposalDocumentId = await createProjectDocument(payment.projectId, {
          name: attachment.name,
          category: "Presupuestos",
          fileType: attachment.fileType,
          sizeLabel: attachment.sizeLabel ?? null,
          storagePath: upload.storagePath,
          notifyClient: false,
          tags: ["presupuesto", "pagos"],
          notes: description ?? payment.description ?? null,
          uploadedBy: session.userId,
        })
      } catch (error) {
        console.warn("No se pudo adjuntar el PDF durante la edición", error)
      }
    }

    const updatePayload: UpdateProjectPaymentInput = {}
    if (concept !== undefined) updatePayload.concept = concept
    if (description !== undefined) updatePayload.description = description
    if (amount !== undefined) updatePayload.amountCents = Math.round(amount * 100)
    if (currency !== undefined) updatePayload.currency = currency
    if (dueDate !== undefined) updatePayload.dueDate = dueDate ?? null
    if (proposalDocumentId !== payment.proposalDocumentId) updatePayload.proposalDocumentId = proposalDocumentId

    try {
      const updated = await updateProjectPayment(paymentId, updatePayload)
      response.json({ payment: updated })
    } catch (error) {
      response.status(400).json({ message: error instanceof Error ? error.message : "No se pudo actualizar el pago." })
    }
  }),
)

router.delete(
  "/payments/:paymentId",
  asyncHandler(async (request, response) => {
    requireAdminSession(request)
    const { paymentId } = request.params
    const payment = await getAdminPaymentById(paymentId)
    if (!payment) {
      response.status(404).json({ message: "Pago no encontrado" })
      return
    }

    if (payment.status === "paid") {
      response.status(400).json({ message: "No puedes eliminar un pago completado." })
      return
    }

    await deleteProjectPayment(paymentId)
    response.status(204).end()
  }),
)

router.get(
  "/projects",
  asyncHandler(async (request, response) => {
    requireAdminSession(request)

    const status = typeof request.query.status === "string" ? request.query.status.split(",").map((value) => value.trim()).filter(Boolean) : undefined
    const allowedSortFields = new Set(["name", "progress", "start_date", "estimated_delivery", "status", "updated_at"])
    const allowedSortOrders = new Set(["asc", "desc"])

    const pageParam = typeof request.query.page === "string" ? Number.parseInt(request.query.page, 10) : undefined
    const pageSizeParam = typeof request.query.pageSize === "string" ? Number.parseInt(request.query.pageSize, 10) : undefined

    const filters = {
      search: typeof request.query.search === "string" ? request.query.search : undefined,
      status,
      managerId: typeof request.query.managerId === "string" && request.query.managerId.length > 0 ? request.query.managerId : undefined,
      startDateFrom: typeof request.query.startDateFrom === "string" ? request.query.startDateFrom : undefined,
      startDateTo: typeof request.query.startDateTo === "string" ? request.query.startDateTo : undefined,
      endDateFrom: typeof request.query.endDateFrom === "string" ? request.query.endDateFrom : undefined,
      endDateTo: typeof request.query.endDateTo === "string" ? request.query.endDateTo : undefined,
      sortBy: typeof request.query.sortBy === "string" && allowedSortFields.has(request.query.sortBy) ? (request.query.sortBy as any) : undefined,
      sortOrder: typeof request.query.sortOrder === "string" && allowedSortOrders.has(request.query.sortOrder) ? (request.query.sortOrder as any) : undefined,
      page: Number.isFinite(pageParam) ? pageParam : undefined,
      pageSize: Number.isFinite(pageSizeParam) ? pageSizeParam : undefined,
    }

    const result = await listAdminProjects(filters)
    response.json(result)
  }),
)

router.post(
  "/projects",
  asyncHandler(async (request, response) => {
    const parsed = createProjectSchema.safeParse(request.body)
    if (!parsed.success) {
      response.status(400).json({ message: "Datos de proyecto inválidos", errors: parsed.error.flatten().fieldErrors })
      return
    }

    const supabase = createServerSupabaseClient()
    const data = parsed.data

    try {
      let clientId = data.clientId
      let createdNewClient = false
      let newClientContact: { name: string; email: string } | null = null

      if (data.createNewClient) {
        const clientName = data.newClientFullName?.trim()
        const clientEmail = data.newClientEmail?.trim().toLowerCase()

        if (!clientName || !clientEmail) {
          response.status(400).json({
            message: "Introduce el nombre y correo del nuevo cliente.",
            errors: {
              newClientFullName: !clientName ? ["Introduce el nombre del cliente"] : undefined,
              newClientEmail: !clientEmail ? ["Introduce el correo del cliente"] : undefined,
            },
          })
          return
        }

        const { data: insertedClient, error: insertClientError } = await supabase
          .from("clients")
          .insert({ full_name: clientName, email: clientEmail, password_initialized: false })
          .select("id")
          .maybeSingle()

        if (insertClientError || !insertedClient) {
          const isUnique = insertClientError?.code === "23505"
          if (isUnique) {
            // Ya existe un cliente con ese correo: reutilizamos su id en vez
            // de bloquear la creación del proyecto. Así "crear proyecto con
            // cliente nuevo" se comporta como upsert.
            const { data: existingClient, error: existingError } = await supabase
              .from("clients")
              .select("id")
              .eq("email", clientEmail)
              .maybeSingle()

            if (existingError || !existingClient) {
              response.status(500).json({
                message: "El cliente ya existe pero no pudimos reutilizarlo.",
              })
              return
            }

            createdNewClient = false
            clientId = existingClient.id
            newClientContact = { name: clientName, email: clientEmail }
          } else {
            response.status(500).json({
              message: "No se pudo crear el cliente asociado.",
            })
            return
          }
        } else {
          createdNewClient = true
          clientId = insertedClient.id
          newClientContact = { name: clientName, email: clientEmail }
        }
      }

      if (!clientId) {
        response.status(400).json({
          message: "Selecciona un cliente o crea uno nuevo.",
          errors: { clientId: ["Selecciona un cliente"] },
        })
        return
      }

      const assignments: Partial<Record<ProjectTeamRole, string | null>> = {}

      if (data.teamAssignments) {
        for (const [role, memberId] of Object.entries(data.teamAssignments)) {
          if (PROJECT_TEAM_ROLES.includes(role as ProjectTeamRole)) {
            assignments[role as ProjectTeamRole] = memberId && memberId.length > 0 ? memberId : null
          }
        }
      }

      if (data.managerId && assignments.director === undefined) {
        assignments.director = data.managerId
      }

      const project = await createAdminProjectRecord({
        name: data.name,
        slug: data.slug,
        clientId,
        code: data.code ?? null,
        status: data.status ?? "inicial",
        startDate: data.startDate ?? null,
        estimatedDelivery: data.estimatedDelivery ?? null,
        locationCity: data.locationCity ?? null,
        locationNotes: data.locationNotes ?? null,
        locationMapUrl: data.locationMapUrl ?? null,
        managerId: data.managerId ?? null,
        assignments,
      })

      const ensured = await ensureClientAppUser(supabase, clientId, { projectCode: project.code })
      console.log("[project-create] ensureClientAppUser:", {
        success: Boolean(ensured),
        shouldInvite: ensured?.shouldInvite ?? null,
        createdNewClient,
        clientEmail: ensured?.clientEmail ?? newClientContact?.email ?? null,
      })

      const recipient = ensured
        ? { email: ensured.clientEmail, name: ensured.clientName }
        : createdNewClient && newClientContact
          ? { email: newClientContact.email, name: newClientContact.name }
          : null

      // Dos casos:
      //   · Cliente nuevo o aún no activado → welcome con código para activar.
      //   · Cliente ya activado → aviso "nuevo proyecto disponible" (sin
      //     pedirle activación, solo el enlace para abrirlo).
      const needsActivation = Boolean(ensured?.shouldInvite || createdNewClient)

      if (recipient && needsActivation) {
        const portalUrl = `${clientPortalBaseUrl()}/login?mode=code`
        try {
          console.log("[project-create] enviando welcome a", recipient.email)
          await sendClientWelcomeEmail({
            to: recipient.email,
            name: recipient.name,
            projectCode: project.code ?? null,
            projectName: project.name,
            forceSend: true,
          })
          console.log("[project-create] welcome enviado OK")
        } catch (emailError) {
          console.error("[email] No se pudo enviar invitación del proyecto", emailError)
        }

        if (ensured) {
          try {
            await createProjectNotification({
              audience: "client",
              clientId: ensured.clientId,
              projectId: project.id,
              type: "client_invited",
              title: "Acceso disponible a tu proyecto",
              description: `Activa tu cuenta para seguir ${project.name}.`,
              linkUrl: portalUrl,
              metadata: { projectId: project.id, projectCode: project.code },
            })
          } catch (notificationError) {
            console.error("[notifications] No se pudo registrar la invitación del proyecto", notificationError)
          }
        }
      } else if (recipient) {
        // Cliente ya activado → solo aviso del proyecto nuevo.
        try {
          console.log("[project-create] enviando aviso de nuevo proyecto a", recipient.email)
          await sendNewProjectAssignedEmail({
            to: recipient.email,
            name: recipient.name,
            projectName: project.name,
            projectCode: project.code ?? null,
            projectSlug: project.slug,
            forceSend: true,
          })
          console.log("[project-create] aviso de nuevo proyecto enviado OK")
        } catch (emailError) {
          console.error("[email] No se pudo enviar aviso de nuevo proyecto", emailError)
        }

        if (ensured) {
          try {
            await createProjectNotification({
              audience: "client",
              clientId: ensured.clientId,
              projectId: project.id,
              type: "new_project_assigned",
              title: `Nuevo proyecto: ${project.name}`,
              description: "Ya puedes seguir su avance desde tu portal.",
              linkUrl: `${clientPortalBaseUrl()}/client/projects?project=${encodeURIComponent(project.slug)}`,
              metadata: { projectId: project.id, projectCode: project.code },
            })
          } catch (notificationError) {
            console.error("[notifications] No se pudo registrar el nuevo proyecto", notificationError)
          }
        }
      } else {
        console.log("[project-create] skip email: sin destinatario")
      }

      response.status(201).json({ message: "Proyecto creado", project })
    } catch (error) {
      if (
        isMissingRelationError(error, "projects") ||
        isMissingRelationError(error, "project_team_members") ||
        isMissingRelationError(error, "team_members")
      ) {
        response.status(500).json({ message: SCHEMA_HINT })
        return
      }
      throw error
    }
  }),
)

router.patch(
  "/projects/:projectId",
  asyncHandler(async (request, response) => {
    requireAdminSession(request)
    const { projectId } = request.params
    const parsed = updateProjectSchema.safeParse(request.body)
    if (!parsed.success) {
      response.status(400).json({ message: "Datos inválidos", errors: parsed.error.flatten().fieldErrors })
      return
    }

    const payload = parsed.data

    const assignments: Partial<Record<ProjectTeamRole, string | null>> | undefined = payload.teamAssignments
      ? Object.fromEntries(
          Object.entries(payload.teamAssignments)
            .filter(([role]) => PROJECT_TEAM_ROLES.includes(role as ProjectTeamRole))
            .map(([role, memberId]) => [role as ProjectTeamRole, memberId && memberId.length > 0 ? memberId : null]),
        )
      : undefined

    await updateAdminProjectBasics(projectId, {
      name: payload.name,
      slug: payload.slug,
      code: payload.code,
      status: payload.status,
      startDate: payload.startDate,
      estimatedDelivery: payload.estimatedDelivery,
      locationCity: payload.locationCity,
      locationNotes: payload.locationNotes,
      locationMapUrl: payload.locationMapUrl,
      managerId: payload.managerId,
      assignments,
    })

    response.json({ message: "Proyecto actualizado" })
  }),
)

router.post(
  "/projects/:projectId/team",
  asyncHandler(async (request, response) => {
    requireAdminSession(request)
    const { projectId } = request.params
    const parsed = assignmentsSchema.safeParse(request.body)
    if (!parsed.success) {
      response.status(400).json({ message: "Datos de equipo inválidos", errors: parsed.error.flatten().fieldErrors })
      return
    }

    const assignments = Object.fromEntries(
      Object.entries(parsed.data.assignments)
        .filter(([role]) => PROJECT_TEAM_ROLES.includes(role as ProjectTeamRole))
        .map(([role, memberId]) => [role as ProjectTeamRole, memberId ?? null]),
    ) as Partial<Record<ProjectTeamRole, string | null>>

    await assignProjectTeamRoles(projectId, assignments)
    response.json({ message: "Equipo actualizado" })
  }),
)

router.post(
  "/projects/:projectId/archive",
  asyncHandler(async (request, response) => {
    requireAdminSession(request)
    const { projectId } = request.params
    await archiveAdminProject(projectId)
    response.json({ message: "Proyecto archivado" })
  }),
)

router.post(
  "/projects/:projectId/restore",
  asyncHandler(async (request, response) => {
    requireAdminSession(request)
    const { projectId } = request.params
    // Al restaurar un proyecto archivado, lo devolvemos a ejecución — es el
    // estado activo dentro del flujo canónico.
    await updateAdminProjectBasics(projectId, { status: "obra_ejecucion" })
    response.json({ message: "Proyecto restaurado" })
  }),
)

router.post(
  "/projects/:projectId/duplicate",
  asyncHandler(async (request, response) => {
    requireAdminSession(request)
    const { projectId } = request.params
    const project = await duplicateAdminProject(projectId)
    response.status(201).json({ project })
  }),
)

router.delete(
  "/projects/:projectId",
  asyncHandler(async (request, response) => {
    requireAdminSession(request)
    const { projectId } = request.params
    await deleteAdminProjectRecord(projectId)
    response.status(204).end()
  }),
)

router.post(
  "/projects/:projectId/milestones",
  asyncHandler(async (request, response) => {
    requireAdminSession(request)
    const { projectId } = request.params
    const parsed = milestoneSchema.safeParse(request.body)
    if (!parsed.success) {
      response.status(400).json({ message: "Datos de hito inválidos", errors: parsed.error.flatten().fieldErrors })
      return
    }
    const id = await createProjectMilestone(projectId, parsed.data)
    await recordProjectTimelineEvent(projectId, {
      title: `Nuevo hito: ${parsed.data.title}`,
      description: parsed.data.summary ?? null,
      eventType: "milestone_created",
      status: "info",
    })
    response.status(201).json({ id })
  }),
)

router.patch(
  "/projects/:projectId/milestones/:milestoneId",
  asyncHandler(async (request, response) => {
    requireAdminSession(request)
    const { milestoneId } = request.params
    const parsed = milestoneSchema.partial().safeParse(request.body)
    if (!parsed.success) {
      response.status(400).json({ message: "Datos de hito inválidos", errors: parsed.error.flatten().fieldErrors })
      return
    }
    await updateProjectMilestone(milestoneId, parsed.data)
    response.json({ message: "Hito actualizado" })
  }),
)

router.post(
  "/projects/:projectId/milestones/reorder",
  asyncHandler(async (request, response) => {
    requireAdminSession(request)
    const { projectId } = request.params
    const parsed = reorderSchema.safeParse(request.body)
    if (!parsed.success) {
      response.status(400).json({ message: "Orden inválido", errors: parsed.error.flatten().fieldErrors })
      return
    }
    await reorderProjectMilestones(projectId, parsed.data.items)
    response.json({ message: "Hitos reordenados" })
  }),
)

router.delete(
  "/projects/:projectId/milestones/:milestoneId",
  asyncHandler(async (request, response) => {
    requireAdminSession(request)
    const { milestoneId } = request.params
    await deleteProjectMilestone(milestoneId)
    response.status(204).end()
  }),
)

router.post(
  "/projects/:projectId/phases",
  asyncHandler(async (request, response) => {
    requireAdminSession(request)
    const { projectId } = request.params
    const parsed = phaseSchema.safeParse(request.body)
    if (!parsed.success) {
      response.status(400).json({ message: "Datos de fase inválidos", errors: parsed.error.flatten().fieldErrors })
      return
    }
    const id = await createProjectPhase(projectId, parsed.data)
    response.status(201).json({ id })
  }),
)

router.patch(
  "/projects/:projectId/phases/:phaseId",
  asyncHandler(async (request, response) => {
    requireAdminSession(request)
    const { phaseId } = request.params
    const parsed = phaseSchema.partial().safeParse(request.body)
    if (!parsed.success) {
      response.status(400).json({ message: "Datos de fase inválidos", errors: parsed.error.flatten().fieldErrors })
      return
    }
    await updateProjectPhase(phaseId, parsed.data)
    response.json({ message: "Fase actualizada" })
  }),
)

router.post(
  "/projects/:projectId/phases/reorder",
  asyncHandler(async (request, response) => {
    requireAdminSession(request)
    const { projectId } = request.params
    const parsed = reorderSchema.safeParse(request.body)
    if (!parsed.success) {
      response.status(400).json({ message: "Orden inválido", errors: parsed.error.flatten().fieldErrors })
      return
    }
    await reorderProjectPhases(projectId, parsed.data.items)
    response.json({ message: "Fases reordenadas" })
  }),
)

router.delete(
  "/projects/:projectId/phases/:phaseId",
  asyncHandler(async (request, response) => {
    requireAdminSession(request)
    const { phaseId } = request.params
    await deleteProjectPhase(phaseId)
    response.status(204).end()
  }),
)

router.post(
  "/projects/:projectId/documents",
  asyncHandler(async (request, response) => {
    const session = requireAdminSession(request)
    const { projectId } = request.params
    const supabase = createServerSupabaseClient()
    const parsed = documentUploadSchema.safeParse(request.body)
    if (!parsed.success) {
      console.warn("Documento inválido", parsed.error.flatten().fieldErrors)
      response.status(400).json({ message: "Datos de documento inválidos", errors: parsed.error.flatten().fieldErrors })
      return
    }

    const upload = await uploadProjectAsset(projectId, "documents", parsed.data.name, parsed.data.fileContent, parsed.data.fileType)
    const clientIds = parsed.data.clientIds ?? []
    const notifyClient = parsed.data.notifyClient ?? clientIds.length > 0
    const tags = parsed.data.tags ?? []
    const uploaderId = parsed.data.uploadedBy ?? null
    const id = await createProjectDocument(projectId, {
      name: parsed.data.name,
      category: parsed.data.category,
      fileType: parsed.data.fileType,
      sizeLabel: parsed.data.sizeLabel ?? null,
      storagePath: upload.storagePath,
      notifyClient,
      tags,
      notes: parsed.data.notes ?? null,
      uploadedBy: uploaderId,
    })

    if (clientIds.length > 0) {
      await Promise.all(
        clientIds.map((clientId) =>
          createClientDocumentRecord(clientId, {
            name: parsed.data.name,
            category: parsed.data.category,
            fileType: parsed.data.fileType,
            sizeLabel: parsed.data.sizeLabel ?? null,
            storagePath: upload.storagePath,
            url: upload.publicUrl,
            projectId,
            tags,
            notes: parsed.data.notes ?? null,
            notifyClient: true,
            uploadedBy: uploaderId,
          }),
        ),
      )
    }

    await recordProjectTimelineEvent(projectId, {
      title: `Nuevo documento: ${parsed.data.name}`,
      eventType: notifyClient ? "document_shared" : "document_uploaded",
      status: "info",
    })

    if (notifyClient) {
      try {
        const sharedClientIds = new Set(clientIds.filter(Boolean))
        let projectName: string | null = null

        const { data: projectRow } = await supabase
          .from("projects")
          .select("id, name, client_id")
          .eq("id", projectId)
          .maybeSingle()
        projectName = projectRow?.name ?? null

        if (!sharedClientIds.size && projectRow?.client_id) {
          sharedClientIds.add(projectRow.client_id)
        }

        if (sharedClientIds.size > 0) {
          const { data: recipients } = await supabase
            .from("clients")
            .select("id, full_name, email")
            .in("id", Array.from(sharedClientIds))

          await Promise.all(
            (recipients ?? [])
              .filter((recipient) => recipient.email)
              .map(async (recipient) => {
                await sendDocumentSharedEmail({
                  to: recipient.email!,
                  name: recipient.full_name ?? "Cliente Terrazea",
                  documentName: parsed.data.name,
                  documentCategory: parsed.data.category,
                  projectName,
                  documentUrl: upload.publicUrl,
                })

                try {
                  await createProjectNotification({
                    audience: "client",
                    clientId: recipient.id,
                    projectId,
                    type: "document_shared",
                    title: parsed.data.name,
                    description: parsed.data.category ?? "Documento disponible",
                    linkUrl: upload.publicUrl,
                    relatedId: id,
                    metadata: {
                      projectId,
                      documentId: id,
                      category: parsed.data.category,
                    },
                  })
                } catch (notificationError) {
                  console.error("[notifications] No se pudo registrar el nuevo documento", notificationError)
                }
              }),
          )
        }
      } catch (emailError) {
        console.error("[email] No se pudo notificar el nuevo documento", emailError)
      }
    }

    response.status(201).json({ id, url: upload.publicUrl })
  }),
)

router.patch(
  "/projects/:projectId/documents/:documentId",
  asyncHandler(async (request, response) => {
    requireAdminSession(request)
    const { documentId } = request.params
    const parsed = documentUpdateSchema.safeParse(request.body)
    if (!parsed.success) {
      response.status(400).json({ message: "Datos de documento inválidos", errors: parsed.error.flatten().fieldErrors })
      return
    }
    await updateProjectDocument(documentId, parsed.data)
    response.json({ message: "Documento actualizado" })
  }),
)

router.delete(
  "/projects/:projectId/documents/:documentId",
  asyncHandler(async (request, response) => {
    requireAdminSession(request)
    const { documentId } = request.params
    await deleteProjectDocument(documentId)
    response.status(204).end()
  }),
)

router.post(
  "/projects/:projectId/photos",
  asyncHandler(async (request, response) => {
    requireAdminSession(request)
    const { projectId } = request.params
    const parsed = photoUploadSchema.safeParse(request.body)
    if (!parsed.success) {
      response.status(400).json({ message: "Datos de foto inválidos", errors: parsed.error.flatten().fieldErrors })
      return
    }

    const filename = parsed.data.caption ? `${parsed.data.caption}.jpg` : `foto-${Date.now()}.jpg`
    const upload = await uploadProjectAsset(projectId, "photos", filename, parsed.data.fileContent, parsed.data.fileType)
    const id = await createProjectPhoto(projectId, {
      url: upload.publicUrl,
      caption: parsed.data.caption ?? null,
      takenAt: parsed.data.takenAt ?? null,
      storagePath: upload.storagePath,
      tags: parsed.data.tags ?? [],
      isCover: parsed.data.isCover ?? false,
    })

    if (parsed.data.isCover) {
      const supabase = createServerSupabaseClient()
      await supabase
        .from("project_photos")
        .update({ is_cover: false })
        .eq("project_id", projectId)
        .neq("id", id)
    }

    await recordProjectTimelineEvent(projectId, {
      title: "Nueva foto del proyecto",
      eventType: "photo_uploaded",
      status: "info",
    })

    response.status(201).json({ id, url: upload.publicUrl })
  }),
)

router.get(
  "/notifications",
  asyncHandler(async (request, response) => {
    requireAdminSession(request)
    const limitParam = typeof request.query.limit === "string" ? Number.parseInt(request.query.limit, 10) : undefined
    const limit = Number.isFinite(limitParam) ? limitParam : undefined
    const feed = await listAdminNotifications({ limit })
    response.json(feed)
  }),
)

// Catálogo de productos de presupuesto --------------------------------------

router.get(
  "/budget-products",
  asyncHandler(async (_request, response) => {
    const products = await listBudgetProducts()
    response.json({ products })
  }),
)

router.post(
  "/budget-products",
  asyncHandler(async (request, response) => {
    const parsed = budgetProductSchema.safeParse(request.body)
    if (!parsed.success) {
      response.status(400).json({ message: "Datos de producto inválidos", errors: parsed.error.flatten().fieldErrors })
      return
    }

    const product = await createBudgetProduct(parsed.data)
    response.status(201).json({ product })
  }),
)

router.patch(
  "/budget-products/:productId",
  asyncHandler(async (request, response) => {
    const { productId } = request.params
    const parsed = budgetProductSchema.partial().safeParse(request.body)
    if (!parsed.success) {
      response.status(400).json({ message: "Datos de producto inválidos", errors: parsed.error.flatten().fieldErrors })
      return
    }

    const product = await updateBudgetProduct(productId, parsed.data)
    response.json({ product })
  }),
)

router.delete(
  "/budget-products/:productId",
  asyncHandler(async (request, response) => {
    const { productId } = request.params
    await deleteBudgetProduct(productId)
    response.status(204).end()
  }),
)

// Presupuestos guardados ------------------------------------------------------

router.get(
  "/budgets",
  asyncHandler(async (request, response) => {
    requireAdminSession(request)
    const budgets = await listAdminBudgets()
    response.json({ budgets })
  }),
)

router.post(
  "/budgets",
  asyncHandler(async (request, response) => {
    const session = requireAdminSession(request)
    const parsed = budgetSchema.safeParse(request.body)
    if (!parsed.success) {
      response.status(400).json({ message: "Datos de presupuesto inválidos", errors: parsed.error.flatten().fieldErrors })
      return
    }

    const budget = await createAdminBudget({
      title: parsed.data.title,
      clientType: parsed.data.clientType,
      clientId: parsed.data.clientId ?? null,
      clientName: parsed.data.clientName,
      clientEmail: parsed.data.clientEmail ?? null,
      items: parsed.data.items,
      notes: parsed.data.notes ?? null,
      total: parsed.data.total,
      taxRate: parsed.data.taxRate,
      createdBy: session.userId,
    })

    response.status(201).json({ budget })
  }),
)

router.put(
  "/budgets/:budgetId",
  asyncHandler(async (request, response) => {
    requireAdminSession(request)
    const { budgetId } = request.params
    if (!budgetId) {
      response.status(400).json({ message: "Presupuesto no especificado" })
      return
    }

    const parsed = budgetSchema.partial().safeParse(request.body)
    if (!parsed.success) {
      response.status(400).json({ message: "Datos de presupuesto inválidos", errors: parsed.error.flatten().fieldErrors })
      return
    }

    const budget = await updateAdminBudget(budgetId, parsed.data)
    response.json({ budget })
  }),
)

router.delete(
  "/budgets/:budgetId",
  asyncHandler(async (request, response) => {
    requireAdminSession(request)
    const { budgetId } = request.params
    if (!budgetId) {
      response.status(400).json({ message: "Presupuesto no especificado" })
      return
    }
    await deleteAdminBudget(budgetId)
    response.status(204).end()
  }),
)

router.post(
  "/notifications/:notificationId/read",
  asyncHandler(async (request, response) => {
    requireAdminSession(request)
    const { notificationId } = request.params
    if (!notificationId) {
      response.status(400).json({ message: "Notificación no especificada" })
      return
    }
    await markAdminNotificationRead(notificationId)
    response.status(204).end()
  }),
)

router.patch(
  "/projects/:projectId/photos/:photoId",
  asyncHandler(async (request, response) => {
    requireAdminSession(request)
    const { photoId, projectId } = request.params
    const parsed = photoUpdateSchema.safeParse(request.body)
    if (!parsed.success) {
      response.status(400).json({ message: "Datos de foto inválidos", errors: parsed.error.flatten().fieldErrors })
      return
    }
    await updateProjectPhoto(photoId, parsed.data)
    if (parsed.data.isCover) {
      const supabase = createServerSupabaseClient()
      await supabase
        .from("project_photos")
        .update({ is_cover: false })
        .eq("project_id", projectId)
        .neq("id", photoId)
    }
    response.json({ message: "Foto actualizada" })
  }),
)

router.post(
  "/projects/:projectId/photos/reorder",
  asyncHandler(async (request, response) => {
    requireAdminSession(request)
    const { projectId } = request.params
    const parsed = reorderSchema.safeParse(request.body)
    if (!parsed.success) {
      response.status(400).json({ message: "Orden inválido", errors: parsed.error.flatten().fieldErrors })
      return
    }
    await reorderProjectPhotos(projectId, parsed.data.items)
    response.json({ message: "Fotos reordenadas" })
  }),
)

router.delete(
  "/projects/:projectId/photos/:photoId",
  asyncHandler(async (request, response) => {
    requireAdminSession(request)
    const { photoId } = request.params
    await deleteProjectPhoto(photoId)
    response.status(204).end()
  }),
)

router.post(
  "/projects/:projectId/timeline",
  asyncHandler(async (request, response) => {
    requireAdminSession(request)
    const { projectId } = request.params
    const parsed = timelineSchema.safeParse(request.body)
    if (!parsed.success) {
      response.status(400).json({ message: "Datos de evento inválidos", errors: parsed.error.flatten().fieldErrors })
      return
    }
    await recordProjectTimelineEvent(projectId, parsed.data)
    response.status(201).json({ message: "Evento registrado" })
  }),
)

router.get(
  "/projects/:projectRef",
  asyncHandler(async (request, response) => {
    requireAdminSession(request)
    const { projectRef } = request.params
    const project = await getAdminProjectDetail(projectRef)
    response.json({ project })
  }),
)

router.get(
  "/projects/:projectId/tasks",
  asyncHandler(async (request, response) => {
    requireAdminSession(request)
    const { projectId } = request.params
    const { search, status, assigneeId, startDateFrom, startDateTo, dueDateFrom, dueDateTo, page, pageSize } = request.query

    const statusList = typeof status === "string" && status.length > 0 ? status.split(",").map((item) => item.trim()) : undefined
    const filters: ListProjectTasksFilters = {
      search: typeof search === "string" ? search : undefined,
      status: statusList,
      assigneeId: typeof assigneeId === "string" ? assigneeId : undefined,
      startDateFrom: typeof startDateFrom === "string" ? startDateFrom : undefined,
      startDateTo: typeof startDateTo === "string" ? startDateTo : undefined,
      dueDateFrom: typeof dueDateFrom === "string" ? dueDateFrom : undefined,
      dueDateTo: typeof dueDateTo === "string" ? dueDateTo : undefined,
      page: typeof page === "string" ? Number.parseInt(page, 10) : undefined,
      pageSize: typeof pageSize === "string" ? Number.parseInt(pageSize, 10) : undefined,
    }

    try {
      const data = await listProjectTasks(projectId, filters)
      response.json(data)
      return
    } catch (error) {
      console.error("Error fetching project tasks", error)
      if (
        isMissingRelationError(error, "project_tasks") ||
        isMissingRelationError(error, "team_members") ||
        (typeof error === "object" && error !== null && "code" in error && (error as any).code === "42P01")
      ) {
        try {
          const fallback = await buildFallbackTaskList(projectId, filters)
          response.json(fallback)
          return
        } catch (fallbackError) {
          console.error("Error building fallback task list", fallbackError)
        }
      }
      response.status(500).json({ message: "No se pudieron obtener las tareas." })
    }
  }),
)

function mapPhaseStatusToTaskStatus(status?: string | null): ProjectTaskStatus {
  if (!status) return "todo"
  const value = status.toLowerCase()
  if (value.includes("final") || value.includes("complet") || value === "done") return "done"
  if (value.includes("bloq")) return "blocked"
  if (value.includes("revi") || value.includes("review")) return "review"
  if (value.includes("curso") || value.includes("progreso") || value.includes("progress")) return "in_progress"
  return "todo"
}

async function buildFallbackTaskList(projectId: string, filters: ListProjectTasksFilters = {}): Promise<ListProjectTasksResult> {
  const supabase = createServerSupabaseClient()

  const { data, error } = await supabase
    .from("project_phases")
    .select(
      [
        "id",
        "name",
        "summary",
        "expected_start",
        "expected_end",
        "status",
        "weight",
        "sort_order",
        "updated_at",
        "created_at",
      ].join(","),
    )
    .eq("project_id", projectId)
    .order("sort_order", { ascending: true })

  if (error) {
    throw error
  }

  type PhaseRow = {
    id: string
    name: string | null
    summary: string | null
    expected_start: string | null
    expected_end: string | null
    status: string | null
    weight: number | null
    sort_order: number | null
    created_at: string | null
    updated_at: string | null
  }

  const phases = (data ?? []) as unknown as PhaseRow[]

  const page = Math.max(filters.page ?? 1, 1)
  const pageSize = Math.min(Math.max(filters.pageSize ?? 20, 5), 100)

  const filterBySearch = (name?: string | null) => {
    if (!filters.search || filters.search.trim().length === 0) return true
    const query = filters.search.trim().toLowerCase()
    return (name ?? "").toLowerCase().includes(query)
  }

  const filterByStatus = (status: string) => {
    if (!filters.status || filters.status.length === 0) return true
    return filters.status.includes(status)
  }

  const filterByDate = (value: string | null | undefined, from?: string, to?: string) => {
    if (!value) return true
    const dateValue = new Date(value)
    if (Number.isNaN(dateValue.getTime())) return true
    if (from) {
      const fromDate = new Date(from)
      if (!Number.isNaN(fromDate.getTime()) && dateValue < fromDate) return false
    }
    if (to) {
      const toDate = new Date(to)
      if (!Number.isNaN(toDate.getTime()) && dateValue > toDate) return false
    }
    return true
  }

  let tasks: ProjectTask[] = phases
    .map((phase, index) => {
      const status = mapPhaseStatusToTaskStatus(phase.status)
      const weight = Number(phase.weight ?? 1)
      const createdAt = phase.created_at ?? new Date().toISOString()
      const updatedAt = phase.updated_at ?? createdAt
      return {
        id: `phase-${phase.id}`,
        projectId,
        title: phase.name && phase.name.trim().length > 0 ? phase.name : `Fase ${index + 1}`,
        description: phase.summary ?? null,
        status,
        weight,
        assigneeId: null,
        assigneeName: null,
        startDate: phase.expected_start ?? null,
        dueDate: phase.expected_end ?? null,
        position: Number(phase.sort_order ?? index),
        // Las fases legacy no son hitos y no se muestran como eventos en el
        // calendario; si hiciera falta, el admin puede crear un hito aparte.
        isMilestone: false,
        showInCalendar: false,
        createdAt,
        updatedAt,
      }
    })
    .filter((task) => filterBySearch(task.title))
    .filter((task) => filterByStatus(task.status))
    .filter((task) => filterByDate(task.startDate, filters.startDateFrom, filters.startDateTo))
    .filter((task) => filterByDate(task.dueDate, filters.dueDateFrom, filters.dueDateTo))

  if (filters.assigneeId) {
    tasks = tasks.filter((task) => task.assigneeId === filters.assigneeId)
  }

  const total = tasks.length
  const startIndex = (page - 1) * pageSize
  const pagedTasks = tasks.slice(startIndex, startIndex + pageSize)

  const today = startOfDay(new Date())
  const endOfWeek = addDays(today, 7)

  let totalWeight = 0
  let completedWeight = 0
  let dueToday = 0
  let dueThisWeek = 0

  tasks.forEach((task) => {
    totalWeight += task.weight
    if (task.status === "done") {
      completedWeight += task.weight
    }
    if (task.dueDate) {
      const due = new Date(task.dueDate)
      if (!Number.isNaN(due.getTime())) {
        if (isToday(due)) dueToday += 1
        if (isWithinInterval(due, { start: today, end: endOfWeek })) dueThisWeek += 1
      }
    }
  })

  return {
    tasks: pagedTasks,
    pagination: {
      page,
      pageSize,
      total,
    },
    stats: {
      total,
      done: tasks.filter((task) => task.status === "done").length,
      dueToday,
      dueThisWeek,
    },
    counters: {
      completedWeight,
      totalWeight,
    },
    assignees: [],
  }
}

router.post(
  "/projects/:projectId/tasks",
  asyncHandler(async (request, response) => {
    const session = requireAdminSession(request)
    const { projectId } = request.params
    const id = await createProjectTask(projectId, request.body ?? {}, session.userId)
    response.status(201).json({ id })
  }),
)

router.patch(
  "/projects/:projectId/tasks/:taskId",
  asyncHandler(async (request, response) => {
    const session = requireAdminSession(request)
    const { taskId } = request.params
    await updateProjectTask(taskId, request.body ?? {}, session.userId)
    response.status(204).end()
  }),
)

router.delete(
  "/projects/:projectId/tasks/:taskId",
  asyncHandler(async (request, response) => {
    const session = requireAdminSession(request)
    const { taskId } = request.params
    await deleteProjectTask(taskId, session.userId)
    response.status(204).end()
  }),
)

router.post(
  "/projects/:projectId/tasks/reorder",
  asyncHandler(async (request, response) => {
    const session = requireAdminSession(request)
    const { projectId } = request.params
    const items = Array.isArray(request.body?.items) ? request.body.items : []
    await reorderProjectTasks(projectId, items, session.userId)
    response.status(204).end()
  }),
)

router.post(
  "/projects/:projectId/tasks/recalculate",
  asyncHandler(async (request, response) => {
    const session = requireAdminSession(request)
    const { projectId } = request.params
    const progress = await recalculateProjectProgress(projectId, session.userId)
    response.json({ progress })
  }),
)

router.post(
  "/projects/:projectId/tasks/bulk",
  asyncHandler(async (request, response) => {
    const session = requireAdminSession(request)
    const { projectId } = request.params
    const payload = (request.body ?? {}) as {
      ids?: unknown
      status?: string
      assigneeId?: string | null
    }
    const ids = Array.isArray(payload.ids) ? (payload.ids as string[]) : []
    const status = typeof payload.status === "string" && isProjectTaskStatus(payload.status) ? payload.status : undefined
    await bulkUpdateProjectTasks(
      projectId,
      {
        ids,
        status,
        assigneeId: typeof payload.assigneeId === "string" || payload.assigneeId === null ? payload.assigneeId : undefined,
      },
      session.userId,
    )
    response.status(204).end()
  }),
)

router.post(
  "/projects/:projectId/tasks/:taskId/calendar",
  asyncHandler(async (request, response) => {
    const session = requireAdminSession(request)
    const { taskId } = request.params
    await addTaskToCalendar(taskId, session.userId)
    response.status(204).end()
  }),
)

router.get(
  "/projects/:projectId/tasks/:taskId/activity",
  asyncHandler(async (request, response) => {
    requireAdminSession(request)
    const { taskId } = request.params
    const activity = await fetchTaskActivity(taskId)
    response.json({ activity })
  }),
)

export const adminRouter = router
