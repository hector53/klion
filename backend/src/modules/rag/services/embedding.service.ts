import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Service for generating text embeddings
 *
 * Supports multiple providers:
 * - Google Gemini (gemini-embedding-001)
 * - OpenAI (text-embedding-3-small)
 *
 * Falls back gracefully if no API key is configured.
 */
@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name);
  private readonly provider: 'gemini' | 'openai' | 'none';
  private readonly apiKey: string | null;
  private readonly dimensions = 1536; // Standard dimension for compatibility

  constructor(private configService: ConfigService) {
    // Check for available API keys
    const geminiKey = this.configService.get<string>('GEMINI_API_KEY');
    const openaiKey = this.configService.get<string>('OPENAI_API_KEY');

    if (geminiKey) {
      this.provider = 'gemini';
      this.apiKey = geminiKey;
      this.logger.log('Using Gemini for embeddings');
    } else if (openaiKey) {
      this.provider = 'openai';
      this.apiKey = openaiKey;
      this.logger.log('Using OpenAI for embeddings');
    } else {
      this.provider = 'none';
      this.apiKey = null;
      this.logger.warn(
        'No embedding API key configured. Semantic search will use text matching only.',
      );
    }
  }

  /**
   * Check if embeddings are available
   */
  isAvailable(): boolean {
    return this.provider !== 'none';
  }

  /**
   * Generate embedding for a single text
   */
  async generateEmbedding(text: string): Promise<number[] | null> {
    if (!this.isAvailable()) {
      return null;
    }

    try {
      if (this.provider === 'gemini') {
        return await this.generateGeminiEmbedding(text);
      } else if (this.provider === 'openai') {
        return await this.generateOpenAIEmbedding(text);
      }
      return null;
    } catch (error) {
      this.logger.error(`Failed to generate embedding: ${error.message}`);
      return null;
    }
  }

  /**
   * Generate embeddings for multiple texts (batch)
   */
  async generateEmbeddings(texts: string[]): Promise<(number[] | null)[]> {
    if (!this.isAvailable()) {
      return texts.map(() => null);
    }

    // Process in batches to avoid rate limits
    const batchSize = 10;
    const results: (number[] | null)[] = [];

    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map((text) => this.generateEmbedding(text)),
      );
      results.push(...batchResults);

      // Small delay between batches to avoid rate limits
      if (i + batchSize < texts.length) {
        await this.delay(100);
      }
    }

    return results;
  }

  /**
   * Generate embedding using Google Gemini
   */
  private async generateGeminiEmbedding(text: string): Promise<number[]> {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${this.apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'models/gemini-embedding-001',
          content: {
            parts: [{ text }],
          },
          outputDimensionality: this.dimensions,
        }),
      },
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Gemini API error: ${error}`);
    }

    const data = await response.json();
    return data.embedding.values;
  }

  /**
   * Generate embedding using OpenAI
   */
  private async generateOpenAIEmbedding(text: string): Promise<number[]> {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: text,
        dimensions: this.dimensions,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${error}`);
    }

    const data = await response.json();
    return data.data[0].embedding;
  }

  /**
   * Helper to delay execution
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
