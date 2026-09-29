import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

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
 * Code chunk ready for storage
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
 * Default configuration
 */
const DEFAULT_CONFIG: ScanConfig = {
  includeExtensions: [
    // JavaScript/TypeScript
    'ts', 'tsx', 'js', 'jsx', 'mjs', 'cjs',
    // Python
    'py', 'pyi',
    // Go
    'go',
    // Rust
    'rs',
    // Java/Kotlin
    'java', 'kt', 'kts',
    // C/C++
    'c', 'cpp', 'cc', 'h', 'hpp',
    // C#
    'cs',
    // Ruby
    'rb',
    // PHP
    'php',
    // Swift
    'swift',
    // Shell
    'sh', 'bash', 'zsh',
    // Config/Data
    'json', 'yaml', 'yml', 'toml',
    // Markup
    'md', 'mdx',
    // SQL
    'sql',
    // Docker
    'dockerfile',
    // GraphQL
    'graphql', 'gql',
  ],
  excludePatterns: [
    'node_modules',
    '.git',
    'dist',
    'build',
    '.next',
    '__pycache__',
    '.venv',
    'venv',
    'vendor',
    '.idea',
    '.vscode',
    'coverage',
    '.cache',
    'tmp',
    'temp',
    '*.min.js',
    '*.min.css',
    '*.map',
    'package-lock.json',
    'yarn.lock',
    'pnpm-lock.yaml',
    '*.log',
    '.env*',
  ],
  maxFileSize: 1024 * 1024, // 1MB
};

@Injectable()
export class IndexerService {
  private readonly logger = new Logger(IndexerService.name);

  /**
   * Scan a directory for code files
   */
  async scanDirectory(
    rootPath: string,
    config: Partial<ScanConfig> = {},
  ): Promise<ScannedFile[]> {
    const finalConfig = { ...DEFAULT_CONFIG, ...config };
    const files: ScannedFile[] = [];

    if (!fs.existsSync(rootPath)) {
      throw new Error(`Directory not found: ${rootPath}`);
    }

    await this.walkDirectory(rootPath, rootPath, finalConfig, files);

    this.logger.log(`Scanned ${files.length} files from ${rootPath}`);
    return files;
  }

  /**
   * Recursively walk directory
   */
  private async walkDirectory(
    currentPath: string,
    rootPath: string,
    config: ScanConfig,
    files: ScannedFile[],
  ): Promise<void> {
    const entries = fs.readdirSync(currentPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);
      const relativePath = path.relative(rootPath, fullPath);

      // Check exclusions
      if (this.shouldExclude(relativePath, entry.name, config.excludePatterns)) {
        continue;
      }

      if (entry.isDirectory()) {
        await this.walkDirectory(fullPath, rootPath, config, files);
      } else if (entry.isFile()) {
        const ext = this.getExtension(entry.name);

        // Check if extension is included
        if (!config.includeExtensions.includes(ext)) {
          continue;
        }

        // Check file size
        const stats = fs.statSync(fullPath);
        if (stats.size > config.maxFileSize) {
          this.logger.debug(`Skipping large file: ${relativePath}`);
          continue;
        }

        try {
          const content = fs.readFileSync(fullPath, 'utf-8');
          const hash = this.hashContent(content);

          files.push({
            absolutePath: fullPath,
            relativePath,
            fileName: entry.name,
            extension: ext,
            content,
            hash,
            lines: content.split('\n').length,
          });
        } catch (error) {
          this.logger.warn(`Failed to read file: ${relativePath}`);
        }
      }
    }
  }

  /**
   * Check if path should be excluded
   */
  private shouldExclude(
    relativePath: string,
    fileName: string,
    excludePatterns: string[],
  ): boolean {
    const normalizedPath = relativePath.replace(/\\/g, '/');

    for (const pattern of excludePatterns) {
      // Directory match
      if (!pattern.includes('*') && !pattern.includes('.')) {
        if (
          normalizedPath.startsWith(pattern + '/') ||
          normalizedPath.includes('/' + pattern + '/') ||
          normalizedPath === pattern ||
          fileName === pattern
        ) {
          return true;
        }
      }
      // Wildcard match
      else if (pattern.startsWith('*.')) {
        const ext = pattern.slice(2);
        if (fileName.endsWith('.' + ext)) {
          return true;
        }
      }
      // Exact match
      else if (fileName === pattern || normalizedPath.endsWith('/' + pattern)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get file extension (lowercase, without dot)
   */
  private getExtension(fileName: string): string {
    // Handle special files like Dockerfile
    const lowerName = fileName.toLowerCase();
    if (lowerName === 'dockerfile') return 'dockerfile';

    const ext = path.extname(fileName).slice(1).toLowerCase();
    return ext;
  }

  /**
   * Hash content for change detection
   */
  private hashContent(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex').slice(0, 16);
  }

  /**
   * Split a file into chunks
   */
  chunkFile(
    file: ScannedFile,
    maxChunkLines: number = 500,
    overlapLines: number = 50,
  ): CodeChunkData[] {
    const lines = file.content.split('\n');
    const chunks: CodeChunkData[] = [];

    if (lines.length <= maxChunkLines) {
      // Single chunk for small files
      chunks.push({
        filePath: file.relativePath,
        fileName: file.fileName,
        fileType: file.extension,
        content: file.content,
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
        const chunkContent = lines.slice(startLine, endLine).join('\n');

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
   * Detect code features for better searchability
   */
  private detectFeatures(content: string, extension: string): string[] {
    const features: string[] = [];

    // Language-agnostic patterns
    if (/\bclass\s+\w+/.test(content)) features.push('class');
    if (/\bfunction\s+\w+/.test(content)) features.push('function');
    if (/\basync\b/.test(content)) features.push('async');
    if (/\bawait\b/.test(content)) features.push('await');
    if (/\binterface\s+\w+/.test(content)) features.push('interface');
    if (/\btype\s+\w+\s*=/.test(content)) features.push('type');
    if (/\benum\s+\w+/.test(content)) features.push('enum');
    if (/\bexport\b/.test(content)) features.push('export');
    if (/\bimport\b/.test(content)) features.push('import');
    if (/\btry\s*\{/.test(content)) features.push('try-catch');
    if (/@\w+/.test(content)) features.push('decorator');

    // TypeScript/JavaScript specific
    if (['ts', 'tsx', 'js', 'jsx'].includes(extension)) {
      if (/\bconst\s+\w+\s*=\s*\(/.test(content)) features.push('arrow-function');
      if (/\bReact\b|\buseState\b|\buseEffect\b/.test(content)) features.push('react');
      if (/\@Injectable\(\)|\@Controller\(\)|\@Module\(\)/.test(content)) features.push('nestjs');
      if (/\bexpress\b|\brouter\b/.test(content)) features.push('express');
    }

    // Python specific
    if (['py', 'pyi'].includes(extension)) {
      if (/\bdef\s+\w+/.test(content)) features.push('def');
      if (/\basync\s+def\b/.test(content)) features.push('async-def');
      if (/\bfrom\s+\w+\s+import\b/.test(content)) features.push('import');
    }

    // SQL specific
    if (extension === 'sql') {
      if (/\bCREATE\s+TABLE\b/i.test(content)) features.push('create-table');
      if (/\bSELECT\b/i.test(content)) features.push('select');
      if (/\bJOIN\b/i.test(content)) features.push('join');
    }

    return [...new Set(features)];
  }
}
