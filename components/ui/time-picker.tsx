'use client';

import * as React from 'react';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface TimePickerProps {
  value?: string; // Format: "HH:MM"
  onChange: (value: string) => void;
  placeholder?: string;
  id?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

export function TimePicker({
  value,
  onChange,
  placeholder = 'Select time',
  id,
  required = false,
  disabled = false,
  className,
}: TimePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [selectedHour12, setSelectedHour12] = React.useState<number | null>(null);
  const [selectedMinute, setSelectedMinute] = React.useState<number | null>(null);
  const [isPM, setIsPM] = React.useState(false);
  const [mode, setMode] = React.useState<'hour' | 'minute'>('hour');

  // Parse initial value (24-hour format)
  React.useEffect(() => {
    if (value) {
      const [hour24, minute] = value.split(':').map(Number);
      if (!Number.isNaN(hour24) && !Number.isNaN(minute)) {
        const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
        setSelectedHour12(hour12);
        setSelectedMinute(minute);
        setIsPM(hour24 >= 12);
      }
    } else {
      setSelectedHour12(null);
      setSelectedMinute(null);
      setIsPM(false);
    }
  }, [value]);

  // Convert 12-hour + AM/PM to 24-hour format
  const to24Hour = React.useCallback((hour12: number, isPM: boolean): number => {
    if (hour12 === 12) {
      return isPM ? 12 : 0;
    }
    return isPM ? hour12 + 12 : hour12;
  }, []);

  // Update parent when time changes
  const handleTimeChange = React.useCallback(
    (hour12: number | null, minute: number | null, pm: boolean) => {
      if (hour12 !== null && minute !== null) {
        const hour24 = to24Hour(hour12, pm);
        const timeString = `${hour24.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        onChange(timeString);
      }
    },
    [onChange, to24Hour],
  );

  const handleHourSelect = (hour: number) => {
    setSelectedHour12(hour);
    setMode('minute');
  };

  const handleMinuteSelect = (minute: number) => {
    setSelectedMinute(minute);
    if (selectedHour12 !== null) {
      handleTimeChange(selectedHour12, minute, isPM);
    }
  };

  const handleConfirm = () => {
    if (selectedHour12 !== null && selectedMinute !== null) {
      handleTimeChange(selectedHour12, selectedMinute, isPM);
      setOpen(false);
      setMode('hour');
    }
  };

  const displayValue = React.useMemo(() => {
    if (selectedHour12 !== null && selectedMinute !== null) {
      const hour24 = to24Hour(selectedHour12, isPM);
      return `${hour24.toString().padStart(2, '0')}:${selectedMinute.toString().padStart(2, '0')}`;
    }
    return '';
  }, [selectedHour12, selectedMinute, isPM, to24Hour]);

  // Generate hour positions for 12-hour clock
  const hourPositions = React.useMemo(() => {
    const positions: Array<{ hour: number; x: number; y: number }> = [];
    const center = 120;
    const radius = 70;

    for (let hour = 1; hour <= 12; hour++) {
      const angle = ((hour * 30 - 90) * Math.PI) / 180; // -90 to start at top
      const x = center + radius * Math.cos(angle);
      const y = center + radius * Math.sin(angle);
      positions.push({ hour, x, y });
    }

    return positions;
  }, []);

  // Generate minute positions (every 5 minutes)
  const minutePositions = React.useMemo(() => {
    const positions: Array<{ minute: number; x: number; y: number }> = [];
    const center = 120;
    const radius = 70;

    for (let minute = 0; minute < 60; minute += 5) {
      const angle = ((minute * 6 - 90) * Math.PI) / 180;
      const x = center + radius * Math.cos(angle);
      const y = center + radius * Math.sin(angle);
      positions.push({ minute, x, y });
    }

    return positions;
  }, []);

  const renderClockFace = () => {
    const center = 120;
    const isHourMode = mode === 'hour';

    return (
      <div className="relative">
        <svg width="240" height="240" className="mx-auto">
          {/* Clock circle */}
          <circle
            cx={center}
            cy={center}
            r={95}
            fill="none"
            stroke="hsl(var(--border))"
            strokeWidth="2"
          />

          {isHourMode ? (
            <>
              {/* Hour markers - 12 hour clock */}
              {hourPositions.map((pos) => {
                const isSelected = selectedHour12 === pos.hour;

                return (
                  <g key={pos.hour}>
                    <circle
                      cx={pos.x}
                      cy={pos.y}
                      r={isSelected ? 14 : 10}
                      fill={isSelected ? 'hsl(var(--primary))' : 'hsl(var(--muted))'}
                      stroke={isSelected ? 'hsl(var(--primary))' : 'hsl(var(--border))'}
                      strokeWidth="2"
                      className="cursor-pointer hover:opacity-80 transition-all"
                      onClick={() => handleHourSelect(pos.hour)}
                    />
                    <text
                      x={pos.x}
                      y={pos.y + 4}
                      textAnchor="middle"
                      fontSize="12"
                      fontWeight={isSelected ? 'bold' : 'normal'}
                      fill={isSelected ? 'hsl(var(--primary-foreground))' : 'hsl(var(--foreground))'}
                      className="pointer-events-none select-none"
                    >
                      {pos.hour}
                    </text>
                  </g>
                );
              })}

              {/* Hour hand */}
              {selectedHour12 !== null && (
                <line
                  x1={center}
                  y1={center}
                  x2={center + 50 * Math.cos(((selectedHour12 * 30 - 90) * Math.PI) / 180)}
                  y2={center + 50 * Math.sin(((selectedHour12 * 30 - 90) * Math.PI) / 180)}
                  stroke="hsl(var(--primary))"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              )}
            </>
          ) : (
            <>
              {/* Minute markers */}
              {minutePositions.map((pos) => {
                const isSelected = selectedMinute === pos.minute;
                const isMajor = pos.minute % 15 === 0;

                return (
                  <g key={pos.minute}>
                    <circle
                      cx={pos.x}
                      cy={pos.y}
                      r={isSelected ? 12 : isMajor ? 8 : 6}
                      fill={isSelected ? 'hsl(var(--primary))' : isMajor ? 'hsl(var(--muted))' : 'hsl(var(--muted))'}
                      stroke={isSelected ? 'hsl(var(--primary))' : 'hsl(var(--border))'}
                      strokeWidth="2"
                      className="cursor-pointer hover:opacity-80 transition-all"
                      onClick={() => handleMinuteSelect(pos.minute)}
                    />
                    {isMajor && (
                      <text
                        x={pos.x}
                        y={pos.y + 3}
                        textAnchor="middle"
                        fontSize="10"
                        fill={isSelected ? 'hsl(var(--primary-foreground))' : 'hsl(var(--foreground))'}
                        className="pointer-events-none select-none"
                      >
                        {pos.minute}
                      </text>
                    )}
                  </g>
                );
              })}

              {/* Minute hand */}
              {selectedMinute !== null && (
                <line
                  x1={center}
                  y1={center}
                  x2={center + 65 * Math.cos(((selectedMinute * 6 - 90) * Math.PI) / 180)}
                  y2={center + 65 * Math.sin(((selectedMinute * 6 - 90) * Math.PI) / 180)}
                  stroke="hsl(var(--primary))"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              )}
            </>
          )}

          {/* Center dot */}
          <circle cx={center} cy={center} r={5} fill="hsl(var(--foreground))" />
        </svg>
      </div>
    );
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          id={id}
          disabled={disabled}
          className={cn(
            'flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
            className,
          )}
          aria-required={required}
          aria-expanded={open}
          aria-controls={id ? `${id}-clock` : undefined}
        >
          <span className={cn('flex-1 text-left', !displayValue && 'text-muted-foreground')}>
            {displayValue || placeholder}
          </span>
          <Clock className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="w-auto p-4"
        id={id ? `${id}-clock` : undefined}
      >
        <div className="space-y-4">
          {/* Mode switcher */}
          <div className="flex gap-2 justify-center">
            <Button
              type="button"
              variant={mode === 'hour' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMode('hour')}
            >
              Hour
            </Button>
            <Button
              type="button"
              variant={mode === 'minute' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMode('minute')}
              disabled={selectedHour12 === null}
            >
              Minute
            </Button>
          </div>

          {/* Clock face */}
          <div className="flex items-center justify-center">{renderClockFace()}</div>

          {/* AM/PM toggle - show in hour mode and minute mode */}
          {(mode === 'hour' || mode === 'minute') && (
            <div className="flex gap-2 justify-center">
              <Button
                type="button"
                variant={!isPM ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setIsPM(false);
                  if (selectedHour12 !== null && selectedMinute !== null) {
                    handleTimeChange(selectedHour12, selectedMinute, false);
                  }
                }}
              >
                AM
              </Button>
              <Button
                type="button"
                variant={isPM ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setIsPM(true);
                  if (selectedHour12 !== null && selectedMinute !== null) {
                    handleTimeChange(selectedHour12, selectedMinute, true);
                  }
                }}
              >
                PM
              </Button>
            </div>
          )}

          {/* Quick time input */}
          <div className="flex gap-2 items-center justify-center">
            <input
              type="number"
              min="1"
              max="12"
              value={selectedHour12 ?? ''}
              onChange={(e) => {
                const hour = Number.parseInt(e.target.value, 10);
                if (!Number.isNaN(hour) && hour >= 1 && hour <= 12) {
                  setSelectedHour12(hour);
                }
              }}
              placeholder="HH"
              className="w-16 text-center border rounded px-2 py-1 text-sm"
            />
            <span className="text-lg font-bold">:</span>
            <input
              type="number"
              min="0"
              max="59"
              value={selectedMinute ?? ''}
              onChange={(e) => {
                const minute = Number.parseInt(e.target.value, 10);
                if (!Number.isNaN(minute) && minute >= 0 && minute <= 59) {
                  setSelectedMinute(minute);
                  if (selectedHour12 !== null) {
                    handleTimeChange(selectedHour12, minute, isPM);
                  }
                }
              }}
              placeholder="MM"
              className="w-16 text-center border rounded px-2 py-1 text-sm"
            />
          </div>

          {/* Action buttons */}
          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setOpen(false);
                setMode('hour');
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleConfirm}
              disabled={selectedHour12 === null || selectedMinute === null}
            >
              Confirm
            </Button>
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
