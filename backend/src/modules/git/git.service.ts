import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs/promises";
import * as path from "path";
import OpenAI from "openai";
import { ProjectsService } from "../projects/projects.service";
import { TasksService } from "../tasks/tasks.service";
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
  CommitType,
} from "./dto/git.dto";

const execAsync = promisify(exec);

@Injectable()
export class GitService {
  private readonly logger = new Logger(GitService.name);
  private openai: OpenAI;

  constructor(
    private readonly configService: ConfigService,
    private readonly projectsService: ProjectsService,
    private readonly tasksService: TasksService,
  ) {
    this.openai = new OpenAI({
      apiKey: this.configService.get<string>("OPENAI_API_KEY"),
    });
  }

  /**
   * Get the local repository path for a project
   */
  private async getRepoPath(projectId: string): Promise<string> {
    const context = await this.projectsService.getOrCreateContext(projectId);
    if (!context?.localPath) {
      throw new NotFoundException(
        `Project ${projectId} does not have a local repository path configured`,
      );
    }
    return context.localPath;
  }

  /**
   * Execute a git command in the project's repository
   */
  private async execGit(
    repoPath: string,
    command: string,
  ): Promise<{ stdout: string; stderr: string }> {
    try {
      const result = await execAsync(`git ${command}`, {
        cwd: repoPath,
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
      });
      return result;
    } catch (error: any) {
      this.logger.error(`Git command failed: git ${command}`, error.message);
      throw new Error(`Git command failed: ${error.message}`);
    }
  }

  /**
   * Get repository status
   */
  async getStatus(projectId: string): Promise<RepoStatusDto> {
    const repoPath = await this.getRepoPath(projectId);

    // Get current branch
    const { stdout: branch } = await this.execGit(
      repoPath,
      "rev-parse --abbrev-ref HEAD",
    );

    // Get status
    const { stdout: statusOutput } = await this.execGit(
      repoPath,
      "status --porcelain",
    );

    const staged: string[] = [];
    const modified: string[] = [];
    const untracked: string[] = [];

    for (const line of statusOutput.split("\n").filter(Boolean)) {
      const status = line.substring(0, 2);
      const file = line.substring(3);

      if (
        status.startsWith("A") ||
        status.startsWith("M") ||
        status.startsWith("D")
      ) {
        if (status[0] !== " ") staged.push(file);
      }
      if (status[1] === "M" || status[1] === "D") {
        modified.push(file);
      }
      if (status === "??") {
        untracked.push(file);
      }
    }

    // Get ahead/behind
    let ahead = 0;
    let behind = 0;
    try {
      const { stdout: aheadBehind } = await this.execGit(
        repoPath,
        "rev-list --left-right --count HEAD...@{upstream}",
      );
      const [a, b] = aheadBehind.trim().split("\t").map(Number);
      ahead = a || 0;
      behind = b || 0;
    } catch {
      // No upstream configured
    }

    // Get last commit
    let lastCommit;
    try {
      const { stdout: logOutput } = await this.execGit(
        repoPath,
        'log -1 --format="%H|%s|%an|%ai"',
      );
      const [hash, message, author, date] = logOutput.trim().split("|");
      lastCommit = { hash, message, author, date };
    } catch {
      // No commits yet
    }

    return {
      branch: branch.trim(),
      isClean:
        staged.length === 0 && modified.length === 0 && untracked.length === 0,
      staged,
      modified,
      untracked,
      ahead,
      behind,
      lastCommit,
    };
  }

  /**
   * Get list of branches
   */
  async getBranches(projectId: string): Promise<BranchInfoDto[]> {
    const repoPath = await this.getRepoPath(projectId);

    const { stdout } = await this.execGit(
      repoPath,
      'branch -a --format="%(refname:short)|%(objectname:short)|%(subject)|%(upstream:short)"',
    );

    const { stdout: currentBranch } = await this.execGit(
      repoPath,
      "rev-parse --abbrev-ref HEAD",
    );

    const branches: BranchInfoDto[] = [];
    for (const line of stdout.split("\n").filter(Boolean)) {
      const [name, hash, message, remote] = line.split("|");
      if (!name.startsWith("origin/")) {
        branches.push({
          name,
          current: name === currentBranch.trim(),
          remote: remote || undefined,
          lastCommitHash: hash,
          lastCommitMessage: message,
        });
      }
    }

    return branches;
  }

  /**
   * Generate commit message using AI
   */
  async generateCommitMessage(
    dto: GenerateCommitMessageDto,
  ): Promise<CommitMessageResponseDto> {
    const repoPath = await this.getRepoPath(dto.projectId);

    // Get diff if not provided
    let changes = dto.changes;
    if (!changes) {
      try {
        const { stdout: diff } = await this.execGit(repoPath, "diff --staged");
        if (diff.trim()) {
          changes = diff;
        } else {
          const { stdout: diffUnstaged } = await this.execGit(repoPath, "diff");
          changes = diffUnstaged || "No changes detected";
        }
      } catch {
        changes = "Could not get diff";
      }
    }

    // Get task context if provided
    let taskContext = "";
    if (dto.taskId) {
      try {
        const task = await this.tasksService.findOne(dto.taskId);
        taskContext = `\nRelated task: "${task.title}"${task.description ? ` - ${task.description}` : ""}`;
      } catch {
        // Task not found
      }
    }

    // Get project context
    const project = await this.projectsService.findOne(dto.projectId);

    const prompt = `Generate a git commit message following conventional commits format.

Project: ${project.name}${taskContext}

Changes:
${changes.slice(0, 3000)}${changes.length > 3000 ? "\n... (truncated)" : ""}

${dto.type ? `Commit type should be: ${dto.type}` : ""}

Generate a commit message with:
1. Type (feat, fix, docs, style, refactor, test, chore)
2. Optional scope in parentheses
3. Short description (max 72 chars)
4. 2-3 alternative suggestions

Respond in JSON:
{
  "message": "feat(auth): add JWT refresh token support",
  "type": "feat",
  "scope": "auth",
  "suggestions": ["feat: implement token refresh", "feat(security): add refresh token mechanism"]
}`;

    const response = await this.openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    const aiResponse = JSON.parse(response.choices[0].message.content || "{}");

    return {
      message: aiResponse.message || "chore: update",
      type: aiResponse.type || CommitType.CHORE,
      scope: aiResponse.scope,
      suggestions: aiResponse.suggestions || [],
    };
  }

  /**
   * Create a commit
   */
  async createCommit(dto: CreateCommitDto): Promise<CommitResultDto> {
    const repoPath = await this.getRepoPath(dto.projectId);

    try {
      // Stage files
      if (dto.files && dto.files.length > 0) {
        for (const file of dto.files) {
          await this.execGit(repoPath, `add "${file}"`);
        }
      } else {
        await this.execGit(repoPath, "add -A");
      }

      // Check if there's anything to commit
      const { stdout: status } = await this.execGit(
        repoPath,
        "status --porcelain",
      );
      if (!status.trim()) {
        return {
          success: false,
          commitHash: "",
          message: "Nothing to commit",
          error: "No changes staged for commit",
        };
      }

      // Create commit
      await this.execGit(
        repoPath,
        `commit -m "${dto.message.replace(/"/g, '\\"')}"`,
      );

      // Get commit hash
      const { stdout: hash } = await this.execGit(
        repoPath,
        "rev-parse --short HEAD",
      );

      let pushed = false;
      if (dto.push) {
        try {
          await this.execGit(repoPath, "push");
          pushed = true;
        } catch (error: any) {
          this.logger.warn(`Push failed: ${error.message}`);
        }
      }

      return {
        success: true,
        commitHash: hash.trim(),
        message: dto.message,
        pushed,
      };
    } catch (error: any) {
      return {
        success: false,
        commitHash: "",
        message: dto.message,
        error: error.message,
      };
    }
  }

  /**
   * Generate changelog from commits
   */
  async generateChangelog(
    dto: GenerateChangelogDto,
  ): Promise<ChangelogResponseDto> {
    const repoPath = await this.getRepoPath(dto.projectId);

    // Get commits
    const range = dto.from
      ? `${dto.from}..${dto.to || "HEAD"}`
      : dto.to || "HEAD~20..HEAD";

    const { stdout: logOutput } = await this.execGit(
      repoPath,
      `log ${range} --format="%H|%s|%an|%ai" --reverse`,
    );

    const commits: ChangelogResponseDto["commits"] = [];
    const stats = { features: 0, fixes: 0, others: 0 };

    for (const line of logOutput.split("\n").filter(Boolean)) {
      const [hash, message, author, date] = line.split("|");

      let type: CommitType | undefined;
      if (message.startsWith("feat")) {
        type = CommitType.FEAT;
        stats.features++;
      } else if (message.startsWith("fix")) {
        type = CommitType.FIX;
        stats.fixes++;
      } else {
        stats.others++;
      }

      commits.push({
        hash: hash.slice(0, 7),
        message,
        author,
        date,
        type,
      });
    }

    // Generate changelog with AI
    const project = await this.projectsService.findOne(dto.projectId);
    const version = dto.version || new Date().toISOString().split("T")[0];

    const prompt = `Generate a changelog in markdown format for these commits:

Project: ${project.name}
Version: ${version}

Commits:
${commits.map((c) => `- ${c.message} (${c.author})`).join("\n")}

Create a well-formatted changelog with sections:
- Features (feat commits)
- Bug Fixes (fix commits)
- Other Changes (remaining commits)

Use bullet points and be concise. Start with "## [${version}]"`;

    const response = await this.openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.5,
    });

    return {
      changelog: response.choices[0].message.content || "",
      version,
      commits,
      stats,
    };
  }

  /**
   * Update/append to changelog file
   */
  async updateChangelog(
    dto: UpdateChangelogDto,
  ): Promise<{ success: boolean; path: string }> {
    const repoPath = await this.getRepoPath(dto.projectId);
    const changelogPath = path.join(repoPath, dto.filePath || "CHANGELOG.md");

    let existingContent = "";
    try {
      existingContent = await fs.readFile(changelogPath, "utf-8");
    } catch {
      // File doesn't exist, will create
    }

    // Insert new content after the title (if exists) or at the beginning
    let newContent: string;
    if (existingContent.startsWith("# ")) {
      const firstNewline = existingContent.indexOf("\n");
      const title = existingContent.slice(0, firstNewline + 1);
      const rest = existingContent.slice(firstNewline + 1);
      newContent = `${title}\n${dto.content}\n${rest}`;
    } else {
      newContent = `# Changelog\n\n${dto.content}\n\n${existingContent}`;
    }

    await fs.writeFile(changelogPath, newContent, "utf-8");

    return {
      success: true,
      path: changelogPath,
    };
  }

  /**
   * Generate documentation using AI
   */
  async generateDocumentation(
    dto: GenerateDocumentationDto,
  ): Promise<DocumentationResponseDto> {
    const repoPath = await this.getRepoPath(dto.projectId);
    const project = await this.projectsService.findOne(dto.projectId);
    const context = await this.projectsService.getOrCreateContext(
      dto.projectId,
    );

    // Get some context from the project
    let projectFiles = "";
    try {
      const { stdout } = await this.execGit(repoPath, "ls-files | head -50");
      projectFiles = stdout;
    } catch {
      // Ignore
    }

    const templates: Record<string, { prompt: string; filename: string }> = {
      readme: {
        prompt: `Generate a comprehensive README.md for this project.

Project: ${project.name}
Stack: ${context?.stack || "Not specified"}
Description: ${context?.aiDescription || project.description || "Not specified"}
${dto.context ? `Additional context: ${dto.context}` : ""}

Files in project:
${projectFiles}

Include:
1. Project title and badges
2. Description
3. Features
4. Prerequisites
5. Installation steps
6. Usage examples
7. Configuration
8. Contributing guidelines (brief)
9. License

Use markdown formatting.`,
        filename: "README.md",
      },
      api: {
        prompt: `Generate API documentation for this project.

Project: ${project.name}
Stack: ${context?.stack || "Not specified"}
${dto.context ? `Additional context: ${dto.context}` : ""}

Files:
${projectFiles}

Create documentation covering:
1. API Overview
2. Authentication
3. Endpoints (organized by resource)
4. Request/Response examples
5. Error codes
6. Rate limiting (if applicable)

Use markdown with code blocks for examples.`,
        filename: "docs/API.md",
      },
      setup: {
        prompt: `Generate a detailed setup/installation guide.

Project: ${project.name}
Stack: ${context?.stack || "Not specified"}
${dto.context ? `Additional context: ${dto.context}` : ""}

Create a step-by-step guide including:
1. System requirements
2. Dependencies installation
3. Environment setup
4. Database setup
5. Running in development
6. Running in production
7. Troubleshooting common issues`,
        filename: "docs/SETUP.md",
      },
      contributing: {
        prompt: `Generate a CONTRIBUTING.md guide.

Project: ${project.name}
${dto.context ? `Additional context: ${dto.context}` : ""}

Include:
1. Code of conduct summary
2. How to report bugs
3. How to suggest features
4. Development setup
5. Pull request process
6. Code style guidelines
7. Commit message format (conventional commits)
8. Testing requirements`,
        filename: "CONTRIBUTING.md",
      },
    };

    const template = templates[dto.type];

    const response = await this.openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: template.prompt }],
      temperature: 0.7,
      max_tokens: 4000,
    });

    return {
      content: response.choices[0].message.content || "",
      type: dto.type,
      suggestedFilename: template.filename,
    };
  }

  /**
   * Save documentation file
   */
  async saveDocumentation(
    dto: SaveDocumentationDto,
  ): Promise<{ success: boolean; path: string; committed?: boolean }> {
    const repoPath = await this.getRepoPath(dto.projectId);
    const filePath = path.join(repoPath, dto.filePath);

    // Ensure directory exists
    await fs.mkdir(path.dirname(filePath), { recursive: true });

    // Write file
    await fs.writeFile(filePath, dto.content, "utf-8");

    let committed = false;
    if (dto.commit) {
      const commitResult = await this.createCommit({
        projectId: dto.projectId,
        message: dto.commitMessage || `docs: add ${dto.filePath}`,
        files: [dto.filePath],
      });
      committed = commitResult.success;
    }

    return {
      success: true,
      path: filePath,
      committed,
    };
  }

  /**
   * Get diff for staged or unstaged changes
   */
  async getDiff(projectId: string, staged = false): Promise<string> {
    const repoPath = await this.getRepoPath(projectId);
    const { stdout } = await this.execGit(
      repoPath,
      staged ? "diff --staged" : "diff",
    );
    return stdout;
  }
}
