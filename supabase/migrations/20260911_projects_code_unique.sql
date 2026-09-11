-- Migración: índice único sobre projects.code.
--
-- El código TRZ se usa para iniciar sesión. Sin índice, cada intento hacía un
-- recorrido completo de la tabla; sin unicidad, dos proyectos con el mismo
-- código rompían el login de forma opaca.
--
-- Si esta migración falla por duplicados, localízalos con:
--   select code, count(*) from public.projects where code is not null group by code having count(*) > 1;

create unique index if not exists projects_code_unique_idx
  on public.projects (code)
  where code is not null;
