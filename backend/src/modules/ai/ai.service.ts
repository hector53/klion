import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { existsSync, readFileSync, statSync } from "fs";
import { join, basename, extname } from "path";
import OpenAI from "openai";
import { ClientsService } from "../clients/clients.service";
import { TasksService } from "../tasks/tasks.service";
import { WorklogsService } from "../worklogs/worklogs.service";
import { FilesService } from "../files/files.service";
import { ProjectsService } from "../projects/projects.service";
import { KnowledgeService } from "../knowledge/knowledge.service";
import { RagService } from "../rag/services/rag.service";
import { GeminiService } from "./gemini.service";
import { AISettings, AIProvider, OpenAIModel } from "./entities/ai-settings.entity";
import {
  UpdateAISettingsDto,
  AISettingsResponseDto,
  AvailableModelsDto,
} from "./dto/ai-settings.dto";
import {
  ClientSummaryDto,
  ClientSummaryResponseDto,
  TodayPlanDto,
  TodayPlanResponseDto,
  WriteMessageDto,
  WriteMessageResponseDto,
  MessageType,
  ChatRequestDto,
  ChatResponseDto,
  ParseConversationDto,
  ParseConversationResponseDto,
  CreateTasksFromParserDto,
  ExtractedTaskDto,
  AnalyzeProjectNotesDto,
  RefineProjectNotesDto,
} from "./dto/ai.dto";
import { Task, TaskStatus, TaskPriority } from "../tasks/entities/task.entity";

const UPLOADS_DIR = join(process.cwd(), "uploads");
const MAX_NOTE_IMAGES = 8;
const MAX_IMAGE_BYTES = 7 * 1024 * 1024;
const IMAGE_MIME_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
};

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private openai: OpenAI;

  constructor(
    @InjectRepository(AISettings)
    private readonly aiSettingsRepository: Repository<AISettings>,
    private readonly configService: ConfigService,
    private readonly clientsService: ClientsService,
    private readonly tasksService: TasksService,
    private readonly worklogsService: WorklogsService,
    private readonly filesService: FilesService,
    private readonly projectsService: ProjectsService,
    private readonly knowledgeService: KnowledgeService,
    private readonly ragService: RagService,
    private readonly geminiService: GeminiService,
  ) {
    this.openai = new OpenAI({
      apiKey: this.configService.get<string>("OPENAI_API_KEY"),
    });
  }

  // =========================================================================
  // AI SETTINGS METHODS
  // =========================================================================

  /**
   * Get AI settings for user (creates default if not exists)
   */
  async getSettings(userId: string): Promise<AISettingsResponseDto> {
    let settings = await this.aiSettingsRepository.findOne({
      where: { userId },
    });

    if (!settings) {
      // Create default settings
      settings = this.aiSettingsRepository.create({
        userId,
        defaultProvider: AIProvider.GEMINI,
        openaiDefaultModel: OpenAIModel.GPT_4O_MINI,
        geminiDefaultModel: this.geminiService.getDefaultModel(),
        enableSuggestions: true,
        enableAutoSummary: true,
        enableChat: true,
        enableRAG: true,
        temperature: 0.7,
        maxTokens: 8192,
      });
      settings = await this.aiSettingsRepository.save(settings);
    }

    const response: AISettingsResponseDto = {
      id: settings.id,
      userId: settings.userId,
      defaultProvider: settings.defaultProvider,
      openaiDefaultModel: settings.openaiDefaultModel,
      geminiDefaultModel: settings.geminiDefaultModel,
      enableSuggestions: settings.enableSuggestions,
      enableAutoSummary: settings.enableAutoSummary,
      enableChat: settings.enableChat,
      enableRAG: settings.enableRAG,
      temperature: settings.temperature,
      maxTokens: settings.maxTokens,
      createdAt: settings.createdAt,
      updatedAt: settings.updatedAt,
    };

    return response;
  }

  /**
   * Update AI settings for user
   */
  async updateSettings(
    userId: string,
    dto: UpdateAISettingsDto,
  ): Promise<AISettingsResponseDto> {
    let settings = await this.aiSettingsRepository.findOne({
      where: { userId },
    });

    if (!settings) {
      settings = this.aiSettingsRepository.create({ userId });
    }

    // Update fields
    Object.assign(settings, dto);

    settings = await this.aiSettingsRepository.save(settings);

    this.logger.log(`Updated AI settings for user ${userId}`);

    return this.getSettings(userId);
  }

  /**
   * Get available models
   */
  async getAvailableModels(): Promise<AvailableModelsDto> {
    const gemini = await this.geminiService.listModels();

    return {
      openai: [
        {
          id: "gpt-4o",
          name: "GPT-4o",
          description: "Modelo más capaz de OpenAI con multimodalidad",
          contextWindow: 128000,
          costPer1kTokens: 0.005,
        },
        {
          id: "gpt-4o-mini",
          name: "GPT-4o Mini",
          description: "Modelo rápido y económico (Recomendado)",
          contextWindow: 128000,
          costPer1kTokens: 0.00015,
        },
        {
          id: "gpt-4-turbo",
          name: "GPT-4 Turbo",
          description: "Modelo anterior de alto rendimiento",
          contextWindow: 128000,
          costPer1kTokens: 0.01,
        },
        {
          id: "gpt-3.5-turbo",
          name: "GPT-3.5 Turbo",
          description: "Modelo legacy, rápido y económico",
          contextWindow: 16385,
          costPer1kTokens: 0.0005,
        },
      ],
      // Fetched live from Google's ListModels endpoint (GeminiService.listModels,
      // cached 1h) so this never goes stale like a hardcoded list would.
      // Falls back to the last known-good static list if Gemini isn't
      // configured or the API call fails and nothing is cached yet.
      gemini:
        gemini.length > 0
          ? gemini
          : [
              {
                id: "gemini-2.5-flash",
                name: "Gemini 2.5 Flash",
                description: "Rápido e inteligente (Recomendado)",
                contextWindow: 1048576,
              },
              {
                id: "gemini-2.5-pro",
                name: "Gemini 2.5 Pro",
                description: "Modelo de pensamiento avanzado",
                contextWindow: 1048576,
              },
            ],
    };
  }

  /**
   * Get the configured default Gemini model from AI settings (Settings page
   * dropdown). Falls back to GeminiService's own default (GEMINI_MODEL env
   * var, or hardcoded) when no settings row exists yet.
   */
  private async getDefaultGeminiModel(): Promise<string | undefined> {
    const [settings] = await this.aiSettingsRepository.find({ take: 1 });
    return settings?.geminiDefaultModel;
  }

  // =========================================================================
  // AI FEATURES METHODS
  // =========================================================================

  /**
   * Generar resumen del estado de trabajo con un cliente
   */
  async getClientSummary(
    dto: ClientSummaryDto,
  ): Promise<ClientSummaryResponseDto> {
    const client = await this.clientsService.findOne(dto.clientId);
    const openTasks = await this.tasksService.getOpenTasksByClient(
      dto.clientId,
    );
    const completedRecently =
      await this.tasksService.getRecentlyCompletedByClient(dto.clientId);
    const recentWorklogs = await this.worklogsService.getRecentByClient(
      dto.clientId,
    );
    const recentFiles = await this.filesService.getRecentByClient(dto.clientId);
    const hoursThisWeek = await this.worklogsService.getHoursLoggedThisWeek(
      dto.clientId,
    );

    // Construir contexto para la IA
    const context = this.buildClientContext(
      client,
      openTasks,
      completedRecently,
      recentWorklogs,
      recentFiles,
    );

    const prompt = `Eres un asistente de gestión de proyectos. Analiza el siguiente estado de trabajo con el cliente y proporciona:
1. Un resumen conciso del estado actual (2-3 oraciones)
2. Lista de 3-5 prioridades principales
3. Lista de 3-5 próximos pasos sugeridos

Contexto del cliente:
${context}

Responde en formato JSON con esta estructura:
{
  "summary": "...",
  "priorities": ["...", "..."],
  "nextSteps": ["...", "..."]
}`;

    const response = await this.openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    const aiResponse = JSON.parse(response.choices[0].message.content || "{}");

    return {
      clientId: dto.clientId,
      clientName: client.name,
      summary: aiResponse.summary || "No se pudo generar resumen",
      priorities: aiResponse.priorities || [],
      nextSteps: aiResponse.nextSteps || [],
      stats: {
        openTasks: openTasks.length,
        completedRecently: completedRecently.length,
        hoursLoggedThisWeek: hoursThisWeek,
      },
    };
  }

  /**
   * Generar plan del día basado en tareas pendientes
   */
  async getTodayPlan(dto: TodayPlanDto): Promise<TodayPlanResponseDto> {
    // Obtener clientes activos (filtrados si se especificaron IDs)
    let clients = await this.clientsService.getActiveClientsWithOpenTasks();

    if (dto.clientIds?.length) {
      clients = clients.filter((c) => dto.clientIds!.includes(c.id));
    }

    // Recopilar todas las tareas abiertas
    const allTasks: any[] = [];
    for (const client of clients) {
      const tasks = await this.tasksService.getOpenTasksByClient(client.id);
      for (const task of tasks) {
        allTasks.push({
          taskId: task.id,
          taskTitle: task.title,
          clientName: client.name,
          priority: task.priority,
          status: task.status,
          dueDate: task.dueDate,
        });
      }
    }

    const prompt = `Eres un asistente de productividad. El usuario tiene ${dto.availableMinutes} minutos disponibles hoy.

Tareas pendientes:
${JSON.stringify(allTasks, null, 2)}

Genera un plan del día que:
1. Priorice tareas urgentes y de alta prioridad
2. Estime tiempo razonable para cada tarea (en minutos)
3. No exceda el tiempo disponible
4. Balancee trabajo entre diferentes clientes si es posible

Responde en formato JSON:
{
  "plan": "Descripción breve del plan del día",
  "suggestedTasks": [
    {
      "taskId": "...",
      "taskTitle": "...",
      "clientName": "...",
      "estimatedMinutes": 60,
      "reason": "Por qué priorizar esta tarea"
    }
  ],
  "totalEstimatedMinutes": 240
}`;

    const response = await this.openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    const aiResponse = JSON.parse(response.choices[0].message.content || "{}");

    return {
      plan: aiResponse.plan || "No se pudo generar plan",
      suggestedTasks: aiResponse.suggestedTasks || [],
      totalEstimatedMinutes: aiResponse.totalEstimatedMinutes || 0,
    };
  }

  /**
   * Redactar mensaje para enviar al cliente
   */
  async writeMessage(dto: WriteMessageDto): Promise<WriteMessageResponseDto> {
    const client = await this.clientsService.findOne(dto.clientId);

    let taskContext = "";
    if (dto.taskId) {
      const task = await this.tasksService.findOne(dto.taskId);
      taskContext = `\nTarea específica: "${task.title}" - ${task.description || "Sin descripción"}`;
    }

    const messageTypeDescriptions: Record<MessageType, string> = {
      [MessageType.REQUEST_INFO]:
        "Solicitar información o aclaraciones al cliente",
      [MessageType.PROGRESS_UPDATE]: "Informar sobre el progreso del trabajo",
      [MessageType.DELIVERABLE]: "Entregar un trabajo completado",
      [MessageType.FOLLOW_UP]: "Hacer seguimiento de algo pendiente",
      [MessageType.MEETING_REQUEST]: "Solicitar una reunión o llamada",
    };

    const prompt = `Eres un asistente que ayuda a redactar mensajes profesionales pero cercanos para clientes.

Cliente: ${client.name} (${client.company || "Sin empresa"})
Tipo de mensaje: ${messageTypeDescriptions[dto.messageType]}${taskContext}
${dto.additionalContext ? `Contexto adicional: ${dto.additionalContext}` : ""}

Redacta un mensaje breve (máximo 3-4 oraciones) en español, profesional pero amigable.
También sugiere 2-3 mejoras o alternativas.

Responde en formato JSON:
{
  "message": "El mensaje redactado...",
  "suggestions": ["Sugerencia 1", "Sugerencia 2"]
}`;

    const response = await this.openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.8,
    });

    const aiResponse = JSON.parse(response.choices[0].message.content || "{}");

    return {
      message: aiResponse.message || "No se pudo generar mensaje",
      suggestions: aiResponse.suggestions || [],
      messageType: dto.messageType,
    };
  }

  /**
   * Construir contexto del cliente para la IA
   */
  private buildClientContext(
    client: any,
    openTasks: any[],
    completedRecently: any[],
    recentWorklogs: any[],
    recentFiles: any[],
  ): string {
    let context = `Cliente: ${client.name}`;
    if (client.company) context += ` (${client.company})`;
    if (client.notes) context += `\nNotas: ${client.notes}`;

    context += `\n\nTareas abiertas (${openTasks.length}):`;
    for (const task of openTasks.slice(0, 10)) {
      context += `\n- [${task.priority}] ${task.title} (${task.status})`;
    }

    context += `\n\nTareas completadas recientemente (${completedRecently.length}):`;
    for (const task of completedRecently.slice(0, 5)) {
      context += `\n- ${task.title}`;
    }

    context += `\n\nActividad reciente:`;
    for (const log of recentWorklogs.slice(0, 5)) {
      context += `\n- ${log.loggedAt.toLocaleDateString()}: ${log.note}`;
    }

    if (recentFiles.length > 0) {
      context += `\n\nArchivos/links recientes:`;
      for (const file of recentFiles.slice(0, 5)) {
        context += `\n- ${file.title}`;
      }
    }

    return context;
  }

  /**
   * Chat con IA usando Gemini 2.0 Flash
   * Soporta contexto de proyecto, búsqueda de conocimiento y código
   */
  async chat(dto: ChatRequestDto): Promise<ChatResponseDto> {
    if (!this.geminiService.isAvailable()) {
      throw new Error(
        "Gemini API not configured. Set GEMINI_API_KEY in environment.",
      );
    }

    const sources: ChatResponseDto["sources"] = [];
    let systemPrompt = `Eres un asistente de desarrollo de software integrado en Klion, una herramienta de gestión de proyectos y tareas.
Tu objetivo es ayudar al desarrollador con:
- Responder preguntas sobre el proyecto actual
- Sugerir soluciones basadas en el conocimiento almacenado
- Ayudar a encontrar código relevante
- Extraer tareas de conversaciones
- Documentar decisiones y patrones

Responde de forma concisa y útil. Usa markdown para formatear código.
Si detectas que el usuario quiere crear una tarea o guardar conocimiento, sugiérelo al final.`;

    // Add project context if requested
    if (dto.projectId && dto.includeContext !== false) {
      try {
        const context = await this.projectsService.getFullContext(
          dto.projectId,
        );
        systemPrompt += `\n\n## Contexto del Proyecto Actual\n`;
        systemPrompt += `**Proyecto:** ${context.project.name}\n`;
        systemPrompt += `**Cliente:** ${context.client.name}\n`;
        if (context.context.stack) {
          systemPrompt += `**Stack:** ${context.context.stack}\n`;
        }
        if (context.context.rules && context.context.rules.length > 0) {
          systemPrompt += `**Reglas:** ${context.context.rules.join(", ")}\n`;
        }
        if (context.context.aiDescription) {
          systemPrompt += `**Descripción:** ${context.context.aiDescription}\n`;
        }
        systemPrompt += `\n**Estado:**\n`;
        systemPrompt += `- Tareas todo: ${context.currentState.tasksByStatus.todo}\n`;
        systemPrompt += `- Tareas en progreso: ${context.currentState.tasksByStatus.doing}\n`;
        systemPrompt += `- Tareas bloqueadas: ${context.currentState.tasksByStatus.blocked}\n`;

        if (context.currentState.blockedTasks.length > 0) {
          systemPrompt += `\n**Tareas bloqueadas:**\n`;
          for (const task of context.currentState.blockedTasks) {
            systemPrompt += `- ${task.title}\n`;
          }
        }

        sources.push({
          type: "context",
          title: `Proyecto: ${context.project.name}`,
        });
      } catch (error) {
        this.logger.warn(`Could not load project context: ${error.message}`);
      }
    }

    // Search knowledge if the message seems to need it
    if (dto.includeContext !== false) {
      try {
        const knowledgeResults = await this.knowledgeService.search({
          query: dto.message,
          projectId: dto.projectId,
          limit: 3,
        });

        if (knowledgeResults.length > 0) {
          systemPrompt += `\n\n## Conocimiento Relevante\n`;
          for (const k of knowledgeResults) {
            systemPrompt += `\n### ${k.title} (${k.type})\n`;
            systemPrompt += `${k.summary}\n`;
            sources.push({
              type: "knowledge",
              title: k.title,
              reference: k.id,
            });
          }
        }
      } catch (error) {
        this.logger.warn(`Could not search knowledge: ${error.message}`);
      }
    }

    // Search code if requested and project is indexed
    if (dto.projectId && dto.includeCodeSearch) {
      try {
        const codeResults = await this.ragService.searchCode({
          query: dto.message,
          projectId: dto.projectId,
          limit: 3,
          useSemanticSearch: false, // Text search for now
        });

        if (codeResults.length > 0) {
          systemPrompt += `\n\n## Código Relevante\n`;
          for (const c of codeResults) {
            systemPrompt += `\n### ${c.filePath} (líneas ${c.startLine}-${c.endLine})\n`;
            systemPrompt += "```" + c.fileType + "\n";
            systemPrompt += c.content.slice(0, 500);
            if (c.content.length > 500) systemPrompt += "\n// ...truncado";
            systemPrompt += "\n```\n";
            sources.push({
              type: "code",
              title: c.filePath,
              reference: `${c.startLine}-${c.endLine}`,
            });
          }
        }
      } catch (error) {
        this.logger.warn(`Could not search code: ${error.message}`);
      }
    }

    // Handle image if provided
    let imageBase64: string | undefined;
    if (dto.imageUrl) {
      // If it's a data URL, extract the base64 part
      if (dto.imageUrl.startsWith("data:")) {
        const matches = dto.imageUrl.match(/^data:([^;]+);base64,(.+)$/);
        if (matches) {
          imageBase64 = matches[2];
        }
      } else {
        // It's already base64
        imageBase64 = dto.imageUrl;
      }
    }

    // Convert history format
    const history = dto.history?.map((h) => ({
      role: h.role as "user" | "assistant",
      content: h.content,
    }));

    // Call Gemini
    const model = await this.getDefaultGeminiModel();
    const response = await this.geminiService.chat(dto.message, {
      systemPrompt,
      history,
      imageBase64,
      imageMimeType: dto.imageMimeType || "image/jpeg",
      model,
    });

    // Detect suggested actions
    const suggestedActions: ChatResponseDto["suggestedActions"] = [];

    // Check if response suggests creating a task
    if (
      response.toLowerCase().includes("crear tarea") ||
      response.toLowerCase().includes("nueva tarea") ||
      response.toLowerCase().includes("agregar tarea")
    ) {
      suggestedActions.push({
        type: "create_task",
        label: "Crear tarea",
        data: { fromChat: true },
      });
    }

    // Check if response contains code that could be saved
    if (response.includes("```") && response.length > 200) {
      suggestedActions.push({
        type: "save_knowledge",
        label: "Guardar como snippet",
        data: { type: "snippet" },
      });
    }

    return {
      message: response,
      suggestedActions:
        suggestedActions.length > 0 ? suggestedActions : undefined,
      sources: sources.length > 0 ? sources : undefined,
      model: model || "gemini-2.5-flash",
    };
  }

  /**
   * Parse a conversation and extract potential tasks
   * This is the main method for the conversation parser feature
   */
  async parseConversation(
    dto: ParseConversationDto,
  ): Promise<ParseConversationResponseDto> {
    // Get optional context
    let contextInfo = "";
    if (dto.projectId) {
      try {
        const project = await this.projectsService.findOne(dto.projectId);
        contextInfo += `\nProyecto: ${project.name}`;
        if (project.description) {
          contextInfo += ` - ${project.description}`;
        }
      } catch {
        // Project not found, continue without context
      }
    }

    if (dto.clientId) {
      try {
        const client = await this.clientsService.findOne(dto.clientId);
        contextInfo += `\nCliente: ${client.name}`;
      } catch {
        // Client not found, continue without context
      }
    }

    if (dto.context) {
      contextInfo += `\nContexto adicional: ${dto.context}`;
    }

    const prompt = `Analiza la siguiente conversación y extrae información útil para gestión de proyectos.
${contextInfo}

CONVERSACIÓN:
---
${dto.conversation}
---

Extrae:
1. Un resumen breve de la conversación (1-2 oraciones)
2. Tareas potenciales que se mencionan o implican (acciones a realizar)
3. Decisiones técnicas o de diseño tomadas
4. Preguntas pendientes o puntos sin resolver

Para cada tarea incluye:
- title: Título claro y accionable (empezar con verbo)
- description: Descripción estructurada y accionable (2-4 líneas): qué ocurre o qué se pide (contexto), el resultado esperado, y pasos o criterios de aceptación concretos cuando el material lo permita. Si el contexto disponible es mínimo, sé breve — no inventes detalles que no estén en la nota/conversación ni en las capturas
- priority: "low", "medium" o "high" según urgencia/importancia
- tags: Etiquetas relevantes (tecnología, área, etc)
- confidence: 0-1 indicando qué tan seguro estás de que es una tarea real
- sourceText: El fragmento de texto de donde se extrajo

Responde en JSON:
{
  "summary": "...",
  "tasks": [
    {
      "title": "Implementar autenticación OAuth",
      "description": "Integrar login con Google y GitHub",
      "priority": "high",
      "tags": ["auth", "backend"],
      "confidence": 0.9,
      "sourceText": "necesitamos implementar OAuth..."
    }
  ],
  "decisions": ["Usar PostgreSQL en lugar de MongoDB", ...],
  "pendingQuestions": ["¿Qué proveedor de email usar?", ...]
}`;

    const response = await this.openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.5,
    });

    const aiResponse = JSON.parse(response.choices[0].message.content || "{}");

    // Ensure tasks have all required fields
    const tasks: ExtractedTaskDto[] = (aiResponse.tasks || []).map(
      (task: any) => ({
        title: task.title || "Tarea sin título",
        description: task.description,
        priority: task.priority || "medium",
        tags: task.tags || [],
        confidence: task.confidence || 0.5,
        sourceText: task.sourceText || "",
      }),
    );

    return {
      summary: aiResponse.summary || "No se pudo generar resumen",
      tasks,
      decisions: aiResponse.decisions || [],
      pendingQuestions: aiResponse.pendingQuestions || [],
      taskCount: tasks.length,
    };
  }

  /**
   * Create tasks from parsed conversation results
   * Allows user to select which tasks to create
   */
  async createTasksFromParser(
    dto: CreateTasksFromParserDto,
  ): Promise<{ created: Task[]; failed: string[] }> {
    let clientId = dto.clientId;
    if (!clientId && dto.projectId) {
      const project = await this.projectsService.findOne(dto.projectId);
      clientId = project.clientId;
    }

    const created: Task[] = [];
    const failed: string[] = [];

    for (const taskData of dto.tasks) {
      try {
        // Map string priority to enum
        const priorityMap: Record<string, TaskPriority> = {
          low: TaskPriority.LOW,
          medium: TaskPriority.MEDIUM,
          high: TaskPriority.HIGH,
        };

        const task = await this.tasksService.create({
          clientId,
          projectId: dto.projectId,
          title: taskData.title,
          description: taskData.description,
          priority: priorityMap[taskData.priority] || TaskPriority.MEDIUM,
          tags: taskData.tags,
          status: TaskStatus.TODO,
        });
        created.push(task);
      } catch (error) {
        this.logger.warn(`Failed to create task: ${taskData.title}`, error);
        failed.push(taskData.title);
      }
    }

    return { created, failed };
  }

  /**
   * Strip HTML from the note content into plain text, preserving image
   * positions as markers so the AI can correlate text around screenshots.
   */
  private noteHtmlToText(html: string): string {
    return html
      .replace(/<img[^>]*>/gi, "\n[captura de pantalla adjunta]\n")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|li|h[1-6]|tr)>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  /**
   * Extract uploaded image filenames referenced in the note HTML and load
   * them from disk as base64, ready for Gemini's multimodal input.
   */
  private loadNoteImages(
    html: string,
  ): Array<{ base64: string; mimeType: string }> {
    const filenames = new Set<string>();
    const regex = /\/files\/serve\/([^/?#"']+)/gi;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(html)) !== null) {
      filenames.add(basename(match[1]));
    }

    const images: Array<{ base64: string; mimeType: string }> = [];
    for (const filename of filenames) {
      if (images.length >= MAX_NOTE_IMAGES) break;

      const mimeType = IMAGE_MIME_TYPES[extname(filename).toLowerCase()];
      if (!mimeType) continue;

      const filePath = join(UPLOADS_DIR, filename);
      if (!existsSync(filePath)) {
        this.logger.warn(`Note image not found on disk: ${filename}`);
        continue;
      }

      if (statSync(filePath).size > MAX_IMAGE_BYTES) {
        this.logger.warn(`Note image too large, skipping: ${filename}`);
        continue;
      }

      images.push({
        base64: readFileSync(filePath).toString("base64"),
        mimeType,
      });
    }

    return images;
  }

  /**
   * Parse a possibly fenced/prefixed JSON response from Gemini (no native
   * JSON mode) into an object, with a couple of fallback strategies.
   */
  private parseGeminiJson(raw: string): any {
    const stripped = raw
      .trim()
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();

    try {
      return JSON.parse(stripped);
    } catch {
      // fall through
    }

    const start = stripped.indexOf("{");
    const end = stripped.lastIndexOf("}");
    if (start !== -1 && end !== -1 && end > start) {
      try {
        return JSON.parse(stripped.slice(start, end + 1));
      } catch {
        // fall through
      }
    }

    throw new InternalServerErrorException(
      "La IA devolvió una respuesta inválida. Intenta de nuevo.",
    );
  }

  /**
   * Load a project's scratchpad note context (project info, note text,
   * pasted screenshots) shared by the initial analysis and its refinement.
   */
  private async loadNoteContext(projectId: string): Promise<{
    contextInfo: string;
    text: string;
    images: Array<{ base64: string; mimeType: string }>;
  }> {
    const project = await this.projectsService.findOne(projectId);
    const note = await this.projectsService.getOrCreateNote(projectId);

    const text = this.noteHtmlToText(note.content || "");
    const images = this.loadNoteImages(note.content || "");

    if (!text && images.length === 0) {
      throw new BadRequestException(
        "El bloc de notas está vacío. Escribe algo antes de generar tareas.",
      );
    }

    let contextInfo = `\nProyecto: ${project.name}`;
    if (project.description) contextInfo += ` - ${project.description}`;

    return { contextInfo, text, images };
  }

  private buildTasksFromAiResponse(aiResponse: any): ExtractedTaskDto[] {
    return (aiResponse.tasks || []).map((task: any) => ({
      title: task.title || "Tarea sin título",
      description: task.description,
      priority: task.priority || "medium",
      tags: task.tags || [],
      confidence: task.confidence || 0.5,
      sourceText: task.sourceText || "",
    }));
  }

  /**
   * Analyze a project's scratchpad note (text + pasted screenshots) with
   * Gemini multimodal and propose a list of tasks for the user to review.
   */
  async analyzeProjectNotes(
    dto: AnalyzeProjectNotesDto,
  ): Promise<ParseConversationResponseDto> {
    if (!this.geminiService.isAvailable()) {
      throw new InternalServerErrorException(
        "Gemini API no está configurada. Define GEMINI_API_KEY.",
      );
    }

    const { contextInfo, text, images } = await this.loadNoteContext(
      dto.projectId,
    );

    const prompt = `Eres un asistente que ayuda a un desarrollador a convertir sus notas de pruebas (bugs encontrados, pendientes, ideas) en tareas accionables. Puede incluir capturas de pantalla de errores.
${contextInfo}

NOTAS DEL PROYECTO:
---
${text || "(sin texto, solo capturas de pantalla adjuntas)"}
---

${images.length > 0 ? `Se adjuntan ${images.length} captura(s) de pantalla en el orden en que aparecen en las notas. Analízalas para detectar errores visuales, mensajes de error, o comportamiento incorrecto de la UI, y correlaciónalas con el texto cercano.\n` : ""}
Extrae:
1. Un resumen breve de las notas (1-2 oraciones)
2. Tareas potenciales (bugs a corregir, funcionalidades pendientes) que se mencionan o se ven en las capturas
3. Decisiones técnicas o de diseño que se mencionen
4. Preguntas pendientes o puntos sin resolver

Para cada tarea incluye:
- title: Título claro y accionable (empezar con verbo)
- description: Descripción estructurada y accionable (2-4 líneas): qué ocurre o qué se pide (contexto), el resultado esperado, y pasos o criterios de aceptación concretos cuando el material lo permita. Si el contexto disponible es mínimo, sé breve — no inventes detalles que no estén en la nota/conversación ni en las capturas
- priority: "low", "medium" o "high" según urgencia/importancia
- tags: Etiquetas relevantes (tecnología, área, etc)
- confidence: 0-1 indicando qué tan seguro estás de que es una tarea real
- sourceText: El fragmento de texto o descripción de la captura de donde se extrajo

Responde ÚNICAMENTE con el objeto JSON, sin markdown, con esta estructura:
{
  "summary": "...",
  "tasks": [
    {
      "title": "Corregir botón de login que no responde en móvil",
      "description": "El botón de login no responde al hacer tap en Safari iOS (ver captura). Objetivo: que el evento se registre correctamente en todos los navegadores móviles. Revisar el listener de click/touch del componente de login y probar en un dispositivo real.",
      "priority": "high",
      "tags": ["bug", "frontend"],
      "confidence": 0.9,
      "sourceText": "el botón de login no responde en móvil..."
    }
  ],
  "decisions": ["..."],
  "pendingQuestions": ["..."]
}`;

    const raw = await this.geminiService.chat(prompt, {
      images,
      temperature: 0.4,
      model: await this.getDefaultGeminiModel(),
    });

    const aiResponse = this.parseGeminiJson(raw);
    const tasks = this.buildTasksFromAiResponse(aiResponse);

    await this.projectsService.markNoteAnalyzed(dto.projectId);

    return {
      summary: aiResponse.summary || "No se pudo generar resumen",
      tasks,
      decisions: aiResponse.decisions || [],
      pendingQuestions: aiResponse.pendingQuestions || [],
      taskCount: tasks.length,
    };
  }

  /**
   * Re-run the project notes analysis, incorporating the user's feedback on
   * a previously proposed task list. Single-shot per call (not a multi-turn
   * Gemini chat) — re-sends the note context plus the previous proposal and
   * the feedback, and asks for a revised proposal with the same shape.
   */
  async refineProjectNotesAnalysis(
    dto: RefineProjectNotesDto,
  ): Promise<ParseConversationResponseDto> {
    if (!this.geminiService.isAvailable()) {
      throw new InternalServerErrorException(
        "Gemini API no está configurada. Define GEMINI_API_KEY.",
      );
    }

    const { contextInfo, text, images } = await this.loadNoteContext(
      dto.projectId,
    );

    const previousTasksJson = JSON.stringify(dto.previousTasks, null, 2);

    const prompt = `Eres un asistente que ayuda a un desarrollador a convertir sus notas de pruebas (bugs encontrados, pendientes, ideas) en tareas accionables. Ya generaste una propuesta de tareas y el usuario quiere que la ajustes según su feedback.
${contextInfo}

NOTAS DEL PROYECTO:
---
${text || "(sin texto, solo capturas de pantalla adjuntas)"}
---

${images.length > 0 ? `Se adjuntan ${images.length} captura(s) de pantalla en el orden en que aparecen en las notas.\n` : ""}
PROPUESTA ANTERIOR${dto.previousSummary ? ` (resumen: "${dto.previousSummary}")` : ""}:
${previousTasksJson}

FEEDBACK DEL USUARIO SOBRE LA PROPUESTA ANTERIOR:
"${dto.feedback}"

Genera una versión revisada de la propuesta que incorpore el feedback. Puedes combinar, dividir, eliminar, agregar o ajustar tareas según corresponda. Para cada tarea incluye:
- title: Título claro y accionable (empezar con verbo)
- description: Descripción estructurada y accionable (2-4 líneas): qué ocurre o qué se pide (contexto), el resultado esperado, y pasos o criterios de aceptación concretos cuando el material lo permita. Si el contexto disponible es mínimo, sé breve — no inventes detalles que no estén en la nota/conversación ni en las capturas
- priority: "low", "medium" o "high" según urgencia/importancia
- tags: Etiquetas relevantes (tecnología, área, etc)
- confidence: 0-1 indicando qué tan seguro estás de que es una tarea real
- sourceText: El fragmento de texto o descripción de la captura de donde se extrajo

Responde ÚNICAMENTE con el objeto JSON, sin markdown, con esta estructura:
{
  "summary": "...",
  "tasks": [...],
  "decisions": ["..."],
  "pendingQuestions": ["..."]
}`;

    const raw = await this.geminiService.chat(prompt, {
      images,
      temperature: 0.4,
      model: await this.getDefaultGeminiModel(),
    });

    const aiResponse = this.parseGeminiJson(raw);
    const tasks = this.buildTasksFromAiResponse(aiResponse);

    await this.projectsService.markNoteAnalyzed(dto.projectId);

    return {
      summary:
        aiResponse.summary || dto.previousSummary || "No se pudo generar resumen",
      tasks,
      decisions: aiResponse.decisions || [],
      pendingQuestions: aiResponse.pendingQuestions || [],
      taskCount: tasks.length,
    };
  }
}
