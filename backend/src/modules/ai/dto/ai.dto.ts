import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsString,
  IsOptional,
  IsUUID,
  IsInt,
  Min,
  Max,
  MaxLength,
  IsEnum,
  IsArray,
  IsNumber,
  ValidateNested,
} from "class-validator";

export class ClientSummaryDto {
  @ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440000" })
  @IsUUID()
  clientId: string;
}

export class TodayPlanDto {
  @ApiProperty({ example: 480, description: "Minutos disponibles hoy" })
  @IsInt()
  @Min(1)
  availableMinutes: number;

  @ApiPropertyOptional({
    description: "IDs de clientes a considerar (vacío = todos activos)",
    type: [String],
  })
  @IsOptional()
  @IsUUID("4", { each: true })
  clientIds?: string[];
}

export enum MessageType {
  REQUEST_INFO = "request_info",
  PROGRESS_UPDATE = "progress_update",
  DELIVERABLE = "deliverable",
  FOLLOW_UP = "follow_up",
  MEETING_REQUEST = "meeting_request",
}

export class WriteMessageDto {
  @ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440000" })
  @IsUUID()
  clientId: string;

  @ApiPropertyOptional({ example: "550e8400-e29b-41d4-a716-446655440001" })
  @IsOptional()
  @IsUUID()
  taskId?: string;

  @ApiProperty({ enum: MessageType, example: MessageType.PROGRESS_UPDATE })
  @IsEnum(MessageType)
  messageType: MessageType;

  @ApiPropertyOptional({
    example: "Mencionar que terminé el módulo de pagos",
    description: "Contexto adicional para el mensaje",
  })
  @IsOptional()
  @IsString()
  additionalContext?: string;
}

// Response DTOs
export class ClientSummaryResponseDto {
  @ApiProperty()
  clientId: string;

  @ApiProperty()
  clientName: string;

  @ApiProperty({ description: "Resumen del estado actual" })
  summary: string;

  @ApiProperty({ description: "Lista de prioridades", type: [String] })
  priorities: string[];

  @ApiProperty({ description: "Próximos pasos sugeridos", type: [String] })
  nextSteps: string[];

  @ApiProperty({ description: "Estadísticas rápidas" })
  stats: {
    openTasks: number;
    completedRecently: number;
    hoursLoggedThisWeek: number;
  };
}

export class TodayPlanResponseDto {
  @ApiProperty({ description: "Plan del día generado" })
  plan: string;

  @ApiProperty({ description: "Tareas sugeridas en orden de prioridad" })
  suggestedTasks: {
    taskId: string;
    taskTitle: string;
    clientName: string;
    estimatedMinutes: number;
    reason: string;
  }[];

  @ApiProperty()
  totalEstimatedMinutes: number;
}

export class WriteMessageResponseDto {
  @ApiProperty({ description: "Mensaje redactado" })
  message: string;

  @ApiProperty({ description: "Sugerencias de mejora" })
  suggestions: string[];

  @ApiProperty({ enum: MessageType })
  messageType: MessageType;
}

// Chat DTOs
export class ChatMessageDto {
  @ApiProperty({ enum: ["user", "assistant"], example: "user" })
  @IsString()
  role: "user" | "assistant";

  @ApiProperty({
    example: "Hola, necesito ayuda con el módulo de autenticación",
  })
  @IsString()
  content: string;

  @ApiPropertyOptional({ description: "Image URL or base64 for multimodal" })
  @IsOptional()
  @IsString()
  imageUrl?: string;
}

export class ChatRequestDto {
  @ApiProperty({ description: "User message" })
  @IsString()
  message: string;

  @ApiPropertyOptional({ description: "Project ID for context" })
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @ApiPropertyOptional({ description: "Previous conversation history" })
  @IsOptional()
  history?: ChatMessageDto[];

  @ApiPropertyOptional({ description: "Include project context automatically" })
  @IsOptional()
  includeContext?: boolean;

  @ApiPropertyOptional({ description: "Include RAG code search results" })
  @IsOptional()
  includeCodeSearch?: boolean;

  @ApiPropertyOptional({ description: "Image URL or base64 data" })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiPropertyOptional({ description: "Image MIME type" })
  @IsOptional()
  @IsString()
  imageMimeType?: string;
}

export class ChatResponseDto {
  @ApiProperty({ description: "AI response message" })
  message: string;

  @ApiPropertyOptional({ description: "Suggested actions based on response" })
  suggestedActions?: Array<{
    type: "create_task" | "save_knowledge" | "search_code";
    label: string;
    data: any;
  }>;

  @ApiPropertyOptional({ description: "Sources used for the response" })
  sources?: Array<{
    type: "context" | "knowledge" | "code";
    title: string;
    reference?: string;
  }>;

  @ApiProperty({ description: "Model used for the response" })
  model: string;
}

// Parser de Conversaciones DTOs
export class ParseConversationDto {
  @ApiProperty({ description: "Conversación a parsear (texto completo)" })
  @IsString()
  conversation: string;

  @ApiPropertyOptional({ description: "ID del cliente para las tareas" })
  @IsOptional()
  @IsUUID()
  clientId?: string;

  @ApiPropertyOptional({ description: "ID del proyecto para las tareas" })
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @ApiPropertyOptional({
    description: "Contexto adicional para mejorar la extracción",
  })
  @IsOptional()
  @IsString()
  context?: string;
}

export class ExtractedTaskDto {
  @ApiProperty({ description: "Título sugerido para la tarea" })
  @IsString()
  title: string;

  @ApiPropertyOptional({ description: "Descripción detallada" })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    enum: ["low", "medium", "high"],
    description: "Prioridad sugerida",
  })
  @IsEnum(["low", "medium", "high"])
  priority: "low" | "medium" | "high";

  @ApiPropertyOptional({ description: "Tags sugeridos" })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiProperty({
    description: "Confianza de la extracción (0-1)",
    example: 0.85,
  })
  @IsNumber()
  @Min(0)
  @Max(1)
  confidence: number;

  @ApiProperty({
    description: "Texto original de donde se extrajo",
    example: "Necesitamos implementar la autenticación con OAuth",
  })
  @IsString()
  sourceText: string;
}

export class ParseConversationResponseDto {
  @ApiProperty({
    description: "Resumen de la conversación",
    example: "Discusión sobre implementación de autenticación y pagos",
  })
  summary: string;

  @ApiProperty({
    description: "Tareas extraídas de la conversación",
    type: [ExtractedTaskDto],
  })
  tasks: ExtractedTaskDto[];

  @ApiPropertyOptional({
    description: "Decisiones técnicas identificadas",
    type: [String],
  })
  decisions?: string[];

  @ApiPropertyOptional({
    description: "Puntos pendientes o dudas",
    type: [String],
  })
  pendingQuestions?: string[];

  @ApiProperty({ description: "Cantidad de tareas extraídas" })
  taskCount: number;
}

export class CreateTasksFromParserDto {
  @ApiPropertyOptional({
    description:
      "Cliente para las tareas (opcional si se provee projectId; se deriva del proyecto)",
  })
  @IsOptional()
  @IsUUID()
  clientId?: string;

  @ApiPropertyOptional({ description: "Proyecto para las tareas" })
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @ApiProperty({
    description: "Tareas a crear (del resultado del parser)",
    type: [ExtractedTaskDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExtractedTaskDto)
  tasks: ExtractedTaskDto[];
}

// Notas de proyecto DTOs
export class AnalyzeProjectNotesDto {
  @ApiProperty({ description: "ID del proyecto cuyo bloc de notas se analiza" })
  @IsUUID()
  projectId: string;
}

export class RefineProjectNotesDto {
  @ApiProperty({ description: "ID del proyecto cuyo bloc de notas se analiza" })
  @IsUUID()
  projectId: string;

  @ApiProperty({
    description: "Tareas propuestas en el intento anterior, a revisar según el feedback",
    type: [ExtractedTaskDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExtractedTaskDto)
  previousTasks: ExtractedTaskDto[];

  @ApiPropertyOptional({ description: "Resumen del intento anterior" })
  @IsOptional()
  @IsString()
  previousSummary?: string;

  @ApiProperty({
    description: "Feedback del usuario para refinar las tareas propuestas",
    example: "Combina las dos primeras en una sola tarea de alta prioridad",
  })
  @IsString()
  @MaxLength(2000)
  feedback: string;
}
