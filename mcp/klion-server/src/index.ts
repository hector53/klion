#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import {
  tasksApi,
  clientsApi,
  projectsApi,
  authApi,
  knowledgeApi,
  gitApi,
  parserApi,
  spacesApi,
  CreateTaskDto,
  UpdateTaskDto,
  UpdateProjectContextDto,
  CreateKnowledgeDto,
  UpdateKnowledgeDto,
  CreateSpaceDto,
  UpdateSpaceDto,
  SpaceType,
  KnowledgeType,
  CommitType,
  ExtractedTask,
} from "./api.js";
import { isAuthenticated, getUser } from "./config.js";

// Create MCP Server
const server = new Server(
  {
    name: "klion-mcp-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  },
);

// =============================================================================
// TOOLS - Actions that AI agents can perform
// =============================================================================

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      // Task tools
      {
        name: "create_task",
        description:
          "Create a new task in Klion. Requires a clientId and title. The task will be added to the Kanban board.",
        inputSchema: {
          type: "object",
          properties: {
            clientId: {
              type: "string",
              description:
                "UUID of the client this task belongs to. Use list_clients to get available clients.",
            },
            title: {
              type: "string",
              description: "Title of the task (max 255 characters)",
            },
            projectId: {
              type: "string",
              description: "Optional UUID of the project this task belongs to",
            },
            description: {
              type: "string",
              description: "Optional detailed description of the task",
            },
            status: {
              type: "string",
              enum: ["todo", "doing", "blocked", "done"],
              description: 'Task status. Defaults to "todo"',
            },
            priority: {
              type: "string",
              enum: ["low", "medium", "high"],
              description: 'Task priority. Defaults to "medium"',
            },
            dueDate: {
              type: "string",
              description: "Due date in ISO format (YYYY-MM-DD)",
            },
            tags: {
              type: "array",
              items: { type: "string" },
              description: "Array of tags for the task",
            },
            metadata: {
              type: "object",
              description:
                "Flexible metadata for domain-specific data. Examples: { km_actual: 45000, km_objetivo: 50000 } for auto, { doctor: 'Dr. García' } for health, { monto: 500 } for finance",
            },
          },
          required: ["clientId", "title"],
        },
      },
      {
        name: "update_task",
        description:
          "Partially update an existing task in Klion. Only send the fields you want to change — omitted fields keep their current value.",
        inputSchema: {
          type: "object",
          properties: {
            taskId: {
              type: "string",
              description: "UUID of the task to update",
            },
            title: {
              type: "string",
              description:
                "New title for the task (max 255 characters). Omit to keep the current title.",
            },
            description: {
              type: "string",
              description:
                "New description. Omit to keep the current description; send an empty string to clear it.",
            },
            status: {
              type: "string",
              enum: ["todo", "doing", "blocked", "done"],
              description:
                "New status. Omit to keep the current status. To also reposition the task within/across board columns, use move_task instead.",
            },
            priority: {
              type: "string",
              enum: ["low", "medium", "high"],
              description: "New priority. Omit to keep the current priority.",
            },
            dueDate: {
              type: "string",
              description:
                "New due date in ISO format (YYYY-MM-DD). Omit to keep the current due date.",
            },
            tags: {
              type: "array",
              items: { type: "string" },
              description:
                "Replaces the full tags array (not merged) — include all tags you want to keep plus any new ones.",
            },
            projectId: {
              type: "string",
              description:
                "UUID to reassign the task to a different project. Omit to keep the current project.",
            },
            clientId: {
              type: "string",
              description:
                "UUID to reassign the task to a different client. Omit to keep the current client.",
            },
            metadata: {
              type: "object",
              description: "Update metadata fields (merged with existing)",
            },
          },
          required: ["taskId"],
        },
      },
      {
        name: "delete_task",
        description: "Delete a task from Klion",
        inputSchema: {
          type: "object",
          properties: {
            taskId: {
              type: "string",
              description: "UUID of the task to delete",
            },
          },
          required: ["taskId"],
        },
      },
      {
        name: "move_task",
        description:
          "Move a task to a different status column on the Kanban board",
        inputSchema: {
          type: "object",
          properties: {
            taskId: {
              type: "string",
              description: "UUID of the task to move",
            },
            status: {
              type: "string",
              enum: ["todo", "doing", "blocked", "done"],
              description: "New status for the task",
            },
            position: {
              type: "number",
              description: "Position in the column (0 = top)",
            },
          },
          required: ["taskId", "status"],
        },
      },
      {
        name: "list_tasks",
        description:
          "List tasks with optional filters (client, project, status, priority, creation date range) and real pagination. Defaults to a high limit (100) instead of the API's default of 10, so a single call can cover a whole project.",
        inputSchema: {
          type: "object",
          properties: {
            clientId: {
              type: "string",
              description: "Filter by client UUID",
            },
            projectId: {
              type: "string",
              description: "Filter by project UUID",
            },
            status: {
              type: "string",
              enum: ["todo", "doing", "blocked", "done"],
              description: "Filter by status",
            },
            priority: {
              type: "string",
              enum: ["low", "medium", "high"],
              description: "Filter by priority",
            },
            dateFrom: {
              type: "string",
              description:
                "Filter tasks created on/after this date (YYYY-MM-DD)",
            },
            dateTo: {
              type: "string",
              description:
                "Filter tasks created on/before this date (YYYY-MM-DD)",
            },
            page: {
              type: "number",
              description: "Page number (default 1)",
            },
            limit: {
              type: "number",
              description: "Results per page (default 100 for this tool)",
            },
          },
        },
      },
      {
        name: "get_task",
        description: "Get details of a specific task",
        inputSchema: {
          type: "object",
          properties: {
            taskId: {
              type: "string",
              description: "UUID of the task",
            },
          },
          required: ["taskId"],
        },
      },
      {
        name: "get_board",
        description:
          "Get the Kanban board with tasks grouped by status (todo, doing, blocked, done). " +
          "The 'done' column is capped at the most recently completed tasks (default 50) " +
          "because it grows without bound; check summary.doneTruncated and use doneLimit: 0 " +
          "if you really need every completed task.",
        inputSchema: {
          type: "object",
          properties: {
            projectId: {
              type: "string",
              description: "Optional: only tasks of this project",
            },
            clientId: {
              type: "string",
              description: "Optional: only tasks of this client",
            },
            doneLimit: {
              type: "number",
              description:
                "Max completed tasks to return, most recent first. 0 = no limit. Default 50.",
            },
          },
        },
      },
      // Space tools (Akela)
      {
        name: "list_spaces",
        description:
          "List all spaces for the user. Spaces separate different contexts (Personal, Work). Use this to organize tasks and projects by life context.",
        inputSchema: {
          type: "object",
          properties: {
            includeArchived: {
              type: "boolean",
              description: "Include archived spaces. Defaults to false.",
            },
          },
        },
      },
      {
        name: "get_space",
        description:
          "Get details of a specific space including its clients and projects",
        inputSchema: {
          type: "object",
          properties: {
            spaceId: {
              type: "string",
              description: "UUID of the space",
            },
          },
          required: ["spaceId"],
        },
      },
      {
        name: "create_space",
        description:
          "Create a new space. Use type 'personal' for personal life (auto, health, home) or 'work' for professional contexts (clients, projects).",
        inputSchema: {
          type: "object",
          properties: {
            name: {
              type: "string",
              description:
                'Name of the space. Examples: "Personal", "Trabajo", "Freelance"',
            },
            type: {
              type: "string",
              enum: ["personal", "work"],
              description:
                "Type of space. 'personal' has no clients section, 'work' allows clients.",
            },
            icon: {
              type: "string",
              description: 'Emoji or icon identifier. Examples: "🏠", "💼"',
            },
            color: {
              type: "string",
              description: "Hex color for the space. Example: #3B82F6",
            },
          },
          required: ["name"],
        },
      },
      {
        name: "update_space",
        description:
          "Partially update an existing space's name, type, icon, color, or archive status. Only send the fields you want to change — omitted fields keep their current value.",
        inputSchema: {
          type: "object",
          properties: {
            spaceId: {
              type: "string",
              description: "UUID of the space to update",
            },
            name: {
              type: "string",
              description: "New name for the space. Omit to keep the current name.",
            },
            type: {
              type: "string",
              enum: ["personal", "work"],
              description:
                "New type. Changing this may hide/show the clients section in the UI. Omit to keep the current type.",
            },
            icon: {
              type: "string",
              description:
                'New emoji or icon identifier, e.g. "🏠". Omit to keep the current icon.',
            },
            color: {
              type: "string",
              description:
                "New hex color, e.g. #3B82F6. Omit to keep the current color.",
            },
            isArchived: {
              type: "boolean",
              description:
                "Set true to archive the space (hides it from the active sidebar), false to unarchive. Omit to keep unchanged.",
            },
          },
          required: ["spaceId"],
        },
      },
      {
        name: "get_space_stats",
        description:
          "Get statistics for a space including project count, client count, and task counts by status",
        inputSchema: {
          type: "object",
          properties: {
            spaceId: {
              type: "string",
              description: "UUID of the space",
            },
          },
          required: ["spaceId"],
        },
      },
      // Client tools
      {
        name: "list_clients",
        description:
          "List all clients. Use this to get client IDs for creating tasks. Clients belong to 'work' type spaces.",
        inputSchema: {
          type: "object",
          properties: {
            includeInactive: {
              type: "boolean",
              description: "Include inactive clients. Defaults to false.",
            },
            spaceId: {
              type: "string",
              description: "Filter by space UUID",
            },
          },
        },
      },
      {
        name: "get_client",
        description: "Get details of a specific client",
        inputSchema: {
          type: "object",
          properties: {
            clientId: {
              type: "string",
              description: "UUID of the client",
            },
          },
          required: ["clientId"],
        },
      },
      // Project tools
      {
        name: "list_projects",
        description: "List all projects, optionally filtered by client",
        inputSchema: {
          type: "object",
          properties: {
            clientId: {
              type: "string",
              description: "Filter by client UUID",
            },
          },
        },
      },
      {
        name: "get_project",
        description: "Get details of a specific project",
        inputSchema: {
          type: "object",
          properties: {
            projectId: {
              type: "string",
              description: "UUID of the project",
            },
          },
          required: ["projectId"],
        },
      },
      {
        name: "get_context",
        description:
          "Get full project context for AI assistants. Returns comprehensive information including: " +
          "project details, client info, technical stack, development rules, current tasks, blocked items, " +
          "and upcoming deadlines. Use this at the start of a work session to understand the project fully. " +
          "You can use either the project ID (UUID) or project name (case-insensitive).",
        inputSchema: {
          type: "object",
          properties: {
            identifier: {
              type: "string",
              description:
                'Project ID (UUID) or project name. Examples: "Client Board Klion", "Bespire", or a UUID',
            },
          },
          required: ["identifier"],
        },
      },
      {
        name: "update_context",
        description:
          "Update project context settings. Use this to configure the project's technical stack, " +
          "development rules, repository info, and other AI-relevant settings.",
        inputSchema: {
          type: "object",
          properties: {
            projectId: {
              type: "string",
              description: "UUID of the project to update",
            },
            stack: {
              type: "string",
              description:
                'Technical stack description. Example: "Next.js 14, NestJS, PostgreSQL, TailwindCSS"',
            },
            rules: {
              type: "array",
              items: { type: "string" },
              description:
                'Development rules and guidelines. Example: ["Use DTOs for all endpoints", "Follow dark mode design"]',
            },
            aiDescription: {
              type: "string",
              description: "Extended description of the project for AI context",
            },
            repositoryUrl: {
              type: "string",
              description: "Repository URL (GitHub, Bitbucket, etc.)",
            },
            localPath: {
              type: "string",
              description: "Local path to the repository for RAG indexing",
            },
            defaultBranch: {
              type: "string",
              description: 'Default branch name (defaults to "main")',
            },
            tags: {
              type: "array",
              items: { type: "string" },
              description: "Tags for categorizing the project",
            },
            ragEnabled: {
              type: "boolean",
              description: "Whether RAG indexing is enabled for this project",
            },
          },
          required: ["projectId"],
        },
      },
      // Auth tools
      {
        name: "check_auth",
        description:
          "Check if the user is authenticated and get current user info",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      // Knowledge tools
      {
        name: "create_knowledge",
        description:
          "Create a new knowledge entry in Klion. Use this to save reusable code snippets, " +
          "architectural decisions, workflow patterns, solutions to common problems, and references. " +
          "Knowledge can be associated with specific projects or clients for better organization.",
        inputSchema: {
          type: "object",
          properties: {
            title: {
              type: "string",
              description: "Title of the knowledge entry (max 500 characters)",
            },
            content: {
              type: "string",
              description:
                "The main content - code snippet, documentation, explanation, etc.",
            },
            type: {
              type: "string",
              enum: [
                "snippet",
                "flow",
                "decision",
                "pattern",
                "solution",
                "reference",
                "other",
              ],
              description:
                'Type of knowledge. Defaults to "snippet". Use "decision" for architectural decisions, "flow" for workflows, "pattern" for design patterns, "solution" for problem solutions.',
            },
            summary: {
              type: "string",
              description:
                "Optional brief summary for quick reference (auto-generated if not provided)",
            },
            language: {
              type: "string",
              description:
                'Programming language for code snippets. Examples: "typescript", "python", "sql"',
            },
            sourceUrl: {
              type: "string",
              description:
                "Source URL if the knowledge comes from external documentation",
            },
            projectId: {
              type: "string",
              description:
                "Optional UUID of the project this knowledge belongs to",
            },
            clientId: {
              type: "string",
              description:
                "Optional UUID of the client this knowledge belongs to",
            },
            tags: {
              type: "array",
              items: { type: "string" },
              description:
                'Tags for categorization. Examples: ["auth", "api", "database"]',
            },
            isPublic: {
              type: "boolean",
              description:
                "Whether this knowledge is publicly accessible. Defaults to false.",
            },
          },
          required: ["title", "content"],
        },
      },
      {
        name: "search_knowledge",
        description:
          "Search Klion's own knowledge base of previously saved decisions, patterns, snippets, and solutions. " +
          "Call this BEFORE debugging an error from scratch or proposing a new architecture/design decision — " +
          "the answer, or a directly relevant precedent, may already be documented here from earlier work on this project. " +
          "Treat it as the default first step for: (1) investigating a bug or unexpected behavior, " +
          "(2) deciding how to structure a new feature, (3) any 'how do we usually handle X' question. " +
          "Returns up to `limit` ranked results (id, title, type, relevance score, summary, tags) — " +
          "call get_knowledge with the id for full content.",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description:
                "Keywords describing the problem or topic — short and specific (error message fragment, feature name, technology), not a full sentence.",
            },
            type: {
              type: "string",
              enum: [
                "snippet",
                "flow",
                "decision",
                "pattern",
                "solution",
                "reference",
                "other",
              ],
              description: "Filter by knowledge type",
            },
            projectId: {
              type: "string",
              description: "Filter by project UUID",
            },
            clientId: {
              type: "string",
              description: "Filter by client UUID",
            },
            limit: {
              type: "number",
              description: "Maximum number of results to return (default: 10)",
            },
          },
          required: ["query"],
        },
      },
      {
        name: "get_knowledge",
        description: "Get the full details of a specific knowledge entry by ID",
        inputSchema: {
          type: "object",
          properties: {
            knowledgeId: {
              type: "string",
              description: "UUID of the knowledge entry",
            },
          },
          required: ["knowledgeId"],
        },
      },
      {
        name: "list_knowledge",
        description:
          "List all knowledge entries with optional filters. Use this to browse available knowledge.",
        inputSchema: {
          type: "object",
          properties: {
            type: {
              type: "string",
              enum: [
                "snippet",
                "flow",
                "decision",
                "pattern",
                "solution",
                "reference",
                "other",
              ],
              description: "Filter by knowledge type",
            },
            projectId: {
              type: "string",
              description: "Filter by project UUID",
            },
            clientId: {
              type: "string",
              description: "Filter by client UUID",
            },
            tag: {
              type: "string",
              description: "Filter by tag name",
            },
            includeArchived: {
              type: "boolean",
              description: "Include archived entries. Defaults to false.",
            },
            limit: {
              type: "number",
              description: "Maximum number of results",
            },
          },
        },
      },
      {
        name: "update_knowledge",
        description:
          "Partially update an existing knowledge entry. Only send the fields you want to change — omitted fields keep their current value.",
        inputSchema: {
          type: "object",
          properties: {
            knowledgeId: {
              type: "string",
              description: "UUID of the knowledge entry to update",
            },
            title: {
              type: "string",
              description:
                "New title (max 500 characters). Omit to keep the current title.",
            },
            content: {
              type: "string",
              description:
                "New content — replaces the existing content entirely. Omit to keep it unchanged.",
            },
            type: {
              type: "string",
              enum: [
                "snippet",
                "flow",
                "decision",
                "pattern",
                "solution",
                "reference",
                "other",
              ],
              description: "New type. Omit to keep the current type.",
            },
            summary: {
              type: "string",
              description:
                "New brief summary. Omit to keep the current summary.",
            },
            language: {
              type: "string",
              description:
                'New programming language tag for code snippets, e.g. "typescript". Omit to keep unchanged.',
            },
            sourceUrl: {
              type: "string",
              description: "New source URL. Omit to keep unchanged.",
            },
            projectId: {
              type: "string",
              description:
                "UUID to reassign this entry to a different project. Omit to keep the current association.",
            },
            clientId: {
              type: "string",
              description:
                "UUID to reassign this entry to a different client. Omit to keep the current association.",
            },
            tags: {
              type: "array",
              items: { type: "string" },
              description:
                "Replaces the full tags array (not merged) — include all tags you want to keep plus any new ones.",
            },
            isPublic: {
              type: "boolean",
              description:
                "Set true to make this entry publicly accessible, false to make it private. Omit to keep unchanged.",
            },
            isArchived: {
              type: "boolean",
              description:
                "Set true to archive (hide from default listings), false to unarchive. Omit to keep unchanged.",
            },
          },
          required: ["knowledgeId"],
        },
      },
      {
        name: "delete_knowledge",
        description: "Permanently delete a knowledge entry",
        inputSchema: {
          type: "object",
          properties: {
            knowledgeId: {
              type: "string",
              description: "UUID of the knowledge entry to delete",
            },
          },
          required: ["knowledgeId"],
        },
      },
      // Git tools
      {
        name: "git_status",
        description:
          "Get the current status of a project's git repository. Shows branch, staged/modified/untracked files, " +
          "and ahead/behind status relative to upstream.",
        inputSchema: {
          type: "object",
          properties: {
            projectId: {
              type: "string",
              description: "UUID of the project",
            },
          },
          required: ["projectId"],
        },
      },
      {
        name: "git_branches",
        description: "List all branches in the project's repository",
        inputSchema: {
          type: "object",
          properties: {
            projectId: {
              type: "string",
              description: "UUID of the project",
            },
          },
          required: ["projectId"],
        },
      },
      {
        name: "git_diff",
        description:
          "Get the diff of staged or unstaged changes in the repository. Large diffs are truncated to the first 300 lines " +
          "(with a note showing how many lines were omitted) — stage/commit selectively if you need to see the rest.",
        inputSchema: {
          type: "object",
          properties: {
            projectId: {
              type: "string",
              description: "UUID of the project",
            },
            staged: {
              type: "boolean",
              description:
                "If true, shows staged changes. If false, shows unstaged changes (default: false)",
            },
          },
          required: ["projectId"],
        },
      },
      {
        name: "generate_commit_message",
        description:
          "Generate a commit message using AI based on the current changes. " +
          "Returns a conventional commit message with type, optional scope, and description.",
        inputSchema: {
          type: "object",
          properties: {
            projectId: {
              type: "string",
              description: "UUID of the project",
            },
            changes: {
              type: "string",
              description:
                "Optional: Description of changes. If not provided, will analyze the diff.",
            },
            taskId: {
              type: "string",
              description:
                "Optional: Related task UUID to include context in the message",
            },
            type: {
              type: "string",
              enum: [
                "feat",
                "fix",
                "docs",
                "style",
                "refactor",
                "test",
                "chore",
              ],
              description: "Optional: Force a specific commit type",
            },
          },
          required: ["projectId"],
        },
      },
      {
        name: "git_commit",
        description:
          "Create a git commit with the specified message. Can optionally stage specific files and push after committing.",
        inputSchema: {
          type: "object",
          properties: {
            projectId: {
              type: "string",
              description: "UUID of the project",
            },
            message: {
              type: "string",
              description:
                "Commit message (conventional commit format recommended)",
            },
            files: {
              type: "array",
              items: { type: "string" },
              description:
                "Optional: Specific files to stage. If not provided, stages all changes.",
            },
            push: {
              type: "boolean",
              description:
                "If true, push to remote after committing (default: false)",
            },
          },
          required: ["projectId", "message"],
        },
      },
      {
        name: "generate_changelog",
        description:
          "Generate a changelog from git commits using AI. Groups commits by type (features, fixes, etc).",
        inputSchema: {
          type: "object",
          properties: {
            projectId: {
              type: "string",
              description: "UUID of the project",
            },
            from: {
              type: "string",
              description:
                "Optional: Starting commit/tag. If not provided, uses last 20 commits.",
            },
            to: {
              type: "string",
              description: "Optional: Ending commit/tag (default: HEAD)",
            },
            version: {
              type: "string",
              description: "Optional: Version number for the changelog header",
            },
          },
          required: ["projectId"],
        },
      },
      {
        name: "update_changelog",
        description: "Update the CHANGELOG.md file with new content",
        inputSchema: {
          type: "object",
          properties: {
            projectId: {
              type: "string",
              description: "UUID of the project",
            },
            content: {
              type: "string",
              description: "Changelog content to prepend to the file",
            },
            filePath: {
              type: "string",
              description:
                "Optional: Path to changelog file (default: CHANGELOG.md)",
            },
          },
          required: ["projectId", "content"],
        },
      },
      {
        name: "generate_documentation",
        description:
          "Generate documentation files using AI (README, API docs, setup guide, or contributing guide)",
        inputSchema: {
          type: "object",
          properties: {
            projectId: {
              type: "string",
              description: "UUID of the project",
            },
            type: {
              type: "string",
              enum: ["readme", "api", "setup", "contributing"],
              description: "Type of documentation to generate",
            },
            context: {
              type: "string",
              description:
                "Optional: Additional context or instructions for the AI",
            },
          },
          required: ["projectId", "type"],
        },
      },
      {
        name: "save_documentation",
        description:
          "Save generated documentation to a file, optionally committing it",
        inputSchema: {
          type: "object",
          properties: {
            projectId: {
              type: "string",
              description: "UUID of the project",
            },
            content: {
              type: "string",
              description: "Documentation content",
            },
            filePath: {
              type: "string",
              description:
                "File path relative to repository root (e.g., 'README.md', 'docs/API.md')",
            },
            commit: {
              type: "boolean",
              description:
                "If true, commit the file after saving (default: false)",
            },
            commitMessage: {
              type: "string",
              description:
                "Optional: Custom commit message (default: 'docs: add <filename>')",
            },
          },
          required: ["projectId", "content", "filePath"],
        },
      },

      // Conversation Parser tools
      {
        name: "parse_conversation",
        description:
          "Parse a conversation (from Slack, WhatsApp, email, etc.) and extract potential tasks, " +
          "decisions, and pending questions. Perfect for turning meeting notes or chat discussions into actionable tasks.",
        inputSchema: {
          type: "object",
          properties: {
            conversation: {
              type: "string",
              description: "The full conversation text to analyze",
            },
            clientId: {
              type: "string",
              description: "Optional: Client UUID for context",
            },
            projectId: {
              type: "string",
              description: "Optional: Project UUID for context",
            },
            context: {
              type: "string",
              description:
                "Optional: Additional context to help with extraction (e.g., 'This is about the payment module')",
            },
          },
          required: ["conversation"],
        },
      },
      {
        name: "create_tasks_from_conversation",
        description:
          "Create tasks from the results of parse_conversation. Pass the extracted tasks to create them in Klion.",
        inputSchema: {
          type: "object",
          properties: {
            clientId: {
              type: "string",
              description: "UUID of the client for the tasks",
            },
            projectId: {
              type: "string",
              description: "Optional: UUID of the project for the tasks",
            },
            tasks: {
              type: "array",
              description:
                "Array of tasks to create (from parse_conversation result)",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                  priority: {
                    type: "string",
                    enum: ["low", "medium", "high"],
                  },
                  tags: { type: "array", items: { type: "string" } },
                },
                required: ["title", "priority"],
              },
            },
          },
          required: ["clientId", "tasks"],
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args = {} } = request.params;

  try {
    switch (name) {
      // Task operations
      case "create_task": {
        const taskData: CreateTaskDto = {
          clientId: args["clientId"] as string,
          title: args["title"] as string,
          projectId: args["projectId"] as string | undefined,
          description: args["description"] as string | undefined,
          status: args["status"] as CreateTaskDto["status"],
          priority: args["priority"] as CreateTaskDto["priority"],
          dueDate: args["dueDate"] as string | undefined,
          tags: args["tags"] as string[] | undefined,
          metadata: args["metadata"] as Record<string, any> | undefined,
        };
        const task = await tasksApi.create(taskData);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  message: `Task "${task.title}" created successfully`,
                  task,
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      case "update_task": {
        const taskId = args["taskId"] as string;
        const updateData: UpdateTaskDto = {
          title: args["title"] as string | undefined,
          description: args["description"] as string | undefined,
          status: args["status"] as UpdateTaskDto["status"],
          priority: args["priority"] as UpdateTaskDto["priority"],
          dueDate: args["dueDate"] as string | undefined,
          tags: args["tags"] as string[] | undefined,
          projectId: args["projectId"] as string | undefined,
          clientId: args["clientId"] as string | undefined,
          metadata: args["metadata"] as Record<string, any> | undefined,
        };
        const task = await tasksApi.update(taskId, updateData);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  message: `Task "${task.title}" updated successfully`,
                  task,
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      case "delete_task": {
        await tasksApi.delete(args["taskId"] as string);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  message: "Task deleted successfully",
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      case "move_task": {
        const newStatus = args["status"] as string;
        const task = await tasksApi.move(
          args["taskId"] as string,
          newStatus,
          (args["position"] as number) || 0,
        );
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  message: `Task moved to "${newStatus}"`,
                  task,
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      case "list_tasks": {
        const result = await tasksApi.getAll({
          clientId: args["clientId"] as string | undefined,
          projectId: args["projectId"] as string | undefined,
          status: args["status"] as string | undefined,
          priority: args["priority"] as string | undefined,
          dateFrom: args["dateFrom"] as string | undefined,
          dateTo: args["dateTo"] as string | undefined,
          page: args["page"] as number | undefined,
          limit: (args["limit"] as number | undefined) ?? 100,
        });
        const tasks = result.tasks;
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  count: tasks.length,
                  total: result.total,
                  page: result.page,
                  limit: result.limit,
                  totalPages: result.totalPages,
                  tasks: tasks.map((t) => ({
                    id: t.id,
                    taskCode: t.taskCode,
                    title: t.title,
                    status: t.status,
                    priority: t.priority,
                    projectId: t.projectId,
                    client: t.client?.name,
                    dueDate: t.dueDate,
                  })),
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      case "get_task": {
        const task = await tasksApi.getOne(args["taskId"] as string);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(task, null, 2),
            },
          ],
        };
      }

      case "get_board": {
        const doneLimit =
          typeof args["doneLimit"] === "number"
            ? (args["doneLimit"] as number)
            : undefined;
        const board = await tasksApi.getBoard({
          projectId: args["projectId"] as string | undefined,
          clientId: args["clientId"] as string | undefined,
          doneLimit,
        });
        // Ensure all columns exist with defaults
        const todo = board.todo || [];
        const doing = board.doing || [];
        const blocked = board.blocked || [];
        const done = board.done || [];

        // El backend recorta "done"; sin este aviso, summary.done se lee como
        // "hay N completadas en total", que es falso.
        const effectiveDoneLimit = doneLimit ?? 50;
        const summary = {
          todo: todo.length,
          doing: doing.length,
          blocked: blocked.length,
          done: done.length,
          doneTruncated:
            effectiveDoneLimit > 0 && done.length >= effectiveDoneLimit,
          total: todo.length + doing.length + blocked.length + done.length,
        };
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  summary,
                  board: {
                    todo: todo.map((t) => ({
                      id: t.id,
                      title: t.title,
                      priority: t.priority,
                      client: t.client?.name,
                    })),
                    doing: doing.map((t) => ({
                      id: t.id,
                      title: t.title,
                      priority: t.priority,
                      client: t.client?.name,
                    })),
                    blocked: blocked.map((t) => ({
                      id: t.id,
                      title: t.title,
                      priority: t.priority,
                      client: t.client?.name,
                    })),
                    done: done.map((t) => ({
                      id: t.id,
                      title: t.title,
                      priority: t.priority,
                      client: t.client?.name,
                    })),
                  },
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      // Space operations (Akela)
      case "list_spaces": {
        const spaces = await spacesApi.getAll(
          (args["includeArchived"] as boolean) || false,
        );
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  count: spaces.length,
                  spaces: spaces.map((s) => ({
                    id: s.id,
                    name: s.name,
                    type: s.type,
                    icon: s.icon,
                    color: s.color,
                    isArchived: s.isArchived,
                  })),
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      case "get_space": {
        const space = await spacesApi.getOne(args["spaceId"] as string);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  space,
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      case "create_space": {
        const spaceData: CreateSpaceDto = {
          name: args["name"] as string,
          type: args["type"] as SpaceType | undefined,
          icon: args["icon"] as string | undefined,
          color: args["color"] as string | undefined,
        };
        const space = await spacesApi.create(spaceData);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  message: `Space "${space.name}" created successfully`,
                  space,
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      case "update_space": {
        const spaceId = args["spaceId"] as string;
        const updateData: UpdateSpaceDto = {
          name: args["name"] as string | undefined,
          type: args["type"] as SpaceType | undefined,
          icon: args["icon"] as string | undefined,
          color: args["color"] as string | undefined,
          isArchived: args["isArchived"] as boolean | undefined,
        };
        // Remove undefined values
        Object.keys(updateData).forEach((key) => {
          if (updateData[key as keyof UpdateSpaceDto] === undefined) {
            delete updateData[key as keyof UpdateSpaceDto];
          }
        });
        const space = await spacesApi.update(spaceId, updateData);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  message: `Space "${space.name}" updated successfully`,
                  space,
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      case "get_space_stats": {
        const stats = await spacesApi.getStats(args["spaceId"] as string);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  ...stats,
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      // Client operations
      case "list_clients": {
        const clients = await clientsApi.getAll(
          args["includeInactive"] as boolean,
        );
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  count: clients.length,
                  clients: clients.map((c) => ({
                    id: c.id,
                    name: c.name,
                    company: c.company,
                    email: c.email,
                    spaceId: c.spaceId,
                    isActive: c.isActive,
                  })),
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      case "get_client": {
        const client = await clientsApi.getOne(args["clientId"] as string);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(client, null, 2),
            },
          ],
        };
      }

      // Project operations
      case "list_projects": {
        const projects = await projectsApi.getAll(
          args["clientId"] as string | undefined,
        );
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  count: projects.length,
                  projects: projects.map((p) => ({
                    id: p.id,
                    name: p.name,
                    status: p.status,
                    color: p.color,
                    clientId: p.clientId,
                  })),
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      case "get_project": {
        const project = await projectsApi.getOne(args["projectId"] as string);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(project, null, 2),
            },
          ],
        };
      }

      case "get_context": {
        const identifier = args["identifier"] as string;
        const context = await projectsApi.getContext(identifier);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  message: `Context retrieved for project "${context.project.name}"`,
                  ...context,
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      case "update_context": {
        const projectId = args["projectId"] as string;
        const updateData: UpdateProjectContextDto = {
          stack: args["stack"] as string | undefined,
          rules: args["rules"] as string[] | undefined,
          aiDescription: args["aiDescription"] as string | undefined,
          repositoryUrl: args["repositoryUrl"] as string | undefined,
          localPath: args["localPath"] as string | undefined,
          defaultBranch: args["defaultBranch"] as string | undefined,
          tags: args["tags"] as string[] | undefined,
          ragEnabled: args["ragEnabled"] as boolean | undefined,
        };
        // Remove undefined values
        Object.keys(updateData).forEach((key) => {
          if (updateData[key as keyof UpdateProjectContextDto] === undefined) {
            delete updateData[key as keyof UpdateProjectContextDto];
          }
        });
        const result = await projectsApi.updateContext(projectId, updateData);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  message: "Project context updated successfully",
                  context: result,
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      // Auth operations
      case "check_auth": {
        const authenticated = isAuthenticated();
        const user = getUser();
        if (authenticated && user) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    authenticated: true,
                    user,
                  },
                  null,
                  2,
                ),
              },
            ],
          };
        }
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  authenticated: false,
                  message:
                    'Not authenticated. Please run "klion login" in terminal first.',
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      // Knowledge operations
      case "create_knowledge": {
        const knowledgeData: CreateKnowledgeDto = {
          title: args["title"] as string,
          content: args["content"] as string,
          type: args["type"] as KnowledgeType | undefined,
          summary: args["summary"] as string | undefined,
          language: args["language"] as string | undefined,
          sourceUrl: args["sourceUrl"] as string | undefined,
          projectId: args["projectId"] as string | undefined,
          clientId: args["clientId"] as string | undefined,
          tags: args["tags"] as string[] | undefined,
          isPublic: args["isPublic"] as boolean | undefined,
        };
        const knowledge = await knowledgeApi.create(knowledgeData);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  message: `Knowledge "${knowledge.title}" created successfully`,
                  knowledge: {
                    id: knowledge.id,
                    title: knowledge.title,
                    type: knowledge.type,
                    summary: knowledge.summary,
                    tags: knowledge.tags?.map((t) => t.name),
                  },
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      case "search_knowledge": {
        const searchResults = await knowledgeApi.search({
          query: args["query"] as string,
          type: args["type"] as KnowledgeType | undefined,
          projectId: args["projectId"] as string | undefined,
          clientId: args["clientId"] as string | undefined,
          limit: args["limit"] as number | undefined,
        });
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  count: searchResults.length,
                  results: searchResults.map((r) => ({
                    id: r.id,
                    title: r.title,
                    type: r.type,
                    summary: r.summary,
                    relevance: r.relevance,
                    tags: r.tags,
                    project: r.projectName,
                    client: r.clientName,
                  })),
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      case "get_knowledge": {
        const knowledge = await knowledgeApi.getOne(
          args["knowledgeId"] as string,
        );
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  knowledge: {
                    id: knowledge.id,
                    title: knowledge.title,
                    content: knowledge.content,
                    type: knowledge.type,
                    summary: knowledge.summary,
                    language: knowledge.language,
                    sourceUrl: knowledge.sourceUrl,
                    tags: knowledge.tags?.map((t) => t.name),
                    project: knowledge.project?.name,
                    client: knowledge.client?.name,
                    usageCount: knowledge.usageCount,
                    createdAt: knowledge.createdAt,
                    updatedAt: knowledge.updatedAt,
                  },
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      case "list_knowledge": {
        const knowledgeList = await knowledgeApi.getAll({
          type: args["type"] as KnowledgeType | undefined,
          projectId: args["projectId"] as string | undefined,
          clientId: args["clientId"] as string | undefined,
          tag: args["tag"] as string | undefined,
          includeArchived: args["includeArchived"] as boolean | undefined,
          limit: args["limit"] as number | undefined,
        });
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  count: knowledgeList.length,
                  knowledge: knowledgeList.map((k) => ({
                    id: k.id,
                    title: k.title,
                    type: k.type,
                    summary: k.summary,
                    language: k.language,
                    tags: k.tags?.map((t) => t.name),
                    usageCount: k.usageCount,
                    isArchived: k.isArchived,
                  })),
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      case "update_knowledge": {
        const knowledgeId = args["knowledgeId"] as string;
        const updateData: UpdateKnowledgeDto = {
          title: args["title"] as string | undefined,
          content: args["content"] as string | undefined,
          type: args["type"] as KnowledgeType | undefined,
          summary: args["summary"] as string | undefined,
          language: args["language"] as string | undefined,
          sourceUrl: args["sourceUrl"] as string | undefined,
          projectId: args["projectId"] as string | undefined,
          clientId: args["clientId"] as string | undefined,
          tags: args["tags"] as string[] | undefined,
          isPublic: args["isPublic"] as boolean | undefined,
          isArchived: args["isArchived"] as boolean | undefined,
        };
        // Remove undefined values
        Object.keys(updateData).forEach((key) => {
          if (updateData[key as keyof UpdateKnowledgeDto] === undefined) {
            delete updateData[key as keyof UpdateKnowledgeDto];
          }
        });
        const knowledge = await knowledgeApi.update(knowledgeId, updateData);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  message: `Knowledge "${knowledge.title}" updated successfully`,
                  knowledge: {
                    id: knowledge.id,
                    title: knowledge.title,
                    type: knowledge.type,
                  },
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      case "delete_knowledge": {
        await knowledgeApi.delete(args["knowledgeId"] as string);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  message: "Knowledge entry deleted successfully",
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      // Git operations
      case "git_status": {
        const status = await gitApi.getStatus(args["projectId"] as string);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(status, null, 2),
            },
          ],
        };
      }

      case "git_branches": {
        const branches = await gitApi.getBranches(args["projectId"] as string);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(branches, null, 2),
            },
          ],
        };
      }

      case "git_diff": {
        const diff = await gitApi.getDiff(
          args["projectId"] as string,
          args["staged"] as boolean | undefined,
        );
        const MAX_DIFF_LINES = 300;
        let output = diff || "No changes";
        if (diff) {
          const lines = diff.split("\n");
          if (lines.length > MAX_DIFF_LINES) {
            output =
              lines.slice(0, MAX_DIFF_LINES).join("\n") +
              `\n... (truncated: showing ${MAX_DIFF_LINES} of ${lines.length} lines. Stage/commit selectively if you need to see the rest.)`;
          }
        }
        return {
          content: [
            {
              type: "text",
              text: output,
            },
          ],
        };
      }

      case "generate_commit_message": {
        const commitMsg = await gitApi.generateCommitMessage({
          projectId: args["projectId"] as string,
          changes: args["changes"] as string | undefined,
          taskId: args["taskId"] as string | undefined,
          type: args["type"] as CommitType | undefined,
        });
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(commitMsg, null, 2),
            },
          ],
        };
      }

      case "git_commit": {
        const commitResult = await gitApi.createCommit({
          projectId: args["projectId"] as string,
          message: args["message"] as string,
          files: args["files"] as string[] | undefined,
          push: args["push"] as boolean | undefined,
        });
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(commitResult, null, 2),
            },
          ],
        };
      }

      case "generate_changelog": {
        const changelog = await gitApi.generateChangelog({
          projectId: args["projectId"] as string,
          from: args["from"] as string | undefined,
          to: args["to"] as string | undefined,
          version: args["version"] as string | undefined,
        });
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  ...changelog,
                  // Truncate changelog content for display
                  changelog:
                    changelog.changelog.length > 2000
                      ? changelog.changelog.slice(0, 2000) + "\n... (truncated)"
                      : changelog.changelog,
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      case "update_changelog": {
        const updateResult = await gitApi.updateChangelog({
          projectId: args["projectId"] as string,
          content: args["content"] as string,
          filePath: args["filePath"] as string | undefined,
        });
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  message: `Changelog updated at ${updateResult.path}`,
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      case "generate_documentation": {
        const docs = await gitApi.generateDocumentation({
          projectId: args["projectId"] as string,
          type: args["type"] as "readme" | "api" | "setup" | "contributing",
          context: args["context"] as string | undefined,
        });
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  ...docs,
                  // Truncate for display
                  content:
                    docs.content.length > 3000
                      ? docs.content.slice(0, 3000) + "\n... (truncated)"
                      : docs.content,
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      case "save_documentation": {
        const saveResult = await gitApi.saveDocumentation({
          projectId: args["projectId"] as string,
          content: args["content"] as string,
          filePath: args["filePath"] as string,
          commit: args["commit"] as boolean | undefined,
          commitMessage: args["commitMessage"] as string | undefined,
        });
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  message: `Documentation saved to ${saveResult.path}`,
                  committed: saveResult.committed,
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      // Conversation Parser operations
      case "parse_conversation": {
        const parseResult = await parserApi.parseConversation({
          conversation: args["conversation"] as string,
          clientId: args["clientId"] as string | undefined,
          projectId: args["projectId"] as string | undefined,
          context: args["context"] as string | undefined,
        });
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(parseResult, null, 2),
            },
          ],
        };
      }

      case "create_tasks_from_conversation": {
        const tasksToCreate = (args["tasks"] as any[]).map((t) => ({
          title: t.title,
          description: t.description,
          priority: t.priority || "medium",
          tags: t.tags || [],
          confidence: 1,
          sourceText: "",
        })) as ExtractedTask[];

        const createResult = await parserApi.createTasksFromParser({
          clientId: args["clientId"] as string,
          projectId: args["projectId"] as string | undefined,
          tasks: tasksToCreate,
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  message: `Created ${createResult.created.length} tasks`,
                  created: createResult.created.map((t) => ({
                    id: t.id,
                    title: t.title,
                  })),
                  failed: createResult.failed,
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              success: false,
              error: message,
            },
            null,
            2,
          ),
        },
      ],
      isError: true,
    };
  }
});

// =============================================================================
// RESOURCES - Context that AI agents can read
// =============================================================================

server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: [
      {
        uri: "klion://clients",
        name: "Active Clients",
        description: "List of all active clients with their IDs",
        mimeType: "application/json",
      },
      {
        uri: "klion://projects",
        name: "All Projects",
        description: "List of all projects grouped by client",
        mimeType: "application/json",
      },
      {
        uri: "klion://board/summary",
        name: "Board Summary",
        description: "Quick summary of the Kanban board status",
        mimeType: "application/json",
      },
    ],
  };
});

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;

  try {
    switch (uri) {
      case "klion://clients": {
        const clients = await clientsApi.getAll();
        return {
          contents: [
            {
              uri,
              mimeType: "application/json",
              text: JSON.stringify(
                clients.map((c) => ({
                  id: c.id,
                  name: c.name,
                  company: c.company,
                })),
                null,
                2,
              ),
            },
          ],
        };
      }

      case "klion://projects": {
        const projects = await projectsApi.getAll();
        return {
          contents: [
            {
              uri,
              mimeType: "application/json",
              text: JSON.stringify(
                projects.map((p) => ({
                  id: p.id,
                  name: p.name,
                  status: p.status,
                  clientId: p.clientId,
                })),
                null,
                2,
              ),
            },
          ],
        };
      }

      case "klion://board/summary": {
        const board = await tasksApi.getBoard();
        const todo = board.todo || [];
        const doing = board.doing || [];
        const blocked = board.blocked || [];
        const done = board.done || [];
        return {
          contents: [
            {
              uri,
              mimeType: "application/json",
              text: JSON.stringify(
                {
                  todo: todo.length,
                  doing: doing.length,
                  blocked: blocked.length,
                  done: done.length,
                  total:
                    todo.length + doing.length + blocked.length + done.length,
                  blockedTasks: blocked.map((t) => ({
                    id: t.id,
                    title: t.title,
                  })),
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown resource: ${uri}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Failed to read resource ${uri}: ${message}`);
  }
});

// =============================================================================
// START SERVER
// =============================================================================

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Klion MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
