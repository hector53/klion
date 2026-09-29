import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, In, SelectQueryBuilder } from "typeorm";
import { Knowledge, KnowledgeType } from "./entities/knowledge.entity";
import { KnowledgeTag } from "./entities/knowledge-tag.entity";
import {
  CreateKnowledgeDto,
  UpdateKnowledgeDto,
  KnowledgeFilterDto,
  SearchKnowledgeDto,
  KnowledgeSearchResultDto,
} from "./dto/knowledge.dto";

@Injectable()
export class KnowledgeService {
  constructor(
    @InjectRepository(Knowledge)
    private readonly knowledgeRepository: Repository<Knowledge>,
    @InjectRepository(KnowledgeTag)
    private readonly tagRepository: Repository<KnowledgeTag>,
  ) {}

  /**
   * Create a new knowledge entry
   */
  async create(createDto: CreateKnowledgeDto): Promise<Knowledge> {
    const { tags: tagNames, ...knowledgeData } = createDto;

    // Create knowledge entry
    const knowledge = this.knowledgeRepository.create(knowledgeData);

    // Handle tags
    if (tagNames && tagNames.length > 0) {
      knowledge.tags = await this.getOrCreateTags(tagNames);
    }

    // Generate summary if not provided
    if (!knowledge.summary && knowledge.content) {
      knowledge.summary = this.generateSummary(knowledge.content);
    }

    const saved = await this.knowledgeRepository.save(knowledge);

    // Update tag usage counts
    if (knowledge.tags) {
      await this.updateTagCounts(knowledge.tags.map((t) => t.id));
    }

    return this.findOne(saved.id);
  }

  /**
   * Find all knowledge entries with filters
   */
  async findAll(filters?: KnowledgeFilterDto): Promise<Knowledge[]> {
    const query = this.knowledgeRepository
      .createQueryBuilder("knowledge")
      .leftJoinAndSelect("knowledge.tags", "tags")
      .leftJoinAndSelect("knowledge.client", "client")
      .leftJoinAndSelect("knowledge.project", "project");

    // Apply filters
    if (!filters?.includeArchived) {
      query.andWhere("knowledge.isArchived = :isArchived", {
        isArchived: false,
      });
    }

    if (filters?.type) {
      query.andWhere("knowledge.type = :type", { type: filters.type });
    }

    if (filters?.clientId) {
      query.andWhere("knowledge.clientId = :clientId", {
        clientId: filters.clientId,
      });
    }

    if (filters?.projectId) {
      query.andWhere("knowledge.projectId = :projectId", {
        projectId: filters.projectId,
      });
    }

    if (filters?.tag) {
      query.andWhere("tags.name = :tagName", {
        tagName: filters.tag.toLowerCase(),
      });
    }

    // Pagination
    const limit = filters?.limit || 50;
    const offset = filters?.offset || 0;
    query.skip(offset).take(limit);

    // Order by most recently updated
    query.orderBy("knowledge.updatedAt", "DESC");

    return query.getMany();
  }

  /**
   * Find a knowledge entry by ID
   */
  async findOne(id: string): Promise<Knowledge> {
    const knowledge = await this.knowledgeRepository.findOne({
      where: { id },
      relations: ["tags", "client", "project"],
    });

    if (!knowledge) {
      throw new NotFoundException(`Knowledge with ID ${id} not found`);
    }

    return knowledge;
  }

  /**
   * Update a knowledge entry
   */
  async update(id: string, updateDto: UpdateKnowledgeDto): Promise<Knowledge> {
    const knowledge = await this.findOne(id);
    const { tags: tagNames, ...updateData } = updateDto;

    // Update basic fields
    Object.assign(knowledge, updateData);

    // Handle tags if provided
    if (tagNames !== undefined) {
      const oldTagIds = knowledge.tags?.map((t) => t.id) || [];
      knowledge.tags = await this.getOrCreateTags(tagNames);
      const newTagIds = knowledge.tags.map((t) => t.id);

      // Update tag counts
      const allTagIds = [...new Set([...oldTagIds, ...newTagIds])];
      await this.updateTagCounts(allTagIds);
    }

    // Regenerate summary if content changed and no custom summary
    if (updateData.content && !updateData.summary) {
      knowledge.summary = this.generateSummary(knowledge.content);
    }

    return this.knowledgeRepository.save(knowledge);
  }

  /**
   * Delete a knowledge entry
   */
  async remove(id: string): Promise<void> {
    const knowledge = await this.findOne(id);
    const tagIds = knowledge.tags?.map((t) => t.id) || [];

    await this.knowledgeRepository.remove(knowledge);

    // Update tag counts
    if (tagIds.length > 0) {
      await this.updateTagCounts(tagIds);
    }
  }

  /**
   * Archive a knowledge entry (soft delete)
   */
  async archive(id: string): Promise<Knowledge> {
    return this.update(id, { isArchived: true });
  }

  /**
   * Search knowledge by text (full-text search)
   * TODO: Implement semantic search with embeddings when RAG module is ready
   */
  async search(
    searchDto: SearchKnowledgeDto,
  ): Promise<KnowledgeSearchResultDto[]> {
    const { query, type, projectId, clientId, limit = 10 } = searchDto;
    const trimmedQuery = query.trim();
    if (!trimmedQuery) return [];

    const ftsVector =
      "to_tsvector('simple', unaccent_immutable(coalesce(knowledge.title,'') || ' ' || coalesce(knowledge.summary,'') || ' ' || coalesce(knowledge.content,'')))";
    const ftsQuery =
      "websearch_to_tsquery('simple', unaccent_immutable(:ftsQuery))";

    const ftsQb = this.buildSearchBaseQuery({ type, projectId, clientId })
      .andWhere(`${ftsVector} @@ ${ftsQuery}`, { ftsQuery: trimmedQuery })
      .addSelect(`ts_rank_cd(${ftsVector}, ${ftsQuery})`, "rank")
      .orderBy("rank", "DESC")
      .addOrderBy("knowledge.usageCount", "DESC")
      .addOrderBy("knowledge.updatedAt", "DESC")
      .take(limit);

    const { entities, raw } = await ftsQb.getRawAndEntities();
    if (entities.length > 0) {
      return entities.map((k, index) => ({
        id: k.id,
        title: k.title,
        summary: k.summary || this.generateSummary(k.content),
        type: k.type,
        language: k.language,
        relevance: this.calculateHybridRelevance(
          k,
          trimmedQuery,
          index,
          entities.length,
          Number(raw[index]?.rank ?? 0),
        ),
        tags: k.tags?.map((t) => t.name) || [],
        projectName: k.project?.name,
        clientName: k.client?.name,
      }));
    }

    const terms = this.tokenizeQuery(trimmedQuery);
    if (terms.length === 0) return [];

    const fallbackQb = this.buildSearchBaseQuery({ type, projectId, clientId });
    this.applyTokenizedSearch(fallbackQb, terms);
    fallbackQb
      .orderBy("knowledge.usageCount", "DESC")
      .addOrderBy("knowledge.updatedAt", "DESC")
      .take(limit);

    const fallbackResults = await fallbackQb.getMany();
    if (fallbackResults.length === 0 && projectId) {
      return this.findByProject(projectId, limit);
    }

    // Sort results to prioritize title matches (in-memory)
    const queryLower = trimmedQuery.toLowerCase();
    fallbackResults.sort((a, b) => {
      const aInTitle = a.title.toLowerCase().includes(queryLower) ? 0 : 1;
      const bInTitle = b.title.toLowerCase().includes(queryLower) ? 0 : 1;
      return aInTitle - bInTitle;
    });

    // Map to search result DTOs with relevance scores
    return fallbackResults.map((k, index) => ({
      id: k.id,
      title: k.title,
      summary: k.summary || this.generateSummary(k.content),
      type: k.type,
      language: k.language,
      relevance: this.calculateTextRelevance(
        k,
        trimmedQuery,
        index,
        fallbackResults.length,
      ),
      tags: k.tags?.map((t) => t.name) || [],
      projectName: k.project?.name,
      clientName: k.client?.name,
    }));
  }

  /**
   * Get knowledge related to a project
   */
  async findByProject(
    projectId: string,
    limit = 10,
  ): Promise<KnowledgeSearchResultDto[]> {
    const knowledge = await this.knowledgeRepository.find({
      where: { projectId, isArchived: false },
      relations: ["tags", "project", "client"],
      order: { usageCount: "DESC", updatedAt: "DESC" },
      take: limit,
    });

    return knowledge.map((k) => ({
      id: k.id,
      title: k.title,
      summary: k.summary || this.generateSummary(k.content),
      type: k.type,
      language: k.language,
      relevance: 1, // All directly related
      tags: k.tags?.map((t) => t.name) || [],
      projectName: k.project?.name,
      clientName: k.client?.name,
    }));
  }

  /**
   * Record access to knowledge (for analytics)
   */
  async recordAccess(id: string): Promise<void> {
    await this.knowledgeRepository.update(id, {
      usageCount: () => "usageCount + 1",
      lastAccessedAt: new Date(),
    });
  }

  /**
   * Get all tags
   */
  async getAllTags(): Promise<KnowledgeTag[]> {
    return this.tagRepository.find({
      order: { usageCount: "DESC", name: "ASC" },
    });
  }

  /**
   * Get popular tags
   */
  async getPopularTags(limit = 20): Promise<KnowledgeTag[]> {
    return this.tagRepository.find({
      where: { usageCount: In([...Array(1000).keys()].filter((n) => n > 0)) },
      order: { usageCount: "DESC" },
      take: limit,
    });
  }

  // ==================== PRIVATE HELPERS ====================

  /**
   * Get or create tags by name
   */
  private async getOrCreateTags(tagNames: string[]): Promise<KnowledgeTag[]> {
    const normalizedNames = tagNames.map((n) => n.toLowerCase().trim());
    const tags: KnowledgeTag[] = [];

    for (const name of normalizedNames) {
      if (!name) continue;

      let tag = await this.tagRepository.findOne({ where: { name } });
      if (!tag) {
        tag = this.tagRepository.create({
          name,
          color: this.generateTagColor(name),
        });
        tag = await this.tagRepository.save(tag);
      }
      tags.push(tag);
    }

    return tags;
  }

  /**
   * Update usage counts for tags
   */
  private async updateTagCounts(tagIds: string[]): Promise<void> {
    for (const tagId of tagIds) {
      const count = await this.knowledgeRepository
        .createQueryBuilder("knowledge")
        .innerJoin("knowledge.tags", "tag")
        .where("tag.id = :tagId", { tagId })
        .andWhere("knowledge.isArchived = false")
        .getCount();

      await this.tagRepository.update(tagId, { usageCount: count });
    }
  }

  /**
   * Generate a summary from content (first ~200 chars)
   */
  private generateSummary(content: string): string {
    // Remove code blocks for summary
    const cleaned = content
      .replace(/```[\s\S]*?```/g, "[code]")
      .replace(/`[^`]+`/g, "[code]")
      .replace(/\n+/g, " ")
      .trim();

    if (cleaned.length <= 200) return cleaned;
    return cleaned.substring(0, 197) + "...";
  }

  private buildSearchBaseQuery(filters: {
    type?: KnowledgeType;
    projectId?: string;
    clientId?: string;
  }): SelectQueryBuilder<Knowledge> {
    const qb = this.knowledgeRepository
      .createQueryBuilder("knowledge")
      .leftJoinAndSelect("knowledge.tags", "tags")
      .leftJoinAndSelect("knowledge.client", "client")
      .leftJoinAndSelect("knowledge.project", "project")
      .where("knowledge.isArchived = :isArchived", { isArchived: false });

    if (filters.type) {
      qb.andWhere("knowledge.type = :type", { type: filters.type });
    }

    if (filters.projectId) {
      qb.andWhere("knowledge.projectId = :projectId", {
        projectId: filters.projectId,
      });
    }

    if (filters.clientId) {
      qb.andWhere("knowledge.clientId = :clientId", {
        clientId: filters.clientId,
      });
    }

    return qb;
  }

  private applyTokenizedSearch(
    qb: SelectQueryBuilder<Knowledge>,
    terms: string[],
  ): void {
    if (terms.length === 0) return;

    terms.forEach((term, index) => {
      const paramKey = `term${index}`;
      qb.andWhere(
        `(
          unaccent_immutable(lower(knowledge.title)) LIKE unaccent_immutable(lower(:${paramKey}))
          OR unaccent_immutable(lower(knowledge.content)) LIKE unaccent_immutable(lower(:${paramKey}))
          OR unaccent_immutable(lower(knowledge.summary)) LIKE unaccent_immutable(lower(:${paramKey}))
        )`,
        { [paramKey]: `%${term}%` },
      );
    });
  }

  private tokenizeQuery(query: string): string[] {
    const normalized = query
      .trim()
      .toLowerCase()
      .replace(/[^\wáéíóúüñ]+/gi, " ")
      .replace(/\s+/g, " ")
      .trim();

    if (!normalized) return [];

    const stopwords = new Set([
      "a",
      "an",
      "and",
      "con",
      "de",
      "del",
      "el",
      "en",
      "for",
      "la",
      "las",
      "los",
      "of",
      "or",
      "por",
      "the",
      "to",
      "un",
      "una",
      "y",
    ]);

    const terms = normalized
      .split(" ")
      .filter((term) => term.length >= 2 && !stopwords.has(term));

    return Array.from(new Set(terms.length > 0 ? terms : [normalized]));
  }

  /**
   * Calculate text-based relevance score
   */
  private calculateTextRelevance(
    knowledge: Knowledge,
    query: string,
    index: number,
    total: number,
  ): number {
    const queryLower = query.toLowerCase();
    let score = 0;

    // Title exact match
    if (knowledge.title.toLowerCase().includes(queryLower)) {
      score += 0.5;
    }

    // Content match
    if (knowledge.content.toLowerCase().includes(queryLower)) {
      score += 0.3;
    }

    // Position bonus (earlier results get higher scores)
    score += (1 - index / total) * 0.2;

    return Math.min(1, Math.max(0, score));
  }

  private calculateHybridRelevance(
    knowledge: Knowledge,
    query: string,
    index: number,
    total: number,
    rank: number,
  ): number {
    const textScore = this.calculateTextRelevance(
      knowledge,
      query,
      index,
      total,
    );
    if (!Number.isFinite(rank) || rank <= 0) return textScore;

    const normalizedRank = Math.min(1, Math.max(0, rank));
    const blended = normalizedRank * 0.7 + textScore * 0.3;
    return Math.min(1, Math.max(0, blended));
  }

  /**
   * Generate a consistent color for a tag based on its name
   */
  private generateTagColor(name: string): string {
    const colors = [
      "#EF4444", // red
      "#F97316", // orange
      "#F59E0B", // amber
      "#84CC16", // lime
      "#22C55E", // green
      "#14B8A6", // teal
      "#06B6D4", // cyan
      "#3B82F6", // blue
      "#6366F1", // indigo
      "#8B5CF6", // violet
      "#A855F7", // purple
      "#EC4899", // pink
    ];

    // Hash the name to get a consistent color
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  }
}
