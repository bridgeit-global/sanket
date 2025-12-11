'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Combobox } from '@/components/ui/combobox';
import { MultiCombobox } from '@/components/ui/multi-combobox';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/toast';
import { useTranslations } from '@/hooks/use-translations';
import type { VoterWithPartNo } from '@/lib/db/schema';

interface BeneficiaryServiceFormProps {
    voter: VoterWithPartNo;
    onServiceCreated: (serviceId: string) => void;
    onServiceDataReady?: (data: any) => void;
    onCancel: () => void;
}

interface ServiceArea {
    partNo: string;
    wardNo: string;
    acNo: string;
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

const COMMUNITY_SERVICES = [
    // Infrastructure Development
    'Drain Passage',
    'Open Shed',
    'Social Welfare Center',
    'Nursery Construction',
    'CC Road',
    'Toilets',
    'Retaining Wall',
    'Solar Street Light',
    'Solar Mini Mast',
    'Benches',
    'Dustbin',
    'Metro Finishing Road Work',
    'Road Safety',

    // Utilities
    'Water Issues',
    'Light Issues',

    // Community Services
    'Event Management',
    'Party Worker Coordination',
    'Documentation Camps',
    'Blood Donation Camp',
    'Blood Check Camp',
    'Ration Card Camps',

    // Electoral Services
    'Booth Committee',
    'Voter List Management'
];

export function BeneficiaryServiceForm({ voter, onServiceCreated, onServiceDataReady, onCancel }: BeneficiaryServiceFormProps) {
    const { t } = useTranslations();
    const [serviceType, setServiceType] = useState<'individual' | 'community'>('individual');
    const [serviceName, setServiceName] = useState('');
    const [customServiceName, setCustomServiceName] = useState('');
    const [isCustomService, setIsCustomService] = useState(false);
    const [description, setDescription] = useState('');
    const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
    const [notes, setNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Community service areas - MultiCombobox state
    const [selectedWards, setSelectedWards] = useState<string[]>([]);
    const [selectedParts, setSelectedParts] = useState<string[]>([]);
    const [acNumbers, setAcNumbers] = useState<string>('');
    const [wardNumbers, setWardNumbers] = useState<string[]>([]);
    const [partsByWard, setPartsByWard] = useState<Record<string, string[]>>({});
    const [allPartNumbers, setAllPartNumbers] = useState<string[]>([]);
    const [loadingWards, setLoadingWards] = useState(true);
    const [loadingParts, setLoadingParts] = useState(false);


    const handleServiceTypeChange = (newServiceType: 'individual' | 'community') => {
        setServiceType(newServiceType);
        setServiceName(''); // Reset service name when type changes
        setCustomServiceName('');
        setIsCustomService(false);
    };

    // Prepare ward and part options for MultiCombobox
    const wardOptions = useMemo(() => {
        return wardNumbers.map(wardNo => ({
            value: wardNo,
            label: `Ward ${wardNo}`,
            type: 'ward' as const,
            partCount: partsByWard[wardNo]?.length || 0,
        }));
    }, [wardNumbers, partsByWard]);

    const partOptions = useMemo(() => {
        return allPartNumbers.map(partNo => {
            const wardForPart = Object.keys(partsByWard).find(ward =>
                partsByWard[ward]?.includes(partNo)
            );
            return {
                value: partNo,
                label: `Part ${partNo}`,
                type: 'part' as const,
                wardForPart,
            };
        });
    }, [allPartNumbers, partsByWard]);

    const handleWardToggle = (wardValue: string, checked: boolean) => {
        if (checked) {
            setSelectedWards(prev => [...prev, wardValue]);
        } else {
            setSelectedWards(prev => prev.filter(w => w !== wardValue));
            // Remove parts that belong to this ward
            const wardParts = partsByWard[wardValue] || [];
            setSelectedParts(prev => prev.filter(p => !wardParts.includes(p)));
        }
    };

    const handlePartToggle = (partValue: string, checked: boolean) => {
        if (checked) {
            setSelectedParts(prev => [...prev, partValue]);
        } else {
            setSelectedParts(prev => prev.filter(p => p !== partValue));
        }
    };

    // Fetch all ward numbers
    useEffect(() => {
        const fetchWardNumbers = async () => {
            try {
                setLoadingWards(true);
                const response = await fetch('/api/voters/wards');
                if (response.ok) {
                    const data = await response.json();
                    if (data.success && data.data?.wardNumbers) {
                        setWardNumbers(data.data.wardNumbers);
                    }
                }
            } catch (error) {
                console.error('Error fetching ward numbers:', error);
            } finally {
                setLoadingWards(false);
            }
        };
        fetchWardNumbers();
    }, []);

    // Fetch all part numbers on mount
    useEffect(() => {
        const fetchAllParts = async () => {
            try {
                setLoadingParts(true);
                const response = await fetch('/api/voters/parts-by-wards');
                if (response.ok) {
                    const data = await response.json();
                    if (data.success && data.data) {
                        setPartsByWard(data.data.partsByWard || {});
                        setAllPartNumbers(data.data.allParts || []);
                    }
                }
            } catch (error) {
                console.error('Error fetching all part numbers:', error);
            } finally {
                setLoadingParts(false);
            }
        };
        fetchAllParts();
    }, []);

    // Initialize AC number from voter data when component mounts
    // Note: We don't auto-select wards/parts to allow user to choose manually
    useEffect(() => {
        if (voter.acNo) {
            setAcNumbers(voter.acNo);
        }
    }, [voter.acNo]);

    // Convert selected wards/parts to ServiceArea format
    const convertToServiceAreas = useCallback((): ServiceArea[] => {
        const areas: ServiceArea[] = [];
        const acNumbersArray = acNumbers.split(',').map(ac => ac.trim()).filter(ac => ac.length > 0);

        // Create areas from selected wards
        selectedWards.forEach(wardNo => {
            const wardParts = partsByWard[wardNo] || [];
            const selectedWardParts = selectedParts.filter(p => wardParts.includes(p));

            if (selectedWardParts.length > 0) {
                // Create an area for each selected part in this ward
                selectedWardParts.forEach(partNo => {
                    // If AC numbers are specified, create an area for each AC
                    if (acNumbersArray.length > 0) {
                        acNumbersArray.forEach(acNo => {
                            areas.push({ partNo, wardNo, acNo });
                        });
                    } else {
                        areas.push({ partNo, wardNo, acNo: '' });
                    }
                });
            } else {
                // Ward selected but no parts - create area with just ward
                if (acNumbersArray.length > 0) {
                    acNumbersArray.forEach(acNo => {
                        areas.push({ partNo: '', wardNo, acNo });
                    });
                } else {
                    areas.push({ partNo: '', wardNo, acNo: '' });
                }
            }
        });

        // Add areas for parts that don't belong to any selected ward
        selectedParts.forEach(partNo => {
            const belongsToSelectedWard = selectedWards.some(wardNo =>
                partsByWard[wardNo]?.includes(partNo)
            );

            if (!belongsToSelectedWard) {
                if (acNumbersArray.length > 0) {
                    acNumbersArray.forEach(acNo => {
                        areas.push({ partNo, wardNo: '', acNo });
                    });
                } else {
                    areas.push({ partNo, wardNo: '', acNo: '' });
                }
            }
        });

        return areas.length > 0 ? areas : [{ partNo: '', wardNo: '', acNo: '' }];
    }, [selectedWards, selectedParts, acNumbers, partsByWard]);

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

        // Convert selected wards/parts to service areas format
        const finalServiceAreas = serviceType === 'community' ? convertToServiceAreas() : undefined;

        if (serviceType === 'community') {
            // Check if at least one area has at least one identifier
            const hasValidArea = finalServiceAreas?.some(area =>
                area.partNo || area.wardNo || area.acNo
            );

            if (!hasValidArea) {
                toast({
                    type: 'error',
                    description: t('beneficiaryService.messages.areaIdentifierRequired'),
                });
                return;
            }
        }

        const serviceData = {
            serviceType,
            serviceName: finalServiceName,
            description,
            priority,
            notes,
            serviceAreas: finalServiceAreas,
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
                    {/* Service Type */}
                    <div className="space-y-4">
                        <Label>{t('beneficiaryService.form.fields.serviceType')}</Label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                                <input
                                    type="radio"
                                    id="individual"
                                    name="serviceType"
                                    value="individual"
                                    checked={serviceType === 'individual'}
                                    onChange={(e) => handleServiceTypeChange(e.target.value as 'individual' | 'community')}
                                    className="size-4"
                                />
                                <Label htmlFor="individual" className="text-sm font-medium cursor-pointer flex-1">
                                    {t('beneficiaryService.form.types.individual')}
                                </Label>
                            </div>
                            <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                                <input
                                    type="radio"
                                    id="community"
                                    name="serviceType"
                                    value="community"
                                    checked={serviceType === 'community'}
                                    onChange={(e) => handleServiceTypeChange(e.target.value as 'individual' | 'community')}
                                    className="size-4"
                                />
                                <Label htmlFor="community" className="text-sm font-medium cursor-pointer flex-1">
                                    {t('beneficiaryService.form.types.community')}
                                </Label>
                            </div>
                        </div>
                    </div>

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
                                            ...(serviceType === 'individual' ? INDIVIDUAL_SERVICES : COMMUNITY_SERVICES).map((service) => ({
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

                    {/* Community Service Areas */}
                    {serviceType === 'community' && (
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold">{t('beneficiaryService.form.serviceAreas.title')}</h3>

                            <div className="space-y-4">
                                <div>
                                    <Label htmlFor="wardPartNo" className="text-sm font-medium mb-2 block">
                                        Ward No / Part No
                                    </Label>
                                    <MultiCombobox
                                        wards={wardOptions}
                                        parts={partOptions}
                                        partsByWard={partsByWard}
                                        selectedWards={selectedWards}
                                        selectedParts={selectedParts}
                                        onWardToggle={handleWardToggle}
                                        onPartToggle={handlePartToggle}
                                        loading={loadingWards || loadingParts}
                                        placeholder="Select Ward No / Part No"
                                    />
                                    {(selectedWards.length > 0 || selectedParts.length > 0) && (
                                        <div className="flex flex-wrap gap-1 mt-2">
                                            {selectedWards.map((wardNo) => (
                                                <Badge key={wardNo} variant="default" className="text-xs">
                                                    Ward {wardNo}
                                                </Badge>
                                            ))}
                                            {selectedParts.map((partNo) => (
                                                <Badge key={partNo} variant="secondary" className="text-xs">
                                                    Part {partNo}
                                                </Badge>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <Label htmlFor="acNo">{t('beneficiaryService.form.serviceAreas.acNo')}</Label>
                                    <Input
                                        id="acNo"
                                        value={acNumbers}
                                        onChange={(e) => setAcNumbers(e.target.value)}
                                        placeholder={`${t('beneficiaryService.form.serviceAreas.acNoPlaceholder')} (comma-separated for multiple)`}
                                    />
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Enter AC numbers separated by commas if multiple
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

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
