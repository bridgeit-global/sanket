'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type DragEvent,
  type ReactNode,
} from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  Briefcase,
  Building2,
  CalendarPlus,
  Check,
  CheckCircle2,
  Cpu,
  FileText,
  GraduationCap,
  HeartPulse,
  Loader2,
  MapPin,
  MoreHorizontal,
  Pencil,
  Search,
  Share2,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Truck,
  Upload,
  User,
  UserPlus,
  X,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Combobox } from '@/components/ui/combobox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/components/toast';
import { cn } from '@/lib/utils';
import {
  AREA_OPTIONS,
  AREA_OTHER,
  EMPLOYMENT_STATUS_OPTIONS,
  EXPERIENCE_OPTIONS,
  GENDER_OPTIONS,
  HEARD_FROM_OPTIONS,
  JOB_FAIR_EVENT,
  JOB_FAIR_PUBLIC_PATH,
  JOB_TYPE_OPTIONS,
  JOB_TYPE_OTHER,
  QUALIFICATION_OPTIONS,
  RESUME_ACCEPT_ATTR,
  optionLabel,
} from '@/lib/job-fair/options';
import {
  EMPTY_JOB_FAIR_FORM,
  JOB_FAIR_STEP_KEYS,
  normalizeIndianMobile,
  validateJobFairStep,
  validateResumeFile,
  type JobFairFieldErrors,
  type JobFairFormValues,
  type JobFairStepKey,
} from '@/lib/job-fair/schema';
import { downloadJobFairIcs } from '@/lib/job-fair/calendar';
import { JobFairEventChips } from './job-fair-hero';

const DRAFT_KEY = 'yuvaaz-2026-registration-draft';

const STEPS: Array<{ key: JobFairStepKey | 'review'; label: string; icon: typeof User }> = [
  { key: 'personal', label: 'Personal', icon: User },
  { key: 'address', label: 'Address', icon: MapPin },
  { key: 'education', label: 'Education & Work', icon: GraduationCap },
  { key: 'preferences', label: 'Job Preference', icon: Briefcase },
  { key: 'review', label: 'Review', icon: CheckCircle2 },
];

const FIELD_STEP: Record<string, number> = {
  fullName: 0,
  mobile: 0,
  whatsapp: 0,
  age: 0,
  gender: 0,
  area: 1,
  areaOther: 1,
  pincode: 1,
  epicNumber: 1,
  qualification: 2,
  course: 2,
  employmentStatus: 2,
  experience: 2,
  jobTypes: 3,
  jobTypeOther: 3,
  heardFrom: 3,
  resume: 3,
};

const JOB_TYPE_ICONS: Record<string, typeof User> = {
  office: Building2,
  sales: ShoppingBag,
  it: Cpu,
  healthcare: HeartPulse,
  logistics: Truck,
  security: ShieldCheck,
  any: Sparkles,
  other: MoreHorizontal,
};

const EMPLOYMENT_ICONS: Record<string, typeof User> = {
  fresher: GraduationCap,
  'experienced-unemployed': Search,
  'employed-looking': Briefcase,
};

type Result =
  | { kind: 'success'; registrationNo: string; resumeUploaded: boolean | null }
  | { kind: 'duplicate'; registrationNo: string | null };

const fieldId = (name: string) => `jf-${name}`;

function digitsOnly(value: string, max: number): string {
  return value.replace(/\D/g, '').slice(0, max);
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function Field({
  name,
  label,
  required,
  hint,
  error,
  children,
  className,
}: {
  name: string;
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('min-w-0 space-y-1.5', className)}>
      <label
        htmlFor={fieldId(name)}
        id={`${fieldId(name)}-label`}
        className="block text-sm font-medium"
      >
        {label}
        {required ? <span className="ml-0.5 text-rose-500">*</span> : (
          <span className="ml-1.5 text-xs font-normal text-muted-foreground">
            (optional)
          </span>
        )}
      </label>
      {children}
      {error ? (
        <p id={`${fieldId(name)}-error`} role="alert" className="text-sm text-rose-500">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

function RadioTiles({
  name,
  options,
  value,
  onChange,
  invalid,
  columns = 'grid-cols-3',
  icons,
}: {
  name: string;
  options: readonly { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  invalid?: boolean;
  columns?: string;
  icons?: Record<string, typeof User>;
}) {
  return (
    <div
      id={fieldId(name)}
      tabIndex={-1}
      role="radiogroup"
      aria-labelledby={`${fieldId(name)}-label`}
      aria-invalid={invalid || undefined}
      className={cn('grid gap-2 focus:outline-none', columns)}
    >
      {options.map((option) => {
        const selected = value === option.value;
        const Icon = icons?.[option.value];
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className={cn(
              'flex min-h-11 items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
              selected
                ? 'border-primary bg-primary/10 text-foreground shadow-sm ring-1 ring-primary'
                : 'border-input bg-background hover:border-primary',
              invalid && !selected && 'border-rose-400',
            )}
          >
            <span
              className={cn(
                'flex size-4 shrink-0 items-center justify-center rounded-full border',
                selected ? 'border-primary bg-primary' : 'border-muted-foreground/50',
              )}
            >
              {selected ? <span className="size-1.5 rounded-full bg-primary-foreground" /> : null}
            </span>
            {Icon ? <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden /> : null}
            <span className="min-w-0 break-words">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function SelectField({
  name,
  value,
  onChange,
  options,
  placeholder,
  invalid,
}: {
  name: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly { value: string; label: string }[];
  placeholder: string;
  invalid?: boolean;
}) {
  return (
    <Select value={value || undefined} onValueChange={onChange}>
      <SelectTrigger
        id={fieldId(name)}
        aria-invalid={invalid || undefined}
        className={cn('h-11 w-full', invalid && 'border-rose-400')}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function Reveal({ show, children }: { show: boolean; children: ReactNode }) {
  return (
    <AnimatePresence initial={false}>
      {show ? (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="overflow-hidden"
        >
          <div className="pt-1">{children}</div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function ReviewSection({
  title,
  onEdit,
  rows,
}: {
  title: string;
  onEdit: () => void;
  rows: Array<[string, string | null | undefined]>;
}) {
  return (
    <section className="rounded-xl border bg-muted/30 p-4">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h3 className="font-semibold">{title}</h3>
        <Button type="button" variant="ghost" size="sm" onClick={onEdit} className="h-9">
          <Pencil className="size-3.5" />
          Edit
        </Button>
      </div>
      <dl className="grid grid-cols-1 gap-x-4 gap-y-2 text-sm sm:grid-cols-2">
        {rows.map(([label, value]) => (
          <div key={label} className="min-w-0">
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="break-words font-medium">{value || '—'}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export function JobFairRegistrationForm() {
  const [values, setValues] = useState<JobFairFormValues>(EMPTY_JOB_FAIR_FORM);
  const [sameAsMobile, setSameAsMobile] = useState(false);
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<JobFairFieldErrors>({});
  const [resume, setResume] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [honeypot, setHoneypot] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const draft = JSON.parse(raw) as {
          values?: Partial<JobFairFormValues>;
          sameAsMobile?: boolean;
          step?: number;
        };
        setValues({ ...EMPTY_JOB_FAIR_FORM, ...draft.values });
        setSameAsMobile(Boolean(draft.sameAsMobile));
        if (typeof draft.step === 'number') {
          setStep(Math.min(Math.max(0, draft.step), STEPS.length - 1));
        }
      }
    } catch {
      // Corrupt draft: start fresh.
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated || result) return;
    try {
      window.localStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({ values, sameAsMobile, step }),
      );
    } catch {
      // Storage full or disabled.
    }
  }, [values, sameAsMobile, step, hydrated, result]);

  const set = useCallback(
    <K extends keyof JobFairFormValues>(key: K, value: JobFairFormValues[K]) => {
      setValues((prev) => {
        const next = { ...prev, [key]: value };
        if (key === 'mobile' && sameAsMobile) next.whatsapp = value as string;
        return next;
      });
      setErrors((prev) => {
        if (!prev[key]) return prev;
        const { [key]: _removed, ...rest } = prev;
        return rest;
      });
    },
    [sameAsMobile],
  );

  const scrollToCard = () => {
    cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const focusFirstError = (errs: JobFairFieldErrors) => {
    const order = Object.keys(FIELD_STEP);
    const first = order.find((k) => errs[k]);
    if (!first) return;
    requestAnimationFrame(() => {
      const el = document.getElementById(fieldId(first));
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        (el as HTMLElement).focus({ preventScroll: true });
      }
    });
  };

  const goTo = (index: number) => {
    setStep(index);
    setErrors({});
    scrollToCard();
  };

  const handleNext = () => {
    const key = STEPS[step].key;
    if (key !== 'review') {
      const check = validateJobFairStep(key, values);
      if (!check.ok) {
        setErrors(check.errors);
        focusFirstError(check.errors);
        return;
      }
    }
    goTo(Math.min(step + 1, STEPS.length - 1));
  };

  const handleBack = () => goTo(Math.max(step - 1, 0));

  const pickResume = (file: File | null | undefined) => {
    if (!file) return;
    const error = validateResumeFile(file);
    if (error) {
      setErrors((prev) => ({ ...prev, resume: error }));
      toast.error(error);
      return;
    }
    setErrors(({ resume: _r, ...rest }) => rest);
    setResume(file);
  };

  const onDrop = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setDragging(false);
    pickResume(e.dataTransfer.files?.[0]);
  };

  const resetAll = () => {
    window.localStorage.removeItem(DRAFT_KEY);
    setValues(EMPTY_JOB_FAIR_FORM);
    setSameAsMobile(false);
    setResume(null);
    setErrors({});
    setResult(null);
    setStep(0);
    scrollToCard();
  };

  const handleSubmit = async () => {
    for (const key of JOB_FAIR_STEP_KEYS) {
      const check = validateJobFairStep(key, values);
      if (!check.ok) {
        setStep(JOB_FAIR_STEP_KEYS.indexOf(key));
        setErrors(check.errors);
        focusFirstError(check.errors);
        toast.error('Please complete the highlighted fields');
        return;
      }
    }

    const body = new FormData();
    for (const [key, value] of Object.entries(values)) {
      if (key === 'jobTypes') continue;
      body.append(key, value as string);
    }
    for (const jt of values.jobTypes) body.append('jobTypes', jt);
    if (resume) body.append('resume', resume);
    body.append('website', honeypot);

    setSubmitting(true);
    try {
      const res = await fetch('/api/public/job-fair/register', {
        method: 'POST',
        body,
      });
      const data = (await res.json().catch(() => ({}))) as {
        registrationNo?: string | null;
        resumeUploaded?: boolean | null;
        error?: string;
        fieldErrors?: JobFairFieldErrors;
      };

      if (res.status === 201) {
        window.localStorage.removeItem(DRAFT_KEY);
        setResult({
          kind: 'success',
          registrationNo: data.registrationNo ?? '',
          resumeUploaded: data.resumeUploaded ?? null,
        });
        scrollToCard();
        return;
      }
      if (res.status === 409) {
        window.localStorage.removeItem(DRAFT_KEY);
        setResult({ kind: 'duplicate', registrationNo: data.registrationNo ?? null });
        scrollToCard();
        return;
      }
      if (res.status === 400 && data.fieldErrors) {
        const errs = data.fieldErrors;
        const firstStep = Math.min(
          ...Object.keys(errs).map((k) => FIELD_STEP[k] ?? 0),
        );
        setStep(firstStep);
        setErrors(errs);
        focusFirstError(errs);
      }
      toast.error(data.error || 'Registration failed. Please try again.');
    } catch {
      toast.error('Network error. Check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (result) {
    return (
      <div ref={cardRef} className="scroll-mt-4">
        <ResultCard result={result} onRegisterAnother={resetAll} />
      </div>
    );
  }

  const current = STEPS[step];
  const progress = ((step + 1) / STEPS.length) * 100;
  const err = (k: string) => errors[k];

  return (
    <div
      ref={cardRef}
      className="scroll-mt-4 rounded-2xl border bg-card text-card-foreground shadow-xl"
    >
      <div className="sticky top-0 z-20 rounded-t-2xl border-b bg-card/95 px-4 pb-3 pt-4 backdrop-blur sm:px-6">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wider text-primary">
              Candidate Registration
            </p>
            <h2 className="truncate text-lg font-bold">{current.label}</h2>
          </div>
          <span className="shrink-0 rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground">
            Step {step + 1} of {STEPS.length}
          </span>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-secondary">
          <motion.div
            className="h-full rounded-full bg-primary"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
        <ol className="mt-3 grid grid-cols-5 gap-1">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const done = i < step;
            const active = i === step;
            return (
              <li key={s.key}>
                <button
                  type="button"
                  disabled={i > step}
                  onClick={() => goTo(i)}
                  className={cn(
                    'flex w-full flex-col items-center gap-1 rounded-lg py-1 text-[11px] font-medium transition-colors disabled:cursor-default',
                    active ? 'text-foreground' : done ? 'text-primary' : 'text-muted-foreground',
                  )}
                  aria-current={active ? 'step' : undefined}
                  aria-label={`Step ${i + 1}: ${s.label}`}
                >
                  <span
                    className={cn(
                      'flex size-7 items-center justify-center rounded-full border',
                      active && 'border-primary bg-primary text-primary-foreground',
                      done && 'border-primary bg-primary/10',
                    )}
                  >
                    {done ? <Check className="size-3.5" /> : <Icon className="size-3.5" />}
                  </span>
                  <span className="hidden truncate sm:inline">{s.label}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </div>

      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          if (current.key === 'review') void handleSubmit();
          else handleNext();
        }}
      >
        <input
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          value={honeypot}
          onChange={(e) => setHoneypot(e.target.value)}
          className="sr-only"
          aria-hidden
        />

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={current.key}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.18 }}
            className="space-y-5 px-4 py-5 sm:px-6"
          >
            {current.key === 'personal' ? (
              <>
                <Field name="fullName" label="Full Name" required error={err('fullName')}>
                  <Input
                    id={fieldId('fullName')}
                    autoComplete="name"
                    autoCapitalize="words"
                    placeholder="As on your ID / marksheet"
                    value={values.fullName}
                    onChange={(e) => set('fullName', e.target.value)}
                    aria-invalid={Boolean(err('fullName')) || undefined}
                    className={cn('h-11', err('fullName') && 'border-rose-400')}
                    maxLength={150}
                  />
                </Field>

                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <Field name="mobile" label="Mobile Number" required error={err('mobile')}>
                    <div className="relative">
                      <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted-foreground">
                        +91
                      </span>
                      <Input
                        id={fieldId('mobile')}
                        type="tel"
                        inputMode="numeric"
                        autoComplete="tel-national"
                        placeholder="10-digit number"
                        value={values.mobile}
                        onChange={(e) => set('mobile', digitsOnly(normalizeIndianMobile(e.target.value), 10))}
                        aria-invalid={Boolean(err('mobile')) || undefined}
                        className={cn('h-11 pl-11', err('mobile') && 'border-rose-400')}
                      />
                    </div>
                  </Field>

                  <Field
                    name="whatsapp"
                    label="WhatsApp Number"
                    required
                    error={err('whatsapp')}
                    hint="Event updates will be sent here"
                  >
                    <div className="relative">
                      <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted-foreground">
                        +91
                      </span>
                      <Input
                        id={fieldId('whatsapp')}
                        type="tel"
                        inputMode="numeric"
                        autoComplete="tel-national"
                        placeholder="10-digit number"
                        value={values.whatsapp}
                        disabled={sameAsMobile}
                        onChange={(e) => set('whatsapp', digitsOnly(normalizeIndianMobile(e.target.value), 10))}
                        aria-invalid={Boolean(err('whatsapp')) || undefined}
                        className={cn('h-11 pl-11', err('whatsapp') && 'border-rose-400')}
                      />
                    </div>
                    <label className="flex min-h-10 cursor-pointer items-center gap-2.5 text-sm">
                      <input
                        type="checkbox"
                        checked={sameAsMobile}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setSameAsMobile(checked);
                          if (checked) {
                            setValues((prev) => ({ ...prev, whatsapp: prev.mobile }));
                            setErrors(({ whatsapp: _w, ...rest }) => rest);
                          }
                        }}
                        className="size-4 accent-primary"
                      />
                      Same as Mobile Number
                    </label>
                  </Field>
                </div>

                <div className="grid grid-cols-1 gap-5 md:grid-cols-[140px_1fr]">
                  <Field name="age" label="Age" required error={err('age')}>
                    <Input
                      id={fieldId('age')}
                      inputMode="numeric"
                      placeholder="e.g. 22"
                      value={values.age}
                      onChange={(e) => set('age', digitsOnly(e.target.value, 2))}
                      aria-invalid={Boolean(err('age')) || undefined}
                      className={cn('h-11', err('age') && 'border-rose-400')}
                    />
                  </Field>
                  <Field name="gender" label="Gender" required error={err('gender')}>
                    <RadioTiles
                      name="gender"
                      options={GENDER_OPTIONS}
                      value={values.gender}
                      onChange={(v) => set('gender', v)}
                      invalid={Boolean(err('gender'))}
                    />
                  </Field>
                </div>
              </>
            ) : null}

            {current.key === 'address' ? (
              <>
                <Field name="area" label="Area / Locality" required error={err('area')}>
                  <Combobox
                    id={fieldId('area')}
                    options={AREA_OPTIONS.map((o) => ({ ...o, pinned: o.value === AREA_OTHER }))}
                    value={values.area}
                    onValueChange={(v) => set('area', v)}
                    placeholder="Search or select your area"
                    emptyMessage="No match — choose “Other – Please Specify”"
                    aria-invalid={Boolean(err('area'))}
                    aria-required
                    inputClassName={cn('h-11', err('area') && 'border-rose-400')}
                  />
                </Field>

                <Reveal show={values.area === AREA_OTHER}>
                  <Field name="areaOther" label="Please specify your Area / Locality" required error={err('areaOther')}>
                    <Input
                      id={fieldId('areaOther')}
                      placeholder="Your area / locality"
                      value={values.areaOther}
                      onChange={(e) => set('areaOther', e.target.value)}
                      aria-invalid={Boolean(err('areaOther')) || undefined}
                      className={cn('h-11', err('areaOther') && 'border-rose-400')}
                      maxLength={150}
                    />
                  </Field>
                </Reveal>

                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <Field name="pincode" label="PIN Code" required error={err('pincode')}>
                    <Input
                      id={fieldId('pincode')}
                      inputMode="numeric"
                      autoComplete="postal-code"
                      placeholder="e.g. 400088"
                      value={values.pincode}
                      onChange={(e) => set('pincode', digitsOnly(e.target.value, 6))}
                      aria-invalid={Boolean(err('pincode')) || undefined}
                      className={cn('h-11', err('pincode') && 'border-rose-400')}
                    />
                  </Field>
                  <Field
                    name="epicNumber"
                    label="Voter ID / EPIC Number"
                    error={err('epicNumber')}
                    hint="Printed on your Election Card"
                  >
                    <Input
                      id={fieldId('epicNumber')}
                      autoCapitalize="characters"
                      placeholder="e.g. ABC1234567"
                      value={values.epicNumber}
                      onChange={(e) => set('epicNumber', e.target.value.toUpperCase().replace(/\s/g, ''))}
                      aria-invalid={Boolean(err('epicNumber')) || undefined}
                      className={cn('h-11 uppercase', err('epicNumber') && 'border-rose-400')}
                      maxLength={20}
                    />
                  </Field>
                </div>
              </>
            ) : null}

            {current.key === 'education' ? (
              <>
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <Field name="qualification" label="Highest Qualification" required error={err('qualification')}>
                    <SelectField
                      name="qualification"
                      value={values.qualification}
                      onChange={(v) => set('qualification', v)}
                      options={QUALIFICATION_OPTIONS}
                      placeholder="Select qualification"
                      invalid={Boolean(err('qualification'))}
                    />
                  </Field>
                  <Field
                    name="course"
                    label="Course / Degree / Trade"
                    error={err('course')}
                    hint="e.g. B.Com, BA, BSc, B.Tech, ITI Electrician, Diploma Mechanical"
                  >
                    <Input
                      id={fieldId('course')}
                      placeholder="e.g. B.Com"
                      value={values.course}
                      onChange={(e) => set('course', e.target.value)}
                      className="h-11"
                      maxLength={150}
                    />
                  </Field>
                </div>

                <Field name="employmentStatus" label="Current Employment Status" required error={err('employmentStatus')}>
                  <RadioTiles
                    name="employmentStatus"
                    options={EMPLOYMENT_STATUS_OPTIONS}
                    value={values.employmentStatus}
                    onChange={(v) => {
                      set('employmentStatus', v);
                      if (v === 'fresher' && !values.experience) set('experience', 'none');
                    }}
                    invalid={Boolean(err('employmentStatus'))}
                    columns="grid-cols-1 md:grid-cols-3"
                    icons={EMPLOYMENT_ICONS}
                  />
                </Field>

                <Field name="experience" label="Work Experience" required error={err('experience')}>
                  <SelectField
                    name="experience"
                    value={values.experience}
                    onChange={(v) => set('experience', v)}
                    options={EXPERIENCE_OPTIONS}
                    placeholder="Select experience"
                    invalid={Boolean(err('experience'))}
                  />
                </Field>
              </>
            ) : null}

            {current.key === 'preferences' ? (
              <>
                <Field
                  name="jobTypes"
                  label="What type of job are you looking for?"
                  required
                  error={err('jobTypes')}
                  hint="Select all that apply"
                >
                  <div
                    id={fieldId('jobTypes')}
                    tabIndex={-1}
                    role="group"
                    aria-labelledby={`${fieldId('jobTypes')}-label`}
                    className="grid grid-cols-1 gap-2 focus:outline-none sm:grid-cols-2"
                  >
                    {JOB_TYPE_OPTIONS.map((option) => {
                      const selected = values.jobTypes.includes(option.value);
                      const Icon = JOB_TYPE_ICONS[option.value] ?? Briefcase;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          aria-pressed={selected}
                          onClick={() =>
                            set(
                              'jobTypes',
                              selected
                                ? values.jobTypes.filter((v) => v !== option.value)
                                : [...values.jobTypes, option.value],
                            )
                          }
                          className={cn(
                            'flex min-h-12 items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                            selected
                              ? 'border-primary bg-primary/10 ring-1 ring-primary'
                              : 'border-input bg-background hover:border-primary',
                            err('jobTypes') && !selected && 'border-rose-400',
                          )}
                        >
                          <span
                            className={cn(
                              'flex size-8 shrink-0 items-center justify-center rounded-lg',
                              selected ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground',
                            )}
                          >
                            {selected ? <Check className="size-4" /> : <Icon className="size-4" />}
                          </span>
                          <span className="min-w-0 break-words">{option.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </Field>

                <Reveal show={values.jobTypes.includes(JOB_TYPE_OTHER)}>
                  <Field name="jobTypeOther" label="Please specify the job type" required error={err('jobTypeOther')}>
                    <Input
                      id={fieldId('jobTypeOther')}
                      placeholder="e.g. Driver, Tailoring, Beautician"
                      value={values.jobTypeOther}
                      onChange={(e) => set('jobTypeOther', e.target.value)}
                      aria-invalid={Boolean(err('jobTypeOther')) || undefined}
                      className={cn('h-11', err('jobTypeOther') && 'border-rose-400')}
                      maxLength={150}
                    />
                  </Field>
                </Reveal>

                <Field
                  name="resume"
                  label="Upload Resume / CV"
                  error={err('resume')}
                  hint="PDF, Word, JPG or PNG · up to 5 MB"
                >
                  {resume ? (
                    <div className="flex items-center gap-3 rounded-xl border bg-muted/40 p-3">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <FileText className="size-5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">{resume.name}</div>
                        <div className="text-xs text-muted-foreground">{formatBytes(resume.size)}</div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setResume(null);
                          if (fileInputRef.current) fileInputRef.current.value = '';
                        }}
                        aria-label="Remove resume"
                      >
                        <X className="size-4" />
                      </Button>
                    </div>
                  ) : (
                    <label
                      htmlFor={fieldId('resume')}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDragging(true);
                      }}
                      onDragLeave={() => setDragging(false)}
                      onDrop={onDrop}
                      className={cn(
                        'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-6 text-center transition-colors',
                        dragging ? 'border-primary bg-primary/5' : 'border-input hover:border-primary',
                        err('resume') && 'border-rose-400',
                      )}
                    >
                      <span className="flex size-10 items-center justify-center rounded-full bg-muted">
                        <Upload className="size-5 text-muted-foreground" />
                      </span>
                      <span className="text-sm font-medium">
                        <span className="sm:hidden">Tap to choose a file</span>
                        <span className="hidden sm:inline">Drag & drop or click to choose a file</span>
                      </span>
                    </label>
                  )}
                  <input
                    ref={fileInputRef}
                    id={fieldId('resume')}
                    type="file"
                    accept={RESUME_ACCEPT_ATTR}
                    className="sr-only"
                    onChange={(e) => pickResume(e.target.files?.[0])}
                  />
                </Field>

                <Field name="heardFrom" label="How did you hear about YUVAAZ 2026?" error={err('heardFrom')}>
                  <SelectField
                    name="heardFrom"
                    value={values.heardFrom}
                    onChange={(v) => set('heardFrom', v)}
                    options={HEARD_FROM_OPTIONS}
                    placeholder="Select an option"
                  />
                </Field>
              </>
            ) : null}

            {current.key === 'review' ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Please check your details before submitting.
                </p>
                <ReviewSection
                  title="Personal"
                  onEdit={() => goTo(0)}
                  rows={[
                    ['Full Name', values.fullName],
                    ['Mobile', values.mobile && `+91 ${values.mobile}`],
                    ['WhatsApp', values.whatsapp && `+91 ${values.whatsapp}`],
                    ['Age', values.age],
                    ['Gender', optionLabel(GENDER_OPTIONS, values.gender)],
                  ]}
                />
                <ReviewSection
                  title="Address"
                  onEdit={() => goTo(1)}
                  rows={[
                    [
                      'Area / Locality',
                      values.area === AREA_OTHER
                        ? values.areaOther
                        : optionLabel(AREA_OPTIONS, values.area),
                    ],
                    ['PIN Code', values.pincode],
                    ['Voter ID (EPIC)', values.epicNumber],
                  ]}
                />
                <ReviewSection
                  title="Education & Work"
                  onEdit={() => goTo(2)}
                  rows={[
                    ['Highest Qualification', optionLabel(QUALIFICATION_OPTIONS, values.qualification)],
                    ['Course / Degree / Trade', values.course],
                    ['Employment Status', optionLabel(EMPLOYMENT_STATUS_OPTIONS, values.employmentStatus)],
                    ['Work Experience', optionLabel(EXPERIENCE_OPTIONS, values.experience)],
                  ]}
                />
                <ReviewSection
                  title="Job Preference"
                  onEdit={() => goTo(3)}
                  rows={[
                    [
                      'Job Types',
                      values.jobTypes
                        .map((v) =>
                          v === JOB_TYPE_OTHER && values.jobTypeOther
                            ? `Other (${values.jobTypeOther})`
                            : optionLabel(JOB_TYPE_OPTIONS, v),
                        )
                        .join(', '),
                    ],
                    ['Resume', resume?.name],
                    ['Heard via', optionLabel(HEARD_FROM_OPTIONS, values.heardFrom)],
                  ]}
                />
              </div>
            ) : null}
          </motion.div>
        </AnimatePresence>

        <div className="sticky bottom-0 z-10 flex flex-col-reverse gap-2 rounded-b-2xl border-t bg-card/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:px-6">
          {step > 0 ? (
            <Button
              type="button"
              variant="outline"
              onClick={handleBack}
              disabled={submitting}
              className="h-11 w-full sm:w-auto"
            >
              <ArrowLeft className="size-4" />
              Back
            </Button>
          ) : (
            <p className="hidden text-xs text-muted-foreground sm:block">
              Fields marked <span className="text-rose-500">*</span> are required
            </p>
          )}
          <Button
            type="submit"
            disabled={submitting}
            className="h-11 w-full sm:w-auto sm:min-w-40"
          >
            {current.key === 'review' ? (
              submitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Submitting…
                </>
              ) : (
                <>
                  Submit Registration
                  <Check className="size-4" />
                </>
              )
            ) : (
              <>
                {step === STEPS.length - 2 ? 'Review' : 'Next'}
                <ArrowRight className="size-4" />
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

function ResultCard({
  result,
  onRegisterAnother,
}: {
  result: Result;
  onRegisterAnother: () => void;
}) {
  const isSuccess = result.kind === 'success';
  const shareText = `I just registered for ${JOB_FAIR_EVENT.title} – ${JOB_FAIR_EVENT.subtitle} on ${JOB_FAIR_EVENT.dateLabel}, ${JOB_FAIR_EVENT.timeLabel} at ${JOB_FAIR_EVENT.venueShort}. Register free here:`;
  const shareUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}${JOB_FAIR_PUBLIC_PATH}`
      : JOB_FAIR_PUBLIC_PATH;

  return (
    <div className="overflow-hidden rounded-2xl border bg-card text-card-foreground shadow-xl">
      <div className="bg-primary px-4 py-8 text-center text-primary-foreground sm:px-6">
        <motion.div
          initial={{ scale: 0.4, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 18 }}
          className="mx-auto flex size-16 items-center justify-center rounded-full bg-secondary text-primary shadow-lg"
        >
          {isSuccess ? <Check className="size-9" strokeWidth={3} /> : <UserPlus className="size-8" />}
        </motion.div>
        <h2 className="mt-4 text-2xl font-bold">
          {isSuccess ? 'You are registered!' : 'You are already registered'}
        </h2>
        <p className="mt-1 text-sm text-primary-foreground/85">
          {isSuccess
            ? 'See you at YUVAAZ 2026. Show this number at the registration desk.'
            : 'This mobile number is already registered for YUVAAZ 2026.'}
        </p>
        {result.registrationNo ? (
          <div className="mx-auto mt-5 inline-flex flex-col rounded-xl bg-secondary px-6 py-3 text-secondary-foreground">
            <span className="text-[11px] uppercase tracking-widest text-muted-foreground">
              Registration No.
            </span>
            <span className="font-mono text-3xl font-bold tracking-wider sm:text-4xl">
              {result.registrationNo}
            </span>
          </div>
        ) : null}
        <JobFairEventChips className="mt-6 text-left" />
      </div>

      <div className="space-y-4 px-4 py-5 sm:px-6">
        {isSuccess && result.resumeUploaded === false ? (
          <p className="rounded-lg border border-primary/30 bg-primary/10 p-3 text-sm">
            Your registration is saved, but we could not upload your resume. Please
            bring printed copies to the venue.
          </p>
        ) : null}
        <ul className="space-y-2 text-sm">
          <li className="flex gap-2">
            <Check className="mt-0.5 size-4 shrink-0 text-primary" />
            Carry 3–5 printed copies of your resume / CV.
          </li>
          <li className="flex gap-2">
            <Check className="mt-0.5 size-4 shrink-0 text-primary" />
            Bring a photo ID (Aadhaar / Voter ID) and mark sheets / certificates.
          </li>
          <li className="flex gap-2">
            <Check className="mt-0.5 size-4 shrink-0 text-primary" />
            Reach early — entry from 10:00 AM.
          </li>
        </ul>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Button
            type="button"
            variant="outline"
            className="h-11 w-full"
            onClick={() => downloadJobFairIcs(result.registrationNo)}
          >
            <CalendarPlus className="size-4" />
            Add to Calendar
          </Button>
          <Button asChild className="h-11 w-full bg-[#25D366] text-white hover:bg-[#1ebe5a]">
            <a
              href={`https://wa.me/?text=${encodeURIComponent(`${shareText} ${shareUrl}`)}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Share2 className="size-4" />
              Share on WhatsApp
            </a>
          </Button>
        </div>
        <Button
          type="button"
          variant="ghost"
          className="h-11 w-full"
          onClick={onRegisterAnother}
        >
          <UserPlus className="size-4" />
          Register another candidate
        </Button>
      </div>
    </div>
  );
}
