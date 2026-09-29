'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import { clientsApi } from '@/lib/api';
import { useSpace } from '@/contexts/space-context';
import { SpaceType, type CreateClientDto } from '@/types';

interface QuickAddClientProps {
  onClientCreated: (clientId: string) => void;
}

export function QuickAddClient({ onClientCreated }: QuickAddClientProps) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { currentSpace } = useSpace();
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');

  const createMutation = useMutation({
    mutationFn: (data: CreateClientDto) => clientsApi.create(data),
    onSuccess: (newClient) => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success(`Cliente "${newClient.name}" creado`);
      onClientCreated(newClient.id);
      handleClose();
    },
    onError: () => {
      toast.error('Error al crear el cliente');
    },
  });

  const handleClose = () => {
    setIsOpen(false);
    setName('');
    setCompany('');
  };

  const handleCreate = () => {
    if (!name.trim()) return;

    createMutation.mutate({
      name: name.trim(),
      company: company.trim() || undefined,
      ...(currentSpace?.type === SpaceType.WORK ? { spaceId: currentSpace.id } : {}),
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      handleCreate();
    }
  };

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="flex-shrink-0 w-10 h-10 rounded-md border border-dashed border-gray-300 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:border-gray-400 transition-colors"
        title="Añadir nuevo cliente"
      >
        <Plus className="w-5 h-5" />
      </button>
    );
  }

  return (
    <div className="flex-1 p-3 border border-primary rounded-md bg-primary/5">
      <div className="space-y-2">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-primary">Nuevo cliente</span>
          <button
            type="button"
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Nombre del cliente *"
          className="h-9 text-sm"
          autoFocus
        />
        <Input
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Empresa (opcional)"
          className="h-9 text-sm"
        />
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className="h-8"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={!name.trim() || createMutation.isPending}
            onClick={handleCreate}
            className="h-8"
          >
            {createMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              'Crear'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
