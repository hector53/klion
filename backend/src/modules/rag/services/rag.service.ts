import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, DataSource } from "typeorm";
import { CodeChunk } from "../entities/code-chunk.entity";
import { Project } from "../../projects/entities/project.entity";
import { ProjectContext } from "../../projects/entities/project-context.entity";
import { EmbeddingService } from "./embedding.service";
import { IndexerService, CodeChunkData, ScannedFile } from "./indexer.service";
import {
  IndexProjectDto,
  SearchCodeDto,
  CodeSearchResultDto,
  IndexStatusDto,
  IndexProgressDto,
  UploadChunksDto,
  UploadChunksResponseDto,
  CodeChunkUploadDto,
} from "../dto/rag.dto";
import { vectorToSql } from "../../../common/pgvector.helper";

@Injectable()
export class RagService {
  private readonly logger = new Logger(RagService.name);

  // Track indexing progress per project
  private indexingProgress: Map<string, IndexProgressDto> = new Map();

  constructor(
    @InjectRepository(CodeChunk)
    private readonly chunkRepository: Repository<CodeChunk>,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(ProjectContext)
    private readonly contextRepository: Repository<ProjectContext>,
    private readonly embeddingService: EmbeddingService,
    private readonly indexerService: IndexerService,
    private readonly dataSource: DataSource,
  ) { }

  /**
   * Index a project's code repository
   */
  async indexProject(dto: IndexProjectDto): Promise<IndexProgressDto> {
    const { projectId, repoPath, forceReindex } = dto;

    // Get project and its context
    const project = await this.projectRepository.findOne({
      where: { id: projectId },
    });
    if (!project) {
      throw new NotFoundException(`Project ${projectId} not found`);
    }

    // Determine repository path
    let targetPath = repoPath;
    if (!targetPath) {
      const context = await this.contextRepository.findOne({
        where: { projectId },
      });
      targetPath = context?.localPath;
    }

    if (!targetPath) {
      throw new Error(
        "No repository path provided. Set localPath in project context or provide repoPath.",
      );
    }

    // Initialize progress
    const progress: IndexProgressDto = {
      projectId,
      status: "scanning",
      progress: 0,
      filesProcessed: 0,
      totalFiles: 0,
      chunksCreated: 0,
    };
    this.indexingProgress.set(projectId, progress);

    try {
      // Delete existing chunks if force reindex
      if (forceReindex) {
        await this.chunkRepository.delete({ projectId });
        this.logger.log(`Deleted existing chunks for project ${projectId}`);
      }

      // Scan directory
      progress.status = "scanning";
      const files = await this.indexerService.scanDirectory(targetPath);
      progress.totalFiles = files.length;
      progress.progress = 10;

      if (files.length === 0) {
        progress.status = "complete";
        progress.progress = 100;
        return progress;
      }

      // Check for unchanged files (skip if not force reindex)
      let filesToProcess = files;
      if (!forceReindex) {
        filesToProcess = await this.filterChangedFiles(projectId, files);
        this.logger.log(
          `${filesToProcess.length} of ${files.length} files need processing`,
        );
      }

      // Chunk files
      progress.status = "chunking";
      const allChunks: CodeChunkData[] = [];
      for (const file of filesToProcess) {
        const chunks = this.indexerService.chunkFile(file);
        allChunks.push(...chunks);
      }
      progress.progress = 30;

      // Generate embeddings if available
      if (this.embeddingService.isAvailable() && allChunks.length > 0) {
        progress.status = "embedding";
        await this.generateChunkEmbeddings(allChunks, progress);
      }
      progress.progress = 70;

      // Store chunks in database
      progress.status = "storing";
      await this.storeChunks(projectId, allChunks, progress);

      // Update project context
      await this.updateProjectRagStatus(projectId);

      progress.status = "complete";
      progress.progress = 100;
      progress.filesProcessed = filesToProcess.length;
      progress.chunksCreated = allChunks.length;

      this.logger.log(
        `Indexed ${allChunks.length} chunks from ${filesToProcess.length} files for project ${projectId}`,
      );

      return progress;
    } catch (error) {
      progress.status = "error";
      progress.error = error.message;
      this.logger.error(
        `Failed to index project ${projectId}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Search code using semantic or text search
   */
  async searchCode(dto: SearchCodeDto): Promise<CodeSearchResultDto[]> {
    const {
      query,
      projectId,
      fileType,
      limit = 10,
      useSemanticSearch = true,
    } = dto;

    // Try semantic search first if embeddings available
    if (useSemanticSearch && this.embeddingService.isAvailable()) {
      const embedding = await this.embeddingService.generateEmbedding(query);
      if (embedding) {
        return this.semanticSearch(embedding, projectId, fileType, limit);
      }
    }

    // Fall back to text search
    return this.textSearch(query, projectId, fileType, limit);
  }

  /**
   * Semantic search using vector similarity
   */
  private async semanticSearch(
    queryEmbedding: number[],
    projectId?: string,
    fileType?: string,
    limit: number = 10,
  ): Promise<CodeSearchResultDto[]> {
    const embeddingStr = vectorToSql(queryEmbedding);

    // Build raw query for vector similarity
    let sql = `
      SELECT
        c.id,
        c.project_id as "projectId",
        c."filePath" as "filePath",
        c."fileName" as "fileName",
        c."fileType" as "fileType",
        c.content,
        c."startLine" as "startLine",
        c."endLine" as "endLine",
        p.name as "projectName",
        1 - (c.embedding::vector <=> '${embeddingStr}'::vector) as relevance
      FROM code_chunks c
      JOIN projects p ON p.id = c.project_id
      WHERE c.embedding IS NOT NULL
    `;

    const params: any[] = [];
    let paramIndex = 1;

    if (projectId) {
      sql += ` AND c.project_id = $${paramIndex}`;
      params.push(projectId);
      paramIndex++;
    }

    if (fileType) {
      sql += ` AND c."fileType" = $${paramIndex}`;
      params.push(fileType);
      paramIndex++;
    }

    sql += ` ORDER BY relevance DESC LIMIT $${paramIndex}`;
    params.push(limit);

    const results = await this.dataSource.query(sql, params);

    return results.map((r: any) => ({
      ...r,
      relevance: parseFloat(r.relevance),
      matchType: "semantic" as const,
    }));
  }

  /**
   * Text-based search using ILIKE
   */
  private async textSearch(
    query: string,
    projectId?: string,
    fileType?: string,
    limit: number = 10,
  ): Promise<CodeSearchResultDto[]> {
    const qb = this.chunkRepository
      .createQueryBuilder("chunk")
      .leftJoinAndSelect("chunk.project", "project")
      .where("chunk.content ILIKE :query", { query: `%${query}%` });

    if (projectId) {
      qb.andWhere("chunk.projectId = :projectId", { projectId });
    }

    if (fileType) {
      qb.andWhere("chunk.fileType = :fileType", { fileType });
    }

    qb.orderBy("chunk.createdAt", "DESC").take(limit);

    const results = await qb.getMany();

    return results.map((chunk, index) => ({
      id: chunk.id,
      projectId: chunk.projectId,
      projectName: chunk.project?.name,
      filePath: chunk.filePath,
      fileName: chunk.fileName,
      fileType: chunk.fileType,
      content: chunk.content,
      startLine: chunk.startLine,
      endLine: chunk.endLine,
      relevance: 1 - index * 0.05, // Simple relevance based on position
      matchType: "text" as const,
    }));
  }

  /**
   * Get indexing status for a project
   */
  async getIndexStatus(projectId: string): Promise<IndexStatusDto> {
    const project = await this.projectRepository.findOne({
      where: { id: projectId },
    });
    if (!project) {
      throw new NotFoundException(`Project ${projectId} not found`);
    }

    const context = await this.contextRepository.findOne({
      where: { projectId },
    });

    const [chunks, totalFiles] = await Promise.all([
      this.chunkRepository.count({ where: { projectId } }),
      this.chunkRepository
        .createQueryBuilder("chunk")
        .select("COUNT(DISTINCT chunk.filePath)", "count")
        .where("chunk.projectId = :projectId", { projectId })
        .getRawOne(),
    ]);

    const inProgress = this.indexingProgress.get(projectId);

    return {
      projectId,
      projectName: project.name,
      isIndexed: chunks > 0,
      totalChunks: chunks,
      totalFiles: parseInt(totalFiles?.count || "0"),
      lastIndexedAt: context?.lastIndexedAt || null,
      indexingInProgress:
        inProgress?.status !== "complete" && inProgress?.status !== "error",
    };
  }

  /**
   * Get current indexing progress
   */
  getIndexProgress(projectId: string): IndexProgressDto | null {
    return this.indexingProgress.get(projectId) || null;
  }

  /**
   * Get indexed chunks for a project
   */
  async getChunks(
    projectId: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<{ chunks: any[]; total: number }> {
    const [chunks, total] = await this.chunkRepository.findAndCount({
      where: { projectId },
      order: { filePath: 'ASC', startLine: 'ASC' },
      take: limit,
      skip: offset,
      select: [
        'id',
        'filePath',
        'fileName',
        'fileType',
        'content',
        'startLine',
        'endLine',
        'chunkIndex',
        'totalChunks',
        'features',
        'createdAt',
      ],
    });

    return {
      chunks: chunks.map((chunk) => ({
        id: chunk.id,
        filePath: chunk.filePath,
        fileName: chunk.fileName,
        fileType: chunk.fileType,
        content: chunk.content.slice(0, 200), // Truncate for preview
        startLine: chunk.startLine,
        endLine: chunk.endLine,
        chunkIndex: chunk.chunkIndex,
        totalChunks: chunk.totalChunks,
        features: chunk.features,
        createdAt: chunk.createdAt,
      })),
      total,
    };
  }

  /**
   * Process chunks uploaded from client (MCP/CLI)
   * This enables remote indexing where the client scans locally and sends chunks to the server
   */
  async processUploadedChunks(
    dto: UploadChunksDto,
  ): Promise<UploadChunksResponseDto> {
    const {
      projectId,
      chunks,
      forceReindex,
      batchNumber = 1,
      totalBatches = 1,
    } = dto;

    // Validate project exists
    const project = await this.projectRepository.findOne({
      where: { id: projectId },
    });
    if (!project) {
      throw new NotFoundException(`Project ${projectId} not found`);
    }

    this.logger.log(
      `Receiving ${chunks.length} chunks for project ${projectId} (batch ${batchNumber}/${totalBatches})`,
    );

    try {
      // If first batch and forceReindex, delete existing chunks
      if (batchNumber === 1 && forceReindex) {
        await this.chunkRepository.delete({ projectId });
        this.logger.log(`Deleted existing chunks for project ${projectId}`);
      }

      // Filter out unchanged files (by hash)
      const filteredChunks = await this.filterUnchangedChunks(
        projectId,
        chunks,
      );

      if (filteredChunks.length === 0) {
        this.logger.log(
          `All chunks already up to date for project ${projectId}`,
        );
        return {
          success: true,
          chunksReceived: chunks.length,
          chunksStored: 0,
          embeddingsGenerated: 0,
          batchNumber,
          totalBatches,
          isComplete: batchNumber === totalBatches,
        };
      }

      // Convert uploaded chunks to internal format
      const chunkDataArray: CodeChunkData[] = filteredChunks.map((c) => ({
        filePath: c.filePath,
        fileName: c.fileName,
        fileType: c.fileType,
        content: c.content,
        startLine: c.startLine,
        endLine: c.endLine,
        chunkIndex: c.chunkIndex,
        totalChunks: c.totalChunks,
        fileHash: c.fileHash,
        features: c.features,
      }));

      // Generate embeddings if available
      let embeddingsGenerated = 0;
      if (this.embeddingService.isAvailable()) {
        embeddingsGenerated =
          await this.generateEmbeddingsForUploadedChunks(chunkDataArray);
      }

      // Delete existing chunks for files being updated
      const filePaths = [...new Set(filteredChunks.map((c) => c.filePath))];
      if (filePaths.length > 0) {
        await this.chunkRepository
          .createQueryBuilder()
          .delete()
          .where("projectId = :projectId", { projectId })
          .andWhere("filePath IN (:...filePaths)", { filePaths })
          .execute();
      }

      // Store chunks in database
      const entities = chunkDataArray.map((chunk) => ({
        projectId,
        filePath: chunk.filePath,
        fileName: chunk.fileName,
        fileType: chunk.fileType,
        content: chunk.content,
        embedding: (chunk as any).embedding || null,
        startLine: chunk.startLine,
        endLine: chunk.endLine,
        chunkIndex: chunk.chunkIndex,
        totalChunks: chunk.totalChunks,
        features: chunk.features,
        fileHash: chunk.fileHash,
      }));

      // Insert in batches to avoid memory issues
      const insertBatchSize = 100;
      for (let i = 0; i < entities.length; i += insertBatchSize) {
        const batch = entities.slice(i, i + insertBatchSize);
        await this.chunkRepository.insert(batch);
      }

      // Update project context if this is the last batch
      if (batchNumber === totalBatches) {
        await this.updateProjectRagStatus(projectId);
      }

      this.logger.log(
        `Stored ${chunkDataArray.length} chunks with ${embeddingsGenerated} embeddings for project ${projectId}`,
      );

      return {
        success: true,
        chunksReceived: chunks.length,
        chunksStored: chunkDataArray.length,
        embeddingsGenerated,
        batchNumber,
        totalBatches,
        isComplete: batchNumber === totalBatches,
      };
    } catch (error) {
      this.logger.error(
        `Failed to process uploaded chunks for project ${projectId}: ${error.message}`,
      );
      return {
        success: false,
        chunksReceived: chunks.length,
        chunksStored: 0,
        embeddingsGenerated: 0,
        batchNumber,
        totalBatches,
        isComplete: false,
        error: error.message,
      };
    }
  }

  /**
   * Delete index for a project
   */
  async deleteIndex(projectId: string): Promise<void> {
    await this.chunkRepository.delete({ projectId });
    await this.contextRepository.update(
      { projectId },
      { ragEnabled: false, indexedChunks: 0 },
    );
    this.logger.log(`Deleted index for project ${projectId}`);
  }

  // ==================== PRIVATE HELPERS ====================

  /**
   * Filter files that have changed since last index
   */
  private async filterChangedFiles(
    projectId: string,
    files: ScannedFile[],
  ): Promise<ScannedFile[]> {
    const existingHashes = await this.chunkRepository
      .createQueryBuilder("chunk")
      .select("DISTINCT chunk.filePath, chunk.fileHash")
      .where("chunk.projectId = :projectId", { projectId })
      .getRawMany();

    const hashMap = new Map(
      existingHashes.map((h) => [h.filePath, h.fileHash]),
    );

    return files.filter((file) => {
      const existingHash = hashMap.get(file.relativePath);
      return !existingHash || existingHash !== file.hash;
    });
  }

  /**
   * Filter out chunks that haven't changed (based on file hash)
   */
  private async filterUnchangedChunks(
    projectId: string,
    chunks: CodeChunkUploadDto[],
  ): Promise<CodeChunkUploadDto[]> {
    // Get existing file hashes
    const existingHashes = await this.chunkRepository
      .createQueryBuilder("chunk")
      .select("DISTINCT chunk.filePath, chunk.fileHash")
      .where("chunk.projectId = :projectId", { projectId })
      .getRawMany();

    const hashMap = new Map(
      existingHashes.map((h) => [
        h.chunk_file_path || h.filePath,
        h.chunk_file_hash || h.fileHash,
      ]),
    );

    // Filter chunks whose files have changed
    return chunks.filter((chunk) => {
      const existingHash = hashMap.get(chunk.filePath);
      return !existingHash || existingHash !== chunk.fileHash;
    });
  }

  /**
   * Generate embeddings for uploaded chunks
   */
  private async generateEmbeddingsForUploadedChunks(
    chunks: CodeChunkData[],
  ): Promise<number> {
    const batchSize = 20;
    let embeddingsGenerated = 0;

    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      const texts = batch.map((c) => this.prepareTextForEmbedding(c));
      const embeddings = await this.embeddingService.generateEmbeddings(texts);

      for (let j = 0; j < batch.length; j++) {
        const emb = embeddings[j];
        if (emb) {
          (batch[j] as any).embedding = vectorToSql(emb);
          embeddingsGenerated++;
        }
      }
    }

    return embeddingsGenerated;
  }

  /**
   * Generate embeddings for chunks
   */
  private async generateChunkEmbeddings(
    chunks: CodeChunkData[],
    progress: IndexProgressDto,
  ): Promise<void> {
    const batchSize = 20;
    let processed = 0;

    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      const texts = batch.map((c) => this.prepareTextForEmbedding(c));
      const embeddings = await this.embeddingService.generateEmbeddings(texts);

      for (let j = 0; j < batch.length; j++) {
        const emb = embeddings[j];
        if (emb) {
          (batch[j] as any).embedding = vectorToSql(emb);
        }
      }

      processed += batch.length;
      progress.progress = 30 + Math.round((processed / chunks.length) * 40);
      progress.currentFile = batch[0]?.filePath;
    }
  }

  /**
   * Prepare chunk text for embedding
   */
  private prepareTextForEmbedding(chunk: CodeChunkData): string {
    // Include file path and features for better context
    const context = [
      `File: ${chunk.filePath}`,
      chunk.features.length > 0 ? `Features: ${chunk.features.join(", ")}` : "",
      "",
      chunk.content,
    ]
      .filter(Boolean)
      .join("\n");

    // Truncate if too long (embedding models have token limits)
    return context.slice(0, 8000);
  }

  /**
   * Store chunks in database
   */
  private async storeChunks(
    projectId: string,
    chunks: CodeChunkData[],
    progress: IndexProgressDto,
  ): Promise<void> {
    // Delete existing chunks for files being reprocessed
    const filePaths = [...new Set(chunks.map((c) => c.filePath))];
    if (filePaths.length > 0) {
      await this.chunkRepository
        .createQueryBuilder()
        .delete()
        .where("projectId = :projectId", { projectId })
        .andWhere("filePath IN (:...filePaths)", { filePaths })
        .execute();
    }

    // Insert new chunks in batches
    const batchSize = 100;
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      const entities = batch.map((chunk) => ({
        projectId,
        filePath: chunk.filePath,
        fileName: chunk.fileName,
        fileType: chunk.fileType,
        content: chunk.content,
        embedding: (chunk as any).embedding || null,
        startLine: chunk.startLine,
        endLine: chunk.endLine,
        chunkIndex: chunk.chunkIndex,
        totalChunks: chunk.totalChunks,
        features: chunk.features,
        fileHash: chunk.fileHash,
      }));

      await this.chunkRepository.insert(entities);
      progress.chunksCreated = i + batch.length;
      progress.progress =
        70 + Math.round(((i + batch.length) / chunks.length) * 30);
    }
  }

  /**
   * Update project context with RAG status
   */
  private async updateProjectRagStatus(projectId: string): Promise<void> {
    const chunkCount = await this.chunkRepository.count({
      where: { projectId },
    });

    await this.contextRepository.update(
      { projectId },
      {
        ragEnabled: true,
        lastIndexedAt: new Date(),
        indexedChunks: chunkCount,
      },
    );
  }
}
