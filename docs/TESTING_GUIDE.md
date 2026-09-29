# 🧪 Guía de Pruebas - Klion v2.0

> Guía completa para probar todas las funcionalidades de Klion en localhost con datos reales

---

## 📋 Requisitos Previos

Antes de empezar las pruebas, asegúrate de que:

1. ✅ Tienes el archivo `.env` configurado en la raíz del proyecto
2. ✅ PostgreSQL está corriendo (con pgvector habilitado)
3. ✅ Backend está corriendo en `http://localhost:3001`
4. ✅ Frontend está corriendo en `http://localhost:3500`

```bash
# Verificar servicios
curl http://localhost:3001/api/health        # Backend
curl http://localhost:3500                    # Frontend
docker ps | grep klion-db                     # PostgreSQL (si usas Docker)
```

---

## 🔐 1. Autenticación

### Login con Usuario por Defecto

```bash
# Variables para reutilizar
export API_URL="http://localhost:3001/api"

# Login
curl -X POST $API_URL/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "demo@klion.local",
    "password": "$MASTER_USER_PASSWORD"
  }' | jq

# Guardar el token
export TOKEN="tu-access-token-aqui"
```

**Respuesta esperada:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid-del-usuario",
    "email": "demo@klion.local",
    "name": "Demo User",
    "role": "admin"
  }
}
```

### Crear Nuevo Usuario

```bash
curl -X POST $API_URL/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@klion.com",
    "password": "Test123!",
    "name": "Usuario de Prueba"
  }' | jq
```

### Verificar Perfil

```bash
curl -X GET $API_URL/auth/me \
  -H "Authorization: Bearer $TOKEN" | jq
```

---

## 👥 2. Gestión de Clientes

### Listar Clientes

```bash
curl -X GET $API_URL/clients \
  -H "Authorization: Bearer $TOKEN" | jq
```

### Crear Cliente de Prueba

```bash
# Cliente 1: Empresa de Desarrollo
CLIENT_RESPONSE=$(curl -X POST $API_URL/clients \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "TechCorp Solutions",
    "company": "TechCorp Inc.",
    "email": "contact@techcorp.com",
    "whatsapp": "+1234567890",
    "notes": "Cliente prioritario - Desarrollo web y móvil"
  }')

echo $CLIENT_RESPONSE | jq

# Guardar el ID del cliente
export CLIENT_ID=$(echo $CLIENT_RESPONSE | jq -r '.id')
echo "CLIENT_ID: $CLIENT_ID"
```

```bash
# Cliente 2: Freelance
curl -X POST $API_URL/clients \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "María González",
    "email": "maria@example.com",
    "whatsapp": "+9876543210",
    "notes": "Diseñadora gráfica freelance"
  }' | jq
```

### Obtener Cliente por ID

```bash
curl -X GET "$API_URL/clients/$CLIENT_ID" \
  -H "Authorization: Bearer $TOKEN" | jq
```

### Actualizar Cliente

```bash
curl -X PATCH "$API_URL/clients/$CLIENT_ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "notes": "Cliente VIP - Respuesta prioritaria en 24h"
  }' | jq
```

---

## 📁 3. Proyectos (Épicos)

### Crear Proyecto

```bash
PROJECT_RESPONSE=$(curl -X POST $API_URL/projects \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"clientId\": \"$CLIENT_ID\",
    \"name\": \"Rediseño de Sitio Web\",
    \"description\": \"Modernizar el sitio web corporativo con Next.js y TailwindCSS\",
    \"color\": \"#3b82f6\",
    \"status\": \"active\"
  }")

echo $PROJECT_RESPONSE | jq

# Guardar el ID del proyecto
export PROJECT_ID=$(echo $PROJECT_RESPONSE | jq -r '.id')
echo "PROJECT_ID: $PROJECT_ID"
```

### Listar Proyectos del Cliente

```bash
curl -X GET "$API_URL/projects?clientId=$CLIENT_ID" \
  -H "Authorization: Bearer $TOKEN" | jq
```

### Actualizar Estado del Proyecto

```bash
curl -X PATCH "$API_URL/projects/$PROJECT_ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "status": "completed"
  }' | jq
```

---

## ✅ 4. Tareas

### Crear Tareas de Prueba

```bash
# Tarea 1: Todo
TASK1_RESPONSE=$(curl -X POST $API_URL/tasks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"clientId\": \"$CLIENT_ID\",
    \"projectId\": \"$PROJECT_ID\",
    \"title\": \"Diseñar mockups de la página principal\",
    \"description\": \"Crear diseños en Figma para desktop, tablet y móvil\",
    \"status\": \"todo\",
    \"priority\": \"high\",
    \"tags\": [\"diseño\", \"ui\", \"figma\"],
    \"dueDate\": \"2025-02-15\"
  }")

export TASK1_ID=$(echo $TASK1_RESPONSE | jq -r '.id')
echo "TASK1_ID: $TASK1_ID"

# Tarea 2: Doing
curl -X POST $API_URL/tasks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"clientId\": \"$CLIENT_ID\",
    \"projectId\": \"$PROJECT_ID\",
    \"title\": \"Implementar componentes de UI base\",
    \"description\": \"Button, Card, Input, Modal con Tailwind\",
    \"status\": \"doing\",
    \"priority\": \"urgent\",
    \"tags\": [\"frontend\", \"react\", \"tailwind\"]
  }" | jq

# Tarea 3: Blocked
curl -X POST $API_URL/tasks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"clientId\": \"$CLIENT_ID\",
    \"title\": \"Configurar servidor de producción\",
    \"description\": \"Esperando acceso al VPS\",
    \"status\": \"blocked\",
    \"priority\": \"medium\",
    \"tags\": [\"devops\", \"deployment\"]
  }" | jq

# Tarea 4: Done
curl -X POST $API_URL/tasks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"clientId\": \"$CLIENT_ID\",
    \"projectId\": \"$PROJECT_ID\",
    \"title\": \"Configurar repositorio en GitHub\",
    \"status\": \"done\",
    \"priority\": \"low\",
    \"tags\": [\"git\", \"setup\"]
  }" | jq
```

### Listar Tareas

```bash
# Todas las tareas
curl -X GET $API_URL/tasks \
  -H "Authorization: Bearer $TOKEN" | jq

# Por cliente
curl -X GET "$API_URL/tasks?clientId=$CLIENT_ID" \
  -H "Authorization: Bearer $TOKEN" | jq

# Por estado
curl -X GET "$API_URL/tasks?status=doing" \
  -H "Authorization: Bearer $TOKEN" | jq

# Por prioridad
curl -X GET "$API_URL/tasks?priority=high" \
  -H "Authorization: Bearer $TOKEN" | jq
```

### Ver Board Kanban

```bash
curl -X GET $API_URL/tasks/board \
  -H "Authorization: Bearer $TOKEN" | jq
```

**Respuesta esperada:**
```json
{
  "todo": [...],
  "doing": [...],
  "blocked": [...],
  "done": [...]
}
```

### Mover Tarea (Drag & Drop)

```bash
# Mover de todo → doing
curl -X PATCH "$API_URL/tasks/$TASK1_ID/move" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "status": "doing",
    "position": 0
  }' | jq
```

### Actualizar Tarea

```bash
curl -X PATCH "$API_URL/tasks/$TASK1_ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "priority": "urgent",
    "tags": ["diseño", "ui", "figma", "urgente"]
  }' | jq
```

---

## 🔲 5. Subtareas

### Crear Subtareas

```bash
# Subtarea 1
SUBTASK1_RESPONSE=$(curl -X POST "$API_URL/tasks/$TASK1_ID/subtasks" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title": "Investigar referencias de diseño",
    "order": 0
  }')

export SUBTASK1_ID=$(echo $SUBTASK1_RESPONSE | jq -r '.id')

# Subtarea 2
curl -X POST "$API_URL/tasks/$TASK1_ID/subtasks" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title": "Crear wireframes",
    "order": 1
  }' | jq

# Subtarea 3
curl -X POST "$API_URL/tasks/$TASK1_ID/subtasks" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title": "Diseñar en alta fidelidad",
    "order": 2
  }' | jq
```

### Listar Subtareas

```bash
curl -X GET "$API_URL/tasks/$TASK1_ID/subtasks" \
  -H "Authorization: Bearer $TOKEN" | jq
```

### Completar Subtarea

```bash
curl -X PATCH "$API_URL/tasks/$TASK1_ID/subtasks/$SUBTASK1_ID/toggle" \
  -H "Authorization: Bearer $TOKEN" | jq
```

### Reordenar Subtareas

```bash
curl -X PATCH "$API_URL/tasks/$TASK1_ID/subtasks/reorder" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "subtaskIds": ["subtask3-id", "subtask1-id", "subtask2-id"]
  }' | jq
```

---

## ⏱️ 6. Worklogs (Registro de Tiempo)

### Crear Worklog

```bash
curl -X POST $API_URL/worklogs \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"clientId\": \"$CLIENT_ID\",
    \"taskId\": \"$TASK1_ID\",
    \"durationMinutes\": 120,
    \"note\": \"Diseño de mockups - 2 horas\",
    \"loggedAt\": \"2025-01-13T10:00:00Z\"
  }" | jq

# Otro worklog sin tarea específica
curl -X POST $API_URL/worklogs \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"clientId\": \"$CLIENT_ID\",
    \"durationMinutes\": 30,
    \"note\": \"Reunión de seguimiento\",
    \"loggedAt\": \"2025-01-13T14:00:00Z\"
  }" | jq
```

### Listar Worklogs

```bash
# Por cliente
curl -X GET "$API_URL/worklogs?clientId=$CLIENT_ID" \
  -H "Authorization: Bearer $TOKEN" | jq

# Por tarea
curl -X GET "$API_URL/worklogs?taskId=$TASK1_ID" \
  -H "Authorization: Bearer $TOKEN" | jq
```

---

## 📎 7. Archivos y Links

### Añadir Link

```bash
curl -X POST $API_URL/files \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"clientId\": \"$CLIENT_ID\",
    \"taskId\": \"$TASK1_ID\",
    \"type\": \"link\",
    \"url\": \"https://www.figma.com/file/ejemplo\",
    \"title\": \"Mockups en Figma\",
    \"description\": \"Diseños aprobados por el cliente\"
  }" | jq
```

### Añadir Archivo

```bash
curl -X POST $API_URL/files \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"clientId\": \"$CLIENT_ID\",
    \"type\": \"file\",
    \"url\": \"https://storage.example.com/contrato.pdf\",
    \"title\": \"Contrato firmado\",
    \"description\": \"Contrato de servicios 2025\"
  }" | jq
```

### Listar Archivos

```bash
# Por cliente
curl -X GET "$API_URL/files?clientId=$CLIENT_ID" \
  -H "Authorization: Bearer $TOKEN" | jq

# Por tarea
curl -X GET "$API_URL/files?taskId=$TASK1_ID" \
  -H "Authorization: Bearer $TOKEN" | jq
```

---

## 📸 8. Snapshots

### Crear Snapshot Manual

```bash
curl -X POST $API_URL/snapshots \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Estado inicial del proyecto TechCorp"
  }' | jq
```

### Listar Snapshots

```bash
curl -X GET $API_URL/snapshots \
  -H "Authorization: Bearer $TOKEN" | jq
```

### Ver Último Snapshot

```bash
curl -X GET $API_URL/snapshots/latest \
  -H "Authorization: Bearer $TOKEN" | jq
```

### Ver Snapshot de Hoy

```bash
curl -X GET $API_URL/snapshots/today \
  -H "Authorization: Bearer $TOKEN" | jq
```

---

## 🤖 9. Funcionalidades de IA

### Resumen de Cliente

```bash
curl -X POST $API_URL/ai/client-summary \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"clientId\": \"$CLIENT_ID\"
  }" | jq
```

**Respuesta esperada:**
```json
{
  "summary": "TechCorp Solutions es un cliente prioritario...",
  "stats": {
    "totalTasks": 4,
    "activeTasks": 2,
    "totalWorklogs": 2,
    "totalHours": 2.5
  }
}
```

### Plan del Día

```bash
curl -X POST $API_URL/ai/today-plan \
  -H "Authorization: Bearer $TOKEN" | jq
```

### Redactar Mensaje

```bash
curl -X POST $API_URL/ai/write-message \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"clientId\": \"$CLIENT_ID\",
    \"context\": \"Avisar que los mockups están listos para revisión\",
    \"tone\": \"professional\"
  }" | jq
```

---

## 🎯 10. Contexto de Proyecto (v2.0)

### Configurar Contexto del Proyecto

```bash
curl -X PATCH "$API_URL/projects/$PROJECT_ID/context" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "stack": "Next.js 14, TailwindCSS, TypeScript, PostgreSQL",
    "rules": [
      "Usar componentes de UI reutilizables",
      "Seguir convenciones de nombres semánticas",
      "Documentar funciones complejas",
      "Dark mode por defecto"
    ],
    "aiDescription": "Aplicación web moderna tipo SaaS para gestión de proyectos",
    "repositoryUrl": "https://github.com/hector53/klion",
    "localPath": "/path/to/klion",
    "ragEnabled": true
  }' | jq
```

### Obtener Contexto Completo

```bash
curl -X GET "$API_URL/projects/$PROJECT_ID/context" \
  -H "Authorization: Bearer $TOKEN" | jq
```

**Respuesta esperada:**
```json
{
  "project": {
    "id": "...",
    "name": "Rediseño de Sitio Web",
    "client": {...}
  },
  "context": {
    "stack": "Next.js 14, TailwindCSS...",
    "rules": [...],
    "ragEnabled": true,
    "indexedChunks": 0
  },
  "currentState": {
    "totalTasks": 4,
    "tasksByStatus": {...},
    "activeTasks": [...],
    "blockedTasks": [...]
  },
  "relatedKnowledge": [...]
}
```

---

## 📚 11. Knowledge Base

### Crear Entrada de Conocimiento

```bash
# Snippet de código
curl -X POST $API_URL/knowledge \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"projectId\": \"$PROJECT_ID\",
    \"clientId\": \"$CLIENT_ID\",
    \"title\": \"Componente Button Reutilizable\",
    \"content\": \"export const Button = ({ children, variant = 'primary' }) => { return <button className={cn(buttonVariants[variant])}>{children}</button>; };\",
    \"type\": \"snippet\",
    \"language\": \"typescript\",
    \"tags\": [\"react\", \"ui\", \"component\"]
  }" | jq

# Decisión arquitectónica
curl -X POST $API_URL/knowledge \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"projectId\": \"$PROJECT_ID\",
    \"title\": \"Uso de TanStack Query para Estado del Servidor\",
    \"content\": \"Decidimos usar TanStack Query (React Query) para manejar el estado del servidor porque ofrece caching automático, invalidación inteligente y mejor UX con optimistic updates.\",
    \"type\": \"decision\",
    \"tags\": [\"arquitectura\", \"estado\", \"react-query\"]
  }" | jq
```

### Buscar Conocimiento

```bash
# Búsqueda semántica
curl -X POST $API_URL/knowledge/search \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "query": "componente de botón reutilizable",
    "limit": 5
  }' | jq

# Filtrar por tipo
curl -X GET "$API_URL/knowledge?type=snippet" \
  -H "Authorization: Bearer $TOKEN" | jq

# Filtrar por proyecto
curl -X GET "$API_URL/knowledge?projectId=$PROJECT_ID" \
  -H "Authorization: Bearer $TOKEN" | jq
```

---

## 🔍 12. RAG (Búsqueda en Código)

### Indexar Proyecto

```bash
curl -X POST $API_URL/rag/index \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"projectId\": \"$PROJECT_ID\",
    \"repoPath\": \"/path/to/klion\",
    \"forceReindex\": false
  }" | jq
```

**Nota:** Este proceso puede tomar varios minutos dependiendo del tamaño del proyecto.

### Ver Estado de Indexación

```bash
curl -X GET "$API_URL/rag/status?projectId=$PROJECT_ID" \
  -H "Authorization: Bearer $TOKEN" | jq
```

### Buscar en Código (Semántico)

```bash
curl -X POST $API_URL/rag/search \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"query\": \"autenticación con JWT\",
    \"projectId\": \"$PROJECT_ID\",
    \"limit\": 5,
    \"useSemanticSearch\": true
  }" | jq
```

### Buscar en Código (Texto)

```bash
curl -X POST $API_URL/rag/search \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"query\": \"JwtService\",
    \"projectId\": \"$PROJECT_ID\",
    \"fileType\": \"ts\",
    \"useSemanticSearch\": false
  }" | jq
```

---

## 💬 13. Chat IA con Gemini

### Enviar Mensaje al Chat

```bash
curl -X POST $API_URL/ai/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"message\": \"¿Cómo funciona el sistema de autenticación en este proyecto?\",
    \"projectId\": \"$PROJECT_ID\",
    \"includeContext\": true
  }" | jq
```

**Respuesta esperada:**
```json
{
  "response": "El sistema de autenticación utiliza JWT (JSON Web Tokens)...",
  "sources": [
    {
      "filePath": "backend/src/modules/auth/auth.service.ts",
      "content": "..."
    }
  ]
}
```

### Chat sin Contexto

```bash
curl -X POST $API_URL/ai/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "message": "¿Cuáles son las mejores prácticas para dark mode en React?",
    "includeContext": false
  }' | jq
```

---

## 🔄 14. Git Integration

### Ver Estado del Repositorio

```bash
curl -X GET "$API_URL/git/status?projectId=$PROJECT_ID" \
  -H "Authorization: Bearer $TOKEN" | jq
```

### Ver Branches

```bash
curl -X GET "$API_URL/git/branches?projectId=$PROJECT_ID" \
  -H "Authorization: Bearer $TOKEN" | jq
```

### Ver Diff

```bash
# Unstaged changes
curl -X GET "$API_URL/git/diff?projectId=$PROJECT_ID&staged=false" \
  -H "Authorization: Bearer $TOKEN" | jq

# Staged changes
curl -X GET "$API_URL/git/diff?projectId=$PROJECT_ID&staged=true" \
  -H "Authorization: Bearer $TOKEN" | jq
```

### Generar Mensaje de Commit

```bash
curl -X POST $API_URL/git/commit-message \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"projectId\": \"$PROJECT_ID\",
    \"taskId\": \"$TASK1_ID\",
    \"changes\": \"Implementados componentes de UI base con TailwindCSS\"
  }" | jq
```

### Crear Commit

```bash
curl -X POST $API_URL/git/commit \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"projectId\": \"$PROJECT_ID\",
    \"message\": \"feat: add base UI components with TailwindCSS\",
    \"files\": [\"frontend/src/components/ui/Button.tsx\"],
    \"push\": false
  }" | jq
```

---

## 🗣️ 15. Parser de Conversaciones

### Parsear Conversación de Slack/WhatsApp

```bash
curl -X POST $API_URL/ai/parse-conversation \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"conversation\": \"Hola! Necesitamos implementar el login con Google. También hay que arreglar el bug del formulario. Ah, y no olvides actualizar la documentación del API.\",
    \"projectId\": \"$PROJECT_ID\",
    \"clientId\": \"$CLIENT_ID\",
    \"context\": \"Reunión de planificación semanal\"
  }" | jq
```

**Respuesta esperada:**
```json
{
  "tasks": [
    {
      "title": "Implementar login con Google",
      "priority": "high",
      "tags": ["auth", "oauth"]
    },
    {
      "title": "Arreglar bug del formulario",
      "priority": "high",
      "tags": ["bug", "frontend"]
    },
    {
      "title": "Actualizar documentación del API",
      "priority": "medium",
      "tags": ["docs"]
    }
  ],
  "decisions": [],
  "questions": []
}
```

### Crear Tareas desde Conversación

```bash
# Primero parsea la conversación (guarda el resultado)
PARSED=$(curl -s -X POST $API_URL/ai/parse-conversation \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"conversation\": \"Urgente: Implementar reset de password. También revisar la performance del dashboard.\",
    \"projectId\": \"$PROJECT_ID\",
    \"clientId\": \"$CLIENT_ID\"
  }")

# Luego crea las tareas
curl -X POST $API_URL/ai/create-tasks-from-conversation \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"clientId\": \"$CLIENT_ID\",
    \"projectId\": \"$PROJECT_ID\",
    \"tasks\": $(echo $PARSED | jq '.tasks')
  }" | jq
```

---

## 📊 16. Generar Changelog

### Generar Changelog Automático

```bash
curl -X POST $API_URL/git/changelog \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"projectId\": \"$PROJECT_ID\",
    \"version\": \"1.3.0\",
    \"from\": \"v1.2.0\",
    \"to\": \"HEAD\"
  }" | jq
```

---

## 🌐 17. Pruebas desde el Frontend

### Acceder a la Aplicación

```bash
open http://localhost:3500
```

### Flujo Completo de Usuario

1. **Login**
   - Email: `demo@klion.local`
   - Password: the value configured in `MASTER_USER_PASSWORD`

2. **Ver Board Kanban**
   - Deberías ver las tareas organizadas en columnas (Todo, Doing, Blocked, Done)

3. **Crear Nueva Tarea**
   - Click en "New Task"
   - Selecciona cliente: TechCorp Solutions
   - Título: "Configurar CI/CD Pipeline"
   - Priority: High
   - Tags: devops, github-actions

4. **Drag & Drop**
   - Arrastra una tarea de Todo → Doing
   - Verifica que se actualiza en tiempo real

5. **Añadir Subtareas**
   - Click en una tarea
   - Añade subtareas en el modal
   - Marca algunas como completadas

6. **Chat IA**
   - Click en el icono de chat (esquina inferior derecha)
   - Pregunta: "¿Qué tareas tengo pendientes para TechCorp?"

7. **Snapshots**
   - Ve a la sección de Snapshots
   - Crea un snapshot manual
   - Compara con snapshots anteriores

---

## 📝 Checklist de Funcionalidades

Usa esta lista para verificar que todo funciona:

### Autenticación
- [ ] Login con credenciales correctas
- [ ] Login con credenciales incorrectas (debe fallar)
- [ ] Registro de nuevo usuario
- [ ] Obtener perfil del usuario

### Clientes
- [ ] Crear cliente
- [ ] Listar clientes
- [ ] Obtener cliente por ID
- [ ] Actualizar cliente
- [ ] Soft delete cliente

### Proyectos
- [ ] Crear proyecto
- [ ] Listar proyectos
- [ ] Actualizar proyecto
- [ ] Cambiar estado del proyecto

### Tareas
- [ ] Crear tarea
- [ ] Listar tareas
- [ ] Ver board Kanban
- [ ] Actualizar tarea
- [ ] Mover tarea (drag & drop)
- [ ] Eliminar tarea

### Subtareas
- [ ] Crear subtarea
- [ ] Listar subtareas
- [ ] Toggle completado
- [ ] Reordenar subtareas
- [ ] Eliminar subtarea

### Worklogs
- [ ] Crear worklog
- [ ] Listar por cliente
- [ ] Listar por tarea
- [ ] Actualizar worklog

### Archivos
- [ ] Añadir link
- [ ]
