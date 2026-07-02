'use client';

import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { SidebarToggle } from './sidebar-toggle';

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

function LetterPreview({
  body,
  previewRef,
}: {
  body: string;
  previewRef?: RefObject<HTMLDivElement>;
}) {
  return (
    <div
      ref={previewRef}
      className="rounded-lg bg-white p-6 text-black shadow-sm"
    >
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
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label className="mb-1.5 block text-sm">{label}</Label>
      {children}
    </div>
  );
}

type SavedLetterRow = {
  id: string;
  letterType: LetterType;
  letterLocale: LetterLocale;
  referenceNo: string | null;
  title: string;
  fields: unknown;
  body: string;
  createdAt: string | Date;
};

export function LetterGeneration() {
  const { t, locale } = useTranslations();
  const previewRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<LetterType>('fees');
  const [letterLanguage, setLetterLanguage] = useState<LetterLocale>(locale);
  const [isExporting, setIsExporting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
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

  useEffect(() => {
    setLetterLanguage(locale);
  }, [locale]);

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

  const activeBody = useMemo(() => {
    switch (activeTab) {
      case 'fees':
        return buildLetterBody('fees', feesFields, letterLanguage);
      case 'ration':
        return buildLetterBody('ration', rationFields, letterLanguage);
      case 'income':
        return buildLetterBody('income', incomeFields, letterLanguage);
      case 'domicile':
        return buildLetterBody('domicile', domicileFields, letterLanguage);
      default:
        return '';
    }
  }, [
    activeTab,
    letterLanguage,
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

  const handleExportPdf = async () => {
    const target = previewRef.current;
    if (!target) return;

    setIsExporting(true);
    try {
      await exportElementToPdf({
        element: target,
        fileName: `${activeTitle}-${activeReferenceNo || 'letter'}`,
        format: 'a4',
        orientation: 'portrait',
        marginMm: 15,
        scale: 2,
        captureWidthPx: A4_PORTRAIT_CONTENT_WIDTH_PX,
      });
      toast.success(t('letterGeneration.pdfSuccess'));
    } catch (error) {
      console.error('Letter PDF export failed', error);
      toast.error(t('letterGeneration.pdfError'));
    } finally {
      setIsExporting(false);
    }
  };

  const handleSaveLetter = async () => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/letters', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          letterType: activeTab,
          letterLocale: letterLanguage,
          referenceNo: activeReferenceNo || null,
          title: activeTitle,
          fields: activeFields,
          body: activeBody,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to save letter');
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

  const handleLoadSavedLetter = (letter: SavedLetterRow) => {
    setLetterLanguage(letter.letterLocale);
    setActiveTab(letter.letterType);
    switch (letter.letterType) {
      case 'fees':
        setFeesFields(letter.fields as FeesLetterFields);
        break;
      case 'ration':
        setRationFields(letter.fields as RationLetterFields);
        break;
      case 'income':
        setIncomeFields(letter.fields as IncomeLetterFields);
        break;
      case 'domicile':
        setDomicileFields(letter.fields as DomicileLetterFields);
        break;
    }
    toast.success(t('letterGeneration.savedLetters.loaded'));
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

  const selectedSavedLetter = useMemo(() => {
    if (!selectedSavedLetterId) return null;
    return savedLetters.find((l) => l.id === selectedSavedLetterId) ?? null;
  }, [savedLetters, selectedSavedLetterId]);

  const renderCommonFields = <T extends CommonLetterFields>(
    fields: T,
    setFields: React.Dispatch<React.SetStateAction<T>>,
  ) => (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <FieldGroup label={t('letterGeneration.fields.referenceNo')}>
          <Input
            value={fields.referenceNo}
            onChange={(e) =>
              setFields({ ...fields, referenceNo: e.target.value })
            }
            placeholder={t('letterGeneration.placeholders.referenceNo')}
          />
        </FieldGroup>
        <FieldGroup label={t('letterGeneration.fields.date')}>
          <Input
            value={fields.date}
            onChange={(e) => setFields({ ...fields, date: e.target.value })}
            placeholder={t('letterGeneration.placeholders.date')}
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
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <CardTitle className="text-lg">{t('letterGeneration.title')}</CardTitle>
              <CardDescription>{t('letterGeneration.formDescription')}</CardDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsGeneratorCollapsed((v) => !v)}
            >
              {isGeneratorCollapsed ? (
                <ChevronDown className="mr-2 size-4" />
              ) : (
                <ChevronUp className="mr-2 size-4" />
              )}
              {isGeneratorCollapsed
                ? t('letterGeneration.generator.actions.expand')
                : t('letterGeneration.generator.actions.collapse')}
            </Button>
          </div>
        </CardHeader>

        {isGeneratorCollapsed ? null : (
          <CardContent>
            <Tabs
              value={activeTab}
              onValueChange={(value) => setActiveTab(value as LetterType)}
            >
              <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1">
                <TabsTrigger value="fees">{t('letterGeneration.tabs.fees')}</TabsTrigger>
                <TabsTrigger value="ration">
                  {t('letterGeneration.tabs.ration')}
                </TabsTrigger>
                <TabsTrigger value="income">
                  {t('letterGeneration.tabs.income')}
                </TabsTrigger>
                <TabsTrigger value="domicile">
                  {t('letterGeneration.tabs.domicile')}
                </TabsTrigger>
              </TabsList>

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
                    <FieldGroup
                      label={t('letterGeneration.fields.letterLanguage')}
                      className="mb-4"
                    >
                      <Select
                        value={letterLanguage}
                        onValueChange={(value: LetterLocale) => setLetterLanguage(value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="en">
                            {t('letterGeneration.letterLanguage.en')}
                          </SelectItem>
                          <SelectItem value="mr">
                            {t('letterGeneration.letterLanguage.mr')}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </FieldGroup>

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
                      <Button onClick={handleExportPdf} disabled={isExporting}>
                        {isExporting ? (
                          <Loader2 className="mr-2 size-4 animate-spin" />
                        ) : (
                          <FileDown className="mr-2 size-4" />
                        )}
                        {t('letterGeneration.generatePdf')}
                      </Button>
                    </div>
                  </div>
                  <LetterPreview body={activeBody} previewRef={previewRef} />
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
                : t('letterGeneration.savedLetters.count', { count: savedLetters.length })}
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
              <div className="grid gap-2 sm:grid-cols-3 sm:items-end">
                <FieldGroup
                  label={t('letterGeneration.savedLetters.dropdownLabel')}
                  className="sm:col-span-2"
                >
                  <Select
                    value={selectedSavedLetterId ?? ''}
                    onValueChange={(value) => setSelectedSavedLetterId(value || null)}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={t(
                          'letterGeneration.savedLetters.dropdownPlaceholder',
                        )}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {savedLetters.map((letter) => {
                        const refPart = letter.referenceNo ? ` - ${letter.referenceNo}` : '';
                        const when = new Date(letter.createdAt).toLocaleString('en-IN');
                        const label = `${t(
                          `letterGeneration.tabs.${letter.letterType}`,
                        )}${refPart} (${when})`;
                        return (
                          <SelectItem key={letter.id} value={letter.id}>
                            {label}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </FieldGroup>

                <div className="flex gap-2 sm:justify-end">
                  <Button
                    variant="outline"
                    onClick={() => void refreshSavedLetters()}
                    disabled={savedLettersLoading}
                  >
                    {t('letterGeneration.savedLetters.refresh')}
                  </Button>
                </div>
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
                  {savedLetters.map((letter) => (
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
                            onClick={() => setSelectedSavedLetterId(letter.id)}
                          >
                            <Eye className="mr-2 size-4" />
                            {t('letterGeneration.savedLetters.actions.preview')}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleLoadSavedLetter(letter)}
                          >
                            {t('letterGeneration.savedLetters.actions.load')}
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

              {selectedSavedLetter ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      {selectedSavedLetter.title}{' '}
                      {selectedSavedLetter.referenceNo
                        ? `- ${selectedSavedLetter.referenceNo}`
                        : ''}
                    </CardTitle>
                    <CardDescription>
                      {t(`letterGeneration.tabs.${selectedSavedLetter.letterType}`)} ·{' '}
                      {t(
                        `letterGeneration.letterLanguage.${selectedSavedLetter.letterLocale}`,
                      )}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        onClick={() => handleLoadSavedLetter(selectedSavedLetter)}
                      >
                        {t('letterGeneration.savedLetters.actions.load')}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setSelectedSavedLetterId(null)}
                      >
                        {t('letterGeneration.savedLetters.actions.closePreview')}
                      </Button>
                    </div>
                    <LetterPreview body={selectedSavedLetter.body} />
                  </CardContent>
                </Card>
              ) : null}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
