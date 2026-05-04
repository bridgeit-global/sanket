'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Combobox } from '@/components/ui/combobox';
import { toast } from '@/components/toast';
import { useTranslations } from '@/hooks/use-translations';
import type { VoterWithPartNo } from '@/lib/db/schema';

interface BeneficiaryServiceInitialData {
    serviceName?: string;
    description?: string;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    notes?: string;
    programmeId?: string;
    programmeLabel?: string;
}

type TodayProgrammeRow = {
    id: string;
    startTime: string;
    endTime?: string | null;
    title: string;
    location: string;
};

function formatTime12Hour(time24: string): string {
    const match = /^(\d{2}):(\d{2})$/.exec(time24);
    if (!match) return time24;
    const d = new Date();
    d.setHours(Number(match[1]), Number(match[2]), 0, 0);
    return new Intl.DateTimeFormat('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
    }).format(d);
}

function programmeOptionLabel(row: TodayProgrammeRow): string {
    const start = formatTime12Hour(row.startTime);
    const end = row.endTime ? formatTime12Hour(row.endTime) : '';
    const timePart = end ? `${start} – ${end}` : start;
    return `${timePart} · ${row.title} · ${row.location}`;
}

const LINKED_PROGRAMME_STORAGE_KEY = 'operator_linked_programme';

function readStoredLinkedProgramme(): { programmeId: string; programmeLabel: string } | null {
    if (typeof window === 'undefined') return null;
    try {
        const raw = sessionStorage.getItem(LINKED_PROGRAMME_STORAGE_KEY);
        if (!raw) return null;
        const v = JSON.parse(raw) as { programmeId?: string; programmeLabel?: string };
        if (!v.programmeId) return null;
        return { programmeId: v.programmeId, programmeLabel: v.programmeLabel ?? '' };
    } catch {
        return null;
    }
}

function writeStoredLinkedProgramme(programmeId: string, programmeLabel: string) {
    if (typeof window === 'undefined') return;
    if (!programmeId) {
        sessionStorage.removeItem(LINKED_PROGRAMME_STORAGE_KEY);
        return;
    }
    sessionStorage.setItem(
        LINKED_PROGRAMME_STORAGE_KEY,
        JSON.stringify({ programmeId, programmeLabel }),
    );
}

export interface BeneficiaryServiceFormProps {
    voter: VoterWithPartNo;
    onServiceCreated: (serviceId: string) => void;
    onServiceDataReady?: (data: any) => void;
    /** When set, shows a Previous control (e.g. return to phone update in operator flow). */
    onPrevious?: () => void;
    onCancel: () => void;
    initialData?: BeneficiaryServiceInitialData;
}

const INDIVIDUAL_SERVICES = [
    // Housing & Infrastructure
    'Residential Structural Repairs',
    'Residential Lift Repairs',
    'Residential Water Leakage MMRDA',
    'Residential Water Leakage BMC',
    'SRA',
    'MHADA',
    'MMRDA',

    // Documents & Certificates
    'Aadhar Card',
    'Ration Card',
    'Income Certificate',
    'Domicile Certificate',

    // Financial Assistance
    'Marriage Donation',
    'Festival Donation',
    'Education Donation',
    'Medical Aid',

    // Legal & Support
    'Police Case',
    'Domestic Violence'
];

export function BeneficiaryServiceForm(props: BeneficiaryServiceFormProps) {
    const { voter, onServiceCreated, onServiceDataReady, onPrevious, onCancel, initialData } = props;
    const { t } = useTranslations();
    const serviceType = 'individual' as const;
    const initialServiceName = initialData?.serviceName ?? '';
    const initialIsCustom = !!initialServiceName && !INDIVIDUAL_SERVICES.includes(initialServiceName);
    const [serviceName, setServiceName] = useState(initialIsCustom ? '' : initialServiceName);
    const [customServiceName, setCustomServiceName] = useState(initialIsCustom ? initialServiceName : '');
    const [isCustomService, setIsCustomService] = useState(initialIsCustom);
    const [description, setDescription] = useState(initialData?.description ?? '');
    const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>(initialData?.priority ?? 'medium');
    const [notes, setNotes] = useState(initialData?.notes ?? '');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [todayProgrammes, setTodayProgrammes] = useState<TodayProgrammeRow[]>([]);
    const [linkedProgrammeId, setLinkedProgrammeId] = useState(() => {
        if (initialData?.programmeId) return initialData.programmeId;
        return readStoredLinkedProgramme()?.programmeId ?? '';
    });
    const [programmesLoaded, setProgrammesLoaded] = useState(false);

    // Restore choice when returning from confirmation (parent passes updated initialData).
    useEffect(() => {
        if (initialData?.programmeId) {
            setLinkedProgrammeId(initialData.programmeId);
            if (initialData.programmeLabel) {
                writeStoredLinkedProgramme(initialData.programmeId, initialData.programmeLabel);
            }
        }
    }, [initialData?.programmeId, initialData?.programmeLabel]);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await fetch('/operator/api/today-programmes');
                if (!res.ok) return;
                const data = (await res.json()) as TodayProgrammeRow[];
                if (!cancelled) {
                    setTodayProgrammes(Array.isArray(data) ? data : []);
                }
            } catch {
                // optional linkage — ignore fetch errors
            } finally {
                if (!cancelled) setProgrammesLoaded(true);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    // Drop stored id if it is no longer in today's list (programme removed or day changed).
    useEffect(() => {
        if (!programmesLoaded || !linkedProgrammeId || todayProgrammes.length === 0) return;
        if (!todayProgrammes.some((p) => p.id === linkedProgrammeId)) {
            setLinkedProgrammeId('');
            writeStoredLinkedProgramme('', '');
        }
    }, [programmesLoaded, todayProgrammes, linkedProgrammeId]);

    const resolveProgrammeLabel = (id: string): string | undefined => {
        const row = todayProgrammes.find((p) => p.id === id);
        if (row) return programmeOptionLabel(row);
        if (initialData?.programmeId === id && initialData.programmeLabel) {
            return initialData.programmeLabel;
        }
        const stored = readStoredLinkedProgramme();
        if (stored?.programmeId === id && stored.programmeLabel) return stored.programmeLabel;
        return undefined;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const finalServiceName = isCustomService ? customServiceName : serviceName;

        if (!finalServiceName.trim()) {
            toast({
                type: 'error',
                description: t('beneficiaryService.messages.serviceNameRequired'),
            });
            return;
        }

        const resolvedLabel = linkedProgrammeId
            ? resolveProgrammeLabel(linkedProgrammeId)
            : undefined;

        const serviceData = {
            serviceType,
            serviceName: finalServiceName,
            description,
            priority,
            notes,
            ...(linkedProgrammeId
                ? {
                      programmeId: linkedProgrammeId,
                      programmeLabel: resolvedLabel,
                  }
                : {}),
        };

        // If onServiceDataReady is provided, use confirmation flow
        if (onServiceDataReady) {
            onServiceDataReady(serviceData);
            return;
        }

        // Otherwise, use direct creation flow
        setIsSubmitting(true);
        try {
            const createBody = { ...serviceData } as Record<string, unknown>;
            delete createBody.programmeLabel;
            const response = await fetch('/operator/api/create-beneficiary-service', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ...createBody,
                    voterId: voter.epicNumber,
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to create beneficiary service');
            }

            const data = await response.json();
            onServiceCreated(data.serviceId);
            toast({
                type: 'success',
                description: t('beneficiaryService.messages.createdSuccess'),
            });
        } catch (error) {
            toast({
                type: 'error',
                description: t('beneficiaryService.messages.createFailed'),
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>{t('beneficiaryService.form.title')}</CardTitle>
                <CardDescription>
                    {t('beneficiaryService.form.description', { name: voter.fullName, epicNumber: voter.epicNumber })}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                    {programmesLoaded && todayProgrammes.length > 0 && (
                        <div className="space-y-2 pb-4 border-b">
                            <Label htmlFor="linkedProgramme">Linked Programme (today, optional)</Label>
                            <Select
                                value={linkedProgrammeId || '__none__'}
                                onValueChange={(value) => {
                                    if (value === '__none__') {
                                        setLinkedProgrammeId('');
                                        writeStoredLinkedProgramme('', '');
                                    } else {
                                        setLinkedProgrammeId(value);
                                        const row = todayProgrammes.find((p) => p.id === value);
                                        const label = row ? programmeOptionLabel(row) : value;
                                        writeStoredLinkedProgramme(value, label);
                                    }
                                }}
                            >
                                <SelectTrigger id="linkedProgramme" className="w-full">
                                    <SelectValue placeholder="None" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="__none__">None</SelectItem>
                                    {todayProgrammes.map((row) => (
                                        <SelectItem key={row.id} value={row.id}>
                                            {programmeOptionLabel(row)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                    {/* Service Details */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold">{t('operator.confirmation.serviceDetails')}</h3>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="serviceName">{t('beneficiaryService.form.fields.serviceName')}</Label>
                                <div className="space-y-2">
                                    <Combobox
                                        value={isCustomService ? 'custom' : serviceName}
                                        onValueChange={(value) => {
                                            if (value === 'custom') {
                                                setIsCustomService(true);
                                                setServiceName('');
                                            } else {
                                                setIsCustomService(false);
                                                setServiceName(value);
                                                setCustomServiceName('');
                                            }
                                        }}
                                        placeholder={t('beneficiaryService.form.fields.selectService')}
                                        options={[
                                            ...INDIVIDUAL_SERVICES.map((service) => ({
                                                value: service,
                                                label: service,
                                            })),
                                            {
                                                value: 'custom',
                                                label: t('beneficiaryService.form.fields.customService'),
                                                renderLabel: (label) => <span className="italic">{label}</span>,
                                            },
                                        ]}
                                    />

                                    {isCustomService && (
                                        <Input
                                            value={customServiceName}
                                            onChange={(e) => setCustomServiceName(e.target.value)}
                                            placeholder={t('beneficiaryService.form.fields.customServiceName')}
                                            className="mt-2"
                                        />
                                    )}
                                </div>
                            </div>
                            <div>
                                <Label htmlFor="priority">{t('beneficiaryService.form.fields.priority')}</Label>
                                <Select value={priority} onValueChange={(value: any) => setPriority(value)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder={t('beneficiaryService.form.fields.selectPriority')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="low">{t('beneficiaryService.form.low')}</SelectItem>
                                        <SelectItem value="medium">{t('beneficiaryService.form.medium')}</SelectItem>
                                        <SelectItem value="high">{t('beneficiaryService.form.high')}</SelectItem>
                                        <SelectItem value="urgent">{t('beneficiaryService.form.urgent')}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div>
                            <Label htmlFor="description">{t('beneficiaryService.form.fields.description')}</Label>
                            <Textarea
                                id="description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder={t('beneficiaryService.form.fields.descriptionPlaceholder')}
                                rows={3}
                            />
                        </div>
                        <div>
                            <Label htmlFor="notes">{t('beneficiaryService.form.fields.notes')}</Label>
                            <Textarea
                                id="notes"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder={t('beneficiaryService.form.fields.notesPlaceholder')}
                                rows={2}
                            />
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row gap-4">
                        <Button type="submit" disabled={isSubmitting} className="flex-1">
                            {isSubmitting ? t('beneficiaryService.form.submitting') : t('beneficiaryService.form.submit')}
                        </Button>
                        {onPrevious && (
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={onPrevious}
                                disabled={isSubmitting}
                                className="flex-1 sm:flex-none"
                            >
                                {t('common.previous')}
                            </Button>
                        )}
                        <Button type="button" variant="outline" onClick={onCancel} className="flex-1 sm:flex-none">
                            {t('common.cancel')}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}
