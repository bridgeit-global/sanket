'use client';

import { useCallback, useEffect, useState, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  CalendarCheck,
  ClipboardList,
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
import { JobFairDraftList } from '@/components/job-fair/job-fair-draft-list';
import { JobFairSortBar, SortableColumnHead } from '@/components/job-fair/sort-header';
import { PhoneCallButton } from '@/components/hierarchy/contact-with-call';
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  JobFairAssignee,
  JobFairDraftListItem,
  JobFairRegistration,
  JobFairStats,
} from '@/lib/db/job-fair-queries';
import {
  applyJobFairQueryPatch,
  CLEARED_JOB_FAIR_FILTERS,
  defaultJobFairSort,
  jobFairRegistrationExportQuery,
  normalizeJobFairSort,
  REGISTRATION_SORT_OPTIONS,
  type JobFairPageQuery,
  type JobFairPageView,
  type JobFairQueryPatch,
  type JobFairSortDir,
} from '@/lib/job-fair/page-query';

const ALL = 'all';

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
  active,
  onClick,
}: {
  icon: typeof Users;
  label: string;
  value: string | number;
  sub?: string;
  active?: boolean;
  onClick?: () => void;
}) {
  const body = (
    <>
      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="size-5" />
      </span>
      <span className="min-w-0">
        <span className="block text-xs text-muted-foreground">{label}</span>
        <span className="block truncate text-xl font-semibold">{value}</span>
        {sub ? (
          <span className="block truncate text-xs text-muted-foreground">{sub}</span>
        ) : null}
      </span>
    </>
  );

  return (
    <Card className={active ? 'ring-2 ring-primary' : undefined}>
      <CardContent className="p-0">
        {onClick ? (
          <button
            type="button"
            onClick={onClick}
            className="flex w-full items-center gap-3 p-4 text-left"
          >
            {body}
          </button>
        ) : (
          <div className="flex w-full items-center gap-3 p-4">{body}</div>
        )}
      </CardContent>
    </Card>
  );
}

export function JobFairModule({
  query,
  checkInCode,
  stats,
  total,
  registrations,
  drafts,
  assignees,
}: {
  query: JobFairPageQuery;
  checkInCode?: string | null;
  stats: JobFairStats;
  total: number;
  registrations: JobFairRegistration[] | null;
  drafts: JobFairDraftListItem[] | null;
  assignees: JobFairAssignee[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [searchDraft, setSearchDraft] = useState(query.search);
  const [selected, setSelected] = useState<JobFairRegistration | null>(null);
  const [openingResume, setOpeningResume] = useState<string | null>(null);
  const [resumePreview, setResumePreview] = useState<{
    fileUrl: string;
    fileName: string;
  } | null>(null);

  const commit = useCallback(
    (patch: JobFairQueryPatch, resetPage = false) => {
      const qs = applyJobFairQueryPatch(
        new URLSearchParams(searchParams.toString()),
        patch,
        { resetPage },
      );
      startTransition(() => {
        router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
      });
    },
    [pathname, router, searchParams],
  );

  const refresh = useCallback(() => {
    startTransition(() => {
      router.refresh();
    });
  }, [router]);

  useEffect(() => {
    const input = document.getElementById('job-fair-registration-search');
    if (input && document.activeElement === input) return;
    setSearchDraft(query.search);
  }, [query.search]);

  useEffect(() => {
    const trimmed = searchDraft.trim();
    if (trimmed === query.search || query.view !== 'registrations') return;
    const handle = setTimeout(() => {
      commit({ search: trimmed || null }, true);
    }, 300);
    return () => clearTimeout(handle);
  }, [commit, query.search, query.view, searchDraft]);

  const hasFilters = Boolean(
    query.search ||
      searchDraft.trim() ||
      query.area ||
      query.qualification ||
      query.experience ||
      query.jobType ||
      query.from ||
      query.to,
  );

  const clearFilters = () => {
    setSearchDraft('');
    commit(CLEARED_JOB_FAIR_FILTERS, true);
  };

  const changeView = (nextView: JobFairPageView) => {
    const next = normalizeJobFairSort(nextView, query.sort, query.dir);
    const defaults = defaultJobFairSort(nextView);
    commit(
      {
        view: nextView,
        sort: next.sort === defaults.sort && next.dir === defaults.dir ? null : next.sort,
        dir: next.sort === defaults.sort && next.dir === defaults.dir ? null : next.dir,
      },
      true,
    );
  };

  const toggleSort = (column: string) => {
    const dir: JobFairSortDir =
      query.sort === column && query.dir === 'asc' ? 'desc' : 'asc';
    commit({ sort: column, dir }, true);
  };

  const copyPublicLink = async () => {
    const url = JOB_FAIR_PUBLIC_PATH
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

  const exportQuery = jobFairRegistrationExportQuery(query);
  const exportHref = `/api/job-fair/registrations/export${exportQuery ? `?${exportQuery}` : ''}`;
  const items = registrations ?? [];
  const page = query.page;
  const pageSize = query.limit;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const view = query.view;

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

      <JobFairCheckIn initialCode={checkInCode} onCheckedIn={refresh} />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <StatCard
          icon={Users}
          label="Total registrations"
          value={stats.total}
          active={view === 'registrations'}
          onClick={() => changeView('registrations')}
        />
        <StatCard icon={CalendarCheck} label="Checked in" value={stats.checkedIn} />
        <StatCard icon={UserCheck} label="Registered today" value={stats.today} />
        <StatCard icon={FileText} label="With resume" value={stats.withResume} />
        <StatCard
          icon={ClipboardList}
          label="Incomplete drafts"
          value={stats.openDrafts}
          active={view === 'drafts'}
          onClick={() => changeView('drafts')}
        />
        <StatCard
          icon={MapPin}
          label="Top area"
          value={
            stats.topAreas[0]
              ? optionLabel(AREA_OPTIONS, stats.topAreas[0].area)
              : '—'
          }
          sub={
            stats.topAreas.length
              ? stats.topAreas
                .map((a) => `${optionLabel(AREA_OPTIONS, a.area)} (${a.count})`)
                .join(', ')
              : undefined
          }
        />
      </div>

      <Tabs
        value={view}
        onValueChange={(next) => changeView(next === 'drafts' ? 'drafts' : 'registrations')}
      >
        <TabsList className="h-10 w-full sm:w-auto">
          <TabsTrigger value="registrations" className="flex-1 sm:flex-none">
            Registrations
          </TabsTrigger>
          <TabsTrigger value="drafts" className="flex-1 sm:flex-none">
            Drafts ({stats.openDrafts})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {view === 'drafts' ? (
        <JobFairDraftList
          items={drafts ?? []}
          total={total}
          page={page}
          pageSize={pageSize}
          search={query.search}
          from={query.from}
          to={query.to}
          step={query.step}
          whatsapp={query.whatsapp}
          sort={query.sort}
          dir={query.dir}
          pending={pending}
          onToggleSort={toggleSort}
          onSortColumn={(column) =>
            commit({ sort: column, dir: query.sort === column ? query.dir : 'asc' }, true)
          }
          onSortDir={(dir) => commit({ dir }, true)}
          onSearchCommit={(value) => commit({ search: value || null }, true)}
          onFromChange={(value) => commit({ from: value || null }, true)}
          onToChange={(value) => commit({ to: value || null }, true)}
          onStepChange={(value) => commit({ step: value }, true)}
          onWhatsappChange={(value) => commit({ whatsapp: value }, true)}
          onPageChange={(next) => commit({ page: next })}
          onPageSizeChange={(size) => commit({ limit: size }, true)}
          onClear={() => commit(CLEARED_JOB_FAIR_FILTERS, true)}
          onRefresh={refresh}
          assignees={assignees}
        />
      ) : null}

      {view === 'registrations' ? (
        <>
          <Card>
            <CardContent className="space-y-3 p-4">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="job-fair-registration-search"
                  placeholder="Search by name, mobile or registration no."
                  value={searchDraft}
                  onChange={(e) => setSearchDraft(e.target.value)}
                  className="h-10 pl-9"
                />
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                <FilterSelect label="Area" value={query.area} onChange={(v) => commit({ area: v || null }, true)} options={AREA_OPTIONS} />
                <FilterSelect label="Qualification" value={query.qualification} onChange={(v) => commit({ qualification: v || null }, true)} options={QUALIFICATION_OPTIONS} />
                <FilterSelect label="Experience" value={query.experience} onChange={(v) => commit({ experience: v || null }, true)} options={EXPERIENCE_OPTIONS} />
                <FilterSelect label="Job type" value={query.jobType} onChange={(v) => commit({ jobType: v || null }, true)} options={JOB_TYPE_OPTIONS} />
                <div className="min-w-0 space-y-1.5">
                  <div className="text-xs font-medium text-muted-foreground">Registered from</div>
                  <DmyDateInput value={query.from} onValueChange={(v) => commit({ from: v || null }, true)} className="h-10 w-full" />
                </div>
                <div className="min-w-0 space-y-1.5">
                  <div className="text-xs font-medium text-muted-foreground">Registered to</div>
                  <DmyDateInput value={query.to} onValueChange={(v) => commit({ to: v || null }, true)} className="h-10 w-full" />
                </div>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground">
                  {pending ? 'Loading…' : `${total} registration${total === 1 ? '' : 's'}`}
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

          <Card className={`min-w-0 ${pending ? 'opacity-60' : ''}`}>
            <JobFairSortBar
              options={REGISTRATION_SORT_OPTIONS}
              sort={query.sort}
              dir={query.dir}
              onSort={(column) =>
                commit({ sort: column, dir: query.sort === column ? query.dir : 'asc' }, true)
              }
              onDir={(dir) => commit({ dir }, true)}
            />
            {items.length === 0 ? (
              <div className="p-10 text-center text-sm text-muted-foreground">
                {hasFilters ? 'No registrations match these filters.' : 'No registrations yet. Share the public link to get started.'}
              </div>
            ) : (
              <>
                <div className="hidden md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <SortableColumnHead label="Reg. No" column="registrationNo" sort={query.sort} dir={query.dir} onSort={toggleSort} />
                        <SortableColumnHead label="Name" column="fullName" sort={query.sort} dir={query.dir} onSort={toggleSort} />
                        <SortableColumnHead label="Status" column="status" sort={query.sort} dir={query.dir} onSort={toggleSort} />
                        <SortableColumnHead label="Mobile" column="mobile" sort={query.sort} dir={query.dir} onSort={toggleSort} />
                        <SortableColumnHead label="Area" column="area" sort={query.sort} dir={query.dir} onSort={toggleSort} />
                        <SortableColumnHead label="Qualification" column="qualification" sort={query.sort} dir={query.dir} onSort={toggleSort} />
                        <SortableColumnHead label="Experience" column="experience" sort={query.sort} dir={query.dir} onSort={toggleSort} className="hidden lg:table-cell" />
                        <SortableColumnHead label="Registered" column="createdAt" sort={query.sort} dir={query.dir} onSort={toggleSort} className="hidden lg:table-cell" />
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
                          <TableCell>
                            <div
                              className="flex min-w-0 items-center gap-2"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <span className="tabular-nums">{r.mobile}</span>
                              <PhoneCallButton phone={`+91${r.mobile}`} />
                            </div>
                          </TableCell>
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
                    <li key={r.id} className="flex items-center gap-2 p-4">
                      <button
                        type="button"
                        onClick={() => setSelected(r)}
                        className="flex min-w-0 flex-1 flex-col gap-1 text-left"
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
                      <PhoneCallButton phone={`+91${r.mobile}`} className="h-10" />
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
                onPageChange={(p) => commit({ page: Math.max(1, Math.min(p, totalPages)) })}
                onPageSizeChange={(size) => commit({ limit: size }, true)}
              />
            ) : null}
          </Card>
        </>
      ) : null}

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
                <PhoneCallButton phone={`+91${selected.mobile}`} className="h-10 w-full sm:w-auto" />
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
