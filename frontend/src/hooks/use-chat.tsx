"use client";

import { useState, createContext, useContext } from "react";

interface ChatContextType {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  toggleChat: () => void;
  projectId?: string;
  projectName?: string;
  setProject: (projectId?: string, projectName?: string) => void;
  openChat: (projectId?: string, projectName?: string) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [projectId, setProjectId] = useState<string | undefined>();
  const [projectName, setProjectName] = useState<string | undefined>();

  const toggleChat = () => setIsOpen(!isOpen);

  const setProject = (id?: string, name?: string) => {
    setProjectId(id);
    setProjectName(name);
  };

  const openChat = (id?: string, name?: string) => {
    setProjectId(id);
    setProjectName(name);
    setIsOpen(true);
  };

  return (
    <ChatContext.Provider
      value={{
        isOpen,
        setIsOpen,
        toggleChat,
        projectId,
        projectName,
        setProject,
        openChat,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return context;
}
