'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/toast';
import { useTranslations } from '@/hooks/use-translations';
import { isValidIndianMobile, normalizeIndianMobileDigits } from '@/lib/indian-mobile';
import {
    formatYmd,
    formatYmdAsDmy,
    getCalendarYmd,
    parseFlexibleDateToYmd,
} from '@/lib/ist-date';
import { cn } from '@/lib/utils';
import type { VoterWithPartNo } from '@/lib/db/schema';

export interface MobileNumberEntry {
    mobileNumber: string;
    sortOrder: number;
}

export interface PhoneUpdatePayload {
    mobileNoPrimary: string;
    mobileNoSecondary?: string;
    /** Only sent when the voter currently has no DOB. */
    dob?: string;
}

interface PhoneUpdateFormProps {
    voter: VoterWithPartNo;
    mobileNumbers?: MobileNumberEntry[];
    onPhoneUpdate: (phoneData: PhoneUpdatePayload) => void;
    onSkip: () => void;
    onPrevious?: () => void;
    onCancel: () => void;
}

function getMaxDobDate(): string {
    const today = getCalendarYmd();
    // Clamp day when today is Feb 29 and year-18 is not a leap year.
    for (let day = today.day; day >= 1; day -= 1) {
        const ymd = formatYmd({
            year: today.year - 18,
            month: today.month,
            day,
        });
        if (parseFlexibleDateToYmd(ymd)) return ymd;
    }
    return formatYmd({
        year: today.year - 18,
        month: today.month,
        day: 1,
    });
}

/** Prefill DOB year from age as `01-01-yyyy` (day/month left for the operator to correct). */
function getDobPrefillFromAge(age: number | null | undefined): string {
    if (age == null || !Number.isFinite(age)) return '';
    const wholeAge = Math.floor(age);
    if (wholeAge < 1 || wholeAge > 120) return '';
    const birthYear = getCalendarYmd().year - wholeAge;
    if (birthYear < 1000 || birthYear > 9999) return '';
    return formatYmdAsDmy(formatYmd({ year: birthYear, month: 1, day: 1 }));
}

export function PhoneUpdateForm({ voter, mobileNumbers, onPhoneUpdate, onSkip, onPrevious, onCancel }: PhoneUpdateFormProps) {
    const { t } = useTranslations();
    const [mobileNoPrimary, setMobileNoPrimary] = useState('');
    const [mobileNoSecondary, setMobileNoSecondary] = useState('');
    const [dob, setDob] = useState('');
    const [dobError, setDobError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const dobPickerRef = useRef<HTMLInputElement>(null);

    const hadDob = Boolean(voter.dob?.trim());
    const maxDobDate = useMemo(() => getMaxDobDate(), []);

    useEffect(() => {
        const orderedNumbers = (mobileNumbers || [])
            .slice()
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((entry) => entry.mobileNumber)
            .filter((number) => !!number?.trim());

        let primary =
            orderedNumbers[0] || voter.mobileNoPrimary?.trim() || '';
        let secondary =
            orderedNumbers[1] || voter.mobileNoSecondary?.trim() || '';

        if (!primary && secondary) {
            primary = secondary;
            secondary = '';
        }

        if (
            primary &&
            secondary &&
            normalizeIndianMobileDigits(primary) === normalizeIndianMobileDigits(secondary)
        ) {
            secondary = '';
        }

        setMobileNoPrimary(primary ? normalizeIndianMobileDigits(primary).slice(0, 10) : '');
        setMobileNoSecondary(
            secondary ? normalizeIndianMobileDigits(secondary).slice(0, 10) : '',
        );
    }, [mobileNumbers, voter.mobileNoPrimary, voter.mobileNoSecondary, voter.epicNumber]);

    useEffect(() => {
        if (hadDob) {
            const existing = voter.dob?.trim() ?? '';
            const parsed = parseFlexibleDateToYmd(existing);
            setDob(parsed ? formatYmdAsDmy(parsed) : existing);
        } else {
            setDob(getDobPrefillFromAge(voter.age));
        }
        setDobError(null);
    }, [hadDob, voter.age, voter.dob, voter.epicNumber]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!mobileNoPrimary.trim()) {
            return;
        }

        if (!isValidIndianMobile(mobileNoPrimary)) {
            toast({
                type: 'error',
                description: t('operator.messages.invalidIndianMobile'),
            });
            return;
        }

        if (mobileNoSecondary.trim() && !isValidIndianMobile(mobileNoSecondary)) {
            toast({
                type: 'error',
                description: t('operator.messages.invalidIndianMobile'),
            });
            return;
        }

        let dobToSave: string | undefined;
        if (!hadDob) {
            const trimmedDob = dob.trim();
            if (!trimmedDob) {
                setDobError(t('phoneUpdate.dobRequired'));
                return;
            }
            const parsedDob = parseFlexibleDateToYmd(trimmedDob);
            if (!parsedDob) {
                setDobError(t('phoneUpdate.dobInvalid'));
                return;
            }
            if (parsedDob > maxDobDate) {
                setDobError(t('phoneUpdate.dobMinAge'));
                return;
            }
            setDobError(null);
            dobToSave = parsedDob;
        }

        setIsSubmitting(true);
        try {
            onPhoneUpdate({
                mobileNoPrimary: normalizeIndianMobileDigits(mobileNoPrimary),
                mobileNoSecondary: mobileNoSecondary.trim()
                    ? normalizeIndianMobileDigits(mobileNoSecondary)
                    : undefined,
                ...(dobToSave ? { dob: dobToSave } : {}),
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const dobIsoValue = parseFlexibleDateToYmd(dob) ?? '';

    return (
        <Card>
            <CardHeader>
                <CardTitle>{t('phoneUpdate.title')}</CardTitle>
                <CardDescription>
                    {t('phoneUpdate.description')}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Voter Information Display */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold">{t('phoneUpdate.voterInfo')}</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                            <div>
                                <Label className="text-sm font-medium">{t('common.name')}</Label>
                                <p className="text-sm">{voter.fullName}</p>
                            </div>
                            <div>
                                <Label className="text-sm font-medium">{t('forms.epicNumber')}</Label>
                                <p className="text-sm font-mono">{voter.epicNumber}</p>
                            </div>
                            <div>
                                <Label className="text-sm font-medium">{t('forms.age')}</Label>
                                <p className="text-sm">{voter.age || 'N/A'}</p>
                            </div>
                            <div>
                                <Label className="text-sm font-medium">{t('forms.gender')}</Label>
                                <p className="text-sm">{voter.gender || 'N/A'}</p>
                            </div>
                            {hadDob && (
                                <div>
                                    <Label className="text-sm font-medium">{t('phoneUpdate.dob')}</Label>
                                    <p className="text-sm">{voter.dob}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Phone Number Input Fields */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold">{t('phoneUpdate.contactInfo')}</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="mobileNoPrimary">
                                    {t('phoneUpdate.primary')} <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="mobileNoPrimary"
                                    type="tel"
                                    inputMode="numeric"
                                    autoComplete="tel"
                                    maxLength={10}
                                    value={mobileNoPrimary}
                                    onChange={(e) =>
                                        setMobileNoPrimary(
                                            e.target.value.replace(/\D/g, '').slice(0, 10),
                                        )
                                    }
                                    placeholder={t('phoneUpdate.primaryPlaceholder')}
                                    required
                                    className="font-mono"
                                />
                                <p className="text-xs text-muted-foreground">
                                    {t('phoneUpdate.primaryHelp')}
                                </p>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="mobileNoSecondary">
                                    {t('phoneUpdate.secondary')}
                                </Label>
                                <Input
                                    id="mobileNoSecondary"
                                    type="tel"
                                    inputMode="numeric"
                                    autoComplete="tel"
                                    maxLength={10}
                                    value={mobileNoSecondary}
                                    onChange={(e) =>
                                        setMobileNoSecondary(
                                            e.target.value.replace(/\D/g, '').slice(0, 10),
                                        )
                                    }
                                    placeholder={t('phoneUpdate.secondaryPlaceholder')}
                                    className="font-mono"
                                />
                                <p className="text-xs text-muted-foreground">
                                    {t('phoneUpdate.secondaryHelp')}
                                </p>
                            </div>
                        </div>

                        {!hadDob && (
                            <div className="space-y-2 max-w-md">
                                <Label htmlFor="phone-update-dob">
                                    {t('phoneUpdate.dob')} <span className="text-red-500">*</span>
                                </Label>
                                <div className="relative">
                                    <Input
                                        id="phone-update-dob"
                                        type="text"
                                        inputMode="numeric"
                                        autoComplete="bday"
                                        placeholder={t('phoneUpdate.dobPlaceholder')}
                                        value={dob}
                                        onChange={(e) => {
                                            setDob(e.target.value);
                                            setDobError(null);
                                        }}
                                        onBlur={() => {
                                            const parsed = parseFlexibleDateToYmd(dob);
                                            if (parsed) {
                                                setDob(formatYmdAsDmy(parsed));
                                            }
                                        }}
                                        aria-invalid={Boolean(dobError)}
                                        className={cn(
                                            'pr-10 font-mono',
                                            dobError &&
                                                'border-red-500 focus-visible:ring-red-500',
                                        )}
                                        required
                                    />
                                    <button
                                        type="button"
                                        className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground hover:text-foreground"
                                        aria-label={t('phoneUpdate.dobPick')}
                                        onClick={() => {
                                            const picker = dobPickerRef.current;
                                            if (!picker) return;
                                            try {
                                                picker.showPicker();
                                            } catch {
                                                picker.click();
                                            }
                                        }}
                                    >
                                        <Calendar className="h-4 w-4" aria-hidden />
                                    </button>
                                    <input
                                        ref={dobPickerRef}
                                        type="date"
                                        tabIndex={-1}
                                        aria-hidden
                                        value={dobIsoValue}
                                        max={maxDobDate}
                                        onChange={(e) => {
                                            const next = e.target.value;
                                            setDob(next ? formatYmdAsDmy(next) : '');
                                            setDobError(null);
                                        }}
                                        className="pointer-events-none absolute h-0 w-0 opacity-0"
                                    />
                                </div>
                                {dobError ? (
                                    <p className="text-xs text-red-500">{dobError}</p>
                                ) : (
                                    <p className="text-xs text-muted-foreground">
                                        {t('phoneUpdate.dobRequiredHelp')}
                                    </p>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row gap-3">
                        <Button
                            type="submit"
                            disabled={isSubmitting || !mobileNoPrimary.trim()}
                            className="flex-1"
                        >
                            {isSubmitting
                                ? t('phoneUpdate.updating')
                                : hadDob
                                    ? t('phoneUpdate.update')
                                    : t('phoneUpdate.updateWithDob')}
                        </Button>

                        <Button
                            type="button"
                            variant="secondary"
                            onClick={onSkip}
                            disabled={isSubmitting}
                            className="flex-1"
                        >
                            {t('phoneUpdate.continueWithout')}
                        </Button>

                        {onPrevious && (
                            <Button
                                type="button"
                                variant="outline"
                                onClick={onPrevious}
                                disabled={isSubmitting}
                            >
                                {t('common.previous')}
                            </Button>
                        )}

                        <Button
                            type="button"
                            variant="outline"
                            onClick={onCancel}
                            disabled={isSubmitting}
                        >
                            {t('common.cancel')}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}
