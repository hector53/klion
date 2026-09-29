import { type HTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-primary text-white',
        secondary: 'bg-secondary text-secondary-foreground',
        destructive: 'bg-destructive text-white',
        outline: 'border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300',
        success: 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300',
        warning: 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-300',
        info: 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export interface BadgeProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
