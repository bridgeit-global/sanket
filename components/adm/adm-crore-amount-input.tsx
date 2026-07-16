'use client';

import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatCurrency } from '@/lib/mla-office-utils';
import { cn } from '@/lib/utils';

/** 1 crore = ₹1,00,00,000 */
export const RUPEES_PER_CRORE = 10_000_000;

export function rupeesToCrores(rupees: number): number {
  if (!rupees) return 0;
  return rupees / RUPEES_PER_CRORE;
}

export function croresToRupees(crores: number): number {
  // Allow 0 as a legitimate value; clamp only negative/invalid inputs.
  if (!Number.isFinite(crores) || crores < 0) return 0;
  return Math.round(crores * RUPEES_PER_CRORE);
}

function formatCroreInput(crores: number): string {
  if (!crores) return '';
  const rounded = Math.round(crores * 1000) / 1000;
  return String(rounded);
}

interface AdmCroreAmountInputProps {
  id?: string;
  label: string;
  valueRupees: number;
  onChangeRupees: (rupees: number) => void;
  hint?: string;
  className?: string;
  inputClassName?: string;
  disabled?: boolean;
}

export function AdmCroreAmountInput({
  id,
  label,
  valueRupees,
  onChangeRupees,
  hint,
  className,
  inputClassName,
  disabled,
}: AdmCroreAmountInputProps) {
  const [text, setText] = useState(() =>
    formatCroreInput(rupeesToCrores(valueRupees)),
  );

  useEffect(() => {
    setText((prev) => {
      const fromText = prev.trim() === '' || prev === '.' ? 0 : Number.parseFloat(prev);
      const textAsRupees = Number.isFinite(fromText)
        ? croresToRupees(fromText)
        : 0;
      if (textAsRupees === valueRupees) return prev;
      return formatCroreInput(rupeesToCrores(valueRupees));
    });
  }, [valueRupees]);

  return (
    <div className={cn('space-y-2', className)}>
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type="number"
          min={0}
          step={0.01}
          inputMode="decimal"
          disabled={disabled}
          value={text}
          onChange={(e) => {
            const raw = e.target.value;
            setText(raw);
            if (raw.trim() === '' || raw === '.') {
              onChangeRupees(0);
              return;
            }
            const crores = Number.parseFloat(raw);
            if (Number.isFinite(crores)) {
              onChangeRupees(croresToRupees(crores));
            }
          }}
          className={cn('min-h-11 pr-16', inputClassName)}
          placeholder="0"
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
          Cr
        </span>
      </div>
      <p className="text-xs text-muted-foreground">
        {hint
          ? hint
          : valueRupees > 0
            ? `= ${formatCurrency(valueRupees)}`
            : 'Enter amount in crores (e.g. 5.5)'}
      </p>
    </div>
  );
}
