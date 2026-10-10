import React from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link' | 'navy';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', isLoading, children, disabled, ...props }, ref) => {
    const variantStyles = {
      default: 'bg-blue-600 text-white hover:bg-blue-700 shadow-2xs focus-visible:ring-blue-500',
      navy: 'bg-[#142C4E] text-white hover:bg-[#0F223D] shadow-2xs focus-visible:ring-[#142C4E]',
      destructive: 'bg-red-600 text-white hover:bg-red-700 shadow-2xs focus-visible:ring-red-500',
      outline: 'border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 shadow-2xs focus-visible:ring-slate-400',
      secondary: 'bg-slate-100 text-slate-900 hover:bg-slate-200 focus-visible:ring-slate-400',
      ghost: 'hover:bg-slate-100 text-slate-700 hover:text-slate-900',
      link: 'text-blue-600 underline-offset-4 hover:underline p-0 h-auto'
    };

    const sizeStyles = {
      default: 'h-9 px-4 py-2 text-xs',
      sm: 'h-8 rounded-md px-3 text-xs',
      lg: 'h-10 rounded-md px-6 text-sm',
      icon: 'h-9 w-9 p-0'
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50 cursor-pointer select-none active:scale-[0.98]',
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        {...props}
      >
        {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';
