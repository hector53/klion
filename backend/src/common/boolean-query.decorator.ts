import { Transform } from "class-transformer";

/**
 * Parsea un booleano que llega por query string.
 *
 * El `ValidationPipe` global corre con `enableImplicitConversion: true`, y esa conversión
 * aplicada a un campo `boolean` convierte la string `"false"` en `true` (termina siendo un
 * `Boolean(value)` sobre una string no vacía). Resultado: `?isArchived=false` y
 * `?isArchived=true` se comportaban igual y el filtro consultaba siempre por `true`.
 *
 * Se detectó en `GET /tasks`: sin el parámetro devolvía 1031 tareas y con
 * `?isArchived=false` devolvía 0, porque terminaba pidiendo las archivadas (no hay ninguna).
 *
 * Clave: hay que leer `obj[key]`, el objeto plano **original**, y no el `value` que recibe
 * el transform — para cuando `@Transform` corre, la conversión implícita ya pasó y `value`
 * llega con el dato ya perdido (`"false"` convertido a `true`).
 *
 * Un valor que no sea reconocible se devuelve tal cual, para que `@IsBoolean()` responda
 * 400 en vez de adivinar.
 *
 * Usar en todo campo boolean que venga por query string; los que llegan en el body JSON no
 * lo necesitan, porque ahí ya son booleanos de verdad.
 */
export const BooleanQuery = () =>
  Transform(({ obj, key, value }) => {
    const raw = obj?.[key] ?? value;
    if (typeof raw === "boolean") return raw;
    if (raw === "true" || raw === "1") return true;
    if (raw === "false" || raw === "0") return false;
    return raw;
  });
