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
import { buildRenderedLetterHtml, type LetterheadMode } from '@/lib/letters/render-template';
import { getDefaultTemplateHtml } from '@/lib/letters/default-template-html';
import { exportElementToPdf, A4_PORTRAIT_CONTENT_WIDTH_PX } from '@/lib/pdf/export-element-to-pdf';
import { DateRangePicker } from '@/components/date-range-picker';
import { ModulePageHeader } from '@/components/module-page-header';
import { cn } from '@/lib/utils';

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

const LETTER_PREVIEW_CONTENT_CLASSES =
  '[&_.letter-content]:whitespace-pre-wrap [&_.letter-content]:font-[inherit] [&_.letter-content]:text-sm [&_.letter-content]:leading-6 [&_.letter-content]:text-black sm:[&_.letter-content]:text-[15px] sm:[&_.letter-content]:leading-7 [&_.letter-letterhead--full]:-mx-4 [&_.letter-letterhead--full]:-mt-4 [&_.letter-letterhead--full]:mb-4 [&_.letter-letterhead--full]:w-[calc(100%+2rem)] sm:[&_.letter-letterhead--full]:-mx-6 sm:[&_.letter-letterhead--full]:-mt-6 sm:[&_.letter-letterhead--full]:w-[calc(100%+3rem)] [&_.letter-letterhead--full_img]:w-full [&_.letter-letterhead--half]:mb-4 [&_.letter-letterhead--half_img]:mx-auto [&_.letter-letterhead--half_img]:w-1/2';

function createLetterExportElement(html: string): HTMLDivElement {
  const host = document.createElement('div');
  // PDF export: no border/shadow — only letter content is captured.
  host.className = 'bg-white p-6 text-black';
  host.innerHTML = html;
  return host;
}

const LETTER_PRINT_STYLES = `
  @page { margin: 15mm; size: A4 portrait; }
  * { color: #000 !important; }
  body { margin: 0; padding: 24px; font-family: system-ui, -apple-system, sans-serif; background: #fff; }
  .letter-content { white-space: pre-wrap; font-size: 15px; line-height: 1.75; }
  .letter-letterhead--full { margin: -24px -24px 16px -24px; width: calc(100% + 48px); }
  .letter-letterhead--full img { width: 100%; display: block; }
  .letter-letterhead--half { margin-bottom: 16px; text-align: center; }
  .letter-letterhead--half img { width: 50%; margin: 0 auto; display: block; }
  img { max-width: 100%; height: auto; }
`;

function printLetterHtml(html: string, title: string): boolean {
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

  doc.open();
  doc.write(
    `<!DOCTYPE html><html><head><title>${title}</title><style>${LETTER_PRINT_STYLES}</style></head><body>${html}</body></html>`,
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

function LetterPreview({ html }: { html: string }) {
  return (
    <div
      className={`overflow-hidden rounded-lg border bg-white p-4 text-black sm:p-6 ${LETTER_PREVIEW_CONTENT_CLASSES}`}
      // Letter HTML is generated from admin-editable templates stored in our database.
      dangerouslySetInnerHTML={{ __html: html }}
    />
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
  updatedAt: string | Date;
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
  const [letterMasters, setLetterMasters] = useState<LetterMasterRow[]>([]);
  const [letterMastersLoading, setLetterMastersLoading] = useState(false);
  const [templateDraft, setTemplateDraft] = useState('');
  const [templateNameDraft, setTemplateNameDraft] = useState('');
  const [letterheadDraft, setLetterheadDraft] = useState<string | null>(null);
  const [letterheadModeDraft, setLetterheadModeDraft] = useState<LetterheadMode>('full');
  const [isUploadingLetterhead, setIsUploadingLetterhead] = useState(false);
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
    const signatory = DEFAULT_SIGNATORY[locale];
    setFeesFields((prev) => ({ ...prev, signatory }));
    setRationFields((prev) => ({ ...prev, signatory }));
    setIncomeFields((prev) => ({ ...prev, signatory }));
    setDomicileFields((prev) => ({ ...prev, signatory }));
  }, [locale]);

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
        (master) => master.letterType === activeTab && master.letterLocale === locale,
      ) ?? null
    );
  }, [letterMasters, activeTab, locale]);

  useEffect(() => {
    if (activeLetterMaster) {
      setTemplateDraft(activeLetterMaster.templateHtml);
      setTemplateNameDraft(activeLetterMaster.name);
      setLetterheadDraft(activeLetterMaster.letterheadUrl);
      setLetterheadModeDraft(activeLetterMaster.letterheadMode);
      return;
    }
    setTemplateDraft(getDefaultTemplateHtml(activeTab, locale));
    setTemplateNameDraft(t(`letterGeneration.tabs.${activeTab}`));
    setLetterheadDraft(null);
    setLetterheadModeDraft('full');
    // Only reset draft when letter type/locale/master changes — not when `t` is recreated.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeLetterMaster, activeTab, locale]);

  const activeTemplateHtml = templateDraft;

  const existingReferenceNos = useMemo(
    () => savedLetters.map((letter) => letter.referenceNo),
    [savedLetters],
  );

  const activeBody = useMemo(() => {
    const fields =
      activeTab === 'fees'
        ? feesFields
        : activeTab === 'ration'
          ? rationFields
          : activeTab === 'income'
            ? incomeFields
            : domicileFields;

    if (activeTemplateHtml.trim()) {
      return buildRenderedLetterHtml(
        activeTab,
        activeTemplateHtml,
        fields,
        locale,
        letterheadDraft,
        letterheadModeDraft,
      );
    }

    return buildLetterBody(activeTab, fields, locale);
  }, [
    activeTab,
    locale,
    feesFields,
    rationFields,
    incomeFields,
    domicileFields,
    activeTemplateHtml,
    letterheadDraft,
    letterheadModeDraft,
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
            letterLocale: locale,
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
          letterLocale: locale,
          letterMasterId: activeLetterMaster?.id ?? null,
          referenceNo: activeReferenceNo.trim(),
          title: activeTitle,
          fields: activeFields,
          renderedHtml: activeBody,
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

  const handlePrintSavedLetter = (letter: SavedLetterRow) => {
    const title = `${letter.title}${letter.referenceNo ? ` - ${letter.referenceNo}` : ''}`;
    const opened = printLetterHtml(letter.renderedHtml, title);
    if (!opened) {
      toast.error(t('letterGeneration.printPopupBlocked'));
    }
  };

  const handleDownloadSavedLetter = async (letter: SavedLetterRow) => {
    setDownloadingLetterId(letter.id);
    let exportHost: HTMLDivElement | null = null;
    try {
      exportHost = createLetterExportElement(letter.renderedHtml);
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
      <FieldGroup label={t('letterGeneration.fields.signatory')}>
        <Input value={DEFAULT_SIGNATORY[locale]} disabled />
      </FieldGroup>
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
              <div className="w-full max-w-md">
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
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <h2 className="text-lg font-semibold">
                      {t('letterGeneration.previewTitle')}
                    </h2>
                    <div className="flex items-center gap-2">
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
                  <LetterPreview html={activeBody} />
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
            <div className="grid gap-4 sm:grid-cols-2">
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
                              {t(`letterGeneration.letterLanguage.${letter.letterLocale}`)}
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
                            <TableCell>{t(`letterGeneration.tabs.${letter.letterType}`)}</TableCell>
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
                                  )}
                                </DialogDescription>
                              </div>
                              <div className="flex flex-col gap-2 sm:shrink-0 sm:flex-row">
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
                          <LetterPreview html={selectedSavedLetter.renderedHtml} />
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
