import React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 
    | 'default' 
    | 'secondary' 
    | 'outline' 
    | 'destructive' 
    | 'success' 
    | 'warning' 
    | 'info' 
    | 'purple';
}

export function Badge({
  className,
  variant = 'default',
  ...props
}: BadgeProps) {
  const variantStyles = {
    default: 'bg-blue-600 text-white border-transparent hover:bg-blue-700',
    secondary: 'bg-slate-100 text-slate-800 border-transparent hover:bg-slate-200',
    outline: 'text-slate-800 border-slate-200 hover:bg-slate-50',
    destructive: 'bg-red-50 text-red-700 border-red-200/80',
    success: 'bg-emerald-50 text-emerald-800 border-emerald-200/80',
    warning: 'bg-amber-50 text-amber-800 border-amber-200/80',
    info: 'bg-sky-50 text-sky-800 border-sky-200/80',
    purple: 'bg-purple-50 text-purple-800 border-purple-200/80'
  };

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-hidden',
        variantStyles[variant],
        className
      )}
      {...props}
    />
  );
}
