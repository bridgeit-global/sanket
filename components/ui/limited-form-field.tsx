'use client';

import type { ComponentProps } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

type LimitedFormFieldProps = {
  id: string;
  label: React.ReactNode;
  value: string;
  onChange: (value: string) => void;
  maxLength: number;
  error?: string;
  required?: boolean;
} & Omit<ComponentProps<typeof Input>, 'id' | 'value' | 'onChange' | 'maxLength'>;

export function LimitedFormField({
  id,
  label,
  value,
  onChange,
  maxLength,
  error,
  required,
  className,
  disabled,
  placeholder,
  type = 'text',
  ...props
}: LimitedFormFieldProps) {
  const length = value.length;
  const atLimit = length >= maxLength;
  const nearLimit = length >= Math.floor(maxLength * 0.9);

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <Label htmlFor={id}>
          {label}
          {required ? ' *' : null}
        </Label>
        <span
          className={cn(
            'shrink-0 text-xs tabular-nums',
            atLimit
              ? 'font-medium text-destructive'
              : nearLimit
                ? 'text-amber-600 dark:text-amber-500'
                : 'text-muted-foreground',
          )}
          aria-live="polite"
        >
          {length}/{maxLength}
        </span>
      </div>
      <Input
        id={id}
        type={type}
        value={value}
        maxLength={maxLength}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        onChange={(event) => onChange(event.target.value)}
        className={cn(
          (error || atLimit) && 'border-destructive focus-visible:ring-destructive',
          className,
        )}
        aria-invalid={!!error || atLimit}
        aria-describedby={error ? `${id}-error` : undefined}
        {...props}
      />
      {error ? (
        <p id={`${id}-error`} className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
