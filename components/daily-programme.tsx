'use client';

import { useState, useEffect, useMemo, useCallback, useRef, type CSSProperties } from 'react';
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
import { Printer, Calendar, Pencil, CheckCircle2, XCircle, Clock, Paperclip, ChevronDown, ChevronUp } from 'lucide-react';
import { format, parseISO, startOfToday } from 'date-fns';
import { enIN } from 'date-fns/locale';
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
import { exportElementToPdf } from '@/lib/pdf/export-element-to-pdf';
import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { DailyProgrammeAttachmentDialog } from '@/components/daily-programme-attachment-dialog';
import type { DailyProgrammeAttachment } from '@/components/daily-programme-attachment-dialog';

interface ProgrammeItem {
  id: string;
  date: string | Date | null;
  startDate?: string | Date | null;
  endDate?: string | Date | null;
  startTime: string;
  endTime?: string | null;
  title: string;
  location: string;
  remarks?: string | null;
  attended?: boolean | null;
  programmeType?: 'CONSTITUENCY' | 'OUTSIDE_CONSTITUENCY' | null;
  sortOrder?: number | null;
  createdBy?: string | null;
  updatedBy?: string | null;
  createdByUserId?: string | null;
  updatedByUserId?: string | null;
  /** Filled by list API / SSR; refreshed after attachment uploads or deletes. */
  attachments?: DailyProgrammeAttachment[];
}

interface DailyProgrammeProps {
  userRole: string;
  initialItems?: ProgrammeItem[];
  initialDateRange?: { start: string; end: string };
}

// Generate duration options in minutes with localization
function generateDurationOptions(
  t: (key: string) => string,
): Array<{ value: string; label: string }> {
  const options: Array<{ value: string; label: string }> = [];
  // Common durations: 15, 30, 45, 60, 90, 120, 180, 240 minutes
  const durations = [15, 30, 45, 60, 90, 120, 180, 240];

  durations.forEach((minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    let label: string;
    if (hours === 0) {
      label = `${minutes} ${t('dailyProgramme.min')}`;
    } else if (mins === 0) {
      label = hours === 1
        ? `1 ${t('dailyProgramme.hour')}`
        : `${hours} ${t('dailyProgramme.hours')}`;
    } else {
      label = `${hours}${t('dailyProgramme.hourShort')} ${mins}${t('dailyProgramme.minShort')}`;
    }
    options.push({ value: minutes.toString(), label });
  });

  return options;
}

function parseTimeToMinutes(time?: string | null): number | null {
  if (!time) return null;
  const match = /^(\d{2}):(\d{2})$/.exec(time);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  if (hours < 0 || hours > 23) return null;
  if (minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
}

// Calculate duration in minutes from start and end time (same clock time = full 24 hours)
function calculateDuration(
  startTime?: string | null,
  endTime?: string | null,
): number | null {
  if (!startTime || !endTime) return null;

  const startTotalMinutes = parseTimeToMinutes(startTime);
  const endTotalMinutes = parseTimeToMinutes(endTime);
  if (startTotalMinutes === null || endTotalMinutes === null) return null;

  if (startTotalMinutes === endTotalMinutes) {
    return 24 * 60;
  }

  return endTotalMinutes - startTotalMinutes;
}

// Convert 24-hour time to 12-hour format with localized AM/PM
function formatTimeTo12Hour(time24: string, locale: 'en' | 'mr'): string {
  if (!time24) return '';

  const [hours, minutes] = time24.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);

  // Use Intl.DateTimeFormat to get localized time format
  // Force Devanagari digits for Marathi to keep UI consistent across browsers (notably Safari).
  const formatter = new Intl.DateTimeFormat(locale === 'mr' ? 'mr-IN-u-nu-deva' : 'en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  return formatter.format(date);
}

function getDefaultDateRange() {
  const today = startOfToday();
  const todayFormatted = format(today, 'yyyy-MM-dd');
  return {
    start: todayFormatted,
    end: todayFormatted,
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

function getProgrammeTypeLabel(
  value: 'CONSTITUENCY' | 'OUTSIDE_CONSTITUENCY',
  t: (key: string) => string,
) {
  return value === 'CONSTITUENCY'
    ? t('dailyProgramme.constituency')
    : t('dailyProgramme.outsideConstituency');
}

function eachDateInclusive(start: string, end: string): string[] {
  const result: string[] = [];
  const s = parseISO(start);
  const e = parseISO(end);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return result;
  const cur = new Date(s);
  while (cur.getTime() <= e.getTime()) {
    result.push(format(cur, 'yyyy-MM-dd'));
    cur.setDate(cur.getDate() + 1);
  }
  return result;
}

// DURATION_OPTIONS will be generated inside component with access to translations

// Helper function to format dates with locale support
function formatDateWithLocale(date: Date, formatStr: string, locale: 'en' | 'mr'): string {
  if (locale === 'mr') {
    // Use Intl API for Marathi since date-fns doesn't have mr locale
    if (formatStr === 'EEEE, dd MMM yyyy') {
      const formatter = new Intl.DateTimeFormat('mr-IN', {
        weekday: 'long',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
      return formatter.format(date);
    } else if (formatStr === 'dd MMM yyyy') {
      const formatter = new Intl.DateTimeFormat('mr-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
      return formatter.format(date);
    } else {
      // Fallback to default format
      const formatter = new Intl.DateTimeFormat('mr-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
      return formatter.format(date);
    }
  } else {
    // Use date-fns for English
    return format(date, formatStr, { locale: enIN });
  }
}

function formatDateForPdfRange(dateStr?: string | null): string | null {
  if (!dateStr) return null;
  try {
    const date = parseISO(dateStr);
    if (Number.isNaN(date.getTime())) return null;
    // Screenshot uses English months even with Marathi header.
    const formatter = new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
    return formatter.format(date);
  } catch {
    return null;
  }
}

function formatTimePartsForPdf(time24: string, locale: 'en' | 'mr'): { time: string; period: string } {
  const [hours, minutes] = time24.split(':').map(Number);
  const date = new Date();
  date.setHours(hours ?? 0, minutes ?? 0, 0, 0);
  // Force Devanagari digits for Marathi in Safari and some OS locale configs.
  const intlLocale = locale === 'mr' ? 'mr-IN-u-nu-deva' : 'en-IN';

  try {
    const parts = new Intl.DateTimeFormat(intlLocale, {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).formatToParts(date);

    const hour = parts.find((p) => p.type === 'hour')?.value ?? '';
    const minute = parts.find((p) => p.type === 'minute')?.value ?? '';
    const time = `${hour}:${minute}`;
    const dayPeriod = parts.find((p) => p.type === 'dayPeriod')?.value ?? '';
    const period = locale === 'mr' ? dayPeriod : dayPeriod.toUpperCase();
    return { time, period };
  } catch {
    // Fallback for browsers/locale data that don't support formatToParts for mr.
    const formatted = new Intl.DateTimeFormat(intlLocale, {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(date);
    const parts = formatted.trim().split(/\s+/);
    if (parts.length >= 2) {
      const period = locale === 'mr' ? parts.slice(1).join(' ') : parts.slice(1).join(' ').toUpperCase();
      return { time: parts[0] ?? '', period };
    }
    return { time: formatted, period: '' };
  }
}

function SortableProgrammeRow({
  item,
  index,
  locale,
  t,
  DURATION_OPTIONS,
  onOpenAttachmentDialog,
  onAttendanceChange,
  onEdit,
  onDelete,
  enableReorder,
}: {
  item: ProgrammeItem;
  index: number;
  locale: 'en' | 'mr';
  t: (key: string) => string;
  DURATION_OPTIONS: Array<{ value: string; label: string }>;
  onOpenAttachmentDialog: (item: ProgrammeItem) => void;
  onAttendanceChange: (item: ProgrammeItem, attended: boolean | null) => void;
  onEdit: (item: ProgrammeItem) => void;
  onDelete: (id: string) => void;
  enableReorder: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    disabled: !enableReorder,
  });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.75 : undefined,
  };

  const serialNumber = (index + 1).toLocaleString(locale === 'mr' ? 'mr-IN' : 'en-IN');

  return (
    <TableRow ref={setNodeRef} style={style}>
      <TableCell className="w-[60px] text-center font-medium" data-label={t('dailyProgramme.serialNo')}>
        {serialNumber}
      </TableCell>
      <TableCell className="w-[150px]" data-label={t('dailyProgramme.time')}>
        <div className="font-mono font-semibold">
          {formatTimeTo12Hour(item.startTime, locale)}
          {item.endTime
            ? ` – ${formatTimeTo12Hour(item.endTime, locale)}`
            : null}
        </div>
        {item.programmeType && (
          <div className="text-xs text-muted-foreground mt-1">
            {getProgrammeTypeLabel(item.programmeType, t)}
          </div>
        )}
      </TableCell>
      <TableCell className="w-[400px]" data-label={t('dailyProgramme.programmeNatureAndPlace')}>
        <div className="space-y-1">
          <div className="font-medium flex items-start gap-2">
            {enableReorder && (
              <span
                className="no-print inline-flex items-center justify-center rounded border px-1.5 py-1 text-muted-foreground cursor-grab active:cursor-grabbing"
                title={t('dailyProgramme.dragToReorder')}
                {...attributes}
                {...listeners}
              >
                ≡
              </span>
            )}
            <span>{item.title}</span>
          </div>
          {item.location && (
            <div className="text-muted-foreground">
              📍 {item.location}
            </div>
          )}
        </div>
      </TableCell>
      <TableCell className="w-[300px]" data-label={t('dailyProgramme.reference')}>
        {item.remarks ? (
          <div className="text-sm">
            {item.remarks}
          </div>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
        <div className="text-xs text-muted-foreground mt-1 no-print">
          {item.createdByUserId && (
            <span>{t('dailyProgramme.createdBy')}: {item.createdByUserId}</span>
          )}
          {item.updatedByUserId && item.updatedByUserId !== item.createdByUserId && (
            <span className="ml-2">{t('dailyProgramme.updatedBy')}: {item.updatedByUserId}</span>
          )}
        </div>
      </TableCell>
      <TableCell className="w-[80px] no-print text-center" data-label={t('dailyProgramme.docs')}>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2"
          onClick={() => onOpenAttachmentDialog(item)}
          title={t('dailyProgramme.manageReferenceDocuments')}
        >
          <Paperclip className="size-4" />
          {(item.attachments?.length ?? 0) > 0 && (
            <span className="ml-1 text-xs bg-primary text-primary-foreground rounded-full px-1.5 py-0.5 min-w-5">
              {item.attachments?.length}
            </span>
          )}
        </Button>
      </TableCell>
      <TableCell className="w-[150px] no-print" data-label={t('dailyProgramme.attendance')}>
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
            onAttendanceChange(item, newValue);
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="not_set">
              <div className="flex items-center gap-2">
                <Clock className="size-4 text-muted-foreground" />
                <span>{t('dailyProgramme.attendanceNotSet')}</span>
              </div>
            </SelectItem>
            <SelectItem value="attended">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-green-600" />
                <span>{t('dailyProgramme.attendanceAttended')}</span>
              </div>
            </SelectItem>
            <SelectItem value="not_attended">
              <div className="flex items-center gap-2">
                <XCircle className="size-4 text-red-600" />
                <span>{t('dailyProgramme.attendanceNotAttended')}</span>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell className="w-[100px] no-print" data-label={t('dailyProgramme.actions')}>
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onEdit(item)}
            className="h-8 px-2"
          >
            <Pencil className="size-3" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onDelete(item.id)}
            className="h-8 px-2 text-destructive hover:text-destructive"
          >
            ×
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

export function DailyProgramme({
  userRole,
  initialItems = [],
  initialDateRange,
}: DailyProgrammeProps) {
  const { t, locale } = useTranslations();
  const pdfHostRef = useRef<HTMLDivElement | null>(null);

  // Generate duration options with localization
  const DURATION_OPTIONS = useMemo(
    () => {
      try {
        return generateDurationOptions(t);
      } catch (error) {
        console.error('Error generating duration options:', error);
        return [];
      }
    },
    [t],
  ) || [];

  const [allItems, setAllItems] = useState<ProgrammeItem[]>(initialItems);
  const [loading, setLoading] = useState(initialItems.length === 0);
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>(() =>
    initialDateRange || getDefaultDateRange(),
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    startDate: format(new Date(), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
    startTime: '',
    endTime: '',
    title: '',
    location: '',
    remarks: '',
    programmeType: 'CONSTITUENCY' as 'CONSTITUENCY' | 'OUTSIDE_CONSTITUENCY',
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

  // Create form card collapsed state (expand when editing)
  const [formCardOpen, setFormCardOpen] = useState(false);

  // Expand form when editing an item
  useEffect(() => {
    if (editingId) setFormCardOpen(true);
  }, [editingId]);

  // Attachment dialog
  const [attachmentDialogOpen, setAttachmentDialogOpen] = useState(false);
  const [selectedProgrammeForAttachment, setSelectedProgrammeForAttachment] = useState<ProgrammeItem | null>(null);
  const [attachments, setAttachments] = useState<DailyProgrammeAttachment[]>([]);

  const [programmeTypeFilter, setProgrammeTypeFilter] = useState<
    'ALL' | 'CONSTITUENCY' | 'OUTSIDE_CONSTITUENCY'
  >('ALL');

  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const expandedItems = useMemo(() => {
    const result: ProgrammeItem[] = [];
    for (const item of allItems) {
      const programmeType = item.programmeType ?? 'CONSTITUENCY';
      const start = normalizeDate(item.startDate ?? null);
      const end = normalizeDate(item.endDate ?? null);
      if (start && end && start <= end) {
        for (const d of eachDateInclusive(start, end)) {
          result.push({ ...item, programmeType, date: d });
        }
      } else {
        result.push({ ...item, programmeType });
      }
    }
    return result;
  }, [allItems]);

  // Group items by date (after expanding date ranges + programme type filtering)
  const itemsByDate = useMemo(() => {
    const grouped: Record<string, ProgrammeItem[]> = {};
    expandedItems
      .filter((item) => {
        if (programmeTypeFilter === 'ALL') return true;
        return (item.programmeType ?? 'CONSTITUENCY') === programmeTypeFilter;
      })
      .forEach((item) => {
        if (item.date) {
          const dateKey = normalizeDate(item.date);
          if (dateKey) {
            if (!grouped[dateKey]) grouped[dateKey] = [];
            grouped[dateKey].push(item);
          }
        }
      });
    return grouped;
  }, [expandedItems, programmeTypeFilter]);

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


        // Filter out items with null or undefined dates
        const validItems = data
          .filter((item: ProgrammeItem) => {
            const hasDate = item.date != null;
            if (!hasDate) {
              console.warn('Item missing date:', item);
            }
            return hasDate;
          })
          .map((item: ProgrammeItem & { attachments?: DailyProgrammeAttachment[] }) => ({
            ...item,
            attachments: Array.isArray(item.attachments) ? item.attachments : [],
          }));
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
        const date = parseISO(value);
        return formatDateWithLocale(date, 'dd MMM yyyy', locale);
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
      return t('dailyProgramme.fromDate').replace('{date}', startLabel);
    }
    if (endLabel) {
      return t('dailyProgramme.untilDate').replace('{date}', endLabel);
    }
    return t('dailyProgramme.allScheduledDates');
  }, [dateRange.start, dateRange.end, locale, t]);

  const isProgrammeFormComplete = useMemo(
    () =>
      Boolean(
        form.startDate &&
        form.endDate &&
        form.startTime.trim() &&
        form.title.trim() &&
        form.location.trim(),
      ),
    [form.endDate, form.startDate, form.startTime, form.title, form.location],
  );

  useEffect(() => {
    // Only load if we don't have initial items or if date range changed from initial
    if (initialItems.length === 0 ||
      (initialDateRange &&
        (dateRange.start !== initialDateRange.start || dateRange.end !== initialDateRange.end))) {
      loadItems();
    }
  }, [loadItems, initialItems.length, initialDateRange, dateRange.start, dateRange.end]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const effectiveDate = form.startDate;
    if (!effectiveDate || !form.startTime || !form.title || !form.location) return;

    const startMinutes = parseTimeToMinutes(form.startTime);
    const trimmedEnd = form.endTime.trim();
    const endMinutes = trimmedEnd ? parseTimeToMinutes(trimmedEnd) : null;
    if (startMinutes === null || (trimmedEnd && endMinutes === null)) {
      toast.error(t('dailyProgramme.invalidTime'));
      return;
    }
    if (endMinutes !== null && endMinutes < startMinutes) {
      toast.error(t('dailyProgramme.endTimeMustBeAfterStartTime'));
      return;
    }

    try {
      const endTime = trimmedEnd ? trimmedEnd : undefined;

      if (editingId) {
        // Update existing item
        const response = await fetch(`/api/daily-programme/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            date: effectiveDate,
            startTime: form.startTime,
            endTime,
            title: form.title,
            location: form.location,
            remarks: form.remarks,
            programmeType: form.programmeType,
            startDate: form.startDate,
            endDate: form.endDate,
          }),
        });

        if (response.ok) {
          toast.success(t('dailyProgramme.programmeItemUpdatedSuccess'));
          await loadItems();
          setEditingId(null);
          setForm({
            date: format(new Date(), 'yyyy-MM-dd'),
            startDate: format(new Date(), 'yyyy-MM-dd'),
            endDate: format(new Date(), 'yyyy-MM-dd'),
            startTime: '',
            endTime: '',
            title: '',
            location: '',
            remarks: '',
            programmeType: 'CONSTITUENCY',
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
            date: effectiveDate,
            startTime: form.startTime,
            endTime,
            title: form.title,
            location: form.location,
            remarks: form.remarks,
            programmeType: form.programmeType,
            startDate: form.startDate,
            endDate: form.endDate,
          }),
        });

        if (response.ok) {
          toast.success(t('dailyProgramme.programmeItemAddedSuccess'));
          await loadItems();

          setForm({
            date: format(new Date(), 'yyyy-MM-dd'),
            startDate: format(new Date(), 'yyyy-MM-dd'),
            endDate: format(new Date(), 'yyyy-MM-dd'),
            startTime: '',
            endTime: '',
            title: '',
            location: '',
            remarks: '',
            programmeType: 'CONSTITUENCY',
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
    setEditingId(item.id);
    const normalizedDate = normalizeDate(item.date) || format(new Date(), 'yyyy-MM-dd');
    const normalizedStartDate = normalizeDate(item.startDate ?? null);
    const normalizedEndDate = normalizeDate(item.endDate ?? null);
    const isRange = Boolean(
      normalizedStartDate &&
      normalizedEndDate &&
      normalizedStartDate <= normalizedEndDate &&
      (normalizedStartDate !== normalizedEndDate),
    );
    setForm({
      date: normalizedDate,
      startDate: normalizedStartDate || normalizedDate,
      endDate: normalizedEndDate || normalizedDate,
      startTime: item.startTime,
      endTime: item.endTime ?? '',
      title: item.title,
      location: item.location,
      remarks: item.remarks || '',
      programmeType: (item.programmeType ?? 'CONSTITUENCY') as 'CONSTITUENCY' | 'OUTSIDE_CONSTITUENCY',
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
      startDate: format(new Date(), 'yyyy-MM-dd'),
      endDate: format(new Date(), 'yyyy-MM-dd'),
      startTime: '',
      endTime: '',
      title: '',
      location: '',
      remarks: '',
      programmeType: 'CONSTITUENCY',
    });
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const persistReorder = useCallback(
    async (items: ProgrammeItem[]) => {
      const payload = items.map((it, idx) => ({ id: it.id, sortOrder: idx + 1 }));
      try {
        const res = await fetch('/api/daily-programme/reorder', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: payload }),
        });
        if (!res.ok) throw new Error('Failed');
      } catch (e) {
        console.error('Failed persisting reorder', e);
        toast.error(t('dailyProgramme.failedToReorder'));
        await loadItems();
      }
    },
    [loadItems, t],
  );

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

  const handleExportPdf = async () => {
    if (isExportingPdf) return;

    const target = (pdfHostRef.current?.querySelector('.pdf-daily-programme') ?? null) as HTMLElement | null;
    if (!target) {
      toast.error('Unable to export: schedule section not found.');
      return;
    }

    const headerDateRange = (() => {
      const startLabel = formatDateForPdfRange(dateRange.start);
      const endLabel = formatDateForPdfRange(dateRange.end);
      if (startLabel && endLabel) return `${startLabel} – ${endLabel}`;
      if (startLabel) return startLabel;
      if (endLabel) return endLabel;
      return '';
    })();

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
      dateRangeString = dateRange.start === dateRange.end
        ? startFormatted
        : `${startFormatted}_to_${endFormatted}`;
    } else if (startFormatted) {
      dateRangeString = `from_${startFormatted}`;
    } else if (endFormatted) {
      dateRangeString = `until_${endFormatted}`;
    }

    const fileName = dateRangeString
      ? `${t('dailyProgramme.title')}-${dateRangeString}`
      : t('dailyProgramme.title');

    setIsExportingPdf(true);
    try {
      await exportElementToPdf({
        element: target,
        fileName,
        format: 'a4',
        orientation: 'portrait',
        marginMm: 10,
        header: {
          lines: [t('dailyProgramme.mlaName'), t('dailyProgramme.printHeaderTitle'), headerDateRange].filter(Boolean),
          heightMm: 30,
          drawRule: true,
        },
        footer: { heightMm: 12, showPageNumbers: true },
        scale: 2,
      });
      toast.success('PDF downloaded');
    } catch (error) {
      console.error('Failed exporting PDF', error);
      toast.error('Failed to export PDF. Please try a smaller date range.');
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleResetRange = () => {
    const next = getDefaultDateRange();
    setDateRange(next);
    // Always refetch: the load effect skips when range matches initialDateRange with SSR items,
    // but allItems may still reflect a previously selected range.
    void loadItems(next.start, next.end);
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
      toast.error(t('dailyProgramme.pleaseEnterVoterEpicNumber'));
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
        toast.success(t('dailyProgramme.beneficiaryTaskCreatedSuccess'));
        setBeneficiaryTaskDialogOpen(false);
        setProgrammeItemForTask(null);
        setVoterEpicNumber('');
        setVoterName('');
      } else {
        const errorData = await response.json().catch(() => ({}));
        toast.error(errorData.error || t('dailyProgramme.failedToCreateBeneficiaryTask'));
      }
    } catch (error) {
      console.error('Error creating beneficiary task:', error);
      toast.error(t('dailyProgramme.failedToCreateBeneficiaryTask'));
    } finally {
      setIsCreatingTask(false);
    }
  };

  const handleOpenAttachmentDialog = (item: ProgrammeItem) => {
    setSelectedProgrammeForAttachment(item);
    setAttachments(item.attachments ?? []);
    setAttachmentDialogOpen(true);
  };

  const handleAttachmentsChange = async () => {
    if (!selectedProgrammeForAttachment) return;
    const programmeId = selectedProgrammeForAttachment.id;
    try {
      const response = await fetch(`/api/daily-programme/${programmeId}/attachments`);
      if (response.ok) {
        const data: DailyProgrammeAttachment[] = await response.json();
        setAttachments(data);
        setAllItems((prev) =>
          prev.map((it) => (it.id === programmeId ? { ...it, attachments: data } : it)),
        );
      }
    } catch (error) {
      console.error('Error refreshing attachments:', error);
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
          <CardHeader
            className="cursor-pointer select-none hover:bg-muted/50 transition-colors rounded-t-lg"
            onClick={() => setFormCardOpen((open) => !open)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setFormCardOpen((open) => !open);
              }
            }}
            role="button"
            tabIndex={0}
            aria-expanded={formCardOpen}
            aria-controls="programme-form-content"
            id="programme-form-header"
          >
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-base sm:text-lg">
                {editingId ? t('dailyProgramme.editProgramme') : t('dailyProgramme.createDailyProgramme')}
              </CardTitle>
              {formCardOpen ? (
                <ChevronUp className="size-5 shrink-0 text-muted-foreground" aria-hidden />
              ) : (
                <ChevronDown className="size-5 shrink-0 text-muted-foreground" aria-hidden />
              )}
            </div>
          </CardHeader>
          {formCardOpen && (
            <CardContent id="programme-form-content" aria-labelledby="programme-form-header">
              <form onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate">{t('dailyProgramme.startDate')}</Label>
                  <Input
                    id="startDate"
                    type="date"
                    className="min-h-11"
                    value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value, date: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">{t('dailyProgramme.endDate')}</Label>
                  <Input
                    id="endDate"
                    type="date"
                    className="min-h-11"
                    value={form.endDate}
                    onChange={(e) => setForm({ ...form, endDate: e.target.value })}
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
                    className="min-h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endTime">{t('dailyProgramme.endTime')}</Label>
                  <TimePicker
                    id="endTime"
                    value={form.endTime || undefined}
                    onChange={(value) => setForm({ ...form, endTime: value })}
                    placeholder={t('dailyProgramme.selectTime')}
                    className="min-h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="programmeType">{t('dailyProgramme.programmeType')}</Label>
                  <Select
                    value={form.programmeType}
                    onValueChange={(value) => setForm({ ...form, programmeType: value as 'CONSTITUENCY' | 'OUTSIDE_CONSTITUENCY' })}
                  >
                    <SelectTrigger id="programmeType" className="min-h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CONSTITUENCY">{t('dailyProgramme.constituency')}</SelectItem>
                      <SelectItem value="OUTSIDE_CONSTITUENCY">{t('dailyProgramme.outsideConstituency')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 md:col-span-1">
                  <Label htmlFor="title">{t('dailyProgramme.programmeTitle')}</Label>
                  <Input
                    id="title"
                    placeholder={t('dailyProgramme.titlePlaceholder')}
                    className="min-h-11"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2 sm:col-span-2 md:col-span-2">
                  <Label htmlFor="location">{t('dailyProgramme.location')}</Label>
                  <Input
                    id="location"
                    placeholder={t('dailyProgramme.locationPlaceholder')}
                    className="min-h-11"
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2 sm:col-span-2 md:col-span-2">
                  <Label htmlFor="remarks">{t('dailyProgramme.remarks')}</Label>
                  <Textarea
                    id="remarks"
                    placeholder={t('dailyProgramme.remarksPlaceholder')}
                    value={form.remarks}
                    onChange={(e) => setForm({ ...form, remarks: e.target.value })}
                    rows={2}
                  />
                </div>
                <div className="sm:col-span-2 md:col-span-4 flex justify-end gap-2">
                  {editingId && (
                    <Button type="button" variant="outline" onClick={handleCancelEdit} className="min-h-11">
                      {t('dailyProgramme.cancel')}
                    </Button>
                  )}
                  <Button
                    type="submit"
                    className="min-h-11"
                    disabled={!isProgrammeFormComplete}
                  >
                    {editingId ? t('dailyProgramme.updateProgramme') : t('dailyProgramme.addToProgramme')}
                  </Button>
                </div>
              </form>
            </CardContent>
          )}
        </Card>

        <Card>
          <CardHeader className="no-print">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
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
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <Calendar className="size-4 text-muted-foreground shrink-0" />
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
                    <div className="flex flex-col gap-2 sm:flex-row w-full sm:w-auto">
                      <Button variant="outline" size="sm" onClick={handleResetRange} className="w-full sm:w-auto min-h-11">
                        {t('dailyProgramme.resetRange')}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleExportPdf}
                        disabled={isExportingPdf}
                        className="w-full sm:w-auto min-h-11"
                      >
                        <Printer className="mr-2 size-4" />
                        {isExportingPdf ? t('dailyProgramme.exporting') : t('dailyProgramme.exportProgramme')}
                      </Button>
                      {/* <Button variant="outline" size="sm" onClick={handleExport} className="w-full sm:w-auto min-h-11">
                        <FileDown className="mr-2 size-4" />
                        {t('dailyProgramme.exportProgramme')}
                      </Button> */}
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 w-full max-w-2xl">
                    <div className="w-full">
                      <Label htmlFor="dateRange">{t('dailyProgramme.dateRange')}</Label>
                      <DateRangePicker

                        startDate={dateRange.start}
                        endDate={dateRange.end}
                        onDateRangeChange={handleDateRangeChange}
                      />
                    </div>
                    <div className="w-full">
                      <Label htmlFor="programmeTypeFilter">{t('dailyProgramme.programmeFilter')}</Label>
                      <Select
                        value={programmeTypeFilter}
                        onValueChange={(value) =>
                          setProgrammeTypeFilter(value as 'ALL' | 'CONSTITUENCY' | 'OUTSIDE_CONSTITUENCY')}
                      >
                        <SelectTrigger id="programmeTypeFilter">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ALL">{t('dailyProgramme.all')}</SelectItem>
                          <SelectItem value="CONSTITUENCY">{t('dailyProgramme.constituency')}</SelectItem>
                          <SelectItem value="OUTSIDE_CONSTITUENCY">{t('dailyProgramme.outsideConstituency')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Events Table - Printable Section */}
                <div className="print-schedule">

                  {filteredDateEntries.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Calendar className="size-12 mx-auto mb-2 opacity-50" />
                      <p>{t('dailyProgramme.noProgrammes')}</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {filteredDateEntries.map(([dateKey, items]) => {
                        const date = parseISO(dateKey);
                        const formattedDate = formatDateWithLocale(date, 'EEEE, dd MMM yyyy', locale);
                        const constituencyItems = items.filter(
                          (it) => (it.programmeType ?? 'CONSTITUENCY') === 'CONSTITUENCY',
                        );
                        const outsideItems = items.filter(
                          (it) => (it.programmeType ?? 'CONSTITUENCY') === 'OUTSIDE_CONSTITUENCY',
                        );

                        const showConstituency =
                          programmeTypeFilter === 'ALL' || programmeTypeFilter === 'CONSTITUENCY';
                        const showOutside =
                          programmeTypeFilter === 'ALL' || programmeTypeFilter === 'OUTSIDE_CONSTITUENCY';

                        const sections: Array<{
                          programmeType: 'CONSTITUENCY' | 'OUTSIDE_CONSTITUENCY';
                          items: ProgrammeItem[];
                        }> = [
                          ...(showConstituency ? [{ programmeType: 'CONSTITUENCY' as const, items: constituencyItems }] : []),
                          ...(showOutside ? [{ programmeType: 'OUTSIDE_CONSTITUENCY' as const, items: outsideItems }] : []),
                        ].filter((s) => s.items.length > 0);

                        return (
                          <div key={dateKey} className="space-y-3 print-date-section">
                            <div className="flex flex-wrap items-center justify-between gap-2 print-date-header">
                              <div className="flex items-center gap-2 font-semibold">
                                <Calendar className="size-4" />
                                {formattedDate}
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {items.length}{' '}
                                {items.length !== 1 ? t('dailyProgramme.events') : t('dailyProgramme.event')}
                              </span>
                            </div>

                            <div className="space-y-4 print-date-sections">
                              {sections.map((section) => (
                                <div
                                  key={`${dateKey}:${section.programmeType}`}
                                  className="space-y-2 print-programme-type-section"
                                >
                                  <div className="text-sm font-semibold print-programme-type-heading">
                                    {getProgrammeTypeLabel(section.programmeType, t)}
                                  </div>

                                  <div className="overflow-x-auto print-table-wrapper">
                                    <Table>
                                      <colgroup>
                                        <col className="print-col-1" />
                                        <col className="print-col-2" />
                                        <col className="print-col-3" />
                                        <col className="print-col-4" />
                                        <col className="no-print" />
                                        <col className="no-print" />
                                        <col className="no-print" />
                                      </colgroup>
                                      <TableHeader>
                                        <TableRow>
                                          <TableHead className="w-[60px] text-center">{t('dailyProgramme.serialNo')}</TableHead>
                                          <TableHead className="w-[150px]">{t('dailyProgramme.time')}</TableHead>
                                          <TableHead className="w-[400px]">{t('dailyProgramme.programmeNatureAndPlace')}</TableHead>
                                          <TableHead className="w-[300px]">{t('dailyProgramme.reference')}</TableHead>
                                          <TableHead className="w-[80px] no-print text-center">{t('dailyProgramme.docs')}</TableHead>
                                          <TableHead className="w-[150px] no-print">{t('dailyProgramme.attendance')}</TableHead>
                                          <TableHead className="w-[100px] no-print">{t('dailyProgramme.actions')}</TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {(() => {
                                          const sorted = [...section.items].sort((a, b) => {
                                            const timeA = a.startTime || '00:00';
                                            const timeB = b.startTime || '00:00';
                                            const byTime = timeA.localeCompare(timeB);
                                            if (byTime !== 0) return byTime;
                                            const orderA = a.sortOrder ?? 1;
                                            const orderB = b.sortOrder ?? 1;
                                            return orderA - orderB;
                                          });

                                          const groups = new Map<string, ProgrammeItem[]>();
                                          for (const it of sorted) {
                                            const key = it.startTime || '00:00';
                                            const list = groups.get(key) ?? [];
                                            list.push(it);
                                            groups.set(key, list);
                                          }

                                          const groupKeys = Array.from(groups.keys()).sort((a, b) => a.localeCompare(b));

                                          return groupKeys.map((startTimeKey) => {
                                            const group = groups.get(startTimeKey) ?? [];
                                            const canReorder = group.length > 1;
                                            const ids = group.map((it) => it.id);

                                            const onDragEnd = async (event: DragEndEvent) => {
                                              const { active, over } = event;
                                              if (!over || active.id === over.id) return;
                                              const oldIndex = ids.indexOf(String(active.id));
                                              const newIndex = ids.indexOf(String(over.id));
                                              if (oldIndex < 0 || newIndex < 0) return;
                                              const next = arrayMove(group, oldIndex, newIndex);

                                              setAllItems((prev) =>
                                                prev.map((p) => {
                                                  const idx = next.findIndex((n) => n.id === p.id);
                                                  if (idx === -1) return p;
                                                  return { ...p, sortOrder: idx + 1 };
                                                }),
                                              );

                                              await persistReorder(next);
                                            };

                                            return (
                                              <DndContext
                                                key={startTimeKey}
                                                sensors={sensors}
                                                collisionDetection={closestCenter}
                                                onDragEnd={onDragEnd}
                                              >
                                                <SortableContext items={ids} strategy={verticalListSortingStrategy}>
                                                  {group.map((item) => (
                                                    <SortableProgrammeRow
                                                      key={item.id}
                                                      item={item}
                                                      index={sorted.findIndex((s) => s.id === item.id)}
                                                      locale={locale}
                                                      t={t}
                                                      DURATION_OPTIONS={DURATION_OPTIONS}
                                                      onOpenAttachmentDialog={handleOpenAttachmentDialog}
                                                      onAttendanceChange={handleAttendanceChange}
                                                      onEdit={handleEdit}
                                                      onDelete={handleDelete}
                                                      enableReorder={canReorder}
                                                    />
                                                  ))}
                                                </SortableContext>
                                              </DndContext>
                                            );
                                          });
                                        })()}
                                      </TableBody>
                                    </Table>
                                  </div>
                                </div>
                              ))}
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

      {/* Offscreen PDF layout (used for DOM->PDF capture, matches the provided screenshot) */}
      <div
        ref={pdfHostRef}
        aria-hidden="true"
        className="pointer-events-none"
        style={{
          position: 'fixed',
          left: '-10000px',
          top: 0,
          width: '794px', // ~A4 width at 96dpi
          background: '#fff',
          color: '#000',
          padding: '24px',
        }}
      >
        <div className="print-schedule pdf-daily-programme">
          {filteredDateEntries.map(([dateKey, items]) => {
            const date = parseISO(dateKey);
            const formattedDate = format(date, 'EEEE, dd MMM yyyy', { locale: enIN });
            const sections: Array<{
              programmeType: 'CONSTITUENCY' | 'OUTSIDE_CONSTITUENCY';
              items: ProgrammeItem[];
            }> = [
              { programmeType: 'CONSTITUENCY' as const, items: items.filter((it) => (it.programmeType ?? 'CONSTITUENCY') === 'CONSTITUENCY') },
              { programmeType: 'OUTSIDE_CONSTITUENCY' as const, items: items.filter((it) => (it.programmeType ?? 'CONSTITUENCY') === 'OUTSIDE_CONSTITUENCY') },
            ].filter((s) => s.items.length > 0);

            return (
              <div key={`pdf:${dateKey}`} style={{ marginBottom: '22px' }}>
                <div className="pdf-day-header">
                  <div className="pdf-day-left">
                    <span aria-hidden>📅</span>
                    <span>{formattedDate}</span>
                  </div>
                  <div className="pdf-day-right">
                    {items.length} {items.length === 1 ? t('dailyProgramme.event') : t('dailyProgramme.events')}
                  </div>
                </div>

                {sections.map((section) => {
                  const sorted = [...section.items].sort((a, b) => {
                    const timeA = a.startTime || '00:00';
                    const timeB = b.startTime || '00:00';
                    const byTime = timeA.localeCompare(timeB);
                    if (byTime !== 0) return byTime;
                    const orderA = a.sortOrder ?? 1;
                    const orderB = b.sortOrder ?? 1;
                    return orderA - orderB;
                  });

                  return (
                    <div key={`pdf:${dateKey}:${section.programmeType}`} style={{ marginBottom: '18px' }}>
                      <div className="pdf-programme-type">
                        {getProgrammeTypeLabel(section.programmeType, t)}
                      </div>

                      <table>
                        <colgroup>
                          <col className="pdf-col-sr" />
                          <col className="pdf-col-time" />
                          <col className="pdf-col-nature" />
                          <col className="pdf-col-ref" />
                        </colgroup>
                        <thead>
                          <tr>
                            <th className="pdf-col-sr">{t('dailyProgramme.serialNo')}</th>
                            <th className="pdf-col-time">{t('dailyProgramme.time')}</th>
                            <th className="pdf-col-nature">{t('dailyProgramme.programmeNatureAndPlace')}</th>
                            <th className="pdf-col-ref">{t('dailyProgramme.reference')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sorted.map((it, idx) => {
                            const serialNumber = (idx + 1).toLocaleString(
                              locale === 'mr' ? 'mr-IN-u-nu-deva' : 'en-IN',
                            );
                            const start = formatTimePartsForPdf(it.startTime, locale);
                            const end = it.endTime ? formatTimePartsForPdf(it.endTime, locale) : null;
                            return (
                              <tr key={`pdf-row:${it.id}:${idx}`}>
                                <td className="pdf-col-sr">{serialNumber}</td>
                                <td className="pdf-col-time">
                                  <div className="pdf-time-main">
                                    {start.time} <span className="pdf-time-period">{start.period}</span>
                                    {end ? (
                                      <>
                                        <br />–<br />
                                        {end.time} <span className="pdf-time-period">{end.period}</span>
                                      </>
                                    ) : null}
                                  </div>
                                  <div className="pdf-time-sub pdf-muted">
                                    {getProgrammeTypeLabel((it.programmeType ?? 'CONSTITUENCY') as 'CONSTITUENCY' | 'OUTSIDE_CONSTITUENCY', t)}
                                  </div>
                                </td>
                                <td className="pdf-col-nature">
                                  <div className="pdf-title">{it.title}</div>
                                  {it.location ? (
                                    <div className="pdf-location pdf-muted">
                                      <span className="pdf-pin" aria-hidden>📍</span>
                                      <span>{it.location}</span>
                                    </div>
                                  ) : null}
                                </td>
                                <td className="pdf-col-ref">
                                  {it.remarks ? (
                                    <div>{it.remarks}</div>
                                  ) : (
                                    <div className="pdf-muted">—</div>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
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
            <DialogTitle>{t('dailyProgramme.beneficiaryDialogTitle')}</DialogTitle>
            <DialogDescription>
              {t('dailyProgramme.beneficiaryDialogDescription')
                .replace('{title}', programmeItemForTask?.title ?? '')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="voterEpicNumber">{t('dailyProgramme.voterEpicNumberRequired')}</Label>
              <Input
                id="voterEpicNumber"
                placeholder={t('dailyProgramme.enterEpicNumber')}
                value={voterEpicNumber}
                onChange={(e) => setVoterEpicNumber(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="voterName">{t('dailyProgramme.voterNameOptional')}</Label>
              <Input
                id="voterName"
                placeholder={t('dailyProgramme.enterVoterName')}
                value={voterName}
                onChange={(e) => setVoterName(e.target.value)}
              />
            </div>
            {programmeItemForTask && (
              <div className="rounded-lg bg-muted p-3 text-sm">
                <div className="font-medium">{t('dailyProgramme.programmeDetails')}</div>
                <div className="mt-1 text-muted-foreground">
                  <div>{t('dailyProgramme.programmeDetailsTitle')}: {programmeItemForTask.title}</div>
                  <div>{t('dailyProgramme.programmeDetailsDate')}: {(() => {
                    const normalizedDate = programmeItemForTask.date ? normalizeDate(programmeItemForTask.date) : null;
                    return normalizedDate
                      ? formatDateWithLocale(parseISO(normalizedDate), 'dd MMM yyyy', locale)
                      : t('dailyProgramme.na');
                  })()}</div>
                  <div>{t('dailyProgramme.programmeDetailsLocation')}: {programmeItemForTask.location}</div>
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
              {t('dailyProgramme.cancel')}
            </Button>
            <Button
              type="button"
              onClick={handleCreateBeneficiaryTask}
              disabled={isCreatingTask || !voterEpicNumber.trim()}
            >
              {isCreatingTask ? t('dailyProgramme.creating') : t('dailyProgramme.createTask')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Attachment Dialog */}
      {selectedProgrammeForAttachment && (
        <DailyProgrammeAttachmentDialog
          open={attachmentDialogOpen}
          onOpenChange={(open) => {
            setAttachmentDialogOpen(open);
            if (!open) {
              setSelectedProgrammeForAttachment(null);
              setAttachments([]);
            }
          }}
          programmeId={selectedProgrammeForAttachment.id}
          programmeTitle={selectedProgrammeForAttachment.title}
          attachments={attachments}
          onAttachmentsChange={handleAttachmentsChange}
        />
      )}
    </div>
  );
}

