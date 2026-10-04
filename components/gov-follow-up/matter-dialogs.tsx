'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ChevronDown,
  FileText,
  Inbox,
  Loader2,
  Paperclip,
  Trash2,
  Upload,
} from 'lucide-react';
import { toast } from '@/components/toast';
import { FilePreviewButton } from '@/components/file-preview-button';
import { Button } from '@/components/ui/button';
import { DmyDateInput } from '@/components/ui/dmy-date-input';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTranslations } from '@/hooks/use-translations';
import { cn } from '@/lib/utils';
import {
  formatShortDisplayDateIST,
  getTodayDateStringIST,
} from '@/lib/ist-date';
import {
  GOV_FOLLOW_UP_LOG_KINDS,
  GOV_FOLLOW_UP_MODES,
  GOV_FOLLOW_UP_PRIORITIES,
  GOV_FOLLOW_UP_STATUSES,
  isOpenGovFollowUpStatus,
  locationsForDepartment,
} from '@/lib/gov-follow-up/constants';
import {
  defaultGovFollowUpLogBody,
  GOV_FOLLOW_UP_WORKFLOW_KINDS,
  needsPendingWithFields,
  suggestedNextLogKind,
  suggestedStatusForLogKind,
  workflowStepOf,
} from '@/lib/gov-follow-up/workflow';
import type {
  GovFollowUpCatalogs,
  GovFollowUpLogInput,
  GovFollowUpMatterInput,
} from '@/lib/gov-follow-up/types';
import type {
  GovFollowUpLogKind,
  GovFollowUpMatterDetail,
  GovFollowUpMode,
  GovFollowUpPriority,
  GovFollowUpStatus,
} from '@/lib/db/schema';
import { pendingWithLabel } from './matter-table';
import {
  GovFollowUpPriorityBadge,
  GovFollowUpStatusBadge,
  isMatterOverdue,
} from './matter-status';
import { govFollowUpLetterGenerationHref } from '@/lib/gov-follow-up/url-params';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { OfficerPicker } from './officer-picker';

export type MatterFormState = {
  subject: string;
  departmentId: string;
  locationId: string;
  officeName: string;
  officerName: string;
  designation: string;
  contactPhone: string;
  contactEmail: string;
  deskName: string;
  presentStage: string;
  staffUserId: string;
  dateSubmitted: string;
  inwardRefNo: string;
  nextAction: string;
  nextFollowUpOn: string;
  priority: GovFollowUpPriority;
  status: GovFollowUpStatus;
  remarks: string;
  letterId: string;
  registerEntryId: string;
};

export function emptyMatterForm(): MatterFormState {
  return {
    subject: '',
    departmentId: '',
    locationId: '',
    officeName: '',
    officerName: '',
    designation: '',
    contactPhone: '',
    contactEmail: '',
    deskName: '',
    presentStage: '',
    staffUserId: '',
    dateSubmitted: getTodayDateStringIST(),
    inwardRefNo: '',
    nextAction: '',
    nextFollowUpOn: getTodayDateStringIST(),
    priority: 'normal',
    status: 'pending',
    remarks: '',
    letterId: '',
    registerEntryId: '',
  };
}

function formToInput(form: MatterFormState): GovFollowUpMatterInput {
  return {
    subject: form.subject,
    departmentId: form.departmentId,
    locationId: form.locationId,
    officeName: form.officeName,
    officerName: form.officerName,
    designation: form.designation,
    contactPhone: form.contactPhone,
    contactEmail: form.contactEmail,
    deskName: form.deskName,
    presentStage: form.presentStage,
    staffUserId: form.staffUserId || null,
    dateSubmitted: form.dateSubmitted,
    inwardRefNo: form.inwardRefNo,
    nextAction: form.nextAction,
    nextFollowUpOn: form.nextFollowUpOn,
    priority: form.priority,
    status: form.status,
    remarks: form.remarks,
    letterId: form.letterId || null,
    registerEntryId: form.registerEntryId || null,
  };
}

type LogDraft = {
  kind: GovFollowUpLogKind;
  mode: GovFollowUpMode | '';
  occurredOn: string;
  body: string;
  nextAction: string;
  nextFollowUpOn: string;
  status: GovFollowUpStatus;
  departmentId: string;
  locationId: string;
  officeName: string;
  officerName: string;
  designation: string;
  deskName: string;
  presentStage: string;
  inwardRefNo: string;
};

function isSameDraft(a: LogDraft | null, b: LogDraft): boolean {
  if (a == null) return true;
  return JSON.stringify(a) === JSON.stringify(b);
}

function Field({
  id,
  label,
  required,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </Label>
      {children}
    </div>
  );
}

function FormSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3 rounded-lg border bg-muted/20 p-4">
      <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
      {children}
    </section>
  );
}

function WorkflowStepper({
  current,
}: {
  current: GovFollowUpLogKind | null;
}) {
  const { t } = useTranslations();
  const currentStep = workflowStepOf(current);
  const currentIndex = currentStep
    ? GOV_FOLLOW_UP_WORKFLOW_KINDS.indexOf(currentStep)
    : -1;
  return (
    <ol className="flex flex-wrap items-center gap-x-1 gap-y-1 text-[11px] leading-tight">
      {GOV_FOLLOW_UP_WORKFLOW_KINDS.map((step, index) => {
        const reached = currentIndex >= 0 && index <= currentIndex;
        const active = step === currentStep;
        return (
          <li key={step} className="flex items-center gap-1">
            {index > 0 ? (
              <span className="text-muted-foreground">→</span>
            ) : null}
            <span
              className={cn(
                active && 'text-foreground font-semibold',
                reached && !active && 'text-foreground',
                !reached && 'text-muted-foreground',
              )}
            >
              {t(`govFollowUp.kind.${step}`)}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function MatterFields({
  form,
  setForm,
  catalogs,
  idPrefix,
}: {
  form: MatterFormState;
  setForm: (next: MatterFormState) => void;
  catalogs: GovFollowUpCatalogs;
  idPrefix: string;
}) {
  const { t } = useTranslations();
  const set = (patch: Partial<MatterFormState>) => setForm({ ...form, ...patch });
  const departmentCode = catalogs.departments.find(
    (dept) => dept.id === form.departmentId,
  )?.code;
  const departmentLocations = useMemo(
    () =>
      locationsForDepartment(catalogs.locations, form.departmentId, {
        departmentCode,
        includeLocationId: form.locationId,
      }),
    [catalogs.locations, departmentCode, form.departmentId, form.locationId],
  );

  return (
    <div className="space-y-4">
      <FormSection title={t('govFollowUp.sections.matter')}>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="md:col-span-2">
            <Field
              id={`${idPrefix}-subject`}
              label={t('govFollowUp.fields.subject')}
              required
            >
              <Input
                id={`${idPrefix}-subject`}
                value={form.subject}
                onChange={(e) => set({ subject: e.target.value })}
                required
              />
            </Field>
          </div>
          <Field
            id={`${idPrefix}-department`}
            label={t('govFollowUp.fields.department')}
            required
          >
            <Select
              value={form.departmentId}
              onValueChange={(value) => {
                const nextCode = catalogs.departments.find(
                  (dept) => dept.id === value,
                )?.code;
                const allowed = locationsForDepartment(
                  catalogs.locations,
                  value,
                  { departmentCode: nextCode },
                );
                const locationId = allowed.some(
                  (loc) => loc.id === form.locationId,
                )
                  ? form.locationId
                  : allowed.length === 1
                    ? allowed[0].id
                    : '';
                set({ departmentId: value, locationId });
              }}
            >
              <SelectTrigger id={`${idPrefix}-department`}>
                <SelectValue placeholder={t('govFollowUp.selectDepartment')} />
              </SelectTrigger>
              <SelectContent>
                {catalogs.departments.map((dept) => (
                  <SelectItem key={dept.id} value={dept.id}>
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field
            id={`${idPrefix}-location`}
            label={t('govFollowUp.fields.location')}
            required
          >
            <Select
              value={form.locationId || undefined}
              onValueChange={(value) => set({ locationId: value })}
              disabled={!form.departmentId}
            >
              <SelectTrigger id={`${idPrefix}-location`}>
                <SelectValue placeholder={t('govFollowUp.selectLocation')} />
              </SelectTrigger>
              <SelectContent>
                {departmentLocations.map((loc) => (
                  <SelectItem key={loc.id} value={loc.id}>
                    {loc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field
            id={`${idPrefix}-submitted`}
            label={t('govFollowUp.fields.dateSubmitted')}
          >
            <DmyDateInput
              id={`${idPrefix}-submitted`}
              value={form.dateSubmitted}
              onValueChange={(ymd) => set({ dateSubmitted: ymd })}
            />
          </Field>
          <Field
            id={`${idPrefix}-inward`}
            label={t('govFollowUp.fields.inwardRefNo')}
          >
            <Input
              id={`${idPrefix}-inward`}
              value={form.inwardRefNo}
              onChange={(e) => set({ inwardRefNo: e.target.value })}
            />
          </Field>
          <Field
            id={`${idPrefix}-priority`}
            label={t('govFollowUp.fields.priority')}
          >
            <Select
              value={form.priority}
              onValueChange={(value) =>
                set({ priority: value as GovFollowUpPriority })
              }
            >
              <SelectTrigger id={`${idPrefix}-priority`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {GOV_FOLLOW_UP_PRIORITIES.map((priority) => (
                  <SelectItem key={priority} value={priority}>
                    {t(`govFollowUp.priority.${priority}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field id={`${idPrefix}-status`} label={t('govFollowUp.fields.status')}>
            <Select
              value={form.status}
              onValueChange={(value) =>
                set({ status: value as GovFollowUpStatus })
              }
            >
              <SelectTrigger id={`${idPrefix}-status`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {GOV_FOLLOW_UP_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {t(`govFollowUp.status.${status}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
      </FormSection>

      <FormSection title={t('govFollowUp.sections.pendingWith')}>
        <div className="grid gap-3 md:grid-cols-2">
          <OfficerPicker
            id={`${idPrefix}-officer`}
            catalogs={catalogs}
            officerName={form.officerName}
            preferWard={
              departmentCode === 'bmc' ||
              catalogs.locations.find((loc) => loc.id === form.locationId)
                ?.code === 'bmc-ward'
            }
            onSelect={(value) => set(value)}
          />
          <Field
            id={`${idPrefix}-office`}
            label={t('govFollowUp.fields.officeName')}
          >
            <Input
              id={`${idPrefix}-office`}
              list={`${idPrefix}-offices`}
              value={form.officeName}
              onChange={(e) => set({ officeName: e.target.value })}
            />
            <datalist id={`${idPrefix}-offices`}>
              {catalogs.offices.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
          </Field>
          <Field
            id={`${idPrefix}-designation`}
            label={t('govFollowUp.fields.designation')}
          >
            <Input
              id={`${idPrefix}-designation`}
              value={form.designation}
              onChange={(e) => set({ designation: e.target.value })}
            />
          </Field>
          <Field id={`${idPrefix}-desk`} label={t('govFollowUp.fields.deskName')}>
            <Input
              id={`${idPrefix}-desk`}
              list={`${idPrefix}-desks`}
              value={form.deskName}
              onChange={(e) => set({ deskName: e.target.value })}
            />
            <datalist id={`${idPrefix}-desks`}>
              {catalogs.desks.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
          </Field>
          <Field
            id={`${idPrefix}-phone`}
            label={t('govFollowUp.fields.contactPhone')}
          >
            <Input
              id={`${idPrefix}-phone`}
              value={form.contactPhone}
              onChange={(e) => set({ contactPhone: e.target.value })}
            />
          </Field>
          <Field
            id={`${idPrefix}-email`}
            label={t('govFollowUp.fields.contactEmail')}
          >
            <Input
              id={`${idPrefix}-email`}
              value={form.contactEmail}
              onChange={(e) => set({ contactEmail: e.target.value })}
            />
          </Field>
          <div className="md:col-span-2">
            <Field
              id={`${idPrefix}-stage`}
              label={t('govFollowUp.fields.presentStage')}
            >
              <Input
                id={`${idPrefix}-stage`}
                value={form.presentStage}
                onChange={(e) => set({ presentStage: e.target.value })}
              />
            </Field>
          </div>
          <Field id={`${idPrefix}-staff`} label={t('govFollowUp.fields.staff')}>
            <Select
              value={form.staffUserId || '__none__'}
              onValueChange={(value) =>
                set({ staffUserId: value === '__none__' ? '' : value })
              }
            >
              <SelectTrigger id={`${idPrefix}-staff`}>
                <SelectValue placeholder={t('govFollowUp.selectStaff')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">
                  {t('govFollowUp.actions.unassigned')}
                </SelectItem>
                {catalogs.users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.userId}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
      </FormSection>

      <FormSection title={t('govFollowUp.sections.plan')}>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="md:col-span-2">
            <Field
              id={`${idPrefix}-next-action`}
              label={t('govFollowUp.fields.nextAction')}
            >
              <Input
                id={`${idPrefix}-next-action`}
                value={form.nextAction}
                onChange={(e) => set({ nextAction: e.target.value })}
              />
            </Field>
          </div>
          <Field
            id={`${idPrefix}-next-on`}
            label={t('govFollowUp.fields.nextFollowUpOn')}
            required={isOpenGovFollowUpStatus(form.status)}
          >
            <DmyDateInput
              id={`${idPrefix}-next-on`}
              value={form.nextFollowUpOn}
              required={isOpenGovFollowUpStatus(form.status)}
              onValueChange={(ymd) => set({ nextFollowUpOn: ymd })}
            />
          </Field>
          <div className="md:col-span-2">
            <Field
              id={`${idPrefix}-remarks`}
              label={t('govFollowUp.fields.remarks')}
            >
              <Textarea
                id={`${idPrefix}-remarks`}
                value={form.remarks}
                onChange={(e) => set({ remarks: e.target.value })}
                rows={3}
              />
            </Field>
          </div>
        </div>
      </FormSection>
    </div>
  );
}

export function GovFollowUpCreateDialog({
  open,
  onOpenChange,
  catalogs,
  initial,
  saving,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  catalogs: GovFollowUpCatalogs;
  initial: MatterFormState;
  saving: boolean;
  onSave: (input: GovFollowUpMatterInput) => Promise<void>;
}) {
  const { t } = useTranslations();
  const [form, setForm] = useState(initial);
  const [confirmClose, setConfirmClose] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(initial);
      setConfirmClose(false);
    }
  }, [open, initial]);

  const isDirty = JSON.stringify(form) !== JSON.stringify(initial);

  const requestClose = () => {
    if (saving) return;
    if (isDirty) {
      setConfirmClose(true);
      return;
    }
    onOpenChange(false);
  };

  return (
    <>
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) onOpenChange(true);
        else requestClose();
      }}
    >
      <DialogContent className="flex max-h-[90dvh] w-[calc(100%-2rem)] max-w-3xl flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl">
        <DialogHeader className="shrink-0 space-y-1.5 border-b px-4 py-4 pr-12 sm:px-6">
          <DialogTitle>{t('govFollowUp.newMatter')}</DialogTitle>
          <DialogDescription>
            {t('govFollowUp.createDescription')}
          </DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
          <MatterFields
            form={form}
            setForm={setForm}
            catalogs={catalogs}
            idPrefix="create"
          />
        </div>
        <DialogFooter className="shrink-0 gap-2 border-t px-4 py-3 sm:space-x-2 sm:px-6">
          <Button
            variant="outline"
            className="w-full sm:w-auto"
            onClick={requestClose}
          >
            {t('common.close')}
          </Button>
          <Button
            className="w-full sm:w-auto"
            disabled={
              saving ||
              !form.subject.trim() ||
              !form.departmentId ||
              !form.locationId
            }
            onClick={() => void onSave(formToInput(form))}
          >
            {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
            {t('govFollowUp.actions.create')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    <ConfirmDialog
      open={confirmClose}
      onOpenChange={setConfirmClose}
      title={t('govFollowUp.unsavedTitle')}
      description={t('govFollowUp.unsavedDescription')}
      confirmText={t('govFollowUp.discardChanges')}
      cancelText={t('govFollowUp.keepEditing')}
      variant="destructive"
      onConfirm={() => {
        setConfirmClose(false);
        onOpenChange(false);
      }}
    />
    </>
  );
}

function MetaItem({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0 rounded-md bg-muted/50 px-3 py-2">
      <div className="text-muted-foreground text-xs">{label}</div>
      <div className="mt-0.5 break-words text-sm font-medium">{children}</div>
    </div>
  );
}

export function GovFollowUpDetailDialog({
  open,
  onOpenChange,
  matter,
  catalogs,
  saving,
  onLog,
  onUploaded,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  matter: GovFollowUpMatterDetail | null;
  catalogs: GovFollowUpCatalogs;
  saving: boolean;
  onLog: (input: GovFollowUpLogInput) => Promise<void>;
  onUploaded: (matter: GovFollowUpMatterDetail) => void;
}) {
  const { t, locale } = useTranslations();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [kind, setKind] = useState<GovFollowUpLogKind>('follow_up');
  const [mode, setMode] = useState<GovFollowUpMode | ''>('call');
  const [occurredOn, setOccurredOn] = useState(getTodayDateStringIST());
  const [body, setBody] = useState('');
  const [nextAction, setNextAction] = useState('');
  const [nextFollowUpOn, setNextFollowUpOn] = useState('');
  const [status, setStatus] = useState<GovFollowUpStatus>('pending');
  const [departmentId, setDepartmentId] = useState('');
  const [locationId, setLocationId] = useState('');
  const [officeName, setOfficeName] = useState('');
  const [officerName, setOfficerName] = useState('');
  const [designation, setDesignation] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [deskName, setDeskName] = useState('');
  const [presentStage, setPresentStage] = useState('');
  const [inwardRefNo, setInwardRefNo] = useState('');
  const [showWhere, setShowWhere] = useState(false);
  const [baseline, setBaseline] = useState<LogDraft | null>(null);
  const [confirmClose, setConfirmClose] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadRefNo, setUploadRefNo] = useState('');
  const [uploadDate, setUploadDate] = useState(getTodayDateStringIST());
  const [uploadFromTo, setUploadFromTo] = useState('');
  const [uploading, setUploading] = useState(false);
  const [attaching, setAttaching] = useState(false);
  const [deletingAttachmentId, setDeletingAttachmentId] = useState<string | null>(
    null,
  );
  const documentInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!matter || !open) return;
    const nextKind = suggestedNextLogKind(matter.lastLogKind);
    const nextOccurredOn = getTodayDateStringIST();
    const nextActionValue = matter.nextAction ?? '';
    const nextFollowUpValue =
      matter.nextFollowUpOn ?? getTodayDateStringIST();
    const draft: LogDraft = {
      kind: nextKind,
      mode: 'call',
      occurredOn: nextOccurredOn,
      body: '',
      nextAction: nextActionValue,
      nextFollowUpOn: nextFollowUpValue,
      status: matter.status,
      departmentId: matter.departmentId,
      locationId: matter.locationId,
      officeName: matter.officeName ?? '',
      officerName: matter.officerName ?? '',
      designation: matter.designation ?? '',
      deskName: matter.deskName ?? '',
      presentStage: matter.presentStage ?? '',
      inwardRefNo: matter.inwardRefNo ?? '',
    };
    setKind(draft.kind);
    setMode(draft.mode);
    setOccurredOn(draft.occurredOn);
    setBody(draft.body);
    setNextAction(draft.nextAction);
    setNextFollowUpOn(draft.nextFollowUpOn);
    setStatus(draft.status);
    setDepartmentId(draft.departmentId);
    setLocationId(draft.locationId);
    setOfficeName(draft.officeName);
    setOfficerName(draft.officerName);
    setDesignation(draft.designation);
    setContactPhone(matter.contactPhone ?? '');
    setContactEmail(matter.contactEmail ?? '');
    setDeskName(draft.deskName);
    setPresentStage(draft.presentStage);
    setInwardRefNo(draft.inwardRefNo);
    setShowWhere(needsPendingWithFields(nextKind));
    setBaseline(draft);
    setConfirmClose(false);
    setUploadOpen(false);
    setUploadFile(null);
    setUploadRefNo(matter.inwardRefNo ?? '');
    setUploadDate(getTodayDateStringIST());
    setUploadFromTo(
      matter.officeName || matter.departmentName || '',
    );
    setAttaching(false);
    setDeletingAttachmentId(null);
  }, [matter, open]);

  const refreshMatter = async (matterId: string) => {
    const res = await fetch(
      `/api/gov-follow-up/${encodeURIComponent(matterId)}`,
    );
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(payload.error || 'refresh');
    }
    onUploaded(payload as GovFollowUpMatterDetail);
  };

  const handleAttachDocuments = async (files: FileList | null) => {
    if (!matter || !files?.length) return;
    setAttaching(true);
    try {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch(
          `/api/gov-follow-up/${encodeURIComponent(matter.id)}/attachments`,
          { method: 'POST', body: formData },
        );
        const payload = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(payload.error || 'attach');
        }
      }
      toast.success(t('govFollowUp.documents.uploadSuccess'));
      await refreshMatter(matter.id);
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error && error.message !== 'attach'
          ? error.message
          : t('govFollowUp.documents.uploadError'),
      );
    } finally {
      setAttaching(false);
      if (documentInputRef.current) documentInputRef.current.value = '';
    }
  };

  const handleDeleteAttachment = async (attachmentId: string) => {
    if (!matter) return;
    setDeletingAttachmentId(attachmentId);
    try {
      const res = await fetch(
        `/api/gov-follow-up/${encodeURIComponent(matter.id)}/attachments?attachmentId=${encodeURIComponent(attachmentId)}`,
        { method: 'DELETE' },
      );
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload.error || 'delete');
      }
      toast.success(t('govFollowUp.documents.deleteSuccess'));
      await refreshMatter(matter.id);
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error && error.message !== 'delete'
          ? error.message
          : t('govFollowUp.documents.deleteError'),
      );
    } finally {
      setDeletingAttachmentId(null);
    }
  };

  const submitUpload = async () => {
    if (!matter || !uploadFile) {
      toast.error(t('govFollowUp.letters.fileRequired'));
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', uploadFile);
      if (uploadRefNo.trim()) formData.append('refNo', uploadRefNo.trim());
      if (uploadDate) formData.append('date', uploadDate);
      if (uploadFromTo.trim()) formData.append('fromTo', uploadFromTo.trim());

      const res = await fetch(
        `/api/gov-follow-up/${encodeURIComponent(matter.id)}/upload-letter`,
        { method: 'POST', body: formData },
      );
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload.error || 'upload');
      }
      toast.success(t('govFollowUp.letters.uploadSuccess'));
      setUploadOpen(false);
      setUploadFile(null);
      onUploaded(payload as GovFollowUpMatterDetail);
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error && error.message !== 'upload'
          ? error.message
          : t('govFollowUp.letters.uploadError'),
      );
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    if (needsPendingWithFields(kind)) {
      setShowWhere(true);
    }
  }, [kind]);

  const logDepartmentCode = catalogs.departments.find(
    (dept) => dept.id === departmentId,
  )?.code;
  const logLocations = useMemo(
    () =>
      locationsForDepartment(catalogs.locations, departmentId, {
        departmentCode: logDepartmentCode,
        includeLocationId: locationId,
      }),
    [catalogs.locations, departmentId, locationId, logDepartmentCode],
  );

  const currentDraft: LogDraft = useMemo(
    () => ({
      kind,
      mode,
      occurredOn,
      body,
      nextAction,
      nextFollowUpOn,
      status,
      departmentId,
      locationId,
      officeName,
      officerName,
      designation,
      deskName,
      presentStage,
      inwardRefNo,
    }),
    [
      kind,
      mode,
      occurredOn,
      body,
      nextAction,
      nextFollowUpOn,
      status,
      departmentId,
      locationId,
      officeName,
      officerName,
      designation,
      deskName,
      presentStage,
      inwardRefNo,
    ],
  );
  const isDirty = !isSameDraft(baseline, currentDraft);

  const requestClose = () => {
    if (saving) return;
    if (isDirty) {
      setConfirmClose(true);
      return;
    }
    onOpenChange(false);
  };

  if (!matter) return null;

  const overdue = isMatterOverdue(
    matter.nextFollowUpOn,
    matter.status,
    getTodayDateStringIST(),
  );
  const history = matter.logs;
  const bodyContext = {
    departmentName: matter.departmentName,
    officeName,
    officerName,
    designation,
    deskName,
    inwardRefNo: inwardRefNo || matter.inwardRefNo,
  };

  const applyKind = (nextKind: GovFollowUpLogKind) => {
    setKind(nextKind);
    const statusForKind = suggestedStatusForLogKind(nextKind);
    if (statusForKind) setStatus(statusForKind);
  };

  const submit = (
    forcedKind?: GovFollowUpLogKind,
    forcedStatus?: GovFollowUpStatus,
  ) => {
    const nextKind = forcedKind ?? kind;
    const impliedStatus = suggestedStatusForLogKind(nextKind);
    const nextStatus = forcedStatus ?? impliedStatus ?? status;
    void onLog({
      occurredOn,
      kind: nextKind,
      mode: mode || null,
      body:
        body.trim() ||
        defaultGovFollowUpLogBody(nextKind, bodyContext),
      departmentId,
      locationId,
      officeName,
      officerName,
      designation,
      deskName,
      presentStage,
      nextFollowUpOn: isOpenGovFollowUpStatus(nextStatus)
        ? nextFollowUpOn
        : null,
      nextAction,
      status: nextStatus,
      inwardRefNo: inwardRefNo || null,
      contactPhone,
      contactEmail,
    });
  };

  return (
    <>
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) onOpenChange(true);
        else requestClose();
      }}
    >
      <DialogContent className="flex max-h-[90dvh] w-[calc(100%-2rem)] max-w-3xl flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl">
        <DialogHeader className="shrink-0 space-y-2 border-b px-4 py-4 pr-12 text-left sm:px-6">
          <div className="text-muted-foreground text-xs font-medium tracking-wide">
            {matter.followUpNo}
          </div>
          <DialogTitle className="text-left text-lg leading-snug">
            {matter.subject}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {t('govFollowUp.detailDescription')}
          </DialogDescription>
          <div className="flex flex-wrap items-center gap-2">
            <GovFollowUpStatusBadge status={matter.status} />
            <GovFollowUpPriorityBadge priority={matter.priority} />
            {matter.nextFollowUpOn ? (
              <span
                className={cn(
                  'rounded-full border px-2.5 py-0.5 text-xs font-medium',
                  overdue
                    ? 'border-destructive/40 text-destructive'
                    : 'text-muted-foreground',
                )}
              >
                {t('govFollowUp.history.next', {
                  date: formatShortDisplayDateIST(
                    matter.nextFollowUpOn,
                    locale,
                  ),
                })}
              </span>
            ) : null}
          </div>
          <div className="pt-1">
            <div className="text-muted-foreground mb-1 text-[10px] font-medium uppercase tracking-wide">
              {t('govFollowUp.sections.workflow')}
            </div>
            <WorkflowStepper current={matter.lastLogKind} />
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-4 sm:px-6">
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            <MetaItem label={t('govFollowUp.fields.department')}>
              {matter.departmentName}
              {matter.locationName ? ` · ${matter.locationName}` : ''}
            </MetaItem>
            <MetaItem label={t('govFollowUp.pendingWith')}>
              {pendingWithLabel(matter)}
            </MetaItem>
            <MetaItem label={t('govFollowUp.fields.presentStage')}>
              {matter.presentStage || '—'}
            </MetaItem>
            <MetaItem label={t('govFollowUp.fields.staff')}>
              {matter.staffUserName || t('govFollowUp.actions.unassigned')}
            </MetaItem>
          </div>

          <section>
            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-sm font-semibold">
                {t('govFollowUp.letters.title')}
              </h3>
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                <input
                  ref={documentInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.png,.jpg,.jpeg,.gif,.webp,.doc,.docx,.xls,.xlsx,.txt,application/pdf,image/*"
                  className="sr-only"
                  onChange={(e) => void handleAttachDocuments(e.target.files)}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full gap-1.5 sm:w-auto"
                  disabled={attaching}
                  onClick={() => documentInputRef.current?.click()}
                >
                  {attaching ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Paperclip className="size-3.5" />
                  )}
                  {t('govFollowUp.actions.attachDocuments')}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full gap-1.5 sm:w-auto"
                  onClick={() => setUploadOpen(true)}
                >
                  <Upload className="size-3.5" />
                  {t('govFollowUp.actions.uploadLetter')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-1.5 sm:w-auto"
                  asChild
                >
                  <Link href={govFollowUpLetterGenerationHref(matter.id)}>
                    <FileText className="size-3.5" />
                    {t('govFollowUp.actions.generateLetter')}
                  </Link>
                </Button>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <h4 className="text-muted-foreground mb-2 text-xs font-medium uppercase tracking-wide">
                  {t('govFollowUp.letters.generatedTitle')}
                </h4>
                {(matter.letters ?? []).length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    {t('govFollowUp.letters.empty')}
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {(matter.letters ?? []).map((letter) => (
                      <li key={letter.id}>
                        <Link
                          href={govFollowUpLetterGenerationHref(
                            matter.id,
                            letter.id,
                          )}
                          className="flex min-w-0 flex-col gap-0.5 rounded-md border px-3 py-2 text-sm transition-colors hover:border-primary/40 hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <span className="min-w-0 truncate font-medium">
                            {letter.referenceNo ||
                              letter.title ||
                              t('govFollowUp.actions.viewLetter')}
                          </span>
                          <span className="text-muted-foreground shrink-0 text-xs">
                            {t(
                              `letterGeneration.savedLetters.status.${letter.status}`,
                            )}
                            {' · '}
                            {formatShortDisplayDateIST(letter.createdAt, locale)}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <h4 className="text-muted-foreground mb-2 text-xs font-medium uppercase tracking-wide">
                  {t('govFollowUp.letters.inwardTitle')}
                </h4>
                {(matter.inwardLetters ?? []).length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    {t('govFollowUp.letters.inwardEmpty')}
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {(matter.inwardLetters ?? []).map((letter) => (
                      <li key={letter.id}>
                        <div className="flex min-w-0 flex-col gap-1 rounded-md border px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between">
                          <div className="min-w-0">
                            <div className="truncate font-medium">
                              {letter.refNo ||
                                letter.subject ||
                                t('govFollowUp.actions.viewRegister')}
                            </div>
                            <div className="text-muted-foreground truncate text-xs">
                              {letter.fromTo}
                              {letter.fileName ? ` · ${letter.fileName}` : ''}
                            </div>
                          </div>
                          <div className="flex shrink-0 flex-wrap items-center gap-2">
                            <span className="text-muted-foreground text-xs">
                              {formatShortDisplayDateIST(letter.date, locale)}
                            </span>
                            {letter.fileUrl ? (
                              <FilePreviewButton
                                variant="outline"
                                fileUrl={letter.fileUrl}
                                fileName={letter.fileName || 'document.pdf'}
                              />
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8"
                                asChild
                              >
                                <Link
                                  href={`/modules/io-register?tab=inward&search=${encodeURIComponent(letter.refNo || letter.subject)}`}
                                >
                                  <Inbox className="size-3.5" />
                                  {t('govFollowUp.actions.viewRegister')}
                                </Link>
                              </Button>
                            )}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </section>

          <section>
            <h3 className="mb-3 text-sm font-semibold">
              {t('govFollowUp.documents.title')}
              {(matter.attachments ?? []).length > 0
                ? ` (${matter.attachments.length})`
                : ''}
            </h3>
            {(matter.attachments ?? []).length === 0 ? (
              <p className="text-muted-foreground text-sm">
                {t('govFollowUp.documents.empty')}
              </p>
            ) : (
              <ul className="space-y-2">
                {(matter.attachments ?? []).map((attachment) => (
                  <li key={attachment.id}>
                    <div className="flex min-w-0 flex-col gap-2 rounded-md border px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <div className="truncate font-medium">
                          {attachment.fileName}
                        </div>
                        <div className="text-muted-foreground text-xs">
                          {attachment.fileSizeKb} KB
                          {' · '}
                          {formatShortDisplayDateIST(
                            attachment.createdAt,
                            locale,
                          )}
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        {attachment.fileUrl ? (
                          <FilePreviewButton
                            variant="outline"
                            fileUrl={attachment.fileUrl}
                            fileName={attachment.fileName}
                          />
                        ) : null}
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          title={t('common.delete')}
                          aria-label={t('common.delete')}
                          disabled={deletingAttachmentId === attachment.id}
                          onClick={() =>
                            void handleDeleteAttachment(attachment.id)
                          }
                        >
                          {deletingAttachmentId === attachment.id ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="size-3.5" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h3 className="mb-3 text-sm font-semibold">
              {t('govFollowUp.history.title')}
            </h3>
            {history.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                {t('govFollowUp.history.empty')}
              </p>
            ) : (
              <ol className="space-y-2">
                {history.map((log) => {
                  const createdByLabel =
                    log.performedByName ||
                    catalogs.users.find((user) => user.id === log.performedBy)
                      ?.userId ||
                    log.performedBy;
                  return (
                    <li key={log.id}>
                      <p className="text-sm leading-snug">
                        <span className="font-medium">
                          {formatShortDisplayDateIST(log.occurredOn, locale)}
                        </span>
                        {' — '}
                        {log.body}
                      </p>
                      <p className="text-muted-foreground mt-0.5 text-xs">
                        {t(`govFollowUp.kind.${log.kind}`)}
                        {' · '}
                        {t('govFollowUp.history.createdBy')}: {createdByLabel}
                      </p>
                    </li>
                  );
                })}
              </ol>
            )}
            {matter.nextFollowUpOn &&
            isOpenGovFollowUpStatus(matter.status) ? (
              <p className="mt-3 text-sm font-medium">
                {t('govFollowUp.history.next', {
                  date: formatShortDisplayDateIST(
                    matter.nextFollowUpOn,
                    locale,
                  ),
                })}
              </p>
            ) : null}
          </section>

          <FormSection title={t('govFollowUp.sections.recordUpdate')}>
            <div className="grid gap-3 md:grid-cols-2">
              <Field id="log-kind" label={t('govFollowUp.fields.kind')}>
                <Select
                  value={kind}
                  onValueChange={(value) =>
                    applyKind(value as GovFollowUpLogKind)
                  }
                >
                  <SelectTrigger id="log-kind">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {GOV_FOLLOW_UP_LOG_KINDS.map((item) => (
                      <SelectItem key={item} value={item}>
                        {t(`govFollowUp.kind.${item}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              {kind === 'inward' ? (
                <Field
                  id="log-inward"
                  label={t('govFollowUp.fields.inwardRefNo')}
                >
                  <Input
                    id="log-inward"
                    value={inwardRefNo}
                    onChange={(e) => setInwardRefNo(e.target.value)}
                  />
                </Field>
              ) : null}
              <Field id="log-mode" label={t('govFollowUp.fields.mode')}>
                <Select
                  value={mode || '__none__'}
                  onValueChange={(value) =>
                    setMode(
                      value === '__none__' ? '' : (value as GovFollowUpMode),
                    )
                  }
                >
                  <SelectTrigger id="log-mode">
                    <SelectValue placeholder={t('govFollowUp.selectMode')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">—</SelectItem>
                    {GOV_FOLLOW_UP_MODES.map((item) => (
                      <SelectItem key={item} value={item}>
                        {t(`govFollowUp.mode.${item}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field id="log-date" label={t('govFollowUp.fields.occurredOn')}>
                <DmyDateInput
                  id="log-date"
                  value={occurredOn}
                  onValueChange={setOccurredOn}
                />
              </Field>
              <Field id="log-status" label={t('govFollowUp.fields.status')}>
                <Select
                  value={status}
                  onValueChange={(value) =>
                    setStatus(value as GovFollowUpStatus)
                  }
                >
                  <SelectTrigger id="log-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {GOV_FOLLOW_UP_STATUSES.map((item) => (
                      <SelectItem key={item} value={item}>
                        {t(`govFollowUp.status.${item}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <div className="md:col-span-2">
                <Field id="log-body" label={t('govFollowUp.fields.body')}>
                  <Textarea
                    id="log-body"
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    rows={3}
                    placeholder={t('govFollowUp.bodyPlaceholder')}
                  />
                </Field>
              </div>
              <Field
                id="log-next-action"
                label={t('govFollowUp.fields.nextAction')}
              >
                <Input
                  id="log-next-action"
                  value={nextAction}
                  onChange={(e) => setNextAction(e.target.value)}
                />
              </Field>
              <Field
                id="log-next-on"
                label={t('govFollowUp.fields.nextFollowUpOn')}
              >
                <DmyDateInput
                  id="log-next-on"
                  value={nextFollowUpOn}
                  onValueChange={setNextFollowUpOn}
                />
              </Field>
            </div>

            <div>
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-sm font-medium"
                onClick={() => setShowWhere((openWhere) => !openWhere)}
              >
                <ChevronDown
                  className={cn(
                    'size-4 transition-transform',
                    showWhere && 'rotate-180',
                  )}
                />
                {t('govFollowUp.sections.whereNow')}
              </button>
              {showWhere ? (
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <Field id="log-dept" label={t('govFollowUp.fields.department')}>
                    <Select
                      value={departmentId}
                      onValueChange={(value) => {
                        const nextCode = catalogs.departments.find(
                          (dept) => dept.id === value,
                        )?.code;
                        const allowed = locationsForDepartment(
                          catalogs.locations,
                          value,
                          { departmentCode: nextCode },
                        );
                        setDepartmentId(value);
                        if (allowed.some((loc) => loc.id === locationId)) {
                          return;
                        }
                        setLocationId(
                          allowed.length === 1 ? allowed[0].id : '',
                        );
                      }}
                    >
                      <SelectTrigger id="log-dept">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {catalogs.departments.map((dept) => (
                          <SelectItem key={dept.id} value={dept.id}>
                            {dept.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field
                    id="log-location"
                    label={t('govFollowUp.fields.location')}
                  >
                    <Select
                      value={locationId || undefined}
                      onValueChange={setLocationId}
                      disabled={!departmentId}
                    >
                      <SelectTrigger id="log-location">
                        <SelectValue
                          placeholder={t('govFollowUp.selectLocation')}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {logLocations.map((loc) => (
                          <SelectItem key={loc.id} value={loc.id}>
                            {loc.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <OfficerPicker
                    id="log-officer"
                    catalogs={catalogs}
                    officerName={officerName}
                    preferWard={
                      logDepartmentCode === 'bmc' ||
                      catalogs.locations.find((loc) => loc.id === locationId)
                        ?.code === 'bmc-ward'
                    }
                    onSelect={(value) => {
                      setOfficerName(value.officerName);
                      if (value.designation !== undefined) {
                        setDesignation(value.designation);
                      }
                      if (value.officeName !== undefined) {
                        setOfficeName(value.officeName);
                      }
                      if (value.contactPhone !== undefined) {
                        setContactPhone(value.contactPhone);
                      }
                      if (value.contactEmail !== undefined) {
                        setContactEmail(value.contactEmail);
                      }
                    }}
                  />
                  <Field
                    id="log-office"
                    label={t('govFollowUp.fields.officeName')}
                  >
                    <Input
                      value={officeName}
                      onChange={(e) => setOfficeName(e.target.value)}
                    />
                  </Field>
                  <Field
                    id="log-desig"
                    label={t('govFollowUp.fields.designation')}
                  >
                    <Input
                      value={designation}
                      onChange={(e) => setDesignation(e.target.value)}
                    />
                  </Field>
                  <Field id="log-desk" label={t('govFollowUp.fields.deskName')}>
                    <Input
                      value={deskName}
                      onChange={(e) => setDeskName(e.target.value)}
                    />
                  </Field>
                  <div className="md:col-span-2">
                    <Field
                      id="log-stage"
                      label={t('govFollowUp.fields.presentStage')}
                    >
                      <Input
                        value={presentStage}
                        onChange={(e) => setPresentStage(e.target.value)}
                      />
                    </Field>
                  </div>
                </div>
              ) : null}
            </div>
          </FormSection>
        </div>

        <div className="flex shrink-0 flex-col gap-2 border-t px-4 py-3 sm:flex-row sm:flex-wrap sm:px-6">
          <Button
            className="w-full sm:w-auto"
            disabled={saving}
            onClick={() => submit()}
          >
            {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
            {t('govFollowUp.actions.saveLog')}
          </Button>
          <Button variant="outline" className="w-full sm:w-auto" asChild>
            <Link href={govFollowUpLetterGenerationHref(matter.id)}>
              <FileText className="size-3.5" />
              {t('govFollowUp.actions.generateLetter')}
            </Link>
          </Button>
          <Button
            variant="outline"
            className="w-full sm:ml-auto sm:w-auto"
            disabled={saving}
            onClick={requestClose}
          >
            {t('common.close')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
    <ConfirmDialog
      open={confirmClose}
      onOpenChange={setConfirmClose}
      title={t('govFollowUp.unsavedTitle')}
      description={t('govFollowUp.unsavedDescription')}
      confirmText={t('govFollowUp.discardChanges')}
      cancelText={t('govFollowUp.keepEditing')}
      variant="destructive"
      onConfirm={() => {
        setConfirmClose(false);
        onOpenChange(false);
      }}
    />
    <Dialog
      open={uploadOpen}
      onOpenChange={(next) => {
        if (uploading) return;
        setUploadOpen(next);
        if (!next) setUploadFile(null);
      }}
    >
      <DialogContent className="w-[calc(100%-2rem)] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('govFollowUp.letters.uploadTitle')}</DialogTitle>
          <DialogDescription>
            {t('govFollowUp.letters.uploadDescription')}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <Field id="upload-file" label={t('govFollowUp.letters.file')}>
            <input
              ref={fileInputRef}
              id="upload-file"
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.gif,.webp,.doc,.docx,application/pdf,image/*"
              className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-2 file:text-sm file:font-medium"
              onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
            />
          </Field>
          <Field
            id="upload-ref"
            label={t('govFollowUp.fields.inwardRefNo')}
          >
            <Input
              id="upload-ref"
              value={uploadRefNo}
              onChange={(e) => setUploadRefNo(e.target.value)}
              placeholder={t('govFollowUp.letters.refNoPlaceholder')}
            />
          </Field>
          <div className="grid gap-3 md:grid-cols-2">
            <Field id="upload-date" label={t('govFollowUp.fields.occurredOn')}>
              <DmyDateInput
                id="upload-date"
                value={uploadDate}
                onValueChange={setUploadDate}
              />
            </Field>
            <Field id="upload-from" label={t('govFollowUp.letters.fromTo')}>
              <Input
                id="upload-from"
                value={uploadFromTo}
                onChange={(e) => setUploadFromTo(e.target.value)}
              />
            </Field>
          </div>
        </div>
        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            variant="outline"
            className="w-full sm:w-auto"
            disabled={uploading}
            onClick={() => setUploadOpen(false)}
          >
            {t('common.cancel')}
          </Button>
          <Button
            type="button"
            className="w-full sm:w-auto"
            disabled={uploading || !uploadFile}
            onClick={() => void submitUpload()}
          >
            {uploading ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <Upload className="mr-2 size-4" />
            )}
            {t('govFollowUp.actions.uploadLetter')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}
