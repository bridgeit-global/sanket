'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Printer, Calendar, Pencil, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { format, addDays, parseISO, startOfToday } from 'date-fns';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TimePicker } from '@/components/ui/time-picker';

import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { ModulePageHeader } from '@/components/module-page-header';
import { DateRangePicker } from '@/components/date-range-picker';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslations } from '@/hooks/use-translations';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface ProgrammeItem {
  id: string;
  date: string | Date | null;
  startTime: string;
  endTime?: string | null;
  title: string;
  location: string;
  remarks?: string | null;
  attended?: boolean | null;
}

interface DailyProgrammeProps {
  userRole: string;
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

const DURATION_OPTIONS = generateDurationOptions();

export function DailyProgramme({ userRole }: DailyProgrammeProps) {
  const { t } = useTranslations();
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

  // Delete confirmation dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  // Beneficiary task creation dialog
  const [beneficiaryTaskDialogOpen, setBeneficiaryTaskDialogOpen] = useState(false);
  const [programmeItemForTask, setProgrammeItemForTask] = useState<ProgrammeItem | null>(null);
  const [voterEpicNumber, setVoterEpicNumber] = useState('');
  const [voterName, setVoterName] = useState('');
  const [isCreatingTask, setIsCreatingTask] = useState(false);

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
          toast.success(t('dailyProgramme.programmeItemUpdatedSuccess'));
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
        } else {
          toast.error(t('dailyProgramme.failedToUpdateProgrammeItem'));
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
          toast.success(t('dailyProgramme.programmeItemAddedSuccess'));
          await loadItems();

          setForm({
            date: format(new Date(), 'yyyy-MM-dd'),
            startTime: '',
            duration: '',
            title: '',
            location: '',
            remarks: '',
          });
        } else {
          toast.error(t('dailyProgramme.failedToAddProgrammeItem'));
        }
      }
    } catch (error) {
      console.error('Error saving programme item:', error);
      toast.error(t('dailyProgramme.failedToSaveProgrammeItem'));
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

  const handleDelete = (id: string) => {
    setItemToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;

    try {
      const response = await fetch(`/api/daily-programme/${itemToDelete}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success(t('dailyProgramme.programmeItemDeletedSuccess'));
        await loadItems();
        if (editingId === itemToDelete) {
          handleCancelEdit();
        }
      } else {
        toast.error(t('dailyProgramme.failedToDeleteProgrammeItem'));
      }
    } catch (error) {
      console.error('Error deleting programme item:', error);
      toast.error(t('dailyProgramme.failedToDeleteProgrammeItem'));
    } finally {
      setItemToDelete(null);
      setDeleteDialogOpen(false);
    }
  };

  const handlePrint = () => {
    // Format date range for filename
    const formatDateForFilename = (dateStr?: string) => {
      if (!dateStr) return '';
      try {
        const date = parseISO(dateStr);
        return format(date, 'dd-MMM-yyyy');
      } catch {
        return dateStr;
      }
    };

    const startFormatted = formatDateForFilename(dateRange.start);
    const endFormatted = formatDateForFilename(dateRange.end);

    let dateRangeString = '';
    if (startFormatted && endFormatted) {
      if (dateRange.start === dateRange.end) {
        dateRangeString = startFormatted;
      } else {
        dateRangeString = `${startFormatted} to ${endFormatted}`;
      }
    } else if (startFormatted) {
      dateRangeString = `from ${startFormatted}`;
    } else if (endFormatted) {
      dateRangeString = `until ${endFormatted}`;
    }

    // Store original title
    const originalTitle = document.title;

    // Set new title with date range
    if (dateRangeString) {
      document.title = `Daily Programme - ${dateRangeString}`;
    } else {
      document.title = 'Daily Programme';
    }

    // Restore original title after print dialog closes
    const handleAfterPrint = () => {
      document.title = originalTitle;
      window.removeEventListener('afterprint', handleAfterPrint);
    };
    window.addEventListener('afterprint', handleAfterPrint);

    // Fallback: restore title after 5 seconds if afterprint doesn't fire
    setTimeout(() => {
      document.title = originalTitle;
    }, 5000);

    window.print();
  };

  const handleResetRange = () => {
    setDateRange(getDefaultDateRange());
  };

  const handleDateRangeChange = (start: string, end: string) => {
    setDateRange({ start, end });
  };

  const handleAttendanceChange = async (item: ProgrammeItem, attended: boolean | null) => {
    try {
      const response = await fetch(`/api/daily-programme/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attended }),
      });

      if (response.ok) {
        toast.success(t('dailyProgramme.attendanceUpdatedSuccess'));
        await loadItems();

        // If not attended, prompt for beneficiary task creation
        if (attended === false) {
          setProgrammeItemForTask(item);
          setBeneficiaryTaskDialogOpen(true);
        }
      } else {
        toast.error(t('dailyProgramme.failedToUpdateAttendance'));
      }
    } catch (error) {
      console.error('Error updating attendance:', error);
      toast.error(t('dailyProgramme.failedToUpdateAttendance'));
    }
  };

  const handleCreateBeneficiaryTask = async () => {
    if (!programmeItemForTask || !voterEpicNumber.trim()) {
      toast.error('Please enter voter EPIC number');
      return;
    }

    try {
      setIsCreatingTask(true);
      const response = await fetch('/api/daily-programme/create-beneficiary-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          programmeItemId: programmeItemForTask.id,
          voterEpicNumber: voterEpicNumber.trim(),
          voterName: voterName.trim() || undefined,
          programmeTitle: programmeItemForTask.title,
          programmeDate: programmeItemForTask.date,
        }),
      });

      if (response.ok) {
        toast.success('Beneficiary task for token of gratitude created successfully');
        setBeneficiaryTaskDialogOpen(false);
        setProgrammeItemForTask(null);
        setVoterEpicNumber('');
        setVoterName('');
      } else {
        const errorData = await response.json().catch(() => ({}));
        toast.error(errorData.error || 'Failed to create beneficiary task');
      }
    } catch (error) {
      console.error('Error creating beneficiary task:', error);
      toast.error('Failed to create beneficiary task');
    } finally {
      setIsCreatingTask(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <ModulePageHeader
        title={t('dailyProgramme.title')}
        description={t('dailyProgramme.description')}
      />

      <div className="space-y-6">
        <Card className="no-print" id="programme-form">
          <CardHeader>
            <CardTitle>{editingId ? t('dailyProgramme.editProgramme') : t('dailyProgramme.createDailyProgramme')}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid gap-3 md:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="date">{t('dailyProgramme.date')}</Label>
                <Input
                  id="date"
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="startTime">{t('dailyProgramme.startTime')}</Label>
                <TimePicker
                  id="startTime"
                  value={form.startTime || undefined}
                  onChange={(value) => setForm({ ...form, startTime: value })}
                  placeholder={t('dailyProgramme.selectTime')}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="duration">{t('dailyProgramme.duration')}</Label>
                <Select
                  value={form.duration || undefined}
                  onValueChange={(value) => setForm({ ...form, duration: value })}
                >
                  <SelectTrigger id="duration">
                    <SelectValue placeholder={t('dailyProgramme.selectDuration')} />
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
                <Label htmlFor="title">{t('dailyProgramme.programmeTitle')}</Label>
                <Input
                  id="title"
                  placeholder={t('dailyProgramme.titlePlaceholder')}
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="location">{t('dailyProgramme.location')}</Label>
                <Input
                  id="location"
                  placeholder={t('dailyProgramme.locationPlaceholder')}
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="remarks">{t('dailyProgramme.remarks')}</Label>
                <Textarea
                  id="remarks"
                  placeholder={t('dailyProgramme.remarksPlaceholder')}
                  value={form.remarks}
                  onChange={(e) => setForm({ ...form, remarks: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="md:col-span-4 flex justify-end gap-2">
                {editingId && (
                  <Button type="button" variant="outline" onClick={handleCancelEdit}>
                    {t('dailyProgramme.cancel')}
                  </Button>
                )}
                <Button type="submit">{editingId ? t('dailyProgramme.updateProgramme') : t('dailyProgramme.addToProgramme')}</Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="no-print">
            <div className="flex items-center justify-between">
              <CardTitle>{t('dailyProgramme.programmeRegister')}</CardTitle>
              <div className="flex items-center gap-4">
                {loading ? (
                  <Skeleton className="h-5 w-32" />
                ) : (
                  <span className="text-sm text-muted-foreground">
                    {t('dailyProgramme.total')}: {allItems.length} | {t('dailyProgramme.dates')}: {filteredDateEntries.length}
                  </span>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                <div className="space-y-4 mb-4 pb-4 border-b">
                  <Skeleton className="h-10 w-full max-w-md" />
                </div>
                <div className="space-y-4">
                  {[1, 2].map((i) => (
                    <div key={i} className="space-y-2">
                      <Skeleton className="h-5 w-40" />
                      <div className="border rounded-lg overflow-hidden">
                        <div className="flex gap-4 p-3 border-b bg-muted/50">
                          {[1, 2, 3, 4, 5].map((j) => (
                            <Skeleton key={j} className="h-4 w-20" />
                          ))}
                        </div>
                        {[1, 2].map((j) => (
                          <div key={j} className="flex gap-4 p-3 border-b">
                            {[1, 2, 3, 4, 5].map((k) => (
                              <Skeleton key={k} className="h-4 w-20" />
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {/* Date Range Filter - Hidden when printing */}
                <div className="space-y-4 mb-4 pb-4 border-b no-print">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="font-semibold text-lg">{dateRangeLabel}</div>
                        <div className="text-xs text-muted-foreground">
                          {t('dailyProgramme.showingEvents')
                            .replace('{count}', allItems.length.toString())
                            .replace('{plural}', allItems.length !== 1 ? 's' : '')
                            .replace('{dateCount}', filteredDateEntries.length.toString())
                            .replace('{datePlural}', filteredDateEntries.length !== 1 ? 's' : '')}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" size="sm" onClick={handleResetRange}>
                        {t('dailyProgramme.resetRange')}
                      </Button>
                      <Button variant="outline" size="sm" onClick={handlePrint}>
                        <Printer className="mr-2 h-4 w-4" />
                        {t('dailyProgramme.printProgramme')}
                      </Button>
                    </div>
                  </div>
                  <div className="max-w-md">
                    <DateRangePicker
                      startDate={dateRange.start}
                      endDate={dateRange.end}
                      onDateRangeChange={handleDateRangeChange}
                    />
                  </div>
                </div>

                {/* Events Table - Printable Section */}
                <div className="print-schedule">
                  {/* Print Header - Only visible when printing */}
                  <div className="print-header hidden">
                    <h1 className="text-2xl font-semibold">{t('dailyProgramme.mlaName')}</h1>
                    <h2 className="text-lg font-bold mt-2">{t('dailyProgramme.printHeaderTitle')}</h2>
                    <p className="mt-1">{dateRangeLabel}</p>
                  </div>

                  {filteredDateEntries.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>{t('dailyProgramme.noProgrammes')}</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {filteredDateEntries.map(([dateKey, items]) => {
                        const date = parseISO(dateKey);
                        return (
                          <div key={dateKey} className="space-y-3 print-date-section">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-2 font-semibold">
                                <Calendar className="h-4 w-4" />
                                {format(date, 'EEEE, dd MMM yyyy')}
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {items.length} {items.length !== 1 ? t('dailyProgramme.events') : t('dailyProgramme.event')}
                              </span>
                            </div>
                            <div className="overflow-x-auto print-table-wrapper">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead className="w-[60px] text-center">{t('dailyProgramme.serialNo')}</TableHead>
                                    <TableHead className="w-[280px]">{t('dailyProgramme.timeAndLocation')}</TableHead>
                                    <TableHead className="w-[450px]">{t('dailyProgramme.titleAndRemarks')}</TableHead>
                                    <TableHead className="w-[150px] no-print">{t('dailyProgramme.attendance')}</TableHead>
                                    <TableHead className="w-[100px] no-print">{t('dailyProgramme.actions')}</TableHead>
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
                                    .map((item, index) => {
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
                                          <TableCell className="w-[60px] text-center font-medium">
                                            {index + 1}
                                          </TableCell>
                                          <TableCell className="w-[280px]">
                                            <div className="space-y-1">
                                              <div className="font-mono font-semibold">
                                                {formatTimeTo12Hour(item.startTime)}
                                                {durationLabel && (
                                                  <span className="text-xs font-normal text-muted-foreground ml-1">
                                                    ({durationLabel})
                                                  </span>
                                                )}
                                              </div>
                                              <div className="text-sm text-muted-foreground">
                                                {item.location}
                                              </div>
                                            </div>
                                          </TableCell>
                                          <TableCell className="w-[450px]">
                                            <div className="space-y-1">
                                              <div className="font-medium">
                                                {item.title}
                                              </div>
                                              {item.remarks && (
                                                <div className="text-sm text-muted-foreground">
                                                  {item.remarks}
                                                </div>
                                              )}
                                            </div>
                                          </TableCell>
                                          <TableCell className="w-[150px] no-print">
                                            <Select
                                              value={
                                                item.attended == null
                                                  ? 'not_set'
                                                  : item.attended
                                                    ? 'attended'
                                                    : 'not_attended'
                                              }
                                              onValueChange={(value) => {
                                                const newValue =
                                                  value === 'not_set'
                                                    ? null
                                                    : value === 'attended';
                                                handleAttendanceChange(item, newValue);
                                              }}
                                            >
                                              <SelectTrigger className="h-8 w-full">
                                                <SelectValue />
                                              </SelectTrigger>
                                              <SelectContent>
                                                <SelectItem value="not_set">
                                                  <div className="flex items-center gap-2">
                                                    <Clock className="h-4 w-4 text-muted-foreground" />
                                                    <span>Not Set</span>
                                                  </div>
                                                </SelectItem>
                                                <SelectItem value="attended">
                                                  <div className="flex items-center gap-2">
                                                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                                                    <span>Attended</span>
                                                  </div>
                                                </SelectItem>
                                                <SelectItem value="not_attended">
                                                  <div className="flex items-center gap-2">
                                                    <XCircle className="h-4 w-4 text-red-600" />
                                                    <span>Not Attended</span>
                                                  </div>
                                                </SelectItem>
                                              </SelectContent>
                                            </Select>
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
              </>
            )}
          </CardContent>
        </Card>

      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title={t('dailyProgramme.deleteProgrammeItem')}
        description={t('dailyProgramme.deleteProgrammeDescription')}
        confirmText={t('dailyProgramme.delete')}
        cancelText={t('dailyProgramme.cancel')}
        variant="destructive"
        onConfirm={confirmDelete}
      />

      {/* Beneficiary Task Creation Dialog */}
      <Dialog open={beneficiaryTaskDialogOpen} onOpenChange={setBeneficiaryTaskDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Beneficiary Task - Token of Gratitude</DialogTitle>
            <DialogDescription>
              The programme item &quot;{programmeItemForTask?.title}&quot; was marked as not attended.
              Please provide voter details to create a beneficiary task for token of gratitude.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="voterEpicNumber">Voter EPIC Number *</Label>
              <Input
                id="voterEpicNumber"
                placeholder="Enter EPIC number"
                value={voterEpicNumber}
                onChange={(e) => setVoterEpicNumber(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="voterName">Voter Name (Optional)</Label>
              <Input
                id="voterName"
                placeholder="Enter voter name"
                value={voterName}
                onChange={(e) => setVoterName(e.target.value)}
              />
            </div>
            {programmeItemForTask && (
              <div className="rounded-lg bg-muted p-3 text-sm">
                <div className="font-medium">Programme Details:</div>
                <div className="mt-1 text-muted-foreground">
                  <div>Title: {programmeItemForTask.title}</div>
                  <div>Date: {(() => {
                    const normalizedDate = programmeItemForTask.date ? normalizeDate(programmeItemForTask.date) : null;
                    return normalizedDate ? format(parseISO(normalizedDate), 'dd MMM yyyy') : 'N/A';
                  })()}</div>
                  <div>Location: {programmeItemForTask.location}</div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setBeneficiaryTaskDialogOpen(false);
                setProgrammeItemForTask(null);
                setVoterEpicNumber('');
                setVoterName('');
              }}
              disabled={isCreatingTask}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleCreateBeneficiaryTask}
              disabled={isCreatingTask || !voterEpicNumber.trim()}
            >
              {isCreatingTask ? 'Creating...' : 'Create Task'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

