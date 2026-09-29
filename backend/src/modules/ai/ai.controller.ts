import { Controller, Post, Body, Get, Patch } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { AiService } from "./ai.service";
import { UsersService } from "../users/users.service";
import {
  ClientSummaryDto,
  ClientSummaryResponseDto,
  TodayPlanDto,
  TodayPlanResponseDto,
  WriteMessageDto,
  WriteMessageResponseDto,
  ChatRequestDto,
  ChatResponseDto,
  ParseConversationDto,
  ParseConversationResponseDto,
  CreateTasksFromParserDto,
  AnalyzeProjectNotesDto,
  RefineProjectNotesDto,
} from "./dto/ai.dto";
import {
  UpdateAISettingsDto,
  AISettingsResponseDto,
  AvailableModelsDto,
} from "./dto/ai-settings.dto";

@ApiTags("ai")
@Controller("ai")
export class AiController {
  constructor(
    private readonly aiService: AiService,
    private readonly usersService: UsersService,
  ) {}

  // =========================================================================
  // AI SETTINGS ENDPOINTS
  // =========================================================================

  @Get("settings")
  @ApiOperation({
    summary: "Obtener configuración de IA del usuario",
    description:
      "Retorna la configuración actual de IA del usuario autenticado",
  })
  @ApiResponse({ status: 200, type: AISettingsResponseDto })
  async getSettings(): Promise<AISettingsResponseDto> {
    // TODO: Get userId from authenticated session
    // For now, get the first user in the system
    const users = await this.usersService.findAll();
    if (users.length === 0) {
      throw new Error("No users found in the system");
    }
    const userId = users[0].id;
    return this.aiService.getSettings(userId);
  }

  @Patch("settings")
  @ApiOperation({
    summary: "Actualizar configuración de IA",
    description:
      "Actualiza las API keys, modelos por defecto y preferencias de IA",
  })
  @ApiResponse({ status: 200, type: AISettingsResponseDto })
  async updateSettings(
    @Body() dto: UpdateAISettingsDto,
  ): Promise<AISettingsResponseDto> {
    // TODO: Get userId from authenticated session
    // For now, get the first user in the system
    const users = await this.usersService.findAll();
    if (users.length === 0) {
      throw new Error("No users found in the system");
    }
    const userId = users[0].id;
    return this.aiService.updateSettings(userId, dto);
  }

  @Get("models")
  @ApiOperation({
    summary: "Obtener modelos disponibles",
    description:
      "Lista todos los modelos de OpenAI y Gemini disponibles con sus características",
  })
  @ApiResponse({ status: 200, type: AvailableModelsDto })
  getAvailableModels(): Promise<AvailableModelsDto> {
    return this.aiService.getAvailableModels();
  }

  // =========================================================================
  // AI FEATURES ENDPOINTS
  // =========================================================================

  @Post("client-summary")
  @ApiOperation({
    summary: "Obtener resumen del estado de trabajo con un cliente",
    description:
      "Analiza tareas abiertas, completadas, logs de trabajo y archivos para generar un resumen con prioridades y próximos pasos",
  })
  @ApiResponse({ status: 200, type: ClientSummaryResponseDto })
  getClientSummary(@Body() dto: ClientSummaryDto) {
    return this.aiService.getClientSummary(dto);
  }

  @Post("today-plan")
  @ApiOperation({
    summary: "Generar plan del día",
    description:
      "Basado en el tiempo disponible y los clientes activos, sugiere un plan de trabajo priorizado",
  })
  @ApiResponse({ status: 200, type: TodayPlanResponseDto })
  getTodayPlan(@Body() dto: TodayPlanDto) {
    return this.aiService.getTodayPlan(dto);
  }

  @Post("write-message")
  @ApiOperation({
    summary: "Redactar mensaje para cliente",
    description:
      "Genera un mensaje profesional basado en el contexto del cliente y tipo de comunicación",
  })
  @ApiResponse({ status: 200, type: WriteMessageResponseDto })
  writeMessage(@Body() dto: WriteMessageDto) {
    return this.aiService.writeMessage(dto);
  }

  @Post("chat")
  @ApiOperation({
    summary: "Chat con IA usando Gemini 2.0 Flash",
    description:
      "Chat multimodal con contexto de proyecto, conocimiento y búsqueda de código. Soporta texto e imágenes.",
  })
  @ApiResponse({ status: 200, type: ChatResponseDto })
  chat(@Body() dto: ChatRequestDto): Promise<ChatResponseDto> {
    return this.aiService.chat(dto);
  }

  @Post("parse-conversation")
  @ApiOperation({
    summary: "Parsear conversación y extraer tareas",
    description:
      "Analiza una conversación (texto pegado de Slack, WhatsApp, email, etc.) " +
      "y extrae tareas potenciales, decisiones y puntos pendientes.",
  })
  @ApiResponse({ status: 200, type: ParseConversationResponseDto })
  parseConversation(
    @Body() dto: ParseConversationDto,
  ): Promise<ParseConversationResponseDto> {
    return this.aiService.parseConversation(dto);
  }

  @Post("create-tasks-from-parser")
  @ApiOperation({
    summary: "Crear tareas desde resultado del parser",
    description:
      "Crea las tareas extraídas por el parser de conversaciones. " +
      "Permite crear múltiples tareas de una vez.",
  })
  createTasksFromParser(@Body() dto: CreateTasksFromParserDto) {
    return this.aiService.createTasksFromParser(dto);
  }

  @Post("analyze-project-notes")
  @ApiOperation({
    summary: "Analizar bloc de notas del proyecto y proponer tareas",
    description:
      "Analiza el bloc de notas (texto + capturas de pantalla pegadas) de un proyecto " +
      "usando Gemini multimodal y extrae tareas potenciales, decisiones y puntos pendientes.",
  })
  @ApiResponse({ status: 200, type: ParseConversationResponseDto })
  analyzeProjectNotes(
    @Body() dto: AnalyzeProjectNotesDto,
  ): Promise<ParseConversationResponseDto> {
    return this.aiService.analyzeProjectNotes(dto);
  }

  @Post("analyze-project-notes/refine")
  @ApiOperation({
    summary: "Refinar la propuesta de tareas según feedback del usuario",
    description:
      "Vuelve a analizar el bloc de notas del proyecto, esta vez incorporando " +
      "la propuesta anterior y el feedback del usuario, para devolver una " +
      "versión revisada de tareas, resumen, decisiones y puntos pendientes.",
  })
  @ApiResponse({ status: 200, type: ParseConversationResponseDto })
  refineProjectNotes(
    @Body() dto: RefineProjectNotesDto,
  ): Promise<ParseConversationResponseDto> {
    return this.aiService.refineProjectNotesAnalysis(dto);
  }
}
