'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/toast';
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
    const [serviceType, setServiceType] = useState<'individual' | 'community'>('individual');
    const [serviceName, setServiceName] = useState('');
    const [customServiceName, setCustomServiceName] = useState('');
    const [isCustomService, setIsCustomService] = useState(false);
    const [description, setDescription] = useState('');
    const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
    const [notes, setNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Community service areas
    const [serviceAreas, setServiceAreas] = useState<ServiceArea[]>([
        { partNo: voter.partNo || '', wardNo: voter.wardNo || '', acNo: voter.acNo || '' }
    ]);

    const addServiceArea = () => {
        setServiceAreas([...serviceAreas, { partNo: '', wardNo: '', acNo: '' }]);
    };

    const removeServiceArea = (index: number) => {
        if (serviceAreas.length > 1) {
            setServiceAreas(serviceAreas.filter((_, i) => i !== index));
        }
    };

    const updateServiceArea = (index: number, field: keyof ServiceArea, value: string) => {
        const updated = [...serviceAreas];
        updated[index] = { ...updated[index], [field]: value };
        setServiceAreas(updated);
    };

    const handleServiceTypeChange = (newServiceType: 'individual' | 'community') => {
        setServiceType(newServiceType);
        setServiceName(''); // Reset service name when type changes
        setCustomServiceName('');
        setIsCustomService(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const finalServiceName = isCustomService ? customServiceName : serviceName;

        if (!finalServiceName.trim()) {
            toast({
                type: 'error',
                description: 'Service name is required',
            });
            return;
        }

        if (serviceType === 'community' && serviceAreas.some(area => !area.partNo && !area.wardNo && !area.acNo)) {
            toast({
                type: 'error',
                description: 'Please provide at least one area identifier (Part No, Ward No, or AC No) for community service',
            });
            return;
        }

        const serviceData = {
            serviceType,
            serviceName: finalServiceName,
            description,
            priority,
            notes,
            serviceAreas: serviceType === 'community' ? serviceAreas : undefined,
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
                description: 'Beneficiary service created successfully',
            });
        } catch (error) {
            toast({
                type: 'error',
                description: 'Failed to create beneficiary service. Please try again.',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Create Beneficiary Service</CardTitle>
                <CardDescription>
                    Create a service request for {voter.fullName} ({voter.epicNumber})
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Service Type */}
                    <div className="space-y-4">
                        <Label>Service Type *</Label>
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
                                    Individual Service
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
                                    Community Service
                                </Label>
                            </div>
                        </div>
                    </div>

                    {/* Service Details */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold">Service Details</h3>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="serviceName">Service Name *</Label>
                                <div className="space-y-2">
                                    <Select
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
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select a service" />
                                        </SelectTrigger>
                                        <SelectContent className="max-h-60">
                                            {(serviceType === 'individual' ? INDIVIDUAL_SERVICES : COMMUNITY_SERVICES).map((service) => (
                                                <SelectItem key={service} value={service}>
                                                    {service}
                                                </SelectItem>
                                            ))}
                                            <SelectItem value="custom">
                                                <span className="italic">+ Add Custom Service</span>
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>

                                    {isCustomService && (
                                        <Input
                                            value={customServiceName}
                                            onChange={(e) => setCustomServiceName(e.target.value)}
                                            placeholder="Enter custom service name"
                                            className="mt-2"
                                        />
                                    )}
                                </div>
                            </div>
                            <div>
                                <Label htmlFor="priority">Priority</Label>
                                <Select value={priority} onValueChange={(value: any) => setPriority(value)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select priority" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="low">Low</SelectItem>
                                        <SelectItem value="medium">Medium</SelectItem>
                                        <SelectItem value="high">High</SelectItem>
                                        <SelectItem value="urgent">Urgent</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div>
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                                id="description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Describe the service requirements"
                                rows={3}
                            />
                        </div>
                        <div>
                            <Label htmlFor="notes">Notes</Label>
                            <Textarea
                                id="notes"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Additional notes or comments"
                                rows={2}
                            />
                        </div>
                    </div>

                    {/* Community Service Areas */}
                    {serviceType === 'community' && (
                        <div className="space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                <h3 className="text-lg font-semibold">Service Areas</h3>
                                <Button type="button" variant="outline" size="sm" onClick={addServiceArea} className="w-full sm:w-auto">
                                    Add Area
                                </Button>
                            </div>
                            <div className="space-y-3">
                                {serviceAreas.map((area, index) => (
                                    <div key={`area-${index}-${area.partNo}-${area.wardNo}-${area.acNo}`} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 border rounded-lg">
                                        <div>
                                            <Label htmlFor={`partNo-${index}`}>Part No</Label>
                                            <Input
                                                id={`partNo-${index}`}
                                                value={area.partNo}
                                                onChange={(e) => updateServiceArea(index, 'partNo', e.target.value)}
                                                placeholder="Part number"
                                            />
                                        </div>
                                        <div>
                                            <Label htmlFor={`wardNo-${index}`}>Ward No</Label>
                                            <Input
                                                id={`wardNo-${index}`}
                                                value={area.wardNo}
                                                onChange={(e) => updateServiceArea(index, 'wardNo', e.target.value)}
                                                placeholder="Ward number"
                                            />
                                        </div>
                                        <div>
                                            <Label htmlFor={`acNo-${index}`}>AC No</Label>
                                            <Input
                                                id={`acNo-${index}`}
                                                value={area.acNo}
                                                onChange={(e) => updateServiceArea(index, 'acNo', e.target.value)}
                                                placeholder="AC number"
                                            />
                                        </div>
                                        <div className="flex items-end">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => removeServiceArea(index)}
                                                disabled={serviceAreas.length === 1}
                                                className="w-full sm:w-auto"
                                            >
                                                Remove
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row gap-4">
                        <Button type="submit" disabled={isSubmitting} className="flex-1">
                            {isSubmitting ? 'Creating Service...' : 'Create Service'}
                        </Button>
                        <Button type="button" variant="outline" onClick={onCancel} className="flex-1 sm:flex-none">
                            Cancel
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}
