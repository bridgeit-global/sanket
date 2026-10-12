'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check, Loader2, ScrollText, Search, X } from 'lucide-react';

import { PhoneCallButton } from '@/components/hierarchy/contact-with-call';
import { JobFairSortBar, SortableColumnHead } from '@/components/job-fair/sort-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { TablePagination } from '@/components/table-pagination';
import { toast } from '@/components/toast';
import { DmyDateInput } from '@/components/ui/dmy-date-input';
import { Textarea } from '@/components/ui/textarea';
import { formatDisplayDateTimeIST } from '@/lib/ist-date';
import type {
  JobFairDraftListItem,
  JobFairDraftLog,
} from '@/lib/db/job-fair-queries';
import type { JobFairFormValues } from '@/lib/job-fair/schema';
import {
  AREA_OPTIONS,
  AREA_OTHER,
  EMPLOYMENT_STATUS_OPTIONS,
  EXPERIENCE_OPTIONS,
  GENDER_OPTIONS,
  HEARD_FROM_OPTIONS,
  JOB_TYPE_OPTIONS,
  JOB_TYPE_OTHER,
  QUALIFICATION_OPTIONS,
  optionLabel,
} from '@/lib/job-fair/options';
import {
  DRAFT_SORT_OPTIONS,
  type JobFairSortDir,
} from '@/lib/job-fair/page-query';

const DRAFT_STEP_LABELS = [
  'Personal',
  'Address',
  'Education & Work',
  'Job Preference',
  'Review',
] as const;

function stepLabel(step: number): string {
  return DRAFT_STEP_LABELS[step] ?? DRAFT_STEP_LABELS[0];
}

function stepOptionLabel(step: number): string {
  return `Step ${step + 1} : ${stepLabel(step)}`;
}

function areaText(area: string, areaOther: string): string {
  if (!area) return '';
  return area === AREA_OTHER
    ? `Other: ${areaOther}`
    : optionLabel(AREA_OPTIONS, area);
}

function jobTypesText(values: JobFairFormValues): string[] {
  return values.jobTypes.map((t) =>
    t === JOB_TYPE_OTHER && values.jobTypeOther
      ? `Other: ${values.jobTypeOther}`
      : optionLabel(JOB_TYPE_OPTIONS, t),
  );
}

function displayName(item: JobFairDraftListItem): string {
  return item.fullName.trim() || 'Name not entered';
}

function LogButton({
  count,
  onClick,
  wide = false,
}: {
  count: number;
  onClick: () => void;
  wide?: boolean;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      className={wide ? 'h-10 w-full sm:w-auto' : 'h-10 w-full sm:w-auto'}
    >
      <ScrollText className="size-4" />
      Log
      {count > 0 ? (
        <Badge variant="secondary" className="px-1.5">
          {count}
        </Badge>
      ) : null}
    </Button>
  );
}

function DraftFollowUpDialog({
  item,
  onClose,
  onLogged,
}: {
  item: JobFairDraftListItem | null;
  onClose: () => void;
  onLogged: () => void;
}) {
  const [logs, setLogs] = useState<JobFairDraftLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!item) {
      setLogs([]);
      setNote('');
      return;
    }
    const draftId = item.id;
    let cancelled = false;
    setLoading(true);
    setNote('');
    fetch(`/api/job-fair/drafts/${draftId}/logs`)
      .then(async (res) => {
        if (!res.ok) throw new Error('Failed');
        return (await res.json()) as { logs: JobFairDraftLog[] };
      })
      .then((json) => {
        if (!cancelled) setLogs(json.logs ?? []);
      })
      .catch(() => {
        if (!cancelled) toast.error('Could not load follow-up notes');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [item?.id]);

  async function saveNote() {
    if (!item || saving) return;
    const trimmed = note.trim();
    if (!trimmed) {
      toast.error('Enter a follow-up note');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/job-fair/drafts/${item.id}/logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: trimmed }),
      });
      if (!res.ok) throw new Error('Failed');
      const json = (await res.json()) as { log: JobFairDraftLog };
      setLogs((prev) => [json.log, ...prev]);
      setNote('');
      onLogged();
      toast.success('Follow-up note saved');
    } catch {
      toast.error('Could not save follow-up note');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={Boolean(item)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] overflow-y-auto sm:max-w-lg">
        {item ? (
          <>
            <DialogHeader>
              <DialogTitle className="break-words">Follow-up log</DialogTitle>
              <DialogDescription className="break-words">
                {displayName(item)} · {item.mobile}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Add a follow-up note…"
                maxLength={2000}
                rows={3}
              />
              <Button
                type="button"
                disabled={saving || !note.trim()}
                onClick={() => void saveNote()}
                className="h-10 w-full sm:w-auto"
              >
                {saving ? <Loader2 className="size-4 animate-spin" /> : null}
                Save note
              </Button>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Note history</p>
              {loading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" />
                  Loading notes…
                </div>
              ) : logs.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No follow-up notes yet.
                </p>
              ) : (
                <ul className="max-h-64 space-y-2 overflow-y-auto">
                  {logs.map((log) => (
                    <li key={log.id} className="rounded-md bg-muted/50 p-2 text-sm">
                      <p className="whitespace-pre-wrap break-words">{log.note}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatDisplayDateTimeIST(log.createdAt)} · {log.createdByName}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function WhatsappVerifyControl({
  item,
  pending,
  onMark,
  wide = false,
}: {
  item: JobFairDraftListItem;
  pending: boolean;
  onMark: () => void;
  wide?: boolean;
}) {
  if (item.whatsappVerifiedAt) {
    return (
      <Badge variant="secondary" className="h-10 gap-1 px-3">
        <Check className="size-3.5" />
        WhatsApp verified
      </Badge>
    );
  }

  return (
    <Button
      type="button"
      variant="outline"
      disabled={pending}
      onClick={(event) => {
        event.stopPropagation();
        onMark();
      }}
      className={wide ? 'h-10 w-full sm:w-auto' : 'h-10 w-full sm:w-auto'}
    >
      {pending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
      Mark verified
    </Button>
  );
}

export function JobFairDraftList({
  items,
  total,
  page,
  pageSize,
  search,
  from,
  to,
  step,
  whatsapp,
  sort,
  dir,
  pending,
  onToggleSort,
  onSortColumn,
  onSortDir,
  onSearchCommit,
  onFromChange,
  onToChange,
  onStepChange,
  onWhatsappChange,
  onPageChange,
  onPageSizeChange,
  onClear,
  onRefresh,
}: {
  items: JobFairDraftListItem[];
  total: number;
  page: number;
  pageSize: number;
  search: string;
  from: string;
  to: string;
  step: number | null;
  whatsapp: 'verified' | 'unverified' | null;
  sort: string;
  dir: JobFairSortDir;
  pending: boolean;
  onToggleSort: (column: string) => void;
  onSortColumn: (column: string) => void;
  onSortDir: (dir: JobFairSortDir) => void;
  onSearchCommit: (value: string) => void;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
  onStepChange: (value: number | null) => void;
  onWhatsappChange: (value: 'verified' | 'unverified' | null) => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onClear: () => void;
  onRefresh: () => void;
}) {
  const [searchDraft, setSearchDraft] = useState(search);
  const [selected, setSelected] = useState<JobFairDraftListItem | null>(null);
  const [logDraft, setLogDraft] = useState<JobFairDraftListItem | null>(null);
  const [markingId, setMarkingId] = useState<string | null>(null);

  useEffect(() => {
    const input = document.getElementById('job-fair-draft-search');
    if (input && document.activeElement === input) return;
    setSearchDraft(search);
  }, [search]);

  useEffect(() => {
    setSelected((prev) => {
      if (!prev) return prev;
      return items.find((item) => item.id === prev.id) ?? prev;
    });
  }, [items]);

  useEffect(() => {
    const trimmed = searchDraft.trim();
    if (trimmed === search) return;
    const handle = setTimeout(() => {
      onSearchCommit(trimmed);
    }, 300);
    return () => clearTimeout(handle);
  }, [onSearchCommit, search, searchDraft]);

  async function markWhatsappVerified(item: JobFairDraftListItem) {
    if (item.whatsappVerifiedAt || markingId) return;
    setMarkingId(item.id);
    try {
      const res = await fetch(`/api/job-fair/drafts/${item.id}/whatsapp`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Failed');
      toast.success('WhatsApp number marked verified');
      setSelected((prev) =>
        prev?.id === item.id
          ? { ...prev, whatsappVerifiedAt: new Date().toISOString() }
          : prev,
      );
      onRefresh();
    } catch {
      toast.error('Could not mark WhatsApp verified');
    } finally {
      setMarkingId(null);
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const hasSearch = Boolean(
    search || searchDraft.trim() || from || to || step !== null || whatsapp,
  );

  const detailFields = useMemo(() => {
    if (!selected) return [];
    const values = selected.values;
    return [
      ['Mobile', selected.mobile],
      ['WhatsApp', values.whatsapp],
      ['Age', values.age],
      ['Gender', values.gender ? optionLabel(GENDER_OPTIONS, values.gender) : ''],
      ['Area / Locality', areaText(values.area, values.areaOther)],
      ['PIN Code', values.pincode],
      ['Voter ID (EPIC)', values.epicNumber],
      [
        'Qualification',
        values.qualification
          ? optionLabel(QUALIFICATION_OPTIONS, values.qualification)
          : '',
      ],
      ['Course / Degree / Trade', values.course],
      [
        'Employment status',
        values.employmentStatus
          ? optionLabel(EMPLOYMENT_STATUS_OPTIONS, values.employmentStatus)
          : '',
      ],
      [
        'Experience',
        values.experience ? optionLabel(EXPERIENCE_OPTIONS, values.experience) : '',
      ],
      ['Heard via', values.heardFrom ? optionLabel(HEARD_FROM_OPTIONS, values.heardFrom) : ''],
    ] as Array<[string, string]>;
  }, [selected]);

  return (
    <div className="flex flex-col gap-3">
      <Card>
        <div className="space-y-3 p-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="job-fair-draft-search"
              placeholder="Search drafts by name or mobile"
              value={searchDraft}
              onChange={(e) => setSearchDraft(e.target.value)}
              className="h-10 pl-9"
            />
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            <div className="min-w-0 space-y-1.5">
              <div className="text-xs font-medium text-muted-foreground">Stopped at</div>
              <Select
                value={step === null ? 'all' : String(step)}
                onValueChange={(value) => {
                  onStepChange(value === 'all' ? null : Number(value));
                }}
              >
                <SelectTrigger className="h-10 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All steps</SelectItem>
                  {DRAFT_STEP_LABELS.map((label, index) => (
                    <SelectItem key={label} value={String(index)}>
                      {stepOptionLabel(index)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-0 space-y-1.5">
              <div className="text-xs font-medium text-muted-foreground">WhatsApp</div>
              <Select
                value={whatsapp ?? 'all'}
                onValueChange={(value) => {
                  onWhatsappChange(
                    value === 'verified' || value === 'unverified' ? value : null,
                  );
                }}
              >
                <SelectTrigger className="h-10 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="verified">WhatsApp verified</SelectItem>
                  <SelectItem value="unverified">WhatsApp not verified</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-0 space-y-1.5">
              <div className="text-xs font-medium text-muted-foreground">Created from</div>
              <DmyDateInput
                value={from}
                onValueChange={onFromChange}
                className="h-10 w-full"
              />
            </div>
            <div className="min-w-0 space-y-1.5">
              <div className="text-xs font-medium text-muted-foreground">Created to</div>
              <DmyDateInput
                value={to}
                onValueChange={onToChange}
                className="h-10 w-full"
              />
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              {pending
                ? 'Loading…'
                : `${total} incomplete draft${total === 1 ? '' : 's'}`}
            </p>
            {hasSearch ? (
              <Button
                variant="ghost"
                onClick={() => {
                  setSearchDraft('');
                  onClear();
                }}
                className="h-10 w-full sm:w-auto"
              >
                <X className="size-4" />
                Clear filters
              </Button>
            ) : null}
          </div>
        </div>
      </Card>

      <Card className={`min-w-0 ${pending ? 'opacity-60' : ''}`}>
        <JobFairSortBar
          options={DRAFT_SORT_OPTIONS}
          sort={sort}
          dir={dir}
          onSort={onSortColumn}
          onDir={onSortDir}
        />
        {items.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            {hasSearch
              ? 'No drafts match this search.'
              : 'No incomplete drafts. Candidates who leave the form before submitting appear here.'}
          </div>
        ) : (
          <>
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortableColumnHead label="Name" column="fullName" sort={sort} dir={dir} onSort={onToggleSort} />
                    <SortableColumnHead label="Mobile" column="mobile" sort={sort} dir={dir} onSort={onToggleSort} />
                    <SortableColumnHead label="Stopped at" column="step" sort={sort} dir={dir} onSort={onToggleSort} />
                    <SortableColumnHead label="WhatsApp" column="whatsapp" sort={sort} dir={dir} onSort={onToggleSort} />
                    <TableHead>Follow-up</TableHead>
                    <SortableColumnHead label="Area" column="area" sort={sort} dir={dir} onSort={onToggleSort} />
                    <SortableColumnHead label="Qualification" column="qualification" sort={sort} dir={dir} onSort={onToggleSort} className="hidden lg:table-cell" />
                    <SortableColumnHead label="Created at" column="createdAt" sort={sort} dir={dir} onSort={onToggleSort} className="hidden lg:table-cell" />
                    <SortableColumnHead label="Last saved" column="updatedAt" sort={sort} dir={dir} onSort={onToggleSort} className="hidden lg:table-cell" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow
                      key={item.id}
                      className="cursor-pointer"
                      onClick={() => setSelected(item)}
                    >
                      <TableCell className="max-w-48 truncate font-medium">
                        {displayName(item)}
                      </TableCell>
                      <TableCell>
                        <div
                          className="flex min-w-0 items-center gap-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span className="tabular-nums">{item.mobile}</span>
                          <PhoneCallButton phone={`+91${item.mobile}`} />
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          Step {item.step + 1} · {stepLabel(item.step)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <WhatsappVerifyControl
                          item={item}
                          pending={markingId === item.id}
                          onMark={() => markWhatsappVerified(item)}
                        />
                      </TableCell>
                      <TableCell>
                        <LogButton
                          count={item.logCount}
                          onClick={() => setLogDraft(item)}
                        />
                      </TableCell>
                      <TableCell className="max-w-44 truncate">
                        {areaText(item.area, item.areaOther) || '—'}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {item.qualification
                          ? optionLabel(QUALIFICATION_OPTIONS, item.qualification)
                          : '—'}
                      </TableCell>
                      <TableCell className="hidden whitespace-nowrap lg:table-cell">
                        {item.createdAt ? formatDisplayDateTimeIST(item.createdAt) : '—'}
                      </TableCell>
                      <TableCell className="hidden whitespace-nowrap lg:table-cell">
                        {item.updatedAt ? formatDisplayDateTimeIST(item.updatedAt) : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <ul className="divide-y md:hidden">
              {items.map((item) => (
                <li key={item.id}>
                  <div className="flex items-center gap-2 p-4 pb-2">
                    <button
                      type="button"
                      onClick={() => setSelected(item)}
                      className="flex min-w-0 flex-1 flex-col gap-1 text-left"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="min-w-0 truncate font-medium">{displayName(item)}</span>
                        <span className="shrink-0 text-sm text-muted-foreground">{item.mobile}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 text-xs">
                        <Badge variant="secondary">
                          Step {item.step + 1} · {stepLabel(item.step)}
                        </Badge>
                        {areaText(item.area, item.areaOther) ? (
                          <Badge variant="outline">{areaText(item.area, item.areaOther)}</Badge>
                        ) : null}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {item.createdAt
                          ? `Created ${formatDisplayDateTimeIST(item.createdAt)}`
                          : 'Created —'}
                        {item.updatedAt
                          ? ` · Saved ${formatDisplayDateTimeIST(item.updatedAt)}`
                          : ''}
                      </div>
                    </button>
                    <PhoneCallButton phone={`+91${item.mobile}`} className="h-10" />
                  </div>
                  <div className="flex flex-col gap-2 px-4 pb-4 sm:flex-row">
                    <WhatsappVerifyControl
                      item={item}
                      pending={markingId === item.id}
                      onMark={() => markWhatsappVerified(item)}
                    />
                    <LogButton
                      count={item.logCount}
                      onClick={() => setLogDraft(item)}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
        {total > 0 ? (
          <TablePagination
            currentPage={page}
            totalPages={totalPages}
            pageSize={pageSize}
            totalItems={total}
            onPageChange={(p) => onPageChange(Math.max(1, Math.min(p, totalPages)))}
            onPageSizeChange={onPageSizeChange}
          />
        ) : null}
      </Card>

      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] overflow-y-auto sm:max-w-lg">
          {selected ? (
            <>
              <DialogHeader>
                <DialogTitle className="break-words">{displayName(selected)}</DialogTitle>
                <DialogDescription>
                  Incomplete draft · Stopped at {stepLabel(selected.step)} (step{' '}
                  {selected.step + 1} of {DRAFT_STEP_LABELS.length})
                  {selected.createdAt
                    ? ` · Created ${formatDisplayDateTimeIST(selected.createdAt)}`
                    : ''}
                  {selected.updatedAt
                    ? ` · Last saved ${formatDisplayDateTimeIST(selected.updatedAt)}`
                    : ''}
                </DialogDescription>
              </DialogHeader>
              <dl className="grid grid-cols-1 gap-x-4 gap-y-3 text-sm sm:grid-cols-2">
                {detailFields.map(([label, value]) => (
                  <div key={label} className="min-w-0">
                    <dt className="text-xs text-muted-foreground">{label}</dt>
                    <dd className="break-words font-medium">{value || '—'}</dd>
                  </div>
                ))}
                <div className="min-w-0 sm:col-span-2">
                  <dt className="text-xs text-muted-foreground">Job types</dt>
                  <dd className="mt-1 flex flex-wrap gap-1.5">
                    {jobTypesText(selected.values).length > 0 ? (
                      jobTypesText(selected.values).map((t) => (
                        <Badge key={t} variant="secondary">
                          {t}
                        </Badge>
                      ))
                    ) : (
                      <span className="font-medium">—</span>
                    )}
                  </dd>
                </div>
              </dl>
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                <LogButton
                  count={selected.logCount}
                  wide
                  onClick={() => setLogDraft(selected)}
                />
                <WhatsappVerifyControl
                  item={selected}
                  pending={markingId === selected.id}
                  onMark={() => markWhatsappVerified(selected)}
                  wide
                />
                <PhoneCallButton phone={`+91${selected.mobile}`} className="h-10 w-full sm:w-auto" />
                {/^[6-9]\d{9}$/.test(selected.values.whatsapp || selected.mobile) ? (
                  <Button variant="outline" asChild className="h-10 w-full sm:w-auto">
                    <a
                      href={`https://wa.me/91${selected.values.whatsapp || selected.mobile}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      WhatsApp
                    </a>
                  </Button>
                ) : null}
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <DraftFollowUpDialog
        item={logDraft}
        onClose={() => setLogDraft(null)}
        onLogged={onRefresh}
      />
    </div>
  );
}
