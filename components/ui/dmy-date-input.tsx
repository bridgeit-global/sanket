'use client';

import { useEffect, useState } from 'react';
import { Calendar } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { formatYmdAsDmy, parseFlexibleDateToYmd } from '@/lib/ist-date';
import { cn } from '@/lib/utils';

type DmyDateInputProps = Omit<
  React.ComponentProps<'input'>,
  'type' | 'value' | 'defaultValue'
> & {
  /** Stored value as `yyyy-MM-dd` (same as a native date input). */
  value: string;
  onValueChange?: (ymd: string) => void;
};

function toDisplay(ymd: string): string {
  if (!ymd) return '';
  const parsed = parseFlexibleDateToYmd(ymd);
  return parsed ? formatYmdAsDmy(parsed) : ymd;
}

function emitChange(
  ymd: string,
  onChange?: React.ChangeEventHandler<HTMLInputElement>,
  onValueChange?: (ymd: string) => void,
) {
  onValueChange?.(ymd);
  onChange?.({
    target: { value: ymd },
    currentTarget: { value: ymd },
  } as React.ChangeEvent<HTMLInputElement>);
}

/**
 * Date field that always shows `dd-mm-yyyy`.
 * Native `<input type="date">` follows the OS locale (mm-dd-yyyy on many Windows PCs).
 */
export function DmyDateInput({
  value,
  onChange,
  onValueChange,
  className,
  placeholder = 'dd-mm-yyyy',
  min,
  max,
  disabled,
  readOnly,
  id,
  name,
  required,
  'aria-invalid': ariaInvalid,
  'aria-label': ariaLabel,
  'aria-hidden': ariaHidden,
  tabIndex,
  ...rest
}: DmyDateInputProps) {
  const [focused, setFocused] = useState(false);
  const [text, setText] = useState(() => toDisplay(value));

  useEffect(() => {
    if (focused) return;
    setText(toDisplay(value));
  }, [value, focused]);

  const isoValue = parseFlexibleDateToYmd(value) ?? '';
  const minIso = typeof min === 'string' ? min : undefined;
  const maxIso = typeof max === 'string' ? max : undefined;

  const commitText = (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) {
      setText('');
      emitChange('', onChange, onValueChange);
      return;
    }
    const parsed = parseFlexibleDateToYmd(trimmed);
    if (
      !parsed ||
      (minIso && parsed < minIso) ||
      (maxIso && parsed > maxIso)
    ) {
      setText(toDisplay(value));
      return;
    }
    setText(formatYmdAsDmy(parsed));
    emitChange(parsed, onChange, onValueChange);
  };

  const openPicker = (event: React.MouseEvent<HTMLInputElement>) => {
    if (disabled || readOnly) return;
    const picker = event.currentTarget;
    const rect = picker.getBoundingClientRect();
    if (rect.top < 0 || rect.bottom > window.innerHeight) {
      picker.scrollIntoView({ block: 'center', inline: 'nearest' });
    }
    // A transparent calendar glyph does not open the overlay on several phones.
    // showPicker() from this tap does, and the input is a real on-screen box
    // so the dialog is anchored where the user can see it.
    if (typeof picker.showPicker !== 'function') return;
    try {
      picker.showPicker();
      event.preventDefault();
    } catch {
      // Older iOS rejects showPicker(). Leave the click alone so the tap opens the wheel.
    }
  };

  return (
    <div className="relative">
      <Input
        {...rest}
        id={id}
        name={name}
        required={required}
        disabled={disabled}
        readOnly={readOnly}
        inputMode="numeric"
        autoComplete="off"
        placeholder={placeholder}
        value={text}
        aria-invalid={ariaInvalid}
        aria-label={ariaLabel}
        aria-hidden={ariaHidden}
        tabIndex={tabIndex}
        className={cn('pr-10 font-mono', className)}
        onChange={(event) => {
          const next = event.target.value;
          setText(next);
          const parsed = parseFlexibleDateToYmd(next);
          if (
            parsed &&
            (!minIso || parsed >= minIso) &&
            (!maxIso || parsed <= maxIso)
          ) {
            emitChange(parsed, onChange, onValueChange);
          } else if (!next.trim()) {
            emitChange('', onChange, onValueChange);
          }
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false);
          commitText(text);
        }}
      />
      <div
        className={cn(
          'absolute inset-y-0 right-0 z-10 w-10',
          (disabled || readOnly) && 'pointer-events-none opacity-50',
        )}
      >
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-muted-foreground">
          <Calendar className="h-4 w-4" aria-hidden />
        </span>
        <input
          type="date"
          tabIndex={-1}
          aria-label="Choose date"
          disabled={disabled || readOnly}
          value={isoValue}
          min={minIso}
          max={maxIso}
          onChange={(event) => {
            const next = event.target.value;
            setText(next ? formatYmdAsDmy(next) : '');
            emitChange(next, onChange, onValueChange);
          }}
          onClick={openPicker}
          lang="en-IN"
          className="dmy-date-native"
        />
      </div>
    </div>
  );
}
