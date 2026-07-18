'use client';

import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  type AdmAmountUnit,
  formatAdmAmount,
  rupeesToUnitAmount,
  unitAmountToRupees,
} from '@/lib/adm/amount-unit';
import { cn } from '@/lib/utils';

function formatUnitInput(display: number, unit: AdmAmountUnit): string {
  if (!display) return '';
  if (unit === 'rupees') return String(Math.round(display));
  const rounded = Math.round(display * 1000) / 1000;
  return String(rounded);
}

interface AdmUnitAmountInputProps {
  id?: string;
  label: string;
  valueRupees: number;
  onChangeRupees: (rupees: number) => void;
  unit: AdmAmountUnit;
  className?: string;
  inputClassName?: string;
  disabled?: boolean;
}

export function AdmUnitAmountInput({
  id,
  label,
  valueRupees,
  onChangeRupees,
  unit,
  className,
  inputClassName,
  disabled,
}: AdmUnitAmountInputProps) {
  const [text, setText] = useState(() =>
    formatUnitInput(rupeesToUnitAmount(valueRupees, unit), unit),
  );

  useEffect(() => {
    setText((prev) => {
      const fromText =
        prev.trim() === '' || prev === '.' ? 0 : Number.parseFloat(prev);
      const textAsRupees = Number.isFinite(fromText)
        ? unitAmountToRupees(fromText, unit)
        : 0;
      if (textAsRupees === valueRupees) return prev;
      return formatUnitInput(rupeesToUnitAmount(valueRupees, unit), unit);
    });
  }, [valueRupees, unit]);

  const suffix =
    unit === 'thousands' ? '×1000' : unit === 'lakhs' ? 'L' : '₹';

  return (
    <div className={cn('space-y-1', className)}>
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type="number"
          min={0}
          step={unit === 'rupees' ? 1 : 0.001}
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
            const display = Number.parseFloat(raw);
            if (Number.isFinite(display)) {
              onChangeRupees(unitAmountToRupees(display, unit));
            }
          }}
          className={cn('min-h-10 pr-14', inputClassName)}
          placeholder="0"
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
          {suffix}
        </span>
      </div>
      {valueRupees > 0 && (
        <p className="text-xs text-muted-foreground">
          = {formatAdmAmount(valueRupees, 'rupees')}
        </p>
      )}
    </div>
  );
}
