'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Eye,
  FileDown,
  ImageIcon,
  Loader2,
  Printer,
  RefreshCw,
  Save,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
  DEFAULT_OFFICE_ADDRESS,
  DEFAULT_RATION_OFFICE_ADDRESS,
  DEFAULT_SIGNATORY,
  LETTER_TYPES,
  type CommonLetterFields,
  type DomicileLetterFields,
  type FeesLetterFields,
  type IncomeLetterFields,
  type LetterLocale,
  type LetterType,
  type PersonGender,
  type RationLetterFields,
  type SchoolAdmissionLetterFields,
  type SchoolTransferLetterFields,
} from '@/lib/letters/templates';
import {
  getLetterheadContentPaddingMm,
  LETTER_PAPER_ASPECT_RATIO,
  LETTERHEAD_HEADER_HEIGHT_RATIO,
  resolveLetterheadUrl,
  stripLetterheadFromHtml,
} from '@/lib/letters/letterhead';
import { buildRenderedLetterHtml, type LetterheadMode } from '@/lib/letters/render-template';
import { getDefaultTemplateHtml } from '@/lib/letters/default-template-html';
import {
  getDefaultLetterPaperSize,
  getLetterPaperContentWidthPx,
  getLetterPaperLabel,
  LETTER_PAPER_MARGIN_MM,
  LETTER_PAPER_SIZES,
  resolveLetterPaperSize,
  type LetterPaperSize,
} from '@/lib/letters/paper-size';
import { exportElementToPdf } from '@/lib/pdf/export-element-to-pdf';
import { DateRangePicker } from '@/components/date-range-picker';
import { ModulePageHeader } from '@/components/module-page-header';
import { cn } from '@/lib/utils';

const ALL_LETTER_TYPES = 'all' as const;
type SavedLetterTypeFilter = LetterType | typeof ALL_LETTER_TYPES | 'ration';
const LETTER_LOCALES: LetterLocale[] = ['en', 'mr'];

function isRationLetterType(type: LetterType): boolean {
  return type.startsWith('ration-');
}

function matchesSavedLetterTypeFilter(
  letterType: string,
  filter: SavedLetterTypeFilter,
): boolean {
  if (filter === ALL_LETTER_TYPES) return true;
  if (filter === 'ration') {
    return letterType === 'ration' || letterType.startsWith('ration-');
  }
  return letterType === filter;
}

function getFieldsForLetterType(
  type: LetterType,
  fields: {
    feesFields: FeesLetterFields;
    schoolAdmissionFields: SchoolAdmissionLetterFields;
    schoolTransferFields: SchoolTransferLetterFields;
    rationFields: RationLetterFields;
    incomeFields: IncomeLetterFields;
    domicileFields: DomicileLetterFields;
  },
) {
  switch (type) {
    case 'fees':
      return fields.feesFields;
    case 'school-admission':
      return fields.schoolAdmissionFields;
    case 'school-transfer':
      return fields.schoolTransferFields;
    case 'income':
      return fields.incomeFields;
    case 'domicile':
      return fields.domicileFields;
    default:
      if (isRationLetterType(type)) return fields.rationFields;
      return fields.feesFields;
  }
}

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

function todayDisplay(letterLocale: LetterLocale) {
  return new Date().toLocaleDateString(letterLocale === 'mr' ? 'mr-IN' : 'en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function commonDefaults(locale: LetterLocale) {
  return {
    referenceNo: '',
    date: todayDisplay(locale),
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
  };
}

function schoolAdmissionDefaults(locale: LetterLocale): SchoolAdmissionLetterFields {
  return {
    ...commonDefaults(locale),
    schoolName: '',
    schoolAddress: '',
    standard: '',
    studentName: '',
    parentName: '',
    address: '',
    reasonText: '',
  };
}

function schoolTransferDefaults(locale: LetterLocale): SchoolTransferLetterFields {
  return {
    ...commonDefaults(locale),
    schoolName: '',
    schoolAddress: '',
    standard: '',
    studentName: '',
    parentName: '',
    address: '',
    previousSchoolName: '',
    currentStandard: '',
    transferReason: '',
  };
}

function rationDefaults(locale: LetterLocale): RationLetterFields {
  return {
    ...commonDefaults(locale),
    gender: 'female',
    salutation: locale === 'en' ? 'Smt.' : 'श्रीमती',
    fullName: '',
    address: '',
    familyMembers: '',
    rationOfficeAddress: DEFAULT_RATION_OFFICE_ADDRESS[locale],
    rationCardNo: '',
    fromRationOffice: '',
    toRationOffice: '',
  };
}

function incomeDefaults(locale: LetterLocale): IncomeLetterFields {
  return {
    ...commonDefaults(locale),
    gender: 'male',
    salutation: locale === 'en' ? 'Shri' : 'श्री',
    fullName: '',
    address: '',
    officeAddress: DEFAULT_OFFICE_ADDRESS[locale],
    aadhaarNo: '',
    annualIncome: '',
  };
}

function domicileDefaults(locale: LetterLocale): DomicileLetterFields {
  return {
    ...commonDefaults(locale),
    gender: 'male',
    salutation: locale === 'en' ? 'Shri' : 'श्री',
    fullName: '',
    address: '',
    officeAddress: DEFAULT_OFFICE_ADDRESS[locale],
    aadhaarNo: '',
  };
}

function resolveSalutation(locale: LetterLocale, gender: PersonGender): string {
  if (locale === 'en') {
    if (gender === 'female') return 'Smt.';
    if (gender === 'male') return 'Shri';
    return 'Shri/Smt.';
  }
  if (gender === 'female') return 'श्रीमती';
  if (gender === 'male') return 'श्री';
  return 'श्री/श्रीमती';
}

const LETTER_PREVIEW_CONTENT_CLASSES =
  '[&_.letter-content]:whitespace-pre-wrap [&_.letter-content]:font-[inherit] [&_.letter-content]:text-black';

const LETTER_FONT_STACK: Record<LetterLocale, string> = {
  en: `system-ui, -apple-system, sans-serif`,
  mr: `"Noto Sans Devanagari", "Nirmala UI", system-ui, -apple-system, sans-serif`,
};

function getLetterPreviewContentClasses(letterLocale: LetterLocale): string {
  // Templates often define their own inline font-size/line-height; keep our outer spacing script-aware.
  return cn(
    LETTER_PREVIEW_CONTENT_CLASSES,
    letterLocale === 'mr'
      ? '[&_.letter-content]:text-sm [&_.letter-content]:leading-6 sm:[&_.letter-content]:text-[15px] sm:[&_.letter-content]:leading-7'
      : '[&_.letter-content]:text-sm [&_.letter-content]:leading-6 sm:[&_.letter-content]:text-[15px] sm:[&_.letter-content]:leading-6',
  );
}

function createLetterExportElement(
  html: string,
  options?: {
    paperSize?: LetterPaperSize;
    letterheadUrl?: string | null;
    includeLetterhead?: boolean;
    letterLocale?: LetterLocale;
  },
): HTMLDivElement {
  const host = document.createElement('div');
  const contentHtml = stripLetterheadFromHtml(html);
  const letterheadUrl =
    options?.includeLetterhead && options.letterheadUrl
      ? options.letterheadUrl
      : null;

  host.className = 'relative bg-white text-black';
  if (options?.letterLocale) {
    host.style.fontFamily = LETTER_FONT_STACK[options.letterLocale];
  }
  if (options?.paperSize) {
    host.style.width = `${getLetterPaperContentWidthPx(options.paperSize)}px`;
  }

  if (letterheadUrl && options?.paperSize) {
    host.style.backgroundImage = `url("${letterheadUrl}")`;
    host.style.backgroundSize = '100% 100%';
    host.style.backgroundRepeat = 'no-repeat';
    host.innerHTML = `<div class="letter-export-content" style="padding: ${getLetterheadContentPaddingMm(options.paperSize)}mm 15mm 15mm 15mm;">${contentHtml}</div>`;
  } else {
    host.className += ' p-6';
    host.innerHTML = contentHtml;
  }

  return host;
}

const LETTER_PRINT_FONT_SIZE_PX: Record<LetterPaperSize, number> = {
  a4: 15,
  a5: 13,
  b5: 14,
};

function buildLetterPrintStyles(
  paperSize: LetterPaperSize,
  options?: { letterheadUrl?: string | null; letterLocale?: LetterLocale },
): string {
  const marginMm = LETTER_PAPER_MARGIN_MM[paperSize];
  const fontSizePx = LETTER_PRINT_FONT_SIZE_PX[paperSize];
  const pageLabel = getLetterPaperLabel(paperSize);
  const paddingPx = paperSize === 'a4' ? 24 : 18;
  const letterheadUrl = options?.letterheadUrl;
  const headerPaddingMm = getLetterheadContentPaddingMm(paperSize);
  const fontFamily = LETTER_FONT_STACK[options?.letterLocale ?? 'mr'];

  const bodyStyles = letterheadUrl
    ? `margin: 0; padding: 0; font-family: ${fontFamily};
       background: #fff url("${letterheadUrl}") no-repeat;
       background-size: 100% 100%;
       -webkit-print-color-adjust: exact;
       print-color-adjust: exact;`
    : `margin: 0; padding: ${paddingPx}px; font-family: ${fontFamily}; background: #fff;`;

  const contentPadding = letterheadUrl
    ? `padding: ${headerPaddingMm}mm ${marginMm}mm ${marginMm}mm ${marginMm}mm;`
    : '';

  return `
  @page { margin: 0; size: ${pageLabel} portrait; }
  * { color: #000 !important; }
  body { ${bodyStyles} }
  .letter-print-content { ${contentPadding} }
  .letter-content { white-space: pre-wrap; font-size: ${fontSizePx}px; line-height: 1.75; }
  img { max-width: 100%; height: auto; }
`;
}

function printLetterHtml(
  html: string,
  title: string,
  paperSize: LetterPaperSize = 'a4',
  options?: {
    includeLetterhead?: boolean;
    letterheadUrl?: string | null;
    letterLocale?: LetterLocale;
  },
): boolean {
  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.cssText =
    'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;';
  document.body.appendChild(iframe);

  const printFrame = iframe.contentWindow;
  const doc = printFrame?.document;
  if (!doc || !printFrame) {
    iframe.remove();
    return false;
  }

  const contentHtml = stripLetterheadFromHtml(html);
  const letterheadUrl =
    options?.includeLetterhead && options.letterheadUrl
      ? options.letterheadUrl
      : null;
  const bodyHtml = letterheadUrl
    ? `<div class="letter-print-content">${contentHtml}</div>`
    : contentHtml;

  doc.open();
  doc.write(
    `<!DOCTYPE html><html><head><title>${title}</title><style>${buildLetterPrintStyles(paperSize, { letterheadUrl, letterLocale: options?.letterLocale })}</style></head><body>${bodyHtml}</body></html>`,
  );
  doc.close();

  const cleanup = () => {
    iframe.remove();
  };

  const waitForImagesAndPrint = () => {
    const images = Array.from(doc.images);

    const print = () => {
      printFrame.focus();
      printFrame.print();
      if ('onafterprint' in printFrame) {
        printFrame.addEventListener('afterprint', cleanup, { once: true });
      } else {
        setTimeout(cleanup, 1000);
      }
    };

    if (images.length === 0) {
      print();
      return;
    }

    void Promise.all(
      images.map(
        (img) =>
          new Promise<void>((resolve) => {
            if (img.complete) {
              resolve();
              return;
            }
            img.onload = () => resolve();
            img.onerror = () => resolve();
          }),
      ),
    ).then(print);
  };

  if (doc.readyState === 'complete') {
    waitForImagesAndPrint();
  } else {
    iframe.addEventListener('load', waitForImagesAndPrint, { once: true });
  }

  return true;
}

const LETTER_PREVIEW_MAX_WIDTH_CLASS: Record<LetterPaperSize, string> = {
  a4: 'max-w-[680px]',
  a5: 'max-w-[470px]',
  b5: 'max-w-[575px]',
};

function LetterPreview({
  html,
  paperSize = 'a4',
  letterheadUrl,
  letterLocale,
}: {
  html: string;
  paperSize?: LetterPaperSize;
  letterheadUrl?: string | null;
  letterLocale: LetterLocale;
}) {
  const resolvedLetterhead = resolveLetterheadUrl(paperSize, letterheadUrl);
  const contentHtml = stripLetterheadFromHtml(html);
  const headerTop = `${LETTERHEAD_HEADER_HEIGHT_RATIO * 100}%`;

  return (
    <div
      className={cn(
        'relative mx-auto overflow-hidden rounded-lg border bg-white text-black',
        LETTER_PREVIEW_MAX_WIDTH_CLASS[paperSize],
      )}
      style={{
        aspectRatio: LETTER_PAPER_ASPECT_RATIO[paperSize],
        fontFamily: LETTER_FONT_STACK[letterLocale],
      }}
    >
      {resolvedLetterhead ? (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-no-repeat"
          style={{
            backgroundImage: `url("${resolvedLetterhead}")`,
            backgroundSize: '100% 100%',
          }}
        />
      ) : null}
      <div
        className={cn(
          'absolute inset-x-0 bottom-0 overflow-y-auto p-4 sm:p-6',
          getLetterPreviewContentClasses(letterLocale),
        )}
        style={resolvedLetterhead ? { top: headerTop } : { inset: 0 }}
        // Letter HTML is generated from admin-editable templates stored in our database.
        dangerouslySetInnerHTML={{ __html: contentHtml }}
      />
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
  letterMasterId: string | null;
  letterType: LetterType;
  letterLocale: LetterLocale;
  referenceNo: string;
  title: string;
  fields: unknown;
  renderedHtml: string;
  paperSize: LetterPaperSize;
  createdAt: string | Date;
};

type LetterMasterRow = {
  id: string;
  name: string;
  letterType: LetterType;
  letterLocale: LetterLocale;
  templateHtml: string;
  letterheadUrl: string | null;
  letterheadMode: LetterheadMode;
  paperSize: LetterPaperSize;
  updatedAt: string | Date;
};

export function LetterGeneration() {
  const { t, locale } = useTranslations();
  const [letterLocale, setLetterLocale] = useState<LetterLocale>(locale);
  const prevLetterLocaleRef = useRef<LetterLocale>(locale);
  const [activeTab, setActiveTab] = useState<LetterType>('fees');
  const [isSaving, setIsSaving] = useState(false);
  const [downloadingLetterId, setDownloadingLetterId] = useState<string | null>(null);
  const [isGeneratorCollapsed, setIsGeneratorCollapsed] = useState(false);

  const [feesFields, setFeesFields] = useState<FeesLetterFields>(() =>
    feesDefaults(locale),
  );
  const [schoolAdmissionFields, setSchoolAdmissionFields] =
    useState<SchoolAdmissionLetterFields>(() => schoolAdmissionDefaults(locale));
  const [schoolTransferFields, setSchoolTransferFields] =
    useState<SchoolTransferLetterFields>(() => schoolTransferDefaults(locale));
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
  const [letterMasters, setLetterMasters] = useState<LetterMasterRow[]>([]);
  const [letterMastersLoading, setLetterMastersLoading] = useState(false);
  const [templateDraft, setTemplateDraft] = useState('');
  const [templateNameDraft, setTemplateNameDraft] = useState('');
  const [letterheadDraft, setLetterheadDraft] = useState<string | null>(null);
  const [letterheadModeDraft, setLetterheadModeDraft] = useState<LetterheadMode>('full');
  const [paperSizeDraft, setPaperSizeDraft] = useState<LetterPaperSize>(() =>
    getDefaultLetterPaperSize('fees'),
  );
  const [isUploadingLetterhead, setIsUploadingLetterhead] = useState(false);
  const [printWithLetterhead, setPrintWithLetterhead] = useState(false);
  const letterheadInputRef = useRef<HTMLInputElement>(null);
  const [isTemplateEditorOpen, setIsTemplateEditorOpen] = useState(false);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [regeneratingLetterId, setRegeneratingLetterId] = useState<string | null>(null);
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

  useEffect(() => {
    const prevLocale = prevLetterLocaleRef.current;
    const prevAutoDate = todayDisplay(prevLocale);
    const nextAutoDate = todayDisplay(letterLocale);

    const signatory = DEFAULT_SIGNATORY[letterLocale];
    setFeesFields((prev) => ({
      ...prev,
      signatory,
      date: prev.date.trim() === '' || prev.date === prevAutoDate ? nextAutoDate : prev.date,
    }));
    setSchoolAdmissionFields((prev) => ({
      ...prev,
      signatory,
      date: prev.date.trim() === '' || prev.date === prevAutoDate ? nextAutoDate : prev.date,
    }));
    setSchoolTransferFields((prev) => ({
      ...prev,
      signatory,
      date: prev.date.trim() === '' || prev.date === prevAutoDate ? nextAutoDate : prev.date,
    }));
    setRationFields((prev) => ({
      ...prev,
      signatory,
      date: prev.date.trim() === '' || prev.date === prevAutoDate ? nextAutoDate : prev.date,
      salutation: resolveSalutation(letterLocale, prev.gender),
      rationOfficeAddress: DEFAULT_RATION_OFFICE_ADDRESS[letterLocale],
    }));
    setIncomeFields((prev) => ({
      ...prev,
      signatory,
      date: prev.date.trim() === '' || prev.date === prevAutoDate ? nextAutoDate : prev.date,
      salutation: resolveSalutation(letterLocale, prev.gender),
      officeAddress: DEFAULT_OFFICE_ADDRESS[letterLocale],
    }));
    setDomicileFields((prev) => ({
      ...prev,
      signatory,
      date: prev.date.trim() === '' || prev.date === prevAutoDate ? nextAutoDate : prev.date,
      salutation: resolveSalutation(letterLocale, prev.gender),
      officeAddress: DEFAULT_OFFICE_ADDRESS[letterLocale],
    }));

    prevLetterLocaleRef.current = letterLocale;
  }, [letterLocale]);

  const refreshLetterMasters = async () => {
    setLetterMastersLoading(true);
    try {
      const res = await fetch('/api/letter-masters');
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to fetch letter masters');
      setLetterMasters((json?.letterMasters ?? []) as LetterMasterRow[]);
    } catch (error) {
      console.error('Failed to fetch letter masters', error);
      toast.error(t('letterGeneration.templates.fetchError'));
    } finally {
      setLetterMastersLoading(false);
    }
  };

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
    void refreshLetterMasters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeLetterMaster = useMemo(() => {
    return (
      letterMasters.find(
        (master) =>
          master.letterType === activeTab && master.letterLocale === letterLocale,
      ) ?? null
    );
  }, [letterMasters, activeTab, letterLocale]);

  useEffect(() => {
    if (activeLetterMaster) {
      setTemplateDraft(activeLetterMaster.templateHtml);
      setTemplateNameDraft(activeLetterMaster.name);
      setLetterheadDraft(activeLetterMaster.letterheadUrl);
      setLetterheadModeDraft(activeLetterMaster.letterheadMode);
      setPaperSizeDraft(
        resolveLetterPaperSize(activeLetterMaster.paperSize, activeTab),
      );
      return;
    }
    setTemplateDraft(getDefaultTemplateHtml(activeTab, letterLocale));
    setTemplateNameDraft(t(`letterGeneration.tabs.${activeTab}`));
    setLetterheadDraft(null);
    setLetterheadModeDraft('full');
    setPaperSizeDraft(getDefaultLetterPaperSize(activeTab));
    // Only reset draft when letter type/locale/master changes — not when `t` is recreated.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeLetterMaster, activeTab, letterLocale]);

  const activeTemplateHtml = templateDraft;

  const existingReferenceNos = useMemo(
    () => savedLetters.map((letter) => letter.referenceNo),
    [savedLetters],
  );

  const activeBody = useMemo(() => {
    const fields = getFieldsForLetterType(activeTab, {
      feesFields,
      schoolAdmissionFields,
      schoolTransferFields,
      rationFields,
      incomeFields,
      domicileFields,
    });

    if (activeTemplateHtml.trim()) {
      return buildRenderedLetterHtml(
        activeTab,
        activeTemplateHtml,
        fields,
        letterLocale,
      );
    }

    return buildLetterBody(activeTab, fields, letterLocale);
  }, [
    activeTab,
    letterLocale,
    feesFields,
    schoolAdmissionFields,
    schoolTransferFields,
    rationFields,
    incomeFields,
    domicileFields,
    activeTemplateHtml,
  ]);

  const activeTitle = t(`letterGeneration.tabs.${activeTab}`);
  const activePaperSize = paperSizeDraft;
  const activePaperLabel = getLetterPaperLabel(activePaperSize);
  const activeLetterheadUrl = resolveLetterheadUrl(activePaperSize, letterheadDraft);

  const activeFields = useMemo(
    () =>
      getFieldsForLetterType(activeTab, {
        feesFields,
        schoolAdmissionFields,
        schoolTransferFields,
        rationFields,
        incomeFields,
        domicileFields,
      }),
    [
      activeTab,
      domicileFields,
      feesFields,
      incomeFields,
      rationFields,
      schoolAdmissionFields,
      schoolTransferFields,
    ],
  );

  const activeReferenceNo = activeFields.referenceNo;
  const activeDate = activeFields.date;

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

  const handleUploadLetterhead = async (file: File) => {
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      toast.error(t('letterGeneration.templates.letterheadInvalidType'));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t('letterGeneration.templates.letterheadTooLarge'));
      return;
    }

    setIsUploadingLetterhead(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/files/upload', {
        method: 'POST',
        body: formData,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Upload failed');
      setLetterheadDraft(json.url ?? null);
      toast.success(t('letterGeneration.templates.letterheadUploadSuccess'));
    } catch (error) {
      console.error('Failed to upload letterhead', error);
      toast.error(t('letterGeneration.templates.letterheadUploadError'));
    } finally {
      setIsUploadingLetterhead(false);
      if (letterheadInputRef.current) {
        letterheadInputRef.current.value = '';
      }
    }
  };

  const handleSaveTemplate = async () => {
    if (!templateNameDraft.trim() || !templateDraft.trim()) {
      toast.error(t('letterGeneration.templates.validationRequired'));
      return;
    }

    setIsSavingTemplate(true);
    try {
      const payload = {
        name: templateNameDraft.trim(),
        templateHtml: templateDraft,
        letterheadUrl: letterheadDraft,
        letterheadMode: letterheadModeDraft,
        paperSize: paperSizeDraft,
      };

      const res = activeLetterMaster
        ? await fetch(
          `/api/letter-masters/${encodeURIComponent(activeLetterMaster.id)}`,
          {
            method: 'PUT',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(payload),
          },
        )
        : await fetch('/api/letter-masters', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            ...payload,
            letterType: activeTab,
            letterLocale,
          }),
        });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to save template');
      toast.success(
        t(
          activeLetterMaster
            ? 'letterGeneration.templates.saveSuccess'
            : 'letterGeneration.templates.createSuccess',
        ),
      );
      await refreshLetterMasters();
    } catch (error) {
      console.error('Failed to save letter template', error);
      toast.error(
        t(
          activeLetterMaster
            ? 'letterGeneration.templates.saveError'
            : 'letterGeneration.templates.createError',
        ),
      );
    } finally {
      setIsSavingTemplate(false);
    }
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
          letterLocale,
          letterMasterId: activeLetterMaster?.id ?? null,
          referenceNo: activeReferenceNo.trim(),
          title: activeTitle,
          fields: activeFields,
          renderedHtml: activeBody,
          paperSize: paperSizeDraft,
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

  const handleRegenerateSavedLetter = async (letter: SavedLetterRow) => {
    setRegeneratingLetterId(letter.id);
    try {
      const res = await fetch(
        `/api/letters/${encodeURIComponent(letter.id)}/regenerate`,
        { method: 'POST' },
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to regenerate letter');
      toast.success(t('letterGeneration.savedLetters.regenerateSuccess'));
      const updated = json.letter as SavedLetterRow;
      setSavedLetters((prev) =>
        prev.map((item) => (item.id === letter.id ? { ...item, ...updated } : item)),
      );
    } catch (error) {
      console.error('Failed to regenerate letter', error);
      toast.error(t('letterGeneration.savedLetters.regenerateError'));
    } finally {
      setRegeneratingLetterId(null);
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

  const resolveSavedLetterPaperSize = (letter: SavedLetterRow): LetterPaperSize =>
    resolveLetterPaperSize(letter.paperSize, letter.letterType);

  const handlePrintSavedLetter = (letter: SavedLetterRow) => {
    const title = `${letter.title}${letter.referenceNo ? ` - ${letter.referenceNo}` : ''}`;
    const paperSize = resolveSavedLetterPaperSize(letter);
    const master = letterMasters.find((m) => m.id === letter.letterMasterId);
    const letterheadUrl = resolveLetterheadUrl(paperSize, master?.letterheadUrl);
    const opened = printLetterHtml(letter.renderedHtml, title, paperSize, {
      includeLetterhead: printWithLetterhead,
      letterheadUrl,
      letterLocale: letter.letterLocale,
    });
    if (!opened) {
      toast.error(t('letterGeneration.printPopupBlocked'));
    }
  };

  const handleDownloadSavedLetter = async (letter: SavedLetterRow) => {
    setDownloadingLetterId(letter.id);
    let exportHost: HTMLDivElement | null = null;
    try {
      const paperSize = resolveSavedLetterPaperSize(letter);
      const master = letterMasters.find((m) => m.id === letter.letterMasterId);
      const letterheadUrl = resolveLetterheadUrl(paperSize, master?.letterheadUrl);
      exportHost = createLetterExportElement(letter.renderedHtml, {
        paperSize,
        letterheadUrl,
        includeLetterhead: printWithLetterhead,
        letterLocale: letter.letterLocale,
      });
      document.body.appendChild(exportHost);
      await exportElementToPdf({
        element: exportHost,
        fileName: `${letter.title}-${letter.referenceNo || 'letter'}`,
        format: paperSize,
        orientation: 'portrait',
        marginMm: LETTER_PAPER_MARGIN_MM[paperSize],
        scale: 2,
        captureWidthPx: getLetterPaperContentWidthPx(paperSize),
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
        !matchesSavedLetterTypeFilter(letter.letterType, filterLetterType)
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

  const renderSavedLetterActions = (
    letter: SavedLetterRow,
    layout: 'stack' | 'inline' = 'inline',
  ) => (
    <div
      className={cn(
        'flex gap-2',
        layout === 'stack'
          ? 'flex-col'
          : 'flex-col sm:flex-row sm:flex-wrap sm:justify-end',
      )}
    >
      <Button
        size="sm"
        variant="outline"
        className={layout === 'stack' ? 'w-full' : 'w-full sm:w-auto'}
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
        className={layout === 'stack' ? 'w-full' : 'w-full sm:w-auto'}
        onClick={() => setSelectedSavedLetterId(letter.id)}
      >
        <Eye className="mr-2 size-4" />
        {t('letterGeneration.savedLetters.actions.preview')}
      </Button>
      {/* <Button
        size="sm"
        variant="outline"
        className={layout === 'stack' ? 'w-full' : 'w-full sm:w-auto'}
        onClick={() => void handleRegenerateSavedLetter(letter)}
        disabled={regeneratingLetterId === letter.id}
      >
        {regeneratingLetterId === letter.id ? (
          <Loader2 className="mr-2 size-4 animate-spin" />
        ) : (
          <RefreshCw className="mr-2 size-4" />
        )}
        {t('letterGeneration.savedLetters.actions.regenerate')}
      </Button> */}
      <Button
        size="sm"
        variant="destructive"
        className={layout === 'stack' ? 'w-full' : 'w-full sm:w-auto'}
        onClick={() => void handleDeleteSavedLetter(letter.id)}
      >
        <Trash2 className="mr-2 size-4" />
        {t('letterGeneration.savedLetters.actions.delete')}
      </Button>
    </div>
  );

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
    </>
  );

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <ModulePageHeader
        title={t('letterGeneration.title')}
        description={t('letterGeneration.description')}
      />

      <Card>
        <CardHeader
          className="cursor-pointer select-none p-4 transition-colors hover:bg-muted/50 sm:p-6 rounded-t-lg"
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
            className="p-4 sm:p-6"
          >
            <Tabs
              value={activeTab}
              onValueChange={(value) => setActiveTab(value as LetterType)}
            >
              <div className="grid w-full max-w-3xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
                      {LETTER_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {t(`letterGeneration.tabs.${type}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FieldGroup>
                <FieldGroup label={t('letterGeneration.fields.letterLanguage')}>
                  <Select
                    value={letterLocale}
                    onValueChange={(value: LetterLocale) => setLetterLocale(value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LETTER_LOCALES.map((lang) => (
                        <SelectItem key={lang} value={lang}>
                          {t(`letterGeneration.letterLanguage.${lang}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FieldGroup>
                <FieldGroup label={t('letterGeneration.fields.paperSize')}>
                  <Select
                    value={paperSizeDraft}
                    onValueChange={(value: LetterPaperSize) => setPaperSizeDraft(value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LETTER_PAPER_SIZES.map((size) => (
                        <SelectItem key={size} value={size}>
                          {t(`letterGeneration.paperSize.options.${size}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FieldGroup>
              </div>

              <div className="mt-6 grid gap-4 md:gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader className="p-4 sm:p-6">
                    <CardTitle className="text-lg">
                      {t('letterGeneration.formTitle')}
                    </CardTitle>
                    <CardDescription>
                      {t('letterGeneration.formDescription')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
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
                    </TabsContent>

                    <TabsContent value="school-admission" className="mt-0 space-y-4">
                      {renderCommonFields(schoolAdmissionFields, setSchoolAdmissionFields)}
                      <FieldGroup label={t('letterGeneration.fields.schoolName')}>
                        <Input
                          value={schoolAdmissionFields.schoolName}
                          onChange={(e) =>
                            setSchoolAdmissionFields({
                              ...schoolAdmissionFields,
                              schoolName: e.target.value,
                            })
                          }
                        />
                      </FieldGroup>
                      <FieldGroup label={t('letterGeneration.fields.schoolAddress')}>
                        <Textarea
                          value={schoolAdmissionFields.schoolAddress}
                          onChange={(e) =>
                            setSchoolAdmissionFields({
                              ...schoolAdmissionFields,
                              schoolAddress: e.target.value,
                            })
                          }
                          rows={2}
                        />
                      </FieldGroup>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <FieldGroup label={t('letterGeneration.fields.standard')}>
                          <Input
                            value={schoolAdmissionFields.standard}
                            onChange={(e) =>
                              setSchoolAdmissionFields({
                                ...schoolAdmissionFields,
                                standard: e.target.value,
                              })
                            }
                          />
                        </FieldGroup>
                        <FieldGroup label={t('letterGeneration.fields.studentName')}>
                          <Input
                            value={schoolAdmissionFields.studentName}
                            onChange={(e) =>
                              setSchoolAdmissionFields({
                                ...schoolAdmissionFields,
                                studentName: e.target.value,
                              })
                            }
                          />
                        </FieldGroup>
                      </div>
                      <FieldGroup label={t('letterGeneration.fields.parentName')}>
                        <Input
                          value={schoolAdmissionFields.parentName}
                          onChange={(e) =>
                            setSchoolAdmissionFields({
                              ...schoolAdmissionFields,
                              parentName: e.target.value,
                            })
                          }
                        />
                      </FieldGroup>
                      <FieldGroup label={t('letterGeneration.fields.address')}>
                        <Textarea
                          value={schoolAdmissionFields.address}
                          onChange={(e) =>
                            setSchoolAdmissionFields({
                              ...schoolAdmissionFields,
                              address: e.target.value,
                            })
                          }
                          rows={2}
                        />
                      </FieldGroup>
                      <FieldGroup label={t('letterGeneration.fields.reasonText')}>
                        <Textarea
                          value={schoolAdmissionFields.reasonText}
                          onChange={(e) =>
                            setSchoolAdmissionFields({
                              ...schoolAdmissionFields,
                              reasonText: e.target.value,
                            })
                          }
                          rows={3}
                        />
                      </FieldGroup>
                    </TabsContent>

                    <TabsContent value="school-transfer" className="mt-0 space-y-4">
                      {renderCommonFields(schoolTransferFields, setSchoolTransferFields)}
                      <FieldGroup label={t('letterGeneration.fields.schoolName')}>
                        <Input
                          value={schoolTransferFields.schoolName}
                          onChange={(e) =>
                            setSchoolTransferFields({
                              ...schoolTransferFields,
                              schoolName: e.target.value,
                            })
                          }
                        />
                      </FieldGroup>
                      <FieldGroup label={t('letterGeneration.fields.schoolAddress')}>
                        <Textarea
                          value={schoolTransferFields.schoolAddress}
                          onChange={(e) =>
                            setSchoolTransferFields({
                              ...schoolTransferFields,
                              schoolAddress: e.target.value,
                            })
                          }
                          rows={2}
                        />
                      </FieldGroup>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <FieldGroup label={t('letterGeneration.fields.standard')}>
                          <Input
                            value={schoolTransferFields.standard}
                            onChange={(e) =>
                              setSchoolTransferFields({
                                ...schoolTransferFields,
                                standard: e.target.value,
                              })
                            }
                          />
                        </FieldGroup>
                        <FieldGroup label={t('letterGeneration.fields.studentName')}>
                          <Input
                            value={schoolTransferFields.studentName}
                            onChange={(e) =>
                              setSchoolTransferFields({
                                ...schoolTransferFields,
                                studentName: e.target.value,
                              })
                            }
                          />
                        </FieldGroup>
                      </div>
                      <FieldGroup label={t('letterGeneration.fields.parentName')}>
                        <Input
                          value={schoolTransferFields.parentName}
                          onChange={(e) =>
                            setSchoolTransferFields({
                              ...schoolTransferFields,
                              parentName: e.target.value,
                            })
                          }
                        />
                      </FieldGroup>
                      <FieldGroup label={t('letterGeneration.fields.address')}>
                        <Textarea
                          value={schoolTransferFields.address}
                          onChange={(e) =>
                            setSchoolTransferFields({
                              ...schoolTransferFields,
                              address: e.target.value,
                            })
                          }
                          rows={2}
                        />
                      </FieldGroup>
                      <FieldGroup label={t('letterGeneration.fields.previousSchoolName')}>
                        <Input
                          value={schoolTransferFields.previousSchoolName}
                          onChange={(e) =>
                            setSchoolTransferFields({
                              ...schoolTransferFields,
                              previousSchoolName: e.target.value,
                            })
                          }
                        />
                      </FieldGroup>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <FieldGroup label={t('letterGeneration.fields.currentStandard')}>
                          <Input
                            value={schoolTransferFields.currentStandard}
                            onChange={(e) =>
                              setSchoolTransferFields({
                                ...schoolTransferFields,
                                currentStandard: e.target.value,
                              })
                            }
                          />
                        </FieldGroup>
                        <FieldGroup label={t('letterGeneration.fields.transferReason')}>
                          <Input
                            value={schoolTransferFields.transferReason}
                            onChange={(e) =>
                              setSchoolTransferFields({
                                ...schoolTransferFields,
                                transferReason: e.target.value,
                              })
                            }
                          />
                        </FieldGroup>
                      </div>
                    </TabsContent>

                    {(
                      [
                        'ration-new',
                        'ration-add-members',
                        'ration-delete-members',
                        'ration-transfer',
                      ] as const
                    ).map((rationType) => (
                      <TabsContent key={rationType} value={rationType} className="mt-0 space-y-4">
                        {renderCommonFields(rationFields, setRationFields)}
                        <div className="grid gap-4 sm:grid-cols-2">
                          <FieldGroup label={t('letterGeneration.fields.gender')}>
                            <Select
                              value={rationFields.gender}
                              onValueChange={(value: PersonGender) =>
                                setRationFields((prev) => ({
                                  ...prev,
                                  gender: value,
                                  salutation: resolveSalutation(letterLocale, value),
                                }))
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
                                <SelectItem value="other">
                                  {t('letterGeneration.gender.other')}
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </FieldGroup>
                          <FieldGroup label={t('letterGeneration.fields.salutation')}>
                            <Input
                              value={rationFields.salutation}
                              onChange={(e) =>
                                setRationFields({
                                  ...rationFields,
                                  salutation: e.target.value,
                                })
                              }
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
                        {rationType !== 'ration-new' ? (
                          <FieldGroup label={t('letterGeneration.fields.rationCardNo')}>
                            <Input
                              value={rationFields.rationCardNo ?? ''}
                              onChange={(e) =>
                                setRationFields({
                                  ...rationFields,
                                  rationCardNo: e.target.value,
                                })
                              }
                            />
                          </FieldGroup>
                        ) : null}
                        {rationType === 'ration-transfer' ? (
                          <div className="grid gap-4 sm:grid-cols-2">
                            <FieldGroup label={t('letterGeneration.fields.fromRationOffice')}>
                              <Input
                                value={rationFields.fromRationOffice ?? ''}
                                onChange={(e) =>
                                  setRationFields({
                                    ...rationFields,
                                    fromRationOffice: e.target.value,
                                  })
                                }
                              />
                            </FieldGroup>
                            <FieldGroup label={t('letterGeneration.fields.toRationOffice')}>
                              <Input
                                value={rationFields.toRationOffice ?? ''}
                                onChange={(e) =>
                                  setRationFields({
                                    ...rationFields,
                                    toRationOffice: e.target.value,
                                  })
                                }
                              />
                            </FieldGroup>
                          </div>
                        ) : null}
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
                    ))}

                    <TabsContent value="income" className="mt-0 space-y-4">
                      {renderCommonFields(incomeFields, setIncomeFields)}
                      <div className="grid gap-4 sm:grid-cols-2">
                        <FieldGroup label={t('letterGeneration.fields.gender')}>
                          <Select
                            value={incomeFields.gender}
                            onValueChange={(value: PersonGender) =>
                              setIncomeFields((prev) => ({
                                ...prev,
                                gender: value,
                                salutation: resolveSalutation(letterLocale, value),
                              }))
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
                              <SelectItem value="other">
                                {t('letterGeneration.gender.other')}
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </FieldGroup>
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
                      <FieldGroup label={t('letterGeneration.fields.officeAddress')}>
                        <Textarea
                          value={incomeFields.officeAddress}
                          onChange={(e) =>
                            setIncomeFields({
                              ...incomeFields,
                              officeAddress: e.target.value,
                            })
                          }
                          rows={2}
                        />
                      </FieldGroup>
                      <FieldGroup label={t('letterGeneration.fields.aadhaarNo')}>
                        <Input
                          value={incomeFields.aadhaarNo}
                          onChange={(e) =>
                            setIncomeFields({
                              ...incomeFields,
                              aadhaarNo: e.target.value,
                            })
                          }
                        />
                      </FieldGroup>
                      <FieldGroup label={t('letterGeneration.fields.annualIncome')}>
                        <Input
                          value={incomeFields.annualIncome}
                          onChange={(e) =>
                            setIncomeFields({
                              ...incomeFields,
                              annualIncome: e.target.value,
                            })
                          }
                          placeholder={t('letterGeneration.placeholders.income')}
                        />
                      </FieldGroup>
                    </TabsContent>

                    <TabsContent value="domicile" className="mt-0 space-y-4">
                      {renderCommonFields(domicileFields, setDomicileFields)}
                      <div className="grid gap-4 sm:grid-cols-2">
                        <FieldGroup label={t('letterGeneration.fields.gender')}>
                          <Select
                            value={domicileFields.gender}
                            onValueChange={(value: PersonGender) =>
                              setDomicileFields((prev) => ({
                                ...prev,
                                gender: value,
                                salutation: resolveSalutation(letterLocale, value),
                              }))
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
                              <SelectItem value="other">
                                {t('letterGeneration.gender.other')}
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </FieldGroup>
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
                      <FieldGroup label={t('letterGeneration.fields.officeAddress')}>
                        <Textarea
                          value={domicileFields.officeAddress}
                          onChange={(e) =>
                            setDomicileFields({
                              ...domicileFields,
                              officeAddress: e.target.value,
                            })
                          }
                          rows={2}
                        />
                      </FieldGroup>
                      <FieldGroup label={t('letterGeneration.fields.aadhaarNo')}>
                        <Input
                          value={domicileFields.aadhaarNo}
                          onChange={(e) =>
                            setDomicileFields({
                              ...domicileFields,
                              aadhaarNo: e.target.value,
                            })
                          }
                        />
                      </FieldGroup>
                    </TabsContent>
                  </CardContent>
                </Card>

                <div className="space-y-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-1">
                      <h2 className="text-lg font-semibold">
                        {t('letterGeneration.previewTitle')}
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        {t('letterGeneration.paperSize.label', {
                          size: activePaperLabel,
                        })}
                        {' · '}
                        {t('letterGeneration.paperSize.hint')}
                      </p>
                    </div>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
                      <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
                        <Checkbox
                          checked={printWithLetterhead}
                          onChange={(e) => setPrintWithLetterhead(e.target.checked)}
                        />
                        {t('letterGeneration.printWithLetterhead')}
                      </label>
                      <Button
                        variant="outline"
                        className="w-full sm:w-auto"
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
                  <LetterPreview
                    html={activeBody}
                    paperSize={activePaperSize}
                    letterheadUrl={activeLetterheadUrl}
                    letterLocale={letterLocale}
                  />
                </div>
              </div>
            </Tabs>
          </CardContent>
        )}
      </Card>

      <Card>
        <CardHeader
          className="cursor-pointer select-none p-4 transition-colors hover:bg-muted/50 sm:p-6 rounded-t-lg"
          onClick={() => setIsTemplateEditorOpen((value) => !value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setIsTemplateEditorOpen((value) => !value);
            }
          }}
          role="button"
          tabIndex={0}
          aria-expanded={isTemplateEditorOpen}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <CardTitle className="text-lg">
                {t('letterGeneration.templates.title')}
              </CardTitle>
              <CardDescription>
                {t('letterGeneration.templates.description')}
              </CardDescription>
            </div>
            {isTemplateEditorOpen ? (
              <ChevronUp className="mt-1 size-5 shrink-0 text-muted-foreground" aria-hidden />
            ) : (
              <ChevronDown className="mt-1 size-5 shrink-0 text-muted-foreground" aria-hidden />
            )}
          </div>
        </CardHeader>
        {isTemplateEditorOpen ? (
          <CardContent className="space-y-4 p-4 sm:p-6">
            {!activeLetterMaster ? (
              <p className="rounded-md border border-dashed bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                {t('letterGeneration.templates.noTemplateHint')}
              </p>
            ) : null}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <FieldGroup label={t('letterGeneration.templates.name')}>
                <Input
                  value={templateNameDraft}
                  onChange={(e) => setTemplateNameDraft(e.target.value)}
                  placeholder={t('letterGeneration.templates.namePlaceholder')}
                />
              </FieldGroup>
              <FieldGroup label={t('letterGeneration.templates.activeTemplate')}>
                <Input
                  value={t(`letterGeneration.tabs.${activeTab}`)}
                  disabled
                />
              </FieldGroup>
              <FieldGroup label={t('letterGeneration.fields.paperSize')}>
                <Select
                  value={paperSizeDraft}
                  onValueChange={(value: LetterPaperSize) => setPaperSizeDraft(value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LETTER_PAPER_SIZES.map((size) => (
                      <SelectItem key={size} value={size}>
                        {t(`letterGeneration.paperSize.options.${size}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FieldGroup>
            </div>
            <FieldGroup label={t('letterGeneration.templates.letterhead')}>
              <div className="space-y-3">
                {letterheadDraft ? (
                  <div className="overflow-hidden rounded-lg border bg-white p-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={letterheadDraft}
                      alt={t('letterGeneration.templates.letterheadPreviewAlt')}
                      className={cn(
                        'mx-auto block object-contain',
                        letterheadModeDraft === 'full'
                          ? 'w-full'
                          : 'w-1/2',
                      )}
                    />
                  </div>
                ) : (
                  <div className="flex min-h-24 items-center justify-center rounded-lg border border-dashed bg-muted/30 px-4 text-center text-sm text-muted-foreground">
                    <ImageIcon className="mr-2 size-4 shrink-0" aria-hidden />
                    {t('letterGeneration.templates.letterheadEmpty')}
                  </div>
                )}
                {letterheadDraft ? (
                  <FieldGroup label={t('letterGeneration.templates.letterheadMode')}>
                    <Select
                      value={letterheadModeDraft}
                      onValueChange={(value: LetterheadMode) =>
                        setLetterheadModeDraft(value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="full">
                          {t('letterGeneration.templates.letterheadModeFull')}
                        </SelectItem>
                        <SelectItem value="half">
                          {t('letterGeneration.templates.letterheadModeHalf')}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </FieldGroup>
                ) : null}
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    ref={letterheadInputRef}
                    type="file"
                    accept="image/jpeg,image/png"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void handleUploadLetterhead(file);
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full sm:w-auto"
                    onClick={() => letterheadInputRef.current?.click()}
                    disabled={isUploadingLetterhead}
                  >
                    {isUploadingLetterhead ? (
                      <Loader2 className="mr-2 size-4 animate-spin" />
                    ) : (
                      <Upload className="mr-2 size-4" />
                    )}
                    {letterheadDraft
                      ? t('letterGeneration.templates.letterheadReplace')
                      : t('letterGeneration.templates.letterheadUpload')}
                  </Button>
                  {letterheadDraft ? (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full sm:w-auto"
                      onClick={() => {
                        setLetterheadDraft(null);
                        setLetterheadModeDraft('full');
                      }}
                      disabled={isUploadingLetterhead}
                    >
                      <X className="mr-2 size-4" />
                      {t('letterGeneration.templates.letterheadRemove')}
                    </Button>
                  ) : null}
                </div>
                <p className="text-xs text-muted-foreground">
                  {t('letterGeneration.templates.letterheadHint')}
                </p>
              </div>
            </FieldGroup>
            <FieldGroup label={t('letterGeneration.templates.html')}>
              <Textarea
                value={templateDraft}
                onChange={(e) => setTemplateDraft(e.target.value)}
                rows={16}
                className="font-mono text-xs sm:text-sm"
                placeholder={t('letterGeneration.templates.htmlPlaceholder')}
              />
            </FieldGroup>
            <p className="text-xs text-muted-foreground">
              {t('letterGeneration.templates.placeholderHint')}
            </p>
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => void refreshLetterMasters()}
                disabled={letterMastersLoading}
              >
                {t('letterGeneration.savedLetters.refresh')}
              </Button>
              <Button
                className="w-full sm:w-auto"
                onClick={() => void handleSaveTemplate()}
                disabled={
                  isSavingTemplate ||
                  !templateNameDraft.trim() ||
                  !templateDraft.trim()
                }
              >
                {isSavingTemplate ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <Save className="mr-2 size-4" />
                )}
                {activeLetterMaster
                  ? t('letterGeneration.templates.save')
                  : t('letterGeneration.templates.create')}
              </Button>
            </div>
          </CardContent>
        ) : null}
      </Card>

      <Card>
        <CardHeader className="p-4 sm:p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
            <div className="space-y-1">
              <CardTitle className="text-lg">
                {t('letterGeneration.savedLetters.title')}
              </CardTitle>
              <CardDescription>
                {t('letterGeneration.savedLetters.description')}
              </CardDescription>
            </div>
            <div className="text-sm text-muted-foreground sm:shrink-0 sm:text-right">
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

        <CardContent className="p-4 sm:p-6">
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
                      {LETTER_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {t(`letterGeneration.tabs.${type}`)}
                        </SelectItem>
                      ))}
                      <SelectItem value="ration">
                        {t('letterGeneration.tabs.ration')}
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
                  <div className="flex justify-stretch sm:justify-end">
                    <Button
                      variant="outline"
                      className="w-full sm:w-auto"
                      onClick={() => void refreshSavedLetters()}
                      disabled={savedLettersLoading}
                    >
                      {t('letterGeneration.savedLetters.refresh')}
                    </Button>
                  </div>

                  <div className="space-y-3 lg:hidden">
                    {filteredSavedLetters.map((letter) => (
                      <div
                        key={letter.id}
                        className="space-y-3 rounded-lg border bg-card p-4 shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 space-y-1">
                            <p className="truncate font-medium">
                              {letter.referenceNo || '—'}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {t(`letterGeneration.tabs.${letter.letterType}`)} ·{' '}
                              {t(`letterGeneration.letterLanguage.${letter.letterLocale}`)}{' '}
                              ·{' '}
                              {getLetterPaperLabel(resolveSavedLetterPaperSize(letter))}
                            </p>
                          </div>
                          <p className="shrink-0 text-xs text-muted-foreground">
                            {new Date(letter.createdAt).toLocaleString('en-IN')}
                          </p>
                        </div>
                        {renderSavedLetterActions(letter, 'stack')}
                      </div>
                    ))}
                  </div>

                  <div className="hidden overflow-x-auto lg:block">
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
                            <TableCell>
                              {t(`letterGeneration.tabs.${letter.letterType}`)}{' '}
                              <span className="text-muted-foreground">
                                ({getLetterPaperLabel(resolveSavedLetterPaperSize(letter))})
                              </span>
                            </TableCell>
                            <TableCell>
                              {t(`letterGeneration.letterLanguage.${letter.letterLocale}`)}
                            </TableCell>
                            <TableCell>
                              {new Date(letter.createdAt).toLocaleString('en-IN')}
                            </TableCell>
                            <TableCell className="text-right">
                              {renderSavedLetterActions(letter)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  <Dialog
                    open={!!selectedSavedLetter}
                    onOpenChange={(open) => {
                      if (!open) setSelectedSavedLetterId(null);
                    }}
                  >
                    <DialogContent className="max-h-[90vh] w-[calc(100%-2rem)] max-w-3xl overflow-y-auto p-4 sm:w-full sm:p-6">
                      {selectedSavedLetter ? (
                        <>
                          <DialogHeader className="space-y-4">
                            <div className="flex flex-col gap-3 pr-8 sm:flex-row sm:items-start sm:justify-between">
                              <div className="space-y-1.5 text-left">
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
                                  )}{' '}
                                  ·{' '}
                                  {t('letterGeneration.paperSize.label', {
                                    size: getLetterPaperLabel(
                                      resolveSavedLetterPaperSize(selectedSavedLetter),
                                    ),
                                  })}
                                </DialogDescription>
                              </div>
                              <div className="flex flex-col gap-2 sm:shrink-0 sm:flex-row sm:items-center">
                                <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
                                  <Checkbox
                                    checked={printWithLetterhead}
                                    onChange={(e) => setPrintWithLetterhead(e.target.checked)}
                                  />
                                  {t('letterGeneration.printWithLetterhead')}
                                </label>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="w-full sm:w-auto"
                                  onClick={() => handlePrintSavedLetter(selectedSavedLetter)}
                                >
                                  <Printer className="mr-2 size-4" />
                                  {t('letterGeneration.savedLetters.actions.print')}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="w-full sm:w-auto"
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
                              </div>
                            </div>
                          </DialogHeader>
                          <LetterPreview
                            html={selectedSavedLetter.renderedHtml}
                            paperSize={resolveSavedLetterPaperSize(selectedSavedLetter)}
                            letterheadUrl={resolveLetterheadUrl(
                              resolveSavedLetterPaperSize(selectedSavedLetter),
                              letterMasters.find(
                                (m) => m.id === selectedSavedLetter.letterMasterId,
                              )?.letterheadUrl,
                            )}
                            letterLocale={selectedSavedLetter.letterLocale}
                          />
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
