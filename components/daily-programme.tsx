'use client';

import { useState, useEffect, useMemo } from 'react';
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
import { Printer, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { format, addDays, subDays, startOfDay, parseISO, isSameDay } from 'date-fns';
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
function calculateDuration(startTime: string, endTime?: string): number | null {
  if (!startTime || !endTime) return null;
  
  const [startHours, startMins] = startTime.split(':').map(Number);
  const [endHours, endMins] = endTime.split(':').map(Number);
  
  const startTotalMinutes = startHours * 60 + startMins;
  const endTotalMinutes = endHours * 60 + endMins;
  
  return endTotalMinutes - startTotalMinutes;
}

// Helper function to normalize date strings from various formats
function normalizeDate(dateValue: string | Date | null | undefined): string | null {
  if (!dateValue) {
    console.warn('normalizeDate received null/undefined value');
    return null;
  }
  
  // If it's already a Date object, convert to yyyy-MM-dd
  if (dateValue instanceof Date) {
    if (isNaN(dateValue.getTime())) {
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
      if (!isNaN(testDate.getTime())) {
        return dateValue;
      }
    }
    
    try {
      // Try parsing as ISO string (handles timezone info)
      const parsed = parseISO(dateValue);
      if (!isNaN(parsed.getTime())) {
        return format(parsed, 'yyyy-MM-dd');
      }
    } catch (error) {
      // If parseISO fails, try new Date
      try {
        const date = new Date(dateValue);
        if (!isNaN(date.getTime())) {
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
  const [currentDate, setCurrentDate] = useState<Date>(startOfDay(new Date()));
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

  // Get available dates sorted
  const availableDates = useMemo(() => {
    return Object.keys(itemsByDate)
      .map((d) => {
        try {
          return parseISO(d);
        } catch (error) {
          console.error('Error parsing date key:', d, error);
          return null;
        }
      })
      .filter((date): date is Date => date !== null)
      .sort((a, b) => a.getTime() - b.getTime());
  }, [itemsByDate]);

  // Get items for current date
  const currentDateItems = useMemo(() => {
    const dateKey = format(currentDate, 'yyyy-MM-dd');
    const items = itemsByDate[dateKey] || [];
    console.log('Current date key:', dateKey);
    console.log('Items for current date:', items);
    console.log('All date keys:', Object.keys(itemsByDate));
    return items;
  }, [itemsByDate, currentDate]);

  // Find current date index in available dates
  const currentDateIndex = useMemo(() => {
    return availableDates.findIndex((date) => isSameDay(date, currentDate));
  }, [availableDates, currentDate]);

  useEffect(() => {
    loadItems();
  }, []);

  // Debug: Log when allItems changes
  useEffect(() => {
    console.log('allItems changed:', allItems);
    console.log('Number of items:', allItems.length);
    if (allItems.length > 0) {
      console.log('First item date:', allItems[0].date, 'Type:', typeof allItems[0].date);
      console.log('Normalized first item date:', normalizeDate(allItems[0].date));
    }
  }, [allItems]);

  const loadItems = async (targetDate?: string) => {
    try {
      setLoading(true);
      const response = await fetch('/api/daily-programme');
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
      
      // If a target date is provided, navigate to it
      if (targetDate) {
        try {
          const targetDateObj = parseISO(targetDate);
          setCurrentDate(startOfDay(targetDateObj));
        } catch (error) {
          console.error('Error parsing target date:', targetDate, error);
        }
      } else if (validItems.length > 0) {
        // Otherwise, check if current date has items, if not navigate to first available date
        const currentDateKey = format(currentDate, 'yyyy-MM-dd');
        const hasCurrentDateItems = validItems.some((item: ProgrammeItem) => {
          if (!item.date) return false;
          const itemDateKey = normalizeDate(item.date);
          return itemDateKey === currentDateKey;
        });
        
        if (!hasCurrentDateItems && validItems[0]?.date) {
          const firstDateKey = normalizeDate(validItems[0].date);
          if (firstDateKey) {
            try {
              const firstDate = parseISO(firstDateKey);
              setCurrentDate(startOfDay(firstDate));
            } catch (error) {
              console.error('Error parsing first date:', firstDateKey, error);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error loading programme items:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.date || !form.startTime || !form.title || !form.location) return;

    try {
      // Calculate endTime from startTime and duration
      const durationMinutes = form.duration ? parseInt(form.duration, 10) : 0;
      const endTime = durationMinutes > 0 
        ? calculateEndTime(form.startTime, durationMinutes)
        : undefined;

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
        // Load items and navigate to the date of the newly created item
        await loadItems(form.date);
        
        setForm({
          date: format(new Date(), 'yyyy-MM-dd'),
          startTime: '',
          duration: '',
          title: '',
          location: '',
          remarks: '',
        });
      }
    } catch (error) {
      console.error('Error creating programme item:', error);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const goToPreviousDate = () => {
    if (currentDateIndex > 0) {
      setCurrentDate(startOfDay(availableDates[currentDateIndex - 1]));
    } else if (availableDates.length > 0) {
      // If at first date, go to previous day
      setCurrentDate(startOfDay(subDays(availableDates[0], 1)));
    } else {
      setCurrentDate(startOfDay(subDays(currentDate, 1)));
    }
  };

  const goToNextDate = () => {
    if (currentDateIndex >= 0 && currentDateIndex < availableDates.length - 1) {
      setCurrentDate(startOfDay(availableDates[currentDateIndex + 1]));
    } else if (availableDates.length > 0) {
      // If at last date, go to next day
      setCurrentDate(startOfDay(addDays(availableDates[availableDates.length - 1], 1)));
    } else {
      setCurrentDate(startOfDay(addDays(currentDate, 1)));
    }
  };

  const goToToday = () => {
    setCurrentDate(startOfDay(new Date()));
  };

  const hasPreviousDate = currentDateIndex > 0 || availableDates.length === 0;
  const hasNextDate = currentDateIndex < availableDates.length - 1 || availableDates.length === 0;

  if (loading) {
    return <div className="p-4">Loading...</div>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <SidebarToggle />
        <div>
          <h1 className="text-3xl font-bold">Daily Programme</h1>
          <p className="text-muted-foreground mt-2">
            Manage daily schedules, detailed calendar views, and analytics
          </p>
        </div>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Create / Edit Daily Programme</CardTitle>
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
              <div className="md:col-span-4 flex justify-end">
                <Button type="submit">Add to Programme</Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Programme Register</CardTitle>
              <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground">
                  Total: {allItems.length} | Dates: {availableDates.length}
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Date Navigation */}
            <div className="flex items-center justify-between mb-4 pb-4 border-b">
              <Button
                variant="outline"
                size="sm"
                onClick={goToPreviousDate}
                disabled={!hasPreviousDate && currentDateIndex === -1}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous Date
              </Button>
              
              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div className="text-center">
                  <div className="font-semibold text-lg">
                    {format(currentDate, 'dd MMM yyyy')}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {currentDateItems.length} event{currentDateItems.length !== 1 ? 's' : ''}
                    {currentDateIndex >= 0 && availableDates.length > 0 && (
                      <span> • Date {currentDateIndex + 1} of {availableDates.length}</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToToday}
                >
                  Today
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToNextDate}
                  disabled={!hasNextDate && currentDateIndex === -1}
                >
                  Next Date
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
                <Button variant="outline" size="sm" onClick={handlePrint}>
                  <Printer className="mr-2 h-4 w-4" />
                  Print Programme
                </Button>
              </div>
            </div>

            {/* Events Table */}
            <div className="overflow-x-auto">
              {currentDateItems.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No programme events for {format(currentDate, 'dd MMM yyyy')}</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Time</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Remarks</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentDateItems
                      .sort((a, b) => {
                        // Sort by start time
                        const timeA = a.startTime || '00:00';
                        const timeB = b.startTime || '00:00';
                        return timeA.localeCompare(timeB);
                      })
                      .map((item) => {
                        const duration = calculateDuration(item.startTime, item.endTime);
                        const durationLabel = duration !== null && duration > 0
                          ? DURATION_OPTIONS.find(opt => parseInt(opt.value, 10) === duration)?.label ||
                            (duration < 60 ? `${duration} min` : `${Math.floor(duration / 60)}h ${duration % 60}m`)
                          : null;
                        
                        return (
                          <TableRow key={item.id}>
                            <TableCell className="font-mono">
                              <div>{item.startTime}</div>
                              {durationLabel && (
                                <div className="text-xs text-muted-foreground mt-1">
                                  ({durationLabel})
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="font-medium">{item.title}</TableCell>
                            <TableCell>{item.location}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {item.remarks || '-'}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                  </TableBody>
                </Table>
              )}
            </div>

            {/* All Dates Summary (Optional - can be collapsed) */}
            {availableDates.length > 1 && (
              <div className="mt-6 pt-4 border-t">
                <details className="group">
                  <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">
                    View all dates ({availableDates.length} dates with events)
                  </summary>
                  <div className="mt-4 space-y-4">
                    {Object.entries(itemsByDate)
                      .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
                      .map(([dateKey, items]) => {
                        const date = parseISO(dateKey);
                        const isCurrentDate = isSameDay(date, currentDate);
                        return (
                          <div
                            key={dateKey}
                            className={`border rounded-lg p-4 ${
                              isCurrentDate ? 'border-primary bg-primary/5' : ''
                            }`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-semibold flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                {format(date, 'dd MMM yyyy')}
                                {isCurrentDate && (
                                  <span className="text-xs text-primary">(Current)</span>
                                )}
                              </h4>
                              <span className="text-sm text-muted-foreground">
                                {items.length} event{items.length !== 1 ? 's' : ''}
                              </span>
                            </div>
                            {!isCurrentDate && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setCurrentDate(startOfDay(date))}
                                className="mt-2"
                              >
                                View Events
                              </Button>
                            )}
                          </div>
                        );
                      })}
                  </div>
                </details>
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
}

