import { clsx } from 'clsx';
import type { HTMLAttributes, ReactNode } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  variant?: 'solid' | 'glass';
}

export function Card({ className, children, variant = 'glass', ...props }: CardProps) {
  return (
    <div
      className={clsx(
        'rounded-2xl p-6 transition-all duration-300',
        variant === 'glass' &&
          'bg-white/95 border border-slate-200/80 shadow-sm hover:shadow-md hover:border-primary-100',
        variant === 'solid' && 'bg-white shadow-sm border border-slate-200/80',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className, children, ...props }: CardProps) {
  return (
    <div className={clsx('mb-4', className)} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ className, children, ...props }: CardProps) {
  return (
    <h3 className={clsx('text-lg font-semibold text-slate-800', className)} {...props}>
      {children}
    </h3>
  );
}

export function CardDescription({ className, children, ...props }: CardProps) {
  return (
    <p className={clsx('text-sm text-slate-600 mt-1', className)} {...props}>
      {children}
    </p>
  );
}

export function CardContent({ className, children, ...props }: CardProps) {
  return (
    <div className={clsx(className)} {...props}>
      {children}
    </div>
  );
}
