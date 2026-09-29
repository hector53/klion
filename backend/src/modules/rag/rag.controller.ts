import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from "@nestjs/swagger";
import { RagService } from "./services/rag.service";
import {
  IndexProjectDto,
  SearchCodeDto,
  CodeSearchResultDto,
  IndexStatusDto,
  IndexProgressDto,
  UploadChunksDto,
  UploadChunksResponseDto,
} from "./dto/rag.dto";

@ApiTags("RAG")
@Controller("rag")
export class RagController {
  constructor(private readonly ragService: RagService) { }

  /**
   * Index a project's code repository
   */
  @Post("index")
  @ApiOperation({
    summary: "Index a project repository for code search (local only)",
  })
  @ApiResponse({ status: 200, description: "Indexing started/completed" })
  async indexProject(@Body() dto: IndexProjectDto): Promise<IndexProgressDto> {
    return this.ragService.indexProject(dto);
  }

  /**
   * Upload pre-processed chunks from client (MCP/CLI)
   * This enables remote indexing where the client scans locally and sends chunks to the server
   */
  @Post("chunks")
  @ApiOperation({
    summary: "Upload pre-processed code chunks from client",
    description:
      "Receives code chunks that were processed locally by the MCP/CLI. " +
      "The server generates embeddings and stores them. " +
      "Use this for remote indexing when the server cannot access the local filesystem.",
  })
  @ApiBody({ type: UploadChunksDto })
  @ApiResponse({
    status: 200,
    description: "Chunks received and processed",
    type: UploadChunksResponseDto,
  })
  @ApiResponse({ status: 400, description: "Invalid chunks data" })
  @ApiResponse({ status: 404, description: "Project not found" })
  async uploadChunks(
    @Body() dto: UploadChunksDto,
  ): Promise<UploadChunksResponseDto> {
    return this.ragService.processUploadedChunks(dto);
  }

  /**
   * Search indexed code
   */
  @Get("search")
  @ApiOperation({
    summary: "Search indexed code using semantic or text search",
  })
  @ApiResponse({ status: 200, description: "Search results" })
  async searchCode(
    @Query("query") query: string,
    @Query("projectId") projectId?: string,
    @Query("fileType") fileType?: string,
    @Query("limit") limit?: string,
    @Query("useSemanticSearch") useSemanticSearch?: string,
  ): Promise<CodeSearchResultDto[]> {
    const dto: SearchCodeDto = {
      query,
      projectId,
      fileType,
      limit: limit ? parseInt(limit) : 10,
      useSemanticSearch: useSemanticSearch !== "false",
    };
    return this.ragService.searchCode(dto);
  }

  /**
   * Get indexing status for a project
   */
  @Get("status/:projectId")
  @ApiOperation({ summary: "Get indexing status for a project" })
  @ApiResponse({ status: 200, description: "Index status" })
  async getIndexStatus(
    @Param("projectId", ParseUUIDPipe) projectId: string,
  ): Promise<IndexStatusDto> {
    return this.ragService.getIndexStatus(projectId);
  }

  /**
   * Get current indexing progress
   */
  @Get("progress/:projectId")
  @ApiOperation({ summary: "Get current indexing progress" })
  @ApiResponse({ status: 200, description: "Indexing progress" })
  async getIndexProgress(
    @Param("projectId", ParseUUIDPipe) projectId: string,
  ): Promise<IndexProgressDto | { message: string }> {
    const progress = this.ragService.getIndexProgress(projectId);
    if (!progress) {
      return { message: "No indexing in progress" };
    }
    return progress;
  }

  /**
   * Get indexed chunks for a project
   */
  @Get("chunks/:projectId")
  @ApiOperation({ summary: "Get indexed chunks for a project" })
  @ApiResponse({ status: 200, description: "Indexed chunks" })
  async getChunks(
    @Param("projectId", ParseUUIDPipe) projectId: string,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string,
  ): Promise<{ chunks: any[]; total: number }> {
    const limitNum = limit ? parseInt(limit) : 50;
    const offsetNum = offset ? parseInt(offset) : 0;
    return this.ragService.getChunks(projectId, limitNum, offsetNum);
  }

  /**
   * Delete index for a project
   */
  @Delete(":projectId")
  @ApiOperation({ summary: "Delete index for a project" })
  @ApiResponse({ status: 200, description: "Index deleted" })
  async deleteIndex(
    @Param("projectId", ParseUUIDPipe) projectId: string,
  ): Promise<{ message: string }> {
    await this.ragService.deleteIndex(projectId);
    return { message: `Index deleted for project ${projectId}` };
  }
}
