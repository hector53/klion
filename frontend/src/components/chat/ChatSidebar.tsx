"use client";

import { useState, useRef, useEffect } from "react";
import {
  X,
  Send,
  Bot,
  User,
  Sparkles,
  Loader2,
  Code,
  BookOpen,
  Image as ImageIcon,
} from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { aiApi, ChatMessage, ChatResponse } from "@/lib/api";

interface ChatSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  projectId?: string;
  projectName?: string;
}

export function ChatSidebar({
  isOpen,
  onClose,
  projectId,
  projectName,
}: ChatSidebarProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [includeContext, setIncludeContext] = useState(true);
  const [includeCodeSearch, setIncludeCodeSearch] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const chatMutation = useMutation({
    mutationFn: aiApi.chat,
    onSuccess: (data) => {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.message },
      ]);
    },
    onError: (error: Error) => {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Error: ${error.message}` },
      ]);
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() && !imagePreview) return;

    const userMessage: ChatMessage = {
      role: "user",
      content: input,
      imageUrl: imagePreview || undefined,
    };
    setMessages((prev) => [...prev, userMessage]);

    chatMutation.mutate({
      message: input,
      projectId,
      history: messages,
      includeContext,
      includeCodeSearch,
      imageUrl: imagePreview || undefined,
      imageMimeType: imagePreview ? "image/jpeg" : undefined,
    });

    setInput("");
    setImagePreview(null);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const clearChat = () => {
    setMessages([]);
    setImagePreview(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed right-0 top-0 h-full w-96 bg-zinc-900 border-l border-zinc-800 shadow-xl flex flex-col z-50">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-blue-500" />
          <div>
            <h3 className="font-semibold text-white">Klion AI</h3>
            {projectName && (
              <p className="text-xs text-zinc-400">{projectName}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={clearChat}
            className="text-xs text-zinc-400 hover:text-white px-2 py-1 rounded hover:bg-zinc-800"
          >
            Limpiar
          </button>
          <button onClick={onClose} className="p-1 hover:bg-zinc-800 rounded">
            <X className="w-5 h-5 text-zinc-400" />
          </button>
        </div>
      </div>

      {/* Options */}
      <div className="flex items-center gap-4 px-4 py-2 border-b border-zinc-800 bg-zinc-900/50">
        <label className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer">
          <input
            type="checkbox"
            checked={includeContext}
            onChange={(e) => setIncludeContext(e.target.checked)}
            className="rounded border-zinc-600 bg-zinc-800 text-blue-500 focus:ring-blue-500"
          />
          <BookOpen className="w-3 h-3" />
          Contexto
        </label>
        <label className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer">
          <input
            type="checkbox"
            checked={includeCodeSearch}
            onChange={(e) => setIncludeCodeSearch(e.target.checked)}
            className="rounded border-zinc-600 bg-zinc-800 text-blue-500 focus:ring-blue-500"
          />
          <Code className="w-3 h-3" />
          Código
        </label>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-zinc-500 mt-8">
            <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-sm">Hola! Soy tu asistente de desarrollo.</p>
            <p className="text-xs mt-2">
              Pregunta sobre el proyecto, busca código, o pega una conversación
              para extraer tareas.
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={cn(
              "flex gap-3",
              msg.role === "user" ? "justify-end" : "justify-start",
            )}
          >
            {msg.role === "assistant" && (
              <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-blue-500" />
              </div>
            )}
            <div
              className={cn(
                "max-w-[80%] rounded-lg p-3",
                msg.role === "user"
                  ? "bg-blue-600 text-white"
                  : "bg-zinc-800 text-zinc-100",
              )}
            >
              {msg.imageUrl && (
                <img
                  src={msg.imageUrl}
                  alt="Uploaded"
                  className="max-w-full rounded mb-2"
                />
              )}
              <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
            </div>
            {msg.role === "user" && (
              <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4 text-zinc-300" />
              </div>
            )}
          </div>
        ))}

        {chatMutation.isPending && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
              <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
            </div>
            <div className="bg-zinc-800 rounded-lg p-3">
              <div className="flex items-center gap-2 text-sm text-zinc-400">
                <span>Pensando...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Image Preview */}
      {imagePreview && (
        <div className="px-4 py-2 border-t border-zinc-800">
          <div className="relative inline-block">
            <img src={imagePreview} alt="Preview" className="h-20 rounded" />
            <button
              onClick={() => setImagePreview(null)}
              className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center"
            >
              <X className="w-3 h-3 text-white" />
            </button>
          </div>
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-zinc-800">
        <div className="flex gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageUpload}
            accept="image/*"
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-2 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white"
            title="Adjuntar imagen"
          >
            <ImageIcon className="w-5 h-5" />
          </button>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Escribe tu mensaje..."
            className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={chatMutation.isPending}
          />
          <button
            type="submit"
            disabled={
              chatMutation.isPending || (!input.trim() && !imagePreview)
            }
            className="p-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg"
          >
            <Send className="w-5 h-5 text-white" />
          </button>
        </div>
      </form>
    </div>
  );
}
