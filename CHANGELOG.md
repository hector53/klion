# Changelog

Todos los cambios notables de este proyecto se documentan en este archivo, siguiendo el formato de [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/), ordenado cronológicamente (más reciente primero).

> Nota histórica: el versionado se reinició de `2.0.0` a `0.5.0` en 2026-02-03 al pivotar el producto hacia "Akela" (espacios personales además de clientes/trabajo). Los números de versión anteriores a esa fecha (`1.0.0`–`2.0.0`) y posteriores (`0.5.0`+) no son comparables entre sí — se conservan tal cual fueron publicados.
>
> Este archivo fusiona los changelogs que antes vivían dispersos en `CHANGELOG_v1.2.0.md`, `CHANGELOG_v2.0.0.md`, `docs/CHANGELOG.md` y `docs/CHANGELOG_v1.1.0.md`. Las versiones originales, con mayor detalle de archivos tocados, quedaron archivadas en `docs/archive/changelogs/`. El changelog propio del servidor MCP (`mcp/klion-server/CHANGELOG_v2.0.md`) se mantiene aparte porque documenta herramientas, no el producto.

## [0.9.5] - 2026-10-02

### Fixed
- **Backend: MCP server con dependencias de producción vulnerables**:
  - `npm audit --omit=dev` en `mcp/klion-server` reportaba 11 vulnerabilidades (7 high, 3 moderate, 1 low), todas vía `@modelcontextprotocol/sdk` 1.25.2 (hono, @hono/node-server, path-to-regexp, body-parser, qs, fast-uri, ajv) y `axios` 1.13.2 (form-data, follow-redirects).
  - Se actualiza `@modelcontextprotocol/sdk` a `^1.32.0` (última v1, sin migrar a v2) y `axios` a `^1.20.0`; `ajv` y `fast-uri` se suben dentro de su rango semver con `npm update`. Sin `npm audit fix --force`, sin cambios de arquitectura ni de transporte (sigue siendo stdio).
  - `npm audit --omit=dev` queda en 0 vulnerabilidades.
  - Files: `mcp/klion-server/package.json`, `mcp/klion-server/package-lock.json`.

### Added
- **Backend: annotations MCP explícitos en las 36 tools**:
  - Cada tool declara `readOnlyHint`, `destructiveHint`, `idempotentHint` y `openWorldHint`, asignados revisando el handler y el servicio del backend de cada una, no por el nombre.
  - Casos no obvios: `delete_task`/`delete_knowledge` hacen hard delete; los `update_*` son destructivos porque reemplazan valores (tags, rules y content completos); `git_commit` se marca destructivo y open-world por el `add -A` y el `push` opcional; las tools que llaman a OpenAI (`generate_*`, `parse_conversation`) son open-world; `get_knowledge` no es read-only ni idempotente porque incrementa `usageCount`/`lastAccessedAt` en cada llamada; `get_context` no es read-only porque crea el `ProjectContext` vacío si no existe, pero sí idempotente (`project_id` es único y sólo se crea una vez).
  - Nuevo test `npm test` (node:test, sin dependencias nuevas) que levanta el servidor por stdio y verifica que `tools/list` devuelve las 36 tools, que todas declaran los cuatro hints como booleanos y algunos valores representativos.
  - Files: `mcp/klion-server/src/index.ts`, `mcp/klion-server/test/tool-annotations.test.mjs` (nuevo), `mcp/klion-server/package.json`.

## [0.9.4] - 2026-09-21

### Fixed
- **Backend: los filtros booleanos por query string ignoraban `false`**:
  - `GET /tasks?isArchived=false` devolvía 0 tareas y `?isArchived=true` también, cuando sin el parámetro devolvía 1031. Causa: el `ValidationPipe` global corre con `enableImplicitConversion: true`, y esa conversión sobre un campo tipado `boolean` termina haciendo `Boolean("false")`, que es `true`. O sea que el filtro consultaba siempre por las archivadas, pasara lo que pasara.
  - Afectaba a los tres filtros booleanos que llegan por query: `TaskFilterDto.isArchived`, `ClientFilterDto.includeInactive` y `KnowledgeFilterDto.includeArchived`. El más visible era el de clientes: `klion client list` manda `includeInactive=false` explícito, así que listaba también los inactivos aunque no se pidiera `-a`. Los booleanos que llegan en el body JSON no estaban afectados (ahí ya son booleanos de verdad), y `GET /spaces` tampoco, porque parsea el query param a mano (`includeArchived === "true"`).
  - Nuevo decorador compartido `@BooleanQuery()` en `backend/src/common/`. La parte no obvia: tiene que leer `obj[key]` (el objeto plano original) y no el `value` que recibe el `@Transform`, porque para cuando el transform corre la conversión implícita ya pasó y el dato ya se perdió. Un valor no reconocible se devuelve tal cual para que `@IsBoolean()` conteste 400 en vez de adivinar.
  - Verificado ejecutando el `ValidationPipe` con las mismas opciones de `main.ts`: `"false"`/`"0"` → `false`, `"true"`/`"1"` → `true`, booleanos reales pasan derecho, y `"quizas"` → 400 `isArchived must be a boolean value`.
  - Files: `backend/src/common/boolean-query.decorator.ts` (nuevo), `backend/src/common/index.ts`, `backend/src/modules/tasks/dto/task.dto.ts`, `backend/src/modules/clients/dto/client.dto.ts`, `backend/src/modules/knowledge/dto/knowledge.dto.ts`.

## [0.9.3] - 2026-09-21

### Fixed
- **Backend/Frontend: `GET /tasks/board` no terminaba nunca — la columna "done" crecía sin techo**:
  - `TasksService.getTasksGroupedByStatus` devolvía *todas* las tareas no archivadas con sus relaciones (`client`, `project`, `subtasks`). En producción son 1031 tareas, de las cuales **905 están completadas** (88 %) y ninguna archivada: la respuesta pesaba ~2,5 MB y el proxy cortaba la conexión a los ~97 s (`curl: (18) transfer closed with 1753443 bytes remaining`). El endpoint no era lento, directamente fallaba, y con él el board de la app, el MCP `get_board` y `klion board`.
  - `BoardFilterDto` gana `doneLimit` (default 50 aplicado en el controller, `0` = sin límite). Las columnas activas (`todo`/`doing`/`blocked`) se siguen devolviendo completas, porque son las que el frontend filtra en cliente por espacio y el backend no puede recortar sin cambiar lo que se ve. La columna `done` pasa a traer solo las N más recientes por `updatedAt` (antes se ordenaba por `position`).
  - El default se aplica en el controller y no en el service a propósito: `SnapshotsService.buildSnapshotPayload` llama al service directamente y necesita el board completo — con el tope en el service, los snapshots diarios habrían empezado a registrar 50 completadas en vez de 905 sin que nada avisara.
  - Para que el recorte no sea silencioso (el mismo problema que CBK-70), la columna "Completado" del kanban muestra "Mostrando las 50 completadas más recientes" cuando aplica, y el MCP `get_board` devuelve `summary.doneTruncated`.
  - `get_board` (MCP) y `klion board` aceptan ahora `projectId`/`clientId`/`doneLimit`, que antes no exponían.
  - Verificado en producción tras el deploy, comparando contra `?doneLimit=0` (que restaura el comportamiento viejo) en el mismo momento y con el mismo cliente: `doneLimit=0` se sigue cortando a los 72 s, el default responde en 13,4 s / 130 KB, y con `?projectId=` en 1,3 s / 23 KB. `GET /projects` pasó de 78-166 s / 1,5 MB a 2,2 s / 3 KB.
  - Files: `backend/src/modules/tasks/tasks.service.ts`, `backend/src/modules/tasks/tasks.controller.ts`, `backend/src/modules/tasks/dto/task.dto.ts`, `frontend/src/app/(dashboard)/board/page.tsx`, `frontend/src/components/board/kanban-board.tsx`, `frontend/src/components/board/board-column.tsx`, `frontend/src/lib/api.ts`, `mcp/klion-server/src/api.ts`, `mcp/klion-server/src/index.ts`, `mcp/klion-server/src/cli.ts`.

- **Backend: `GET /projects` tardaba 78-166 s y hacía fallar a los clientes MCP**:
  - `ProjectsService.findAll` hacía `leftJoinAndSelect` de `project.tasks` y `tasks.subtasks`, así que el listado devolvía el producto cartesiano de todas las tareas y subtareas de todos los proyectos: 0,5-1,5 MB por request, medidos entre 78 s y 166 s contra producción. `GET /projects/client/:clientId` (`findByClient`) cargaba las mismas relaciones.
  - Ningún consumidor usaba esos datos: el frontend cuenta tareas por proyecto con su propia query (`tasksApi.getBoard()` en las páginas de proyectos/áreas, `tasksApi.getAll({ projectId })` en el detalle) y el MCP `list_projects` solo lee `id`, `name`, `status`, `color`, `clientId`. Se eliminan ambos joins; `findOne` los conserva porque `getProjectStats` sí los necesita.
  - Impacto real: era la causa probable de que los agentes (Codex, Claude Code, Cursor) reportaran el MCP como "no conecta" — `list_projects` y `get_board` son de las primeras tools que llaman y superaban el timeout por defecto del host. El servidor respondía, pero tarde.
  - Files: `backend/src/modules/projects/projects.service.ts`.

### Added
- **Backend: Guía de CLI + API HTTP para agentes**:
  - Nuevo `docs/KLION_CLI_API.md`: documento autosuficiente para operar Klion sin el MCP. Cubre la resolución de credenciales (`X-Service-Key` vs JWT), la matriz de qué módulo acepta cuál, la tabla de comandos que el CLI `klion` sí implementa, recetas `curl` para todo lo que no (knowledge, contexto de proyecto, update de tareas, spaces, git, IA), una tabla de equivalencias herramienta MCP → HTTP, y las trampas medidas (latencias por endpoint, `forbidNonWhitelisted`, UUID vs código de tarea, `NEXT_PUBLIC_API_URL` pisando la URL del CLI).
  - `AGENTS.md` apunta al doc desde la sección de protocolo obligatorio, para que el fallback esté a la vista cuando el MCP no levanta.
  - Incluye el hallazgo de que el proxy de prod comprime con gzip solo si el cliente lo pide: sin `curl --compressed` el mismo request tarda hasta 9 veces más (16,4 s vs 1,8 s en el board de un proyecto). Axios ya lo manda, así que afectaba solo al curl a mano.
  - Files: `docs/KLION_CLI_API.md`, `AGENTS.md`.

## [0.9.2] - 2026-07-18

### Fixed
- **MCP/CLI: la service key solo se leía de la env var, y cada host tenía que inyectarla + reiniciarse por separado (agotador y frágil)**: tras cerrar los endpoints con auth (CBK-87), el MCP quedó atado al JWT de `klion login`, que expira a los 7 días — cualquier host (Claude Code, Codex, Cursor…) daba 401 hasta reconfigurar su propio `env` de MCP y reiniciarse del todo. Ahora `getServiceKey()` resuelve `KLION_SERVICE_KEY` env → **conf store local** → null, así que la key se guarda **una vez** con `klion config --service-key <key>` y todo host que lance `klion-mcp` la usa sin configuración por proyecto. Verificado ejecutando el binario con entorno vacío. Files: `mcp/klion-server/src/config.ts`, `mcp/klion-server/src/cli.ts`.

## [0.9.1] - 2026-07-18

### Fixed
- **La service key resolvía "el primer usuario" en vez de uno específico**: `JwtOrServiceKeyGuard` usaba `usersService.findAll()[0]`, lo cual es incorrecto en una app multi-usuario (un llamador headless como Akela terminaba operando sobre los datos de otro usuario — se detectó porque en Streakboard, que comparte este patrón, Akela leía los objetivos de otra cuenta). Ahora el formato de `SERVICE_API_KEYS` es `name:key:email` (email opcional) y la key resuelve al usuario CON ese email (`usersService.findByEmail`). Sin email, cae al primer usuario (retrocompatible single-user). File: `backend/src/modules/auth/guards/jwt-or-service-key.guard.ts`.
- Para que Akela actúe como el usuario correcto, el `.env` de prod debe tener `SERVICE_API_KEYS=akela:<key>:<email-del-usuario>`. En Klion hoy funciona igual con o sin email (usuario único), pero conviene ponerlo por consistencia/futuro.

## [0.9.0] - 2026-07-14

### Fixed
- **Backend: `tasks.controller.ts` y otros controllers eran públicos en producción (CBK-87)**:
  - `tasks`, `projects`, `clients` y `knowledge` no tenían ningún guard: sus endpoints podían quedar accesibles sin autenticación en una instalación mal configurada. Se aplicó `JwtOrServiceKeyGuard` a estos módulos y se verificaron respuestas 401 sin credenciales.
  - Se aplica `JwtOrServiceKeyGuard` a los cuatro controllers. Verificado: los endpoints responden 401 sin credenciales y 200 con JWT o con service key válida.
  - Files: `backend/src/modules/tasks/tasks.controller.ts`, `backend/src/modules/projects/projects.controller.ts`, `backend/src/modules/clients/clients.controller.ts`, `backend/src/modules/knowledge/knowledge.controller.ts` (+ sus `.module.ts`, que ahora importan `AuthModule`).

### Added
- **Backend: Autenticación por service key para clientes headless (CBK-87)**:
  - Nuevo `JwtOrServiceKeyGuard`: acepta un JWT normal (navegador, CLI/MCP tras `klion login`) **o** un header `X-Service-Key` validado contra la env var `SERVICE_API_KEYS` (pares `nombre:key` separados por comas), resolviendo al usuario único del sistema — el mismo atajo single-user que ya documenta `ai.controller.ts`. La comparación de keys es timing-safe. Desbloquea la Fase 2 de Akela (operar Klion headless).
  - `AuthModule` reexporta `UsersModule` porque `@UseGuards` construye el guard en el contexto del módulo consumidor, donde igual necesita `UsersService`.
  - Files: `backend/src/modules/auth/guards/jwt-or-service-key.guard.ts` (nuevo), `backend/src/modules/auth/auth.module.ts`, `backend/src/main.ts` (security schemes en Swagger), `env-template`, `docker-compose.prod.yml`.

- **Backend: Superficie pública read-only por token (CBK-87)**:
  - La vista pública de proyecto (CBK-9) funcionaba porque `/tasks` y `/projects` eran abiertos, así que cerrarlos la habría roto. Se reemplaza por un módulo `public` que es la **única** superficie sin auth: `GET /public/project/:token`, `GET /public/board/:token`, `GET /public/tasks/:token`.
  - Solo lectura y acotada al proyecto que resuelve el token: no acepta `projectId` ni `clientId` (el `ValidationPipe` global rechaza el intento con 400), y arma las respuestas a mano con lista blanca de campos, de modo que `metadata`, `budget`, datos de contacto del cliente, ids internos y el propio token nunca salen.
  - Files: `backend/src/modules/public/{public.controller.ts,public.service.ts,public.module.ts,dto/public.dto.ts}` (nuevos), `backend/src/app.module.ts`.

- **Backend: Enlace público revocable por proyecto (CBK-87)**:
  - `Project` gana `publicShareToken` (random de 32 bytes, único, **no** derivado del UUID interno) y `publicSharingEnabled` (default `false`). Con sharing apagado, `/public/*` responde 404 aunque el token sea correcto. Regenerar el token invalida el enlace anterior de inmediato.
  - Endpoints autenticados: `GET/PATCH /projects/:id/share` y `POST /projects/:id/share/regenerate`.
  - Migración idempotente verificada sobre una tabla sin las columnas: los proyectos existentes quedan con el enlace apagado (ninguno se vuelve público al desplegar).
  - Files: `backend/migrations/013_add_project_public_sharing.sql` (nuevo), `backend/src/modules/projects/entities/project.entity.ts`, `backend/src/modules/projects/projects.service.ts`, `backend/src/modules/projects/dto/project-sharing.dto.ts` (nuevo).

- **Frontend: Gestión del enlace público en la página de proyecto (CBK-87)**:
  - Nueva card "Enlace público" con toggle de activación, "Copiar link" y "Regenerar" (con confirmación, ya que mata el link que el cliente pueda estar usando).
  - Files: `frontend/src/components/projects/public-share-card.tsx` (nuevo), `frontend/src/app/(dashboard)/projects/[id]/page.tsx`.

### Changed
- **Frontend: La vista pública pasa a resolverse por token (CBK-87)**:
  - La ruta cambia de `/public/projects/[id]` (UUID interno del proyecto) a `/public/projects/[token]`, y consume `publicApi` sobre una instancia axios propia, sin el interceptor de auth. **Los links compartidos hasta ahora dejan de funcionar**: hay que activar el enlace en la página del proyecto y reenviar el nuevo.
  - Se reemplaza `TaskListView`/`TaskModal` por una lista y un detalle propios de solo lectura: aquellos leen el contexto de espacio (el bug abierto CBK-86) y consultan clientes, proyectos, archivos y subtareas por endpoints autenticados —que ahora darían 401— además de ofrecer acciones masivas que no deben existir en un link compartido.
  - "Link público" en el board ahora consulta el estado de sharing y avisa si está desactivado, en vez de copiar un enlace muerto.
  - Files: `frontend/src/app/public/projects/[token]/page.tsx` (reemplaza `[id]/page.tsx`), `frontend/src/components/public/public-task-detail.tsx` (nuevo), `frontend/src/app/(dashboard)/board/page.tsx`, `frontend/src/lib/api.ts`, `frontend/src/types/index.ts`.

**Related**:
- Klion: CBK-87

## [0.8.21] - 2026-07-07

### Changed
- **Frontend: Menú de usuario refactorizado a componente desplegable (CBK-85)**:
  - El sidebar mostraba, siempre expandidas, 5 filas fijas para acciones de usuario: Notificaciones, Tema, Configuración, el toggle de colapso y el bloque avatar+nombre+email+Cerrar sesión.
  - Se extrae un nuevo componente `UserMenu` (mismo patrón de dropdown con click-outside que `NotificationsBell`) que muestra solo avatar+nombre; al hacer click despliega un menú con Notificaciones (reutiliza `NotificationsBell` tal cual, sin reimplementar su lógica), Tema, Configuración y Cerrar sesión. El avatar muestra un punto rojo cuando hay notificaciones sin leer (mismo query cacheado de React Query, sin fetch adicional).
  - El toggle de colapso del sidebar se mantiene como control de layout separado (no es una "acción de usuario"), y su contenedor ahora se oculta por completo en móvil en vez de dejar una fila vacía.
  - Files: `frontend/src/components/ui/user-menu.tsx` (nuevo), `frontend/src/components/ui/sidebar.tsx`.

## [0.8.20] - 2026-07-07

### Changed
- **Frontend: Rediseñar la jerarquía del sidebar (CBK-84)**:
  - "Proyectos recientes" y "Herramientas IA" (Plan del día, Redactar mensaje, Chat con IA) eran secciones secundarias siempre expandidas que ocupaban espacio fijo debajo de la navegación principal, saturando visualmente el sidebar en espacios de trabajo con proyectos recientes y sidebar expandido.
  - Ambas secciones pasan a ser disclosures colapsables (header con chevron, estado persistido en `localStorage` vía el `useLocalStorage` genérico ya existente), **colapsadas por defecto** para priorizar el acceso al menú principal (Board, Clientes, Proyectos, etc.).
  - En modo ícono (`isCollapsed`, sidebar angosto) el comportamiento no cambia: ambas secciones siguen mostrando solo los íconos, igual que antes.
  - Files: `frontend/src/components/ui/sidebar.tsx`.

## [0.8.19] - 2026-07-07

### Fixed
- **Frontend: Desbordamiento de texto en el modal de tareas propuestas por IA (CBK-83)**:
  - `GeneratedTasksModal` (el modal de "Tareas propuestas a partir de tus notas") no aplicaba `break-words` al resumen, al `sourceText` de cada tarea ni al historial de refinamiento ("Tú:"/"IA:"), así que un texto largo sin espacios (URL, ruta, palabra pegada) podía desbordar el ancho del modal en vez de ajustarse. La fila de título+prioridad+confianza de cada tarea tampoco tenía `min-w-0`, lo que impedía que el input de título se encogiera correctamente dentro del flex row.
  - Se agrega `break-words` a los textos generados por IA, `min-w-0` a los contenedores flex del input de título, y `overflow-hidden`/`overflow-x-hidden` al contenedor raíz y al área de contenido como resguardo general.
  - Files: `frontend/src/components/modals/generated-tasks-modal.tsx`.

## [0.8.18] - 2026-07-07

### Fixed
- **Frontend: Imágenes no responsivas en el editor de texto móvil (CBK-81, CBK-82 — duplicadas)**:
  - Una imagen pegada o subida con su ancho natural (p.ej. una captura de 1200px) desbordaba el iframe de edición de `RichTextEditor` (HugeRTE) en pantallas móviles, rompiendo el layout del modal. La vista de solo lectura de la descripción ya tenía `[&_img]:max-w-full`, pero el editor en sí no.
  - Se agrega `content_style: "img { max-width: 100%; height: auto; }"` al init de HugeRTE, que gana sobre el atributo `width=` insertado por el editor y también cubre imágenes redimensionadas manualmente vía los handles nativos (`object_resizing`).
  - Files: `frontend/src/components/ui/rich-text-editor.tsx`.

## [0.8.17] - 2026-07-07

### Added
- **Backend/Frontend: Enriquecer descripciones de tareas generadas por IA (CBK-77)**:
  - Los prompts de `AiService.analyzeProjectNotes`, `refineProjectNotesAnalysis` (Gemini, bloc de notas) y `parseConversation` (OpenAI, parser de conversaciones) pedían una descripción escueta ("Descripción más detallada si hay contexto"). Se reemplazó por una instrucción explícita de descripción estructurada y accionable (contexto/qué se pide, resultado esperado, pasos o criterios de aceptación cuando el material lo permita), con la advertencia de no inventar datos ausentes en la nota/conversación/capturas.
  - Sin cambios de DTO (`ExtractedTaskDto.description` sigue siendo string opcional) ni de mapeo (`buildTasksFromAiResponse`); el texto generado fluye igual hasta la tarea creada.
  - Files: `backend/src/modules/ai/ai.service.ts`.
- **Frontend: Adjuntar URL de contexto al crear tareas (CBK-76)**:
  - `TaskModal` agrega `metadata.sourceUrl` (con `window.location.href`) únicamente al crear una tarea nueva (no al editar), siguiendo el mismo patrón ya usado para `metadata.reminderTime`. Se visualiza automáticamente en el `MetadataEditor` del panel de configuración, sin requerir cambios de tipos ni de backend (el campo `metadata` ya soporta datos libres).
  - Files: `frontend/src/components/modals/task-modal.tsx`.

## [0.8.16] - 2026-07-07

### Added
- **Frontend: Navegación por pestañas en vista móvil de detalle de tarea (CBK-80)**:
  - `TaskModal` en viewport `<lg` (mobile-first, sin componente Tabs reutilizable previo) agrega dos pestañas: "Contenido" (título, descripción, adjuntos, subtareas) y "Configuración" (cliente, proyecto, tipo, prioridad, estado, fecha, tags, metadata). Antes ambos bloques se apilaban verticalmente en un único scroll largo.
  - Nuevo estado `mobileTab` (`"content" | "config"`, reseteado a `"content"` al abrir el modal); en desktop (`lg+`) ambos paneles se siguen mostrando lado a lado sin cambios.
  - Files: `frontend/src/components/modals/task-modal.tsx`.

## [0.8.15] - 2026-07-07

### Fixed
- **Frontend: Sidebar y contenedor principal truncados en viewports cortos (CBK-78, CBK-79)**:
  - Causa raíz: el `<aside>` del sidebar no tenía `overflow` ni altura propia, y su `<nav className="flex-1">` no tenía `min-h-0` — en pantallas cortas o con muchas secciones visibles (proyectos recientes, atajos IA), el footer y el bloque de usuario se desbordaban del box de 100vh y quedaban sin fondo y recortados. El `main` del dashboard no era el causante (es una columna flex hermana independiente).
  - Se agrega `h-dvh overflow-hidden` al `<aside>` y `min-h-0 overflow-y-auto` a su `<nav>`, de modo que el scroll ocurre dentro de la navegación mientras las secciones fijas permanecen siempre visibles sobre el fondo.
  - Se cambia `h-screen` (=100vh) por `h-dvh` (dynamic viewport height) en el layout raíz del dashboard, para evitar que en móvil la barra de direcciones del navegador infle la altura del contenedor.
  - Files: `frontend/src/components/ui/sidebar.tsx`, `frontend/src/app/(dashboard)/layout.tsx`.

## [0.8.14] - 2026-07-07

### Added
- **Backend/Frontend: Selección múltiple y borrado masivo en la lista de tareas (CBK-73, CBK-74, CBK-75)**:
  - Nuevo endpoint `POST /tasks/bulk-delete` (`TasksService.bulkRemove`, DTO `BulkDeleteTasksDto`): borrado permanente de varias tareas por ID, reutilizando `remove()` de forma secuencial para no correr riesgo de carreras en el recálculo de `position`; los IDs inexistentes se ignoran en vez de fallar todo el lote.
  - `TaskListView` agrega checkboxes por fila y un checkbox "seleccionar todo" en la cabecera (alcance: solo la página visible), una barra de acciones masivas contextual con contador y botón de eliminar, y la mutación de borrado con el `ConfirmModal` existente (variant danger) antes de ejecutar.
  - La invalidación cubre `tasks-list`, `tasks`, `board`, `project-active-tasks`, `project-context` y `project-stats`, para que board, widgets y otras vistas queden consistentes tras el borrado.
  - Files: `backend/src/modules/tasks/dto/task.dto.ts`, `backend/src/modules/tasks/tasks.controller.ts`, `backend/src/modules/tasks/tasks.service.ts`, `frontend/src/lib/api.ts`, `frontend/src/components/board/task-list-view.tsx`.

## [0.8.13] - 2026-07-06

### Added
- **Frontend: Borrado rápido en el widget "Tareas Activas"**:
  - Cada fila del widget muestra un ícono de papelera al pasar el mouse (junto al badge de prioridad), que elimina la tarea sin necesidad de abrir el `TaskModal` primero.
  - Usa el `ConfirmModal` ya existente en la app (mismo patrón que archivar tareas completadas en el board) en vez de un `confirm()` nativo, con el título de la tarea interpolado en el mensaje.
  - La mutación de borrado invalida `board`, `tasks`, `project-active-tasks`, `project-context` y `project-stats` (mismo patrón de invalidación que CBK-68), por lo que la tarea desaparece del widget de inmediato sin recargar la página.
  - Files: `frontend/src/app/(dashboard)/projects/[id]/page.tsx`.

## [0.8.12] - 2026-07-06

### Changed
- **Frontend: Altura inicial mayor para el editor del Bloc de Notas del proyecto**:
  - `RichTextEditor` (`frontend/src/components/ui/rich-text-editor.tsx`) ganó props opcionales `height`/`minHeight` (default 320/250, igual que antes — sin cambio para su otro uso en la descripción de `TaskModal`).
  - `ProjectNotesCard` (el editor de la ruta `/projects/:id`) ahora pasa `height={500} minHeight={400}`, dando bastante más espacio para escribir sin tener que redimensionar manualmente cada vez.
  - Files: `frontend/src/components/ui/rich-text-editor.tsx`, `frontend/src/components/projects/project-notes-card.tsx`.

## [0.8.11] - 2026-07-06

### Fixed
- **Frontend: Endurecer la limpieza de estado del modal de tareas propuestas por IA**:
  - `GeneratedTasksModal` permanece montado incluso con `isOpen=false` (solo deja de renderizar), así que su estado interno (`drafts`, `summary`, `pendingQuestions`, historial de refinamiento) seguía vivo en memoria mientras el modal estaba cerrado, dependiendo únicamente del `useEffect` sobre la prop `response` para refrescarse en la siguiente generación. En las pruebas manuales (cancelar → cambiar notas → generar de nuevo) no se reprodujo una filtración visible de la propuesta anterior, pero el diseño no lo garantizaba de forma explícita.
  - Se agrega un `useEffect` que limpia todo el estado al cerrarse (`isOpen` pasa a `false`), independientemente de si llega o no una respuesta nueva después — así nunca queda una propuesta anterior en memoria antes de mostrar la siguiente.
  - Files: `frontend/src/components/modals/generated-tasks-modal.tsx`.

## [0.8.10] - 2026-07-06

### Added
- **Backend/Frontend: Chat de refinamiento para tareas propuestas por IA**:
  - Nuevo endpoint `POST /ai/analyze-project-notes/refine` (`AiService.refineProjectNotesAnalysis`): recarga el contexto del bloc de notas (texto + capturas, vía el nuevo helper compartido `loadNoteContext`) y vuelve a pedirle a Gemini una propuesta de tareas, esta vez incluyendo en el prompt la propuesta anterior y el feedback en texto libre del usuario. Es un intercambio de un solo turno por click (no un chat multi-turno con historial de Gemini) — cada refinamiento es un request nuevo con "esto propusiste, esto pidió el usuario, revisa".
  - `GeneratedTasksModal` agrega un textarea + botón de envío debajo de las tareas propuestas, con un historial visual simple ("Tú: ..." / "IA: ...") de los intentos dentro de la sesión del modal (no persiste). Al refinar, reemplaza la lista de tareas, el resumen y los puntos pendientes mostrados, sin cerrar el modal ni afectar el flujo de creación de tareas existente.
  - Sin cambios de esquema de DB — no requiere migración.
  - Files: `backend/src/modules/ai/ai.service.ts`, `backend/src/modules/ai/dto/ai.dto.ts`, `backend/src/modules/ai/ai.controller.ts`, `frontend/src/types/index.ts`, `frontend/src/lib/api.ts`, `frontend/src/components/modals/generated-tasks-modal.tsx`.

## [0.8.9] - 2026-07-06

### Fixed
- **Frontend: Modal de tarea "vacío" al abrirse desde el widget de tareas activas**:
  - La causa original (CBK-65) era que el widget usaba el resumen de IA (`currentState.activeTasks`), que solo trae `id/title/status/priority/dueDate` — sin descripción, proyecto ni cliente. El cambio de CBK-69 (misma sesión) ya lo resolvió de forma incidental al mover el widget a `GET /tasks` (objetos completos).
  - Al verificar quedó un caso residual: el selector de Proyecto/Área y el de Cliente en `TaskModal` filtran sus opciones por el espacio (`currentSpace`) actualmente activo en el sidebar — si la tarea pertenece a un proyecto/cliente de otro espacio (p.ej. se abre vía "Proyectos recientes" sin haber cambiado de espacio antes), el valor no aparecía entre las opciones y el selector se veía vacío aunque `formData` sí tuviera el dato correcto internamente.
  - Se agrega el proyecto/cliente de la tarea como opción adicional cuando no está en la lista filtrada por espacio, usando el objeto ya embebido en la tarea (`task.project`/`task.client`) — sin tocar el filtrado por espacio en sí.
  - Files: `frontend/src/components/modals/task-modal.tsx`.

## [0.8.8] - 2026-07-06

### Fixed
- **Frontend: Widget "Tareas Activas" no se actualizaba tras crear/editar/borrar tareas**:
  - El cambio de CBK-69 (misma sesión) movió el widget a su propia query (`["project-active-tasks", projectId]`), pero ninguna de las mutaciones de tareas la invalidaba — crear una tarea desde el modal normal, desde el modal de IA, editarla o borrarla dejaba el widget desactualizado hasta refrescar la página a mano.
  - Se agrega la invalidación de `project-active-tasks` en los 4 `onSuccess` relevantes: `TaskModal` (crear, editar — incluyendo el caso de mover la tarea a otro proyecto, invalidando ambos — y borrar) y `GeneratedTasksModal` (crear desde IA).
  - Files: `frontend/src/components/modals/task-modal.tsx`, `frontend/src/components/modals/generated-tasks-modal.tsx`.

## [0.8.7] - 2026-07-06

### Added
- **Frontend: Filtros y orden persistentes en el widget "Tareas Activas"**:
  - El widget de la página de proyecto pasa a alimentarse de su propia consulta (`GET /tasks?projectId=…`, ya con paginación real gracias a CBK-72) en vez del resumen fijo de `currentState.activeTasks` pensado para IA (`getFullContext`, sin tocar — sigue siendo el contrato que usa el MCP `get_context`). Esto permite filtrar/ordenar del lado del cliente sin afectar el resumen que ve la IA.
  - Nuevos controles: filtro por status (`Activas` = to do + doing, `Por hacer`, `En progreso`, `Bloqueadas`) y orden (`Prioridad`, `Fecha límite`, `Más recientes`, `Alfabético`), persistidos en `localStorage` (`useActiveTasksWidgetPreferences`, mismo patrón que `useBoardPreferences`) para mantenerse entre sesiones.
  - El hint "Mostrando X de Y" (de CBK-70) ahora se calcula sobre el resultado filtrado/ordenado en vivo, no sobre el total fijo del backend.
  - Files: `frontend/src/hooks/use-local-storage.ts`, `frontend/src/app/(dashboard)/projects/[id]/page.tsx`, `frontend/src/types/index.ts`.

## [0.8.6] - 2026-07-06

### Fixed
- **Backend/Frontend: Tareas activas "invisibles" en el widget del proyecto**:
  - `ProjectsService.getFullContext` (usado por `GET /projects/context/:identifier`, la fuente real del widget "Tareas Activas" en la página de proyecto) filtraba tareas `todo`/`doing`, las ordenaba por prioridad y fecha límite, y cortaba silenciosamente a las primeras 10 sin indicar cuántas quedaban fuera. Como las tareas nuevas casi nunca tienen fecha límite, siempre caían al final de su grupo de prioridad — con más de 10 tareas activas en un proyecto, las recién creadas de prioridad media/baja directamente no se veían (CBK-70). No era un bug de filtrado: las tareas sí estaban `todo`, simplemente el resumen las ocultaba sin avisar.
  - Se sube el corte de 10 a 20 y se agrega `activeTasksTotal` a `currentState` (además de `activeTasks`) para que el frontend sepa si hay más de las que se muestran.
  - El widget ahora renderiza "Mostrando X de Y tareas activas · Ver todas en el board" cuando el total supera lo mostrado, enlazando a la vista de lista del board ya existente.
  - No resuelve filtros/orden persistente por el usuario (eso es CBK-69, tarea aparte) ni actualización en tiempo real tras crear una tarea (CBK-68).
  - Files: `backend/src/modules/projects/projects.service.ts`, `backend/src/modules/projects/dto/project-context.dto.ts`, `frontend/src/types/index.ts`, `frontend/src/app/(dashboard)/projects/[id]/page.tsx`.

## [0.8.5] - 2026-07-06

### Added
- **Backend: Filtro por rango de fechas de creación en `GET /tasks`**:
  - `TaskFilterDto` agrega `dateFrom`/`dateTo` (formato `YYYY-MM-DD`, validados con `@IsDateString`); `TasksService.findAll` los aplica sobre `task.createdAt` con límite superior inclusive de fin de día cuando se pasa solo fecha.
  - El filtro por `projectId` y la paginación real (`page`/`limit`/`total`/`totalPages`) ya existían en el backend, pero no estaban expuestos en CLI/MCP (ver más abajo) — CBK-72 detectó esto al intentar pedir "todas las tareas de un proyecto creadas hoy" en un solo request.
  - Files: `backend/src/modules/tasks/dto/task.dto.ts`, `backend/src/modules/tasks/tasks.service.ts`.

- **MCP/CLI: `list_tasks` y `klion task list` con filtro por proyecto, fechas y paginación**:
  - Tool MCP `list_tasks` ahora acepta `projectId`, `dateFrom`, `dateTo`, `page`, `limit` (default `limit=100` en vez del `10` del backend, para cubrir un proyecto completo en una sola llamada); la respuesta incluye `taskCode`, `projectId`, `page`, `limit` y `totalPages` por tarea/listado.
  - CLI `klion task list` agrega `--project`, `--date-from`, `--date-to`, `--page`, `--limit` (default `100`); la salida en texto ahora muestra el `taskCode` de cada tarea y un resumen de paginación (`Showing X of TOTAL (page P/TOTALPAGES)`).
  - No requiere migración (no hay cambio de esquema); no se tocó el default de `limit=10` del backend para no afectar la vista de lista del frontend, que siempre pasa `limit` explícito.
  - Files: `mcp/klion-server/src/api.ts`, `mcp/klion-server/src/index.ts`, `mcp/klion-server/src/cli.ts`, `mcp/klion-server/README.md`.

## [0.8.4] - 2026-07-02

### Fixed
- **Backend: Migraciones SQL faltantes para producción (bloc de notas y modelo de Gemini)**:
  - Los cambios de esquema de las entradas `0.8.0` (tabla `project_notes`) y `0.8.2`/`0.8.3` (`ai_settings.geminiDefaultModel` de enum a texto libre, columnas `openaiApiKey`/`geminiApiKey` eliminadas) solo se habían aplicado en local vía `synchronize: true`; nunca se escribieron las migraciones SQL correspondientes, así que producción (`synchronize: false`) quedó con el esquema viejo y tiraba 500 (`relation "project_notes" does not exist`, `invalid input value for enum ai_settings_geminidefaultmodel_enum`).
  - Se agregan `backend/migrations/011_add_project_notes_table.sql` y `backend/migrations/012_ai_settings_gemini_model_free_text.sql`, ambas idempotentes y probadas contra una DB ya migrada por `synchronize`.
  - Se documenta en `AGENTS.md` el mecanismo real de migraciones (`run-migrations.sh`, no los scripts `migration:*` de TypeORM, que apuntan a un glob nunca poblado) para no repetir este gap.
  - Files: `backend/migrations/011_add_project_notes_table.sql`, `backend/migrations/012_ai_settings_gemini_model_free_text.sql`.

## [0.8.3] - 2026-07-02

### Changed
- **Backend/Frontend: Lista de modelos de Gemini obtenida en vivo, ya no hardcodeada**:
  - `GeminiService.listModels()` consulta el `ListModels` real de Google (`GET .../v1beta/models`), filtra a modelos de chat/multimodal (excluye TTS, generación de imágenes, robotics, computer-use, Deep Research, etc.) y cachea el resultado en memoria por 1 hora.
  - `GET /ai/models` ahora es asíncrono y devuelve esa lista real (con fallback a una lista mínima estática si Gemini no está configurado o la llamada falla); ya incluye modelos que no existían al escribir el código original (`gemini-3.5-flash`, `gemini-3.1-*`, alias `-latest`), y dejará de listar modelos que Google retire sin que haya que tocar código.
  - `AISettings.geminiDefaultModel` pasa de columna `enum` de Postgres a `varchar` libre (Google agrega/retira modelos con más frecuencia de lo que un enum fijo puede seguir); el DTO valida con `@IsString()` en lugar de `@IsEnum()`.
  - El selector de modelo en Settings > IA ahora renderiza `availableModels.gemini` (ya se pedía con caché de 1h vía `useAISettings`, pero no se usaba) en vez de un `<optgroup>` hardcodeado que había quedado desactualizado.
  - Files: `backend/src/modules/ai/gemini.service.ts`, `backend/src/modules/ai/entities/ai-settings.entity.ts`, `backend/src/modules/ai/dto/ai-settings.dto.ts`, `backend/src/modules/ai/ai.service.ts`, `backend/src/modules/ai/ai.controller.ts`, `frontend/src/app/(dashboard)/settings/page.tsx`, `frontend/src/lib/api.ts`.

## [0.8.2] - 2026-07-02

### Changed
- **Backend/Frontend: API keys de IA solo por variable de entorno**:
  - Se decidió no soportar API keys de OpenAI/Gemini configurables por usuario (el producto se usa en modo single-user); ahora se configuran exclusivamente con `OPENAI_API_KEY`/`GEMINI_API_KEY` en `.env`.
  - Se eliminaron los campos `openaiApiKey`/`geminiApiKey` de `AISettings` (entidad y DTOs), de los inputs de Settings > IA y del método muerto `AiService.getUserApiKey()` que nunca se llamaba desde las funciones de IA reales. El selector de modelo por defecto, temperatura y toggles de features se mantienen sin cambios.
  - Files: `backend/src/modules/ai/entities/ai-settings.entity.ts`, `backend/src/modules/ai/dto/ai-settings.dto.ts`, `backend/src/modules/ai/ai.service.ts`, `frontend/src/app/(dashboard)/settings/page.tsx`, `frontend/src/lib/api.ts`.

## [0.8.1] - 2026-07-02

### Fixed
- **Backend: Modelo de Gemini no configurable**:
  - `GeminiService` ignoraba por completo el selector "Modelo Gemini" de Settings (`AISettings.geminiDefaultModel`) y el modelo quedaba hardcodeado en el código; el dropdown de la UI no tenía ningún efecto real.
  - Se agregó un `model` opcional en `GeminiService.chat()`/`chatStream()`, con fallback a la variable de entorno `GEMINI_MODEL` (nueva) y luego a `gemini-2.5-flash`. `AiService` ahora lee `geminiDefaultModel` de las settings guardadas y lo pasa en cada llamada (chat y análisis de notas de proyecto), por lo que el modelo elegido en Settings > IA ya tiene efecto.
  - Files: `backend/src/modules/ai/gemini.service.ts`, `backend/src/modules/ai/ai.service.ts`, `env-template`.

## [0.8.0] - 2026-07-02

### Added
- **Backend: Bloc de notas por proyecto con generación de tareas por IA**:
  - Nueva entidad `ProjectNote` (una nota por proyecto, patrón OneToOne igual que `ProjectContext`) con endpoints `GET /projects/:id/note` y `PATCH /projects/:id/note`.
  - Nuevo endpoint `POST /ai/analyze-project-notes`: convierte el HTML de la nota a texto, extrae y carga desde disco las capturas de pantalla pegadas, y usa Gemini multimodal para proponer tareas (título, descripción, prioridad, tags, confianza, texto de origen) junto con resumen, decisiones y preguntas pendientes.
  - `GeminiService.chat()` ahora acepta múltiples imágenes (`images[]`) y `temperature` configurable, no solo una imagen única.
  - `POST /ai/create-tasks-from-parser` acepta `clientId` opcional y lo deriva del proyecto cuando falta, para poder crear tareas desde notas de proyectos sin cliente explícito en la request.
  - Files: `backend/src/modules/projects/entities/project-note.entity.ts`, `backend/src/modules/projects/dto/project-note.dto.ts`, `backend/src/modules/projects/projects.service.ts`, `backend/src/modules/projects/projects.controller.ts`, `backend/src/modules/projects/projects.module.ts`, `backend/src/modules/ai/gemini.service.ts`, `backend/src/modules/ai/dto/ai.dto.ts`, `backend/src/modules/ai/ai.service.ts`, `backend/src/modules/ai/ai.controller.ts`.

- **Frontend: Bloc de notas por proyecto con revisión de tareas generadas**:
  - Nueva card `ProjectNotesCard` en la página de proyecto (entre "Tareas Activas" y "Knowledge Base") con el `RichTextEditor` existente (texto + imágenes pegadas), autosave con debounce de 1.5s e indicador "Guardando…/Guardado", y botón "Generar tareas con IA".
  - Nuevo modal `GeneratedTasksModal` para revisar, editar (título, descripción, prioridad) y aprobar/deseleccionar las tareas propuestas antes de crearlas.
  - Nuevos `projectNotesApi` y métodos `aiApi.analyzeProjectNotes` / `aiApi.createTasksFromParser` en `lib/api.ts`; tipos `ProjectNote`, `ExtractedTask`, `AnalyzeNotesResponse`, `CreateTasksFromParserDto/Response` en `types/index.ts`.
  - Files: `frontend/src/components/projects/project-notes-card.tsx`, `frontend/src/components/modals/generated-tasks-modal.tsx`, `frontend/src/app/(dashboard)/projects/[id]/page.tsx`, `frontend/src/lib/api.ts`, `frontend/src/types/index.ts`.

### Fixed
- **Backend: Modelo de Gemini desactualizado**:
  - `gemini-2.0-flash` fue retirado por Google; se reemplazó por `gemini-2.5-flash` en `GeminiService`, restaurando el chat de IA y desbloqueando el análisis multimodal de notas.
  - Files: `backend/src/modules/ai/gemini.service.ts`.
- **Backend: Validación faltante en `create-tasks-from-parser`**:
  - `CreateTasksFromParserDto.tasks` no tenía decoradores de `class-validator`, por lo que con `whitelist`/`forbidNonWhitelisted` activos el endpoint rechazaba cualquier request real (nunca se había ejercitado desde el frontend). Se agregó validación completa a `ExtractedTaskDto` y `@ValidateNested` en `tasks`.
  - Files: `backend/src/modules/ai/dto/ai.dto.ts`.

## [0.7.4] - 2026-03-22

### Changed
- **Frontend: Migración del editor de descripción a HugeRTE en Task Modal**:
  - Se reemplazó el editor rich text basado en contenteditable por HugeRTE usando su integración oficial para React.
  - Se mantuvo la API pública de `RichTextEditor` para no romper su uso desde el modal de tareas.
  - Se conservó el flujo de subida de imágenes al backend en pegado y selector de archivos, notificando adjuntos para el guardado de sesión.
  - Files: `frontend/src/components/ui/rich-text-editor.tsx`, `frontend/package.json`, `frontend/package-lock.json`.

## [0.7.3] - 2026-03-09

### Changed
- **Frontend: Vista de clientes más completa para Akela**:
  - Se amplió el formulario de clientes con `phone` y `address`.
  - La lista de clientes ahora soporta búsqueda, filtros por estado, ordenación, `ClientCard` reusable y logos vía `metadata.logoUrl` con fallback a avatar por iniciales.
  - El formulario de clientes se separó en `ClientForm` y permite configurar logo, tarifa por hora y moneda usando `metadata`.
  - La ficha de cliente agrega métricas rápidas de horas, facturación estimada y presupuesto acumulado, además de validación por espacio de trabajo y eliminación permanente para clientes inactivos.
  - Se corrigió el alta rápida de clientes para asignar `spaceId` al espacio actual y el selector de clientes del modal de tareas ahora respeta el espacio activo.
  - Files: `frontend/src/components/clients/client-card.tsx`, `frontend/src/components/clients/client-form.tsx`, `frontend/src/components/clients/clients-list.tsx`, `frontend/src/components/modals/client-modal.tsx`, `frontend/src/components/ui/quick-add-client.tsx`, `frontend/src/components/modals/task-modal.tsx`, `frontend/src/app/(dashboard)/clients/page.tsx`, `frontend/src/app/(dashboard)/clients/[id]/page.tsx`, `frontend/src/lib/client-utils.ts`, `frontend/src/lib/api.ts`.

### Fixed
- **Backend: Board list paginado por espacio**:
  - Se agregó soporte de filtros `spaceId` y `spaceType` en `GET /tasks` para que la paginación ocurra después de limitar las tareas al espacio actual.
  - Se corrigió la aplicación del filtro `type` en el listado de tareas, que existía en DTO pero no se aplicaba en la consulta.
  - Files: `backend/src/modules/tasks/dto/task.dto.ts`, `backend/src/modules/tasks/tasks.service.ts`.
- **Backend: Clientes filtrados correctamente por espacio**:
  - `GET /clients` ahora acepta y aplica `spaceId` junto con `includeInactive`, evitando mezclar clientes de otros espacios cuando el frontend envía ese filtro.
  - Files: `backend/src/modules/clients/dto/client.dto.ts`, `backend/src/modules/clients/clients.controller.ts`, `backend/src/modules/clients/clients.service.ts`.
- **Frontend: Vista lista del board consistente con el espacio activo**:
  - `TaskListView` ahora envía el espacio actual al endpoint paginado y deja de filtrar el resultado después de paginar, evitando tablas vacías cuando la primera página global no contiene tareas del espacio activo.
  - Se alineó la llamada a `tasksApi.getAll()` con los filtros de `status` y `type`, y se reinicia la página actual al cambiar filtros o espacio.
  - Files: `frontend/src/components/board/task-list-view.tsx`, `frontend/src/lib/api.ts`.

## [0.7.2] - 2026-02-23

### Fixed
- **Knowledge Base - Edición**: Corregido modal de edición que abría vacío en vez de prellenar datos del knowledge existente. Se agrega estado `editingKnowledge` que se pasa como prop al `KnowledgeModal`.
- **Knowledge Base - Eliminación**: Reemplazado `confirm()` nativo del navegador por `ConfirmModal` con estilo consistente (variant "danger"), igual que en el resto de la app.
- **Knowledge Base - Archivado**: Corregido flujo de archivado que dejaba items inaccesibles.
  - Agregado toggle "Archivados" en barra de filtros para ver items archivados.
  - Agregado botón de desarchivar (icono `ArchiveRestore`) en modal de detalle para items archivados.
  - Cards archivadas se muestran con opacidad reducida e icono de archivo.
  - Files: `frontend/src/app/(dashboard)/knowledge/page.tsx`, `frontend/src/components/modals/knowledge-detail-modal.tsx`.
- **Mobile Responsivo - Breakpoints consistentes**: Alineados todos los breakpoints de contenido con `lg:` (1024px) para coincidir con el sidebar.
  - Grids de cards (knowledge, clients, projects, areas) pasan a 1 columna en mobile.
  - Board list view: columnas Cliente, Proyecto, Tipo y Fecha ocultas en mobile; solo se muestran Estado, Tarea, Status y Prioridad.
  - Board toolbar: botones secundarios ocultos en mobile.
  - Task modal: layout stacked vertical en mobile con sidebar metadata full-width.
  - Files: `task-modal.tsx`, `task-list-view.tsx`, `board/page.tsx`, `knowledge/page.tsx`, `clients/page.tsx`, `clients/[id]/page.tsx`, `projects/page.tsx`, `projects/[id]/page.tsx`, `areas/page.tsx`.

## [0.7.1] - 2026-02-17

### Fixed
- **Backend: Reintentos y control de colisión en numeración de tareas**:
  - Se reforzó `TasksService.create()` para reintentar la asignación de `task_number` cuando ocurre colisión del índice único por proyecto.
  - Se envolvió `TasksService.update()` en transacción y se añadió manejo de reintentos para conflictos de numeración al mover tareas entre proyectos.
  - Se agregó validación explícita de proyecto inexistente al asignar numeración por proyecto, evitando fallback silencioso a `1`.
  - Se corrigió el caso de producción donde el retorno de DB podía derivar en `task_number = NaN`, agregando parseo robusto, fallback seguro por `MAX(task_number) + 1` y validación estricta antes de persistir.
  - Se transforman conflictos del índice `uq_tasks_project_task_number` en error de negocio (`ConflictException`) para evitar respuestas 500 genéricas.
  - Files: `backend/src/modules/tasks/tasks.service.ts`.

## [0.7.0] - 2026-02-17

### Added
- **Task Codes tipo Jira**: Códigos legibles para tareas (`BES-22`, `CBK-5`) en lugar de UUIDs.
  - Proyectos auto-generan código corto desde su nombre (e.g., "Bespire" → `BES`).
  - Tareas reciben número secuencial atómico por proyecto; sin proyecto usan secuencia global (`#1`, `#2`, etc.).
  - Endpoint `GET /tasks/by-code/:code` y `GET /tasks/:id` acepta UUID o código.
- **URL persistente en modales**: `?selectedTask=BES-22` sobrevive refresh del navegador; backward-compatible con URLs legacy `?task=UUID`.
- **Imágenes en Rich Text Editor**: pegar/subir imágenes directamente en el editor, resize con controles drag, sección de adjuntos, lightbox, upload directo al backend.

### Changed
- Migración `009_add_task_codes.sql`: columnas `code`/`next_task_number` en projects, `task_number` en tasks; secuencia global `global_task_number_seq`.
- `FilesController`: endpoint de upload con multer (reemplaza Next.js API route).

## [0.6.1] - 2026-02-03

### Added
- **Time Picker para Recordatorios**: selector de hora en TaskModal cuando el tipo es "Recordatorio"; combina fecha + hora para el trigger.
- **Navegación desde Notificaciones**: click en notificación abre el modal de la tarea relacionada vía `/board?task=<taskId>`.

## [0.6.0] - 2026-02-03

### Added
- **Triggers System**: motor de triggers evaluado cada minuto vía cron (`time` one-shot, `recurring` con cron expressions, `condition` sobre metadata de tareas).
- **Notifications**: campana en sidebar, panel dropdown, marcar leída/todas, polling cada 30s.
- **Auto-Trigger for Reminders**: crear tarea tipo "recordatorio" con fecha genera automáticamente un trigger `time`.

### Changed
- Nuevos módulos backend `Triggers` y `Notifications` con entidades, DTOs, CRUD y controllers.

## [0.5.0] - 2026-02-03

### Added
- **Spaces (Espacios)**: sistema completo de espacios Personal y Trabajo con navegación por tabs en sidebar.
- **Task Types**: campo `type` en tareas (Tarea, Nota, Recordatorio) con selector visual y badges diferenciados.
- **Domain Selector**: dominio en proyectos/áreas (Trabajo, Auto, Salud, Casa, Finanzas, Personal).
- **Metadata Editor**: editor de campos personalizados en tareas con sugerencias por dominio.
- **Personal Space adaptations**: proyectos se muestran como "Áreas", cliente no requerido, área requerida, filtrado por espacio en board y lista.

### Changed
- Nuevo módulo `Spaces` (entidad, DTOs, controller, service); `clientId` nullable en tareas.
- MCP Server: herramientas de knowledge base (create/search/list/get/update/delete) y git integration (status/diff/commit/branches/changelog).

---

## [2.0.0] - 2026-01-25 — The AI & RAG Era

### Added
- **Gemini 2.0 Flash** como proveedor de IA por defecto (con soporte dual OpenAI GPT-4o-mini).
- **Codebase Indexing (RAG)**: módulo `rag` que escanea archivos fuente, genera embeddings y los almacena en PostgreSQL con `pgvector`; búsqueda semántica de código en lenguaje natural.
- **Semantic Knowledge Base**: repositorio dedicado para decisiones arquitectónicas, guías de estilo y snippets, con búsqueda semántica y tagging por cliente/proyecto.
- **MCP 2.0**: herramientas expandidas (`search_code`, `get_context`, `parse_conversation`) y CLI `klion` con nuevos comandos.
- **Git Integration**: generación de mensajes de commit con IA, generador de `CHANGELOG.md` desde el historial, `git_status`/`git_diff` vía MCP.

### Changed
- Rebranding completo de "ClientBoard" a **Klion**; dark theme (`#111827`) como estándar.
- Backend reorganizado en dominios modulares (`ai`, `rag`, `git`, `knowledge`).
- Paginación por límite/offset reforzada en todos los listados masivos.

### Upgrade notes
- Requiere PostgreSQL 15+ con extensión `pgvector`.
- Requiere `GEMINI_API_KEY` para funcionalidades RAG.

## [1.2.0] - 2025-12-09 — Rebranding a Klion + Autenticación

### Added
- **Sistema de Autenticación** completo: módulo `users` (entidad, bcrypt 10 rounds) y módulo `auth` (login, register, JWT de 7 días, `jwt.strategy`, `jwt-auth.guard`).
- Endpoints `POST /api/auth/login`, `POST /api/auth/register`, `GET /api/auth/me`, `POST /api/auth/validate`.
- **NextAuth.js** en frontend con Credentials Provider, páginas `/login` y `/register`, middleware de protección de rutas, grupos de rutas `(auth)` y `(dashboard)`.
  - Usuario master seed: `MASTER_USER_EMAIL` (ver `docs/setup/QUICKSTART.md`; `MASTER_USER_PASSWORD` es obligatorio y debe ser único por entorno).
- **Sidebar responsive**: modo colapsable en desktop persistido en localStorage, menú hamburguesa + overlay en mobile.

### Changed
- Rebranding a "Klion": logo, favicons multi-tamaño, manifest PWA.

## [1.1.0] - 2025-12-08

### Added
- **Sistema de Subtareas**: módulo backend `subtasks` (CRUD + reordenamiento) y UI en `task-modal.tsx`/`task-card.tsx` con progreso visual y drag & drop.
- **Sistema de Proyectos/Épicos**: módulo backend `projects` (CRUD con filtro por cliente) y UI (`project-modal.tsx`, `projects-section.tsx`, filtro por proyecto en board).
- **Dark Mode**: `darkMode: 'class'` en Tailwind, hook `use-theme.ts` (light/dark/system, persistido en localStorage), aplicado a todos los componentes UI, páginas y modales existentes.

### Fixed
- `e.stopPropagation()` en submits de QuickAdd (cliente y proyecto) para evitar propagación de eventos no deseada.
- Comportamientos erráticos de drag & drop en Kanban al mover tareas entre columnas.

## [1.0.0] - 2025-12-08

### Added
- **Modales CRUD**: TaskModal, ClientModal, WorklogModal, FileModal, ConfirmModal.
- **Funcionalidades de IA**: TodayPlanModal (plan diario), WriteMessageModal (redacción de mensajes), integración OpenAI GPT-4o-mini.
- **Vistas del Board**: Vista Trello (columnas por estado) y Vista Clientes (columnas por cliente) con toggle.
- **Sistema de Filtros**: por cliente, prioridad y tags, con contador de resultados.
- **Drag & Drop**: entre columnas de estado y reordenamiento de columnas de cliente, persistido en localStorage (`useBoardPreferences`).
- **Página de Settings**: perfil, apariencia, configuración de API de OpenAI, notificaciones, exportación de datos.
- Toast notifications y Quick Add Client inline.
