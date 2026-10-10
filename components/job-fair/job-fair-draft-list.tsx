'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check, Loader2, Search, X } from 'lucide-react';

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
import { formatDisplayDateTimeIST } from '@/lib/ist-date';
import type { JobFairDraftListItem } from '@/lib/db/job-fair-queries';
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

const DRAFT_STEP_LABELS = [
  'Personal',
  'Address',
  'Education & Work',
  'Job Preference',
  'Review',
] as const;

type ListResponse = {
  items: JobFairDraftListItem[];
  total: number;
};

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
  reloadKey = 0,
  initialFrom = '',
  initialTo = '',
  initialStep = null,
  initialWhatsapp = null,
}: {
  reloadKey?: number;
  initialFrom?: string;
  initialTo?: string;
  initialStep?: number | null;
  initialWhatsapp?: 'verified' | 'unverified' | null;
}) {
  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);
  const [step, setStep] = useState<number | null>(
    initialStep !== null && initialStep >= 0 && initialStep <= 4 ? initialStep : null,
  );
  const [whatsapp, setWhatsapp] = useState<'verified' | 'unverified' | null>(
    initialWhatsapp === 'verified' || initialWhatsapp === 'unverified'
      ? initialWhatsapp
      : null,
  );
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [data, setData] = useState<ListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<JobFairDraftListItem | null>(null);
  const [markingId, setMarkingId] = useState<string | null>(null);

  function applyVerified(id: string, whatsappVerifiedAt: string) {
    setData((prev) => {
      if (!prev) return prev;
      const hide = whatsapp === 'unverified';
      return {
        items: prev.items
          .map((item) => (item.id === id ? { ...item, whatsappVerifiedAt } : item))
          .filter((item) => !(hide && item.id === id)),
        total: hide ? Math.max(0, prev.total - 1) : prev.total,
      };
    });
    setSelected((prev) =>
      prev?.id === id ? { ...prev, whatsappVerifiedAt } : prev,
    );
  }

  async function markWhatsappVerified(item: JobFairDraftListItem) {
    if (item.whatsappVerifiedAt || markingId) return;
    setMarkingId(item.id);
    try {
      const res = await fetch(`/api/job-fair/drafts/${item.id}/whatsapp`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Failed');
      const json = (await res.json()) as { whatsappVerifiedAt?: string };
      applyVerified(item.id, json.whatsappVerifiedAt ?? new Date().toISOString());
      toast.success('WhatsApp number marked verified');
    } catch {
      toast.error('Could not mark WhatsApp verified');
    } finally {
      setMarkingId(null);
    }
  }

  useEffect(() => {
    const handle = setTimeout(() => {
      setSearch((prev) => (prev === searchDraft.trim() ? prev : searchDraft.trim()));
      setPage(1);
    }, 300);
    return () => clearTimeout(handle);
  }, [searchDraft]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      limit: String(pageSize),
    });
    if (search) params.set('search', search);
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    if (step !== null) params.set('step', String(step));
    if (whatsapp) params.set('whatsapp', whatsapp);
    fetch(`/api/job-fair/drafts?${params.toString()}`)
      .then(async (res) => {
        if (!res.ok) throw new Error('Failed');
        return (await res.json()) as ListResponse;
      })
      .then((json) => {
        if (!cancelled) setData(json);
      })
      .catch(() => {
        if (!cancelled) toast.error('Failed to load drafts');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [search, from, to, step, whatsapp, page, pageSize, reloadKey]);

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const hasSearch = Boolean(
    search || searchDraft || from || to || step !== null || whatsapp,
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
                  setStep(value === 'all' ? null : Number(value));
                  setPage(1);
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
                  setWhatsapp(
                    value === 'verified' || value === 'unverified' ? value : null,
                  );
                  setPage(1);
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
                onValueChange={(value) => {
                  setFrom(value);
                  setPage(1);
                }}
                className="h-10 w-full"
              />
            </div>
            <div className="min-w-0 space-y-1.5">
              <div className="text-xs font-medium text-muted-foreground">Created to</div>
              <DmyDateInput
                value={to}
                onValueChange={(value) => {
                  setTo(value);
                  setPage(1);
                }}
                className="h-10 w-full"
              />
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              {loading
                ? 'Loading…'
                : `${total} incomplete draft${total === 1 ? '' : 's'}`}
            </p>
            {hasSearch ? (
              <Button
                variant="ghost"
                onClick={() => {
                  setSearchDraft('');
                  setSearch('');
                  setFrom('');
                  setTo('');
                  setStep(null);
                  setWhatsapp(null);
                  setPage(1);
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

      <Card className="min-w-0">
        {loading && !data ? (
          <div className="flex items-center justify-center p-10 text-muted-foreground">
            <Loader2 className="mr-2 size-4 animate-spin" />
            Loading drafts…
          </div>
        ) : items.length === 0 ? (
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
                    <TableHead>Name</TableHead>
                    <TableHead>Mobile</TableHead>
                    <TableHead>Stopped at</TableHead>
                    <TableHead>WhatsApp</TableHead>
                    <TableHead>Area</TableHead>
                    <TableHead className="hidden lg:table-cell">Qualification</TableHead>
                    <TableHead className="hidden lg:table-cell">Last saved</TableHead>
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
                      <TableCell>{item.mobile}</TableCell>
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
                      <TableCell className="max-w-44 truncate">
                        {areaText(item.area, item.areaOther) || '—'}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {item.qualification
                          ? optionLabel(QUALIFICATION_OPTIONS, item.qualification)
                          : '—'}
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
                  <button
                    type="button"
                    onClick={() => setSelected(item)}
                    className="flex w-full flex-col gap-1 p-4 text-left"
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
                      {item.updatedAt ? formatDisplayDateTimeIST(item.updatedAt) : '—'}
                    </div>
                  </button>
                  <div className="px-4 pb-4">
                    <WhatsappVerifyControl
                      item={item}
                      pending={markingId === item.id}
                      onMark={() => markWhatsappVerified(item)}
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
            onPageChange={(p) => setPage(Math.max(1, Math.min(p, totalPages)))}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPage(1);
            }}
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
                <WhatsappVerifyControl
                  item={selected}
                  pending={markingId === selected.id}
                  onMark={() => markWhatsappVerified(selected)}
                  wide
                />
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
    </div>
  );
}
