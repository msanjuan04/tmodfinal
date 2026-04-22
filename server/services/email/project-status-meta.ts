import type { ProjectStatusKey } from "../../emails"

// Un único sitio para gobernar cómo comunicamos cada estado al cliente.
// - label: el nombre humano que aparece en el asunto y en el correo.
// - description: 1–2 frases explicando la fase.
// - nextSteps: qué verá el cliente en los próximos días.
// - notify: si `false`, el cambio a este estado NO dispara correo (estados
//   administrativos o fases iniciales demasiado internas).
//
// Flujo canónico: inicial → diseno → presupuesto → planificacion → obra_ejecucion → cierre
// Estados administrativos fuera del flujo: archivado, cancelado.

export interface ProjectStatusMeta {
  label: string
  description: string
  nextSteps: string[]
  notify: boolean
}

const STATUS_META: Record<ProjectStatusKey, ProjectStatusMeta> = {
  inicial: {
    label: "Inicial",
    description:
      "Hemos dado de alta tu proyecto. En esta fase recogemos información, mediciones y necesidades para poder trabajar con datos reales.",
    nextSteps: [
      "Te contactaremos para concertar una primera visita o recoger referencias.",
      "Empezarás a ver las primeras entradas en tu portal Terrazea.",
    ],
    notify: true,
  },
  diseno: {
    label: "Diseño",
    description:
      "Estamos diseñando tu espacio: distribución, materiales, detalles técnicos y acabados. Aquí se toman las decisiones estéticas y funcionales clave.",
    nextSteps: [
      "Recibirás propuestas visuales y renders para validar.",
      "Podrás pedir ajustes antes de pasar a presupuesto.",
      "Las decisiones quedan documentadas en tu portal.",
    ],
    notify: true,
  },
  presupuesto: {
    label: "Presupuesto",
    description:
      "Con el diseño cerrado, preparamos el presupuesto detallado: partidas, materiales, mano de obra y calendario tentativo.",
    nextSteps: [
      "Recibirás el presupuesto por partidas en tu portal.",
      "Podemos revisarlo juntos y ajustar alcance si lo necesitas.",
      "Al aprobarlo pasamos a planificación.",
    ],
    notify: true,
  },
  planificacion: {
    label: "Planificación",
    description:
      "Estamos definiendo el plan de trabajo, los tiempos y los equipos que intervendrán en tu proyecto.",
    nextSteps: [
      "Recibirás el cronograma preliminar con las fechas clave.",
      "Empezarás a ver los hitos y fases publicadas en tu portal.",
      "Si falta alguna decisión tuya, nos pondremos en contacto para resolverla.",
    ],
    notify: true,
  },
  obra_ejecucion: {
    label: "Ejecución de obra",
    description:
      "Ha empezado la obra. A partir de ahora verás avances visibles casi cada semana: fotos, hitos cerrados y documentación nueva.",
    nextSteps: [
      "Se publicarán fotografías, documentación técnica y avances.",
      "Te notificaremos cuando cerremos hitos importantes.",
      "Recibirás recordatorios automáticos antes de cada visita o entrega.",
    ],
    notify: true,
  },
  cierre: {
    label: "Cierre",
    description:
      "Estamos en la fase final: revisión de detalles, entrega de documentación y cierre formal del proyecto.",
    nextSteps: [
      "Recibirás la documentación técnica definitiva.",
      "Cerraremos pagos y recibos pendientes.",
      "Te acompañaremos con cualquier ajuste posterior al cierre.",
    ],
    notify: true,
  },
  archivado: {
    label: "Archivado",
    description: "El proyecto se ha archivado internamente.",
    nextSteps: [],
    notify: false,
  },
  cancelado: {
    label: "Cancelado",
    description: "El proyecto se ha cancelado.",
    nextSteps: [],
    notify: false,
  },
}

export function getProjectStatusMeta(status: string): ProjectStatusMeta | null {
  if (!status) return null
  const key = status as ProjectStatusKey
  return STATUS_META[key] ?? null
}

export function isKnownProjectStatus(status: string): status is ProjectStatusKey {
  return status in STATUS_META
}
