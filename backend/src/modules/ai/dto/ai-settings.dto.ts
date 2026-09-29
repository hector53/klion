import { IsEnum, IsOptional, IsBoolean, IsNumber, IsString, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AIProvider, OpenAIModel } from '../entities/ai-settings.entity';

export class UpdateAISettingsDto {
  @ApiPropertyOptional({
    enum: AIProvider,
    description: 'Default AI provider to use',
    example: AIProvider.GEMINI,
  })
  @IsOptional()
  @IsEnum(AIProvider)
  defaultProvider?: AIProvider;

  @ApiPropertyOptional({
    enum: OpenAIModel,
    description: 'Default OpenAI model',
    example: OpenAIModel.GPT_4O_MINI,
  })
  @IsOptional()
  @IsEnum(OpenAIModel)
  openaiDefaultModel?: OpenAIModel;

  @ApiPropertyOptional({
    description:
      'Default Gemini model id. Not a fixed enum — see GET /ai/models for the current valid list.',
    example: 'gemini-2.5-flash',
  })
  @IsOptional()
  @IsString()
  geminiDefaultModel?: string;

  @ApiPropertyOptional({
    description: 'Enable AI suggestions',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  enableSuggestions?: boolean;

  @ApiPropertyOptional({
    description: 'Enable automatic summaries',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  enableAutoSummary?: boolean;

  @ApiPropertyOptional({
    description: 'Enable AI chat',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  enableChat?: boolean;

  @ApiPropertyOptional({
    description: 'Enable RAG (Retrieval Augmented Generation)',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  enableRAG?: boolean;

  @ApiPropertyOptional({
    description: 'Temperature for AI responses (0-1)',
    example: 0.7,
    minimum: 0,
    maximum: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  temperature?: number;

  @ApiPropertyOptional({
    description: 'Maximum tokens for AI responses',
    example: 8192,
    minimum: 256,
    maximum: 131072,
  })
  @IsOptional()
  @IsNumber()
  @Min(256)
  @Max(131072)
  maxTokens?: number;
}

export class AISettingsResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userId: string;

  @ApiProperty({ enum: AIProvider })
  defaultProvider: AIProvider;

  @ApiProperty({ enum: OpenAIModel })
  openaiDefaultModel: OpenAIModel;

  @ApiProperty({ example: 'gemini-2.5-flash' })
  geminiDefaultModel: string;

  @ApiProperty()
  enableSuggestions: boolean;

  @ApiProperty()
  enableAutoSummary: boolean;

  @ApiProperty()
  enableChat: boolean;

  @ApiProperty()
  enableRAG: boolean;

  @ApiProperty()
  temperature: number;

  @ApiProperty()
  maxTokens: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class AvailableModelsDto {
  @ApiProperty({
    description: 'Available OpenAI models',
    example: [
      { id: 'gpt-4o', name: 'GPT-4o', description: 'Most capable model' },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini', description: 'Faster and cheaper' },
    ],
  })
  openai: Array<{
    id: string;
    name: string;
    description: string;
    contextWindow: number;
    costPer1kTokens: number;
  }>;

  @ApiProperty({
    description: 'Available Gemini models',
    example: [
      { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', description: 'Fast and balanced' },
      { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', description: 'Most capable' },
    ],
  })
  gemini: Array<{
    id: string;
    name: string;
    description: string;
    contextWindow: number;
  }>;
}
