'use client';

import { useState } from 'react';
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

interface BeneficiaryServiceFormProps {
    voter: VoterWithPartNo;
    onServiceCreated: (serviceId: string) => void;
    onServiceDataReady?: (data: any) => void;
    onCancel: () => void;
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

export function BeneficiaryServiceForm({ voter, onServiceCreated, onServiceDataReady, onCancel }: BeneficiaryServiceFormProps) {
    const { t } = useTranslations();
    const serviceType = 'individual' as const;
    const [serviceName, setServiceName] = useState('');
    const [customServiceName, setCustomServiceName] = useState('');
    const [isCustomService, setIsCustomService] = useState(false);
    const [description, setDescription] = useState('');
    const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
    const [notes, setNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

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

        const serviceData = {
            serviceType,
            serviceName: finalServiceName,
            description,
            priority,
            notes,
        };

        // If onServiceDataReady is provided, use confirmation flow
        if (onServiceDataReady) {
            onServiceDataReady(serviceData);
            return;
        }

        // Otherwise, use direct creation flow
        setIsSubmitting(true);
        try {
            const response = await fetch('/operator/api/create-beneficiary-service', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ...serviceData,
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
                        <Button type="button" variant="outline" onClick={onCancel} className="flex-1 sm:flex-none">
                            {t('common.cancel')}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}
