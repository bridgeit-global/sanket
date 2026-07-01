'use client';

import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { FileDown, Loader2 } from 'lucide-react';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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

export function LetterGeneration() {
  const { t, locale } = useTranslations();
  const previewRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<LetterType>('fees');
  const [letterLanguage, setLetterLanguage] = useState<LetterLocale>(locale);
  const [isExporting, setIsExporting] = useState(false);

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

  useEffect(() => {
    setLetterLanguage(locale);
  }, [locale]);

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
              <FieldGroup label={t('letterGeneration.fields.letterLanguage')} className="mb-4">
                <Select
                  value={letterLanguage}
                  onValueChange={(value: LetterLocale) =>
                    setLetterLanguage(value)
                  }
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
                <FieldGroup
                  label={t('letterGeneration.fields.rationOfficeAddress')}
                >
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
                        setIncomeFields({ ...incomeFields, idType: e.target.value })
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
              <Button onClick={handleExportPdf} disabled={isExporting}>
                {isExporting ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <FileDown className="mr-2 size-4" />
                )}
                {t('letterGeneration.generatePdf')}
              </Button>
            </div>
            <LetterPreview body={activeBody} previewRef={previewRef} />
          </div>
        </div>
      </Tabs>
    </div>
  );
}
