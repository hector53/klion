# Klion v2.0 - Hub de Contexto y Conocimiento para IA

## Resumen

Klion se ha transformado en un **hub central de contexto y conocimiento** que potencia el flujo de trabajo con IA. Una sola llamada `klion.get_context("Proyecto")` proporciona todo: stack, reglas, tareas, conocimiento acumulado.

---

## Fase 0: pgvector en PostgreSQL ✅

### Cambios realizados

**docker-compose.yml:**
```yaml
postgres:
  image: pgvector/pgvector:pg15  # Antes: postgres:15-alpine
  volumes:
    - postgres_data:/var/lib/postgresql/data
    - ./backend/init-db:/docker-entrypoint-initdb.d
```

**backend/init-db/01-enable-pgvector.sql:**
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

**backend/src/common/pgvector.helper.ts:**
```typescript
export function vectorToSql(vector: number[]): string {
  return `[${vector.join(",")}]`;
}

export function vectorFromSql(sqlVector: string): number[] {
  const cleaned = sqlVector.replace(/^\[|\]$/g, "");
  return cleaned.split(",").map(Number);
}
```

**backend/src/database/database.module.ts:**
- Añadido `OnModuleInit` para verificar/crear extensión pgvector al iniciar

### Verificación
```sql
SELECT * FROM pg_extension WHERE extname = 'vector';
```

---

## Fase 1: Módulo de Contexto Unificado ✅

### Archivos creados/modificados

```
backend/src/modules/projects/
├── entities/project-context.entity.ts   # Nueva entidad
├── dto/project-context.dto.ts           # DTOs
├── projects.service.ts                  # Métodos getContext, updateContext
└── projects.controller.ts               # Endpoints de contexto

mcp/klion-server/src/
├── index.ts                             # Tools: get_context, update_context
└── api.ts                               # projectsApi.getContext()
```

### Entidad ProjectContext

```typescript
@Entity("project_contexts")
export class ProjectContext {
  @Column({ type: "text", nullable: true })
  stack: string;  // "Next.js 14, NestJS, PostgreSQL"

  @Column({ type: "jsonb", default: [] })
  rules: string[];  // ["Usar DTOs", "Dark mode"]

  @Column({ type: "text", nullable: true })
  aiDescription: string;

  @Column({ nullable: true })
  repositoryUrl: string;

  @Column({ nullable: true })
  localPath: string;  // Para RAG

  @Column({ default: false })
  ragEnabled: boolean;

  @Column({ nullable: true })
  lastIndexedAt: Date;

  @Column({ default: 0 })
  indexedChunks: number;
}
```

### API Endpoints

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/projects/context/:identifier` | Contexto completo (por ID o nombre) |
| GET | `/projects/:id/context/settings` | Solo configuración |
| PATCH | `/projects/:id/context` | Actualizar contexto |

### MCP Tools

```typescript
// Obtener contexto completo
get_context(identifier: "Client Board Klion")

// Actualizar configuración
update_context(projectId, { stack, rules, localPath, ... })
```

### Respuesta de get_context

```json
{
  "project": { "id", "name", "status", "client" },
  "context": {
    "stack": "NestJS 10, Next.js 14, PostgreSQL 15, pgvector",
    "rules": ["Usar DTOs estrictos", "Dark mode"],
    "aiDescription": "Sistema de gestión...",
    "ragEnabled": true,
    "indexedChunks": 80
  },
  "currentState": {
    "totalTasks": 15,
    "tasksByStatus": { "todo": 5, "doing": 2, "done": 8 },
    "activeTasks": [...],
    "blockedTasks": [...]
  },
  "relatedKnowledge": [...]
}
```

---

## Fase 2: Knowledge Base Module ✅

### Archivos creados

```
backend/src/modules/knowledge/
├── entities/
│   ├── knowledge.entity.ts
│   └── knowledge-tag.entity.ts
├── dto/knowledge.dto.ts
├── knowledge.service.ts
├── knowledge.controller.ts
└── knowledge.module.ts
```

### Entidad Knowledge

```typescript
export enum KnowledgeType {
  SNIPPET = "snippet",
  FLOW = "flow",
  DECISION = "decision",
  PATTERN = "pattern",
  SOLUTION = "solution",
  REFERENCE = "reference",
  OTHER = "other"
}

@Entity("knowledge")
export class Knowledge {
  @Column({ length: 500 })
  title: string;

  @Column({ type: "text" })
  content: string;

  @Column({ type: "enum", enum: KnowledgeType })
  type: KnowledgeType;

  @Column({ type: "text", nullable: true })
  embedding: string;  // Para búsqueda semántica futura

  @Column({ length: 50, nullable: true })
  language: string;  // "typescript", "python", etc.

  @ManyToMany(() => KnowledgeTag)
  tags: KnowledgeTag[];

  @ManyToOne(() => Project)
  project: Project;

  @ManyToOne(() => Client)
  client: Client;
}
```

### API Endpoints

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/knowledge` | Crear entrada |
| GET | `/knowledge` | Listar con filtros |
| GET | `/knowledge/search?query=X` | Búsqueda por texto |
| GET | `/knowledge/:id` | Obtener detalle |
| PATCH | `/knowledge/:id` | Actualizar |
| DELETE | `/knowledge/:id` | Eliminar |
| GET | `/knowledge/tags` | Listar tags |
| GET | `/knowledge/project/:projectId` | Por proyecto |

### MCP Tools

```typescript
create_knowledge({
  title: "NestJS JWT Guard",
  content: "...",
  type: "snippet",
  language: "typescript",
  tags: ["nestjs", "auth", "jwt"]
})

search_knowledge({ query: "autenticación" })
get_knowledge(id)
list_knowledge({ type: "pattern", projectId: "..." })
update_knowledge(id, { ... })
delete_knowledge(id)
```

---

## Fase 3: RAG Nativo con pgvector ✅

### Archivos creados

```
backend/src/modules/rag/
├── entities/code-chunk.entity.ts
├── dto/rag.dto.ts
├── services/
│   ├── embedding.service.ts    # Gemini/OpenAI embeddings
│   ├── indexer.service.ts      # Escaneo y chunking
│   └── rag.service.ts          # Orquestación
├── rag.controller.ts
└── rag.module.ts
```

### Entidad CodeChunk

```typescript
@Entity("code_chunks")
export class CodeChunk {
  @Column()
  projectId: string;

  @Column({ length: 1000 })
  filePath: string;  // "src/modules/auth/auth.service.ts"

  @Column({ length: 255 })
  fileName: string;

  @Column({ length: 20 })
  fileType: string;  // "ts", "py", etc.

  @Column({ type: "text" })
  content: string;

  @Column({ type: "text", nullable: true })
  embedding: string;  // vector(1536)

  @Column({ type: "int" })
  startLine: number;

  @Column({ type: "int" })
  endLine: number;

  @Column({ type: "jsonb", default: [] })
  features: string[];  // ["class", "async", "decorator"]

  @Column({ length: 64, nullable: true })
  fileHash: string;  // Para detección de cambios
}
```

### Extensiones soportadas

- **JavaScript/TypeScript:** ts, tsx, js, jsx, mjs, cjs
- **Python:** py, pyi
- **Go:** go
- **Rust:** rs
- **Java/Kotlin:** java, kt, kts
- **C/C++:** c, cpp, cc, h, hpp
- **Otros:** sql, sh, json, yaml, md, graphql, dockerfile

### Patrones excluidos automáticamente

- node_modules, .git, dist, build, .next
- __pycache__, venv, vendor
- *.min.js, *.map, package-lock.json

### API Endpoints

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/rag/index` | Indexar proyecto |
| GET | `/rag/search?query=X` | Buscar código |
| GET | `/rag/status/:projectId` | Estado del índice |
| GET | `/rag/progress/:projectId` | Progreso de indexación |
| DELETE | `/rag/:projectId` | Eliminar índice |

### MCP Tools

```typescript
// Indexar un proyecto
index_project({
  projectId: "uuid",
  repoPath: "/path/to/repo",  // Opcional, usa localPath del contexto
  forceReindex: false          // true para reindexar todo
})

// Buscar código
search_code({
  query: "JWT authentication",
  projectId: "uuid",           // Opcional
  fileType: "ts",              // Opcional
  limit: 10,
  useSemanticSearch: true      // false para búsqueda exacta
})

get_index_status(projectId)
delete_index(projectId)
```

### Flujo de indexación

1. **Scanning** - Escanea directorio recursivamente
2. **Chunking** - Divide archivos grandes (500 líneas, 50 overlap)
3. **Embedding** - Genera embeddings si hay API key (Gemini/OpenAI)
4. **Storing** - Guarda chunks en PostgreSQL

### Búsqueda

- **Semántica:** Usa pgvector `<=>` (cosine similarity) si hay embeddings
- **Texto:** Fallback con ILIKE cuando no hay embeddings

---

## Fase 4: Chat IA con Gemini 2.0 Flash ✅

### Archivos creados/modificados

**Backend:**
```
backend/src/modules/ai/
├── gemini.service.ts         # Nuevo - Cliente Gemini API
├── ai.service.ts             # Modificado - método chat()
├── ai.controller.ts          # Modificado - POST /ai/chat
├── ai.module.ts              # Modificado - imports
└── dto/ai.dto.ts             # Modificado - ChatRequestDto, ChatResponseDto
```

**Frontend:**
```
frontend/src/
├── app/
│   ├── providers.tsx                    # Modificado - ChatProvider
│   └── (dashboard)/layout.tsx           # Modificado - ChatSidebar
├── components/
│   ├── chat/
│   │   └── ChatSidebar.tsx              # Nuevo - Panel de chat
│   └── ui/
│       └── sidebar.tsx                  # Modificado - Botón "Chat con IA"
├── hooks/
│   └── use-chat.tsx                     # Nuevo - Estado global del chat
└── lib/
    └── api.ts                           # Modificado - aiApi.chat()
```

### GeminiService

```typescript
@Injectable()
export class GeminiService {
  private readonly model = 'gemini-2.0-flash';
  
  async chat(message: string, options: {
    systemPrompt?: string;
    history?: Array<{ role: 'user' | 'assistant'; content: string }>;
    imageBase64?: string;
    imageMimeType?: string;
  }): Promise<string>
  
  // Streaming también disponible
  async *chatStream(...): AsyncGenerator<string>
}
```

### Chat Request/Response

```typescript
// Request
interface ChatRequestDto {
  message: string;
  projectId?: string;
  history?: ChatMessageDto[];
  includeContext?: boolean;    // Incluir contexto del proyecto
  includeCodeSearch?: boolean; // Buscar en código indexado
  imageUrl?: string;           // Soporte multimodal
  imageMimeType?: string;
}

// Response
interface ChatResponseDto {
  message: string;
  suggestedActions?: Array<{
    type: 'create_task' | 'save_knowledge' | 'search_code';
    label: string;
    data: any;
  }>;
  sources?: Array<{
    type: 'context' | 'knowledge' | 'code';
    title: string;
    reference?: string;
  }>;
  model: string;  // 'gemini-2.0-flash'
}
```

### API Endpoint

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/ai/chat` | Chat multimodal con contexto |

### Características del Chat

1. **Contexto automático:** Si se proporciona `projectId`, incluye:
   - Información del proyecto y cliente
   - Stack tecnológico y reglas
   - Estado actual de tareas
   - Tareas bloqueadas

2. **Búsqueda de conocimiento:** Automáticamente busca en Knowledge Base
   entradas relevantes al mensaje del usuario.

3. **Búsqueda de código:** Si `includeCodeSearch: true`, busca código
   relevante en el índice RAG del proyecto.

4. **Soporte multimodal:** Acepta imágenes en base64 (screenshots, diagramas).

5. **Acciones sugeridas:** Detecta cuando el usuario quiere:
   - Crear una tarea
   - Guardar un snippet como conocimiento

### Frontend - ChatSidebar

- Panel lateral derecho (w-96)
- Toggles para contexto y búsqueda de código
- Soporte para subir imágenes
- Historial de conversación
- Indicador de carga (Pensando...)
- Botón "Limpiar" para reset

### Hook useChat

```typescript
const { 
  isOpen, 
  setIsOpen, 
  toggleChat,
  projectId,
  projectName,
  setProject 
} = useChat();
```

### Variables de entorno

```env
GEMINI_API_KEY=your_gemini_api_key
```

---

## Fase 5: Git Integration Module ✅

### Archivos creados

```
backend/src/modules/git/
├── dto/git.dto.ts           # DTOs para todas las operaciones
├── git.service.ts           # Lógica de integración Git
├── git.controller.ts        # Endpoints REST
└── git.module.ts            # Módulo NestJS
```

### Funcionalidades

1. **Status y Branches**
   - Estado del repositorio (branch, staged, modified, untracked)
   - Lista de branches locales
   - Diff de cambios (staged/unstaged)

2. **Auto-commit con IA**
   - Genera mensajes de commit siguiendo conventional commits
   - Incluye contexto de tarea relacionada (opcional)
   - Sugiere alternativas

3. **Changelog**
   - Genera changelog a partir de commits
   - Agrupa por tipo (features, fixes, otros)
   - Actualiza archivo CHANGELOG.md

4. **Documentación**
   - Genera README, API docs, setup guide, contributing
   - Guarda archivos y opcionalmente hace commit

### API Endpoints

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/git/status/:projectId` | Estado del repo |
| GET | `/git/branches/:projectId` | Lista de branches |
| GET | `/git/diff/:projectId` | Diff de cambios |
| POST | `/git/commit/generate-message` | Generar mensaje con IA |
| POST | `/git/commit` | Crear commit |
| POST | `/git/changelog/generate` | Generar changelog |
| POST | `/git/changelog/update` | Actualizar CHANGELOG.md |
| POST | `/git/docs/generate` | Generar documentación |
| POST | `/git/docs/save` | Guardar documentación |

### MCP Tools

```typescript
// Status
git_status(projectId)
git_branches(projectId)
git_diff(projectId, staged?)

// Commits
generate_commit_message(projectId, changes?, taskId?, type?)
git_commit(projectId, message, files?, push?)

// Changelog
generate_changelog(projectId, from?, to?, version?)
update_changelog(projectId, content, filePath?)

// Documentation
generate_documentation(projectId, type, context?)
save_documentation(projectId, content, filePath, commit?, commitMessage?)
```

### Requisitos

- El proyecto debe tener `localPath` configurado en su contexto
- OpenAI API key para generación de mensajes/docs

### Ejemplo de uso

```typescript
// Generar mensaje de commit
const msg = await gitApi.generateCommitMessage({
  projectId: "uuid",
  taskId: "task-uuid"  // Incluye contexto de la tarea
});
// Result: "feat(auth): implement JWT refresh token support"

// Crear commit y push
const result = await gitApi.createCommit({
  projectId: "uuid",
  message: msg.message,
  push: true
});
```

---

## Fase 6: Parser de Conversaciones ✅

### Descripción

El Parser de Conversaciones permite pegar texto de conversaciones (Slack, WhatsApp, email, notas de reuniones) y extraer automáticamente:
- Tareas potenciales
- Decisiones técnicas
- Preguntas pendientes

### Archivos modificados

```
backend/src/modules/ai/
├── dto/ai.dto.ts         # Nuevos DTOs para parser
├── ai.service.ts         # Métodos parseConversation, createTasksFromParser
└── ai.controller.ts      # Endpoints POST /ai/parse-conversation, POST /ai/create-tasks-from-parser

mcp/klion-server/src/
├── api.ts                # parserApi
└── index.ts              # Tools: parse_conversation, create_tasks_from_conversation
```

### DTOs

```typescript
// Input
interface ParseConversationDto {
  conversation: string;    // Texto de la conversación
  clientId?: string;       // Contexto del cliente
  projectId?: string;      // Contexto del proyecto
  context?: string;        // Contexto adicional
}

// Output - Tarea extraída
interface ExtractedTaskDto {
  title: string;           // Título accionable
  description?: string;    // Descripción detallada
  priority: 'low' | 'medium' | 'high';
  tags?: string[];
  confidence: number;      // 0-1, qué tan seguro está la IA
  sourceText: string;      // Fragmento original
}

// Output - Respuesta completa
interface ParseConversationResponseDto {
  summary: string;         // Resumen de la conversación
  tasks: ExtractedTaskDto[];
  decisions?: string[];    // Decisiones identificadas
  pendingQuestions?: string[];  // Dudas sin resolver
  taskCount: number;
}
```

### API Endpoints

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/ai/parse-conversation` | Analizar conversación y extraer tareas |
| POST | `/ai/create-tasks-from-parser` | Crear tareas desde resultado del parser |

### MCP Tools

```typescript
// Parsear conversación
parse_conversation({
  conversation: "...", // Texto completo
  clientId?: "uuid",
  projectId?: "uuid",
  context?: "Esto es sobre el módulo de pagos"
})

// Crear tareas seleccionadas
create_tasks_from_conversation({
  clientId: "uuid",
  projectId?: "uuid",
  tasks: [
    { title: "...", priority: "high", tags: [...] },
    ...
  ]
})
```

### Ejemplo de uso

```typescript
// 1. Parsear conversación
const result = await parserApi.parseConversation({
  conversation: `
    Juan: Necesitamos implementar OAuth para el login
    María: Sí, y también hay que arreglar el bug del carrito
    Juan: Deberíamos usar PostgreSQL en vez de MongoDB
    María: ¿Qué proveedor de email usamos?
  `,
  projectId: "uuid"
});

// Result:
// {
//   summary: "Discusión sobre autenticación y corrección de bugs",
//   tasks: [
//     { title: "Implementar OAuth para login", priority: "high", confidence: 0.95, ... },
//     { title: "Corregir bug del carrito", priority: "medium", confidence: 0.9, ... }
//   ],
//   decisions: ["Usar PostgreSQL en lugar de MongoDB"],
//   pendingQuestions: ["¿Qué proveedor de email usar?"],
//   taskCount: 2
// }

// 2. Crear las tareas deseadas
const created = await parserApi.createTasksFromParser({
  clientId: "uuid",
  projectId: "uuid",
  tasks: result.tasks.filter(t => t.confidence > 0.8)
});
```

---

## Tareas pendientes

(Ninguna - todas las fases completadas)

---

## Variables de entorno necesarias

```env
# Para embeddings semánticos (opcional pero recomendado)
GEMINI_API_KEY=your_key
# o
OPENAI_API_KEY=your_key
```

---

## Comandos útiles

```bash
# Verificar pgvector
docker compose exec postgres psql -U klion -c "SELECT extversion FROM pg_extension WHERE extname = 'vector';"

# Ver chunks indexados
docker compose exec postgres psql -U klion -c "SELECT COUNT(*) FROM code_chunks;"

# Reconstruir contenedores
docker compose down && docker compose up -d --build
```

---

## Estructura de archivos añadidos

```
backend/
├── init-db/
│   └── 01-enable-pgvector.sql
├── src/
│   ├── common/
│   │   └── pgvector.helper.ts
│   ├── database/
│   │   └── database.module.ts          # Modificado
│   └── modules/
│       ├── projects/
│       │   ├── entities/
│       │   │   └── project-context.entity.ts
│       │   ├── dto/
│       │   │   └── project-context.dto.ts
│       │   ├── projects.service.ts     # Modificado
│       │   └── projects.controller.ts  # Modificado
│       ├── knowledge/
│       │   ├── entities/
│       │   │   ├── knowledge.entity.ts
│       │   │   └── knowledge-tag.entity.ts
│       │   ├── dto/
│       │   │   └── knowledge.dto.ts
│       │   ├── knowledge.service.ts
│       │   ├── knowledge.controller.ts
│       │   └── knowledge.module.ts
│       └── rag/
│           ├── entities/
│           │   └── code-chunk.entity.ts
│           ├── dto/
│           │   └── rag.dto.ts
│           ├── services/
│           │   ├── embedding.service.ts
│           │   ├── indexer.service.ts
│           │   └── rag.service.ts
│           ├── rag.controller.ts
│           └── rag.module.ts

mcp/klion-server/src/
├── api.ts      # Añadido: projectsApi.getContext, knowledgeApi, ragApi
└── index.ts    # Añadido: 15+ nuevas herramientas MCP
```

---

*Documentación generada: 25 Enero 2026*
