# Configuración de pgvector para Klion

pgvector es una extensión de PostgreSQL que permite almacenar y buscar vectores (embeddings). Es necesario para las funcionalidades de Knowledge Base y RAG.

## Instalación

### Opción 1: macOS con Homebrew (Recomendado para desarrollo local)

```bash
# Si tienes PostgreSQL instalado con Homebrew
brew install pgvector

# Reiniciar PostgreSQL
brew services restart postgresql@15
# o
brew services restart postgresql
```

### Opción 2: Docker (Recomendado para producción)

El `docker-compose.yml` ya está configurado con la imagen `pgvector/pgvector:pg15`.

```bash
# Desde la raíz del proyecto
docker-compose up -d postgres

# Verificar que pgvector está instalado
docker exec -it klion-db psql -U postgres -d clientboard -c "SELECT extname FROM pg_extension WHERE extname = 'vector';"
```

### Opción 3: Compilar desde fuente

```bash
# Clonar pgvector
git clone --branch v0.6.0 https://github.com/pgvector/pgvector.git
cd pgvector

# Compilar e instalar
make
make install # puede requerir sudo
```

## Verificación

Después de instalar, el backend de Klion habilitará automáticamente la extensión al iniciar. Verás en los logs:

```
[DatabaseModule] pgvector extension enabled successfully
```

O si ya estaba habilitada:

```
[DatabaseModule] pgvector extension already enabled
```

### Verificación manual

```bash
# Conectar a PostgreSQL
psql -U postgres -d clientboard

# Verificar extensión
SELECT extname, extversion FROM pg_extension WHERE extname = 'vector';

# Debería mostrar:
#  extname | extversion
# ---------+------------
#  vector  | 0.6.0
```

## Uso en el código

El helper `pgvector.helper.ts` proporciona funciones para trabajar con vectores:

```typescript
import { vectorToSql, cosineSimilarityQuery, DEFAULT_VECTOR_DIMENSION } from '../common';

// Convertir array a formato SQL
const embedding = [0.1, 0.2, 0.3, ...]; // 1536 dimensiones
const sqlVector = vectorToSql(embedding);

// Query de similitud coseno
const query = `
  SELECT * FROM knowledge
  ORDER BY ${cosineSimilarityQuery('embedding', embedding)}
  LIMIT 5
`;
```

## Dimensiones de vectores

| Modelo | Dimensiones |
|--------|-------------|
| OpenAI text-embedding-ada-002 | 1536 |
| OpenAI text-embedding-3-small | 1536 |
| OpenAI text-embedding-3-large | 3072 |
| Google/Gemini | 768 |

Klion usa 1536 dimensiones por defecto (compatible con OpenAI).

## Troubleshooting

### "extension 'vector' is not available"

La extensión no está instalada en PostgreSQL. Sigue los pasos de instalación arriba.

### "permission denied to create extension"

Necesitas ser superusuario de PostgreSQL:

```sql
ALTER USER postgres WITH SUPERUSER;
```

### Rendimiento lento en búsquedas

Crear índice HNSW para búsquedas más rápidas:

```sql
CREATE INDEX ON knowledge USING hnsw (embedding vector_cosine_ops);
```
