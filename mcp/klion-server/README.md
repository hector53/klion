# Klion MCP Server & CLI v2.0

MCP Server y CLI completo para gestionar Klion desde agentes de IA (Copilot, Claude, Cursor, Zed, Antigravity) o desde la terminal.

Incluye todas las funcionalidades de Klion v2.0: Tareas, Proyectos, Knowledge Base, RAG, Git Integration, Chat IA y más.

## 🚀 Instalación

```bash
cd mcp/klion-server
npm install
npm run build
```

### Instalación global (opcional)

```bash
npm install -g .
# Ahora puedes usar `klion` desde cualquier terminal
```

## 🔐 Autenticación

Antes de usar el CLI o MCP, debes autenticarte:

```bash
# Interactivo
klion login

# O con parámetros
klion login -e tu@email.com -p tupassword
```

El token se guarda en `~/.config/klion/config.json` y se reutiliza automáticamente.

```bash
# Ver usuario actual
klion whoami

# Cerrar sesión
klion logout
```

## 💻 Uso del CLI

### 📋 Tareas

```bash
# Crear tarea (mínimo)
klion task create -c <clientId> -t "Título de la tarea"

# Crear tarea completa
klion task create \
  -c <clientId> \
  -t "Implementar login" \
  -d "Descripción detallada" \
  -s doing \
  --priority high \
  --due 2026-01-20 \
  --tags "feature,auth"

# Listar tareas
klion task list
klion task list -s doing           # Filtrar por status
klion task list -c <clientId>      # Filtrar por cliente
klion task list --json             # Output JSON

# Mover tarea
klion task move <taskId> done

# Eliminar tarea
klion task delete <taskId>
klion task delete <taskId> -f      # Sin confirmación
```

### 🎯 Board Kanban

```bash
# Ver resumen del board
klion board
klion board --json
```

### 👥 Clientes

```bash
# Listar clientes (para obtener IDs)
klion client list
klion client list --json
```

> `client get`, `project get` y `project context` no están implementados en el CLI todavía — solo existen como tools MCP (`get_client`, `get_project`, `get_context`).

### 📁 Proyectos

```bash
# Listar proyectos
klion project list
klion project list -c <clientId>   # Filtrar por cliente
```

### 📚 Knowledge Base

> ⚠️ No implementado en el CLI actual (`cli.ts`). Estas operaciones existen únicamente como tools MCP (`create_knowledge`, `search_knowledge`, `get_knowledge`, `list_knowledge`, `update_knowledge`, `delete_knowledge`) — los comandos de abajo no funcionan hoy desde terminal, quedan como referencia de la intención original.

```bash
# Crear entrada de conocimiento
klion knowledge create \
  --title "Componente Button" \
  --content "export const Button = ..." \
  --type snippet \
  --language typescript \
  --tags "react,ui,component"

# Buscar en knowledge base (búsqueda semántica)
klion knowledge search "cómo hacer autenticación JWT"

# Listar conocimiento
klion knowledge list
klion knowledge list --type snippet
klion knowledge list --project <projectId>

# Ver entrada específica
klion knowledge get <knowledgeId>

# Actualizar
klion knowledge update <knowledgeId> --title "Nuevo título"

# Eliminar
klion knowledge delete <knowledgeId>
```

### 🔍 RAG (Búsqueda en Código)

El sistema RAG de Klion utiliza **indexación híbrida**: el MCP/CLI escanea y procesa los archivos localmente, luego envía los chunks al backend para generar embeddings y almacenar.

**Esto permite indexar proyectos locales incluso cuando el backend está en producción.**

> Nota: configura el API URL del CLI si tu backend no está en localhost.
> - `klion config --api-url https://your-klion-domain.example/api`
> - o exporta `KLION_API_URL` / `NEXT_PUBLIC_API_URL` antes de usar el CLI

```bash
# Indexar un proyecto local (híbrido: escaneo local + almacenamiento remoto)
klion rag index \
  --project <projectId> \
  --path "/ruta/al/repositorio" \
  --force  # Reindexar todo (opcional)

# Ver estado de indexación
klion rag status <projectId>

# Buscar en el código indexado
klion rag search \
  --project <projectId> \
  --query "función de autenticación JWT" \
  --limit 5

# Eliminar índice
klion rag delete-index <projectId>
```

#### Arquitectura de Indexación Híbrida

```
┌─────────────────────────────────────────────────────────────┐
│                    MÁQUINA DEL USUARIO                       │
│  ┌──────────────┐    ┌──────────────────────────────────┐   │
│  │  Proyecto    │───►│  MCP Server / CLI                │   │
│  │  Local       │    │  - Escanea archivos              │   │
│  │  /mi/codigo  │    │  - Divide en chunks (~300 líneas)│   │
│  └──────────────┘    │  - Detecta features del código   │   │
│                      └──────────────┬───────────────────┘   │
└─────────────────────────────────────│───────────────────────┘
                                      │ POST /api/rag/chunks
                                      ▼
┌─────────────────────────────────────────────────────────────┐
│                    SERVIDOR DE PRODUCCIÓN                    │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Backend NestJS                                       │   │
│  │  - Recibe chunks                                      │   │
│  │  - Genera embeddings (Gemini API)                     │   │
│  │  - Almacena en PostgreSQL + pgvector                  │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

#### Configuración para Producción

1. **Backend**: Requiere `GEMINI_API_KEY` en variables de entorno para generar embeddings
2. **PostgreSQL**: Requiere la extensión `pgvector` (imagen `pgvector/pgvector:pg15`)
3. **MCP/CLI**: Configurar URL de producción con `klion config --api-url https://tu-servidor.com/api`

#### Tipos de archivos indexados

TypeScript, JavaScript, Python, Go, Rust, Java, Kotlin, C/C++, C#, Ruby, PHP, Swift, SQL, Shell, JSON, YAML, Markdown, Vue, Svelte, GraphQL, y más.

#### Patrones excluidos automáticamente

`node_modules`, `.git`, `dist`, `build`, `.next`, `__pycache__`, `venv`, `vendor`, `coverage`, archivos minificados, lock files, etc.

### 🔄 Git Integration

> ⚠️ No implementado en el CLI actual (`cli.ts`). Estas operaciones existen únicamente como tools MCP (`git_status`, `git_branches`, `git_diff`, `generate_commit_message`, `git_commit`, `generate_changelog`, `update_changelog`, `generate_documentation`, `save_documentation`) — los comandos de abajo no funcionan hoy desde terminal, quedan como referencia de la intención original.

```bash
# Ver estado del repositorio
klion git status <projectId>

# Ver branches
klion git branches <projectId>

# Ver diff
klion git diff <projectId>
klion git diff <projectId> --staged

# Generar mensaje de commit con IA
klion git commit-message \
  --project <projectId> \
  --changes "Agregado sistema de autenticación" \
  --type feat

# Crear commit
klion git commit \
  --project <projectId> \
  --message "feat: add authentication system" \
  --push  # Push automático después del commit

# Generar changelog
klion git changelog \
  --project <projectId> \
  --version "1.2.0" \
  --from "v1.1.0" \
  --to "HEAD"

# Actualizar CHANGELOG.md
klion git update-changelog \
  --project <projectId> \
  --content "$(cat nuevo-changelog.md)"

# Generar documentación
klion git docs \
  --project <projectId> \
  --type readme  # readme, api, setup, contributing

# Guardar documentación generada
klion git save-docs \
  --project <projectId> \
  --file "README.md" \
  --content "$(cat contenido.md)" \
  --commit  # Crear commit automático
```

### 🗣️ Parser de Conversaciones

> ⚠️ No implementado en el CLI actual (`cli.ts`). Estas operaciones existen únicamente como tools MCP (`parse_conversation`, `create_tasks_from_conversation`) — los comandos de abajo no funcionan hoy desde terminal, quedan como referencia de la intención original.

```bash
# Parsear conversación de Slack, WhatsApp, emails, etc.
klion parse-conversation \
  --text "Necesitamos implementar login con Google y arreglar el bug del formulario" \
  --project <projectId> \
  --client <clientId>

# Crear tareas directamente desde una conversación
klion create-tasks-from-conversation \
  --client <clientId> \
  --project <projectId> \
  --tasks '[{"title":"Login con Google","priority":"high"}]'
```

### ⚙️ Configuración

```bash
# Ver configuración
klion config --show

# Cambiar URL del API (ej: producción)
klion config --api-url https://api.klion.app/api
```

## 🤖 Configuración MCP para Agentes IA

### VS Code / GitHub Copilot

Crea o edita `.vscode/mcp.json` en tu proyecto:

```json
{
  "servers": {
    "klion": {
      "command": "node",
      "args": ["/ruta/absoluta/a/mcp/klion-server/dist/index.js"]
    }
  }
}
```

O si lo instalaste globalmente:

```json
{
  "servers": {
    "klion": {
      "command": "klion-mcp"
    }
  }
}
```

### Cursor

Edita `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "klion": {
      "command": "node",
      "args": ["/ruta/absoluta/a/mcp/klion-server/dist/index.js"]
    }
  }
}
```

### Claude Desktop

Edita `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS):

```json
{
  "mcpServers": {
    "klion": {
      "command": "node",
      "args": ["/ruta/absoluta/a/mcp/klion-server/dist/index.js"]
    }
  }
}
```

### Zed

Edita `~/.config/zed/settings.json` y añade dentro de `"context_servers"`:

```json
{
  "context_servers": {
    "klion": {
      "command": "node",
      "args": ["/ruta/absoluta/a/mcp/klion-server/dist/index.js"]
    }
  }
}
```

O si lo instalaste globalmente:

```json
{
  "context_servers": {
    "klion": {
      "command": "klion-mcp",
      "args": []
    }
  }
}
```

### Antigravity

Abre la configuración de MCP en Antigravity y añade:

```json
{
  "mcpServers": {
    "klion": {
      "command": "node",
      "args": ["/ruta/absoluta/a/mcp/klion-server/dist/index.js"]
    }
  }
}
```

O si lo instalaste globalmente:

```json
{
  "mcpServers": {
    "klion": {
      "command": "klion-mcp"
    }
  }
}
```

## 🛠️ Herramientas MCP Disponibles

El servidor expone **36 herramientas** que los agentes IA pueden usar (última verificación contra `src/index.ts`):

### 📋 Tareas (Tasks)
| Herramienta | Descripción |
|-------------|-------------|
| `create_task` | Crear una nueva tarea |
| `update_task` | Actualizar tarea existente |
| `delete_task` | Eliminar tarea |
| `move_task` | Mover tarea a otro status |
| `list_tasks` | Listar tareas con filtros (cliente, proyecto, status, prioridad, rango de fechas de creación) y paginación real; por defecto trae hasta 100 resultados |
| `get_task` | Obtener detalles de una tarea |
| `get_board` | Ver el board Kanban completo |

### 🌐 Espacios (Spaces / Akela)
| Herramienta | Descripción |
|-------------|-------------|
| `list_spaces` | Listar espacios del usuario (Personal, Trabajo, etc.) |
| `get_space` | Detalles de un espacio, incluyendo sus clientes y proyectos |
| `create_space` | Crear un nuevo espacio |
| `update_space` | Actualizar nombre, tipo, ícono, color o archivar un espacio |
| `get_space_stats` | Estadísticas de un espacio (proyectos, clientes, tareas por status) |

> ⚠️ El comando CLI (`klion space ...`) todavía **no existe** para este grupo de herramientas, aunque backend, frontend y estas tools MCP ya soportan Spaces completamente. No asumas paridad 1:1 entre CLI y MCP.

### 👥 Clientes (Clients)
| Herramienta | Descripción |
|-------------|-------------|
| `list_clients` | Listar clientes |
| `get_client` | Detalles de un cliente |

### 📁 Proyectos (Projects)
| Herramienta | Descripción |
|-------------|-------------|
| `list_projects` | Listar proyectos |
| `get_project` | Detalles de un proyecto |
| `get_context` | Obtener contexto completo del proyecto (stack, reglas, tareas, etc.) |
| `update_context` | Actualizar configuración de contexto del proyecto |

### 📚 Knowledge Base
| Herramienta | Descripción |
|-------------|-------------|
| `create_knowledge` | Crear entrada de conocimiento (snippet, decision, pattern, etc.) |
| `search_knowledge` | Búsqueda semántica en knowledge base |
| `get_knowledge` | Obtener entrada específica por ID |
| `list_knowledge` | Listar conocimiento con filtros |
| `update_knowledge` | Actualizar entrada existente |
| `delete_knowledge` | Eliminar entrada |

### 🔍 RAG (Retrieval Augmented Generation)

Ya no se expone como tools MCP (`index_project`, `search_code`, `get_index_status`, `delete_index` fueron removidas por bajo uso real vía agentes IA). El CLI (`klion rag index/status/search/delete-index`) sigue funcionando igual — es código independiente, no depende de estas tools.

### 🔄 Git Integration
| Herramienta | Descripción |
|-------------|-------------|
| `git_status` | Ver estado del repositorio |
| `git_branches` | Listar branches |
| `git_diff` | Ver diff (staged/unstaged) |
| `git_commit` | Crear commit (con opción de push) |
| `generate_commit_message` | Generar mensaje de commit con IA |
| `generate_changelog` | Generar changelog desde commits |
| `update_changelog` | Actualizar archivo CHANGELOG.md |
| `generate_documentation` | Generar documentación (README, API, etc.) |
| `save_documentation` | Guardar documentación en archivo |

### 🗣️ Parser de Conversaciones
| Herramienta | Descripción |
|-------------|-------------|
| `parse_conversation` | Extraer tareas, decisiones y preguntas de conversaciones |
| `create_tasks_from_conversation` | Crear tareas directamente desde conversación parseada |

### 🔐 Autenticación
| Herramienta | Descripción |
|-------------|-------------|
| `check_auth` | Verificar autenticación y obtener info del usuario |

## 📚 Recursos MCP

El servidor también expone recursos de contexto:

| URI | Descripción |
|-----|-------------|
| `klion://clients` | Lista de clientes activos |
| `klion://projects` | Lista de proyectos |
| `klion://board/summary` | Resumen del board Kanban |

## 🔄 Desarrollo

```bash
# Ejecutar en modo desarrollo
npm run dev

# Ejecutar CLI en desarrollo
npm run cli -- login
npm run cli -- task list

# Compilar
npm run build

# Tests (si están configurados)
npm test
```

## 📝 Ejemplos de uso con IA

Una vez configurado, puedes pedirle a tu agente IA cosas como:

### Gestión de Tareas
- "Crea una tarea para el cliente Acme Corp con título 'Revisar propuesta'"
- "Muéstrame las tareas bloqueadas"
- "¿Cuántas tareas hay en progreso?"
- "Mueve la tarea X a done"
- "Actualiza la prioridad de la tarea Y a urgent"

### Proyectos y Contexto
- "Dame el contexto completo del proyecto 'Client Board Klion'"
- "Lista los proyectos del cliente Acme"
- "Actualiza las reglas de desarrollo del proyecto X"
- "¿Cuál es el stack tecnológico del proyecto Y?"

### Knowledge Base
- "Guarda este snippet de código en knowledge base como 'Button Component'"
- "Busca en knowledge base cómo hacer autenticación JWT"
- "Lista todos los snippets de React"
- "Guarda esta decisión arquitectónica: usamos PostgreSQL para la base de datos"

### RAG (Búsqueda en Código)
- "Indexa el proyecto X en la ruta /Users/yo/proyectos/x"
- "Busca en el código del proyecto X la función de login"
- "¿Dónde está implementada la autenticación JWT en el proyecto?"
- "Muéstrame todos los endpoints de la API en el proyecto"

### Git
- "Muéstrame el estado del repositorio del proyecto X"
- "¿Qué branches existen en el proyecto Y?"
- "Genera un mensaje de commit para estos cambios"
- "Crea un commit con el mensaje 'feat: add user authentication'"
- "Genera el changelog desde v1.0.0 hasta HEAD"
- "Genera el README del proyecto"

### Parser de Conversaciones
- "Parsea esta conversación de Slack: [pegar conversación]"
- "Extrae las tareas de este email: [pegar email]"
- "Convierte esta reunión en tareas: [pegar notas]"

## 🎯 Flujo de Trabajo Típico con IA

```
Usuario: "Vamos a trabajar en el proyecto Client Board Klion"
IA: [Llama a get_context("Client Board Klion")]
    "Entendido. Este proyecto usa Next.js 14, NestJS, PostgreSQL...
     Tienes 3 tareas en doing, 2 bloqueadas..."

Usuario: "Busca en el código cómo se implementa la autenticación"
IA: [Llama a search_code(projectId, "autenticación JWT")]
    "La autenticación está implementada en:
     - backend/src/modules/auth/auth.service.ts (líneas 45-120)
     - frontend/src/app/api/auth/[...nextauth]/route.ts"

Usuario: "Guarda esta decisión: Usamos Gemini como proveedor de IA por defecto"
IA: [Llama a create_knowledge(title: "Proveedor de IA", type: "decision", ...)]
    "Guardado en knowledge base con ID abc-123"

Usuario: "Crea una tarea para implementar búsqueda global"
IA: [Llama a create_task(clientId, title: "Implementar búsqueda global")]
    "Tarea creada exitosamente en el board"

Usuario: "Genera un commit para estos cambios"
IA: [Llama a generate_commit_message()]
    "Sugerencia: feat: add global search with Cmd+K shortcut"
    [Llama a git_commit()]
    "Commit creado y pusheado al repositorio"
```

## 🔐 Seguridad

- El token de autenticación se almacena en `~/.config/klion/config.json`
- Las API keys (OpenAI, Gemini) se configuran en el backend, no en el CLI
- Nunca compartas tu `config.json` o lo subas a repositorios públicos
- En producción, usa HTTPS para todas las comunicaciones con el API

## 🐛 Troubleshooting

### Error: "Not authenticated"

```bash
klion login -e tu@email.com -p tupassword
klion whoami  # Verificar que estás autenticado
```

### Error: "Cannot connect to API"

```bash
# Verificar URL del API
klion config --show

# Cambiar si es necesario
klion config --api-url http://localhost:3001/api
```

### Error: "Command not found: klion"

```bash
# Reinstalar globalmente
cd mcp/klion-server
npm install -g .
```

### Error en MCP: "Tool execution failed"

1. Verifica que el backend esté corriendo
2. Verifica que estés autenticado (`klion whoami`)
3. Revisa los logs del agente IA
4. Prueba el comando equivalente en el CLI primero

## 📦 Dependencias

- `@modelcontextprotocol/sdk` - SDK para MCP
- `axios` - Cliente HTTP
- `commander` - CLI framework
- `conf` - Configuración persistente
- `chalk` - Colores en terminal
- `ora` - Spinners de carga
- `inquirer` - Prompts interactivos

## 🚀 Próximas Mejoras

- [ ] Caché de respuestas para mejor rendimiento
- [ ] Soporte para webhooks
- [ ] Exportación de datos
- [ ] Estadísticas de uso
- [ ] Modo offline con sincronización
- [ ] Plugins extensibles

## 📄 Licencia

MIT

## 🤝 Contribuciones

Las contribuciones son bienvenidas. Por favor:

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/amazing-feature`)
3. Commit tus cambios (`git commit -m 'feat: add amazing feature'`)
4. Push a la rama (`git push origin feature/amazing-feature`)
5. Abre un Pull Request

---

**Klion MCP Server v2.0** - Sistema completo de gestión de tareas con IA integrada

*Documentación actualizada: Enero 2025*
