'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface DateRangePickerProps {
  startDate: string;
  endDate: string;
  onDateRangeChange: (start: string, end: string) => void;
}

export function DateRangePicker({
  startDate,
  endDate,
  onDateRangeChange,
}: DateRangePickerProps) {
  const [tempStart, setTempStart] = useState(startDate);
  const [tempEnd, setTempEnd] = useState(endDate);
  const [open, setOpen] = useState(false);

  const formatDateForDisplay = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      return format(parseISO(dateStr), 'dd MMM yyyy');
    } catch {
      return dateStr;
    }
  };

  const displayText = () => {
    if (startDate && endDate) {
      if (startDate === endDate) {
        return formatDateForDisplay(startDate);
      }
      return `${formatDateForDisplay(startDate)} – ${formatDateForDisplay(endDate)}`;
    }
    if (startDate) {
      return `From ${formatDateForDisplay(startDate)}`;
    }
    if (endDate) {
      return `Until ${formatDateForDisplay(endDate)}`;
    }
    return 'Select date range';
  };

  const handleStartChange = (value: string) => {
    setTempStart(value);
    // If end date is before new start date, update end date too
    if (value && tempEnd && value > tempEnd) {
      setTempEnd(value);
    }
  };

  const handleEndChange = (value: string) => {
    setTempEnd(value);
    // If start date is after new end date, update start date too
    if (value && tempStart && value < tempStart) {
      setTempStart(value);
    }
  };

  const handleApply = () => {
    onDateRangeChange(tempStart, tempEnd);
    setOpen(false);
  };

  const handleCancel = () => {
    setTempStart(startDate);
    setTempEnd(endDate);
    setOpen(false);
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="w-full justify-start text-left font-normal">
          <Calendar className="mr-2 h-4 w-4" />
          <span className="flex-1 text-left">{displayText()}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[320px] p-4">
        <div className="space-y-4">
          <div className="grid gap-3">
            <div className="space-y-2">
              <Label htmlFor="rangeStart">Start date</Label>
              <Input
                id="rangeStart"
                type="date"
                value={tempStart}
                onChange={(e) => handleStartChange(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rangeEnd">End date</Label>
              <Input
                id="rangeEnd"
                type="date"
                value={tempEnd}
                onChange={(e) => handleEndChange(e.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="outline" size="sm" onClick={handleCancel}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleApply}>
              Apply
            </Button>
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
