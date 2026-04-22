-- Migración: unificación a los 6 estados canónicos del flujo de proyecto.
--
-- Flujo canónico (en orden):
--   inicial → diseno → presupuesto → planificacion → obra_ejecucion → cierre
--
-- Además se conservan dos estados administrativos fuera del flujo
-- (`archivado` y `cancelado`) para operaciones de archivo/cancelación.
--
-- Mapeo desde el enum antiguo (9 valores sueltos) al nuevo:
--   borrador      → inicial
--   planificacion → planificacion   (sin cambio)
--   activo        → obra_ejecucion
--   en_progreso   → obra_ejecucion
--   pausado       → obra_ejecucion   (se pierde semántica de "pausa"; si se
--                                     necesita, gestionarlo con un flag/metadato)
--   finalizado    → cierre
--   completado    → cierre
--   archivado     → archivado        (sin cambio)
--   cancelado     → cancelado        (sin cambio)
--
-- Los estados nuevos `diseno` y `presupuesto` no reciben filas automáticamente;
-- los admins los asignan a medida que los proyectos avancen.
--
-- NOTA: `projects.status` es una columna `text`, no hay enum SQL que mantener
-- sincronizado. Basta con un UPDATE masivo.
--
-- Ejecutable varias veces sin efectos secundarios (los valores ya migrados
-- quedan en sus nuevos nombres y el UPDATE no les toca).

update public.projects
set status = case status
  when 'borrador'    then 'inicial'
  when 'activo'      then 'obra_ejecucion'
  when 'en_progreso' then 'obra_ejecucion'
  when 'pausado'     then 'obra_ejecucion'
  when 'finalizado'  then 'cierre'
  when 'completado'  then 'cierre'
  else status
end
where status in ('borrador', 'activo', 'en_progreso', 'pausado', 'finalizado', 'completado');

-- Verificación rápida tras ejecutar:
-- select status, count(*) from public.projects group by status order by status;
