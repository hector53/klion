"use client";

import { Users } from "lucide-react";
import type { Client } from "@/types";
import { ClientCard } from "@/components/clients/client-card";

interface ClientsListProps {
  clients: Client[];
}

export function ClientsList({ clients }: ClientsListProps) {
  if (clients.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500 dark:text-gray-400">
        <Users className="w-12 h-12 mb-4" />
        <p>No se encontraron clientes</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
      {clients.map((client) => (
        <ClientCard key={client.id} client={client} />
      ))}
    </div>
  );
}
