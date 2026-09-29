"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Search, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ClientModal } from "@/components/modals/client-modal";
import { ClientsList } from "@/components/clients/clients-list";
import { clientsApi } from "@/lib/api";
import { useSpace } from "@/contexts/space-context";
import { SpaceType } from "@/types";

type ClientStatusFilter = "all" | "active" | "inactive";
type ClientSortOption = "name" | "updated" | "created";

export default function ClientsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ClientStatusFilter>("active");
  const [sortBy, setSortBy] = useState<ClientSortOption>("name");
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const { currentSpace } = useSpace();

  // Solo mostrar clientes en espacios de tipo "work"
  const isWorkSpace = currentSpace?.type === SpaceType.WORK;

  const { data: clients, isLoading } = useQuery({
    queryKey: ["clients", "directory", currentSpace?.id],
    queryFn: () =>
      clientsApi.getAll({
        includeInactive: true,
        spaceId: currentSpace?.id,
      }),
    enabled: !!currentSpace && isWorkSpace,
  });

  const normalizedSearch = search.trim().toLowerCase();
  const totalClients = clients?.length || 0;
  const activeClients = clients?.filter((client) => client.isActive).length || 0;
  const inactiveClients = totalClients - activeClients;

  const filteredClients =
    clients
      ?.filter((client) => {
        const matchesStatus =
          statusFilter === "all"
            ? true
            : statusFilter === "active"
              ? client.isActive
              : !client.isActive;

        const matchesSearch =
          normalizedSearch.length === 0 ||
          client.name.toLowerCase().includes(normalizedSearch) ||
          client.company?.toLowerCase().includes(normalizedSearch) ||
          client.email?.toLowerCase().includes(normalizedSearch) ||
          client.phone?.toLowerCase().includes(normalizedSearch) ||
          client.whatsapp?.toLowerCase().includes(normalizedSearch) ||
          client.address?.toLowerCase().includes(normalizedSearch) ||
          client.notes?.toLowerCase().includes(normalizedSearch);

        return matchesStatus && matchesSearch;
      })
      .sort((a, b) => {
        if (sortBy === "updated") {
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        }
        if (sortBy === "created") {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
        return a.name.localeCompare(b.name, "es", { sensitivity: "base" });
      }) || [];

  // Si es espacio personal, mostrar mensaje especial
  if (!isWorkSpace && currentSpace) {
    return (
      <div className="h-full flex flex-col">
        <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 lg:px-6 py-4 pt-16 lg:pt-4">
          <h1 className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">
            Clientes
          </h1>
        </header>
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
            <Briefcase className="w-8 h-8 text-gray-400" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Los clientes solo están disponibles en espacios de trabajo
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md">
            Cambia a un espacio de tipo &quot;Trabajo&quot; en el selector del
            menú para ver y gestionar tus clientes.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 lg:px-6 py-4 pt-16 lg:pt-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">
              Clientes
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {filteredClients.length} de {totalClients} clientes en{" "}
              {currentSpace?.name || "este espacio"}
            </p>
          </div>
          <Button size="sm" onClick={() => setIsClientModalOpen(true)}>
            <Plus className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Nuevo cliente</span>
          </Button>
        </div>

        {/* Filters */}
        <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          <div className="relative flex-1 sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Buscar clientes..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              type="button"
              size="sm"
              variant={statusFilter === "active" ? "default" : "outline"}
              onClick={() => setStatusFilter("active")}
            >
              Activos ({activeClients})
            </Button>
            <Button
              type="button"
              size="sm"
              variant={statusFilter === "inactive" ? "default" : "outline"}
              onClick={() => setStatusFilter("inactive")}
            >
              Inactivos ({inactiveClients})
            </Button>
            <Button
              type="button"
              size="sm"
              variant={statusFilter === "all" ? "default" : "outline"}
              onClick={() => setStatusFilter("all")}
            >
              Todos ({totalClients})
            </Button>
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as ClientSortOption)}
            className="h-10 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 text-sm text-gray-700 dark:text-gray-200"
          >
            <option value="name">Ordenar: Nombre</option>
            <option value="updated">Ordenar: Actividad reciente</option>
            <option value="created">Ordenar: Más nuevos</option>
          </select>
        </div>
      </header>

      {/* Client List */}
      <div className="flex-1 overflow-auto p-4 lg:p-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        ) : (
          <ClientsList clients={filteredClients} />
        )}
      </div>

      {/* Client Modal */}
      <ClientModal
        isOpen={isClientModalOpen}
        onClose={() => setIsClientModalOpen(false)}
      />
    </div>
  );
}
