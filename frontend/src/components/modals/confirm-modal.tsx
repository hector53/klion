'use client';

import { AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  isLoading?: boolean;
}

const variantStyles = {
  danger: {
    icon: 'text-red-500 bg-red-100 dark:bg-red-900/50',
    button: 'bg-red-600 hover:bg-red-700 text-white',
  },
  warning: {
    icon: 'text-yellow-500 bg-yellow-100 dark:bg-yellow-900/50',
    button: 'bg-yellow-600 hover:bg-yellow-700 text-white',
  },
  info: {
    icon: 'text-blue-500 bg-blue-100 dark:bg-blue-900/50',
    button: 'bg-blue-600 hover:bg-blue-700 text-white',
  },
};

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'danger',
  isLoading = false,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  const styles = variantStyles[variant];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-md bg-white dark:bg-gray-900 rounded-lg shadow-xl">
          <div className="p-6">
            <div className="flex items-start gap-4">
              {/* Icon */}
              <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${styles.icon}`}>
                <AlertTriangle className="w-5 h-5" />
              </div>

              {/* Content */}
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{message}</p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 dark:bg-gray-800/50 rounded-b-lg">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              {cancelText}
            </Button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isLoading}
              className={`inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${styles.button}`}
            >
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
