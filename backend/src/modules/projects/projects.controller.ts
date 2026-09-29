import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  UseGuards,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiBearerAuth,
  ApiSecurity,
} from "@nestjs/swagger";
import { JwtOrServiceKeyGuard } from "../auth/guards/jwt-or-service-key.guard";
import { ProjectsService } from "./projects.service";
import {
  CreateProjectDto,
  UpdateProjectDto,
  ProjectFilterDto,
} from "./dto/project.dto";
import {
  CreateProjectContextDto,
  UpdateProjectContextDto,
  FullProjectContextResponseDto,
} from "./dto/project-context.dto";
import { UpdateProjectNoteDto } from "./dto/project-note.dto";
import { UpdateProjectSharingDto } from "./dto/project-sharing.dto";

@ApiTags("Projects")
@ApiBearerAuth()
@ApiSecurity("service-key")
@UseGuards(JwtOrServiceKeyGuard)
@Controller("projects")
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  @ApiOperation({ summary: "Create a new project" })
  create(@Body() createProjectDto: CreateProjectDto) {
    return this.projectsService.create(createProjectDto);
  }

  @Get()
  @ApiOperation({ summary: "List all projects with optional filters" })
  findAll(@Query() filters: ProjectFilterDto) {
    return this.projectsService.findAll(filters);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get a project by ID" })
  findOne(@Param("id", ParseUUIDPipe) id: string) {
    return this.projectsService.findOne(id);
  }

  @Get("client/:clientId")
  @ApiOperation({ summary: "Get all projects for a client" })
  findByClient(@Param("clientId", ParseUUIDPipe) clientId: string) {
    return this.projectsService.findByClient(clientId);
  }

  @Get(":id/stats")
  @ApiOperation({ summary: "Get project statistics" })
  getStats(@Param("id", ParseUUIDPipe) id: string) {
    return this.projectsService.getProjectStats(id);
  }

  @Put(":id")
  @ApiOperation({ summary: "Update a project" })
  update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() updateProjectDto: UpdateProjectDto,
  ) {
    return this.projectsService.update(id, updateProjectDto);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete a project" })
  remove(@Param("id", ParseUUIDPipe) id: string) {
    return this.projectsService.remove(id);
  }

  // ==================== PUBLIC SHARING ENDPOINTS ====================

  @Get(":id/share")
  @ApiOperation({
    summary: "Get the public sharing state of a project",
    description:
      "Returns whether the read-only client-facing link is enabled and its token.",
  })
  getShareSettings(@Param("id", ParseUUIDPipe) id: string) {
    return this.projectsService.getShareSettings(id);
  }

  @Patch(":id/share")
  @ApiOperation({
    summary: "Enable or disable the public link of a project",
    description:
      "Disabling makes /public/* answer 404 without discarding the token.",
  })
  updateSharing(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() updateSharingDto: UpdateProjectSharingDto,
  ) {
    return this.projectsService.setSharingEnabled(id, updateSharingDto.enabled);
  }

  @Post(":id/share/regenerate")
  @ApiOperation({
    summary: "Issue a new public link token",
    description: "Invalidates the previous link immediately.",
  })
  regenerateShareToken(@Param("id", ParseUUIDPipe) id: string) {
    return this.projectsService.regenerateShareToken(id);
  }

  // ==================== CONTEXT ENDPOINTS ====================

  @Get("context/:identifier")
  @ApiOperation({
    summary: "Get full project context for AI assistants",
    description:
      "Returns comprehensive project context including stack, rules, tasks, and state. " +
      "The identifier can be either a project UUID or project name (case-insensitive).",
  })
  @ApiParam({
    name: "identifier",
    description: "Project ID (UUID) or project name",
    example: "Client Board Klion",
  })
  @ApiResponse({
    status: 200,
    description: "Full project context",
    type: FullProjectContextResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: "Project not found",
  })
  getFullContext(@Param("identifier") identifier: string) {
    return this.projectsService.getFullContext(identifier);
  }

  @Get(":id/context/settings")
  @ApiOperation({ summary: "Get project context settings" })
  getContextSettings(@Param("id", ParseUUIDPipe) id: string) {
    return this.projectsService.getOrCreateContext(id);
  }

  @Patch(":id/context")
  @ApiOperation({
    summary: "Update project context settings",
    description:
      "Update the context configuration for a project including stack, rules, repository info, etc.",
  })
  updateContext(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() updateContextDto: UpdateProjectContextDto,
  ) {
    return this.projectsService.updateContext(id, updateContextDto);
  }

  // ==================== NOTE ENDPOINTS ====================

  @Get(":id/note")
  @ApiOperation({ summary: "Get the project's scratchpad note" })
  getNote(@Param("id", ParseUUIDPipe) id: string) {
    return this.projectsService.getOrCreateNote(id);
  }

  @Patch(":id/note")
  @ApiOperation({
    summary: "Update the project's scratchpad note",
    description:
      "Saves the rich text (HTML) content of the project's single scratchpad note.",
  })
  updateNote(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() updateNoteDto: UpdateProjectNoteDto,
  ) {
    return this.projectsService.updateNote(id, updateNoteDto);
  }
}
