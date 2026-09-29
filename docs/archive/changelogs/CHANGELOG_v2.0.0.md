# 🦁 Klion v2.0.0 - The AI & RAG Era
**Release Date:** January 2026
**Focus:** Rebranding, Codebase RAG, Semantic Knowledge, and Git Automation.

## 🚀 Highlights
This major version transforms "ClientBoard" into **Klion**, a sophisticated project management system that treats AI as a first-class citizen. Version 2.0 introduces the ability for the system (and AI agents) to "understand" its own source code through RAG and manage the development lifecycle via Git.

---

## 💎 Rebranding & UI
- **New Identity**: System-wide transition from *ClientBoard* to **Klion**.
- **Dark-First Design**: Refined dark theme (`#111827`) as the standard interface.
- **Enhanced Sidebar**: Collapsible navigation with quick access to the new AI modules (Knowledge, RAG, Git).

## 🤖 AI & RAG (Retrieval-Augmented Generation)
- **Gemini 2.0 Flash Integration**: Implementation of Google's latest model as the primary AI provider for high-speed reasoning and code analysis.
- **Codebase Indexing**: New `rag` module that scans source files, generates embeddings, and stores them in PostgreSQL using `pgvector`.
- **Semantic Code Search**: Ability to query the codebase using natural language to find implementation details or bugs.
- **Dual Provider Support**: Flexible configuration to toggle between Google Gemini and OpenAI (GPT-4o-mini).

## 🧠 Knowledge Base
- **Semantic Knowledge Module**: A dedicated repository for storing non-code information (architectural decisions, style guides, snippets).
- **Intelligent Search**: Find solutions and documentation based on meaning rather than just keywords.
- **Metadata Tagging**: Associate knowledge entries with specific clients or projects for better context.

## 🛠️ MCP (Model Context Protocol) 2.0
- **Expanded Toolset**: 
  - `search_code`: Perform vector search on the indexed project.
  - `get_context`: Retrieve deep project state for AI agents.
  - `parse_conversation`: Extract tasks automatically from chat logs.
- **Improved CLI**: New `klion` commands for terminal-based project management.

## 📁 Git Integration
- **Automated Commit Messages**: AI-driven analysis of staged changes to suggest descriptive, standard-compliant commit messages.
- **Changelog Generator**: Automated generation of `CHANGELOG.md` files based on repository history.
- **Repository Monitoring**: Tools to check `git_status` and `git_diff` directly from the Klion ecosystem.

## 🔧 Core Improvements
- **Project Structure**: Reorganized backend into modular domains (`ai`, `rag`, `git`, `knowledge`).
- **Performance**: Optimized board loading and task filtering.
- **Paginaton**: Enforced Limit/Offset pagination across all massive listing endpoints.

---

## 📝 Upgrading from v1.x
1. **Database**: Requires PostgreSQL 15+ with the `pgvector` extension enabled.
2. **Environment**: New `GEMINI_API_KEY` required for RAG features.
3. **MCP**: Update your global `klion-mcp` install to use the latest SDK.

---
*Klion: Build smarter, manage better.*