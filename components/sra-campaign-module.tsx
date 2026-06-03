'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/components/toast';
import { useTranslations } from '@/hooks/use-translations';
import {
  validateForm,
  sraCampaignVoterFormSchema,
  useFormValidation,
} from '@/lib/validations';
import type { SraCampaignVoter } from '@/lib/db/schema';
import { normalizeIndianMobileDigits } from '@/lib/indian-mobile';
import { buildThermalTicketText, shareThermalTicketPdf } from '@/lib/thermal/receipt';
import { Loader2, Share2 } from 'lucide-react';

const emptyForm = {
  sraVoterId: '',
  name: '',
  phoneNumber: '',
  description: '',
};

function translateValidationErrors(
  errors: Record<string, string>,
  t: (key: string) => string,
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(errors).map(([field, code]) => [
      field,
      t(`sraCampaign.validation.${code}`),
    ]),
  );
}

export function SraCampaignModule({
  isPublic = false,
  canViewRecords = false,
}: {
  isPublic?: boolean;
  /** When true on the public page, logged-in users see the records tab */
  canViewRecords?: boolean;
}) {
  const showRecords = !isPublic || canViewRecords;
  const { t } = useTranslations();
  const { validateField } = useFormValidation(sraCampaignVoterFormSchema);
  const [form, setForm] = useState(emptyForm);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [entries, setEntries] = useState<SraCampaignVoter[]>([]);
  const [listSearch, setListSearch] = useState('');
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [createdEntry, setCreatedEntry] = useState<SraCampaignVoter | null>(null);

  const loadEntries = useCallback(async (search?: string) => {
    setIsLoadingList(true);
    try {
      const params = new URLSearchParams();
      if (search?.trim()) {
        params.set('search', search.trim());
      }
      const query = params.toString();
      const response = await fetch(
        `/api/sra-campaign${query ? `?${query}` : ''}`,
      );
      if (!response.ok) {
        throw new Error('Failed to load entries');
      }
      const data = await response.json();
      setEntries(data.entries ?? []);
    } catch {
      toast({
        type: 'error',
        description: t('sraCampaign.messages.loadFailed'),
      });
    } finally {
      setIsLoadingList(false);
    }
    // `t` from useTranslations is not memoized; including it recreates this callback every render.
  }, []);

  useEffect(() => {
    if (showRecords) {
      void loadEntries();
    }
  }, [showRecords, loadEntries]);

  const setFieldError = (field: keyof typeof form, code: string | null) => {
    setFormErrors((prev) => {
      const next = { ...prev };
      if (code) {
        next[field] = t(`sraCampaign.validation.${code}`);
      } else {
        delete next[field];
      }
      return next;
    });
  };

  const validateFieldOnBlur = (field: keyof typeof form) => {
    const code = validateField(field, form[field], form);
    setFieldError(field, code);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validation = validateForm(sraCampaignVoterFormSchema, form);
    if (!validation.success) {
      const translated = translateValidationErrors(validation.errors, t);
      setFormErrors(translated);
      const firstError = Object.values(translated)[0];
      toast({ type: 'error', description: firstError });
      return;
    }

    setFormErrors({});
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/sra-campaign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validation.data),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Save failed');
      }

      const entry = (await response.json()) as SraCampaignVoter;
      setCreatedEntry(entry);
      toast({
        type: 'success',
        description: t('sraCampaign.messages.saved'),
      });
      setForm(emptyForm);
      if (showRecords) {
        await loadEntries(listSearch);
      }
    } catch (error) {
      toast({
        type: 'error',
        description:
          error instanceof Error
            ? error.message
            : t('sraCampaign.messages.saveFailed'),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegisterAnother = () => {
    setCreatedEntry(null);
    setForm(emptyForm);
    setFormErrors({});
  };

  const handleShareThermalTicket = async () => {
    if (!createdEntry) return;

    const receiptText = buildThermalTicketText({
      token: createdEntry.token,
      createdAt: createdEntry.createdAt,
      name: createdEntry.name,
      mobile: createdEntry.phoneNumber,
      serviceName: t('sraCampaign.title'),
      width: 32,
    });

    const outcome = await shareThermalTicketPdf(
      receiptText,
      `sra-campaign-ticket-${createdEntry.token.toLowerCase()}`,
      {
        headerImageUrl: '/images/ncp_election_symbol.png',
        qrValue: createdEntry.token,
        paperWidthMm: 88,
      },
    );

    if (outcome === 'downloaded') {
      toast({
        type: 'success',
        description: t('sraCampaign.messages.thermalTicketDownloaded'),
      });
    }
  };

  const updateField = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t('sraCampaign.title')}</h1>
        <p className="text-muted-foreground">{t('sraCampaign.subtitle')}</p>
      </div>

      {isPublic && !canViewRecords ? (
        <Card>
          <CardHeader>
            <CardTitle>{t('sraCampaign.form.title')}</CardTitle>
            <CardDescription>
              {t('sraCampaign.form.description')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {createdEntry ? (
              <SraCampaignCompletion
                entry={createdEntry}
                t={t}
                onRegisterAnother={handleRegisterAnother}
                onShareThermalTicket={handleShareThermalTicket}
              />
            ) : (
              <SraCampaignForm
                form={form}
                formErrors={formErrors}
                isSubmitting={isSubmitting}
                updateField={updateField}
                validateFieldOnBlur={validateFieldOnBlur}
                handleSubmit={handleSubmit}
                t={t}
              />
            )}
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="register" className="space-y-4">
          <TabsList>
            <TabsTrigger value="register">
              {t('sraCampaign.tabs.register')}
            </TabsTrigger>
            <TabsTrigger value="records">
              {t('sraCampaign.tabs.records')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="register">
            <Card>
              <CardHeader>
                <CardTitle>{t('sraCampaign.form.title')}</CardTitle>
                <CardDescription>
                  {t('sraCampaign.form.description')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {createdEntry ? (
                  <SraCampaignCompletion
                    entry={createdEntry}
                    t={t}
                    onRegisterAnother={handleRegisterAnother}
                    onShareThermalTicket={handleShareThermalTicket}
                  />
                ) : (
                  <SraCampaignForm
                    form={form}
                    formErrors={formErrors}
                    isSubmitting={isSubmitting}
                    updateField={updateField}
                    validateFieldOnBlur={validateFieldOnBlur}
                    handleSubmit={handleSubmit}
                    t={t}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="records">
            <Card>
              <CardHeader>
                <CardTitle>{t('sraCampaign.records.title')}</CardTitle>
                <CardDescription>
                  {t('sraCampaign.records.description')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    value={listSearch}
                    onChange={(e) => setListSearch(e.target.value)}
                    placeholder={t('sraCampaign.records.searchPlaceholder')}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => loadEntries(listSearch)}
                    disabled={isLoadingList}
                  >
                    {isLoadingList ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      t('sraCampaign.actions.search')
                    )}
                  </Button>
                </div>

                {isLoadingList ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="size-6 animate-spin text-muted-foreground" />
                  </div>
                ) : entries.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    {t('sraCampaign.records.empty')}
                  </p>
                ) : (
                  <div className="overflow-x-auto rounded-md border">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50 text-left">
                          <th className="px-3 py-2 font-medium">
                            {t('sraCampaign.fields.token')}
                          </th>
                          <th className="px-3 py-2 font-medium">
                            {t('sraCampaign.fields.sraVoterId')}
                          </th>
                          <th className="px-3 py-2 font-medium">
                            {t('sraCampaign.fields.name')}
                          </th>
                          <th className="px-3 py-2 font-medium">
                            {t('sraCampaign.fields.phoneNumber')}
                          </th>
                          <th className="px-3 py-2 font-medium">
                            {t('sraCampaign.fields.description')}
                          </th>
                          <th className="px-3 py-2 font-medium">
                            {t('sraCampaign.records.date')}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {entries.map((entry) => (
                          <tr key={entry.id} className="border-b last:border-0">
                            <td className="px-3 py-2 font-mono text-xs font-semibold">
                              {entry.token}
                            </td>
                            <td className="px-3 py-2 font-mono text-xs">
                              {entry.sraVoterId}
                            </td>
                            <td className="px-3 py-2">{entry.name}</td>
                            <td className="px-3 py-2">{entry.phoneNumber}</td>
                            <td className="max-w-[200px] truncate px-3 py-2 text-muted-foreground">
                              {entry.description || '—'}
                            </td>
                            <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                              {new Date(entry.createdAt).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

type SraCampaignCompletionProps = {
  entry: SraCampaignVoter;
  t: (key: string) => string;
  onRegisterAnother: () => void;
  onShareThermalTicket: () => void;
};

function SraCampaignCompletion({
  entry,
  t,
  onRegisterAnother,
  onShareThermalTicket,
}: SraCampaignCompletionProps) {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-4">
        <div className="p-6 bg-green-50 border-2 border-green-200 rounded-lg dark:bg-green-950/30 dark:border-green-800">
          <Label className="text-sm font-medium text-green-800 dark:text-green-200">
            {t('sraCampaign.completion.referenceToken')}
          </Label>
          <p className="text-2xl font-bold text-green-900 dark:text-green-100 mt-2 font-mono">
            {entry.token}
          </p>
          <p className="text-sm text-green-700 dark:text-green-300 mt-2">
            {t('sraCampaign.completion.saveToken')}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 rounded-lg bg-muted p-4 sm:grid-cols-2">
        <div>
          <Label className="text-sm font-medium">{t('sraCampaign.fields.sraVoterId')}</Label>
          <p className="font-mono text-sm">{entry.sraVoterId}</p>
        </div>
        <div>
          <Label className="text-sm font-medium">{t('sraCampaign.fields.name')}</Label>
          <p className="text-sm">{entry.name}</p>
        </div>
        <div>
          <Label className="text-sm font-medium">{t('sraCampaign.fields.phoneNumber')}</Label>
          <p className="font-mono text-sm">{entry.phoneNumber}</p>
        </div>
        <div>
          <Label className="text-sm font-medium">{t('sraCampaign.records.date')}</Label>
          <p className="text-sm">{new Date(entry.createdAt).toLocaleString()}</p>
        </div>
        {entry.description ? (
          <div className="sm:col-span-2">
            <Label className="text-sm font-medium">{t('sraCampaign.fields.description')}</Label>
            <p className="text-sm text-muted-foreground">{entry.description}</p>
          </div>
        ) : null}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button type="button" onClick={onRegisterAnother} className="flex-1">
          {t('sraCampaign.actions.registerAnother')}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={onShareThermalTicket}
          className="flex-1"
        >
          <Share2 className="mr-2 size-4" />
          {t('sraCampaign.actions.shareThermalTicket')}
        </Button>
      </div>
    </div>
  );
}

type SraCampaignFormProps = {
  form: typeof emptyForm;
  formErrors: Record<string, string>;
  isSubmitting: boolean;
  updateField: (field: keyof typeof emptyForm, value: string) => void;
  validateFieldOnBlur: (field: keyof typeof emptyForm) => void;
  handleSubmit: (e: React.FormEvent) => void;
  t: (key: string) => string;
};

function SraCampaignForm({
  form,
  formErrors,
  isSubmitting,
  updateField,
  validateFieldOnBlur,
  handleSubmit,
  t,
}: SraCampaignFormProps) {
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="sraVoterId">
          {t('sraCampaign.fields.sraVoterId')}{' '}
          <span className="text-destructive">*</span>
        </Label>
        <Input
          id="sraVoterId"
          value={form.sraVoterId}
          onChange={(e) =>
            updateField('sraVoterId', e.target.value.toUpperCase())
          }
          onBlur={() => validateFieldOnBlur('sraVoterId')}
          placeholder={t('sraCampaign.placeholders.sraVoterId')}
          maxLength={50}
          required
          aria-invalid={!!formErrors.sraVoterId}
          className={formErrors.sraVoterId ? 'border-destructive' : ''}
        />
        {formErrors.sraVoterId && (
          <p className="text-sm text-destructive">{formErrors.sraVoterId}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="name">
          {t('sraCampaign.fields.name')}{' '}
          <span className="text-destructive">*</span>
        </Label>
        <Input
          id="name"
          value={form.name}
          onChange={(e) => updateField('name', e.target.value)}
          onBlur={() => validateFieldOnBlur('name')}
          placeholder={t('sraCampaign.placeholders.name')}
          maxLength={255}
          required
          aria-invalid={!!formErrors.name}
          className={formErrors.name ? 'border-destructive' : ''}
        />
        {formErrors.name && (
          <p className="text-sm text-destructive">{formErrors.name}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="phoneNumber">
          {t('sraCampaign.fields.phoneNumber')}{' '}
          <span className="text-destructive">*</span>
        </Label>
        <Input
          id="phoneNumber"
          type="tel"
          inputMode="numeric"
          pattern="[0-9]{10}"
          autoComplete="tel"
          value={form.phoneNumber}
          onChange={(e) =>
            updateField(
              'phoneNumber',
              normalizeIndianMobileDigits(e.target.value).slice(0, 10),
            )
          }
          onBlur={() => validateFieldOnBlur('phoneNumber')}
          placeholder={t('sraCampaign.placeholders.phoneNumber')}
          maxLength={10}
          required
          aria-invalid={!!formErrors.phoneNumber}
          className={`font-mono ${formErrors.phoneNumber ? 'border-destructive' : ''}`}
        />
        {formErrors.phoneNumber && (
          <p className="text-sm text-destructive">{formErrors.phoneNumber}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">{t('sraCampaign.fields.description')}</Label>
        <Textarea
          id="description"
          value={form.description}
          onChange={(e) => updateField('description', e.target.value)}
          onBlur={() => validateFieldOnBlur('description')}
          placeholder={t('sraCampaign.placeholders.description')}
          maxLength={2000}
          rows={4}
          aria-invalid={!!formErrors.description}
          className={formErrors.description ? 'border-destructive' : ''}
        />
        {formErrors.description && (
          <p className="text-sm text-destructive">{formErrors.description}</p>
        )}
      </div>

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
        {t('sraCampaign.actions.save')}
      </Button>
    </form>
  );
}
