# Changelog v1.1.0

**Fecha:** 8 de diciembre de 2025  
**Commit anterior:** `1d66ac0` - fix: Fix localStorage persistence for client selection

---

## 🆕 Nuevas Características

### 1. Sistema de Subtareas
Se implementó un sistema completo de subtareas que permite dividir las tareas principales en pasos más pequeños y manejables.

#### Backend (`backend/src/modules/subtasks/`)
- **`subtask.entity.ts`** - Entidad para subtareas con campos: id, title, isCompleted, order, taskId
- **`subtask.dto.ts`** - DTOs para crear, actualizar y reordenar subtareas
- **`subtasks.service.ts`** - Servicio con operaciones CRUD y reordenamiento
- **`subtasks.controller.ts`** - Endpoints REST:
  - `GET /tasks/:taskId/subtasks` - Listar subtareas
  - `POST /tasks/:taskId/subtasks` - Crear subtarea
  - `PATCH /subtasks/:id` - Actualizar subtarea
  - `PATCH /subtasks/:id/toggle` - Toggle completado
  - `DELETE /subtasks/:id` - Eliminar subtarea
  - `PATCH /tasks/:taskId/subtasks/reorder` - Reordenar subtareas
- **`subtasks.module.ts`** - Módulo NestJS

#### Frontend
- **`task.entity.ts`** - Añadida relación con subtareas
- **`types/index.ts`** - Tipos TypeScript para Subtask
- **`lib/api.ts`** - Cliente API para subtareas (`subtasksApi`)
- **`task-card.tsx`** - Indicador visual de progreso de subtareas (ej: "2/5 subtareas")
- **`task-modal.tsx`** - Sección completa para gestionar subtareas:
  - Añadir subtareas con input
  - Toggle completado con checkbox
  - Eliminar subtareas
  - Drag & drop para reordenar
  - Barra de progreso visual

---

### 2. Sistema de Proyectos/Épicos (estilo Jira)
Se implementó un sistema de proyectos que permite agrupar tareas por cliente, similar a los épicos de Jira.

#### Backend (`backend/src/modules/projects/`)
- **`project.entity.ts`** - Entidad Project con: id, name, description, color, status, clientId, timestamps
- **`project.dto.ts`** - DTOs para crear y actualizar proyectos
- **`projects.service.ts`** - Servicio CRUD con filtros por cliente
- **`projects.controller.ts`** - Endpoints REST:
  - `GET /projects` - Listar proyectos (con filtro por clientId opcional)
  - `GET /projects/:id` - Obtener proyecto
  - `POST /projects` - Crear proyecto
  - `PATCH /projects/:id` - Actualizar proyecto
  - `DELETE /projects/:id` - Eliminar proyecto
- **`projects.module.ts`** - Módulo NestJS

#### Frontend
- **`types/index.ts`** - Tipos TypeScript para Project y ProjectStatus
- **`lib/api.ts`** - Cliente API para proyectos (`projectsApi`)
- **`task.dto.ts`** - Añadido campo `projectId` opcional
- **`task.entity.ts`** - Relación ManyToOne con Project
- **`project-modal.tsx`** - Modal completo para crear/editar proyectos:
  - Selector de cliente (si no viene preseleccionado)
  - Nombre y descripción
  - Selector de color (6 opciones)
  - Selector de estado (active, completed, on_hold)
- **`quick-add-project.tsx`** - Componente QuickAdd para crear proyectos rápidamente
- **`projects-section.tsx`** - Sección de proyectos en la vista de cliente:
  - Lista de proyectos del cliente
  - Indicadores de color y estado
  - Contador de tareas por proyecto
  - Acciones de editar/eliminar
- **`clients/[id]/page.tsx`** - Integración de proyectos en detalle de cliente
- **`board-filters.tsx`** - Filtro por proyecto en el tablero Kanban
- **`task-modal.tsx`** - Selector de proyecto al crear/editar tareas

---

### 3. Dark Mode / Tema Oscuro
Se implementó un sistema completo de temas con soporte para modo oscuro.

#### Configuración Base
- **`tailwind.config.js`** - Configurado `darkMode: 'class'`
- **`globals.css`** - Variables CSS para tema oscuro:
  - `:root` - Variables de colores claros (HSL)
  - `.dark` - Variables de colores oscuros
  - Estilos de scrollbar para dark mode
  - Clases utilitarias: `.form-select`, `.form-textarea`, `.form-label`, `.modal-*`

#### Sistema de Temas
- **`hooks/use-theme.ts`** - Hook de React con Context para gestión de temas:
  - Estados: `light`, `dark`, `system`
  - Persistencia en localStorage (clave: `clientboard-theme`)
  - Detección automática de preferencia del sistema con `matchMedia`
  - Aplicación de clase `.dark` en el elemento HTML

#### Componentes UI con Dark Mode
- **`sidebar.tsx`** - Toggle de tema con iconos Sol/Luna/Monitor
- **`button.tsx`** - Todas las variantes con estilos dark
- **`input.tsx`** - Estilos de input para dark mode
- **`badge.tsx`** - Todas las variantes (default, secondary, destructive, outline, success, warning) con dark mode
- **`toast.tsx`** - Notificaciones con estilos dark
- **`card.tsx`** - Usa variables CSS que ya soportan dark mode

#### Páginas con Dark Mode
- **`layout.tsx`** - ThemeProvider envolviendo la aplicación
- **`providers.tsx`** - Integración de ThemeProvider
- **`board/page.tsx`** - Header y contenido del tablero
- **`clients/page.tsx`** - Lista de clientes con cards dark
- **`clients/[id]/page.tsx`** - Detalle de cliente completo
- **`snapshots/page.tsx`** - Página de snapshots
- **`settings/page.tsx`** - Todas las secciones (perfil, apariencia, IA, notificaciones, datos)

#### Modales con Dark Mode
- **`task-modal.tsx`** - Modal de tareas completo
- **`client-modal.tsx`** - Modal de clientes
- **`project-modal.tsx`** - Modal de proyectos
- **`worklog-modal.tsx`** - Modal de registros de trabajo
- **`file-modal.tsx`** - Modal de archivos
- **`confirm-modal.tsx`** - Modal de confirmación
- **`select-clients-modal.tsx`** - Modal de selección de clientes
- **`today-plan-modal.tsx`** - Modal de plan del día con IA
- **`write-message-modal.tsx`** - Modal de redacción con IA

#### Componentes Board con Dark Mode
- **`kanban-board.tsx`** - Tablero Kanban principal
- **`board-column.tsx`** - Columnas del tablero
- **`task-card.tsx`** - Tarjetas de tareas
- **`board-filters.tsx`** - Barra de filtros
- **`client-board.tsx`** - Vista agrupada por cliente

#### Utilidades
- **`lib/utils.ts`** - Colores de status y prioridad con variantes dark:
  - `statusColors` - Colores por estado de tarea
  - `priorityColors` - Colores por prioridad

---

## 🐛 Correcciones de Bugs

### 1. Propagación de formularios en QuickAdd
- **`quick-add-client.tsx`** - Añadido `e.stopPropagation()` en el submit para evitar que el evento se propague y cause comportamientos inesperados
- **`quick-add-project.tsx`** - Mismo fix aplicado

### 2. Drag & Drop en Kanban
- **`kanban-board.tsx`** - Corregidos problemas con el drag and drop que causaban comportamientos erráticos al mover tareas entre columnas

---

## 📁 Estructura de Archivos Nuevos

```
backend/src/modules/
├── subtasks/
│   ├── dto/
│   │   └── subtask.dto.ts
│   ├── entities/
│   │   └── subtask.entity.ts
│   ├── subtasks.controller.ts
│   ├── subtasks.module.ts
│   └── subtasks.service.ts
└── projects/
    ├── dto/
    │   └── project.dto.ts
    ├── entities/
    │   └── project.entity.ts
    ├── projects.controller.ts
    ├── projects.module.ts
    └── projects.service.ts

frontend/src/
├── hooks/
│   └── use-theme.ts
├── components/
│   ├── clients/
│   │   └── projects-section.tsx
│   ├── modals/
│   │   └── project-modal.tsx
│   └── ui/
│       └── quick-add-project.tsx
└── app/
    └── assets/
        └── (assets estáticos)
```

---

## 🔧 Archivos Modificados

### Backend
- `app.module.ts` - Importación de SubtasksModule y ProjectsModule
- `modules/clients/entities/client.entity.ts` - Relación con Projects
- `modules/tasks/dto/task.dto.ts` - Campo projectId opcional
- `modules/tasks/entities/task.entity.ts` - Relaciones con Subtasks y Project
- `modules/tasks/tasks.service.ts` - Inclusión de subtareas y proyecto en queries

### Frontend (35 archivos)
- Todos los componentes UI, modales, páginas y utilidades actualizados con soporte dark mode
- Sistema de tipos actualizado con Subtask y Project
- API client actualizado con endpoints de subtasks y projects

---

## 📊 Resumen de Cambios

| Categoría | Archivos Nuevos | Archivos Modificados |
|-----------|-----------------|----------------------|
| Backend | 10 | 5 |
| Frontend | 7 | 30 |
| **Total** | **17** | **35** |

---

## 🚀 Cómo Probar

1. **Subtareas**: Abrir una tarea existente → Sección "Subtareas" → Añadir, completar, reordenar
2. **Proyectos**: Ir a detalle de cliente → Sección "Proyectos" → Crear proyecto → Asignar tareas
3. **Dark Mode**: Click en el icono de tema en el sidebar (esquina inferior) → Elegir Light/Dark/System
