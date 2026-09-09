'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, FileText, Inbox, Loader2 } from 'lucide-react';
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
import { formatDisplayDateIST, getTodayDateStringIST } from '@/lib/ist-date';
import {
  GOV_FOLLOW_UP_LOG_KINDS,
  GOV_FOLLOW_UP_MODES,
  GOV_FOLLOW_UP_PRIORITIES,
  GOV_FOLLOW_UP_STATUSES,
  isOpenGovFollowUpStatus,
} from '@/lib/gov-follow-up/constants';
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

  return (
    <div className="space-y-4">
      <FormSection title={t('govFollowUp.sections.matter')}>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
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
              onValueChange={(value) => set({ departmentId: value })}
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
              value={form.locationId}
              onValueChange={(value) => set({ locationId: value })}
            >
              <SelectTrigger id={`${idPrefix}-location`}>
                <SelectValue placeholder={t('govFollowUp.selectLocation')} />
              </SelectTrigger>
              <SelectContent>
                {catalogs.locations.map((loc) => (
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
        <div className="grid gap-3 sm:grid-cols-2">
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
            id={`${idPrefix}-officer`}
            label={t('govFollowUp.fields.officerName')}
          >
            <Input
              id={`${idPrefix}-officer`}
              list={`${idPrefix}-officers`}
              value={form.officerName}
              onChange={(e) => set({ officerName: e.target.value })}
            />
            <datalist id={`${idPrefix}-officers`}>
              {catalogs.officers.map((name) => (
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
          <div className="sm:col-span-2">
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
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
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
          <div className="sm:col-span-2">
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

  useEffect(() => {
    if (open) setForm(initial);
  }, [open, initial]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-3xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="shrink-0 space-y-1.5 border-b px-6 py-4 pr-12">
          <DialogTitle>{t('govFollowUp.newMatter')}</DialogTitle>
          <DialogDescription>
            {t('govFollowUp.createDescription')}
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <MatterFields
            form={form}
            setForm={setForm}
            catalogs={catalogs}
            idPrefix="create"
          />
        </div>
        <DialogFooter className="shrink-0 border-t px-6 py-3 sm:space-x-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button
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
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  matter: GovFollowUpMatterDetail | null;
  catalogs: GovFollowUpCatalogs;
  saving: boolean;
  onLog: (input: GovFollowUpLogInput) => Promise<void>;
}) {
  const { t } = useTranslations();
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
  const [deskName, setDeskName] = useState('');
  const [presentStage, setPresentStage] = useState('');
  const [showWhere, setShowWhere] = useState(false);

  useEffect(() => {
    if (!matter || !open) return;
    setKind('follow_up');
    setMode('call');
    setOccurredOn(getTodayDateStringIST());
    setBody('');
    setNextAction(matter.nextAction ?? '');
    setNextFollowUpOn(matter.nextFollowUpOn ?? getTodayDateStringIST());
    setStatus(matter.status);
    setDepartmentId(matter.departmentId);
    setLocationId(matter.locationId);
    setOfficeName(matter.officeName ?? '');
    setOfficerName(matter.officerName ?? '');
    setDesignation(matter.designation ?? '');
    setDeskName(matter.deskName ?? '');
    setPresentStage(matter.presentStage ?? '');
    setShowWhere(false);
  }, [matter, open]);

  useEffect(() => {
    if (kind === 'file_movement') setShowWhere(true);
  }, [kind]);

  if (!matter) return null;

  const overdue = isMatterOverdue(
    matter.nextFollowUpOn,
    matter.status,
    getTodayDateStringIST(),
  );
  const history = [...matter.logs].reverse();

  const submit = (
    forcedKind?: GovFollowUpLogKind,
    forcedStatus?: GovFollowUpStatus,
  ) => {
    const nextKind = forcedKind ?? kind;
    const nextStatus = forcedStatus ?? status;
    void onLog({
      occurredOn,
      kind: nextKind,
      mode: mode || null,
      body:
        body.trim() ||
        (nextKind === 'file_movement' ? 'File moved.' : 'Follow-up recorded.'),
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
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-3xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="shrink-0 space-y-2 border-b px-6 py-4 pr-12 text-left">
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
                  date: formatDisplayDateIST(matter.nextFollowUpOn),
                })}
              </span>
            ) : null}
          </div>
        </DialogHeader>

        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-4">
          <div className="grid gap-2 sm:grid-cols-2">
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

          {matter.letterId || matter.registerEntryId ? (
            <div className="flex flex-wrap gap-2">
              {matter.letterId ? (
                <Button variant="outline" size="sm" asChild>
                  <Link
                    href={`/modules/letter-generation?letterId=${matter.letterId}`}
                  >
                    <FileText className="size-3.5" />
                    {t('govFollowUp.actions.viewLetter')}
                    {matter.letterReferenceNo
                      ? ` (${matter.letterReferenceNo})`
                      : ''}
                  </Link>
                </Button>
              ) : null}
              {matter.registerEntryId ? (
                <Button variant="outline" size="sm" asChild>
                  <Link
                    href={`/modules/io-register?search=${encodeURIComponent(matter.registerRefNo || matter.subject)}`}
                  >
                    <Inbox className="size-3.5" />
                    {t('govFollowUp.actions.viewRegister')}
                    {matter.registerRefNo ? ` (${matter.registerRefNo})` : ''}
                  </Link>
                </Button>
              ) : null}
            </div>
          ) : null}

          <section>
            <h3 className="mb-3 text-sm font-semibold">
              {t('govFollowUp.history.title')}
            </h3>
            {history.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                {t('govFollowUp.history.empty')}
              </p>
            ) : (
              <ol className="relative ml-2 space-y-3 border-l-2 border-border">
                {history.map((log) => (
                  <li key={log.id} className="relative pl-4">
                    <span className="bg-primary absolute -left-[5px] top-1.5 size-2 rounded-full" />
                    <div className="text-sm leading-snug">{log.body}</div>
                    <div className="text-muted-foreground mt-0.5 text-xs">
                      {formatDisplayDateIST(log.occurredOn)} ·{' '}
                      {t(`govFollowUp.kind.${log.kind}`)}
                      {log.mode ? ` · ${t(`govFollowUp.mode.${log.mode}`)}` : ''}
                      {log.officerName || log.officeName
                        ? ` · ${[log.officerName, log.officeName].filter(Boolean).join(', ')}`
                        : ''}
                      {log.performedByName ? ` · ${log.performedByName}` : ''}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <FormSection title={t('govFollowUp.sections.recordUpdate')}>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field id="log-kind" label={t('govFollowUp.fields.kind')}>
                <Select
                  value={kind}
                  onValueChange={(value) =>
                    setKind(value as GovFollowUpLogKind)
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
              <div className="sm:col-span-2">
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
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <Field id="log-dept" label={t('govFollowUp.fields.department')}>
                    <Select value={departmentId} onValueChange={setDepartmentId}>
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
                    <Select value={locationId} onValueChange={setLocationId}>
                      <SelectTrigger id="log-location">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {catalogs.locations.map((loc) => (
                          <SelectItem key={loc.id} value={loc.id}>
                            {loc.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
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
                    id="log-officer"
                    label={t('govFollowUp.fields.officerName')}
                  >
                    <Input
                      value={officerName}
                      onChange={(e) => setOfficerName(e.target.value)}
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
                  <div className="sm:col-span-2">
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

        <div className="flex shrink-0 flex-wrap gap-2 border-t px-6 py-3">
          <Button disabled={saving} onClick={() => submit('follow_up')}>
            {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
            {t('govFollowUp.actions.logFollowUp')}
          </Button>
          <Button
            variant="outline"
            disabled={saving}
            onClick={() => submit('file_movement')}
          >
            {t('govFollowUp.actions.fileMoved')}
          </Button>
          <Button
            variant="secondary"
            disabled={saving}
            onClick={() => submit('closed', 'closed')}
          >
            {t('govFollowUp.actions.closeMatter')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
