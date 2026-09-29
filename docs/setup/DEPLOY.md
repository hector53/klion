# 🚀 Guía de Despliegue - Klion

Esta guía documenta cómo desplegar Klion en producción.

## 📋 Requisitos Previos

- Docker y Docker Compose instalados
- Dominio configurado con SSL (ej: `klion.tudominio.com`)
- Nginx como reverse proxy (recomendado)
- API Key de Gemini o OpenAI (para embeddings y chat IA)

## 🔧 Configuración

### 1. Variables de Entorno

Copia el archivo de ejemplo y configura las variables:

```bash
cp env.production.example .env
nano .env
```

Variables requeridas:

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `POSTGRES_USER` | Usuario de PostgreSQL | `postgres` |
| `POSTGRES_PASSWORD` | Contraseña de PostgreSQL | `tu-password-seguro` |
| `POSTGRES_DB` | Nombre de la base de datos | `clientboard` |
| `JWT_SECRET` | Secret para JWT (mín. 32 chars) | `genera-un-string-aleatorio-seguro` |
| `FRONTEND_URL` | URL del frontend (para CORS) | `https://klion.tudominio.com` |
| `GEMINI_API_KEY` | API Key de Google Gemini | `AIza...` |
| `NEXT_PUBLIC_API_URL` | URL pública de la API | `https://klion.tudominio.com/api` |
| `NEXTAUTH_SECRET` | Secret para NextAuth | `genera-otro-string-aleatorio` |
| `NEXTAUTH_URL` | URL base de NextAuth | `https://klion.tudominio.com` |

### 2. Configuración de Nginx

Ejemplo de configuración para Nginx con SSL:

```nginx
server {
    listen 80;
    server_name klion.tudominio.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name klion.tudominio.com;

    ssl_certificate /etc/letsencrypt/live/klion.tudominio.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/klion.tudominio.com/privkey.pem;

    # API Backend - rutas específicas de auth que van al backend
    location ~ ^/api/auth/(login|register|me|validate)$ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # API Backend - todas las demás rutas /api/*
    location /api/ {
        proxy_pass http://127.0.0.1:3001/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Para uploads grandes (indexación de código)
        client_max_body_size 50M;
    }

    # Frontend Next.js
    location / {
        proxy_pass http://127.0.0.1:3500;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## 🚀 Despliegue

### Primera vez (instalación limpia)

```bash
# 1. Clonar repositorio
git clone https://github.com/hector53/klion.git
cd klion

# 2. Configurar variables de entorno
cp env.production.example .env
nano .env  # Editar con tus valores

# 3. Construir y levantar contenedores
docker compose -f docker-compose.prod.yml up -d --build

# 4. Verificar que todo está corriendo
docker compose -f docker-compose.prod.yml ps

# 5. Ver logs
docker compose -f docker-compose.prod.yml logs -f
```

### Actualización (nuevos cambios)

```bash
# 1. Obtener últimos cambios
git pull origin main

# 2. Reconstruir y reiniciar
docker-compose -f docker-compose.prod.yml up -d --build

# 3. Verificar logs
docker-compose -f docker-compose.prod.yml logs -f api
```

### Solo reiniciar (sin reconstruir)

```bash
docker-compose -f docker-compose.prod.yml restart
```

## 🔍 Módulo RAG (Indexación de Código)

### Arquitectura Híbrida

El sistema RAG utiliza **indexación híbrida**:

1. **MCP/CLI (local)**: Escanea y procesa archivos en la máquina del usuario
2. **Backend (producción)**: Recibe chunks, genera embeddings, almacena en PostgreSQL

```
┌─────────────────────────────────────────────────────────┐
│              MÁQUINA DEL USUARIO                         │
│  ┌────────────┐    ┌────────────────────────────────┐   │
│  │ Proyecto   │───►│ MCP Server                     │   │
│  │ /mi/codigo │    │ - Escanea archivos             │   │
│  └────────────┘    │ - Divide en chunks (~300 líneas)│   │
│                    └──────────────┬─────────────────┘   │
└───────────────────────────────────│─────────────────────┘
                                    │ POST /api/rag/chunks
                                    ▼
┌─────────────────────────────────────────────────────────┐
│              SERVIDOR DE PRODUCCIÓN                      │
│  ┌────────────────────────────────────────────────────┐ │
│  │ Backend NestJS                                      │ │
│  │ - Recibe chunks                                     │ │
│  │ - Genera embeddings (Gemini API)                    │ │
│  │ - Almacena en PostgreSQL + pgvector                 │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### Requisitos para RAG

1. **PostgreSQL con pgvector**: El `docker-compose.prod.yml` ya usa `pgvector/pgvector:pg15`
2. **GEMINI_API_KEY**: Requerida para generar embeddings
3. **MCP actualizado**: El usuario debe tener el MCP v2.0 instalado

### Uso del RAG desde MCP

```bash
# Configurar URL de producción
klion config --api-url https://klion.tudominio.com/api

# Indexar un proyecto local
klion rag index \
  --project <projectId> \
  --path "/ruta/al/proyecto" \
  --force

# Buscar en el código
klion rag search \
  --project <projectId> \
  --query "función de autenticación"
```

## 📊 Monitoreo

### Ver logs en tiempo real

```bash
# Todos los servicios
docker-compose -f docker-compose.prod.yml logs -f

# Solo backend
docker-compose -f docker-compose.prod.yml logs -f api

# Solo frontend
docker-compose -f docker-compose.prod.yml logs -f web

# Solo base de datos
docker-compose -f docker-compose.prod.yml logs -f postgres
```

### Estado de los contenedores

```bash
docker-compose -f docker-compose.prod.yml ps
```

### Uso de recursos

```bash
docker stats klion-api klion-web klion-db
```

## 🔧 Solución de Problemas

### Error: "pgvector extension not found"

Verificar que PostgreSQL tiene pgvector:

```bash
docker exec -it klion-db psql -U postgres -d clientboard -c "SELECT * FROM pg_extension WHERE extname = 'vector';"
```

Si no existe, ejecutar manualmente:

```bash
docker exec -it klion-db psql -U postgres -d clientboard -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

### Error: "413 Request Entity Too Large"

Aumentar `client_max_body_size` en Nginx:

```nginx
client_max_body_size 50M;
```

### Error: "GEMINI_API_KEY not configured"

Verificar que la variable está en `.env` y reiniciar:

```bash
docker-compose -f docker-compose.prod.yml restart api
```

### Base de datos corrupta o necesita reset

⚠️ **CUIDADO: Esto borra todos los datos**

```bash
docker-compose -f docker-compose.prod.yml down -v
docker-compose -f docker-compose.prod.yml up -d --build
```

## 🔐 Seguridad

### Recomendaciones

1. **Cambiar todos los secrets** en `.env` por valores únicos y seguros
2. **No exponer puertos** directamente (usar Nginx como proxy)
3. **Configurar firewall** para permitir solo puertos 80 y 443
4. **Habilitar SSL** con Let's Encrypt
5. **Backups regulares** de la base de datos

### Backup de PostgreSQL

```bash
# Crear backup
docker exec klion-db pg_dump -U postgres clientboard > backup_$(date +%Y%m%d).sql

# Restaurar backup
cat backup_20260125.sql | docker exec -i klion-db psql -U postgres clientboard
```

## 📁 Estructura de Archivos en Producción

```
/opt/klion/                    # Directorio recomendado
├── docker-compose.prod.yml
├── .env                       # Variables de entorno (no commitear)
├── backend/
│   ├── Dockerfile
│   └── init-db/
│       └── 01-enable-pgvector.sql
├── frontend/
│   └── Dockerfile.prod
└── DEPLOY.md                  # Esta guía
```

## 🆘 Soporte

Si encuentras problemas:

1. Revisa los logs: `docker-compose -f docker-compose.prod.yml logs -f`
2. Verifica las variables de entorno
3. Asegúrate de que Nginx está configurado correctamente
4. Consulta la documentación del MCP en `mcp/klion-server/README.md`
