# Changelog - Klion v1.2.0

## Fecha: 9 de Diciembre de 2025

### 🎨 Rebranding a Klion

- **Nuevo nombre**: La aplicación ahora se llama "Klion" (anteriormente "ClientBoard")
- **Nuevo logo**: Se agregó el logo oficial de Klion (`klion_logo.png`)
- **Favicon**: Implementación completa de favicons en múltiples tamaños:
  - `favicon.ico` - Icono principal
  - `icon-192.png` - Icono para PWA (192x192)
  - `icon-512.png` - Icono para PWA (512x512)
  - `apple-touch-icon.png` - Icono para dispositivos Apple
  - `logo.png` - Logo para el sidebar
- **PWA Manifest**: Agregado `manifest.json` para soporte de Progressive Web App
- **Metadata actualizada**: Título y descripción actualizados en toda la aplicación

### 📱 Sidebar Responsive

- **Modo colapsable en desktop**: 
  - Nuevo botón para colapsar/expandir el sidebar
  - El sidebar muestra solo iconos cuando está colapsado
  - Estado persistido en localStorage
- **Menú hamburguesa en mobile**:
  - Botón hamburguesa fijo en la esquina superior izquierda
  - Sidebar se abre como overlay en dispositivos móviles
  - Overlay oscuro para cerrar el menú
- **Hook `use-sidebar`**: Nuevo hook para gestionar el estado del sidebar

### 🔐 Sistema de Autenticación

#### Backend (NestJS)

**Nuevo módulo de Usuarios (`/modules/users/`)**:
- `user.entity.ts`: Entidad User con campos:
  - id (UUID)
  - email (único)
  - password (hasheado con bcrypt)
  - name
  - avatar (opcional)
  - role (enum: admin, user)
  - isActive
  - timestamps (createdAt, updatedAt)
- `user.dto.ts`: DTOs para crear y actualizar usuarios
- `users.service.ts`: Servicio con:
  - CRUD completo de usuarios
  - Hash de contraseñas con bcrypt (10 rounds)
  - Método `createMasterUser()` para seed inicial
  - Validación de usuarios para autenticación
- `users.controller.ts`: Endpoints protegidos con JWT
- `users.module.ts`: Módulo con TypeORM y exportaciones

**Nuevo módulo de Auth (`/modules/auth/`)**:
- `auth.dto.ts`: DTOs para login y registro
- `auth.service.ts`: Servicio de autenticación con:
  - Login con validación de credenciales
  - Registro de nuevos usuarios
  - Generación de tokens JWT (expiración: 7 días)
  - Validación de tokens
- `jwt.strategy.ts`: Estrategia Passport para JWT
- `jwt-auth.guard.ts`: Guard para proteger rutas
- `auth.controller.ts`: Endpoints:
  - `POST /api/auth/login` - Iniciar sesión
  - `POST /api/auth/register` - Registrar usuario
  - `GET /api/auth/me` - Obtener perfil (protegido)
  - `POST /api/auth/validate` - Validar token

**Configuración**:
- Nuevas dependencias: `@nestjs/jwt`, `@nestjs/passport`, `passport`, `passport-jwt`, `bcrypt`
- Variable de entorno `JWT_SECRET` agregada
- Seed automático del usuario master al iniciar

**Usuario Master**:
- Email: `demo@klion.local`
- Password: the value configured in `MASTER_USER_PASSWORD`
- Role: `admin`

#### Frontend (Next.js)

**NextAuth.js Integration**:
- `api/auth/[...nextauth]/route.ts`: Configuración de NextAuth
  - Credentials Provider conectando con backend
  - Callbacks para JWT y sesión
  - Configuración de páginas personalizadas
- `types/next-auth.d.ts`: Tipos TypeScript extendidos para sesión

**Páginas de Autenticación**:
- `/login` - Página de inicio de sesión:
  - Formulario con email y contraseña
  - Toggle para mostrar/ocultar contraseña
  - Manejo de errores
  - Redirección después del login
- `/register` - Página de registro:
  - Formulario con nombre, email, contraseña y confirmación
  - Validaciones de contraseña
  - Mensajes de éxito/error
  - Redirección a login después del registro

**Middleware de Protección**:
- `middleware.ts`: Protección de rutas
  - Rutas públicas: `/login`, `/register`
  - Redirección a login si no autenticado
  - Redirección a home si autenticado en páginas de auth

**Reorganización de Rutas**:
- Grupo `(auth)`: Layout limpio sin sidebar
  - `/login`
  - `/register`
- Grupo `(dashboard)`: Layout con sidebar
  - `/` (redirección a /board)
  - `/board`
  - `/clients`
  - `/clients/[id]`
  - `/settings`
  - `/snapshots`

**Actualización del Sidebar**:
- Muestra información del usuario logueado
- Botón de "Cerrar sesión"
- Integración con `useSession()` de NextAuth

**Providers actualizados**:
- `SessionProvider` de NextAuth agregado al árbol de providers

### 📦 Dependencias Agregadas

#### Backend
```json
{
  "@nestjs/jwt": "^10.x",
  "@nestjs/passport": "^10.x",
  "passport": "^0.7.x",
  "passport-jwt": "^4.x",
  "passport-local": "^1.x",
  "bcrypt": "^5.x"
}
```

#### Frontend
```json
{
  "next-auth": "^4.x",
  "bcryptjs": "^2.x"
}
```

### 🗄️ Base de Datos

**Nueva tabla `users`**:
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  avatar VARCHAR(255),
  role users_role_enum DEFAULT 'user',
  "isActive" BOOLEAN DEFAULT true,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);

CREATE TYPE users_role_enum AS ENUM ('admin', 'user');
```

### 🔧 Variables de Entorno

#### Backend (`.env`)
```env
JWT_SECRET=klion-super-secret-jwt-key-2024-secure
```

#### Frontend (`.env.local`)
```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXTAUTH_SECRET=klion-nextauth-secret-2024-secure
NEXTAUTH_URL=http://localhost:3002
```

---

## Cómo probar

1. Iniciar backend: `cd backend && npm run start:dev`
2. Iniciar frontend: `cd frontend && npm run dev`
3. Acceder a `http://localhost:3002/login`
4. Iniciar sesión con:
   - Email: `demo@klion.local`
   - Password: the value configured in `MASTER_USER_PASSWORD`
