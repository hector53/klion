#!/usr/bin/env node
import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import inquirer from "inquirer";
import {
  authApi,
  clientsApi,
  projectsApi,
  tasksApi,
  ragApi,
  CreateTaskDto,
} from "./api.js";
import { LocalIndexer } from "./local-indexer.js";
import {
  setAccessToken,
  setUser,
  clearAccessToken,
  isAuthenticated,
  getUser,
  getConfigPath,
  getApiUrl,
  setApiUrl,
  getServiceKey,
  setServiceKey,
  clearServiceKey,
} from "./config.js";

const program = new Command();

program
  .name("klion")
  .description("CLI for Klion - Kanban task management for freelancers")
  .version("1.0.0");

// =============================================================================
// AUTH COMMANDS
// =============================================================================

program
  .command("login")
  .description("Authenticate with Klion API")
  .option("-e, --email <email>", "Email address")
  .option("-p, --password <password>", "Password")
  .action(async (options) => {
    let email = options.email;
    let password = options.password;

    // Interactive prompts if not provided
    if (!email || !password) {
      const answers = await inquirer.prompt([
        {
          type: "input",
          name: "email",
          message: "Email:",
          when: !email,
        },
        {
          type: "password",
          name: "password",
          message: "Password:",
          mask: "*",
          when: !password,
        },
      ]);
      email = email || answers.email;
      password = password || answers.password;
    }

    const spinner = ora("Authenticating...").start();

    try {
      const response = await authApi.login({ email, password });
      setAccessToken(response.accessToken);
      setUser(response.user);

      spinner.succeed(chalk.green(`Welcome, ${response.user.name}!`));
      console.log(chalk.gray(`Token saved to ${getConfigPath()}`));
    } catch (error) {
      spinner.fail(chalk.red("Authentication failed"));
      console.error(
        chalk.red(error instanceof Error ? error.message : "Unknown error"),
      );
      process.exit(1);
    }
  });

program
  .command("logout")
  .description("Clear stored credentials")
  .action(() => {
    clearAccessToken();
    console.log(chalk.green("✓ Logged out successfully"));
  });

program
  .command("whoami")
  .description("Show current authenticated user")
  .action(() => {
    if (!isAuthenticated()) {
      console.log(chalk.yellow('Not authenticated. Run "klion login" first.'));
      process.exit(1);
    }
    const user = getUser();
    console.log(chalk.cyan(`Logged in as: ${user?.name} (${user?.email})`));
    console.log(chalk.gray(`API URL: ${getApiUrl()}`));
    console.log(chalk.gray(`Config: ${getConfigPath()}`));
  });

program
  .command("config")
  .description("Configure Klion CLI")
  .option("--api-url <url>", "Set API URL")
  .option(
    "--service-key <key>",
    "Guardar service key para auth headless (compartida por todos los hosts/MCP)",
  )
  .option("--clear-service-key", "Borrar la service key guardada")
  .option("--show", "Show current configuration")
  .action((options) => {
    if (options.show) {
      const serviceKey = getServiceKey();
      console.log(chalk.cyan("Current configuration:"));
      console.log(`  API URL: ${getApiUrl()}`);
      console.log(`  Config path: ${getConfigPath()}`);
      console.log(`  Authenticated (JWT): ${isAuthenticated() ? "Yes" : "No"}`);
      console.log(
        `  Service key: ${
          serviceKey
            ? `set (…${serviceKey.slice(-4)})`
            : "no"
        }`,
      );
      return;
    }

    if (options.apiUrl) {
      setApiUrl(options.apiUrl);
      console.log(chalk.green(`✓ API URL set to: ${options.apiUrl}`));
    }

    if (options.serviceKey) {
      setServiceKey(options.serviceKey);
      console.log(
        chalk.green(
          "✓ Service key guardada. Todos los hosts que lancen klion-mcp la usarán (reinicia cada host una vez).",
        ),
      );
    }

    if (options.clearServiceKey) {
      clearServiceKey();
      console.log(chalk.green("✓ Service key borrada."));
    }

    if (!options.apiUrl && !options.serviceKey && !options.clearServiceKey) {
      console.log(
        chalk.yellow(
          "Nada que hacer. Usa --show, --api-url, --service-key o --clear-service-key.",
        ),
      );
    }
  });

// =============================================================================
// TASK COMMANDS
// =============================================================================

const taskCmd = program.command("task").description("Manage tasks");

taskCmd
  .command("create")
  .description("Create a new task")
  .requiredOption("-c, --client <clientId>", "Client UUID (required)")
  .requiredOption("-t, --title <title>", "Task title (required)")
  .option("-p, --project <projectId>", "Project UUID")
  .option("-d, --description <description>", "Task description")
  .option("-s, --status <status>", "Status: todo, doing, blocked, done", "todo")
  .option("--priority <priority>", "Priority: low, medium, high", "medium")
  .option("--due <date>", "Due date (YYYY-MM-DD)")
  .option("--tags <tags>", "Comma-separated tags")
  .action(async (options) => {
    const spinner = ora("Creating task...").start();

    try {
      const taskData: CreateTaskDto = {
        clientId: options.client,
        title: options.title,
        projectId: options.project,
        description: options.description,
        status: options.status,
        priority: options.priority,
        dueDate: options.due,
        tags: options.tags
          ? options.tags.split(",").map((t: string) => t.trim())
          : undefined,
      };

      const task = await tasksApi.create(taskData);
      spinner.succeed(chalk.green(`Task created: ${task.title}`));
      console.log(chalk.gray(`  ID: ${task.id}`));
      console.log(chalk.gray(`  Status: ${task.status}`));
      console.log(chalk.gray(`  Priority: ${task.priority}`));
    } catch (error) {
      spinner.fail(chalk.red("Failed to create task"));
      console.error(
        chalk.red(error instanceof Error ? error.message : "Unknown error"),
      );
      process.exit(1);
    }
  });

taskCmd
  .command("list")
  .description("List tasks")
  .option("-c, --client <clientId>", "Filter by client")
  .option("-P, --project <projectId>", "Filter by project")
  .option("-s, --status <status>", "Filter by status")
  .option("-p, --priority <priority>", "Filter by priority")
  .option("--date-from <date>", "Filter tasks created on/after this date (YYYY-MM-DD)")
  .option("--date-to <date>", "Filter tasks created on/before this date (YYYY-MM-DD)")
  .option("--page <page>", "Page number", "1")
  .option("--limit <limit>", "Results per page", "100")
  .option("--json", "Output as JSON")
  .action(async (options) => {
    const spinner = ora("Fetching tasks...").start();

    try {
      const result = await tasksApi.getAll({
        clientId: options.client,
        projectId: options.project,
        status: options.status,
        priority: options.priority,
        dateFrom: options.dateFrom,
        dateTo: options.dateTo,
        page: parseInt(options.page, 10),
        limit: parseInt(options.limit, 10),
      });
      const tasks = result.tasks;

      spinner.stop();

      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
        return;
      }

      if (tasks.length === 0) {
        console.log(chalk.yellow("No tasks found"));
        return;
      }

      console.log(chalk.cyan(`\nFound ${tasks.length} tasks:\n`));

      for (const task of tasks) {
        const statusColors: Record<string, typeof chalk> = {
          todo: chalk.gray,
          doing: chalk.blue,
          blocked: chalk.red,
          done: chalk.green,
        };
        const priorityIcons: Record<string, string> = {
          low: "⬇",
          medium: "➡",
          high: "⬆",
        };

        const color = statusColors[task.status] || chalk.white;
        const icon = priorityIcons[task.priority] || "";

        console.log(
          `${icon} ${color(task.status.toUpperCase().padEnd(8))} ${task.taskCode ? `[${task.taskCode}] ` : ""}${task.title}`,
        );
        console.log(
          chalk.gray(
            `   ID: ${task.id} | Client: ${task.client?.name || "N/A"}`,
          ),
        );
      }

      console.log(
        chalk.gray(
          `\nShowing ${tasks.length} of ${result.total} (page ${result.page}/${result.totalPages})`,
        ),
      );
    } catch (error) {
      spinner.fail(chalk.red("Failed to list tasks"));
      console.error(
        chalk.red(error instanceof Error ? error.message : "Unknown error"),
      );
      process.exit(1);
    }
  });

taskCmd
  .command("move <taskId> <status>")
  .description("Move task to a different status")
  .action(async (taskId, status) => {
    const validStatuses = ["todo", "doing", "blocked", "done"];
    if (!validStatuses.includes(status)) {
      console.error(
        chalk.red(`Invalid status. Use: ${validStatuses.join(", ")}`),
      );
      process.exit(1);
    }

    const spinner = ora("Moving task...").start();

    try {
      const task = await tasksApi.move(taskId, status, 0);
      spinner.succeed(chalk.green(`Task moved to ${status}: ${task.title}`));
    } catch (error) {
      spinner.fail(chalk.red("Failed to move task"));
      console.error(
        chalk.red(error instanceof Error ? error.message : "Unknown error"),
      );
      process.exit(1);
    }
  });

taskCmd
  .command("delete <taskId>")
  .description("Delete a task")
  .option("-f, --force", "Skip confirmation")
  .action(async (taskId, options) => {
    if (!options.force) {
      const { confirm } = await inquirer.prompt([
        {
          type: "confirm",
          name: "confirm",
          message: "Are you sure you want to delete this task?",
          default: false,
        },
      ]);

      if (!confirm) {
        console.log(chalk.yellow("Cancelled"));
        return;
      }
    }

    const spinner = ora("Deleting task...").start();

    try {
      await tasksApi.delete(taskId);
      spinner.succeed(chalk.green("Task deleted"));
    } catch (error) {
      spinner.fail(chalk.red("Failed to delete task"));
      console.error(
        chalk.red(error instanceof Error ? error.message : "Unknown error"),
      );
      process.exit(1);
    }
  });

// =============================================================================
// BOARD COMMAND
// =============================================================================

program
  .command("board")
  .description("Show Kanban board summary")
  .option("-P, --project <projectId>", "Filter by project")
  .option("-c, --client <clientId>", "Filter by client")
  .option(
    "--done-limit <n>",
    "Max completed tasks to show, most recent first (0 = sin límite)",
  )
  .option("--json", "Output as JSON")
  .action(async (options) => {
    const spinner = ora("Fetching board...").start();

    try {
      const board = await tasksApi.getBoard({
        projectId: options.project,
        clientId: options.client,
        doneLimit:
          options.doneLimit !== undefined
            ? parseInt(options.doneLimit, 10)
            : undefined,
      });
      spinner.stop();

      if (options.json) {
        console.log(JSON.stringify(board, null, 2));
        return;
      }

      console.log(chalk.cyan("\n📋 Kanban Board\n"));

      // Ensure all columns exist with defaults
      const todo = board.todo || [];
      const doing = board.doing || [];
      const blocked = board.blocked || [];
      const done = board.done || [];

      const columns = [
        { name: "TODO", tasks: todo, color: chalk.gray },
        { name: "DOING", tasks: doing, color: chalk.blue },
        { name: "BLOCKED", tasks: blocked, color: chalk.red },
        { name: "DONE", tasks: done, color: chalk.green },
      ];

      for (const col of columns) {
        console.log(col.color(`━━━ ${col.name} (${col.tasks.length}) ━━━`));
        if (col.tasks.length === 0) {
          console.log(chalk.gray("  (empty)"));
        } else {
          for (const task of col.tasks.slice(0, 5)) {
            console.log(`  • ${task.title}`);
          }
          if (col.tasks.length > 5) {
            console.log(chalk.gray(`  ... and ${col.tasks.length - 5} more`));
          }
        }
        console.log();
      }

      const total = todo.length + doing.length + blocked.length + done.length;
      console.log(chalk.cyan(`Total: ${total} tasks`));
    } catch (error) {
      spinner.fail(chalk.red("Failed to fetch board"));
      console.error(
        chalk.red(error instanceof Error ? error.message : "Unknown error"),
      );
      process.exit(1);
    }
  });

// =============================================================================
// CLIENT COMMANDS
// =============================================================================

const clientCmd = program.command("client").description("Manage clients");

clientCmd
  .command("list")
  .description("List all clients")
  .option("-a, --all", "Include inactive clients")
  .option("--json", "Output as JSON")
  .action(async (options) => {
    const spinner = ora("Fetching clients...").start();

    try {
      const clients = await clientsApi.getAll(options.all);
      spinner.stop();

      if (options.json) {
        console.log(JSON.stringify(clients, null, 2));
        return;
      }

      if (clients.length === 0) {
        console.log(chalk.yellow("No clients found"));
        return;
      }

      console.log(chalk.cyan(`\nFound ${clients.length} clients:\n`));

      for (const client of clients) {
        const status = client.isActive ? chalk.green("●") : chalk.gray("○");
        console.log(
          `${status} ${client.name} ${client.company ? chalk.gray(`(${client.company})`) : ""}`,
        );
        console.log(chalk.gray(`   ID: ${client.id}`));
      }
    } catch (error) {
      spinner.fail(chalk.red("Failed to list clients"));
      console.error(
        chalk.red(error instanceof Error ? error.message : "Unknown error"),
      );
      process.exit(1);
    }
  });

// =============================================================================
// PROJECT COMMANDS
// =============================================================================

const projectCmd = program.command("project").description("Manage projects");

projectCmd
  .command("list")
  .description("List all projects")
  .option("-c, --client <clientId>", "Filter by client")
  .option("--json", "Output as JSON")
  .action(async (options) => {
    const spinner = ora("Fetching projects...").start();

    try {
      const projects = await projectsApi.getAll(options.client);
      spinner.stop();

      if (options.json) {
        console.log(JSON.stringify(projects, null, 2));
        return;
      }

      if (projects.length === 0) {
        console.log(chalk.yellow("No projects found"));
        return;
      }

      console.log(chalk.cyan(`\nFound ${projects.length} projects:\n`));

      const statusColors: Record<string, typeof chalk> = {
        active: chalk.green,
        on_hold: chalk.yellow,
        completed: chalk.blue,
        cancelled: chalk.gray,
      };

      for (const project of projects) {
        const color = statusColors[project.status] || chalk.white;
        console.log(
          `${color("●")} ${project.name} ${color(`[${project.status}]`)}`,
        );
        console.log(chalk.gray(`   ID: ${project.id}`));
      }
    } catch (error) {
      spinner.fail(chalk.red("Failed to list projects"));
      console.error(
        chalk.red(error instanceof Error ? error.message : "Unknown error"),
      );
      process.exit(1);
    }
  });

// =============================================================================
// RAG COMMANDS
// =============================================================================

const ragCmd = program
  .command("rag")
  .description("RAG - Code indexing and search");

ragCmd
  .command("index")
  .description(
    "Index a local project for code search (hybrid: local scan + remote storage)",
  )
  .requiredOption("-p, --project <projectId>", "Project UUID")
  .requiredOption("--path <path>", "Path to the local repository")
  .option("-f, --force", "Force reindex (delete existing chunks first)")
  .action(async (options) => {
    const indexer = new LocalIndexer();
    const projectId = options.project;
    const repoPath = options.path;
    const forceReindex = options.force || false;

    // Phase 1: Scan files locally
    const scanSpinner = ora("Scanning files...").start();
    let files;
    try {
      files = await indexer.scanDirectory(repoPath);
      scanSpinner.succeed(chalk.green(`Scanned ${files.length} files`));
    } catch (error) {
      scanSpinner.fail(chalk.red("Failed to scan directory"));
      console.error(
        chalk.red(error instanceof Error ? error.message : "Unknown error"),
      );
      process.exit(1);
    }

    if (files.length === 0) {
      console.log(chalk.yellow("No indexable files found in the directory"));
      return;
    }

    // Show summary
    const summary = indexer.getScanSummary(files);
    console.log(
      chalk.gray(`  Total lines: ${summary.totalLines.toLocaleString()}`),
    );
    console.log(
      chalk.gray(
        `  File types: ${Object.entries(summary.byExtension)
          .map(([ext, count]) => `${ext}(${count})`)
          .join(", ")}`,
      ),
    );

    // Phase 2: Chunk files locally
    const chunkSpinner = ora("Chunking files...").start();
    const chunks = indexer.chunkFiles(files);
    chunkSpinner.succeed(chalk.green(`Created ${chunks.length} chunks`));

    // Phase 3: Upload chunks to backend in batches
    // Using smaller batch size to avoid 413 payload too large errors
    const uploadSpinner = ora("Uploading chunks...").start();
    const batchSize = 5;
    const totalBatches = Math.ceil(chunks.length / batchSize);
    let totalStored = 0;
    let totalEmbeddings = 0;

    try {
      for (let i = 0; i < chunks.length; i += batchSize) {
        const batch = chunks.slice(i, i + batchSize);
        const batchNumber = Math.floor(i / batchSize) + 1;

        uploadSpinner.text = `Uploading batch ${batchNumber}/${totalBatches}...`;

        const response = await ragApi.uploadChunks({
          projectId,
          chunks: batch,
          forceReindex: batchNumber === 1 && forceReindex,
          batchNumber,
          totalBatches,
        });

        if (!response.success) {
          uploadSpinner.fail(
            chalk.red(`Failed at batch ${batchNumber}: ${response.error}`),
          );
          process.exit(1);
        }

        totalStored += response.chunksStored;
        totalEmbeddings += response.embeddingsGenerated;
      }

      uploadSpinner.succeed(chalk.green(`Uploaded ${totalStored} chunks`));

      console.log(chalk.cyan("\n✓ Indexing complete!"));
      console.log(chalk.gray(`  Files: ${files.length}`));
      console.log(chalk.gray(`  Chunks stored: ${totalStored}`));
      console.log(chalk.gray(`  Embeddings generated: ${totalEmbeddings}`));
    } catch (error) {
      uploadSpinner.fail(chalk.red("Failed to upload chunks"));
      console.error(
        chalk.red(error instanceof Error ? error.message : "Unknown error"),
      );
      process.exit(1);
    }
  });

ragCmd
  .command("status <projectId>")
  .description("Get indexing status for a project")
  .option("--json", "Output as JSON")
  .action(async (projectId, options) => {
    const spinner = ora("Fetching index status...").start();

    try {
      const status = await ragApi.getStatus(projectId);
      spinner.stop();

      if (options.json) {
        console.log(JSON.stringify(status, null, 2));
        return;
      }

      console.log(chalk.cyan(`\n📊 Index Status: ${status.projectName}\n`));
      console.log(
        `  Indexed: ${status.isIndexed ? chalk.green("Yes") : chalk.yellow("No")}`,
      );
      console.log(`  Total chunks: ${chalk.white(status.totalChunks)}`);
      console.log(`  Total files: ${chalk.white(status.totalFiles)}`);
      console.log(
        `  Last indexed: ${status.lastIndexedAt ? chalk.white(new Date(status.lastIndexedAt).toLocaleString()) : chalk.gray("Never")}`,
      );
      console.log(
        `  In progress: ${status.indexingInProgress ? chalk.yellow("Yes") : chalk.gray("No")}`,
      );
    } catch (error) {
      spinner.fail(chalk.red("Failed to fetch index status"));
      console.error(
        chalk.red(error instanceof Error ? error.message : "Unknown error"),
      );
      process.exit(1);
    }
  });

ragCmd
  .command("search")
  .description("Search indexed code")
  .requiredOption("-q, --query <query>", "Search query")
  .option("-p, --project <projectId>", "Filter by project")
  .option("-t, --type <fileType>", "Filter by file type (e.g., ts, py)")
  .option("-l, --limit <limit>", "Maximum results", "10")
  .option("--no-semantic", "Use text search instead of semantic search")
  .option("--json", "Output as JSON")
  .action(async (options) => {
    const spinner = ora("Searching...").start();

    try {
      const results = await ragApi.searchCode({
        query: options.query,
        projectId: options.project,
        fileType: options.type,
        limit: parseInt(options.limit),
        useSemanticSearch: options.semantic !== false,
      });
      spinner.stop();

      if (options.json) {
        console.log(JSON.stringify(results, null, 2));
        return;
      }

      if (results.length === 0) {
        console.log(chalk.yellow("No results found"));
        return;
      }

      console.log(chalk.cyan(`\n🔍 Found ${results.length} results:\n`));

      for (const result of results) {
        const relevance = Math.round(result.relevance * 100);
        console.log(
          chalk.white(
            `━━━ ${result.filePath} (L${result.startLine}-${result.endLine}) ━━━`,
          ),
        );
        console.log(
          chalk.gray(
            `    Project: ${result.projectName || "N/A"} | Relevance: ${relevance}% | Type: ${result.matchType}`,
          ),
        );

        // Show truncated content
        const preview = result.content.split("\n").slice(0, 5).join("\n");
        console.log(
          chalk.gray(
            preview.length > 300 ? preview.slice(0, 300) + "..." : preview,
          ),
        );
        console.log();
      }
    } catch (error) {
      spinner.fail(chalk.red("Search failed"));
      console.error(
        chalk.red(error instanceof Error ? error.message : "Unknown error"),
      );
      process.exit(1);
    }
  });

ragCmd
  .command("delete-index <projectId>")
  .description("Delete index for a project")
  .option("-f, --force", "Skip confirmation")
  .action(async (projectId, options) => {
    if (!options.force) {
      const { confirm } = await inquirer.prompt([
        {
          type: "confirm",
          name: "confirm",
          message:
            "Are you sure you want to delete this index? This cannot be undone.",
          default: false,
        },
      ]);

      if (!confirm) {
        console.log(chalk.yellow("Cancelled"));
        return;
      }
    }

    const spinner = ora("Deleting index...").start();

    try {
      await ragApi.deleteIndex(projectId);
      spinner.succeed(chalk.green("Index deleted successfully"));
    } catch (error) {
      spinner.fail(chalk.red("Failed to delete index"));
      console.error(
        chalk.red(error instanceof Error ? error.message : "Unknown error"),
      );
      process.exit(1);
    }
  });

// Parse and execute
program.parse();
