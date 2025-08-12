'use client';

import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { DynamicTargetAudience } from './dynamic-target-audience';

interface AddBeneficiaryServiceFormProps {
    onSubmit: (data: BeneficiaryServiceFormData) => void;
    onCancel?: () => void;
    isLoading?: boolean;
}

export interface BeneficiaryServiceFormData {
    name: string;
    description?: string;
    type: 'one-to-one' | 'one-to-many';
    category: string;
    targetAudience?: string;
    expectedDuration?: string;
    requirements?: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
}

const serviceCategories = [
    { value: 'voter_registration', label: 'Voter Registration' },
    { value: 'aadhar_card', label: 'Aadhar Card' },
    { value: 'ration_card', label: 'Ration Card' },
    { value: 'government_schemes', label: 'Government Schemes' },
    { value: 'health_services', label: 'Health Services' },
    { value: 'education_services', label: 'Education Services' },
    { value: 'employment_services', label: 'Employment Services' },
    { value: 'public_works', label: 'Public Works' },
    { value: 'infrastructure', label: 'Infrastructure' },
    { value: 'fund_utilization', label: 'Fund Utilization' },
    { value: 'issue_visibility', label: 'Issue Visibility' },
    { value: 'community_development', label: 'Community Development' },
    { value: 'other', label: 'Other' },
];

const priorityLevels = [
    { value: 'low', label: 'Low', color: 'bg-gray-100 text-gray-800' },
    { value: 'medium', label: 'Medium', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'high', label: 'High', color: 'bg-orange-100 text-orange-800' },
    { value: 'urgent', label: 'Urgent', color: 'bg-red-100 text-red-800' },
];

export function AddBeneficiaryServiceForm({ onSubmit, onCancel, isLoading = false }: AddBeneficiaryServiceFormProps) {
    const [formData, setFormData] = useState<BeneficiaryServiceFormData>({
        name: '',
        description: '',
        type: 'one-to-one',
        category: '',
        targetAudience: '',
        expectedDuration: '',
        requirements: '',
        priority: 'medium',
    });

    const [errors, setErrors] = useState<Partial<BeneficiaryServiceFormData>>({});

    const validateForm = (): boolean => {
        const newErrors: Partial<BeneficiaryServiceFormData> = {};

        if (!formData.name.trim()) {
            newErrors.name = 'Service name is required';
        }

        if (!formData.category) {
            newErrors.category = 'Service category is required';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (validateForm()) {
            onSubmit(formData);
        }
    };

    const handleInputChange = (field: keyof BeneficiaryServiceFormData, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: undefined }));
        }
    };

    return (
        <Card className="w-full max-w-2xl mx-auto">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <span>Add Beneficiary Service</span>
                    <Badge variant="outline">
                        {formData.type === 'one-to-one' ? 'Individual Service' : 'Community Service'}
                    </Badge>
                </CardTitle>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Service Type Selection */}
                    <div className="space-y-2">
                        <Label htmlFor="type">Service Type *</Label>
                        <Select
                            value={formData.type}
                            onValueChange={(value) => handleInputChange('type', value as 'one-to-one' | 'one-to-many')}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select service type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="one-to-one">
                                    <div className="flex items-center gap-2">
                                        <span>One-to-One (Individual Voter Services)</span>
                                        <Badge variant="secondary" className="text-xs">Individual</Badge>
                                    </div>
                                </SelectItem>
                                <SelectItem value="one-to-many">
                                    <div className="flex items-center gap-2">
                                        <span>One-to-Many (Community/Public Works)</span>
                                        <Badge variant="secondary" className="text-xs">Community</Badge>
                                    </div>
                                </SelectItem>
                            </SelectContent>
                        </Select>
                        <p className="text-sm text-muted-foreground">
                            {formData.type === 'one-to-one'
                                ? 'Services for individual voters (voter registration, Aadhar card, etc.)'
                                : 'Services affecting multiple voters in a community (public works, infrastructure, etc.)'
                            }
                        </p>
                    </div>

                    {/* Service Name */}
                    <div className="space-y-2">
                        <Label htmlFor="name">Service Name *</Label>
                        <Input
                            id="name"
                            value={formData.name}
                            onChange={(e) => handleInputChange('name', e.target.value)}
                            placeholder="Enter service name (e.g., Voter Registration Assistance)"
                            className={errors.name ? 'border-red-500' : ''}
                        />
                        {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
                    </div>

                    {/* Service Category */}
                    <div className="space-y-2">
                        <Label htmlFor="category">Service Category *</Label>
                        <Select
                            value={formData.category}
                            onValueChange={(value) => handleInputChange('category', value)}
                        >
                            <SelectTrigger className={errors.category ? 'border-red-500' : ''}>
                                <SelectValue placeholder="Select service category" />
                            </SelectTrigger>
                            <SelectContent>
                                {serviceCategories.map((category) => (
                                    <SelectItem key={category.value} value={category.value}>
                                        {category.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {errors.category && <p className="text-sm text-red-500">{errors.category}</p>}
                    </div>

                    {/* Priority Level */}
                    <div className="space-y-2">
                        <Label htmlFor="priority">Priority Level</Label>
                        <Select
                            value={formData.priority}
                            onValueChange={(value) => handleInputChange('priority', value as 'low' | 'medium' | 'high' | 'urgent')}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select priority level" />
                            </SelectTrigger>
                            <SelectContent>
                                {priorityLevels.map((priority) => (
                                    <SelectItem key={priority.value} value={priority.value}>
                                        <div className="flex items-center gap-2">
                                            <span>{priority.label}</span>
                                            <Badge className={`text-xs ${priority.color}`}>
                                                {priority.label}
                                            </Badge>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Service Description */}
                    <div className="space-y-2">
                        <Label htmlFor="description">Service Description</Label>
                        <Textarea
                            id="description"
                            value={formData.description}
                            onChange={(e) => handleInputChange('description', e.target.value)}
                            placeholder="Provide a detailed description of the service..."
                            rows={3}
                        />
                    </div>

                    {/* Target Audience */}
                    <DynamicTargetAudience
                        serviceType={formData.type}
                        value={formData.targetAudience || ''}
                        onChange={(value) => handleInputChange('targetAudience', value)}
                        disabled={isLoading}
                    />

                    {/* Expected Duration */}
                    <div className="space-y-2">
                        <Label htmlFor="expectedDuration">Expected Duration</Label>
                        <Input
                            id="expectedDuration"
                            value={formData.expectedDuration}
                            onChange={(e) => handleInputChange('expectedDuration', e.target.value)}
                            placeholder="e.g., 2-3 weeks, 1 month, Ongoing"
                        />
                    </div>

                    {/* Requirements */}
                    <div className="space-y-2">
                        <Label htmlFor="requirements">Requirements/Documents Needed</Label>
                        <Textarea
                            id="requirements"
                            value={formData.requirements}
                            onChange={(e) => handleInputChange('requirements', e.target.value)}
                            placeholder="List any documents or requirements needed for this service..."
                            rows={2}
                        />
                    </div>

                    {/* Form Actions */}
                    <div className="flex gap-3 pt-4">
                        <Button
                            type="submit"
                            disabled={isLoading}
                            className="flex-1"
                        >
                            {isLoading ? 'Adding Service...' : 'Add Beneficiary Service'}
                        </Button>
                        {onCancel && (
                            <Button
                                type="button"
                                variant="outline"
                                onClick={onCancel}
                                disabled={isLoading}
                            >
                                Cancel
                            </Button>
                        )}
                    </div>

                    {/* Form Summary */}
                    <div className="p-4 bg-blue-50 rounded-lg">
                        <h4 className="font-semibold text-blue-800 mb-2">Form Summary</h4>
                        <div className="text-sm text-blue-700 space-y-1">
                            <p><strong>Service Type:</strong> {formData.type === 'one-to-one' ? 'Individual Voter Service' : 'Community Service'}</p>
                            {formData.name && <p><strong>Service Name:</strong> {formData.name}</p>}
                            {formData.category && <p><strong>Category:</strong> {serviceCategories.find(c => c.value === formData.category)?.label}</p>}
                            {formData.priority && <p><strong>Priority:</strong> {priorityLevels.find(p => p.value === formData.priority)?.label}</p>}
                            {formData.targetAudience && <p><strong>Target Audience:</strong> {formData.targetAudience}</p>}
                            {formData.expectedDuration && <p><strong>Expected Duration:</strong> {formData.expectedDuration}</p>}
                        </div>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
} 