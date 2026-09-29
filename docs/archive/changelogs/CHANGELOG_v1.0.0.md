# Changelog - ClientBoard

Todos los cambios notables del proyecto serán documentados en este archivo.

## [1.0.0] - 2025-12-08

### ✨ Nuevas Funcionalidades

#### Sistema de Modales CRUD
- **TaskModal**: Crear, editar y eliminar tareas con todos los campos
- **ClientModal**: Gestión completa de clientes
- **WorklogModal**: Registro de horas trabajadas por tarea
- **FileModal**: Asociación de archivos a tareas
- **ConfirmModal**: Modal reutilizable para confirmaciones

#### Funcionalidades de IA
- **TodayPlanModal**: Generación de plan diario basado en tareas pendientes
- **WriteMessageModal**: Redacción de mensajes profesionales para clientes
- Integración con OpenAI GPT-4o-mini

#### Vistas del Board
- **Vista Trello**: Board clásico con columnas por estado (TODO, DOING, BLOCKED, DONE)
- **Vista Clientes**: Nueva vista con columnas organizadas por cliente
- **Toggle de vistas**: Switch para cambiar entre vistas en el header

#### Sistema de Filtros
- Filtrado por cliente
- Filtrado por prioridad
- Filtrado por tags
- Contador de tareas filtradas

#### Drag & Drop
- Arrastrar tareas entre columnas (vista Trello)
- Reordenar columnas de clientes (vista Clientes)
- Persistencia del orden en localStorage

#### Persistencia Local
- Hook `useBoardPreferences` para guardar preferencias
- Guarda: vista activa, clientes seleccionados, orden de columnas
- Mantiene configuración al refrescar página

#### UX Improvements
- **Toast Notifications**: Sistema de notificaciones para feedback
- **Quick Add Client**: Crear cliente inline desde TaskModal
- **Nuevo cliente inline**: Botón en vista de clientes
- Indicadores visuales de prioridad y estado

#### Página de Settings
- Configuración de perfil
- Preferencias de apariencia
- Configuración de API de OpenAI
- Opciones de notificaciones
- Exportación de datos

### 📁 Archivos Creados

```
frontend/src/
├── components/
│   ├── board/
│   │   ├── board-filters.tsx
│   │   └── client-board.tsx
│   ├── modals/
│   │   ├── task-modal.tsx
│   │   ├── client-modal.tsx
│   │   ├── worklog-modal.tsx
│   │   ├── file-modal.tsx
│   │   ├── confirm-modal.tsx
│   │   ├── today-plan-modal.tsx
│   │   ├── write-message-modal.tsx
│   │   └── select-clients-modal.tsx
│   └── ui/
│       ├── toast.tsx
│       └── quick-add-client.tsx
├── hooks/
│   └── use-local-storage.ts
├── app/
│   └── settings/
│       └── page.tsx
└── docs/
    ├── FEATURES.md
    ├── ARCHITECTURE.md
    └── CHANGELOG.md
```

### 🔧 Modificaciones

- `app/board/page.tsx`: Integración de filtros, vistas, localStorage
- `app/clients/page.tsx`: Integración de ClientModal
- `app/clients/[id]/page.tsx`: Integración de todos los modales
- `app/providers.tsx`: Añadido ToastProvider
- `components/ui/sidebar.tsx`: Añadidos botones de IA

---

## Próximas Funcionalidades (TODO)

Ver `TODO.md` para lista completa de funcionalidades pendientes.

### Prioridad Alta
- [ ] Quick Add Task en Client Detail
- [ ] Dashboard con métricas

### Prioridad Media
- [ ] Búsqueda global (Cmd+K)
- [ ] Empty states mejorados
- [ ] Skeleton loaders

### Prioridad Baja
- [ ] Sistema de autenticación
- [ ] Tema oscuro
- [ ] Integraciones externas
