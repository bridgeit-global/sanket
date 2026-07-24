'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  ImageIcon,
  Loader2,
  RefreshCw,
  Save,
  Upload,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

import { LetterPreview } from '@/components/letter-preview';
import { ModulePageHeader } from '@/components/module-page-header';
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
import { Textarea } from '@/components/ui/textarea';
import { useTranslations } from '@/hooks/use-translations';
import {
  getDefaultTemplateHtml,
  getDefaultTemplateName,
} from '@/lib/letters/default-template-html';
import { resolveLetterheadUrl } from '@/lib/letters/letterhead';
import {
  getDefaultLetterPaperSize,
  LETTER_PAPER_SIZES,
  resolveLetterPaperSize,
  type LetterPaperSize,
} from '@/lib/letters/paper-size';
import {
  normalizeLetterheadMode,
  type LetterheadMode,
} from '@/lib/letters/render-template';
import {
  LETTER_TYPES,
  type LetterLocale,
  type LetterType,
} from '@/lib/letters/templates';
import { cn } from '@/lib/utils';

const LETTER_LOCALES: LetterLocale[] = ['en', 'mr'];

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
      <Label className="mb-1.5 block text-sm font-medium">{label}</Label>
      {children}
    </div>
  );
}

export function LetterTemplateEditorPage() {
  const { t } = useTranslations();
  const searchParams = useSearchParams();
  const tRef = useRef(t);
  tRef.current = t;

  const [letterMasters, setLetterMasters] = useState<LetterMasterRow[]>([]);
  const [letterMastersLoading, setLetterMastersLoading] = useState(false);
  const [letterType, setLetterType] = useState<LetterType>('fees');
  const [letterLocale, setLetterLocale] = useState<LetterLocale>('en');
  const [templateDraft, setTemplateDraft] = useState('');
  const [templateNameDraft, setTemplateNameDraft] = useState('');
  const [letterheadDraft, setLetterheadDraft] = useState<string | null>(null);
  const [letterheadModeDraft, setLetterheadModeDraft] =
    useState<LetterheadMode>('full');
  const [paperSizeDraft, setPaperSizeDraft] = useState<LetterPaperSize>(() =>
    getDefaultLetterPaperSize('fees'),
  );
  const [isUploadingLetterhead, setIsUploadingLetterhead] = useState(false);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const letterheadInputRef = useRef<HTMLInputElement>(null);

  const refreshLetterMasters = useCallback(async () => {
    setLetterMastersLoading(true);
    try {
      const res = await fetch('/api/letter-masters');
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to fetch letter masters');
      setLetterMasters((json?.letterMasters ?? []) as LetterMasterRow[]);
    } catch (error) {
      console.error('Failed to fetch letter masters', error);
      toast.error(tRef.current('letterGeneration.templates.fetchError'));
    } finally {
      setLetterMastersLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshLetterMasters();
  }, [refreshLetterMasters]);

  useEffect(() => {
    const typeParam = searchParams.get('letterType');
    const localeParam = searchParams.get('letterLocale');
    if (typeParam && (LETTER_TYPES as readonly string[]).includes(typeParam)) {
      setLetterType(typeParam as LetterType);
    }
    if (localeParam === 'en' || localeParam === 'mr') {
      setLetterLocale(localeParam);
    }
  }, [searchParams]);

  const activeLetterMaster = useMemo(() => {
    return (
      letterMasters.find(
        (master) =>
          master.letterType === letterType && master.letterLocale === letterLocale,
      ) ?? null
    );
  }, [letterMasters, letterType, letterLocale]);

  useEffect(() => {
    if (activeLetterMaster) {
      setTemplateDraft(activeLetterMaster.templateHtml);
      setTemplateNameDraft(activeLetterMaster.name);
      setLetterheadDraft(activeLetterMaster.letterheadUrl);
      setLetterheadModeDraft(normalizeLetterheadMode(activeLetterMaster.letterheadMode));
      setPaperSizeDraft(
        resolveLetterPaperSize(activeLetterMaster.paperSize, letterType),
      );
      return;
    }
    setTemplateDraft(getDefaultTemplateHtml(letterType, letterLocale));
    setTemplateNameDraft(getDefaultTemplateName(letterType, letterLocale));
    setLetterheadDraft(null);
    setLetterheadModeDraft('full');
    setPaperSizeDraft(getDefaultLetterPaperSize(letterType));
  }, [activeLetterMaster, letterType, letterLocale]);

  const previewLetterheadUrl = resolveLetterheadUrl(paperSizeDraft, letterheadDraft);

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
            letterType,
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

  const beneficiaryServiceId = searchParams.get('beneficiaryServiceId');
  const backHref = beneficiaryServiceId
    ? `/modules/letter-generation?beneficiaryServiceId=${encodeURIComponent(beneficiaryServiceId)}`
    : '/modules/operator';

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <ModulePageHeader
        title={t('letterGeneration.templates.title')}
        description={t('letterGeneration.templates.description')}
        actions={
          <Button variant="outline" asChild>
            <Link href={backHref}>
              <ArrowLeft className="mr-2 size-4" />
              {t('letterGeneration.templates.backToLetterGeneration')}
            </Link>
          </Button>
        }
      />

      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-lg">
            {t('letterGeneration.templates.editorTitle')}
          </CardTitle>
          <CardDescription>
            {t('letterGeneration.templates.editorDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 p-4 sm:p-6">
          {!activeLetterMaster ? (
            <p className="rounded-md border border-dashed bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
              {t('letterGeneration.templates.noTemplateHint')}
            </p>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <FieldGroup label={t('letterGeneration.fields.letterType')}>
              <Select
                value={letterType}
                onValueChange={(value: LetterType) => setLetterType(value)}
              >
                <SelectTrigger>
                  <SelectValue />
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
            <FieldGroup label={t('letterGeneration.templates.name')}>
              <Input
                value={templateNameDraft}
                onChange={(e) => setTemplateNameDraft(e.target.value)}
                placeholder={t('letterGeneration.templates.namePlaceholder')}
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
                <FieldGroup
                  label={t('letterGeneration.templates.letterheadMode')}
                  className="max-w-xs"
                >
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

          <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
            <div className="space-y-2">
              <FieldGroup label={t('letterGeneration.templates.html')}>
                <Textarea
                  value={templateDraft}
                  onChange={(e) => setTemplateDraft(e.target.value)}
                  rows={28}
                  className="min-h-[28rem] font-mono text-xs sm:text-sm"
                  placeholder={t('letterGeneration.templates.htmlPlaceholder')}
                  spellCheck={false}
                />
              </FieldGroup>
              <p className="text-xs text-muted-foreground">
                {t('letterGeneration.templates.placeholderHint')}
              </p>
            </div>

            <div className="space-y-2">
              <Label className="mb-1.5 block text-sm font-medium">
                {t('letterGeneration.templates.livePreview')}
              </Label>
              <div className="max-h-[min(80vh,52rem)] overflow-auto rounded-lg border bg-muted/20 p-3 sm:p-4">
                {templateDraft.trim() ? (
                  <LetterPreview
                    html={templateDraft}
                    paperSize={paperSizeDraft}
                    letterheadUrl={previewLetterheadUrl}
                    letterLocale={letterLocale}
                    variant="inline"
                  />
                ) : (
                  <div className="flex min-h-48 items-center justify-center text-sm text-muted-foreground">
                    {t('letterGeneration.templates.previewEmpty')}
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {t('letterGeneration.templates.previewHint')}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => {
                setTemplateDraft(getDefaultTemplateHtml(letterType, letterLocale));
                setTemplateNameDraft(
                  activeLetterMaster?.name?.trim() ||
                  getDefaultTemplateName(letterType, letterLocale),
                );
                toast.success(t('letterGeneration.templates.restoreDefaultSuccess'));
              }}
            >
              {t('letterGeneration.templates.restoreDefault')}
            </Button>
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => void refreshLetterMasters()}
              disabled={letterMastersLoading}
            >
              {letterMastersLoading ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 size-4" />
              )}
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
      </Card>
    </div>
  );
}
