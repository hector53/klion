-- Migration: Create ai_settings table
-- Description: Stores AI configuration per user (OpenAI and Gemini settings)
-- Date: 2025-01-25

-- Create enum types for AI providers and models
CREATE TYPE ai_provider AS ENUM ('openai', 'gemini');
CREATE TYPE openai_model AS ENUM ('gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo');
CREATE TYPE gemini_model AS ENUM (
  'gemini-3-pro-preview',
  'gemini-3-flash-preview',
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-2.5-pro',
  'gemini-2.0-flash'
);

-- Create ai_settings table
CREATE TABLE IF NOT EXISTS ai_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "userId" UUID NOT NULL UNIQUE,

  -- Provider Configuration
  "defaultProvider" ai_provider NOT NULL DEFAULT 'gemini',

  -- OpenAI Settings
  "openaiApiKey" TEXT,
  "openaiDefaultModel" openai_model NOT NULL DEFAULT 'gpt-4o-mini',

  -- Gemini Settings
  "geminiApiKey" TEXT,
  "geminiDefaultModel" gemini_model NOT NULL DEFAULT 'gemini-2.5-flash',

  -- Feature Toggles
  "enableSuggestions" BOOLEAN NOT NULL DEFAULT TRUE,
  "enableAutoSummary" BOOLEAN NOT NULL DEFAULT TRUE,
  "enableChat" BOOLEAN NOT NULL DEFAULT TRUE,
  "enableRAG" BOOLEAN NOT NULL DEFAULT TRUE,

  -- Advanced Settings
  temperature FLOAT NOT NULL DEFAULT 0.7,
  "maxTokens" INTEGER NOT NULL DEFAULT 8192,

  -- Timestamps
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),

  -- Foreign Key Constraint
  CONSTRAINT "FK_ai_settings_userId" FOREIGN KEY ("userId")
    REFERENCES users(id) ON DELETE CASCADE
);

-- Create index on userId for faster lookups
CREATE INDEX IF NOT EXISTS "IDX_ai_settings_userId" ON ai_settings("userId");

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updatedAt
CREATE TRIGGER update_ai_settings_updated_at
  BEFORE UPDATE ON ai_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE ai_settings IS 'Stores AI configuration per user for OpenAI and Gemini providers';
COMMENT ON COLUMN ai_settings."userId" IS 'Reference to the user who owns this configuration';
COMMENT ON COLUMN ai_settings."defaultProvider" IS 'Default AI provider to use (openai or gemini)';
COMMENT ON COLUMN ai_settings."openaiApiKey" IS 'User OpenAI API key (stored encrypted in production)';
COMMENT ON COLUMN ai_settings."geminiApiKey" IS 'User Gemini API key (stored encrypted in production)';
COMMENT ON COLUMN ai_settings."enableSuggestions" IS 'Enable AI suggestions for tasks';
COMMENT ON COLUMN ai_settings."enableAutoSummary" IS 'Enable automatic summaries generation';
COMMENT ON COLUMN ai_settings."enableChat" IS 'Enable AI chat assistant';
COMMENT ON COLUMN ai_settings."enableRAG" IS 'Enable RAG (Retrieval Augmented Generation) for code search';
COMMENT ON COLUMN ai_settings.temperature IS 'AI temperature parameter (0-1, default 0.7)';
COMMENT ON COLUMN ai_settings."maxTokens" IS 'Maximum tokens for AI responses (default 8192)';
