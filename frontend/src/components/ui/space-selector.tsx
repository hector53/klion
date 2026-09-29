'use client';

import { useState, useRef, useEffect } from 'react';
import { useSpace } from '@/contexts/space-context';
import { cn } from '@/lib/utils';
import {
  ChevronDown,
  Briefcase,
  User,
  Plus,
  Check,
  Loader2,
} from 'lucide-react';
import { SpaceType } from '@/types';

interface SpaceSelectorProps {
  isCollapsed?: boolean;
}

const spaceIcons: Record<SpaceType, typeof Briefcase> = {
  [SpaceType.WORK]: Briefcase,
  [SpaceType.PERSONAL]: User,
};

const spaceColors: Record<SpaceType, string> = {
  [SpaceType.WORK]: 'bg-blue-500',
  [SpaceType.PERSONAL]: 'bg-emerald-500',
};

export function SpaceSelector({ isCollapsed = false }: SpaceSelectorProps) {
  const { spaces, currentSpace, isLoading, setCurrentSpace, createDefaultSpaces } = useSpace();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Si no hay espacios, mostrar botón para crearlos
  if (!isLoading && spaces.length === 0) {
    return (
      <button
        onClick={() => createDefaultSpaces()}
        className={cn(
          'w-full flex items-center rounded-lg text-sm font-medium transition-colors',
          'bg-primary/10 text-primary hover:bg-primary/20',
          isCollapsed ? 'justify-center p-3' : 'gap-3 px-3 py-2'
        )}
      >
        <Plus className="w-5 h-5 flex-shrink-0" />
        {!isCollapsed && 'Crear espacios'}
      </button>
    );
  }

  if (isLoading || !currentSpace) {
    return (
      <div
        className={cn(
          'flex items-center rounded-lg text-sm',
          isCollapsed ? 'justify-center p-3' : 'gap-3 px-3 py-2'
        )}
      >
        <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
        {!isCollapsed && <span className="text-gray-400">Cargando...</span>}
      </div>
    );
  }

  const CurrentIcon = spaceIcons[currentSpace.type] || User;
  const currentColor = currentSpace.color || spaceColors[currentSpace.type];

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        title={isCollapsed ? currentSpace.name : undefined}
        className={cn(
          'w-full flex items-center rounded-lg text-sm font-medium transition-colors',
          'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700',
          isCollapsed ? 'justify-center p-3' : 'gap-3 px-3 py-2'
        )}
      >
        <div
          className={cn('w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0')}
          style={{ backgroundColor: currentColor }}
        >
          <CurrentIcon className="w-4 h-4 text-white" />
        </div>
        {!isCollapsed && (
          <>
            <span className="flex-1 text-left truncate text-gray-900 dark:text-white">
              {currentSpace.name}
            </span>
            <ChevronDown
              className={cn(
                'w-4 h-4 text-gray-400 transition-transform',
                isOpen && 'rotate-180'
              )}
            />
          </>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          className={cn(
            'absolute z-50 mt-1 py-1 rounded-lg shadow-lg border',
            'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700',
            isCollapsed ? 'left-full ml-2 top-0 min-w-[180px]' : 'left-0 right-0'
          )}
        >
          {spaces.map((space) => {
            const Icon = spaceIcons[space.type] || User;
            const color = space.color || spaceColors[space.type];
            const isActive = space.id === currentSpace.id;

            return (
              <button
                key={space.id}
                onClick={() => {
                  setCurrentSpace(space);
                  setIsOpen(false);
                }}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                )}
              >
                <div
                  className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: color }}
                >
                  <Icon className="w-4 h-4 text-white" />
                </div>
                <span className="flex-1 text-left truncate">{space.name}</span>
                {isActive && <Check className="w-4 h-4 flex-shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
