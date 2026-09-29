import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface GeminiContent {
  role: 'user' | 'model';
  parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }>;
}

interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{ text: string }>;
      role: string;
    };
    finishReason: string;
  }>;
}

export interface GeminiModelInfo {
  id: string;
  name: string;
  description: string;
  contextWindow: number;
}

// Chat/multimodal Gemini models only — excludes TTS, image-generation,
// robotics, computer-use and other non general-purpose-chat model families
// that also show up in the ListModels response.
const EXCLUDED_MODEL_PATTERN =
  /-tts|-image|-computer-use|-robotics|-er-\d|omni|deep-research|antigravity|lyria|gemma/i;

const MODELS_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

/**
 * Service for interacting with Google Gemini API
 */
@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private readonly apiKey: string | null;
  private readonly defaultModel: string;
  private readonly baseUrl = 'https://generativelanguage.googleapis.com/v1beta';
  private modelsCache: { data: GeminiModelInfo[]; fetchedAt: number } | null = null;

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('GEMINI_API_KEY') || null;
    this.defaultModel =
      this.configService.get<string>('GEMINI_MODEL') || 'gemini-2.5-flash';
    if (this.apiKey) {
      this.logger.log(`Gemini API configured (default model: ${this.defaultModel})`);
    } else {
      this.logger.warn('GEMINI_API_KEY not configured - chat will not work');
    }
  }

  /**
   * Check if Gemini is available
   */
  isAvailable(): boolean {
    return !!this.apiKey;
  }

  /**
   * The model used when no per-user setting or GEMINI_MODEL env var applies.
   */
  getDefaultModel(): string {
    return this.defaultModel;
  }

  /**
   * Fetch the live list of Gemini chat/multimodal models from Google's
   * ListModels endpoint, so the Settings model picker never goes stale
   * (Google retires/renames model ids over time — see gemini-2.0-flash).
   * Cached in memory for an hour; falls back to the last successful
   * fetch (or an empty list) if the API call fails.
   */
  async listModels(): Promise<GeminiModelInfo[]> {
    if (!this.apiKey) return [];

    if (
      this.modelsCache &&
      Date.now() - this.modelsCache.fetchedAt < MODELS_CACHE_TTL_MS
    ) {
      return this.modelsCache.data;
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/models?key=${this.apiKey}`,
      );

      if (!response.ok) {
        throw new Error(`Gemini models API error: ${response.status}`);
      }

      const data = await response.json();
      const models: GeminiModelInfo[] = (data.models || [])
        .filter(
          (m: any) =>
            typeof m.name === 'string' &&
            m.name.startsWith('models/gemini-') &&
            m.supportedGenerationMethods?.includes('generateContent') &&
            !EXCLUDED_MODEL_PATTERN.test(m.name),
        )
        .map((m: any) => ({
          id: m.name.replace('models/', ''),
          name: m.displayName || m.name.replace('models/', ''),
          description: m.description || '',
          contextWindow: m.inputTokenLimit || 0,
        }))
        .sort((a: GeminiModelInfo, b: GeminiModelInfo) => {
          // Newest version first; "-latest" alias ids (no version number)
          // sort to the very top since they always track Google's newest.
          const versionOf = (id: string) => {
            const match = id.match(/^gemini-(\d+(?:\.\d+)?)/);
            return match ? parseFloat(match[1]) : Infinity;
          };
          const diff = versionOf(b.id) - versionOf(a.id);
          return diff !== 0 ? diff : a.id.localeCompare(b.id);
        });

      this.modelsCache = { data: models, fetchedAt: Date.now() };
      return models;
    } catch (error) {
      this.logger.warn(`Failed to fetch Gemini models list: ${error.message}`);
      return this.modelsCache?.data || [];
    }
  }

  /**
   * Generate a chat response
   */
  async chat(
    message: string,
    options: {
      systemPrompt?: string;
      history?: Array<{ role: 'user' | 'assistant'; content: string }>;
      imageBase64?: string;
      imageMimeType?: string;
      images?: Array<{ base64: string; mimeType: string }>;
      temperature?: number;
      model?: string;
    } = {},
  ): Promise<string> {
    if (!this.apiKey) {
      throw new Error('Gemini API key not configured');
    }

    const model = options.model || this.defaultModel;

    const contents: GeminiContent[] = [];

    // Add system prompt as first user message if provided
    if (options.systemPrompt) {
      contents.push({
        role: 'user',
        parts: [{ text: `System: ${options.systemPrompt}` }],
      });
      contents.push({
        role: 'model',
        parts: [{ text: 'Understood. I will follow these instructions.' }],
      });
    }

    // Add conversation history
    if (options.history) {
      for (const msg of options.history) {
        contents.push({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }],
        });
      }
    }

    // Add current message with optional image(s)
    const currentParts: GeminiContent['parts'] = [];

    if (options.imageBase64 && options.imageMimeType) {
      currentParts.push({
        inlineData: {
          mimeType: options.imageMimeType,
          data: options.imageBase64,
        },
      });
    }

    if (options.images) {
      for (const image of options.images) {
        currentParts.push({
          inlineData: {
            mimeType: image.mimeType,
            data: image.base64,
          },
        });
      }
    }

    currentParts.push({ text: message });
    contents.push({ role: 'user', parts: currentParts });

    try {
      const response = await fetch(
        `${this.baseUrl}/models/${model}:generateContent?key=${this.apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents,
            generationConfig: {
              temperature: options.temperature ?? 0.7,
              topK: 40,
              topP: 0.95,
              maxOutputTokens: 8192,
            },
            safetySettings: [
              { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
              { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
              { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
              { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
            ],
          }),
        },
      );

      if (!response.ok) {
        const error = await response.text();
        this.logger.error(`Gemini API error: ${error}`);
        throw new Error(`Gemini API error: ${response.status}`);
      }

      const data: GeminiResponse = await response.json();

      if (!data.candidates || data.candidates.length === 0) {
        throw new Error('No response from Gemini');
      }

      const text = data.candidates[0].content.parts
        .map((p) => p.text)
        .filter(Boolean)
        .join('');

      return text;
    } catch (error) {
      this.logger.error(`Gemini chat error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generate a streaming chat response
   */
  async *chatStream(
    message: string,
    options: {
      systemPrompt?: string;
      history?: Array<{ role: 'user' | 'assistant'; content: string }>;
      imageBase64?: string;
      imageMimeType?: string;
      model?: string;
    } = {},
  ): AsyncGenerator<string> {
    if (!this.apiKey) {
      throw new Error('Gemini API key not configured');
    }

    const model = options.model || this.defaultModel;
    const contents: GeminiContent[] = [];

    // Add system prompt
    if (options.systemPrompt) {
      contents.push({
        role: 'user',
        parts: [{ text: `System: ${options.systemPrompt}` }],
      });
      contents.push({
        role: 'model',
        parts: [{ text: 'Understood. I will follow these instructions.' }],
      });
    }

    // Add history
    if (options.history) {
      for (const msg of options.history) {
        contents.push({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }],
        });
      }
    }

    // Add current message
    const currentParts: GeminiContent['parts'] = [];
    if (options.imageBase64 && options.imageMimeType) {
      currentParts.push({
        inlineData: {
          mimeType: options.imageMimeType,
          data: options.imageBase64,
        },
      });
    }
    currentParts.push({ text: message });
    contents.push({ role: 'user', parts: currentParts });

    try {
      const response = await fetch(
        `${this.baseUrl}/models/${model}:streamGenerateContent?key=${this.apiKey}&alt=sse`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents,
            generationConfig: {
              temperature: 0.7,
              topK: 40,
              topP: 0.95,
              maxOutputTokens: 8192,
            },
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const jsonStr = line.slice(6);
            if (jsonStr === '[DONE]') continue;

            try {
              const data = JSON.parse(jsonStr);
              const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
              if (text) {
                yield text;
              }
            } catch {
              // Skip invalid JSON
            }
          }
        }
      }
    } catch (error) {
      this.logger.error(`Gemini stream error: ${error.message}`);
      throw error;
    }
  }
}
