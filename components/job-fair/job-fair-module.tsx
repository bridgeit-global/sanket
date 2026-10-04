'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CalendarCheck,
  Copy,
  Download,
  ExternalLink,
  Eye,
  FileText,
  Loader2,
  MapPin,
  Search,
  UserCheck,
  Users,
  X,
} from 'lucide-react';

import { JobFairCheckIn } from '@/components/job-fair/job-fair-check-in';
import { FilePreviewDialog } from '@/components/file-preview-dialog';
import { ModulePageHeader } from '@/components/module-page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { DmyDateInput } from '@/components/ui/dmy-date-input';
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
import { formatDisplayDateTimeIST } from '@/lib/ist-date';
import { jobFairStatusLabel } from '@/lib/job-fair/check-in';
import {
  AREA_OPTIONS,
  AREA_OTHER,
  EMPLOYMENT_STATUS_OPTIONS,
  EXPERIENCE_OPTIONS,
  GENDER_OPTIONS,
  HEARD_FROM_OPTIONS,
  JOB_FAIR_EVENT,
  JOB_FAIR_PUBLIC_PATH,
  JOB_TYPE_OPTIONS,
  JOB_TYPE_OTHER,
  QUALIFICATION_OPTIONS,
  optionLabel,
} from '@/lib/job-fair/options';
import type {
  JobFairRegistration,
  JobFairStats,
} from '@/lib/db/job-fair-queries';

const ALL = 'all';

type Filters = {
  search: string;
  area: string;
  qualification: string;
  experience: string;
  jobType: string;
  from: string;
  to: string;
};

const EMPTY_FILTERS: Filters = {
  search: '',
  area: '',
  qualification: '',
  experience: '',
  jobType: '',
  from: '',
  to: '',
};

type ListResponse = {
  items: JobFairRegistration[];
  total: number;
  stats: JobFairStats;
};

function areaText(r: JobFairRegistration): string {
  return r.area === AREA_OTHER
    ? `Other: ${r.areaOther ?? ''}`
    : optionLabel(AREA_OPTIONS, r.area);
}

function jobTypesText(r: JobFairRegistration): string[] {
  return r.jobTypes.map((t) =>
    t === JOB_TYPE_OTHER && r.jobTypeOther
      ? `Other: ${r.jobTypeOther}`
      : optionLabel(JOB_TYPE_OPTIONS, t),
  );
}

function buildQuery(filters: Filters, extra?: Record<string, string>) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(filters)) if (v) params.set(k, v);
  for (const [k, v] of Object.entries(extra ?? {})) params.set(k, v);
  return params.toString();
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: readonly { value: string; label: string }[];
}) {
  return (
    <div className="min-w-0 space-y-1.5">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <Select value={value || ALL} onValueChange={(v) => onChange(v === ALL ? '' : v)}>
        <SelectTrigger className="h-10 w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All</SelectItem>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: typeof Users;
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-5" />
        </span>
        <div className="min-w-0">
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="truncate text-xl font-semibold">{value}</div>
          {sub ? <div className="truncate text-xs text-muted-foreground">{sub}</div> : null}
        </div>
      </CardContent>
    </Card>
  );
}

export function JobFairModule({
  initialCheckInCode,
}: {
  initialCheckInCode?: string | null;
}) {
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [searchDraft, setSearchDraft] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [data, setData] = useState<ListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<JobFairRegistration | null>(null);
  const [openingResume, setOpeningResume] = useState<string | null>(null);
  const [resumePreview, setResumePreview] = useState<{
    fileUrl: string;
    fileName: string;
  } | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const handle = setTimeout(() => {
      setFilters((prev) =>
        prev.search === searchDraft.trim() ? prev : { ...prev, search: searchDraft.trim() },
      );
      setPage(1);
    }, 300);
    return () => clearTimeout(handle);
  }, [searchDraft]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(
      `/api/job-fair/registrations?${buildQuery(filters, {
        page: String(page),
        limit: String(pageSize),
      })}`,
    )
      .then(async (res) => {
        if (!res.ok) throw new Error('Failed');
        return (await res.json()) as ListResponse;
      })
      .then((json) => {
        if (!cancelled) setData(json);
      })
      .catch(() => {
        if (!cancelled) toast.error('Failed to load registrations');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [filters, page, pageSize, reloadKey]);

  const setFilter = (key: keyof Filters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const hasFilters = useMemo(
    () => Object.values(filters).some(Boolean) || Boolean(searchDraft),
    [filters, searchDraft],
  );

  const clearFilters = () => {
    setSearchDraft('');
    setFilters(EMPTY_FILTERS);
    setPage(1);
  };

  const copyPublicLink = async () => {
    const url = `${window.location.origin}${JOB_FAIR_PUBLIC_PATH}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Registration link copied');
    } catch {
      toast.error(url);
    }
  };

  const openResume = useCallback(
    async (id: string, fileNameHint?: string | null) => {
      setOpeningResume(id);
      try {
        const res = await fetch(`/api/job-fair/registrations/${id}/resume`);
        const json = (await res.json()) as { url?: string; error?: string };
        if (!res.ok || !json.url) {
          throw new Error(json.error || 'Could not open resume');
        }
        setResumePreview({
          fileUrl: json.url,
          fileName: fileNameHint || 'resume.pdf',
        });
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Could not open resume');
      } finally {
        setOpeningResume(null);
      }
    },
    [],
  );

  const exportHref = `/api/job-fair/registrations/export?${buildQuery(filters)}`;
  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const stats = data?.stats;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="flex flex-col gap-5">
      <ModulePageHeader
        title="Job Fair Registrations"
        description={`${JOB_FAIR_EVENT.title} · ${JOB_FAIR_EVENT.dateLabel} · ${JOB_FAIR_EVENT.venueShort}`}
        actions={
          <>
            <Button variant="outline" onClick={copyPublicLink} className="h-10 w-full sm:w-auto">
              <Copy className="size-4" />
              <span className="sm:hidden">Copy link</span>
              <span className="hidden sm:inline">Copy public link</span>
            </Button>
            <Button variant="outline" asChild className="h-10 w-full sm:w-auto">
              <a href={JOB_FAIR_PUBLIC_PATH} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="size-4" />
                Open form
              </a>
            </Button>
            <Button asChild className="h-10 w-full sm:w-auto">
              <a href={exportHref} download>
                <Download className="size-4" />
                Export CSV
              </a>
            </Button>
          </>
        }
      />

      <JobFairCheckIn
        initialCode={initialCheckInCode}
        onCheckedIn={() => setReloadKey((key) => key + 1)}
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
        <StatCard icon={Users} label="Total registrations" value={stats?.total ?? '—'} />
        <StatCard icon={CalendarCheck} label="Checked in" value={stats?.checkedIn ?? '—'} />
        <StatCard icon={UserCheck} label="Registered today" value={stats?.today ?? '—'} />
        <StatCard icon={FileText} label="With resume" value={stats?.withResume ?? '—'} />
        <StatCard
          icon={MapPin}
          label="Top area"
          value={
            stats?.topAreas[0]
              ? optionLabel(AREA_OPTIONS, stats.topAreas[0].area)
              : '—'
          }
          sub={
            stats?.topAreas.length
              ? stats.topAreas
                  .map((a) => `${optionLabel(AREA_OPTIONS, a.area)} (${a.count})`)
                  .join(', ')
              : undefined
          }
        />
      </div>

      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name, mobile or registration no."
              value={searchDraft}
              onChange={(e) => setSearchDraft(e.target.value)}
              className="h-10 pl-9"
            />
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            <FilterSelect label="Area" value={filters.area} onChange={(v) => setFilter('area', v)} options={AREA_OPTIONS} />
            <FilterSelect label="Qualification" value={filters.qualification} onChange={(v) => setFilter('qualification', v)} options={QUALIFICATION_OPTIONS} />
            <FilterSelect label="Experience" value={filters.experience} onChange={(v) => setFilter('experience', v)} options={EXPERIENCE_OPTIONS} />
            <FilterSelect label="Job type" value={filters.jobType} onChange={(v) => setFilter('jobType', v)} options={JOB_TYPE_OPTIONS} />
            <div className="min-w-0 space-y-1.5">
              <div className="text-xs font-medium text-muted-foreground">Registered from</div>
              <DmyDateInput value={filters.from} onValueChange={(v) => setFilter('from', v)} className="h-10 w-full" />
            </div>
            <div className="min-w-0 space-y-1.5">
              <div className="text-xs font-medium text-muted-foreground">Registered to</div>
              <DmyDateInput value={filters.to} onValueChange={(v) => setFilter('to', v)} className="h-10 w-full" />
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              {loading ? 'Loading…' : `${total} registration${total === 1 ? '' : 's'}`}
            </p>
            {hasFilters ? (
              <Button variant="ghost" onClick={clearFilters} className="h-10 w-full sm:w-auto">
                <X className="size-4" />
                Clear filters
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card className="min-w-0">
        {loading && !data ? (
          <div className="flex items-center justify-center p-10 text-muted-foreground">
            <Loader2 className="mr-2 size-4 animate-spin" />
            Loading registrations…
          </div>
        ) : items.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            {hasFilters ? 'No registrations match these filters.' : 'No registrations yet. Share the public link to get started.'}
          </div>
        ) : (
          <>
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reg. No</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Mobile</TableHead>
                    <TableHead>Area</TableHead>
                    <TableHead>Qualification</TableHead>
                    <TableHead className="hidden lg:table-cell">Experience</TableHead>
                    <TableHead className="hidden lg:table-cell">Registered</TableHead>
                    <TableHead className="text-right">Resume</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((r) => (
                    <TableRow key={r.id} className="cursor-pointer" onClick={() => setSelected(r)}>
                      <TableCell className="font-mono text-xs">{r.registrationNo}</TableCell>
                      <TableCell className="max-w-48 truncate font-medium">{r.fullName}</TableCell>
                      <TableCell>
                        <Badge variant={r.status === 'registered' ? 'secondary' : 'default'}>
                          {jobFairStatusLabel(r.status)}
                        </Badge>
                      </TableCell>
                      <TableCell>{r.mobile}</TableCell>
                      <TableCell className="max-w-44 truncate">{areaText(r)}</TableCell>
                      <TableCell>{optionLabel(QUALIFICATION_OPTIONS, r.qualification)}</TableCell>
                      <TableCell className="hidden lg:table-cell">{optionLabel(EXPERIENCE_OPTIONS, r.experience)}</TableCell>
                      <TableCell className="hidden whitespace-nowrap lg:table-cell">{formatDisplayDateTimeIST(r.createdAt)}</TableCell>
                      <TableCell className="text-right">
                        {r.resumeStoragePath ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            title="Preview resume"
                            aria-label="Preview resume"
                            disabled={openingResume === r.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              void openResume(r.id, 'resume.pdf');
                            }}
                          >
                            {openingResume === r.id ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : (
                              <Eye className="size-4" />
                            )}
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <ul className="divide-y md:hidden">
              {items.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => setSelected(r)}
                    className="flex w-full flex-col gap-1 p-4 text-left"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="min-w-0 truncate font-medium">{r.fullName}</span>
                      <span className="shrink-0 font-mono text-xs text-muted-foreground">{r.registrationNo}</span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {r.mobile} · {areaText(r)}
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 text-xs">
                      <Badge variant={r.status === 'registered' ? 'secondary' : 'default'}>
                        {jobFairStatusLabel(r.status)}
                      </Badge>
                      <Badge variant="secondary">{optionLabel(QUALIFICATION_OPTIONS, r.qualification)}</Badge>
                      <Badge variant="outline">{optionLabel(EXPERIENCE_OPTIONS, r.experience)}</Badge>
                      {r.resumeStoragePath ? <Badge variant="outline">Resume</Badge> : null}
                    </div>
                    <div className="text-xs text-muted-foreground">{formatDisplayDateTimeIST(r.createdAt)}</div>
                  </button>
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
                <DialogTitle className="break-words">{selected.fullName}</DialogTitle>
                <DialogDescription>
                  {selected.registrationNo} · {jobFairStatusLabel(selected.status)} · Registered{' '}
                  {formatDisplayDateTimeIST(selected.createdAt)}
                </DialogDescription>
              </DialogHeader>
              <dl className="grid grid-cols-1 gap-x-4 gap-y-3 text-sm sm:grid-cols-2">
                {(
                  [
                    ['Mobile', selected.mobile],
                    ['WhatsApp', selected.whatsapp],
                    ['Age', String(selected.age)],
                    ['Gender', optionLabel(GENDER_OPTIONS, selected.gender)],
                    ['Area / Locality', areaText(selected)],
                    ['PIN Code', selected.pincode],
                    ['Voter ID (EPIC)', selected.epicNumber],
                    ['Qualification', optionLabel(QUALIFICATION_OPTIONS, selected.qualification)],
                    ['Course / Degree / Trade', selected.course],
                    ['Employment status', optionLabel(EMPLOYMENT_STATUS_OPTIONS, selected.employmentStatus)],
                    ['Experience', optionLabel(EXPERIENCE_OPTIONS, selected.experience)],
                    ['Heard via', optionLabel(HEARD_FROM_OPTIONS, selected.heardFrom)],
                  ] as Array<[string, string | null]>
                ).map(([label, value]) => (
                  <div key={label} className="min-w-0">
                    <dt className="text-xs text-muted-foreground">{label}</dt>
                    <dd className="break-words font-medium">{value || '—'}</dd>
                  </div>
                ))}
                <div className="min-w-0 sm:col-span-2">
                  <dt className="text-xs text-muted-foreground">Job types</dt>
                  <dd className="mt-1 flex flex-wrap gap-1.5">
                    {jobTypesText(selected).map((t) => (
                      <Badge key={t} variant="secondary">{t}</Badge>
                    ))}
                  </dd>
                </div>
              </dl>
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                <Button variant="outline" asChild className="h-10 w-full sm:w-auto">
                  <a href={`https://wa.me/91${selected.whatsapp}`} target="_blank" rel="noopener noreferrer">
                    WhatsApp
                  </a>
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-10 w-10"
                  title={
                    selected.resumeStoragePath ? 'Preview resume' : 'No resume'
                  }
                  aria-label={
                    selected.resumeStoragePath ? 'Preview resume' : 'No resume'
                  }
                  disabled={
                    !selected.resumeStoragePath ||
                    openingResume === selected.id
                  }
                  onClick={() => void openResume(selected.id, 'resume.pdf')}
                >
                  {openingResume === selected.id ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                </Button>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <FilePreviewDialog
        open={!!resumePreview}
        onOpenChange={(open) => {
          if (!open) setResumePreview(null);
        }}
        fileName={resumePreview?.fileName ?? null}
        fileUrl={resumePreview?.fileUrl ?? null}
        sourceUrl={resumePreview?.fileUrl ?? null}
      />
    </div>
  );
}
