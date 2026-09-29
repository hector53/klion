#!/bin/bash

# =============================================================================
# 🦁 Klion - Script de Configuración Local
# =============================================================================
# Este script configura automáticamente el entorno de desarrollo local
# =============================================================================

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Función para imprimir mensajes
print_header() {
    echo -e "\n${CYAN}========================================${NC}"
    echo -e "${CYAN}$1${NC}"
    echo -e "${CYAN}========================================${NC}\n"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

# Banner
echo -e "${CYAN}"
cat << "EOF"
  _  _____ _
 | |/ / (_)
 | ' /| |_  ___  _ __
 |  < | | |/ _ \| '_ \
 | . \| | | (_) | | | |
 |_|\_\_|_|\___/|_| |_|

 Setup Local - v2.0
EOF
echo -e "${NC}"

# Verificar que estamos en la raíz del proyecto
if [ ! -f "package.json" ] && [ ! -d "backend" ] && [ ! -d "frontend" ]; then
    print_error "Este script debe ejecutarse desde la raíz del proyecto Klion"
    exit 1
fi

print_header "Verificando Requisitos"

# Verificar Node.js
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    print_success "Node.js instalado: $NODE_VERSION"
else
    print_error "Node.js no está instalado. Instálalo desde https://nodejs.org/"
    exit 1
fi

# Verificar npm
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm -v)
    print_success "npm instalado: v$NPM_VERSION"
else
    print_error "npm no está instalado"
    exit 1
fi

# Verificar Docker (opcional)
if command -v docker &> /dev/null; then
    DOCKER_VERSION=$(docker --version | cut -d ' ' -f3 | cut -d ',' -f1)
    print_success "Docker instalado: v$DOCKER_VERSION"
    HAS_DOCKER=true
else
    print_warning "Docker no está instalado (opcional pero recomendado)"
    HAS_DOCKER=false
fi

# Verificar PostgreSQL local (si no tiene Docker)
if [ "$HAS_DOCKER" = false ]; then
    if command -v psql &> /dev/null; then
        PSQL_VERSION=$(psql --version | cut -d ' ' -f3)
        print_success "PostgreSQL instalado: v$PSQL_VERSION"
        HAS_POSTGRES=true
    else
        print_error "Necesitas Docker o PostgreSQL instalado localmente"
        exit 1
    fi
else
    HAS_POSTGRES=false
fi

# =============================================================================
print_header "Configuración de Variables de Entorno"

# Verificar si existe .env
if [ -f ".env" ]; then
    print_warning "Ya existe un archivo .env en la raíz"
    read -p "¿Deseas sobrescribirlo? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_info "Manteniendo el archivo .env existente"
        SKIP_ENV=true
    else
        SKIP_ENV=false
    fi
else
    SKIP_ENV=false
fi

if [ "$SKIP_ENV" = false ]; then
    print_info "Creando archivo .env unificado..."

    # Generar secretos
    JWT_SECRET=$(openssl rand -base64 32)
    NEXTAUTH_SECRET=$(openssl rand -base64 32)

    # Solicitar API keys
    echo
    print_info "Por favor, proporciona tus API keys (deja en blanco para omitir):"
    echo
    read -p "OpenAI API Key (sk-proj-...): " OPENAI_KEY
    read -p "Gemini API Key: " GEMINI_KEY

    # Crear archivo .env
    cat > .env << EOF
# =============================================================================
# 🦁 Klion - Configuración Local
# Generado automáticamente por setup-local.sh
# =============================================================================

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
# JWT Secret para el backend
JWT_SECRET=$JWT_SECRET

# NextAuth Secret para el frontend
NEXTAUTH_SECRET=$NEXTAUTH_SECRET

# NextAuth URL (debe coincidir con el puerto del frontend)
NEXTAUTH_URL=http://localhost:3500

# =============================================================================
# 🤖 AI SERVICES
# =============================================================================
# OpenAI API Key (para resumen de cliente, plan del día, mensajes, git)
OPENAI_API_KEY=$OPENAI_KEY

# Gemini API Key (para chat IA con Gemini 2.0 Flash y embeddings RAG)
GEMINI_API_KEY=$GEMINI_KEY

# =============================================================================
# 🌐 API URLS
# =============================================================================
# Puerto del backend
PORT=3001

# URL del frontend para CORS (múltiples separados por coma)
FRONTEND_URL=http://localhost:3000,http://localhost:3500,http://localhost:3002

# URL pública de la API para el frontend (cliente/navegador)
NEXT_PUBLIC_API_URL=http://localhost:3001/api

# URL interna de la API para servidor-a-servidor
INTERNAL_API_URL=http://localhost:3001/api

# =============================================================================
# 🔧 ENVIRONMENT
# =============================================================================
NODE_ENV=development

# =============================================================================
# 📸 FEATURES
# =============================================================================
# Días de retención de snapshots
SNAPSHOT_RETENTION_DAYS=90

# Habilitar RAG por defecto en nuevos proyectos
DEFAULT_RAG_ENABLED=true
EOF

    print_success "Archivo .env creado con éxito"

    # Copiar a backend y frontend
    print_info "Copiando configuración a backend y frontend..."

    # Backend
    if [ ! -f "backend/.env" ]; then
        cp .env backend/.env
        print_success "Configuración copiada a backend/.env"
    else
        print_warning "backend/.env ya existe, no se sobrescribió"
    fi

    # Frontend
    if [ ! -f "frontend/.env.local" ]; then
        cat > frontend/.env.local << EOF
# URL pública de la API para el frontend (cliente/navegador)
NEXT_PUBLIC_API_URL=http://localhost:3001/api

# URL interna de la API para servidor-a-servidor
INTERNAL_API_URL=http://localhost:3001/api

# NextAuth
NEXTAUTH_SECRET=$NEXTAUTH_SECRET
NEXTAUTH_URL=http://localhost:3500
EOF
        print_success "Configuración creada en frontend/.env.local"
    else
        print_warning "frontend/.env.local ya existe, no se sobrescribió"
    fi
fi

# =============================================================================
print_header "Configuración de Base de Datos"

if [ "$HAS_DOCKER" = true ]; then
    print_info "Usando Docker para PostgreSQL..."

    # Verificar si el contenedor ya existe
    if docker ps -a | grep -q "klion-db"; then
        print_warning "El contenedor klion-db ya existe"
        read -p "¿Deseas recrearlo? Esto ELIMINARÁ todos los datos (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            docker stop klion-db 2>/dev/null || true
            docker rm klion-db 2>/dev/null || true
            docker-compose up postgres -d
            print_success "Contenedor PostgreSQL recreado"
        else
            # Solo iniciarlo si está detenido
            if ! docker ps | grep -q "klion-db"; then
                docker-compose up postgres -d
                print_success "Contenedor PostgreSQL iniciado"
            else
                print_info "Contenedor PostgreSQL ya está corriendo"
            fi
        fi
    else
        docker-compose up postgres -d
        print_success "Contenedor PostgreSQL creado e iniciado"
    fi

    # Esperar a que PostgreSQL esté listo
    print_info "Esperando a que PostgreSQL esté listo..."
    sleep 5

    # Verificar conexión
    if docker exec klion-db psql -U postgres -d clientboard -c "SELECT 1" &> /dev/null; then
        print_success "PostgreSQL está listo"
    else
        print_error "No se pudo conectar a PostgreSQL"
        print_info "Intenta: docker logs klion-db"
    fi
else
    print_info "Usando PostgreSQL local..."
    print_warning "Asegúrate de que PostgreSQL esté corriendo y que hayas creado la base de datos 'clientboard'"
    print_info "Comandos útiles:"
    echo "  psql -U postgres"
    echo "  CREATE DATABASE clientboard;"
    echo "  \\c clientboard"
    echo "  CREATE EXTENSION IF NOT EXISTS vector;"
fi

# =============================================================================
print_header "Instalación de Dependencias"

# Backend
if [ -d "backend" ]; then
    print_info "Instalando dependencias del backend..."
    cd backend
    npm install
    print_success "Dependencias del backend instaladas"
    cd ..
else
    print_warning "Directorio backend no encontrado"
fi

# Frontend
if [ -d "frontend" ]; then
    print_info "Instalando dependencias del frontend..."
    cd frontend
    npm install
    print_success "Dependencias del frontend instaladas"
    cd ..
else
    print_warning "Directorio frontend no encontrado"
fi

# MCP Server (opcional)
if [ -d "mcp/klion-server" ]; then
    read -p "¿Deseas instalar el MCP Server (CLI)? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_info "Instalando MCP Server..."
        cd mcp/klion-server
        npm install
        npm run build
        print_success "MCP Server compilado"

        read -p "¿Deseas instalarlo globalmente? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            npm install -g .
            print_success "MCP Server instalado globalmente (comando: klion)"
        fi
        cd ../..
    fi
fi

# =============================================================================
print_header "Resumen de Configuración"

echo
print_success "¡Configuración completada!"
echo
print_info "📊 URLs de acceso:"
echo "  • Frontend:     http://localhost:3500"
echo "  • Backend API:  http://localhost:3001/api"
echo "  • Swagger Docs: http://localhost:3001/api/docs"
echo "  • PostgreSQL:   localhost:5432"
echo

print_info "👤 Credenciales de prueba:"
echo "  • Email:    ${MASTER_USER_EMAIL:-demo@klion.local}"
echo "  • Password: configured through MASTER_USER_PASSWORD in .env"
echo

print_info "🚀 Para iniciar el proyecto:"
echo
echo "  Opción 1 - Con Docker (todo junto):"
echo "    docker-compose up"
echo
echo "  Opción 2 - Sin Docker (3 terminales):"
echo "    Terminal 1: docker-compose up postgres  (o usa PostgreSQL local)"
echo "    Terminal 2: cd backend && npm run start:dev"
echo "    Terminal 3: cd frontend && npm run dev"
echo

if [ -n "$OPENAI_KEY" ]; then
    print_success "OpenAI API configurada"
else
    print_warning "OpenAI API no configurada (funcionalidades IA limitadas)"
    print_info "Puedes agregarla después editando .env"
fi

if [ -n "$GEMINI_KEY" ]; then
    print_success "Gemini API configurada"
else
    print_warning "Gemini API no configurada (Chat IA y RAG no disponibles)"
    print_info "Puedes agregarla después editando .env"
fi

echo
print_info "📚 Documentación:"
echo "  • Contexto:     CONTEXT.md"
echo "  • Setup Local:  docs/LOCAL_SETUP.md"
echo "  • Features:     docs/FEATURES.md"
echo "  • v2.0 Changes: docs/klion-v2-implementacion.md"
echo

print_success "¡Todo listo para empezar a desarrollar! 🎉"
echo
