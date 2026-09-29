/**
 * Local Indexer Service for MCP
 *
 * This module handles local file scanning and chunking for code indexing.
 * It runs on the user's machine and sends processed chunks to the remote backend.
 */

import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";

/**
 * Configuration for file scanning
 */
export interface ScanConfig {
  includeExtensions: string[];
  excludePatterns: string[];
  maxFileSize: number; // bytes
}

/**
 * Scanned file info
 */
export interface ScannedFile {
  absolutePath: string;
  relativePath: string;
  fileName: string;
  extension: string;
  content: string;
  hash: string;
  lines: number;
}

/**
 * Code chunk ready for upload
 */
export interface CodeChunkData {
  filePath: string;
  fileName: string;
  fileType: string;
  content: string;
  startLine: number;
  endLine: number;
  chunkIndex: number;
  totalChunks: number;
  fileHash: string;
  features: string[];
}

/**
 * Chunking configuration
 */
export interface ChunkingConfig {
  maxChunkLines: number;
  overlapLines: number;
  maxContentSize: number; // Max characters per chunk (for API payload limits)
}

const DEFAULT_CHUNKING_CONFIG: ChunkingConfig = {
  maxChunkLines: 300, // Reduced from 500 for smaller payloads
  overlapLines: 30, // Reduced overlap
  maxContentSize: 50000, // ~50KB max per chunk content
};

/**
 * Progress callback type
 */
export type ProgressCallback = (
  phase: "scanning" | "chunking" | "uploading",
  current: number,
  total: number,
  currentFile?: string,
) => void;

/**
 * Default configuration
 */
const DEFAULT_CONFIG: ScanConfig = {
  includeExtensions: [
    // JavaScript/TypeScript
    "ts",
    "tsx",
    "js",
    "jsx",
    "mjs",
    "cjs",
    // Python
    "py",
    "pyi",
    // Go
    "go",
    // Rust
    "rs",
    // Java/Kotlin
    "java",
    "kt",
    "kts",
    // C/C++
    "c",
    "cpp",
    "cc",
    "h",
    "hpp",
    // C#
    "cs",
    // Ruby
    "rb",
    // PHP
    "php",
    // Swift
    "swift",
    // Shell
    "sh",
    "bash",
    "zsh",
    // Config/Data
    "json",
    "yaml",
    "yml",
    "toml",
    // Markup
    "md",
    "mdx",
    // SQL
    "sql",
    // Docker
    "dockerfile",
    // GraphQL
    "graphql",
    "gql",
    // Vue/Svelte
    "vue",
    "svelte",
  ],
  excludePatterns: [
    "node_modules",
    ".git",
    "dist",
    "build",
    ".next",
    "__pycache__",
    ".venv",
    "venv",
    "vendor",
    ".idea",
    ".vscode",
    "coverage",
    ".cache",
    "tmp",
    "temp",
    "*.min.js",
    "*.min.css",
    "*.map",
    "package-lock.json",
    "yarn.lock",
    "pnpm-lock.yaml",
    "*.log",
    ".env*",
    ".DS_Store",
    "Thumbs.db",
  ],
  maxFileSize: 1024 * 1024, // 1MB
};

/**
 * Local Indexer class for scanning and chunking code files
 */
export class LocalIndexer {
  private config: ScanConfig;

  constructor(config: Partial<ScanConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Scan a directory for code files
   */
  async scanDirectory(
    rootPath: string,
    onProgress?: ProgressCallback,
  ): Promise<ScannedFile[]> {
    const files: ScannedFile[] = [];

    if (!fs.existsSync(rootPath)) {
      throw new Error(`Directory not found: ${rootPath}`);
    }

    const stats = fs.statSync(rootPath);
    if (!stats.isDirectory()) {
      throw new Error(`Path is not a directory: ${rootPath}`);
    }

    await this.walkDirectory(rootPath, rootPath, files, onProgress);

    return files;
  }

  /**
   * Recursively walk directory
   */
  private async walkDirectory(
    currentPath: string,
    rootPath: string,
    files: ScannedFile[],
    onProgress?: ProgressCallback,
  ): Promise<void> {
    let entries: fs.Dirent[];

    try {
      entries = fs.readdirSync(currentPath, { withFileTypes: true });
    } catch (error) {
      // Skip directories we can't read
      console.warn(`Cannot read directory: ${currentPath}`);
      return;
    }

    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);
      const relativePath = path.relative(rootPath, fullPath);

      // Check exclusions
      if (this.shouldExclude(relativePath, entry.name)) {
        continue;
      }

      if (entry.isDirectory()) {
        await this.walkDirectory(fullPath, rootPath, files, onProgress);
      } else if (entry.isFile()) {
        const ext = this.getExtension(entry.name);

        // Check if extension is included
        if (!this.config.includeExtensions.includes(ext)) {
          continue;
        }

        // Check file size
        let stats: fs.Stats;
        try {
          stats = fs.statSync(fullPath);
        } catch {
          continue;
        }

        if (stats.size > this.config.maxFileSize) {
          continue;
        }

        try {
          const content = fs.readFileSync(fullPath, "utf-8");
          const hash = this.hashContent(content);

          files.push({
            absolutePath: fullPath,
            relativePath,
            fileName: entry.name,
            extension: ext,
            content,
            hash,
            lines: content.split("\n").length,
          });

          if (onProgress) {
            onProgress("scanning", files.length, 0, relativePath);
          }
        } catch (error) {
          // Skip files we can't read (binary, permission issues, etc.)
          continue;
        }
      }
    }
  }

  /**
   * Check if path should be excluded
   */
  private shouldExclude(relativePath: string, fileName: string): boolean {
    const normalizedPath = relativePath.replace(/\\/g, "/");

    for (const pattern of this.config.excludePatterns) {
      // Directory match
      if (!pattern.includes("*") && !pattern.includes(".")) {
        if (
          normalizedPath.startsWith(pattern + "/") ||
          normalizedPath.includes("/" + pattern + "/") ||
          normalizedPath === pattern ||
          fileName === pattern
        ) {
          return true;
        }
      }
      // Wildcard match (*.ext)
      else if (pattern.startsWith("*.")) {
        const ext = pattern.slice(2);
        if (fileName.endsWith("." + ext)) {
          return true;
        }
      }
      // Glob pattern (*.*)
      else if (pattern.startsWith("*")) {
        const suffix = pattern.slice(1);
        if (fileName.endsWith(suffix)) {
          return true;
        }
      }
      // Exact match
      else if (fileName === pattern || normalizedPath.endsWith("/" + pattern)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get file extension (lowercase, without dot)
   */
  private getExtension(fileName: string): string {
    const lowerName = fileName.toLowerCase();

    // Handle special files
    if (lowerName === "dockerfile") return "dockerfile";
    if (lowerName === "makefile") return "makefile";
    if (lowerName === "cmakelists.txt") return "cmake";

    const ext = path.extname(fileName).slice(1).toLowerCase();
    return ext;
  }

  /**
   * Hash content for change detection
   */
  private hashContent(content: string): string {
    return crypto
      .createHash("sha256")
      .update(content)
      .digest("hex")
      .slice(0, 16);
  }

  /**
   * Split a file into chunks
   */
  chunkFile(
    file: ScannedFile,
    config: Partial<ChunkingConfig> = {},
  ): CodeChunkData[] {
    const { maxChunkLines, overlapLines, maxContentSize } = {
      ...DEFAULT_CHUNKING_CONFIG,
      ...config,
    };

    const lines = file.content.split("\n");
    const chunks: CodeChunkData[] = [];

    if (
      lines.length <= maxChunkLines &&
      file.content.length <= maxContentSize
    ) {
      // Single chunk for small files
      chunks.push({
        filePath: file.relativePath,
        fileName: file.fileName,
        fileType: file.extension,
        content: this.truncateContent(file.content, maxContentSize),
        startLine: 1,
        endLine: lines.length,
        chunkIndex: 0,
        totalChunks: 1,
        fileHash: file.hash,
        features: this.detectFeatures(file.content, file.extension),
      });
    } else {
      // Split into overlapping chunks
      let startLine = 0;
      let chunkIndex = 0;

      while (startLine < lines.length) {
        const endLine = Math.min(startLine + maxChunkLines, lines.length);
        let chunkContent = lines.slice(startLine, endLine).join("\n");

        // Truncate if content is too large
        chunkContent = this.truncateContent(chunkContent, maxContentSize);

        chunks.push({
          filePath: file.relativePath,
          fileName: file.fileName,
          fileType: file.extension,
          content: chunkContent,
          startLine: startLine + 1, // 1-indexed
          endLine: endLine,
          chunkIndex: chunkIndex,
          totalChunks: 0, // Will be set after
          fileHash: file.hash,
          features: this.detectFeatures(chunkContent, file.extension),
        });

        startLine = endLine - overlapLines;
        if (startLine >= lines.length - overlapLines) break;
        chunkIndex++;
      }

      // Set total chunks
      const totalChunks = chunks.length;
      chunks.forEach((chunk) => (chunk.totalChunks = totalChunks));
    }

    return chunks;
  }

  /**
   * Truncate content to fit within size limits
   */
  private truncateContent(content: string, maxSize: number): string {
    if (content.length <= maxSize) {
      return content;
    }

    // Try to truncate at a line boundary
    const truncated = content.slice(0, maxSize);
    const lastNewline = truncated.lastIndexOf("\n");

    if (lastNewline > maxSize * 0.8) {
      return truncated.slice(0, lastNewline) + "\n// ... content truncated ...";
    }

    return truncated + "\n// ... content truncated ...";
  }

  /**
   * Process all files into chunks
   */
  chunkFiles(
    files: ScannedFile[],
    onProgress?: ProgressCallback,
    config: Partial<ChunkingConfig> = {},
  ): CodeChunkData[] {
    const allChunks: CodeChunkData[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const chunks = this.chunkFile(file, config);
      allChunks.push(...chunks);

      if (onProgress) {
        onProgress("chunking", i + 1, files.length, file.relativePath);
      }
    }

    return allChunks;
  }

  /**
   * Detect code features for better searchability
   */
  private detectFeatures(content: string, extension: string): string[] {
    const features: string[] = [];

    // Language-agnostic patterns
    if (/\bclass\s+\w+/.test(content)) features.push("class");
    if (/\bfunction\s+\w+/.test(content)) features.push("function");
    if (/\basync\b/.test(content)) features.push("async");
    if (/\bawait\b/.test(content)) features.push("await");
    if (/\binterface\s+\w+/.test(content)) features.push("interface");
    if (/\btype\s+\w+\s*=/.test(content)) features.push("type");
    if (/\benum\s+\w+/.test(content)) features.push("enum");
    if (/\bexport\b/.test(content)) features.push("export");
    if (/\bimport\b/.test(content)) features.push("import");
    if (/\btry\s*\{/.test(content)) features.push("try-catch");
    if (/@\w+/.test(content)) features.push("decorator");

    // TypeScript/JavaScript specific
    if (["ts", "tsx", "js", "jsx"].includes(extension)) {
      if (/\bconst\s+\w+\s*=\s*\(/.test(content))
        features.push("arrow-function");
      if (/\bReact\b|\buseState\b|\buseEffect\b/.test(content))
        features.push("react");
      if (/@Injectable\(\)|\@Controller\(\)|\@Module\(\)/.test(content))
        features.push("nestjs");
      if (/\bexpress\b|\brouter\b/.test(content)) features.push("express");
      if (/\bprisma\b/i.test(content)) features.push("prisma");
      if (/\btypeorm\b/i.test(content)) features.push("typeorm");
    }

    // Python specific
    if (["py", "pyi"].includes(extension)) {
      if (/\bdef\s+\w+/.test(content)) features.push("def");
      if (/\basync\s+def\b/.test(content)) features.push("async-def");
      if (/\bfrom\s+\w+\s+import\b/.test(content)) features.push("import");
      if (/\bclass\s+\w+.*:/.test(content)) features.push("class");
      if (/@\w+/.test(content)) features.push("decorator");
    }

    // Go specific
    if (extension === "go") {
      if (/\bfunc\s+\w+/.test(content)) features.push("func");
      if (/\bstruct\s*\{/.test(content)) features.push("struct");
      if (/\binterface\s*\{/.test(content)) features.push("interface");
      if (/\bgo\s+\w+/.test(content)) features.push("goroutine");
      if (/\bchan\s+/.test(content)) features.push("channel");
    }

    // Rust specific
    if (extension === "rs") {
      if (/\bfn\s+\w+/.test(content)) features.push("fn");
      if (/\bstruct\s+\w+/.test(content)) features.push("struct");
      if (/\bimpl\s+\w+/.test(content)) features.push("impl");
      if (/\btrait\s+\w+/.test(content)) features.push("trait");
      if (/\basync\s+fn\b/.test(content)) features.push("async-fn");
    }

    // SQL specific
    if (extension === "sql") {
      if (/\bCREATE\s+TABLE\b/i.test(content)) features.push("create-table");
      if (/\bSELECT\b/i.test(content)) features.push("select");
      if (/\bINSERT\b/i.test(content)) features.push("insert");
      if (/\bUPDATE\b/i.test(content)) features.push("update");
      if (/\bDELETE\b/i.test(content)) features.push("delete");
      if (/\bJOIN\b/i.test(content)) features.push("join");
      if (/\bINDEX\b/i.test(content)) features.push("index");
    }

    // Vue/Svelte specific
    if (["vue", "svelte"].includes(extension)) {
      if (/<script/.test(content)) features.push("script");
      if (/<template/.test(content)) features.push("template");
      if (/<style/.test(content)) features.push("style");
    }

    return [...new Set(features)];
  }

  /**
   * Get summary statistics for scanned files
   */
  getScanSummary(files: ScannedFile[]): {
    totalFiles: number;
    totalLines: number;
    byExtension: Record<string, number>;
  } {
    const byExtension: Record<string, number> = {};
    let totalLines = 0;

    for (const file of files) {
      totalLines += file.lines;
      byExtension[file.extension] = (byExtension[file.extension] || 0) + 1;
    }

    return {
      totalFiles: files.length,
      totalLines,
      byExtension,
    };
  }
}

// Export singleton instance for convenience
export const localIndexer = new LocalIndexer();

// Export chunking config for customization
export { DEFAULT_CHUNKING_CONFIG };

export default LocalIndexer;
