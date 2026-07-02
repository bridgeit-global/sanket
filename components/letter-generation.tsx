'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Eye, FileDown, Loader2, Save, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useTranslations } from '@/hooks/use-translations';
import {
  buildLetterBody,
  DEFAULT_RATION_OFFICE_ADDRESS,
  DEFAULT_SIGNATORY,
  type CommonLetterFields,
  type DomicileLetterFields,
  type FeesLetterFields,
  type IncomeLetterFields,
  type LetterLocale,
  type LetterType,
  type RationLetterFields,
} from '@/lib/letters/templates';
import { exportElementToPdf, A4_PORTRAIT_CONTENT_WIDTH_PX } from '@/lib/pdf/export-element-to-pdf';
import { DateRangePicker } from '@/components/date-range-picker';
import { SidebarToggle } from './sidebar-toggle';

const ALL_LETTER_TYPES = 'all' as const;
type SavedLetterTypeFilter = LetterType | typeof ALL_LETTER_TYPES;

function isLetterWithinDateRange(
  createdAt: string | Date,
  startDate: string,
  endDate: string,
): boolean {
  const date = new Date(createdAt);
  if (startDate) {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    if (date < start) return false;
  }
  if (endDate) {
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    if (date > end) return false;
  }
  return true;
}

const todayDisplay = () =>
  new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

function commonDefaults(locale: LetterLocale) {
  return {
    referenceNo: '',
    date: todayDisplay(),
    signatory: DEFAULT_SIGNATORY[locale],
  };
}

function feesDefaults(locale: LetterLocale): FeesLetterFields {
  return {
    ...commonDefaults(locale),
    schoolName: '',
    schoolAddress: '',
    standard: '',
    studentName: '',
    studentGender: 'male',
  };
}

function rationDefaults(locale: LetterLocale): RationLetterFields {
  return {
    ...commonDefaults(locale),
    salutation: locale === 'en' ? 'Smt.' : 'श्रीमती',
    fullName: '',
    address: '',
    purpose: 'new',
    familyMembers: '',
    rationOfficeAddress: DEFAULT_RATION_OFFICE_ADDRESS[locale],
  };
}

function incomeDefaults(locale: LetterLocale): IncomeLetterFields {
  return {
    ...commonDefaults(locale),
    salutation: locale === 'en' ? 'Shri' : 'श्री',
    fullName: '',
    address: '',
    idType: locale === 'en' ? 'Aadhaar' : 'आधार',
    idNumber: '',
    income: '',
  };
}

function domicileDefaults(locale: LetterLocale): DomicileLetterFields {
  return {
    ...commonDefaults(locale),
    salutation: locale === 'en' ? 'Shri' : 'श्री',
    fullName: '',
    address: '',
    idType: locale === 'en' ? 'Aadhaar' : 'आधार',
    idNumber: '',
  };
}

function createLetterExportElement(body: string): HTMLDivElement {
  const host = document.createElement('div');
  host.className = 'rounded-lg bg-white p-6 text-black shadow-sm';
  const pre = document.createElement('pre');
  pre.className = 'whitespace-pre-wrap font-[inherit] text-[15px] leading-7 text-black';
  pre.style.margin = '0';
  pre.textContent = body;
  host.appendChild(pre);
  return host;
}

function LetterPreview({ body }: { body: string }) {
  return (
    <div className="rounded-lg bg-white p-6 text-black shadow-sm">
      <pre
        className="whitespace-pre-wrap font-[inherit] text-[15px] leading-7 text-black"
        style={{ margin: 0 }}
      >
        {body}
      </pre>
    </div>
  );
}

function FieldGroup({
  label,
  children,
  className,
  required,
  error,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
  required?: boolean;
  error?: string;
}) {
  return (
    <div className={className}>
      <Label className="mb-1.5 block text-sm">
        {label}
        {required ? ' *' : null}
      </Label>
      {children}
      {error ? <p className="mt-1 text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

type CommonFieldErrors = {
  referenceNo?: string;
  date?: string;
};

function validateRequiredCommonFields(
  referenceNo: string,
  date: string,
  t: (key: string) => string,
  existingReferenceNos: string[] = [],
): CommonFieldErrors {
  const errors: CommonFieldErrors = {};
  const trimmedReferenceNo = referenceNo.trim();
  if (!trimmedReferenceNo) {
    errors.referenceNo = t('letterGeneration.validation.referenceNoRequired');
  } else if (
    existingReferenceNos.some((existing) => existing.trim() === trimmedReferenceNo)
  ) {
    errors.referenceNo = t('letterGeneration.validation.referenceNoDuplicate');
  }
  if (!date.trim()) {
    errors.date = t('letterGeneration.validation.dateRequired');
  }
  return errors;
}

type SavedLetterRow = {
  id: string;
  letterType: LetterType;
  letterLocale: LetterLocale;
  referenceNo: string;
  title: string;
  fields: unknown;
  body: string;
  createdAt: string | Date;
};

export function LetterGeneration() {
  const { t, locale } = useTranslations();
  const [activeTab, setActiveTab] = useState<LetterType>('fees');
  const [isSaving, setIsSaving] = useState(false);
  const [downloadingLetterId, setDownloadingLetterId] = useState<string | null>(null);
  const [isGeneratorCollapsed, setIsGeneratorCollapsed] = useState(false);

  const [feesFields, setFeesFields] = useState<FeesLetterFields>(() =>
    feesDefaults(locale),
  );
  const [rationFields, setRationFields] = useState<RationLetterFields>(() =>
    rationDefaults(locale),
  );
  const [incomeFields, setIncomeFields] = useState<IncomeLetterFields>(() =>
    incomeDefaults(locale),
  );
  const [domicileFields, setDomicileFields] = useState<DomicileLetterFields>(
    () => domicileDefaults(locale),
  );

  const [savedLetters, setSavedLetters] = useState<SavedLetterRow[]>([]);
  const [savedLettersLoading, setSavedLettersLoading] = useState(false);
  const [selectedSavedLetterId, setSelectedSavedLetterId] = useState<string | null>(
    null,
  );
  const [filterLetterType, setFilterLetterType] =
    useState<SavedLetterTypeFilter>(ALL_LETTER_TYPES);
  const [filterReference, setFilterReference] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [commonFieldErrors, setCommonFieldErrors] = useState<CommonFieldErrors>({});


  useEffect(() => {
    setCommonFieldErrors({});
  }, [activeTab]);

  const refreshSavedLetters = async () => {
    setSavedLettersLoading(true);
    try {
      const res = await fetch('/api/letters?limit=50');
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to fetch letters');
      setSavedLetters((json?.letters ?? []) as SavedLetterRow[]);
    } catch (error) {
      console.error('Failed to fetch letters', error);
      toast.error(t('letterGeneration.savedLetters.fetchError'));
    } finally {
      setSavedLettersLoading(false);
    }
  };

  useEffect(() => {
    void refreshSavedLetters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const existingReferenceNos = useMemo(
    () => savedLetters.map((letter) => letter.referenceNo),
    [savedLetters],
  );

  const activeBody = useMemo(() => {
    switch (activeTab) {
      case 'fees':
        return buildLetterBody('fees', feesFields, locale);
      case 'ration':
        return buildLetterBody('ration', rationFields, locale);
      case 'income':
        return buildLetterBody('income', incomeFields, locale);
      case 'domicile':
        return buildLetterBody('domicile', domicileFields, locale);
      default:
        return '';
    }
  }, [
    activeTab,
    locale,
    feesFields,
    rationFields,
    incomeFields,
    domicileFields,
  ]);

  const activeTitle = t(`letterGeneration.tabs.${activeTab}`);

  const activeFields = useMemo(() => {
    switch (activeTab) {
      case 'fees':
        return feesFields;
      case 'ration':
        return rationFields;
      case 'income':
        return incomeFields;
      case 'domicile':
        return domicileFields;
      default:
        return feesFields;
    }
  }, [activeTab, domicileFields, feesFields, incomeFields, rationFields]);

  const activeReferenceNo = useMemo(() => {
    switch (activeTab) {
      case 'fees':
        return feesFields.referenceNo;
      case 'ration':
        return rationFields.referenceNo;
      case 'income':
        return incomeFields.referenceNo;
      case 'domicile':
        return domicileFields.referenceNo;
      default:
        return '';
    }
  }, [
    activeTab,
    feesFields.referenceNo,
    rationFields.referenceNo,
    incomeFields.referenceNo,
    domicileFields.referenceNo,
  ]);

  const activeDate = useMemo(() => {
    switch (activeTab) {
      case 'fees':
        return feesFields.date;
      case 'ration':
        return rationFields.date;
      case 'income':
        return incomeFields.date;
      case 'domicile':
        return domicileFields.date;
      default:
        return '';
    }
  }, [
    activeTab,
    feesFields.date,
    rationFields.date,
    incomeFields.date,
    domicileFields.date,
  ]);

  const validateActiveCommonFields = () => {
    const errors = validateRequiredCommonFields(
      activeReferenceNo,
      activeDate,
      t,
      existingReferenceNos,
    );
    setCommonFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      const firstError = errors.referenceNo ?? errors.date;
      if (firstError) toast.error(firstError);
      return false;
    }
    return true;
  };

  const handleSaveLetter = async () => {
    if (!validateActiveCommonFields()) return;

    setIsSaving(true);
    try {
      const res = await fetch('/api/letters', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          letterType: activeTab,
          letterLocale: locale,
          referenceNo: activeReferenceNo.trim(),
          title: activeTitle,
          fields: activeFields,
          body: activeBody,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        if (res.status === 409 || json?.error === 'referenceNo already exists') {
          const duplicateMessage = t(
            'letterGeneration.validation.referenceNoDuplicate',
          );
          setCommonFieldErrors((prev) => ({
            ...prev,
            referenceNo: duplicateMessage,
          }));
          toast.error(duplicateMessage);
          return;
        }
        throw new Error(json?.error || 'Failed to save letter');
      }
      toast.success(t('letterGeneration.savedLetters.saveSuccess'));
      await refreshSavedLetters();
      setSelectedSavedLetterId(json?.letter?.id ?? null);
    } catch (error) {
      console.error('Failed to save letter', error);
      toast.error(t('letterGeneration.savedLetters.saveError'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteSavedLetter = async (id: string) => {
    try {
      const res = await fetch(`/api/letters/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to delete letter');
      toast.success(t('letterGeneration.savedLetters.deleteSuccess'));
      setSavedLetters((prev) => prev.filter((l) => l.id !== id));
      setSelectedSavedLetterId((prev) => (prev === id ? null : prev));
    } catch (error) {
      console.error('Failed to delete letter', error);
      toast.error(t('letterGeneration.savedLetters.deleteError'));
    }
  };

  const handleDownloadSavedLetter = async (letter: SavedLetterRow) => {
    setDownloadingLetterId(letter.id);
    let exportHost: HTMLDivElement | null = null;
    try {
      exportHost = createLetterExportElement(letter.body);
      document.body.appendChild(exportHost);
      await exportElementToPdf({
        element: exportHost,
        fileName: `${letter.title}-${letter.referenceNo || 'letter'}`,
        format: 'a4',
        orientation: 'portrait',
        marginMm: 15,
        scale: 2,
        captureWidthPx: A4_PORTRAIT_CONTENT_WIDTH_PX,
      });
      toast.success(t('letterGeneration.pdfSuccess'));
    } catch (error) {
      console.error('Saved letter PDF export failed', error);
      toast.error(t('letterGeneration.pdfError'));
    } finally {
      exportHost?.remove();
      setDownloadingLetterId(null);
    }
  };

  const filteredSavedLetters = useMemo(() => {
    const referenceQuery = filterReference.trim().toLowerCase();
    return savedLetters.filter((letter) => {
      if (
        filterLetterType !== ALL_LETTER_TYPES &&
        letter.letterType !== filterLetterType
      ) {
        return false;
      }
      if (
        referenceQuery &&
        !(letter.referenceNo ?? '').toLowerCase().includes(referenceQuery)
      ) {
        return false;
      }
      if (
        !isLetterWithinDateRange(letter.createdAt, filterStartDate, filterEndDate)
      ) {
        return false;
      }
      return true;
    });
  }, [
    savedLetters,
    filterLetterType,
    filterReference,
    filterStartDate,
    filterEndDate,
  ]);

  const hasActiveSavedLetterFilters =
    filterLetterType !== ALL_LETTER_TYPES ||
    filterReference.trim() !== '' ||
    filterStartDate !== '' ||
    filterEndDate !== '';

  useEffect(() => {
    if (
      selectedSavedLetterId &&
      !filteredSavedLetters.some((letter) => letter.id === selectedSavedLetterId)
    ) {
      setSelectedSavedLetterId(null);
    }
  }, [filteredSavedLetters, selectedSavedLetterId]);

  const selectedSavedLetter = useMemo(() => {
    if (!selectedSavedLetterId) return null;
    return filteredSavedLetters.find((l) => l.id === selectedSavedLetterId) ?? null;
  }, [filteredSavedLetters, selectedSavedLetterId]);

  const renderCommonFields = <T extends CommonLetterFields>(
    fields: T,
    setFields: React.Dispatch<React.SetStateAction<T>>,
  ) => (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <FieldGroup
          label={t('letterGeneration.fields.referenceNo')}
          required
          error={commonFieldErrors.referenceNo}
        >
          <Input
            value={fields.referenceNo}
            onChange={(e) => {
              setFields({ ...fields, referenceNo: e.target.value });
              if (commonFieldErrors.referenceNo) {
                setCommonFieldErrors((prev) => ({ ...prev, referenceNo: undefined }));
              }
            }}
            placeholder={t('letterGeneration.placeholders.referenceNo')}
            required
            aria-invalid={!!commonFieldErrors.referenceNo}
          />
        </FieldGroup>
        <FieldGroup
          label={t('letterGeneration.fields.date')}
          required
          error={commonFieldErrors.date}
        >
          <Input
            value={fields.date}
            onChange={(e) => {
              setFields({ ...fields, date: e.target.value });
              if (commonFieldErrors.date) {
                setCommonFieldErrors((prev) => ({ ...prev, date: undefined }));
              }
            }}
            placeholder={t('letterGeneration.placeholders.date')}
            required
            aria-invalid={!!commonFieldErrors.date}
          />
        </FieldGroup>
      </div>
      <FieldGroup label={t('letterGeneration.fields.signatory')}>
        <Input
          value={fields.signatory}
          onChange={(e) => setFields({ ...fields, signatory: e.target.value })}
        />
      </FieldGroup>
    </>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <SidebarToggle />
          <div>
            <h1 className="text-3xl font-bold">{t('letterGeneration.title')}</h1>
            <p className="text-muted-foreground mt-2">{t('letterGeneration.description')}</p>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader
          className="cursor-pointer select-none hover:bg-muted/50 transition-colors rounded-t-lg"
          onClick={() => setIsGeneratorCollapsed((v) => !v)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setIsGeneratorCollapsed((v) => !v);
            }
          }}
          role="button"
          tabIndex={0}
          aria-expanded={!isGeneratorCollapsed}
          aria-controls="letter-generator-content"
          id="letter-generator-header"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <CardTitle className="text-lg">{t('letterGeneration.title')}</CardTitle>
              <CardDescription>{t('letterGeneration.formDescription')}</CardDescription>
            </div>
            {isGeneratorCollapsed ? (
              <ChevronDown className="mt-1 size-5 shrink-0 text-muted-foreground" aria-hidden />
            ) : (
              <ChevronUp className="mt-1 size-5 shrink-0 text-muted-foreground" aria-hidden />
            )}
          </div>
        </CardHeader>

        {isGeneratorCollapsed ? null : (
          <CardContent
            id="letter-generator-content"
            aria-labelledby="letter-generator-header"
          >
            <Tabs
              value={activeTab}
              onValueChange={(value) => setActiveTab(value as LetterType)}
            >
              <div className="max-w-md">
                <FieldGroup label={t('letterGeneration.fields.letterType')}>
                  <Select
                    value={activeTab}
                    onValueChange={(value: LetterType) => setActiveTab(value)}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={t('letterGeneration.placeholders.letterType')}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fees">{t('letterGeneration.tabs.fees')}</SelectItem>
                      <SelectItem value="ration">{t('letterGeneration.tabs.ration')}</SelectItem>
                      <SelectItem value="income">{t('letterGeneration.tabs.income')}</SelectItem>
                      <SelectItem value="domicile">
                        {t('letterGeneration.tabs.domicile')}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </FieldGroup>
              </div>

              <div className="mt-6 grid gap-6 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">
                      {t('letterGeneration.formTitle')}
                    </CardTitle>
                    <CardDescription>
                      {t('letterGeneration.formDescription')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <TabsContent value="fees" className="mt-0 space-y-4">
                      {renderCommonFields(feesFields, setFeesFields)}
                      <FieldGroup label={t('letterGeneration.fields.schoolName')}>
                        <Input
                          value={feesFields.schoolName}
                          onChange={(e) =>
                            setFeesFields({ ...feesFields, schoolName: e.target.value })
                          }
                        />
                      </FieldGroup>
                      <FieldGroup label={t('letterGeneration.fields.schoolAddress')}>
                        <Textarea
                          value={feesFields.schoolAddress}
                          onChange={(e) =>
                            setFeesFields({
                              ...feesFields,
                              schoolAddress: e.target.value,
                            })
                          }
                          rows={2}
                        />
                      </FieldGroup>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <FieldGroup label={t('letterGeneration.fields.standard')}>
                          <Input
                            value={feesFields.standard}
                            onChange={(e) =>
                              setFeesFields({ ...feesFields, standard: e.target.value })
                            }
                            placeholder={t('letterGeneration.placeholders.standard')}
                          />
                        </FieldGroup>
                        <FieldGroup label={t('letterGeneration.fields.studentName')}>
                          <Input
                            value={feesFields.studentName}
                            onChange={(e) =>
                              setFeesFields({
                                ...feesFields,
                                studentName: e.target.value,
                              })
                            }
                          />
                        </FieldGroup>
                      </div>
                      <FieldGroup label={t('letterGeneration.fields.studentGender')}>
                        <Select
                          value={feesFields.studentGender}
                          onValueChange={(value: 'male' | 'female') =>
                            setFeesFields({ ...feesFields, studentGender: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="male">
                              {t('letterGeneration.gender.male')}
                            </SelectItem>
                            <SelectItem value="female">
                              {t('letterGeneration.gender.female')}
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </FieldGroup>
                    </TabsContent>

                    <TabsContent value="ration" className="mt-0 space-y-4">
                      {renderCommonFields(rationFields, setRationFields)}
                      <div className="grid gap-4 sm:grid-cols-2">
                        <FieldGroup label={t('letterGeneration.fields.salutation')}>
                          <Input
                            value={rationFields.salutation}
                            onChange={(e) =>
                              setRationFields({
                                ...rationFields,
                                salutation: e.target.value,
                              })
                            }
                            placeholder={t('letterGeneration.placeholders.salutation')}
                          />
                        </FieldGroup>
                        <FieldGroup label={t('letterGeneration.fields.fullName')}>
                          <Input
                            value={rationFields.fullName}
                            onChange={(e) =>
                              setRationFields({
                                ...rationFields,
                                fullName: e.target.value,
                              })
                            }
                          />
                        </FieldGroup>
                      </div>
                      <FieldGroup label={t('letterGeneration.fields.address')}>
                        <Textarea
                          value={rationFields.address}
                          onChange={(e) =>
                            setRationFields({ ...rationFields, address: e.target.value })
                          }
                          rows={2}
                        />
                      </FieldGroup>
                      <FieldGroup label={t('letterGeneration.fields.rationPurpose')}>
                        <Select
                          value={rationFields.purpose}
                          onValueChange={(value: 'new' | 'add-members') =>
                            setRationFields({ ...rationFields, purpose: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="new">
                              {t('letterGeneration.rationPurpose.new')}
                            </SelectItem>
                            <SelectItem value="add-members">
                              {t('letterGeneration.rationPurpose.addMembers')}
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </FieldGroup>
                      <FieldGroup label={t('letterGeneration.fields.familyMembers')}>
                        <Textarea
                          value={rationFields.familyMembers}
                          onChange={(e) =>
                            setRationFields({
                              ...rationFields,
                              familyMembers: e.target.value,
                            })
                          }
                          rows={4}
                          placeholder={t('letterGeneration.placeholders.familyMembers')}
                        />
                      </FieldGroup>
                      <FieldGroup label={t('letterGeneration.fields.rationOfficeAddress')}>
                        <Textarea
                          value={rationFields.rationOfficeAddress}
                          onChange={(e) =>
                            setRationFields({
                              ...rationFields,
                              rationOfficeAddress: e.target.value,
                            })
                          }
                          rows={2}
                        />
                      </FieldGroup>
                    </TabsContent>

                    <TabsContent value="income" className="mt-0 space-y-4">
                      {renderCommonFields(incomeFields, setIncomeFields)}
                      <div className="grid gap-4 sm:grid-cols-2">
                        <FieldGroup label={t('letterGeneration.fields.salutation')}>
                          <Input
                            value={incomeFields.salutation}
                            onChange={(e) =>
                              setIncomeFields({
                                ...incomeFields,
                                salutation: e.target.value,
                              })
                            }
                          />
                        </FieldGroup>
                        <FieldGroup label={t('letterGeneration.fields.fullName')}>
                          <Input
                            value={incomeFields.fullName}
                            onChange={(e) =>
                              setIncomeFields({
                                ...incomeFields,
                                fullName: e.target.value,
                              })
                            }
                          />
                        </FieldGroup>
                      </div>
                      <FieldGroup label={t('letterGeneration.fields.address')}>
                        <Textarea
                          value={incomeFields.address}
                          onChange={(e) =>
                            setIncomeFields({ ...incomeFields, address: e.target.value })
                          }
                          rows={2}
                        />
                      </FieldGroup>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <FieldGroup label={t('letterGeneration.fields.idType')}>
                          <Input
                            value={incomeFields.idType}
                            onChange={(e) =>
                              setIncomeFields({
                                ...incomeFields,
                                idType: e.target.value,
                              })
                            }
                            placeholder={t('letterGeneration.placeholders.idType')}
                          />
                        </FieldGroup>
                        <FieldGroup label={t('letterGeneration.fields.idNumber')}>
                          <Input
                            value={incomeFields.idNumber}
                            onChange={(e) =>
                              setIncomeFields({
                                ...incomeFields,
                                idNumber: e.target.value,
                              })
                            }
                          />
                        </FieldGroup>
                      </div>
                      <FieldGroup label={t('letterGeneration.fields.income')}>
                        <Input
                          value={incomeFields.income}
                          onChange={(e) =>
                            setIncomeFields({ ...incomeFields, income: e.target.value })
                          }
                          placeholder={t('letterGeneration.placeholders.income')}
                        />
                      </FieldGroup>
                    </TabsContent>

                    <TabsContent value="domicile" className="mt-0 space-y-4">
                      {renderCommonFields(domicileFields, setDomicileFields)}
                      <div className="grid gap-4 sm:grid-cols-2">
                        <FieldGroup label={t('letterGeneration.fields.salutation')}>
                          <Input
                            value={domicileFields.salutation}
                            onChange={(e) =>
                              setDomicileFields({
                                ...domicileFields,
                                salutation: e.target.value,
                              })
                            }
                          />
                        </FieldGroup>
                        <FieldGroup label={t('letterGeneration.fields.fullName')}>
                          <Input
                            value={domicileFields.fullName}
                            onChange={(e) =>
                              setDomicileFields({
                                ...domicileFields,
                                fullName: e.target.value,
                              })
                            }
                          />
                        </FieldGroup>
                      </div>
                      <FieldGroup label={t('letterGeneration.fields.address')}>
                        <Textarea
                          value={domicileFields.address}
                          onChange={(e) =>
                            setDomicileFields({
                              ...domicileFields,
                              address: e.target.value,
                            })
                          }
                          rows={2}
                        />
                      </FieldGroup>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <FieldGroup label={t('letterGeneration.fields.idType')}>
                          <Input
                            value={domicileFields.idType}
                            onChange={(e) =>
                              setDomicileFields({
                                ...domicileFields,
                                idType: e.target.value,
                              })
                            }
                          />
                        </FieldGroup>
                        <FieldGroup label={t('letterGeneration.fields.idNumber')}>
                          <Input
                            value={domicileFields.idNumber}
                            onChange={(e) =>
                              setDomicileFields({
                                ...domicileFields,
                                idNumber: e.target.value,
                              })
                            }
                          />
                        </FieldGroup>
                      </div>
                    </TabsContent>
                  </CardContent>
                </Card>

                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="text-lg font-semibold">
                      {t('letterGeneration.previewTitle')}
                    </h2>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        onClick={handleSaveLetter}
                        disabled={isSaving}
                      >
                        {isSaving ? (
                          <Loader2 className="mr-2 size-4 animate-spin" />
                        ) : (
                          <Save className="mr-2 size-4" />
                        )}
                        {t('letterGeneration.savedLetters.save')}
                      </Button>
                    </div>
                  </div>
                  <LetterPreview body={activeBody} />
                </div>
              </div>
            </Tabs>
          </CardContent>
        )}
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <CardTitle className="text-lg">
                {t('letterGeneration.savedLetters.title')}
              </CardTitle>
              <CardDescription>
                {t('letterGeneration.savedLetters.description')}
              </CardDescription>
            </div>
            <div className="text-sm text-muted-foreground">
              {savedLettersLoading
                ? t('common.loading')
                : hasActiveSavedLetterFilters
                  ? t('letterGeneration.savedLetters.filteredCount', {
                      filtered: filteredSavedLetters.length,
                      total: savedLetters.length,
                    })
                  : t('letterGeneration.savedLetters.count', {
                      count: savedLetters.length,
                    })}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {savedLetters.length === 0 ? (
            <div className="py-6 text-sm text-muted-foreground">
              {t('letterGeneration.savedLetters.empty')}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <FieldGroup label={t('letterGeneration.fields.letterType')}>
                  <Select
                    value={filterLetterType}
                    onValueChange={(value: SavedLetterTypeFilter) =>
                      setFilterLetterType(value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL_LETTER_TYPES}>
                        {t('letterGeneration.savedLetters.filters.allTypes')}
                      </SelectItem>
                      <SelectItem value="fees">
                        {t('letterGeneration.tabs.fees')}
                      </SelectItem>
                      <SelectItem value="ration">
                        {t('letterGeneration.tabs.ration')}
                      </SelectItem>
                      <SelectItem value="income">
                        {t('letterGeneration.tabs.income')}
                      </SelectItem>
                      <SelectItem value="domicile">
                        {t('letterGeneration.tabs.domicile')}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </FieldGroup>

                <FieldGroup label={t('letterGeneration.fields.referenceNo')}>
                  <Input
                    value={filterReference}
                    onChange={(e) => setFilterReference(e.target.value)}
                    placeholder={t('letterGeneration.placeholders.referenceNo')}
                  />
                </FieldGroup>

                <FieldGroup
                  label={t('letterGeneration.savedLetters.filters.dateRange')}
                  className="sm:col-span-2"
                >
                  <DateRangePicker
                    startDate={filterStartDate}
                    endDate={filterEndDate}
                    onDateRangeChange={(start, end) => {
                      setFilterStartDate(start);
                      setFilterEndDate(end);
                    }}
                  />
                </FieldGroup>
              </div>

              {filteredSavedLetters.length === 0 ? (
                <div className="py-6 text-sm text-muted-foreground">
                  {t('letterGeneration.savedLetters.noFilterResults')}
                </div>
              ) : (
                <>
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  onClick={() => void refreshSavedLetters()}
                  disabled={savedLettersLoading}
                >
                  {t('letterGeneration.savedLetters.refresh')}
                </Button>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      {t('letterGeneration.savedLetters.columns.referenceNo')}
                    </TableHead>
                    <TableHead>{t('letterGeneration.savedLetters.columns.type')}</TableHead>
                    <TableHead>
                      {t('letterGeneration.savedLetters.columns.locale')}
                    </TableHead>
                    <TableHead>
                      {t('letterGeneration.savedLetters.columns.createdAt')}
                    </TableHead>
                    <TableHead className="text-right">
                      {t('letterGeneration.savedLetters.columns.actions')}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSavedLetters.map((letter) => (
                    <TableRow key={letter.id}>
                      <TableCell className="font-medium">
                        {letter.referenceNo || '—'}
                      </TableCell>
                      <TableCell>{t(`letterGeneration.tabs.${letter.letterType}`)}</TableCell>
                      <TableCell>
                        {t(`letterGeneration.letterLanguage.${letter.letterLocale}`)}
                      </TableCell>
                      <TableCell>
                        {new Date(letter.createdAt).toLocaleString('en-IN')}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => void handleDownloadSavedLetter(letter)}
                            disabled={downloadingLetterId === letter.id}
                          >
                            {downloadingLetterId === letter.id ? (
                              <Loader2 className="mr-2 size-4 animate-spin" />
                            ) : (
                              <FileDown className="mr-2 size-4" />
                            )}
                            {t('letterGeneration.savedLetters.actions.download')}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedSavedLetterId(letter.id)}
                          >
                            <Eye className="mr-2 size-4" />
                            {t('letterGeneration.savedLetters.actions.preview')}
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => void handleDeleteSavedLetter(letter.id)}
                          >
                            <Trash2 className="mr-2 size-4" />
                            {t('letterGeneration.savedLetters.actions.delete')}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <Dialog
                open={!!selectedSavedLetter}
                onOpenChange={(open) => {
                  if (!open) setSelectedSavedLetterId(null);
                }}
              >
                <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
                  {selectedSavedLetter ? (
                    <>
                      <DialogHeader>
                        <DialogTitle>
                          {selectedSavedLetter.title}{' '}
                          {selectedSavedLetter.referenceNo
                            ? `- ${selectedSavedLetter.referenceNo}`
                            : ''}
                        </DialogTitle>
                        <DialogDescription>
                          {t(`letterGeneration.tabs.${selectedSavedLetter.letterType}`)} ·{' '}
                          {t(
                            `letterGeneration.letterLanguage.${selectedSavedLetter.letterLocale}`,
                          )}
                        </DialogDescription>
                      </DialogHeader>
                      <LetterPreview body={selectedSavedLetter.body} />
                      <DialogFooter className="gap-2 sm:gap-0">
                        <Button
                          variant="outline"
                          onClick={() => void handleDownloadSavedLetter(selectedSavedLetter)}
                          disabled={downloadingLetterId === selectedSavedLetter.id}
                        >
                          {downloadingLetterId === selectedSavedLetter.id ? (
                            <Loader2 className="mr-2 size-4 animate-spin" />
                          ) : (
                            <FileDown className="mr-2 size-4" />
                          )}
                          {t('letterGeneration.savedLetters.actions.download')}
                        </Button>
                      </DialogFooter>
                    </>
                  ) : null}
                </DialogContent>
              </Dialog>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
