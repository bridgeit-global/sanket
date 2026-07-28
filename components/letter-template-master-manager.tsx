'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Loader2,
  Pencil,
  Save,
  Search,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { toast } from '@/components/toast';

import { ConfirmDialog } from '@/components/confirm-dialog';
import { LetterPreview } from '@/components/letter-preview';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Combobox } from '@/components/ui/combobox';
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
import { Textarea } from '@/components/ui/textarea';
import { useTranslations } from '@/hooks/use-translations';
import {
  getDefaultTemplateHtml,
  getDefaultTemplateName,
} from '@/lib/letters/default-template-html';
import { resolveLetterheadUrl } from '@/lib/letters/letterhead';
import {
  letterTypeLabel,
  normalizeLetterTypeCode,
  type LetterTypeOption,
} from '@/lib/letters/letter-type-options';
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
  isLetterType,
  type LetterLocale,
} from '@/lib/letters/templates';

const LETTER_LOCALES: LetterLocale[] = ['en', 'mr'];
const NEW_LETTER_TYPE_VALUE = '__new__';

export type LetterMasterRow = {
  id: string;
  name: string;
  letterType: string;
  letterLocale: LetterLocale;
  templateHtml: string;
  letterheadUrl: string | null;
  letterheadMode: LetterheadMode;
  paperSize: LetterPaperSize;
  updatedAt: string | Date;
};

type TemplateFormState = {
  name: string;
  letterType: string;
  letterLocale: LetterLocale;
  templateHtml: string;
  letterheadUrl: string | null;
  letterheadMode: LetterheadMode;
  paperSize: LetterPaperSize;
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

function formatUpdatedAt(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString();
}

function emptyFormFor(
  letterType: string,
  letterLocale: LetterLocale,
): TemplateFormState {
  return {
    name: getDefaultTemplateName(letterType, letterLocale),
    letterType,
    letterLocale,
    templateHtml: getDefaultTemplateHtml(letterType, letterLocale),
    letterheadUrl: null,
    letterheadMode: 'full',
    paperSize: getDefaultLetterPaperSize(letterType),
  };
}

type LetterTemplateMasterManagerProps = {
  letterMasters: LetterMasterRow[];
  loading: boolean;
  onRefresh: () => Promise<void>;
  initialLetterType?: string | null;
  initialLetterLocale?: LetterLocale | null;
};

export function LetterTemplateMasterManager({
  letterMasters,
  loading,
  onRefresh,
  initialLetterType = null,
  initialLetterLocale = null,
}: LetterTemplateMasterManagerProps) {
  const { t, locale } = useTranslations();
  const uiLocale: LetterLocale = locale === 'mr' ? 'mr' : 'en';
  const resolvedInitialType = initialLetterType?.trim() || 'fees';
  const resolvedInitialLocale: LetterLocale =
    initialLetterLocale === 'en' || initialLetterLocale === 'mr'
      ? initialLetterLocale
      : 'en';

  const [formCardOpen, setFormCardOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<TemplateFormState>(() =>
    emptyFormFor(resolvedInitialType, resolvedInitialLocale),
  );
  const [creatingNewType, setCreatingNewType] = useState(false);
  const [newTypeCode, setNewTypeCode] = useState('');
  const [newTypeLabelEn, setNewTypeLabelEn] = useState('');
  const [newTypeLabelMr, setNewTypeLabelMr] = useState('');
  const [letterTypeOptions, setLetterTypeOptions] = useState<LetterTypeOption[]>(
    [],
  );
  const [letterTypesLoading, setLetterTypesLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingLetterhead, setIsUploadingLetterhead] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<LetterMasterRow | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>(() =>
    initialLetterType?.trim() || 'all',
  );
  const [filterLocale, setFilterLocale] = useState<string>(() =>
    initialLetterLocale === 'en' || initialLetterLocale === 'mr'
      ? initialLetterLocale
      : 'all',
  );
  const letterheadInputRef = useRef<HTMLInputElement>(null);
  const initialOpenDoneRef = useRef(false);

  const refreshLetterTypes = async () => {
    setLetterTypesLoading(true);
    try {
      const res = await fetch('/api/letter-types?includeInactive=true');
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to fetch letter types');
      setLetterTypeOptions((json?.letterTypes ?? []) as LetterTypeOption[]);
    } catch (error) {
      console.error('Failed to fetch letter types', error);
      toast.error(t('letterGeneration.letterTypes.fetchError'));
    } finally {
      setLetterTypesLoading(false);
    }
  };

  useEffect(() => {
    void refreshLetterTypes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeLetterTypes = useMemo(
    () => letterTypeOptions.filter((opt) => opt.isActive),
    [letterTypeOptions],
  );

  const letterTypeComboboxOptions = useMemo(
    () =>
      activeLetterTypes.map((type) => ({
        value: type.code,
        label: letterTypeLabel(type, uiLocale),
      })),
    [activeLetterTypes, uiLocale],
  );

  const formLetterTypeComboboxOptions = useMemo(() => {
    const options = [...letterTypeComboboxOptions];
    if (!editingId) {
      options.push({
        value: NEW_LETTER_TYPE_VALUE,
        label: t('letterGeneration.letterTypes.addNewOption'),
      });
    }
    return options;
  }, [letterTypeComboboxOptions, editingId, t]);

  const filterLetterTypeComboboxOptions = useMemo(
    () => [
      {
        value: 'all',
        label: t('letterGeneration.templates.filterAllTypes'),
      },
      ...letterTypeComboboxOptions,
    ],
    [letterTypeComboboxOptions, t],
  );

  const typeLabel = (code: string) => {
    const option = letterTypeOptions.find((opt) => opt.code === code);
    if (option) return letterTypeLabel(option, uiLocale, code);
    if (isLetterType(code)) {
      return t(`letterGeneration.tabs.${code}`);
    }
    return code;
  };

  const sortedMasters = useMemo(() => {
    return [...letterMasters].sort((a, b) => {
      const typeCmp = a.letterType.localeCompare(b.letterType);
      if (typeCmp !== 0) return typeCmp;
      const localeCmp = a.letterLocale.localeCompare(b.letterLocale);
      if (localeCmp !== 0) return localeCmp;
      const aTime = new Date(a.updatedAt).getTime();
      const bTime = new Date(b.updatedAt).getTime();
      return (Number.isNaN(bTime) ? 0 : bTime) - (Number.isNaN(aTime) ? 0 : aTime);
    });
  }, [letterMasters]);

  const filteredMasters = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return sortedMasters.filter((item) => {
      if (filterType !== 'all' && item.letterType !== filterType) return false;
      if (filterLocale !== 'all' && item.letterLocale !== filterLocale) {
        return false;
      }
      if (!q) return true;
      const typeLbl = typeLabel(item.letterType).toLowerCase();
      const localeLabel = t(
        `letterGeneration.letterLanguage.${item.letterLocale}`,
      ).toLowerCase();
      return (
        item.name.toLowerCase().includes(q) ||
        item.letterType.toLowerCase().includes(q) ||
        typeLbl.includes(q) ||
        localeLabel.includes(q)
      );
    });
  }, [sortedMasters, searchTerm, filterType, filterLocale, t, letterTypeOptions, uiLocale]);

  useEffect(() => {
    if (editingId) setFormCardOpen(true);
  }, [editingId]);

  useEffect(() => {
    if (initialOpenDoneRef.current || loading) {
      return;
    }
    if (!initialLetterType && !initialLetterLocale) {
      initialOpenDoneRef.current = true;
      return;
    }
    const match = letterMasters.find(
      (m) =>
        (!initialLetterType || m.letterType === initialLetterType) &&
        (!initialLetterLocale || m.letterLocale === initialLetterLocale),
    );
    if (match) {
      openEditForm(match);
    } else {
      // Coming from letter generation with no matching template — open Add
      // Template on "+ Add new letter type…" with blank type fields.
      openCreateForm();
    }
    initialOpenDoneRef.current = true;
    // Only run once after first successful load with query params.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, letterMasters, initialLetterType, initialLetterLocale]);

  const previewLetterheadUrl = resolveLetterheadUrl(
    form.paperSize,
    form.letterheadUrl,
  );

  const resetNewTypeFields = () => {
    setCreatingNewType(false);
    setNewTypeCode('');
    setNewTypeLabelEn('');
    setNewTypeLabelMr('');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    resetNewTypeFields();
    setForm(
      emptyFormFor(
        filterType !== 'all' ? filterType : initialLetterType || 'fees',
        (filterLocale !== 'all'
          ? filterLocale
          : initialLetterLocale || 'en') as LetterLocale,
      ),
    );
    setFormCardOpen(false);
  };

  const openCreateForm = () => {
    const letterLocale = (
      filterLocale !== 'all' ? filterLocale : initialLetterLocale || 'en'
    ) as LetterLocale;
    setEditingId(null);
    setCreatingNewType(true);
    setNewTypeCode('');
    setNewTypeLabelEn('');
    setNewTypeLabelMr('');
    setForm({
      ...emptyFormFor('general', letterLocale),
      name: '',
    });
    setFormCardOpen(true);
    requestAnimationFrame(() => {
      document
        .getElementById('letter-template-form')
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const toggleFormCard = () => {
    if (formCardOpen) {
      setFormCardOpen(false);
      return;
    }
    if (editingId) {
      setFormCardOpen(true);
      return;
    }
    // Expanding Add Template — start on "+ Add new letter type…" with blank fields.
    openCreateForm();
  };

  const openEditForm = (item: LetterMasterRow) => {
    setEditingId(item.id);
    resetNewTypeFields();
    setForm({
      name: item.name,
      letterType: item.letterType,
      letterLocale: item.letterLocale,
      templateHtml: item.templateHtml,
      letterheadUrl: item.letterheadUrl,
      letterheadMode: normalizeLetterheadMode(item.letterheadMode),
      paperSize: resolveLetterPaperSize(item.paperSize, item.letterType),
    });
    setFormCardOpen(true);
    requestAnimationFrame(() => {
      document
        .getElementById('letter-template-form')
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const handleTypeOrLocaleChange = (
    nextType: string,
    nextLocale: LetterLocale,
  ) => {
    if (editingId) return;
    if (nextType === NEW_LETTER_TYPE_VALUE) {
      const switchingIntoNewType = !creatingNewType;
      setCreatingNewType(true);
      if (switchingIntoNewType) {
        setNewTypeCode('');
        setNewTypeLabelEn('');
        setNewTypeLabelMr('');
      }
      setForm((prev) => ({
        ...emptyFormFor('general', nextLocale),
        letterheadUrl: prev.letterheadUrl,
        letterheadMode: prev.letterheadMode,
        name: switchingIntoNewType ? '' : prev.name,
      }));
      return;
    }
    setCreatingNewType(false);
    setForm((prev) => ({
      ...emptyFormFor(nextType, nextLocale),
      letterheadUrl: prev.letterheadUrl,
      letterheadMode: prev.letterheadMode,
      name: prev.name.trim()
        ? prev.name
        : getDefaultTemplateName(nextType, nextLocale),
    }));
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
      setForm((prev) => ({ ...prev, letterheadUrl: json.url ?? null }));
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

  const ensureLetterTypeExists = async (): Promise<string | null> => {
    if (!creatingNewType) return form.letterType;

    const code = normalizeLetterTypeCode(newTypeCode);
    const labelEn = newTypeLabelEn.trim();
    const labelMr = newTypeLabelMr.trim();
    if (!code || !labelEn || !labelMr) {
      toast.error(t('letterGeneration.letterTypes.validationRequired'));
      return null;
    }

    const res = await fetch('/api/letter-types', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ code, labelEn, labelMr }),
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(
        json?.error || t('letterGeneration.letterTypes.createError'),
      );
    }
    await refreshLetterTypes();
    toast.success(t('letterGeneration.letterTypes.createSuccess'));
    return code;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.templateHtml.trim()) {
      toast.error(t('letterGeneration.templates.validationRequired'));
      return;
    }

    setIsSaving(true);
    try {
      const letterType = await ensureLetterTypeExists();
      if (!letterType) {
        setIsSaving(false);
        return;
      }

      const payload = {
        name: form.name.trim(),
        templateHtml: form.templateHtml,
        letterheadUrl: form.letterheadUrl,
        letterheadMode: form.letterheadMode,
        paperSize: form.paperSize,
      };

      const res = editingId
        ? await fetch(`/api/letter-masters/${encodeURIComponent(editingId)}`, {
            method: 'PUT',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(payload),
          })
        : await fetch('/api/letter-masters', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              ...payload,
              letterType,
              letterLocale: form.letterLocale,
            }),
          });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(
          json?.error ||
            (editingId
              ? t('letterGeneration.templates.saveError')
              : t('letterGeneration.templates.createError')),
        );
      }

      toast.success(
        t(
          editingId
            ? 'letterGeneration.templates.saveSuccess'
            : 'letterGeneration.templates.createSuccess',
        ),
      );
      handleCancelEdit();
      await onRefresh();
    } catch (error) {
      console.error('Failed to save letter template', error);
      toast.error(
        error instanceof Error
          ? error.message
          : editingId
            ? t('letterGeneration.templates.saveError')
            : t('letterGeneration.templates.createError'),
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/letter-masters/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(
          json?.error || t('letterGeneration.templates.deleteError'),
        );
      }
      toast.success(t('letterGeneration.templates.deleteSuccess'));
      if (editingId === id) handleCancelEdit();
      await onRefresh();
    } catch (error) {
      console.error('Failed to delete letter template', error);
      toast.error(
        error instanceof Error
          ? error.message
          : t('letterGeneration.templates.deleteError'),
      );
    } finally {
      setDeletingId(null);
      setDeleteTarget(null);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <Card id="letter-template-form">
        <CardHeader
          className="cursor-pointer select-none"
          onClick={toggleFormCard}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              toggleFormCard();
            }
          }}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <CardTitle>
                {editingId
                  ? t('letterGeneration.templates.editTitle')
                  : t('letterGeneration.templates.addTitle')}
              </CardTitle>
              <CardDescription>
                {t('letterGeneration.templates.formDescription')}
              </CardDescription>
            </div>
            {formCardOpen ? (
              <ChevronUp className="mt-1 size-5 shrink-0 text-muted-foreground" />
            ) : (
              <ChevronDown className="mt-1 size-5 shrink-0 text-muted-foreground" />
            )}
          </div>
        </CardHeader>
        {formCardOpen ? (
          <CardContent className="space-y-4">
            <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <FieldGroup label={t('letterGeneration.fields.letterType')}>
                  <Combobox
                    value={
                      creatingNewType ? NEW_LETTER_TYPE_VALUE : form.letterType
                    }
                    disabled={Boolean(editingId) || letterTypesLoading}
                    onValueChange={(value) =>
                      handleTypeOrLocaleChange(value, form.letterLocale)
                    }
                    options={formLetterTypeComboboxOptions}
                  />
                </FieldGroup>
                <FieldGroup label={t('letterGeneration.fields.letterLanguage')}>
                  <Select
                    value={form.letterLocale}
                    disabled={Boolean(editingId)}
                    onValueChange={(value: LetterLocale) =>
                      handleTypeOrLocaleChange(
                        creatingNewType
                          ? NEW_LETTER_TYPE_VALUE
                          : form.letterType,
                        value,
                      )
                    }
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
                    value={form.name}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, name: e.target.value }))
                    }
                    placeholder={t('letterGeneration.templates.namePlaceholder')}
                    required
                  />
                </FieldGroup>
                <FieldGroup label={t('letterGeneration.fields.paperSize')}>
                  <Select
                    value={form.paperSize}
                    onValueChange={(value: LetterPaperSize) =>
                      setForm((prev) => ({ ...prev, paperSize: value }))
                    }
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

              {creatingNewType && !editingId ? (
                <div className="grid gap-4 rounded-md border border-dashed bg-muted/20 p-4 sm:grid-cols-3">
                  <FieldGroup label={t('letterGeneration.letterTypes.code')}>
                    <Input
                      value={newTypeCode}
                      onChange={(e) => setNewTypeCode(e.target.value)}
                      placeholder={t(
                        'letterGeneration.letterTypes.codePlaceholder',
                      )}
                      required
                    />
                  </FieldGroup>
                  <FieldGroup label={t('letterGeneration.letterTypes.labelEn')}>
                    <Input
                      value={newTypeLabelEn}
                      onChange={(e) => setNewTypeLabelEn(e.target.value)}
                      placeholder={t(
                        'letterGeneration.letterTypes.labelEnPlaceholder',
                      )}
                      required
                    />
                  </FieldGroup>
                  <FieldGroup label={t('letterGeneration.letterTypes.labelMr')}>
                    <Input
                      value={newTypeLabelMr}
                      onChange={(e) => setNewTypeLabelMr(e.target.value)}
                      placeholder={t(
                        'letterGeneration.letterTypes.labelMrPlaceholder',
                      )}
                      required
                    />
                  </FieldGroup>
                  <p className="text-xs text-muted-foreground sm:col-span-3">
                    {t('letterGeneration.letterTypes.newTypeHint')}
                  </p>
                </div>
              ) : null}

              <FieldGroup label={t('letterGeneration.templates.letterhead')}>
                <div className="space-y-3">
                  {form.letterheadUrl ? (
                    <FieldGroup
                      label={t('letterGeneration.templates.letterheadMode')}
                      className="max-w-xs"
                    >
                      <Select
                        value={form.letterheadMode}
                        onValueChange={(value: LetterheadMode) =>
                          setForm((prev) => ({
                            ...prev,
                            letterheadMode: value,
                          }))
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
                      {form.letterheadUrl
                        ? t('letterGeneration.templates.letterheadReplace')
                        : t('letterGeneration.templates.letterheadUpload')}
                    </Button>
                    {form.letterheadUrl ? (
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full sm:w-auto"
                        onClick={() =>
                          setForm((prev) => ({
                            ...prev,
                            letterheadUrl: null,
                            letterheadMode: 'full',
                          }))
                        }
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
                      value={form.templateHtml}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          templateHtml: e.target.value,
                        }))
                      }
                      rows={28}
                      className="min-h-[28rem] font-mono text-xs sm:text-sm"
                      placeholder={t(
                        'letterGeneration.templates.htmlPlaceholder',
                      )}
                      spellCheck={false}
                      required
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
                    {form.templateHtml.trim() ? (
                      <LetterPreview
                        html={form.templateHtml}
                        paperSize={form.paperSize}
                        letterheadUrl={previewLetterheadUrl}
                        letterLocale={form.letterLocale}
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

              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setForm((prev) => ({
                      ...prev,
                      templateHtml: getDefaultTemplateHtml(
                        creatingNewType ? 'general' : prev.letterType,
                        prev.letterLocale,
                      ),
                      name:
                        prev.name.trim() ||
                        getDefaultTemplateName(
                          creatingNewType ? 'general' : prev.letterType,
                          prev.letterLocale,
                        ),
                    }));
                    toast.success(
                      t('letterGeneration.templates.restoreDefaultSuccess'),
                    );
                  }}
                >
                  {t('letterGeneration.templates.restoreDefault')}
                </Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 size-4" />
                  )}
                  {editingId
                    ? t('letterGeneration.templates.save')
                    : t('letterGeneration.templates.create')}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancelEdit}
                >
                  {t('common.cancel')}
                </Button>
              </div>
            </form>
          </CardContent>
        ) : null}
      </Card>

      <Card>
        <CardHeader className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>{t('letterGeneration.templates.listTitle')}</CardTitle>
              <CardDescription>
                {t('letterGeneration.templates.listDescription')}
              </CardDescription>
            </div>
            <Button
              type="button"
              className="w-full sm:w-auto"
              onClick={openCreateForm}
            >
              {t('letterGeneration.templates.add')}
            </Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="relative sm:col-span-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={t('letterGeneration.templates.searchPlaceholder')}
              />
            </div>
            <Combobox
              value={filterType}
              onValueChange={setFilterType}
              options={filterLetterTypeComboboxOptions}
              placeholder={t('letterGeneration.templates.filterAllTypes')}
            />
            <Select value={filterLocale} onValueChange={setFilterLocale}>
              <SelectTrigger>
                <SelectValue
                  placeholder={t('letterGeneration.templates.filterAllLocales')}
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {t('letterGeneration.templates.filterAllLocales')}
                </SelectItem>
                {LETTER_LOCALES.map((lang) => (
                  <SelectItem key={lang} value={lang}>
                    {t(`letterGeneration.letterLanguage.${lang}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              {t('common.loading')}
            </div>
          ) : sortedMasters.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t('letterGeneration.templates.empty')}
            </p>
          ) : filteredMasters.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t('letterGeneration.templates.noFilterResults')}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      {t('letterGeneration.templates.columns.name')}
                    </TableHead>
                    <TableHead>
                      {t('letterGeneration.templates.columns.letterType')}
                    </TableHead>
                    <TableHead>
                      {t('letterGeneration.templates.columns.locale')}
                    </TableHead>
                    <TableHead>
                      {t('letterGeneration.templates.columns.paperSize')}
                    </TableHead>
                    <TableHead>
                      {t('letterGeneration.templates.columns.updatedAt')}
                    </TableHead>
                    <TableHead className="text-right">
                      {t('common.actions')}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMasters.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>
                        {typeLabel(item.letterType)}
                      </TableCell>
                      <TableCell>
                        {t(
                          `letterGeneration.letterLanguage.${item.letterLocale}`,
                        )}
                      </TableCell>
                      <TableCell>
                        {t(`letterGeneration.paperSize.options.${item.paperSize}`)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {formatUpdatedAt(item.updatedAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditForm(item)}
                            aria-label={t('common.edit')}
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            disabled={deletingId === item.id}
                            onClick={() => setDeleteTarget(item)}
                            aria-label={t('common.delete')}
                          >
                            {deletingId === item.id ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : (
                              <Trash2 className="size-4" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title={t('letterGeneration.templates.deleteConfirmTitle')}
        description={t('letterGeneration.templates.deleteConfirmDescription')}
        confirmText={t('letterGeneration.templates.deleteConfirm')}
        cancelText={t('common.cancel')}
        variant="destructive"
        onConfirm={() => {
          if (deleteTarget) void handleDelete(deleteTarget.id);
        }}
      />
    </div>
  );
}
