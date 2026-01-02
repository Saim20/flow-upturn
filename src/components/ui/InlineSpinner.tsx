'use client';

import { cn } from './class';

export type SpinnerSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type SpinnerColor = 'white' | 'primary' | 'blue' | 'emerald' | 'violet' | 'amber' | 'red' | 'gray' | 'current';

interface SpinnerProps {
  /** Size of the spinner */
  size?: SpinnerSize;
  /** Color theme */
  color?: SpinnerColor;
  /** Additional CSS classes */
  className?: string;
}

const sizeMap: Record<SpinnerSize, string> = {
  xs: 'h-3 w-3 border-[1.5px]',
  sm: 'h-4 w-4 border-2',
  md: 'h-6 w-6 border-2',
  lg: 'h-8 w-8 border-2',
  xl: 'h-10 w-10 border-2',
};

const colorMap: Record<SpinnerColor, string> = {
  white: 'border-white/30 border-t-white',
  primary: 'border-primary-200 border-t-primary-600',
  blue: 'border-blue-200 border-t-blue-600',
  emerald: 'border-emerald-200 border-t-emerald-600',
  violet: 'border-violet-200 border-t-violet-600',
  amber: 'border-amber-200 border-t-amber-600',
  red: 'border-red-200 border-t-red-600',
  gray: 'border-gray-200 border-t-gray-600',
  current: 'border-current/30 border-t-current',
};

/**
 * A simple inline spinner for loading states.
 * Use this for small inline spinners (buttons, input fields, etc.)
 * Use LoadingSpinner for full-page or section loading states.
 * 
 * @example
 * // In a button
 * <button disabled={loading}>
 *   {loading && <InlineSpinner size="sm" color="white" className="mr-2" />}
 *   Save
 * </button>
 * 
 * @example
 * // Centered in a container
 * <div className="flex justify-center py-4">
 *   <InlineSpinner size="lg" color="primary" />
 * </div>
 */
export function InlineSpinner({ size = 'md', color = 'primary', className }: SpinnerProps) {
  return (
    <div
      className={cn(
        'animate-spin rounded-full',
        sizeMap[size],
        colorMap[color],
        className
      )}
      role="status"
      aria-label="Loading"
    />
  );
}

export default InlineSpinner;
