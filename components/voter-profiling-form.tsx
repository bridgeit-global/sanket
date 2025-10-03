'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/toast';
import type { Voter } from '@/lib/db/schema';

interface VoterProfilingFormProps {
    onVoterCreated: (voter: Voter) => void;
    onCancel: () => void;
    onMobileUpdateRequired?: (voter: Voter) => void;
}

export function VoterProfilingForm({ onVoterCreated, onCancel, onMobileUpdateRequired }: VoterProfilingFormProps) {
    const [formData, setFormData] = useState({
        epicNumber: '',
        fullName: '',
        relationType: '',
        relationName: '',
        familyGrouping: '',
        acNo: '',
        wardNo: '',
        partNo: '',
        srNo: '',
        houseNumber: '',
        religion: '',
        age: '',
        gender: '',
        mobileNoPrimary: '',
        mobileNoSecondary: '',
        boothName: '',
        englishBoothAddress: '',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleInputChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.epicNumber || !formData.fullName) {
            toast({
                type: 'error',
                description: 'EPIC Number and Full Name are required',
            });
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await fetch('/operator/api/create-voter', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ...formData,
                    age: formData.age ? Number.parseInt(formData.age, 10) : null,
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to create voter profile');
            }

            const data = await response.json();
            const createdVoter = data.voter;

            // Check if mobile number is missing and needs to be updated first
            if (!createdVoter.mobileNoPrimary && !createdVoter.mobileNoSecondary) {
                if (onMobileUpdateRequired) {
                    onMobileUpdateRequired(createdVoter);
                } else {
                    onVoterCreated(createdVoter);
                }
                toast({
                    type: 'success',
                    description: 'Voter profile created. Please update mobile number before creating service.',
                });
            } else {
                onVoterCreated(createdVoter);
                toast({
                    type: 'success',
                    description: 'Voter profile created successfully',
                });
            }
        } catch (error) {
            toast({
                type: 'error',
                description: 'Failed to create voter profile. Please try again.',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Create Voter Profile</CardTitle>
                <CardDescription>
                    Voter not found in database. Please provide details to create a new voter profile.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Basic Information */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold">Basic Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="epicNumber">EPIC Number *</Label>
                                <Input
                                    id="epicNumber"
                                    value={formData.epicNumber}
                                    onChange={(e) => handleInputChange('epicNumber', e.target.value)}
                                    placeholder="e.g., ABC1234567"
                                    required
                                />
                            </div>
                            <div>
                                <Label htmlFor="fullName">Full Name *</Label>
                                <Input
                                    id="fullName"
                                    value={formData.fullName}
                                    onChange={(e) => handleInputChange('fullName', e.target.value)}
                                    placeholder="Enter full name"
                                    required
                                />
                            </div>
                            <div>
                                <Label htmlFor="age">Age</Label>
                                <Input
                                    id="age"
                                    type="number"
                                    value={formData.age}
                                    onChange={(e) => handleInputChange('age', e.target.value)}
                                    placeholder="Enter age"
                                />
                            </div>
                            <div>
                                <Label htmlFor="gender">Gender</Label>
                                <Select value={formData.gender} onValueChange={(value) => handleInputChange('gender', value)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select gender" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="M">Male</SelectItem>
                                        <SelectItem value="F">Female</SelectItem>
                                        <SelectItem value="O">Other</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>

                    {/* Family Information */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold">Family Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="relationType">Relation Type</Label>
                                <Input
                                    id="relationType"
                                    value={formData.relationType}
                                    onChange={(e) => handleInputChange('relationType', e.target.value)}
                                    placeholder="e.g., Father, Mother, Spouse"
                                />
                            </div>
                            <div>
                                <Label htmlFor="relationName">Relation Name</Label>
                                <Input
                                    id="relationName"
                                    value={formData.relationName}
                                    onChange={(e) => handleInputChange('relationName', e.target.value)}
                                    placeholder="Name of the relation"
                                />
                            </div>
                            <div>
                                <Label htmlFor="familyGrouping">Family Grouping</Label>
                                <Input
                                    id="familyGrouping"
                                    value={formData.familyGrouping}
                                    onChange={(e) => handleInputChange('familyGrouping', e.target.value)}
                                    placeholder="Family grouping identifier"
                                />
                            </div>
                            <div>
                                <Label htmlFor="religion">Religion</Label>
                                <Input
                                    id="religion"
                                    value={formData.religion}
                                    onChange={(e) => handleInputChange('religion', e.target.value)}
                                    placeholder="Enter religion"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Address Information */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold">Address Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="acNo">AC Number</Label>
                                <Input
                                    id="acNo"
                                    value={formData.acNo}
                                    onChange={(e) => handleInputChange('acNo', e.target.value)}
                                    placeholder="Assembly Constituency number"
                                />
                            </div>
                            <div>
                                <Label htmlFor="wardNo">Ward Number</Label>
                                <Input
                                    id="wardNo"
                                    value={formData.wardNo}
                                    onChange={(e) => handleInputChange('wardNo', e.target.value)}
                                    placeholder="Ward number"
                                />
                            </div>
                            <div>
                                <Label htmlFor="partNo">Part Number</Label>
                                <Input
                                    id="partNo"
                                    value={formData.partNo}
                                    onChange={(e) => handleInputChange('partNo', e.target.value)}
                                    placeholder="Part number"
                                />
                            </div>
                            <div>
                                <Label htmlFor="srNo">Serial Number</Label>
                                <Input
                                    id="srNo"
                                    value={formData.srNo}
                                    onChange={(e) => handleInputChange('srNo', e.target.value)}
                                    placeholder="Serial number"
                                />
                            </div>
                            <div className="md:col-span-2">
                                <Label htmlFor="houseNumber">House Number</Label>
                                <Input
                                    id="houseNumber"
                                    value={formData.houseNumber}
                                    onChange={(e) => handleInputChange('houseNumber', e.target.value)}
                                    placeholder="House number/address"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Contact Information */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold">Contact Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="mobileNoPrimary">Primary Mobile Number</Label>
                                <Input
                                    id="mobileNoPrimary"
                                    type="tel"
                                    value={formData.mobileNoPrimary}
                                    onChange={(e) => handleInputChange('mobileNoPrimary', e.target.value)}
                                    placeholder="Primary mobile number"
                                />
                            </div>
                            <div>
                                <Label htmlFor="mobileNoSecondary">Secondary Mobile Number</Label>
                                <Input
                                    id="mobileNoSecondary"
                                    type="tel"
                                    value={formData.mobileNoSecondary}
                                    onChange={(e) => handleInputChange('mobileNoSecondary', e.target.value)}
                                    placeholder="Secondary mobile number"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Booth Information */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold">Booth Information</h3>
                        <div className="space-y-4">
                            <div>
                                <Label htmlFor="boothName">Booth Name</Label>
                                <Input
                                    id="boothName"
                                    value={formData.boothName}
                                    onChange={(e) => handleInputChange('boothName', e.target.value)}
                                    placeholder="Booth name"
                                />
                            </div>
                            <div>
                                <Label htmlFor="englishBoothAddress">Booth Address</Label>
                                <Textarea
                                    id="englishBoothAddress"
                                    value={formData.englishBoothAddress}
                                    onChange={(e) => handleInputChange('englishBoothAddress', e.target.value)}
                                    placeholder="Booth address in English"
                                    rows={3}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-4">
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? 'Creating Profile...' : 'Create Voter Profile'}
                        </Button>
                        <Button type="button" variant="outline" onClick={onCancel}>
                            Cancel
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}
