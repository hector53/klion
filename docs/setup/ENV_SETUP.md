# 🔧 Configuración de Entorno - Klion

> **TL;DR**: Copia `env-template` a `.env`, rellena tus API keys, ejecuta `./setup-local.sh` y listo.

---

## 📦 Archivo `.env` Unificado en la Raíz

Klion ahora usa un **único archivo `.env` en la raíz del proyecto** que se comparte entre backend y frontend. Esto simplifica la configuración y es similar a como funciona en producción.

### 🚀 Setup Rápido (3 pasos)

```bash
# 1. Copia el template
cp env-template .env

# 2. Edita el archivo .env y añade tus API keys
nano .env  # o usa tu editor favorito

# 3. Ejecuta el script de setup
./setup-local.sh
```

---

## 📋 Variables Requeridas

### Obligatorias (el sistema no funcionará sin estas)

```env
# Database
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=postgres
DATABASE_NAME=clientboard

# Auth
JWT_SECRET=klion-super-secret-jwt-key-2024-secure
NEXTAUTH_SECRET=klion-nextauth-secret-2024-secure
NEXTAUTH_URL=http://localhost:3500

# Server
PORT=3001
NODE_ENV=development
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

### Opcionales (limitan funcionalidades si no están)

```env
# OpenAI (para resumen de cliente, plan del día, redacción de mensajes)
OPENAI_API_KEY=sk-proj-tu-api-key-aqui

# Gemini (para chat IA y búsqueda semántica en código)
GEMINI_API_KEY=tu-gemini-api-key-aqui
```

---

## 🔑 Cómo Obtener API Keys

### OpenAI API Key

1. Ve a https://platform.openai.com/api-keys
2. Crea una cuenta o inicia sesión
3. Click en "Create new secret key"
4. Copia la key (empieza con `sk-proj-...`)
5. Pégala en `.env`: `OPENAI_API_KEY=sk-proj-...`

**Precio**: ~$0.002 por 1K tokens (muy económico para desarrollo)

### Gemini API Key

1. Ve a https://aistudio.google.com/app/apikey
2. Inicia sesión con tu cuenta de Google
3. Click en "Create API Key"
4. Copia la key
5. Pégala en `.env`: `GEMINI_API_KEY=...`

**Precio**: GRATIS hasta 60 requests/minuto (perfecto para desarrollo)

---

## 📁 Estructura de Archivos de Configuración

```
klion/
├── .env                      # ✅ ARCHIVO PRINCIPAL (crear este)
├── env-template              # Template para copiar
├── backend/.env              # Se copia automáticamente desde raíz
└── frontend/.env.local       # Se crea automáticamente desde raíz
```

**Importante**: Solo necesitas editar `.env` en la raíz. El script de setup se encarga del resto.

---

## 🎯 Configuración para Diferentes Entornos

### Desarrollo Local (por defecto)

```env
DATABASE_HOST=localhost
PORT=3001
NODE_ENV=development
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXTAUTH_URL=http://localhost:3500
```

### Con Docker Compose

```env
DATABASE_HOST=postgres  # Nombre del servicio en docker-compose.yml
INTERNAL_API_URL=http://api:3001/api  # URL interna entre contenedores
```

### Producción (ejemplo)

```env
DATABASE_HOST=tu-servidor-db.com
DATABASE_PORT=5432
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://api.tudominio.com/api
NEXTAUTH_URL=https://app.tudominio.com
```

---

## 🔐 Generar Secretos Seguros

Para producción, **NO uses los valores por defecto**. Genera secretos únicos:

```bash
# Generar JWT_SECRET
openssl rand -base64 32

# Generar NEXTAUTH_SECRET
openssl rand -base64 32
```

Luego cópialos a tu `.env`:

```env
JWT_SECRET=tu-secreto-generado-aqui
NEXTAUTH_SECRET=otro-secreto-diferente-aqui
```

---

## ⚙️ Variables Avanzadas

### Configuración de Base de Datos

```env
# Para PostgreSQL local
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=postgres
DATABASE_NAME=clientboard

# Para PostgreSQL en otro servidor
DATABASE_HOST=192.168.1.100
DATABASE_PORT=5433
DATABASE_USER=klion_user
DATABASE_PASSWORD=password_seguro
DATABASE_NAME=klion_prod
```

### URLs y CORS

```env
# Frontend URLs permitidas para CORS (separadas por coma)
FRONTEND_URL=http://localhost:3000,http://localhost:3500,http://localhost:3002

# Si usas un dominio custom en desarrollo
FRONTEND_URL=http://klion.local:3500
NEXTAUTH_URL=http://klion.local:3500
```

### Features

```env
# Retención de snapshots (en días)
SNAPSHOT_RETENTION_DAYS=90

# Habilitar RAG por defecto en nuevos proyectos
DEFAULT_RAG_ENABLED=true
```

---

## 🧪 Verificar Configuración

### 1. Verificar que el archivo existe

```bash
ls -la .env
```

### 2. Verificar que las variables se cargan correctamente

```bash
# Backend
cd backend
node -e "require('dotenv').config({path:'../.env'}); console.log(process.env.DATABASE_HOST)"

# Frontend
cd frontend
node -e "require('dotenv').config({path:'../.env'}); console.log(process.env.NEXT_PUBLIC_API_URL)"
```

### 3. Probar conexión a la base de datos

```bash
# Si tienes psql instalado
psql -h localhost -p 5432 -U postgres -d clientboard -c "SELECT 1"

# Con Docker
docker exec -it klion-db psql -U postgres -d clientboard -c "SELECT 1"
```

---

## ❌ Errores Comunes

### Error: "Cannot find module 'dotenv'"

**Solución**: Las dependencias no están instaladas.

```bash
cd backend && npm install
cd ../frontend && npm install
```

### Error: "ECONNREFUSED" al conectar a la base de datos

**Causa**: PostgreSQL no está corriendo.

**Solución**:
```bash
# Con Docker
docker-compose up postgres -d

# O con PostgreSQL local
sudo service postgresql start  # Linux
brew services start postgresql  # macOS
```

### Error: "Invalid token" o "jwt malformed"

**Causa**: JWT_SECRET o NEXTAUTH_SECRET no coinciden o no están configurados.

**Solución**: Verifica que ambas variables existen en `.env` y reinicia los servicios.

### Frontend no puede comunicarse con Backend

**Causa**: NEXT_PUBLIC_API_URL incorrecta.

**Solución**: Verifica que coincida con el puerto del backend:
```env
PORT=3001  # Puerto del backend
NEXT_PUBLIC_API_URL=http://localhost:3001/api  # Debe coincidir
```

### Error: "OpenAI API key not configured"

**Causa**: Funcionalidad de IA activada sin API key.

**Solución**: 
1. Añade tu API key en `.env`
2. O ignora el warning (las otras funcionalidades seguirán trabajando)

---

## 🔄 Sincronizar con Producción

Si ya tienes un `.env` en producción y quieres adaptarlo para local:

```bash
# 1. Descarga o copia tu .env de producción
scp usuario@servidor:/ruta/a/.env .env.prod

# 2. Crea uno nuevo basándote en él
cp .env.prod .env

# 3. Ajusta para localhost
sed -i '' 's/production/development/g' .env
sed -i '' 's/tu-dominio.com/localhost:3500/g' .env
sed -i '' 's/DATABASE_HOST=.*/DATABASE_HOST=localhost/g' .env
```

---

## 📚 Archivos de Referencia

| Archivo | Propósito |
|---------|-----------|
| `env-template` | Template limpio para copiar |
| `.env` | **Archivo principal** que debes crear y editar |
| `backend/.env` | Se copia automáticamente desde raíz (no editar) |
| `frontend/.env.local` | Se crea automáticamente desde raíz (no editar) |
| `setup-local.sh` | Script que configura todo automáticamente |

---

## 🎯 Valores de Prueba (Localhost)

Copia y pega esto directamente en tu `.env` para empezar rápido:

```env
# Database
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=postgres
DATABASE_NAME=clientboard

# Auth
JWT_SECRET=klion-super-secret-jwt-key-2024-secure
NEXTAUTH_SECRET=klion-nextauth-secret-2024-secure
NEXTAUTH_URL=http://localhost:3500

# AI (completa con tus keys reales)
OPENAI_API_KEY=
GEMINI_API_KEY=

# Server
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000,http://localhost:3500,http://localhost:3002
NEXT_PUBLIC_API_URL=http://localhost:3001/api
INTERNAL_API_URL=http://localhost:3001/api

# Features
SNAPSHOT_RETENTION_DAYS=90
DEFAULT_RAG_ENABLED=true
```

---

## 🆘 Necesitas Ayuda?

1. **Guía rápida**: Lee [QUICKSTART.md](./QUICKSTART.md)
2. **Setup detallado**: Lee [docs/LOCAL_SETUP.md](./docs/LOCAL_SETUP.md)
3. **Pruebas**: Lee [docs/TESTING_GUIDE.md](./docs/TESTING_GUIDE.md)
4. **Troubleshooting**: Lee la sección de troubleshooting en LOCAL_SETUP.md

---

## ✅ Checklist Final

Antes de comenzar a desarrollar, verifica:

- [ ] Archivo `.env` existe en la raíz
- [ ] Variables de database configuradas
- [ ] JWT_SECRET y NEXTAUTH_SECRET configurados
- [ ] NEXT_PUBLIC_API_URL apunta a http://localhost:3001/api
- [ ] NEXTAUTH_URL apunta a http://localhost:3500
- [ ] PostgreSQL está corriendo y responde
- [ ] Backend inicia sin errores en puerto 3001
- [ ] Frontend inicia sin errores en puerto 3500
- [ ] Puedes hacer login en http://localhost:3500

---

**¡Listo para desarrollar!** 🚀

Si todo lo anterior está verde, ya puedes empezar a trabajar con Klion.

---

*Última actualización: Enero 2025*
