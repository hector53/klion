# Arquitectura de Componentes - Klion

## Diagrama de Componentes

```
┌─────────────────────────────────────────────────────────────────────┐
│                           App Layout                                 │
│  ┌──────────────┐  ┌──────────────────────────────────────────────┐ │
│  │   Sidebar    │  │              Main Content                     │ │
│  │              │  │                                               │ │
│  │ - Board      │  │  ┌─────────────────────────────────────────┐ │ │
│  │ - Clients    │  │  │           Board Page                     │ │ │
│  │ - Snapshots  │  │  │  ┌─────────────────────────────────────┐│ │ │
│  │              │  │  │  │    Header (Toggle + Actions)        ││ │ │
│  │ ─────────────│  │  │  └─────────────────────────────────────┘│ │ │
│  │ AI Actions:  │  │  │  ┌─────────────────────────────────────┐│ │ │
│  │ - Plan día   │  │  │  │    BoardFilters (Trello view)       ││ │ │
│  │ - Redactar   │  │  │  └─────────────────────────────────────┘│ │ │
│  │              │  │  │  ┌─────────────────────────────────────┐│ │ │
│  │ ─────────────│  │  │  │  KanbanBoard OR ClientBoard         ││ │ │
│  │ - Settings   │  │  │  │                                     ││ │ │
│  └──────────────┘  │  │  └─────────────────────────────────────┘│ │ │
│                    │  └─────────────────────────────────────────┘ │ │
│                    └──────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

## Flujo de Datos

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Backend   │◄────│  React Query │◄────│  Components │
│  (NestJS)   │────►│   (Cache)    │────►│   (UI)      │
└─────────────┘     └─────────────┘     └─────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │ localStorage│
                    │(Preferences)│
                    └─────────────┘
```

## Jerarquía de Modales

```
TaskModal
├── QuickAddClient (inline component)
├── ConfirmModal (delete confirmation)
└── Toast (feedback)

ClientModal
├── ConfirmModal (delete confirmation)
└── Toast (feedback)

WorklogModal / FileModal
├── Task selector
├── ConfirmModal
└── Toast

AI Modals
├── TodayPlanModal (uses board data)
└── WriteMessageModal (uses clients data)
```

## Estado y Persistencia

```
┌─────────────────────────────────────────────────────┐
│                  Board Page State                    │
├─────────────────────────────────────────────────────┤
│  React State (ephemeral):                           │
│  - selectedTask                                     │
│  - isTaskModalOpen                                  │
│  - filters                                          │
│                                                     │
│  localStorage (persistent):                         │
│  - viewMode ('trello' | 'clients')                 │
│  - selectedClientIds                                │
│  - clientColumnOrder                                │
│                                                     │
│  React Query (server state):                        │
│  - boardData (tasks by status)                      │
│  - clients                                          │
│  - tasks                                            │
└─────────────────────────────────────────────────────┘
```

## Props Flow

### Board Page → KanbanBoard
```typescript
<KanbanBoard
  data={filteredBoardData}      // BoardData
  onTaskMove={handleTaskMove}    // (id, status, position) => void
  onTaskClick={handleTaskClick}  // (task) => void
  onAddTask={handleAddTask}      // (status) => void
/>
```

### Board Page → ClientBoard
```typescript
<ClientBoard
  selectedClientIds={selectedClientIds}     // string[]
  clientColumnOrder={clientColumnOrder}     // string[]
  onSelectClients={() => ...}               // () => void
  onTaskClick={handleTaskClick}             // (task) => void
  onAddTask={handleAddTask}                 // (clientId) => void
  onColumnOrderChange={setClientColumnOrder} // (order) => void
/>
```

### TaskModal Props
```typescript
interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  task?: Task | null;           // Edit mode if provided
  defaultStatus?: TaskStatus;   // Pre-select status
  defaultClientId?: string;     // Pre-select client
}
```

## Query Keys

```typescript
// React Query cache keys
['board']           // Board data (tasks by status)
['tasks']           // All tasks list
['clients']         // All clients
['client', id]      // Single client detail
['worklogs']        // All worklogs
['files']           // All files
['snapshots']       // All snapshots
```

## Mutation Patterns

```typescript
// Standard mutation pattern
const mutation = useMutation({
  mutationFn: (data) => api.create(data),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['resource'] });
    toast.success('Operación exitosa');
    onClose();
  },
  onError: () => {
    toast.error('Error en la operación');
  },
});
```
