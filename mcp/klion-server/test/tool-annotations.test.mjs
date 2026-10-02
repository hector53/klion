// Guards the MCP tool annotations against accidental removal. Spawns the built
// server over stdio (same transport real clients use) and inspects tools/list.
// Run with `npm test` (builds first).
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const SERVER_PATH = fileURLToPath(new URL("../dist/index.js", import.meta.url));

const EXPECTED_TOOLS = [
  "create_task",
  "update_task",
  "delete_task",
  "move_task",
  "list_tasks",
  "get_task",
  "get_board",
  "list_spaces",
  "get_space",
  "create_space",
  "update_space",
  "get_space_stats",
  "list_clients",
  "get_client",
  "list_projects",
  "get_project",
  "get_context",
  "update_context",
  "check_auth",
  "create_knowledge",
  "search_knowledge",
  "get_knowledge",
  "list_knowledge",
  "update_knowledge",
  "delete_knowledge",
  "git_status",
  "git_branches",
  "git_diff",
  "generate_commit_message",
  "git_commit",
  "generate_changelog",
  "update_changelog",
  "generate_documentation",
  "save_documentation",
  "parse_conversation",
  "create_tasks_from_conversation",
];

const HINTS = [
  "readOnlyHint",
  "destructiveHint",
  "idempotentHint",
  "openWorldHint",
];

let client;
let toolsByName;

before(async () => {
  client = new Client({ name: "annotations-test", version: "0.0.0" });
  await client.connect(
    new StdioClientTransport({
      command: process.execPath,
      args: [SERVER_PATH],
      stderr: "ignore",
    }),
  );
  const { tools } = await client.listTools();
  toolsByName = new Map(tools.map((t) => [t.name, t]));
});

after(async () => {
  await client?.close();
});

test("tools/list returns exactly the 36 current tools", () => {
  assert.equal(EXPECTED_TOOLS.length, 36);
  assert.deepEqual([...toolsByName.keys()].sort(), [...EXPECTED_TOOLS].sort());
});

test("every tool declares all four hints explicitly as booleans", () => {
  for (const [name, tool] of toolsByName) {
    assert.ok(tool.annotations, `${name}: missing annotations`);
    for (const hint of HINTS) {
      assert.equal(
        typeof tool.annotations[hint],
        "boolean",
        `${name}: ${hint} must be an explicit boolean`,
      );
    }
  }
});

test("representative tools keep their expected hints", () => {
  const a = (name) => toolsByName.get(name).annotations;

  assert.equal(a("get_task").readOnlyHint, true);

  assert.equal(a("create_task").readOnlyHint, false);
  assert.equal(a("create_task").destructiveHint, false);
  assert.equal(a("create_task").idempotentHint, false);

  assert.equal(a("delete_task").destructiveHint, true);

  assert.equal(a("generate_commit_message").openWorldHint, true);

  assert.equal(a("git_commit").destructiveHint, true);
  assert.equal(a("git_commit").openWorldHint, true);

  // Bumps usageCount/lastAccessedAt on every call.
  assert.deepEqual(a("get_knowledge"), {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: false,
  });

  // Lazily creates the ProjectContext row once (getOrCreateContext).
  assert.deepEqual(a("get_context"), {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  });
});
