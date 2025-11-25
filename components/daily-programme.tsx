'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SidebarToggle } from '@/components/sidebar-toggle';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Printer, Calendar, Pencil } from 'lucide-react';
import { format, addDays, parseISO, startOfToday } from 'date-fns';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ProgrammeItem {
  id: string;
  date: string | Date | null;
  startTime: string;
  endTime?: string | null;
  title: string;
  location: string;
  remarks?: string | null;
}

interface DailyProgrammeProps {
  userRole: string;
}

// Generate time options in 15-minute intervals (00:00 to 23:45)
function generateTimeOptions(): string[] {
  const options: string[] = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      const hourStr = hour.toString().padStart(2, '0');
      const minuteStr = minute.toString().padStart(2, '0');
      options.push(`${hourStr}:${minuteStr}`);
    }
  }
  return options;
}

// Generate duration options in minutes
function generateDurationOptions(): Array<{ value: string; label: string }> {
  const options: Array<{ value: string; label: string }> = [];
  // Common durations: 15, 30, 45, 60, 90, 120, 180, 240 minutes
  const durations = [15, 30, 45, 60, 90, 120, 180, 240];

  durations.forEach((minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    let label: string;
    if (hours === 0) {
      label = `${minutes} min`;
    } else if (mins === 0) {
      label = hours === 1 ? '1 hour' : `${hours} hours`;
    } else {
      label = `${hours}h ${mins}m`;
    }
    options.push({ value: minutes.toString(), label });
  });

  return options;
}

// Calculate end time from start time and duration (in minutes)
function calculateEndTime(startTime: string, durationMinutes: number): string {
  if (!startTime) return '';

  const [hours, minutes] = startTime.split(':').map(Number);
  const startTotalMinutes = hours * 60 + minutes;
  const endTotalMinutes = startTotalMinutes + durationMinutes;

  const endHours = Math.floor(endTotalMinutes / 60) % 24;
  const endMins = endTotalMinutes % 60;

  return `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;
}

// Calculate duration in minutes from start and end time
function calculateDuration(
  startTime?: string | null,
  endTime?: string | null,
): number | null {
  if (!startTime || !endTime) return null;

  const [startHours, startMins] = startTime.split(':').map(Number);
  const [endHours, endMins] = endTime.split(':').map(Number);

  const startTotalMinutes = startHours * 60 + startMins;
  const endTotalMinutes = endHours * 60 + endMins;

  return endTotalMinutes - startTotalMinutes;
}

// Convert 24-hour time to 12-hour format with AM/PM
function formatTimeTo12Hour(time24: string): string {
  if (!time24) return '';

  const [hours, minutes] = time24.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours % 12 || 12; // Convert 0 to 12 for midnight

  return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
}

function getDefaultDateRange() {
  const today = startOfToday();
  return {
    start: format(today, 'yyyy-MM-dd'),
    end: format(addDays(today, 1), 'yyyy-MM-dd'),
  };
}

// Helper function to normalize date strings from various formats
function normalizeDate(dateValue: string | Date | null | undefined): string | null {
  if (!dateValue) {
    console.warn('normalizeDate received null/undefined value');
    return null;
  }

  // If it's already a Date object, convert to yyyy-MM-dd
  if (dateValue instanceof Date) {
    if (Number.isNaN(dateValue.getTime())) {
      console.warn('normalizeDate received invalid Date object');
      return null;
    }
    return format(dateValue, 'yyyy-MM-dd');
  }

  // If it's a string, try to parse it
  if (typeof dateValue === 'string') {
    // First, check if it's already in YYYY-MM-DD format
    const yyyyMMddPattern = /^\d{4}-\d{2}-\d{2}$/;
    if (yyyyMMddPattern.test(dateValue)) {
      // Validate it's a valid date
      const testDate = new Date(dateValue);
      if (!Number.isNaN(testDate.getTime())) {
        return dateValue;
      }
    }

    try {
      // Try parsing as ISO string (handles timezone info)
      const parsed = parseISO(dateValue);
      if (!Number.isNaN(parsed.getTime())) {
        return format(parsed, 'yyyy-MM-dd');
      }
    } catch (error) {
      // If parseISO fails, try new Date
      try {
        const date = new Date(dateValue);
        if (!Number.isNaN(date.getTime())) {
          return format(date, 'yyyy-MM-dd');
        }
      } catch (e) {
        console.error('Error normalizing date:', dateValue, 'Error:', e);
      }
    }
  }

  console.warn('Could not normalize date:', dateValue, typeof dateValue);
  return null;
}

const TIME_OPTIONS = generateTimeOptions();
const DURATION_OPTIONS = generateDurationOptions();

export function DailyProgramme({ userRole }: DailyProgrammeProps) {
  const [allItems, setAllItems] = useState<ProgrammeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>(() =>
    getDefaultDateRange(),
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    startTime: '',
    duration: '',
    title: '',
    location: '',
    remarks: '',
  });

  // Group items by date
  const itemsByDate = useMemo(() => {
    const grouped: Record<string, ProgrammeItem[]> = {};
    allItems.forEach((item) => {
      if (item.date) {
        const dateKey = normalizeDate(item.date);
        if (dateKey) {
          if (!grouped[dateKey]) {
            grouped[dateKey] = [];
          }
          grouped[dateKey].push(item);
        } else {
          console.error('Could not normalize date for item:', item.id, item.date);
        }
      }
    });
    console.log('Items grouped by date:', grouped);
    return grouped;
  }, [allItems]);

  const filteredDateEntries = useMemo(() => {
    return Object.entries(itemsByDate)
      .filter(([dateKey]) => {
        if (dateRange.start && dateKey < dateRange.start) {
          return false;
        }
        if (dateRange.end && dateKey > dateRange.end) {
          return false;
        }
        return true;
      })
      .sort(([dateA], [dateB]) => dateA.localeCompare(dateB));
  }, [itemsByDate, dateRange.start, dateRange.end]);

  const loadItems = useCallback(
    async (startDate?: string, endDate?: string) => {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        const resolvedStart = startDate ?? dateRange.start;
        const resolvedEnd = endDate ?? dateRange.end;

        if (resolvedStart) {
          params.append('startDate', resolvedStart);
        }
        if (resolvedEnd) {
          params.append('endDate', resolvedEnd);
        }

        const queryString = params.toString();
        const response = await fetch(
          `/api/daily-programme${queryString ? `?${queryString}` : ''}`,
        );
        if (!response.ok) {
          console.error('Failed to load items:', response.status, response.statusText);
          const errorData = await response.json().catch(() => ({}));
          console.error('Error data:', errorData);
          return;
        }
        const data = await response.json();
        console.log('Loaded items from API:', data);
        console.log('Number of items:', data?.length || 0);

        // Filter out items with null or undefined dates
        const validItems = data.filter((item: ProgrammeItem) => {
          const hasDate = item.date != null;
          if (!hasDate) {
            console.warn('Item missing date:', item);
          }
          return hasDate;
        });
        console.log('Valid items after filtering:', validItems);
        console.log('Number of valid items:', validItems.length);
        setAllItems(validItems);
      } catch (error) {
        console.error('Error loading programme items:', error);
      } finally {
        setLoading(false);
      }
    },
    [dateRange.start, dateRange.end],
  );

  const dateRangeLabel = useMemo(() => {
    const formatDate = (value?: string) => {
      if (!value) return null;
      try {
        return format(parseISO(value), 'dd MMM yyyy');
      } catch (error) {
        console.error('Error formatting date range value:', value, error);
        return value;
      }
    };

    const startLabel = formatDate(dateRange.start);
    const endLabel = formatDate(dateRange.end);

    if (startLabel && endLabel && dateRange.start === dateRange.end) {
      return startLabel;
    }
    if (startLabel && endLabel) {
      return `${startLabel} – ${endLabel}`;
    }
    if (startLabel) {
      return `From ${startLabel}`;
    }
    if (endLabel) {
      return `Until ${endLabel}`;
    }
    return 'All scheduled dates';
  }, [dateRange.start, dateRange.end]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  // Debug: Log when allItems changes
  useEffect(() => {
    console.log('allItems changed:', allItems);
    console.log('Number of items:', allItems.length);
    if (allItems.length > 0) {
      console.log('First item date:', allItems[0].date, 'Type:', typeof allItems[0].date);
      console.log('Normalized first item date:', normalizeDate(allItems[0].date));
    }
  }, [allItems]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.date || !form.startTime || !form.title || !form.location) return;

    try {
      // Calculate endTime from startTime and duration
      const durationMinutes = form.duration ? Number.parseInt(form.duration, 10) : 0;
      const endTime = durationMinutes > 0
        ? calculateEndTime(form.startTime, durationMinutes)
        : undefined;

      if (editingId) {
        // Update existing item
        const response = await fetch(`/api/daily-programme/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            date: form.date,
            startTime: form.startTime,
            endTime,
            title: form.title,
            location: form.location,
            remarks: form.remarks,
          }),
        });

        if (response.ok) {
          await loadItems();
          setEditingId(null);
          setForm({
            date: format(new Date(), 'yyyy-MM-dd'),
            startTime: '',
            duration: '',
            title: '',
            location: '',
            remarks: '',
          });
        }
      } else {
        // Create new item
        const response = await fetch('/api/daily-programme', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            date: form.date,
            startTime: form.startTime,
            endTime,
            title: form.title,
            location: form.location,
            remarks: form.remarks,
          }),
        });

        if (response.ok) {
          await loadItems();

          setForm({
            date: format(new Date(), 'yyyy-MM-dd'),
            startTime: '',
            duration: '',
            title: '',
            location: '',
            remarks: '',
          });
        }
      }
    } catch (error) {
      console.error('Error saving programme item:', error);
    }
  };

  const handleEdit = (item: ProgrammeItem) => {
    const duration = calculateDuration(item.startTime, item.endTime);
    setEditingId(item.id);
    setForm({
      date: normalizeDate(item.date) || format(new Date(), 'yyyy-MM-dd'),
      startTime: item.startTime,
      duration: duration ? duration.toString() : '',
      title: item.title,
      location: item.location,
      remarks: item.remarks || '',
    });

    // Scroll to form
    const formElement = document.getElementById('programme-form');
    if (formElement) {
      formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setForm({
      date: format(new Date(), 'yyyy-MM-dd'),
      startTime: '',
      duration: '',
      title: '',
      location: '',
      remarks: '',
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this programme item?')) {
      return;
    }

    try {
      const response = await fetch(`/api/daily-programme/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await loadItems();
        if (editingId === id) {
          handleCancelEdit();
        }
      }
    } catch (error) {
      console.error('Error deleting programme item:', error);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const updateDateRange = (key: 'start' | 'end', value: string) => {
    setDateRange((prev) => {
      if (key === 'start') {
        if (!value) {
          return { ...prev, start: '' };
        }
        if (prev.end && value > prev.end) {
          return { start: value, end: value };
        }
        return { ...prev, start: value };
      }

      // key === 'end'
      if (!value) {
        return { ...prev, end: '' };
      }
      if (prev.start && value < prev.start) {
        return { start: value, end: value };
      }
      return { ...prev, end: value };
    });
  };

  const handleResetRange = () => {
    setDateRange(getDefaultDateRange());
  };

  if (loading) {
    return <div className="p-4">Loading...</div>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3 no-print">
        <SidebarToggle />
        <div>
          <h1 className="text-3xl font-bold">Daily Programme</h1>
          <p className="text-muted-foreground mt-2">
            Manage daily schedules, detailed calendar views, and analytics
          </p>
        </div>
      </div>

      <div className="space-y-6">
        <Card className="no-print" id="programme-form">
          <CardHeader>
            <CardTitle>{editingId ? 'Edit Programme' : 'Create Daily Programme'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid gap-3 md:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="startTime">Start Time</Label>
                <Select
                  value={form.startTime || undefined}
                  onValueChange={(value) => setForm({ ...form, startTime: value })}
                  required
                >
                  <SelectTrigger id="startTime">
                    <SelectValue placeholder="Select time" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[200px]">
                    {TIME_OPTIONS.map((time) => (
                      <SelectItem key={time} value={time}>
                        {time}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="duration">Duration</Label>
                <Select
                  value={form.duration || undefined}
                  onValueChange={(value) => setForm({ ...form, duration: value })}
                >
                  <SelectTrigger id="duration">
                    <SelectValue placeholder="Select duration" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[200px]">
                    {DURATION_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-1">
                <Label htmlFor="title">Programme Title</Label>
                <Input
                  id="title"
                  placeholder="Field visit, meeting, event..."
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  placeholder="Ward office, society name, landmark..."
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="remarks">Remarks</Label>
                <Textarea
                  id="remarks"
                  placeholder="Key points, officers to be present, contact person..."
                  value={form.remarks}
                  onChange={(e) => setForm({ ...form, remarks: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="md:col-span-4 flex justify-end gap-2">
                {editingId && (
                  <Button type="button" variant="outline" onClick={handleCancelEdit}>
                    Cancel
                  </Button>
                )}
                <Button type="submit">{editingId ? 'Update Programme' : 'Add to Programme'}</Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="no-print">
            <div className="flex items-center justify-between">
              <CardTitle>Programme Register</CardTitle>
              <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground">
                  Total: {allItems.length} | Dates: {filteredDateEntries.length}
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Date Range Filter - Hidden when printing */}
            <div className="space-y-4 mb-4 pb-4 border-b no-print">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="font-semibold text-lg">{dateRangeLabel}</div>
                    <div className="text-xs text-muted-foreground">
                      Showing {allItems.length} event{allItems.length !== 1 ? 's' : ''} across{' '}
                      {filteredDateEntries.length} date{filteredDateEntries.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={handleResetRange}>
                    Reset Range
                  </Button>
                  <Button variant="outline" size="sm" onClick={handlePrint}>
                    <Printer className="mr-2 h-4 w-4" />
                    Print Programme
                  </Button>
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="rangeStart">Start date</Label>
                  <Input
                    id="rangeStart"
                    type="date"
                    value={dateRange.start}
                    onChange={(e) => updateDateRange('start', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rangeEnd">End date</Label>
                  <Input
                    id="rangeEnd"
                    type="date"
                    value={dateRange.end}
                    onChange={(e) => updateDateRange('end', e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Events Table - Printable Section */}
            <div className="print-schedule">
              {/* Print Header - Only visible when printing */}
              <div className="print-header hidden">
                <h1>Daily Programme</h1>
                <p>{dateRangeLabel}</p>
              </div>

              {filteredDateEntries.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No programme events for the selected date range.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {filteredDateEntries.map(([dateKey, items]) => {
                    const date = parseISO(dateKey);
                    return (
                      <div key={dateKey} className="space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2 font-semibold">
                            <Calendar className="h-4 w-4" />
                            {format(date, 'EEEE, dd MMM yyyy')}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {items.length} event{items.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-[120px]">Time</TableHead>
                                <TableHead className="w-[200px]">Title</TableHead>
                                <TableHead className="w-[250px]">Location</TableHead>
                                <TableHead>Remarks</TableHead>
                                <TableHead className="w-[100px] no-print">Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {items
                                .sort((a, b) => {
                                  // Sort by start time
                                  const timeA = a.startTime || '00:00';
                                  const timeB = b.startTime || '00:00';
                                  return timeA.localeCompare(timeB);
                                })
                                .map((item) => {
                                  const duration = calculateDuration(item.startTime, item.endTime);
                                  const durationLabel = duration !== null && duration > 0
                                    ? DURATION_OPTIONS.find(
                                      (opt) => Number.parseInt(opt.value, 10) === duration,
                                    )?.label ||
                                    (duration < 60
                                      ? `${duration} min`
                                      : `${Math.floor(duration / 60)}h ${duration % 60}m`)
                                    : null;

                                  return (
                                    <TableRow key={item.id}>
                                      <TableCell className="font-mono w-[120px]">
                                        <div>{formatTimeTo12Hour(item.startTime)}</div>
                                        {durationLabel && (
                                          <div className="text-xs text-muted-foreground mt-1">
                                            ({durationLabel})
                                          </div>
                                        )}
                                      </TableCell>
                                      <TableCell className="font-medium w-[200px]">{item.title}</TableCell>
                                      <TableCell className="w-[250px]">{item.location}</TableCell>
                                      <TableCell className="text-sm text-muted-foreground">
                                        {item.remarks || '-'}
                                      </TableCell>
                                      <TableCell className="w-[100px] no-print">
                                        <div className="flex gap-1">
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => handleEdit(item)}
                                            className="h-8 px-2"
                                          >
                                            <Pencil className="h-3 w-3" />
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => handleDelete(item.id)}
                                            className="h-8 px-2 text-destructive hover:text-destructive"
                                          >
                                            ×
                                          </Button>
                                        </div>
                                      </TableCell>
                                    </TableRow>
                                  );
                                })}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}

