import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { GitService } from './git.service';
import {
  GenerateCommitMessageDto,
  CommitMessageResponseDto,
  CreateCommitDto,
  CommitResultDto,
  GenerateChangelogDto,
  ChangelogResponseDto,
  UpdateChangelogDto,
  RepoStatusDto,
  BranchInfoDto,
  GenerateDocumentationDto,
  DocumentationResponseDto,
  SaveDocumentationDto,
} from './dto/git.dto';

@ApiTags('git')
@Controller('git')
export class GitController {
  constructor(private readonly gitService: GitService) {}

  // ============ Repository Status ============

  @Get('status/:projectId')
  @ApiOperation({ summary: 'Get repository status' })
  @ApiResponse({ status: 200, type: RepoStatusDto })
  getStatus(@Param('projectId') projectId: string): Promise<RepoStatusDto> {
    return this.gitService.getStatus(projectId);
  }

  @Get('branches/:projectId')
  @ApiOperation({ summary: 'Get list of branches' })
  @ApiResponse({ status: 200, type: [BranchInfoDto] })
  getBranches(@Param('projectId') projectId: string): Promise<BranchInfoDto[]> {
    return this.gitService.getBranches(projectId);
  }

  @Get('diff/:projectId')
  @ApiOperation({ summary: 'Get diff of changes' })
  @ApiQuery({ name: 'staged', required: false, type: Boolean })
  getDiff(
    @Param('projectId') projectId: string,
    @Query('staged') staged?: string,
  ): Promise<string> {
    return this.gitService.getDiff(projectId, staged === 'true');
  }

  // ============ Commits ============

  @Post('commit/generate-message')
  @ApiOperation({ summary: 'Generate commit message using AI' })
  @ApiResponse({ status: 200, type: CommitMessageResponseDto })
  generateCommitMessage(
    @Body() dto: GenerateCommitMessageDto,
  ): Promise<CommitMessageResponseDto> {
    return this.gitService.generateCommitMessage(dto);
  }

  @Post('commit')
  @ApiOperation({ summary: 'Create a commit' })
  @ApiResponse({ status: 200, type: CommitResultDto })
  createCommit(@Body() dto: CreateCommitDto): Promise<CommitResultDto> {
    return this.gitService.createCommit(dto);
  }

  // ============ Changelog ============

  @Post('changelog/generate')
  @ApiOperation({ summary: 'Generate changelog from commits' })
  @ApiResponse({ status: 200, type: ChangelogResponseDto })
  generateChangelog(
    @Body() dto: GenerateChangelogDto,
  ): Promise<ChangelogResponseDto> {
    return this.gitService.generateChangelog(dto);
  }

  @Post('changelog/update')
  @ApiOperation({ summary: 'Update changelog file' })
  updateChangelog(
    @Body() dto: UpdateChangelogDto,
  ): Promise<{ success: boolean; path: string }> {
    return this.gitService.updateChangelog(dto);
  }

  // ============ Documentation ============

  @Post('docs/generate')
  @ApiOperation({ summary: 'Generate documentation using AI' })
  @ApiResponse({ status: 200, type: DocumentationResponseDto })
  generateDocumentation(
    @Body() dto: GenerateDocumentationDto,
  ): Promise<DocumentationResponseDto> {
    return this.gitService.generateDocumentation(dto);
  }

  @Post('docs/save')
  @ApiOperation({ summary: 'Save documentation file' })
  saveDocumentation(
    @Body() dto: SaveDocumentationDto,
  ): Promise<{ success: boolean; path: string; committed?: boolean }> {
    return this.gitService.saveDocumentation(dto);
  }
}
