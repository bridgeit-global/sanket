'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DmyDateInput } from '@/components/ui/dmy-date-input';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Printer, Paperclip, Search, X, Upload, Edit, Trash2, FileType, PhoneCall } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { RegisterAttachmentDialog } from '@/components/register-attachment-dialog';
import { RegisterSkeleton } from '@/components/module-skeleton';
import { TablePagination, usePagination } from '@/components/table-pagination';
import { ModulePageHeader } from '@/components/module-page-header';
import { useTranslations } from '@/hooks/use-translations';
import {
  buildRegisterSearchParams,
  parseRegisterFiltersFromSearchParams,
  type RegisterFilterState,
} from '@/lib/register/url-params';
import {
  coerceDocumentType,
  defaultReferencePrefix,
  DOCUMENT_TYPES,
  documentTypeLabel,
  formatReference,
  formatReferenceForDisplay,
  formatReferenceNumberForLocale,
  normalizeReferencePrefix,
  parseReference,
  type DocumentType,
} from '@/lib/letters/reference-sequence';
import type { LetterLocale } from '@/lib/letters/templates';
import type { DocumentTypeMasterRow } from '@/components/document-type-master-page';
import { toast } from '@/components/toast';
import Link from 'next/link';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { LimitedFormField } from '@/components/ui/limited-form-field';
import { FileUploadZone } from '@/components/ui/file-upload-zone';
import {
  REGISTER_ENTRY_FIELD_LIMITS,
  registerEntryFormSchema,
  validateForm,
} from '@/lib/validations';

interface Attachment {
  id: string;
  fileName: string;
  fileSizeKb: number;
  fileUrl: string | null;
  createdAt: string;
}

interface RegisterEntry {
  id: string;
  type: 'inward' | 'outward';
  documentType: string | null;
  date: string;
  fromTo: string;
  subject: string;
  projectId?: string;
  mode?: string;
  refNo?: string;
  officer?: string;
  assignedPerson?: string;
  assignedPhone?: string;
  attachments?: Attachment[];
  linkedToAdm?: boolean;
  linkedToProject?: boolean;
}

interface Project {
  id: string;
  name: string;
}

type RegisterFormState = {
  documentType: string;
  date: string;
  fromTo: string;
  subject: string;
  projectId: string;
  mode: string;
  refNo: string;
  refPrefix: string;
  refNumber: string;
  officer: string;
  assignedPerson: string;
  assignedPhone: string;
};

function createEmptyRegisterForm(
  type: 'inward' | 'outward',
): RegisterFormState {
  // Inward: document type optional. Outward: default General for ref sequencing.
  const documentType = type === 'outward' ? defaultReferencePrefix() : '';
  return {
    documentType,
    date: format(new Date(), 'yyyy-MM-dd'),
    fromTo: '',
    subject: '',
    projectId: '',
    mode: '',
    refNo: '',
    refPrefix: type === 'outward' ? documentType : '',
    refNumber: '',
    officer: '',
    assignedPerson: '',
    assignedPhone: '',
  };
}

export function RegisterModule({
  type,
  canDeleteAttachments = true,
}: {
  type: 'inward' | 'outward';
  canDeleteAttachments?: boolean;
}) {
  const { t, locale } = useTranslations();
  const letterLocale: LetterLocale = locale === 'mr' ? 'mr' : 'en';
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlState = parseRegisterFiltersFromSearchParams(searchParams);

  const [entries, setEntries] = useState<RegisterEntry[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [documentTypes, setDocumentTypes] = useState<DocumentTypeMasterRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<RegisterFormState>(() =>
    createEmptyRegisterForm(type),
  );
  const [attachmentDialogOpen, setAttachmentDialogOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<RegisterEntry | null>(null);
  const [editingEntry, setEditingEntry] = useState<RegisterEntry | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const referenceNumberAutoRef = useRef(true);
  const referenceSequenceRequestId = useRef(0);

  // File upload state for new entries
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [newEntryAttachmentDialogOpen, setNewEntryAttachmentDialogOpen] = useState(false);

  // Search state
  const [searchTerm, setSearchTerm] = useState(urlState.search);
  const [listPage, setListPage] = useState(urlState.page);
  const [listLimit, setListLimit] = useState(urlState.limit);

  const [filters, setFilters] = useState({
    startDate: urlState.startDate,
    endDate: urlState.endDate,
    projectIds: urlState.projectIds,
    projectStatus: urlState.projectStatus,
  });

  const syncRegisterUrl = useCallback(
    (updates: Partial<RegisterFilterState>, resetPage = false) => {
      const params = buildRegisterSearchParams(
        {
          startDate: updates.startDate ?? filters.startDate,
          endDate: updates.endDate ?? filters.endDate,
          projectIds: updates.projectIds ?? filters.projectIds,
          projectStatus: updates.projectStatus ?? filters.projectStatus,
          search: updates.search ?? searchTerm,
          page: resetPage ? 1 : (updates.page ?? listPage),
          limit: updates.limit ?? listLimit,
        },
        new URLSearchParams(searchParams.toString()),
      );
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname, searchParams, filters, searchTerm, listPage, listLimit],
  );

  const updateFilters = (
    next: typeof filters,
    options?: { resetPage?: boolean },
  ) => {
    setFilters(next);
    syncRegisterUrl(
      {
        startDate: next.startDate,
        endDate: next.endDate,
        projectIds: next.projectIds,
        projectStatus: next.projectStatus,
      },
      options?.resetPage ?? true,
    );
    if (options?.resetPage ?? true) setListPage(1);
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, filters]);

  const resolveOutwardRefNo = (state: RegisterFormState) => {
    if (type !== 'outward') return state.refNo || undefined;
    const prefix = state.refPrefix || state.documentType;
    const full = formatReference(prefix, state.refNumber);
    return full || undefined;
  };

  const refreshReferenceSequence = useCallback(
    async (prefixInput: string, { force = false }: { force?: boolean } = {}) => {
      if (type !== 'outward' || editingEntry) return;
      const prefix = normalizeReferencePrefix(prefixInput);
      if (!prefix) return;
      if (!force && !referenceNumberAutoRef.current) return;

      const requestId = ++referenceSequenceRequestId.current;
      try {
        const res = await fetch(
          `/api/reference-sequence?prefix=${encodeURIComponent(prefix)}`,
        );
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || 'Failed to load reference sequence');
        if (requestId !== referenceSequenceRequestId.current) return;
        if (!force && !referenceNumberAutoRef.current) return;
        referenceNumberAutoRef.current = true;
        setForm((prev) => ({
          ...prev,
          refPrefix: prefix,
          refNumber: formatReferenceNumberForLocale(json.nextNumber ?? 1, letterLocale),
        }));
      } catch (error) {
        console.error('Failed to load reference sequence', error);
      }
    },
    [type, editingEntry, letterLocale],
  );

  useEffect(() => {
    if (type !== 'outward') return;
    setForm((prev) => ({
      ...prev,
      refPrefix: prev.documentType,
      refNumber: formatReferenceNumberForLocale(prev.refNumber, letterLocale),
    }));
  }, [letterLocale, type]);

  useEffect(() => {
    if (type !== 'outward' || editingEntry) return;
    const prefix = normalizeReferencePrefix(form.refPrefix || form.documentType);
    if (!prefix) return;
    const timer = window.setTimeout(() => {
      void refreshReferenceSequence(prefix);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [
    type,
    editingEntry,
    form.refPrefix,
    form.documentType,
    refreshReferenceSequence,
    entries.length,
  ]);

  const clearFieldError = (field: string) => {
    setFormErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const DOCUMENT_TYPE_NONE = '__none__';

  const setDocumentType = (value: string) => {
    const next = value === DOCUMENT_TYPE_NONE ? '' : value;
    referenceNumberAutoRef.current = true;
    setForm((prev) => ({
      ...prev,
      documentType: next,
      refPrefix: type === 'outward' ? next : prev.refPrefix,
    }));
    clearFieldError('refNo');
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set('type', type);
      if (filters.startDate) {
        params.set('startDate', filters.startDate);
      }
      if (filters.endDate) {
        params.set('endDate', filters.endDate);
      }
      if (filters.projectIds.length > 0) {
        params.set('projectIds', filters.projectIds.join(','));
      }
      if (filters.projectStatus && filters.projectStatus !== 'all') {
        params.set('projectStatus', filters.projectStatus);
      }

      const [entriesRes, projectsRes, documentTypesRes] = await Promise.all([
        fetch(`/api/register?${params.toString()}`),
        fetch('/api/projects'),
        fetch('/api/document-types'),
      ]);

      if (entriesRes.ok) {
        const entriesData = await entriesRes.json();
        // Attachments are now included in the API response
        setEntries(entriesData);
      }

      if (projectsRes.ok) {
        const projectsData = await projectsRes.json();
        setProjects(projectsData);
      }

      if (documentTypesRes.ok) {
        const documentTypesData = await documentTypesRes.json();
        setDocumentTypes(
          (documentTypesData?.documentTypes ?? []) as DocumentTypeMasterRow[],
        );
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const validateRegisterForm = () => {
    const refNo = resolveOutwardRefNo(form);
    const validation = validateForm(registerEntryFormSchema, {
      date: form.date,
      fromTo: form.fromTo,
      subject: form.subject,
      projectId: form.projectId || undefined,
      mode: form.mode || undefined,
      refNo,
      officer: form.officer || undefined,
      assignedPerson: form.assignedPerson || undefined,
      assignedPhone: form.assignedPhone || undefined,
    });

    if (!validation.success) {
      setFormErrors(validation.errors);
      const firstError = Object.values(validation.errors)[0];
      if (firstError) toast.error(firstError);
      return false;
    }

    setFormErrors({});
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateRegisterForm()) return;

    try {
      const refNo = resolveOutwardRefNo(form);
      // Create the entry first
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          documentType: form.documentType,
          date: form.date,
          fromTo: form.fromTo,
          subject: form.subject,
          projectId: form.projectId || undefined,
          mode: form.mode || undefined,
          refNo,
          officer: form.officer || undefined,
          assignedPerson: form.assignedPerson || undefined,
          assignedPhone: form.assignedPhone || undefined,
          autoSequence: type === 'outward' ? referenceNumberAutoRef.current : undefined,
        }),
      });

      if (response.ok) {
        const newEntry = await response.json();

        // Upload files if any
        if (selectedFiles.length > 0) {
          setUploadingFiles(true);
          let successCount = 0;
          let errorCount = 0;

          for (const file of selectedFiles) {
            try {
              const formData = new FormData();
              formData.append('file', file);

              const uploadResponse = await fetch(`/api/register/${newEntry.id}/attachments`, {
                method: 'POST',
                body: formData,
              });

              if (uploadResponse.ok) {
                successCount++;
              } else {
                const errorData = await uploadResponse.json();
                toast.error(`Failed to upload ${file.name}: ${errorData.error}`);
                errorCount++;
              }
            } catch (error) {
              console.error('Upload error:', error);
              toast.error(`Failed to upload ${file.name}`);
              errorCount++;
            }
          }

          setUploadingFiles(false);

          if (successCount > 0) {
            toast.success(
              `Entry created and ${successCount} file${successCount > 1 ? 's' : ''} uploaded successfully`,
            );
          }
        } else {
          toast.success('Entry created successfully');
        }

        await loadData();
        setSelectedFiles([]);
        const nextForm = createEmptyRegisterForm(type);
        setForm(nextForm);
        referenceNumberAutoRef.current = true;
        if (type === 'outward') {
          await refreshReferenceSequence(nextForm.refPrefix, { force: true });
        }
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to create entry');
      }
    } catch (error) {
      console.error('Error creating register entry:', error);
      toast.error('Failed to create entry');
      setUploadingFiles(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleOpenAttachments = (entry: RegisterEntry) => {
    setSelectedEntry(entry);
    setAttachmentDialogOpen(true);
  };

  const handleAttachmentsChange = async () => {
    // Reload attachments for the selected entry
    if (selectedEntry) {
      try {
        const response = await fetch(`/api/register/${selectedEntry.id}`);
        if (response.ok) {
          const entryData = await response.json();
          // Update the entries list with new attachment data
          setEntries((prev) =>
            prev.map((e) =>
              e.id === selectedEntry.id
                ? { ...e, attachments: entryData.attachments || [] }
                : e,
            ),
          );
          // Update selected entry
          setSelectedEntry({ ...selectedEntry, attachments: entryData.attachments || [] });
        }
      } catch (error) {
        console.error('Error refreshing attachments:', error);
      }
    }
  };

  const startEditEntry = (entry: RegisterEntry) => {
    setEditingEntry(entry);
    referenceNumberAutoRef.current = false;
    const parsed =
      type === 'outward' ? parseReference(entry.refNo || '') : { prefix: '', number: '' };
    const documentType =
      type === 'outward'
        ? coerceDocumentType(parsed.prefix) ||
          entry.documentType ||
          defaultReferencePrefix()
        : entry.documentType || '';
    setForm({
      documentType,
      date: entry.date,
      fromTo: entry.fromTo,
      subject: entry.subject,
      projectId: entry.projectId || '',
      mode: entry.mode || '',
      refNo: entry.refNo || '',
      refPrefix: type === 'outward' ? documentType : '',
      refNumber: formatReferenceNumberForLocale(parsed.number, letterLocale),
      officer: entry.officer || '',
      assignedPerson: entry.assignedPerson || '',
      assignedPhone: entry.assignedPhone || '',
    });
  };

  const handleUpdateEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEntry) return;
    if (!validateRegisterForm()) return;

    try {
      const refNo = resolveOutwardRefNo(form);
      const response = await fetch(`/api/register/${editingEntry.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: form.date,
          fromTo: form.fromTo,
          subject: form.subject,
          documentType: form.documentType,
          projectId: form.projectId || undefined,
          mode: form.mode,
          refNo,
          officer: form.officer,
          assignedPerson: form.assignedPerson,
          assignedPhone: form.assignedPhone,
        }),
      });

      if (response.ok) {
        await loadData();
        setEditingEntry(null);
        toast.success('Entry updated successfully');
        const nextForm = createEmptyRegisterForm(type);
        setForm(nextForm);
        referenceNumberAutoRef.current = true;
        if (type === 'outward') {
          await refreshReferenceSequence(nextForm.refPrefix, { force: true });
        }
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to update entry');
      }
    } catch (error) {
      console.error('Error updating entry:', error);
      toast.error('Failed to update entry');
    }
  };

  const handleDeleteEntry = (entryId: string) => {
    setEntryToDelete(entryId);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteEntry = async () => {
    if (!entryToDelete) return;

    try {
      const response = await fetch(`/api/register/${entryToDelete}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await loadData();
        toast.success('Entry deleted successfully');
      } else {
        toast.error('Failed to delete entry');
      }
    } catch (error) {
      console.error('Error deleting entry:', error);
      toast.error('Failed to delete entry');
    } finally {
      setEntryToDelete(null);
      setDeleteDialogOpen(false);
    }
  };

  const heading = type === 'inward' ? t('register.inward') : t('register.outward');
  const labelFromTo = t('forms.fromTo');

  // Filter entries based on search term
  const filteredEntries = entries.filter((entry) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    const project = projects.find((p) => p.id === entry.projectId);
    return (
      entry.fromTo.toLowerCase().includes(search) ||
      entry.subject.toLowerCase().includes(search) ||
      (entry.mode || '').toLowerCase().includes(search) ||
      (entry.refNo || '').toLowerCase().includes(search) ||
      (entry.officer || '').toLowerCase().includes(search) ||
      (entry.assignedPerson || '').toLowerCase().includes(search) ||
      (entry.assignedPhone || '').toLowerCase().includes(search) ||
      (project?.name || '').toLowerCase().includes(search)
    );
  });

  // Pagination
  const {
    paginatedItems: paginatedEntries,
    currentPage,
    totalPages,
    pageSize,
    totalItems,
    handlePageChange,
    handlePageSizeChange,
  } = usePagination(filteredEntries, listLimit, {
    page: listPage,
    pageSize: listLimit,
    onPageChange: (page) => {
      setListPage(page);
      syncRegisterUrl({ page });
    },
    onPageSizeChange: (size) => {
      setListLimit(size);
      setListPage(1);
      syncRegisterUrl({ limit: size, page: 1 });
    },
  });

  if (loading) {
    return <RegisterSkeleton />;
  }

  return (
    <div className="flex min-w-0 flex-col gap-4 md:gap-6">
      {/* Print-only content */}
      <div className="register-print-content hidden">
        <div className="register-print-header">
          <h2>Hon&apos; MLA, Smt. Sana Malik Shaikh</h2>
          <h1>{heading}</h1>
          <p className="print-date">Printed on: {format(new Date(), 'dd MMM yyyy')}</p>
        </div>

        {filteredEntries.length > 0 ? (
          <div className="register-section">
            <table className="register-table">
              <thead>
                <tr>
                  <th>Sr.</th>
                  <th>Date</th>
                  <th>{labelFromTo}</th>
                  <th>Subject</th>
                  <th>Project</th>
                  <th>Mode</th>
                  <th>Ref No.</th>
                  <th>Officer</th>
                  <th>{t('register.assignedPerson')}</th>
                  <th>{t('register.assignedPhone')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredEntries.map((entry, index) => {
                  const project = projects.find((p) => p.id === entry.projectId);
                  return (
                    <tr key={entry.id}>
                      <td>{index + 1}</td>
                      <td>{format(new Date(entry.date), 'dd MMM yyyy')}</td>
                      <td>{entry.fromTo}</td>
                      <td>{entry.subject}</td>
                      <td>{project?.name || '-'}</td>
                      <td>{entry.mode || '-'}</td>
                      <td>
                        {entry.refNo
                          ? formatReferenceForDisplay(entry.refNo, letterLocale)
                          : '-'}
                      </td>
                      <td>{entry.officer || '-'}</td>
                      <td>{entry.assignedPerson || '-'}</td>
                      <td>{entry.assignedPhone || '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="no-entries">
            <p>No entries found.</p>
          </div>
        )}
      </div>

      <ModulePageHeader
        title={heading}
        description={type === 'inward' ? t('register.manageIncoming') : t('register.manageOutgoing')}
        actions={
          type === 'outward' ? (
            <Button variant="outline" size="sm" asChild>
              <Link href="/modules/letter-generation/document-types?from=outward">
                <FileType className="mr-2 h-4 w-4" />
                {t('register.manageDocumentTypes')}
              </Link>
            </Button>
          ) : undefined
        }
      />

      <Card className="no-print">
        <CardHeader className="p-4 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-lg sm:text-2xl">{heading}</CardTitle>
            <Button variant="outline" size="sm" onClick={handlePrint} className="w-full sm:w-auto">
              <Printer className="mr-2 h-4 w-4" />
              {t('register.printRegister')}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-6">
            <div className="space-y-2 xl:col-span-2">
              <Label htmlFor="documentType">
                {t('letterGeneration.fields.referencePrefix')}
                {type === 'outward' ? ' *' : ''}
              </Label>
              <Select
                value={form.documentType || DOCUMENT_TYPE_NONE}
                onValueChange={setDocumentType}
              >
                <SelectTrigger id="documentType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {type === 'inward' ? (
                    <SelectItem value={DOCUMENT_TYPE_NONE}>—</SelectItem>
                  ) : null}
                  {(documentTypes.length > 0
                    ? documentTypes.map((docType) => docType.code)
                    : [...DOCUMENT_TYPES]
                  ).map((docType) => (
                    <SelectItem key={docType} value={docType}>
                      {documentTypeLabel(docType, letterLocale, documentTypes)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 xl:col-span-2">
              <Label htmlFor="date">{t('common.date')}</Label>
              <DmyDateInput
                id="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2 sm:col-span-2 xl:col-span-2">
              <LimitedFormField
                id="fromTo"
                label={labelFromTo}
                placeholder={t('forms.placeholder.fromTo')}
                value={form.fromTo}
                maxLength={REGISTER_ENTRY_FIELD_LIMITS.fromTo}
                error={formErrors.fromTo}
                required
                onChange={(value) => {
                  setForm({ ...form, fromTo: value });
                  clearFieldError('fromTo');
                }}
              />
            </div>
            <div className="space-y-2 sm:col-span-2 xl:col-span-3">
              <LimitedFormField
                id="subject"
                label={t('forms.subject')}
                placeholder={t('forms.placeholder.subject')}
                value={form.subject}
                maxLength={REGISTER_ENTRY_FIELD_LIMITS.subject}
                error={formErrors.subject}
                required
                onChange={(value) => {
                  setForm({ ...form, subject: value });
                  clearFieldError('subject');
                }}
              />
            </div>
            <div className="space-y-2 xl:col-span-3">
              <Label htmlFor="project">Project</Label>
              <Select
                value={form.projectId || 'none'}
                onValueChange={(value) =>
                  setForm({ ...form, projectId: value === 'none' ? '' : value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select project (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 xl:col-span-2">
              <LimitedFormField
                id="mode"
                label="Mode"
                placeholder="Hand / Email / Dak / Courier..."
                value={form.mode}
                maxLength={REGISTER_ENTRY_FIELD_LIMITS.mode}
                error={formErrors.mode}
                onChange={(value) => {
                  setForm({ ...form, mode: value });
                  clearFieldError('mode');
                }}
              />
            </div>
            <div className="space-y-2 xl:col-span-2">
              {type === 'outward' ? (
                <LimitedFormField
                  id="refNumber"
                  label={t('letterGeneration.fields.referenceNo')}
                  placeholder={t('letterGeneration.placeholders.referenceNo')}
                  value={form.refNumber}
                  maxLength={REGISTER_ENTRY_FIELD_LIMITS.refNo}
                  error={formErrors.refNo}
                  onChange={(value) => {
                    referenceNumberAutoRef.current = false;
                    setForm({
                      ...form,
                      refPrefix: form.documentType,
                      refNumber: formatReferenceNumberForLocale(value, letterLocale),
                    });
                    clearFieldError('refNo');
                  }}
                />
              ) : (
                <LimitedFormField
                  id="refNo"
                  label="Reference No."
                  placeholder="Diary no., email id, dak no..."
                  value={form.refNo}
                  maxLength={REGISTER_ENTRY_FIELD_LIMITS.refNo}
                  error={formErrors.refNo}
                  onChange={(value) => {
                    setForm({ ...form, refNo: value });
                    clearFieldError('refNo');
                  }}
                />
              )}
            </div>
            <div className="space-y-2 xl:col-span-2">
              <LimitedFormField
                id="officer"
                label="Marked to Officer"
                placeholder="PA, PRO, Office staff..."
                value={form.officer}
                maxLength={REGISTER_ENTRY_FIELD_LIMITS.officer}
                error={formErrors.officer}
                onChange={(value) => {
                  setForm({ ...form, officer: value });
                  clearFieldError('officer');
                }}
              />
            </div>
            <div className="space-y-2 xl:col-span-3">
              <LimitedFormField
                id="assignedPerson"
                label={t('register.assignedPerson')}
                placeholder={t('register.assignedPersonPlaceholder')}
                value={form.assignedPerson}
                maxLength={REGISTER_ENTRY_FIELD_LIMITS.assignedPerson}
                error={formErrors.assignedPerson}
                onChange={(value) => {
                  setForm({ ...form, assignedPerson: value });
                  clearFieldError('assignedPerson');
                }}
              />
            </div>
            <div className="space-y-2 xl:col-span-3">
              <LimitedFormField
                id="assignedPhone"
                label={t('register.assignedPhone')}
                placeholder={t('register.assignedPhonePlaceholder')}
                value={form.assignedPhone}
                maxLength={REGISTER_ENTRY_FIELD_LIMITS.assignedPhone}
                error={formErrors.assignedPhone}
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                onChange={(value) => {
                  setForm({ ...form, assignedPhone: value });
                  clearFieldError('assignedPhone');
                }}
              />
            </div>
            <div className="space-y-2 sm:col-span-2 xl:col-span-6">
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setNewEntryAttachmentDialogOpen(true)}
                  className="w-fit"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  {selectedFiles.length > 0 ? 'Edit Files' : 'Select Files'}
                </Button>
                {selectedFiles.length > 0 && (
                  <span className="text-sm text-muted-foreground">
                    {selectedFiles.length} file{selectedFiles.length > 1 ? 's' : ''} queued
                  </span>
                )}
              </div>
              <Dialog
                open={newEntryAttachmentDialogOpen}
                onOpenChange={setNewEntryAttachmentDialogOpen}
              >
                <DialogContent className="w-[calc(100%-2rem)] max-w-xl">
                  <DialogHeader>
                    <DialogTitle>Select entry attachments</DialogTitle>
                    <DialogDescription>
                      Files will upload after the register entry is created.
                    </DialogDescription>
                  </DialogHeader>
                  <FileUploadZone
                    multiple
                    value={selectedFiles}
                    onValueChange={setSelectedFiles}
                    disabled={uploadingFiles}
                    showFileList
                    validation={{
                      accept: '.pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx,.xls,.xlsx,.txt',
                      maxSizeBytes: 10 * 1024 * 1024,
                    }}
                    title="Drop files here or click to browse"
                    description="PDF, images, Word, Excel, or text files (maximum 10 MB each)"
                  />
                  <DialogFooter>
                    <Button type="button" onClick={() => setNewEntryAttachmentDialogOpen(false)}>
                      Done
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
            <div className="flex sm:col-span-2 sm:justify-end xl:col-span-6">
              <Button type="submit" disabled={uploadingFiles} className="w-full sm:w-auto">
                {uploadingFiles ? 'Uploading...' : 'Add Entry'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="no-print">
        <CardHeader className="p-4 sm:p-6">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-lg sm:text-2xl">Entries</CardTitle>
            <span className="text-sm text-muted-foreground">
              {filteredEntries.length} of {entries.length} entries
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
          {/* Filters */}
          <div className="mb-4 space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="startDate" className="text-xs text-muted-foreground">Start Date</Label>
                <DmyDateInput
                  id="startDate"
                  value={filters.startDate}
                  onChange={(e) => updateFilters({ ...filters, startDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate" className="text-xs text-muted-foreground">End Date</Label>
                <DmyDateInput
                  id="endDate"
                  value={filters.endDate}
                  onChange={(e) => updateFilters({ ...filters, endDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="projectStatus" className="text-xs text-muted-foreground">Project Status</Label>
                <Select
                  value={filters.projectStatus}
                  onValueChange={(value) => {
                    updateFilters({
                      ...filters,
                      projectStatus: value as typeof filters.projectStatus,
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="Concept">Concept</SelectItem>
                    <SelectItem value="Proposal">Proposal</SelectItem>
                    <SelectItem value="In Progress">In Progress</SelectItem>
                    <SelectItem value="Completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="projects" className="text-xs text-muted-foreground">Projects</Label>
                <div className="relative">
                  <Select
                    value="__placeholder__"
                    onValueChange={(value) => {
                      if (value && value !== '__placeholder__' && !filters.projectIds.includes(value)) {
                        updateFilters({
                          ...filters,
                          projectIds: [...filters.projectIds, value],
                        });
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select projects..." />
                    </SelectTrigger>
                    <SelectContent>
                      {projects
                        .filter((p) => !filters.projectIds.includes(p.id))
                        .map((project) => (
                          <SelectItem key={project.id} value={project.id}>
                            {project.name}
                          </SelectItem>
                        ))}
                      {projects.filter((p) => !filters.projectIds.includes(p.id)).length === 0 && (
                        <div className="px-2 py-1.5 text-sm text-muted-foreground">
                          No more projects
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            {filters.projectIds.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {filters.projectIds.map((projectId) => {
                  const project = projects.find((p) => p.id === projectId);
                  return (
                    <Badge
                      key={projectId}
                      variant="secondary"
                      className="text-xs cursor-pointer"
                      onClick={() =>
                        updateFilters({
                          ...filters,
                          projectIds: filters.projectIds.filter((id) => id !== projectId),
                        })
                      }
                    >
                      {project?.name || projectId}
                      <X className="ml-1 h-3 w-3" />
                    </Badge>
                  );
                })}
              </div>
            )}
            {(filters.startDate || filters.endDate || filters.projectIds.length > 0 || filters.projectStatus !== 'all') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const cleared = {
                    startDate: '',
                    endDate: '',
                    projectIds: [] as string[],
                    projectStatus: 'all' as const,
                  };
                  setFilters(cleared);
                  setListPage(1);
                  syncRegisterUrl({ ...cleared, page: 1 }, true);
                }}
                className="h-8"
              >
                Clear Filters
              </Button>
            )}
          </div>
          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by sender, subject, person, phone, project, mode..."
              value={searchTerm}
              onChange={(e) => {
                const value = e.target.value;
                setSearchTerm(value);
                setListPage(1);
                syncRegisterUrl({ search: value, page: 1 }, true);
              }}
              className="pl-9"
            />
          </div>
          {paginatedEntries.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {entries.length === 0 ? 'No entries yet.' : 'No entries match your search.'}
            </p>
          ) : (
            <>
              <div className="space-y-3 xl:hidden">
                {paginatedEntries.map((entry) => {
                  const project = projects.find((p) => p.id === entry.projectId);
                  return (
                    <div
                      key={entry.id}
                      className="space-y-3 rounded-lg border p-3 sm:p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-muted-foreground text-xs">
                            {format(new Date(entry.date), 'dd MMM yyyy')}
                          </p>
                          <p className="font-medium break-words">{entry.subject}</p>
                          <p className="text-muted-foreground text-sm break-words">
                            {labelFromTo}: {entry.fromTo}
                          </p>
                          <div className="mt-1.5 flex flex-wrap gap-1.5">
                            {entry.linkedToAdm && (
                              <Badge variant="outline" className="text-[10px]">
                                Linked to ADM
                              </Badge>
                            )}
                            {entry.linkedToProject && (
                              <Badge variant="outline" className="text-[10px]">
                                Linked to Project
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex shrink-0 gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            asChild
                            title={t('govFollowUp.startFollowUp')}
                          >
                            <Link
                              href={`/modules/gov-follow-up?new=1&registerEntryId=${entry.id}`}
                            >
                              <PhoneCall className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => startEditEntry(entry)}
                            title="Edit entry"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteEntry(entry.id)}
                            title="Delete entry"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
                        <div className="min-w-0">
                          <dt className="text-muted-foreground text-xs">Project</dt>
                          <dd className="break-words">{project?.name || '-'}</dd>
                        </div>
                        <div className="min-w-0">
                          <dt className="text-muted-foreground text-xs">Mode</dt>
                          <dd className="break-words">{entry.mode || '-'}</dd>
                        </div>
                        <div className="min-w-0">
                          <dt className="text-muted-foreground text-xs">Ref No.</dt>
                          <dd className="break-words">
                            {entry.refNo
                              ? formatReferenceForDisplay(entry.refNo, letterLocale)
                              : '-'}
                          </dd>
                        </div>
                        <div className="min-w-0">
                          <dt className="text-muted-foreground text-xs">Officer</dt>
                          <dd className="break-words">{entry.officer || '-'}</dd>
                        </div>
                        <div className="min-w-0">
                          <dt className="text-muted-foreground text-xs">
                            {t('register.assignedPerson')}
                          </dt>
                          <dd className="break-words">{entry.assignedPerson || '-'}</dd>
                        </div>
                        <div className="min-w-0">
                          <dt className="text-muted-foreground text-xs">
                            {t('register.assignedPhone')}
                          </dt>
                          <dd className="break-words">{entry.assignedPhone || '-'}</dd>
                        </div>
                      </dl>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 w-full gap-1.5 sm:w-auto"
                        onClick={() => handleOpenAttachments(entry)}
                      >
                        <Paperclip className="h-3.5 w-3.5" />
                        {entry.attachments && entry.attachments.length > 0 ? (
                          <span className="text-xs">
                            {entry.attachments.length === 1
                              ? '1 attachment'
                              : `${entry.attachments.length} attachments`}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            Add attachment
                          </span>
                        )}
                      </Button>
                    </div>
                  );
                })}
              </div>
              <div className="hidden overflow-x-auto xl:block">
                <Table className="w-full min-w-[1080px] table-fixed [&_td]:break-words [&_td]:px-2">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="h-auto w-[8%] whitespace-normal px-2 py-2">Date</TableHead>
                      <TableHead className="h-auto w-[11%] whitespace-normal px-2 py-2">{labelFromTo}</TableHead>
                      <TableHead className="h-auto w-[13%] whitespace-normal px-2 py-2">Subject</TableHead>
                      <TableHead className="h-auto w-[8%] whitespace-normal px-2 py-2">Project</TableHead>
                      <TableHead className="h-auto w-[8%] whitespace-normal px-2 py-2">Mode</TableHead>
                      <TableHead className="h-auto w-[8%] whitespace-normal px-2 py-2">Ref No.</TableHead>
                      <TableHead className="h-auto w-[8%] whitespace-normal px-2 py-2">Officer</TableHead>
                      <TableHead className="h-auto w-[9%] whitespace-normal px-2 py-2">{t('register.assignedPerson')}</TableHead>
                      <TableHead className="h-auto w-[8%] whitespace-normal px-2 py-2">{t('register.assignedPhone')}</TableHead>
                      <TableHead className="no-print h-auto w-[7%] whitespace-normal px-2 py-2">Attachments</TableHead>
                      <TableHead className="no-print h-auto w-[12%] whitespace-normal px-2 py-2 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedEntries.map((entry) => {
                      const project = projects.find((p) => p.id === entry.projectId);
                      return (
                        <TableRow key={entry.id}>
                          <TableCell className="whitespace-nowrap align-top">
                            {format(new Date(entry.date), 'dd MMM yyyy')}
                          </TableCell>
                          <TableCell className="align-top break-words">{entry.fromTo}</TableCell>
                          <TableCell className="align-top font-medium">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="line-clamp-3 break-words" title={entry.subject}>{entry.subject}</span>
                              {entry.linkedToAdm && (
                                <Badge variant="outline" className="text-[10px]">
                                  Linked to ADM
                                </Badge>
                              )}
                              {entry.linkedToProject && (
                                <Badge variant="outline" className="text-[10px]">
                                  Linked to Project
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="align-top break-words">{project?.name || '-'}</TableCell>
                          <TableCell className="align-top break-words">{entry.mode || '-'}</TableCell>
                          <TableCell className="align-top break-words">
                            {entry.refNo
                              ? formatReferenceForDisplay(entry.refNo, letterLocale)
                              : '-'}
                          </TableCell>
                          <TableCell className="align-top break-words">{entry.officer || '-'}</TableCell>
                          <TableCell className="align-top break-words">{entry.assignedPerson || '-'}</TableCell>
                          <TableCell className="align-top break-words">{entry.assignedPhone || '-'}</TableCell>
                          <TableCell className="no-print align-top">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 gap-1.5"
                              onClick={() => handleOpenAttachments(entry)}
                            >
                              <Paperclip className="h-3.5 w-3.5" />
                              {entry.attachments && entry.attachments.length > 0 ? (
                                <span className="text-xs">
                                  {entry.attachments.length}
                                </span>
                              ) : (
                                <span className="text-xs text-muted-foreground">
                                  Add
                                </span>
                              )}
                            </Button>
                          </TableCell>
                          <TableCell className="no-print align-top text-right">
                            <div className="flex justify-end gap-0.5">
                              <Button
                                variant="ghost"
                                size="sm"
                                asChild
                                title={t('govFollowUp.startFollowUp')}
                              >
                                <Link
                                  href={`/modules/gov-follow-up?new=1&registerEntryId=${entry.id}`}
                                >
                                  <PhoneCall className="h-4 w-4" />
                                </Link>
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => startEditEntry(entry)}
                                title="Edit entry"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteEntry(entry.id)}
                                title="Delete entry"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
          {filteredEntries.length > 0 && (
            <TablePagination
              currentPage={currentPage}
              totalPages={totalPages}
              pageSize={pageSize}
              totalItems={totalItems}
              onPageChange={handlePageChange}
              onPageSizeChange={handlePageSizeChange}
            />
          )}
        </CardContent>
      </Card>

      {/* Edit Entry Dialog */}
      <Dialog open={!!editingEntry} onOpenChange={() => {
        setEditingEntry(null);
        setFormErrors({});
        // Reset form when closing
        const nextForm = createEmptyRegisterForm(type);
        setForm(nextForm);
        referenceNumberAutoRef.current = true;
        if (type === 'outward') {
          void refreshReferenceSequence(nextForm.refPrefix, { force: true });
        }
      }}>
        <DialogContent className="max-h-[90vh] w-[calc(100%-1.5rem)] max-w-2xl overflow-y-auto p-4 sm:w-full sm:p-6">
          <DialogHeader>
            <DialogTitle>Edit Register Entry</DialogTitle>
            <DialogDescription>
              Update the details of this {editingEntry?.type} entry
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateEntry} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Type</Label>
                <Input value={editingEntry?.type} disabled />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-documentType">
                  {t('letterGeneration.fields.referencePrefix')}
                  {type === 'outward' ? ' *' : ''}
                </Label>
                <Select
                  value={form.documentType || DOCUMENT_TYPE_NONE}
                  onValueChange={setDocumentType}
                >
                  <SelectTrigger id="edit-documentType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {type === 'inward' ? (
                      <SelectItem value={DOCUMENT_TYPE_NONE}>—</SelectItem>
                    ) : null}
                    {(documentTypes.length > 0
                      ? documentTypes.map((docType) => docType.code)
                      : [...DOCUMENT_TYPES]
                    ).map((docType) => (
                      <SelectItem key={docType} value={docType}>
                        {documentTypeLabel(docType, letterLocale, documentTypes)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-date">Date *</Label>
                <DmyDateInput
                  id="edit-date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <LimitedFormField
                id="edit-fromTo"
                label={editingEntry?.type === 'inward' ? 'From' : 'To'}
                value={form.fromTo}
                maxLength={REGISTER_ENTRY_FIELD_LIMITS.fromTo}
                error={formErrors.fromTo}
                required
                onChange={(value) => {
                  setForm({ ...form, fromTo: value });
                  clearFieldError('fromTo');
                }}
              />
            </div>
            <div className="space-y-2">
              <LimitedFormField
                id="edit-subject"
                label="Subject"
                value={form.subject}
                maxLength={REGISTER_ENTRY_FIELD_LIMITS.subject}
                error={formErrors.subject}
                required
                onChange={(value) => {
                  setForm({ ...form, subject: value });
                  clearFieldError('subject');
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-project">Project</Label>
              <Select
                value={form.projectId || 'none'}
                onValueChange={(value) =>
                  setForm({ ...form, projectId: value === 'none' ? '' : value })
                }
              >
                <SelectTrigger id="edit-project">
                  <SelectValue placeholder="Select project (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <LimitedFormField
                  id="edit-mode"
                  label="Mode"
                  value={form.mode}
                  maxLength={REGISTER_ENTRY_FIELD_LIMITS.mode}
                  error={formErrors.mode}
                  onChange={(value) => {
                    setForm({ ...form, mode: value });
                    clearFieldError('mode');
                  }}
                />
              </div>
              <div className="space-y-2">
                {type === 'outward' ? (
                  <LimitedFormField
                    id="edit-refNumber"
                    label={t('letterGeneration.fields.referenceNo')}
                    placeholder={t('letterGeneration.placeholders.referenceNo')}
                    value={form.refNumber}
                    maxLength={REGISTER_ENTRY_FIELD_LIMITS.refNo}
                    error={formErrors.refNo}
                    onChange={(value) => {
                      setForm({
                        ...form,
                        refPrefix: form.documentType,
                        refNumber: formatReferenceNumberForLocale(value, letterLocale),
                      });
                      clearFieldError('refNo');
                    }}
                  />
                ) : (
                  <LimitedFormField
                    id="edit-refNo"
                    label="Reference No"
                    value={form.refNo}
                    maxLength={REGISTER_ENTRY_FIELD_LIMITS.refNo}
                    error={formErrors.refNo}
                    onChange={(value) => {
                      setForm({ ...form, refNo: value });
                      clearFieldError('refNo');
                    }}
                  />
                )}
              </div>
              <div className="space-y-2">
                <LimitedFormField
                  id="edit-officer"
                  label="Officer"
                  value={form.officer}
                  maxLength={REGISTER_ENTRY_FIELD_LIMITS.officer}
                  error={formErrors.officer}
                  onChange={(value) => {
                    setForm({ ...form, officer: value });
                    clearFieldError('officer');
                  }}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <LimitedFormField
                id="edit-assignedPerson"
                label={t('register.assignedPerson')}
                placeholder={t('register.assignedPersonPlaceholder')}
                value={form.assignedPerson}
                maxLength={REGISTER_ENTRY_FIELD_LIMITS.assignedPerson}
                error={formErrors.assignedPerson}
                onChange={(value) => {
                  setForm({ ...form, assignedPerson: value });
                  clearFieldError('assignedPerson');
                }}
              />
              <LimitedFormField
                id="edit-assignedPhone"
                label={t('register.assignedPhone')}
                placeholder={t('register.assignedPhonePlaceholder')}
                value={form.assignedPhone}
                maxLength={REGISTER_ENTRY_FIELD_LIMITS.assignedPhone}
                error={formErrors.assignedPhone}
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                onChange={(value) => {
                  setForm({ ...form, assignedPhone: value });
                  clearFieldError('assignedPhone');
                }}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setEditingEntry(null);
                  const nextForm = createEmptyRegisterForm(type);
                  setForm(nextForm);
                  referenceNumberAutoRef.current = true;
                  if (type === 'outward') {
                    void refreshReferenceSequence(nextForm.refPrefix, { force: true });
                  }
                }}
              >
                Cancel
              </Button>
              <Button type="submit">Save Changes</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Entry"
        description="Are you sure you want to delete this register entry? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
        onConfirm={confirmDeleteEntry}
      />

      {/* Attachment Dialog */}
      {selectedEntry && (
        <RegisterAttachmentDialog
          open={attachmentDialogOpen}
          onOpenChange={setAttachmentDialogOpen}
          entryId={selectedEntry.id}
          entrySubject={selectedEntry.subject}
          attachments={selectedEntry.attachments || []}
          onAttachmentsChange={handleAttachmentsChange}
          canDeleteAttachments={canDeleteAttachments}
        />
      )}
    </div>
  );
}

