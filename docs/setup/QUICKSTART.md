# 🚀 Quickstart - Klion en 5 Minutos

> Guía ultrarrápida para tener Klion corriendo en localhost

---

## ⚡ Setup Automático (Recomendado)

```bash
# 1. Clona el repositorio (si no lo tienes)
git clone https://github.com/hector53/klion.git
cd klion

# 2. Ejecuta el script de setup
./setup-local.sh

# 3. Inicia los servicios
docker-compose up
```

¡Listo! Accede a http://localhost:3500

---

## 📝 Setup Manual

### 1. Crea el archivo `.env` en la raíz

```bash
cat > .env << 'EOF'
# Database
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=postgres
DATABASE_NAME=clientboard

# Auth (genera tus propios secretos con: openssl rand -base64 32)
JWT_SECRET=klion-super-secret-jwt-key-2024-secure
NEXTAUTH_SECRET=klion-nextauth-secret-2024-secure
NEXTAUTH_URL=http://localhost:3500

# AI (obtén tus keys en las plataformas respectivas)
OPENAI_API_KEY=sk-proj-tu-api-key-aqui
GEMINI_API_KEY=tu-gemini-api-key-aqui

# Server
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000,http://localhost:3500,http://localhost:3002
NEXT_PUBLIC_API_URL=http://localhost:3001/api
INTERNAL_API_URL=http://localhost:3001/api

# Features
SNAPSHOT_RETENTION_DAYS=90
DEFAULT_RAG_ENABLED=true
EOF
```

### 2. Copia la configuración al frontend

```bash
cat > frontend/.env.local << 'EOF'
NEXT_PUBLIC_API_URL=http://localhost:3001/api
INTERNAL_API_URL=http://localhost:3001/api
NEXTAUTH_SECRET=klion-nextauth-secret-2024-secure
NEXTAUTH_URL=http://localhost:3500
EOF
```

### 3. Instala dependencias

```bash
cd backend && npm install && cd ..
cd frontend && npm install && cd ..
```

### 4. Inicia PostgreSQL

```bash
# Con Docker (recomendado)
docker-compose up postgres -d

# O usa PostgreSQL local y crea la base de datos:
# psql -U postgres -c "CREATE DATABASE clientboard;"
# psql -U postgres -d clientboard -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

### 5. Inicia los servicios

```bash
# Opción A: Todo con Docker
docker-compose up

# Opción B: Sin Docker (3 terminales separadas)
# Terminal 1:
cd backend && npm run start:dev

# Terminal 2:
cd frontend && npm run dev

# Terminal 3 (PostgreSQL ya debe estar corriendo)
```

---

## 🎯 Acceso

| Servicio | URL |
|----------|-----|
| **Frontend** | http://localhost:3500 |
| **API** | http://localhost:3001/api |
| **Swagger** | http://localhost:3001/api/docs |

### 👤 Login

- **Email**: `demo@klion.local`
- **Password**: the value configured in `MASTER_USER_PASSWORD`

---

## 🔑 Obtener API Keys

### OpenAI (para AI features)
1. Ve a https://platform.openai.com/api-keys
2. Crea una nueva API key
3. Agrégala a `.env`: `OPENAI_API_KEY=sk-proj-...`

### Gemini (para Chat IA y RAG)
1. Ve a https://aistudio.google.com/app/apikey
2. Crea una nueva API key
3. Agrégala a `.env`: `GEMINI_API_KEY=...`

---

## 🧪 Verificar que Todo Funciona

```bash
# 1. Health check del backend
curl http://localhost:3001/api/health

# 2. Abrir Swagger
open http://localhost:3001/api/docs

# 3. Abrir frontend
open http://localhost:3500

# 4. Login desde la terminal
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@klion.local","password":"$MASTER_USER_PASSWORD"}'
```

---

## 🔧 Comandos Útiles

```bash
# Ver logs de todos los servicios
docker-compose logs -f

# Ver logs del backend
docker-compose logs -f api

# Ver logs del frontend
docker-compose logs -f web

# Reiniciar un servicio
docker-compose restart api

# Detener todo
docker-compose down

# Detener y eliminar datos (⚠️ borra la BD)
docker-compose down -v
```

---

## 🆘 Problemas Comunes

### "Cannot connect to database"
```bash
# Verifica que PostgreSQL esté corriendo
docker ps | grep klion-db

# Si no está, inícialo
docker-compose up postgres -d
```

### "Port already in use"
```bash
# Encuentra qué está usando el puerto
lsof -i :3001  # o :3500 para frontend

# Mata el proceso
kill -9 <PID>
```

### "EADDRINUSE: address already in use"
Otro proceso está usando el puerto. Cámbialo en `.env`:
```env
PORT=3002  # para backend
```

Y en `frontend/.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:3002/api
```

### Frontend no conecta con Backend
Verifica que `NEXT_PUBLIC_API_URL` en `frontend/.env.local` coincida con el puerto del backend:
```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

---

## 📚 Siguiente Paso

Lee la documentación completa:

- **[CONTEXT.md](./CONTEXT.md)** - Contexto general del proyecto
- **[docs/LOCAL_SETUP.md](./docs/LOCAL_SETUP.md)** - Setup detallado
- **[docs/FEATURES.md](./docs/FEATURES.md)** - Todas las funcionalidades
- **[docs/klion-v2-implementacion.md](./docs/klion-v2-implementacion.md)** - Nuevas features v2.0

---

## 🎨 Estructura del Proyecto

```
clientboard/
├── backend/           # NestJS API (Puerto 3001)
├── frontend/          # Next.js App (Puerto 3500)
├── mcp/              # MCP Server (CLI)
├── docs/             # Documentación
├── docker-compose.yml # Orquestación de servicios
├── .env              # Variables de entorno (¡CREAR ESTE!)
└── setup-local.sh    # Script de setup automático
```

---

## ✨ Features Principales

- 📋 **Board Kanban** - Drag & drop con vista por estados y por clientes
- 👥 **Gestión de Clientes** - CRUD completo con proyectos
- ✅ **Tareas y Subtareas** - Sistema completo de gestión
- ⏱️ **Worklogs** - Registro de tiempo trabajado
- 📎 **Archivos y Links** - Adjuntar documentos y enlaces
- 📸 **Snapshots** - Fotos históricas del board
- 🤖 **IA** - Resumen de cliente, plan del día, chat con Gemini
- 🔍 **RAG** - Búsqueda semántica en código con pgvector
- 🔐 **Auth** - Sistema completo con JWT + NextAuth
- 🌙 **Dark Mode** - Tema oscuro por defecto

---

## 🚀 Ya estás listo para desarrollar!

Si tienes problemas, revisa:
1. Los logs: `docker-compose logs -f`
2. La documentación completa: [docs/LOCAL_SETUP.md](./docs/LOCAL_SETUP.md)
3. El troubleshooting: [docs/LOCAL_SETUP.md#troubleshooting](./docs/LOCAL_SETUP.md#troubleshooting)

---

*Última actualización: Enero 2025*
