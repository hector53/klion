/**
 * Helper functions for working with pgvector in TypeORM
 *
 * pgvector stores vectors as a special PostgreSQL type.
 * These helpers convert between JavaScript arrays and pgvector format.
 *
 * Note: We implement the conversion manually to avoid external dependencies
 * during development. The format is compatible with pgvector's expected input.
 */

/**
 * Convert a JavaScript number array to pgvector SQL format
 * @param vector - Array of numbers representing the embedding
 * @returns SQL-compatible string format for pgvector (e.g., "[0.1,0.2,0.3]")
 */
export function vectorToSql(vector: number[]): string {
  return `[${vector.join(",")}]`;
}

/**
 * Convert pgvector SQL format back to JavaScript array
 * @param sqlVector - pgvector string from database (e.g., "[0.1,0.2,0.3]")
 * @returns Array of numbers
 */
export function vectorFromSql(sqlVector: string): number[] {
  // Remove brackets and split by comma
  const cleaned = sqlVector.replace(/^\[|\]$/g, "");
  return cleaned.split(",").map(Number);
}

/**
 * Calculate cosine similarity between two vectors
 * Note: pgvector uses <=> operator for cosine distance (1 - similarity)
 * Lower distance = higher similarity
 */
export function cosineSimilarityQuery(
  columnName: string,
  vector: number[],
): string {
  return `${columnName} <=> '${vectorToSql(vector)}'`;
}

/**
 * Calculate L2 (Euclidean) distance between two vectors
 * Note: pgvector uses <-> operator for L2 distance
 */
export function l2DistanceQuery(columnName: string, vector: number[]): string {
  return `${columnName} <-> '${vectorToSql(vector)}'`;
}

/**
 * Calculate inner product between two vectors
 * Note: pgvector uses <#> operator for negative inner product
 */
export function innerProductQuery(
  columnName: string,
  vector: number[],
): string {
  return `${columnName} <#> '${vectorToSql(vector)}'`;
}

/**
 * Vector dimensions used in the project
 * - 1536: OpenAI text-embedding-ada-002, text-embedding-3-small
 * - 3072: OpenAI text-embedding-3-large
 * - 768: Google/Gemini embeddings
 */
export const VECTOR_DIMENSIONS = {
  OPENAI_ADA: 1536,
  OPENAI_SMALL: 1536,
  OPENAI_LARGE: 3072,
  GEMINI: 768,
} as const;

/**
 * Default vector dimension to use (OpenAI compatible)
 */
export const DEFAULT_VECTOR_DIMENSION = VECTOR_DIMENSIONS.OPENAI_SMALL;
