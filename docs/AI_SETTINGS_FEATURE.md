# 🤖 Configuración de IA - Documentación

> Sistema completo de configuración de proveedores de IA (OpenAI y Gemini) desde la interfaz de usuario

---

## 📋 Resumen

Esta funcionalidad permite a los usuarios configurar y gestionar sus credenciales de API y preferencias de IA directamente desde la interfaz de Settings, sin necesidad de modificar variables de entorno.

### Características Principales

- ✅ **Doble proveedor**: Soporte para OpenAI y Gemini
- ✅ **Gemini por defecto**: Configurado como proveedor recomendado (GRATIS)
- ✅ **Selección de modelos**: Amplia gama de modelos disponibles
- ✅ **Gestión de API Keys**: Almacenamiento seguro en base de datos
- ✅ **Toggles de funcionalidades**: Habilitar/deshabilitar features IA
- ✅ **Configuración avanzada**: Temperature y max tokens
- ✅ **Persistencia por usuario**: Cada usuario tiene su propia configuración

---

## 🏗️ Arquitectura

### Backend

#### 1. Entidad AISettings (`backend/src/modules/ai/entities/ai-settings.entity.ts`)

```typescript
@Entity('ai_settings')
export class AISettings {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', unique: true })
  userId: string;

  // Provider Configuration
  @Column({ type: 'enum', enum: AIProvider, default: AIProvider.GEMINI })
  defaultProvider: AIProvider;

  // OpenAI Settings
  @Column({ type: 'text', nullable: true })
  openaiApiKey: string | null;

  @Column({ type: 'enum', enum: OpenAIModel, default: OpenAIModel.GPT_4O_MINI })
  openaiDefaultModel: OpenAIModel;

  // Gemini Settings
  @Column({ type: 'text', nullable: true })
  geminiApiKey: string | null;

  @Column({ type: 'enum', enum: GeminiModel, default: GeminiModel.GEMINI_2_5_FLASH })
  geminiDefaultModel: GeminiModel;

  // Feature Toggles
  @Column({ type: 'boolean', default: true })
  enableSuggestions: boolean;

  @Column({ type: 'boolean', default: true })
  enableAutoSummary: boolean;

  @Column({ type: 'boolean', default: true })
  enableChat: boolean;

  @Column({ type: 'boolean', default: true })
  enableRAG: boolean;

  // Advanced Settings
  @Column({ type: 'float', default: 0.7 })
  temperature: number;

  @Column({ type: 'int', default: 8192 })
  maxTokens: number;
}
```

#### 2. Enums de Modelos

**OpenAI Models:**
- `GPT_4O` - Modelo más capaz con multimodalidad
- `GPT_4O_MINI` - Rápido y económico (Recomendado)
- `GPT_4_TURBO` - Modelo anterior de alto rendimiento
- `GPT_3_5_TURBO` - Modelo legacy

**Gemini Models:**
- `GEMINI_3_PRO_PREVIEW` - Más inteligente (nuevo)
- `GEMINI_3_FLASH_PREVIEW` - Equilibrado (nuevo)
- `GEMINI_2_5_FLASH` - Rápido e inteligente ⭐ (Recomendado)
- `GEMINI_2_5_FLASH_LITE` - Ultra rápido
- `GEMINI_2_5_PRO` - Pensamiento avanzado
- `GEMINI_2_0_FLASH` - Modelo anterior (legacy)

#### 3. API Endpoints

**GET `/api/ai/settings`**
- Obtiene la configuración de IA del usuario autenticado
- Crea configuración por defecto si no existe
- Enmascara las API keys (muestra solo primeros/últimos 4 caracteres)

**PATCH `/api/ai/settings`**
- Actualiza la configuración de IA
- Acepta cualquier combinación de campos del DTO

**GET `/api/ai/models`**
- Lista todos los modelos disponibles de OpenAI y Gemini
- Incluye información sobre contexto, costo y disponibilidad

#### 4. DTOs

```typescript
export class UpdateAISettingsDto {
  defaultProvider?: AIProvider;
  openaiApiKey?: string;
  openaiDefaultModel?: OpenAIModel;
  geminiApiKey?: string;
  geminiDefaultModel?: GeminiModel;
  enableSuggestions?: boolean;
  enableAutoSummary?: boolean;
  enableChat?: boolean;
  enableRAG?: boolean;
  temperature?: number;
  maxTokens?: number;
}
```

### Frontend

#### 1. Hook useAISettings (`frontend/src/hooks/use-ai-settings.ts`)

```typescript
export function useAISettings() {
  // Query para obtener configuración
  const { data: settings, isLoading } = useQuery({
    queryKey: ['ai-settings'],
    queryFn: aiApi.getSettings,
  });

  // Mutation para actualizar
  const updateMutation = useMutation({
    mutationFn: aiApi.updateSettings,
    onSuccess: () => {
      toast.success('Configuración guardada');
    },
  });

  return {
    settings,
    isLoading,
    updateSettings: updateMutation.mutate,
    isSaving: updateMutation.isPending,
  };
}
```

#### 2. Integración en Settings Page

La página de configuración (`frontend/src/app/(dashboard)/settings/page.tsx`) incluye:

- **Selector de Proveedor**: Toggle entre Gemini y OpenAI
- **Configuración OpenAI**: API Key + Selector de modelo
- **Configuración Gemini**: API Key + Selector de modelo con enlace a obtener key
- **Toggles de Features**: 4 opciones para habilitar/deshabilitar funcionalidades
- **Botón de Guardar**: Persiste los cambios en el backend

---

## 📊 Flujo de Datos

```
┌─────────────────────────────────────────────────────────────┐
│                      USUARIO                                │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              Settings Page (Frontend)                        │
│  - Selector de proveedor (Gemini/OpenAI)                    │
│  - Inputs para API keys                                     │
│  - Selectores de modelos                                    │
│  - Toggles de features                                      │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│         useAISettings Hook (TanStack Query)                  │
│  - GET /api/ai/settings (cargar)                            │
│  - PATCH /api/ai/settings (guardar)                         │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│            AIController (NestJS)                             │
│  - Valida usuario autenticado                               │
│  - Extrae userId del JWT                                    │
│  - Delega a AIService                                       │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│               AIService (Business Logic)                     │
│  - CRUD sobre AISettings entity                             │
│  - Enmascara API keys en respuestas                         │
│  - Crea configuración por defecto si no existe              │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│          PostgreSQL (ai_settings table)                      │
│  - Almacena configuración por usuario                       │
│  - API keys encriptadas (recomendado en producción)         │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔐 Seguridad

### API Keys

1. **Enmascaramiento**: Las API keys se enmascaran en las respuestas GET (solo se muestran primeros/últimos 4 caracteres)
2. **Almacenamiento**: Se guardan en texto plano en la base de datos (se recomienda encriptar en producción)
3. **Fallback**: Si el usuario no tiene API key configurada, se usa la del `.env` como fallback

### Recomendaciones para Producción

```typescript
// Encriptar antes de guardar
import * as crypto from 'crypto';

function encrypt(text: string): string {
  const cipher = crypto.createCipheriv(
    'aes-256-cbc',
    Buffer.from(process.env.ENCRYPTION_KEY),
    Buffer.from(process.env.ENCRYPTION_IV)
  );
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
}

function decrypt(encrypted: string): string {
  const decipher = crypto.createDecipheriv(
    'aes-256-cbc',
    Buffer.from(process.env.ENCRYPTION_KEY),
    Buffer.from(process.env.ENCRYPTION_IV)
  );
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
```

---

## 🎨 UI/UX

### Diseño de la Interfaz

#### Selector de Proveedor
```
┌─────────────────────┬─────────────────────┐
│      Gemini ✓       │       OpenAI        │
│  Por Google         │   GPT-4 y GPT-3.5   │
│  (Recomendado)      │                     │
└─────────────────────┴─────────────────────┘
```

#### Configuración de Gemini
```
┌──────────────────────────────────────────────┐
│ API Key                                      │
│ ┌──────────────────────────────────────────┐ │
│ │ AIza...                                  │ │
│ └──────────────────────────────────────────┘ │
│ GRATIS hasta 60 req/min    [Obtener key →]  │
│                                              │
│ Modelo por defecto                           │
│ ┌──────────────────────────────────────────┐ │
│ │ Gemini 2.5 Flash - Rápido e inteligente │ │
│ └──────────────────────────────────────────┘ │
└──────────────────────────────────────────────┘
```

#### Toggles de Features
```
┌──────────────────────────────────────────────┐
│ ✓ Sugerencias automáticas                   │
│   IA sugiere mejoras en tareas              │
├──────────────────────────────────────────────┤
│ ✓ Resúmenes automáticos                     │
│   Genera resúmenes de clientes              │
├──────────────────────────────────────────────┤
│ ✓ Chat IA                                   │
│   Asistente conversacional con Gemini       │
├──────────────────────────────────────────────┤
│ ✓ RAG (Búsqueda en código)                 │
│   Búsqueda semántica en repositorios       │
└──────────────────────────────────────────────┘
```

---

## 📝 Uso

### Desde la Interfaz

1. **Acceder a Settings**
   - Click en el menú lateral → "Configuración"
   - Seleccionar sección "Inteligencia Artificial"

2. **Configurar Gemini (Recomendado)**
   - Obtener API key desde https://aistudio.google.com/app/apikey
   - Pegar en el campo "API Key"
   - Seleccionar modelo (por defecto: Gemini 2.5 Flash)
   - Habilitar features deseadas
   - Click en "Guardar configuración"

3. **Configurar OpenAI (Opcional)**
   - Cambiar proveedor a "OpenAI"
   - Obtener API key desde https://platform.openai.com/api-keys
   - Pegar en el campo "API Key"
   - Seleccionar modelo (recomendado: GPT-4o Mini)
   - Click en "Guardar configuración"

### Desde la API

```bash
# Obtener configuración actual
curl -X GET http://localhost:3001/api/ai/settings \
  -H "Authorization: Bearer $TOKEN"

# Actualizar configuración
curl -X PATCH http://localhost:3001/api/ai/settings \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "defaultProvider": "gemini",
    "geminiApiKey": "AIza...",
    "geminiDefaultModel": "gemini-2.5-flash",
    "enableChat": true,
    "enableRAG": true
  }'

# Ver modelos disponibles
curl -X GET http://localhost:3001/api/ai/models \
  -H "Authorization: Bearer $TOKEN"
```

---

## 🧪 Testing

### Test de Configuración

```bash
# 1. Login
export TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@klion.com","password":"test123"}' \
  | jq -r '.access_token')

# 2. Ver configuración inicial
curl -X GET http://localhost:3001/api/ai/settings \
  -H "Authorization: Bearer $TOKEN" | jq

# 3. Configurar Gemini
curl -X PATCH http://localhost:3001/api/ai/settings \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "defaultProvider": "gemini",
    "geminiApiKey": "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXX",
    "geminiDefaultModel": "gemini-2.5-flash"
  }' | jq

# 4. Verificar enmascaramiento de API key
curl -X GET http://localhost:3001/api/ai/settings \
  -H "Authorization: Bearer $TOKEN" | jq '.geminiApiKey'
# Output: "AIza...XXXX"
```

### Test en Frontend

1. Abrir http://localhost:3500/settings
2. Ir a "Inteligencia Artificial"
3. Verificar que carga la configuración actual
4. Cambiar proveedor a Gemini
5. Ingresar una API key de prueba
6. Click en "Guardar configuración"
7. Verificar toast de éxito
8. Recargar página y verificar que persiste

---

## 🔄 Migración

### Migrando desde Variables de Entorno

Si antes usabas `OPENAI_API_KEY` o `GEMINI_API_KEY` en el `.env`, ahora puedes:

1. **Opción 1**: Mantener las variables en `.env` (siguen funcionando como fallback)
2. **Opción 2**: Migrar a la base de datos por usuario

**Script de migración** (opcional):

```typescript
// backend/src/scripts/migrate-ai-settings.ts
import { Repository } from 'typeorm';
import { AISettings } from '../modules/ai/entities/ai-settings.entity';
import { User } from '../modules/users/entities/user.entity';

async function migrateAISettings(
  userRepo: Repository<User>,
  aiSettingsRepo: Repository<AISettings>,
  openaiKey: string,
  geminiKey: string,
) {
  const users = await userRepo.find();

  for (const user of users) {
    const existing = await aiSettingsRepo.findOne({ where: { userId: user.id } });
    
    if (!existing) {
      await aiSettingsRepo.save({
        userId: user.id,
        openaiApiKey: openaiKey,
        geminiApiKey: geminiKey,
        defaultProvider: 'gemini',
      });
      console.log(`Migrated settings for user ${user.email}`);
    }
  }
}
```

---

## 🐛 Troubleshooting

### Error: "No se pudo guardar la configuración"

**Causa**: Usuario no autenticado o token inválido

**Solución**: Verificar que el token JWT es válido y no ha expirado

### Error: "API key no válida"

**Causa**: API key incorrecta o sin permisos

**Solución**: 
- Verificar que la API key es correcta
- Para Gemini: verificar en https://aistudio.google.com/app/apikey
- Para OpenAI: verificar en https://platform.openai.com/api-keys

### Los cambios no se guardan

**Causa**: Error en el backend o base de datos

**Solución**:
1. Verificar logs del backend
2. Verificar que la tabla `ai_settings` existe
3. Ejecutar migration si es necesario

### API key enmascarada no se actualiza

**Causa**: Por seguridad, las API keys solo se muestran enmascaradas

**Solución**: Es comportamiento esperado. Para actualizar:
1. Borrar el campo
2. Ingresar la nueva API key completa
3. Guardar

---

## 📊 Tabla de Base de Datos

```sql
CREATE TABLE ai_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "userId" UUID NOT NULL UNIQUE,
  "defaultProvider" VARCHAR(20) NOT NULL DEFAULT 'gemini',
  "openaiApiKey" TEXT,
  "openaiDefaultModel" VARCHAR(50) NOT NULL DEFAULT 'gpt-4o-mini',
  "geminiApiKey" TEXT,
  "geminiDefaultModel" VARCHAR(50) NOT NULL DEFAULT 'gemini-2.5-flash',
  "enableSuggestions" BOOLEAN NOT NULL DEFAULT TRUE,
  "enableAutoSummary" BOOLEAN NOT NULL DEFAULT TRUE,
  "enableChat" BOOLEAN NOT NULL DEFAULT TRUE,
  "enableRAG" BOOLEAN NOT NULL DEFAULT TRUE,
  temperature FLOAT NOT NULL DEFAULT 0.7,
  "maxTokens" INTEGER NOT NULL DEFAULT 8192,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT "FK_ai_settings_user" FOREIGN KEY ("userId") 
    REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX "IDX_ai_settings_userId" ON ai_settings("userId");
```

---

## 🚀 Próximas Mejoras

- [ ] Encriptación de API keys en la base de datos
- [ ] Límites de uso por usuario
- [ ] Estadísticas de uso de cada proveedor
- [ ] Test de conectividad de API keys
- [ ] Historial de cambios de configuración
- [ ] Compartir configuración entre usuarios de un equipo
- [ ] Configuración de costos y presupuestos
- [ ] Webhooks para notificaciones de límites

---

## 📚 Referencias

- [OpenAI API Documentation](https://platform.openai.com/docs)
- [Gemini API Documentation](https://ai.google.dev/gemini-api/docs)
- [Gemini Models List](https://ai.google.dev/gemini-api/docs/models?hl=es-419)
- [NestJS TypeORM](https://docs.nestjs.com/techniques/database)
- [TanStack Query](https://tanstack.com/query/latest)

---

*Última actualización: Enero 2025*
*Versión: 2.0.0*