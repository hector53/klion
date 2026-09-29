# 🚀 Configuración de Entorno Local - Klion

> Guía completa para configurar y ejecutar Klion en localhost con todos los servicios necesarios.

---

## 📋 Requisitos Previos

- **Node.js**: v18 o superior
- **PostgreSQL**: v15 con extensión pgvector (o usar Docker)
- **npm** o **yarn**
- **Git**

---

## 🔧 Configuración de Variables de Entorno

### Opción 1: Archivo `.env` Unificado en la Raíz (Recomendado)

Crea un archivo `.env` en la raíz del proyecto (`/klion/.env`) con el siguiente contenido:

```env
# =============================================================================
# 🗄️ DATABASE CONFIGURATION
# =============================================================================
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=postgres
DATABASE_NAME=clientboard

# =============================================================================
# 🔐 AUTHENTICATION & SECURITY
# =============================================================================
# JWT Secret para el backend (puedes generar uno con: openssl rand -base64 32)
JWT_SECRET=klion-super-secret-jwt-key-2024-secure

# NextAuth Secret para el frontend (puedes generar uno con: openssl rand -base64 32)
NEXTAUTH_SECRET=klion-nextauth-secret-2024-secure

# NextAuth URL (debe coincidir con el puerto del frontend)
NEXTAUTH_URL=http://localhost:3500

# =============================================================================
# 🤖 AI SERVICES
# =============================================================================
# OpenAI API Key (para resumen de cliente, plan del día, mensajes, git commit messages)
OPENAI_API_KEY=sk-proj-tu-api-key-aqui

# Gemini API Key (para chat IA con Gemini 2.0 Flash y embeddings RAG)
GEMINI_API_KEY=tu-gemini-api-key-aqui

# =============================================================================
# 🌐 API URLS
# =============================================================================
# Puerto del backend
PORT=3001

# URL del frontend para CORS (múltiples separados por coma)
FRONTEND_URL=http://localhost:3000,http://localhost:3500,http://localhost:3002

# URL pública de la API para el frontend (cliente/navegador)
NEXT_PUBLIC_API_URL=http://localhost:3001/api

# URL interna de la API para servidor-a-servidor (solo para Docker)
INTERNAL_API_URL=http://localhost:3001/api

# =============================================================================
# 🔧 ENVIRONMENT
# =============================================================================
NODE_ENV=development

# =============================================================================
# 📸 FEATURES
# =============================================================================
# Días de retención de snapshots (por defecto 90)
SNAPSHOT_RETENTION_DAYS=90

# Habilitar RAG por defecto en nuevos proyectos
DEFAULT_RAG_ENABLED=true
```

### Opción 2: Archivos `.env` Separados (Alternativa)

Si prefieres mantener archivos separados:

#### Backend: `backend/.env`

```env
# Database
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=postgres
DATABASE_NAME=clientboard

# Auth
JWT_SECRET=klion-super-secret-jwt-key-2024-secure

# AI
OPENAI_API_KEY=sk-proj-tu-api-key-aqui
GEMINI_API_KEY=tu-gemini-api-key-aqui

# Server
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000,http://localhost:3500,http://localhost:3002

# Features
SNAPSHOT_RETENTION_DAYS=90
```

#### Frontend: `frontend/.env.local`

```env
# API URLs
NEXT_PUBLIC_API_URL=http://localhost:3001/api
INTERNAL_API_URL=http://localhost:3001/api

# NextAuth
NEXTAUTH_SECRET=klion-nextauth-secret-2024-secure
NEXTAUTH_URL=http://localhost:3500
```

---

## 🐘 Configuración de PostgreSQL

### Opción A: Usar Docker (Más Fácil) ✅

```bash
# Levanta PostgreSQL con pgvector
docker-compose up postgres -d

# Verifica que esté corriendo
docker ps | grep klion-db

# Verifica logs
docker logs klion-db
```

### Opción B: PostgreSQL Local

Si tienes PostgreSQL instalado localmente, necesitas instalar la extensión `pgvector`:

#### macOS (Homebrew)
```bash
brew install pgvector
```

#### Ubuntu/Debian
```bash
sudo apt install postgresql-15-pgvector
```

#### Crear la base de datos
```bash
# Conéctate a PostgreSQL
psql -U postgres

# Crea la base de datos
CREATE DATABASE clientboard;

# Conéctate a la base de datos
\c clientboard

# Habilita la extensión pgvector
CREATE EXTENSION IF NOT EXISTS vector;

# Verifica
\dx
```

---

## 📦 Instalación de Dependencias

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install

# MCP Server (opcional)
cd ../mcp/klion-server
npm install
npm run build
```

---

## 🚀 Ejecutar en Localhost

### Método 1: Sin Docker (Desarrollo Normal)

Necesitas **3 terminales** abiertas:

#### Terminal 1: PostgreSQL (si usas Docker)
```bash
docker-compose up postgres
```

#### Terminal 2: Backend
```bash
cd backend
npm run start:dev
```

Deberías ver:
```
[Nest] INFO [DatabaseModule] pgvector extension enabled successfully
[Nest] INFO [NestApplication] Nest application successfully started
[Nest] INFO Application running on http://localhost:3001
[Nest] INFO Swagger docs available at http://localhost:3001/api/docs
```

#### Terminal 3: Frontend
```bash
cd frontend
npm run dev
```

Deberías ver:
```
  ▲ Next.js 14.x.x
  - Local:        http://localhost:3500
  - Network:      http://192.168.x.x:3500

 ✓ Ready in 2.3s
```

### Método 2: Con Docker Compose (Todo Junto)

```bash
# Levanta todos los servicios (postgres + api + web)
docker-compose up

# O en modo detached (segundo plano)
docker-compose up -d

# Ver logs
docker-compose logs -f

# Ver logs de un servicio específico
docker-compose logs -f api
docker-compose logs -f web
```

---

## 🔍 Verificación de Servicios

### 1. Backend API
```bash
# Health check
curl http://localhost:3001/api/health

# Swagger UI (documentación interactiva)
open http://localhost:3001/api/docs
```

### 2. Frontend
```bash
# Abrir en el navegador
open http://localhost:3500
```

### 3. PostgreSQL
```bash
# Con Docker
docker exec -it klion-db psql -U postgres -d clientboard -c "SELECT version();"

# Local
psql -U postgres -d clientboard -c "SELECT version();"

# Verificar pgvector
psql -U postgres -d clientboard -c "SELECT extname FROM pg_extension WHERE extname = 'vector';"
```

---

## 👤 Credenciales de Prueba

### Usuario por Defecto

Si la base de datos está vacía, el sistema creará automáticamente un usuario al iniciar:

- **Email**: `demo@klion.local` (or `MASTER_USER_EMAIL`)
- **Password**: the value configured in `MASTER_USER_PASSWORD`
- **Nombre**: Demo User (or `MASTER_USER_NAME`)

### Crear Usuario Manual (Opcional)

```bash
# Endpoint de registro
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "tu@email.com",
    "password": "tupassword123",
    "name": "Tu Nombre"
  }'
```

---

## 🧪 Probar la Configuración

### 1. Login
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "demo@klion.local",
    "password": "$MASTER_USER_PASSWORD"
  }'
```

Deberías recibir un `access_token`.

### 2. Crear Cliente
```bash
# Usa el token del paso anterior
export TOKEN="tu-token-aqui"

curl -X POST http://localhost:3001/api/clients \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Cliente de Prueba",
    "email": "cliente@example.com"
  }'
```

### 3. Crear Tarea
```bash
# Usa el clientId del paso anterior
curl -X POST http://localhost:3001/api/tasks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "clientId": "client-uuid-aqui",
    "title": "Mi primera tarea",
    "status": "todo",
    "priority": "high"
  }'
```

### 4. Ver el Board
```bash
curl -X GET http://localhost:3001/api/tasks/board \
  -H "Authorization: Bearer $TOKEN"
```

---

## 🎯 Probar Funcionalidades Avanzadas

### RAG (Indexar Proyecto)

```bash
# 1. Obtener el projectId de tu proyecto
curl -X GET http://localhost:3001/api/projects \
  -H "Authorization: Bearer $TOKEN"

# 2. Indexar el código (asegúrate de tener GEMINI_API_KEY configurado)
curl -X POST http://localhost:3001/api/rag/index \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "projectId": "tu-project-uuid",
    "repoPath": "/Users/tu-usuario/Mis Proyectos/clientboard",
    "forceReindex": false
  }'

# 3. Buscar en el código
curl -X POST http://localhost:3001/api/rag/search \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "query": "authentication JWT",
    "projectId": "tu-project-uuid",
    "limit": 5
  }'
```

### Chat IA con Gemini

```bash
# Asegúrate de tener GEMINI_API_KEY configurado
curl -X POST http://localhost:3001/api/ai/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "message": "¿Cómo funciona el sistema de autenticación?",
    "projectId": "tu-project-uuid"
  }'
```

### Git Integration

```bash
# Ver status
curl -X GET "http://localhost:3001/api/git/status?projectId=tu-project-uuid" \
  -H "Authorization: Bearer $TOKEN"

# Generar commit message automático
curl -X POST http://localhost:3001/api/git/commit-message \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "projectId": "tu-project-uuid",
    "changes": "Agregado sistema de chat IA"
  }'
```

---

## 🔧 Troubleshooting

### Error: "Cannot connect to database"

**Causa**: PostgreSQL no está corriendo o las credenciales son incorrectas.

**Solución**:
```bash
# Con Docker
docker-compose up postgres -d
docker logs klion-db

# Local
sudo service postgresql status
sudo service postgresql start
```

### Error: "pgvector extension not available"

**Causa**: La extensión pgvector no está instalada.

**Solución**:
```bash
# Con Docker - usa la imagen pgvector/pgvector:pg15
docker-compose down
docker-compose up postgres -d

# Local - instala pgvector (ver sección anterior)
```

### Error: "Port 3001 already in use"

**Causa**: Otro proceso está usando el puerto.

**Solución**:
```bash
# Encuentra el proceso
lsof -i :3001

# Mata el proceso
kill -9 <PID>

# O cambia el puerto en .env
PORT=3002
```

### Error: "OPENAI_API_KEY not configured"

**Causa**: No tienes una API key válida.

**Solución**:
1. Obtén una API key en https://platform.openai.com/api-keys
2. Agrégala a tu `.env`: `OPENAI_API_KEY=sk-proj-...`
3. Reinicia el backend

### Error: "GEMINI_API_KEY not configured"

**Causa**: No tienes una API key de Gemini.

**Solución**:
1. Obtén una API key en https://aistudio.google.com/app/apikey
2. Agrégala a tu `.env`: `GEMINI_API_KEY=...`
3. Reinicia el backend

### Frontend: Error de autenticación

**Causa**: NEXTAUTH_SECRET o NEXTAUTH_URL mal configurados.

**Solución**:
```bash
# Verifica que coincidan con el puerto del frontend
NEXTAUTH_URL=http://localhost:3500

# Genera un nuevo secret si es necesario
openssl rand -base64 32
```

---

## 📊 URLs de Acceso

| Servicio | URL | Descripción |
|----------|-----|-------------|
| **Frontend** | http://localhost:3500 | Aplicación web principal |
| **Backend API** | http://localhost:3001/api | API REST |
| **Swagger Docs** | http://localhost:3001/api/docs | Documentación interactiva de la API |
| **PostgreSQL** | localhost:5432 | Base de datos (requiere cliente) |

---

## 🎨 Flujo de Trabajo Típico

```bash
# 1. Inicia PostgreSQL (solo primera vez o si se detuvo)
docker-compose up postgres -d

# 2. Inicia el backend (Terminal 1)
cd backend && npm run start:dev

# 3. Inicia el frontend (Terminal 2)
cd frontend && npm run dev

# 4. Accede a la aplicación
open http://localhost:3500

# 5. Login con credenciales de prueba
# Email: demo@klion.local
# Password: the value configured in MASTER_USER_PASSWORD

# 6. Empieza a trabajar 🚀
```

---

## 📝 Scripts Útiles

### Backend
```bash
cd backend

# Desarrollo con hot-reload
npm run start:dev

# Producción
npm run build
npm run start:prod

# Linting
npm run lint

# Tests
npm run test
npm run test:watch
npm run test:cov
```

### Frontend
```bash
cd frontend

# Desarrollo
npm run dev

# Build para producción
npm run build

# Ejecutar producción
npm run start

# Linting
npm run lint
```

---

## 🔄 Sincronizar con `.env` de Producción

Si tienes un `.env` en producción y quieres usarlo como base:

```bash
# 1. Copia el .env de producción (asegúrate de cambiar valores sensibles)
cp /ruta/al/env/de/produccion .env

# 2. Modifica las URLs y puertos para localhost
sed -i '' 's/https:\/\/api.klion.com/http:\/\/localhost:3001/g' .env
sed -i '' 's/https:\/\/klion.com/http:\/\/localhost:3500/g' .env

# 3. Cambia el environment
sed -i '' 's/NODE_ENV=production/NODE_ENV=development/g' .env

# 4. Actualiza la configuración de la base de datos
sed -i '' 's/DATABASE_HOST=.*/DATABASE_HOST=localhost/g' .env
```

---

## 🐛 Logs y Debugging

### Ver todos los logs (con Docker)
```bash
docker-compose logs -f
```

### Ver logs específicos
```bash
# Backend
docker-compose logs -f api

# Frontend
docker-compose logs -f web

# PostgreSQL
docker-compose logs -f postgres
```

### Logs de desarrollo (sin Docker)
Los logs se muestran directamente en las terminales donde ejecutaste `npm run start:dev` y `npm run dev`.

---

## 🔐 Seguridad en Desarrollo

⚠️ **IMPORTANTE**: Las credenciales por defecto son solo para desarrollo local. **NUNCA** las uses en producción.

Para generar secretos seguros:

```bash
# JWT Secret
openssl rand -base64 32

# NextAuth Secret
openssl rand -base64 32
```

---

## 📚 Próximos Pasos

Una vez que tengas todo funcionando:

1. ✅ Explora la documentación de la API en http://localhost:3001/api/docs
2. ✅ Lee [CONTEXT.md](../CONTEXT.md) para entender la arquitectura
3. ✅ Revisa [FEATURES.md](./FEATURES.md) para ver todas las funcionalidades
4. ✅ Consulta [klion-v2-implementacion.md](./klion-v2-implementacion.md) para las nuevas características

---

## 🆘 ¿Necesitas Ayuda?

Si tienes problemas:

1. Revisa la sección de Troubleshooting arriba
2. Verifica los logs de cada servicio
3. Asegúrate de que todos los servicios estén corriendo
4. Verifica que los puertos no estén ocupados
5. Confirma que las variables de entorno estén correctamente configuradas

---

*Última actualización: Enero 2025*
