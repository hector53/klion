'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, X, Loader2, Folder } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import { projectsApi } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { CreateProjectDto } from '@/types';

interface QuickAddProjectProps {
  clientId?: string;
  spaceId?: string;
  onProjectCreated: (projectId: string) => void;
  label?: string;
}

const colorOptions = [
  '#3B82F6', // blue
  '#10B981', // green
  '#F59E0B', // amber
  '#EF4444', // red
  '#8B5CF6', // violet
  '#EC4899', // pink
];

export function QuickAddProject({ clientId, spaceId, onProjectCreated, label }: QuickAddProjectProps) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [color, setColor] = useState(colorOptions[0]);

  const createMutation = useMutation({
    mutationFn: (data: CreateProjectDto) => projectsApi.create(data),
    onSuccess: (newProject) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      if (clientId) {
        queryClient.invalidateQueries({ queryKey: ['projects', 'client', clientId] });
      }
      if (spaceId) {
        queryClient.invalidateQueries({ queryKey: ['projects', 'space', spaceId] });
      }
      toast.success(`${label || 'Proyecto'} "${newProject.name}" creado`);
      onProjectCreated(newProject.id);
      handleClose();
    },
    onError: () => {
      toast.error('Error al crear el proyecto');
    },
  });

  const handleClose = () => {
    setIsOpen(false);
    setName('');
    setColor(colorOptions[0]);
  };

  const handleCreate = () => {
    if (!name.trim()) return;

    createMutation.mutate({
      ...(clientId ? { clientId } : {}),
      ...(spaceId ? { spaceId } : {}),
      name: name.trim(),
      color,
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
        className="flex items-center gap-1 text-xs text-gray-500 hover:text-primary transition-colors"
        title="Crear nuevo proyecto"
      >
        <Plus className="w-3 h-3" />
        Crear {label || 'proyecto'}
      </button>
    );
  }

  return (
    <div className="p-3 border border-primary rounded-md bg-primary/5 mt-2">
      <div className="space-y-2">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium text-primary flex items-center gap-1">
            <Folder className="w-3 h-3" />
            {label ? `Nueva ${label}` : 'Nuevo proyecto'}
          </span>
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
          placeholder={`Nombre ${label ? `de la ${label}` : 'del proyecto'} *`}
          className="h-8 text-sm"
          autoFocus
        />
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Color:</span>
          <div className="flex gap-1">
            {colorOptions.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={cn(
                  'w-5 h-5 rounded-full transition-transform hover:scale-110',
                  color === c && 'ring-2 ring-offset-1 ring-gray-400'
                )}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className="h-7 text-xs"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={!name.trim() || createMutation.isPending}
            onClick={handleCreate}
            className="h-7 text-xs"
          >
            {createMutation.isPending ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              'Crear'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
