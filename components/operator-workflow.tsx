'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SidebarToggle } from '@/components/sidebar-toggle';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { toast } from '@/components/toast';
import { VoterProfilingForm } from '@/components/voter-profiling-form';
import { BeneficiaryServiceForm } from '@/components/beneficiary-service-form';
import { PhoneUpdateForm } from '@/components/phone-update-form';
import { TaskManagement } from '@/components/task-management';
import type { Voter, BeneficiaryService } from '@/lib/db/schema';

export function OperatorWorkflow() {
    const router = useRouter();
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<Voter[]>([]);
    const [selectedVoter, setSelectedVoter] = useState<Voter | null>(null);
    const [isSearching, setIsSearching] = useState(false);
    const [searchType, setSearchType] = useState<'voterId' | 'phone' | 'details'>('details');
    const [lastSearchType, setLastSearchType] = useState<'voterId' | 'phone' | 'details' | null>(null);
    const [hasSearched, setHasSearched] = useState(false);

    // Detailed search parameters
    const [name, setName] = useState('');
    const [gender, setGender] = useState('');
    const [age, setAge] = useState<number>(25);
    const [ageRange, setAgeRange] = useState<number>(5);
    const [showVoterProfiling, setShowVoterProfiling] = useState(false);
    const [showBeneficiaryService, setShowBeneficiaryService] = useState(false);
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [showPhoneUpdate, setShowPhoneUpdate] = useState(false);
    const [serviceData, setServiceData] = useState<any>(null);
    const [createdService, setCreatedService] = useState<BeneficiaryService | null>(null);
    const [workflowStep, setWorkflowStep] = useState<'search' | 'profile' | 'phoneUpdate' | 'service' | 'confirmation' | 'completed' | 'tasks'>('search');
    const [activeTab, setActiveTab] = useState<'create' | 'manage'>('create');

    // Helper function to clear search state when switching tabs
    const clearSearchStateIfNeeded = () => {
        if (searchTerm || searchResults.length > 0 || hasSearched || isSearching) {
            setSearchTerm('');
            setSearchResults([]);
            setHasSearched(false);
            setIsSearching(false);
            setLastSearchType(null);
        }
    };

    // Handler for search type changes - clears input and voter data
    const handleSearchTypeChange = (newSearchType: 'voterId' | 'phone' | 'details') => {
        setSearchType(newSearchType);
        // Clear search input and any selected voter data
        setSearchTerm('');
        setName('');
        setGender('');
        setAge(25);
        setAgeRange(5);
        setSearchResults([]);
        setHasSearched(false);
        setIsSearching(false);
        setLastSearchType(null);
        setSelectedVoter(null);
    };

    const handleSearch = async () => {
        if (searchType === 'details') {
            if (!name.trim() && (!gender || gender === 'any') && age === undefined) {
                toast({
                    type: 'error',
                    description: 'Please provide at least one search criteria (name, gender, or age)',
                });
                return;
            }
        } else {
            if (!searchTerm.trim()) {
                toast({
                    type: 'error',
                    description: 'Please enter a VoterId, name, or phone number to search',
                });
                return;
            }
        }

        setIsSearching(true);
        setHasSearched(true);
        try {
            const response = await fetch('/operator/api/search-voter', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    searchTerm: searchTerm.trim(),
                    searchType: searchType,
                    name: searchType === 'details' ? name.trim() : undefined,
                    gender: searchType === 'details' ? (gender === 'any' ? undefined : gender) : undefined,
                    age: searchType === 'details' ? age : undefined,
                    ageRange: searchType === 'details' ? ageRange : undefined,
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to search voters');
            }

            const data = await response.json();
            setSearchResults(data.voters || []);
            setLastSearchType(data.searchType || searchType);

            if (data.voters.length === 0) {
                const searchTypeText = data.searchType === 'voterId' ? 'VoterId' :
                    data.searchType === 'phone' ? 'phone number' : 'details';
                toast({
                    type: 'error',
                    description: `No voters found with that ${searchTypeText}`,
                });
            } else {
                const searchTypeText = data.searchType === 'voterId' ? 'VoterId' :
                    data.searchType === 'phone' ? 'phone number' : 'details';
                toast({
                    type: 'success',
                    description: `Found ${data.voters.length} voter(s) by ${searchTypeText}`,
                });
            }
        } catch (error) {
            toast({
                type: 'error',
                description: 'Failed to search voters. Please try again.',
            });
        } finally {
            setIsSearching(false);
        }
    };

    const handleSelectVoter = (voter: Voter) => {
        setSelectedVoter(voter);
        setSearchResults([]);
        setSearchTerm('');

        // Check if primary phone number is missing
        if (!voter.mobileNoPrimary) {
            setShowPhoneUpdate(true);
            clearSearchStateIfNeeded();
            setWorkflowStep('phoneUpdate');
        } else {
            // Go directly to service creation for existing voters with phone number
            setShowBeneficiaryService(true);
            clearSearchStateIfNeeded();
            setWorkflowStep('service');
        }
    };

    const handleVoterCreated = (voter: Voter) => {
        setSelectedVoter(voter);
        setShowVoterProfiling(false);
        setShowBeneficiaryService(true);
        clearSearchStateIfNeeded();
        setWorkflowStep('service');
        toast({
            type: 'success',
            description: 'Voter profile created successfully',
        });
    };

    const handlePhoneUpdate = async (phoneData: { mobileNoPrimary: string; mobileNoSecondary?: string }) => {
        if (!selectedVoter) return;

        try {
            const response = await fetch('/operator/api/update-voter-phone', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    epicNumber: selectedVoter.epicNumber,
                    ...phoneData,
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to update phone number');
            }

            const updatedVoter = await response.json();
            setSelectedVoter(updatedVoter);
            setShowPhoneUpdate(false);
            setShowBeneficiaryService(true);
            setWorkflowStep('service');
            toast({
                type: 'success',
                description: 'Phone number updated successfully',
            });
        } catch (error) {
            console.error('Error updating phone number:', error);
            toast({
                type: 'error',
                description: 'Failed to update phone number. Please try again.',
            });
        }
    };

    const handleSkipPhoneUpdate = () => {
        setShowPhoneUpdate(false);
        setShowBeneficiaryService(true);
        setWorkflowStep('service');
    };

    const handleServiceDataReady = (data: any) => {
        setServiceData(data);
        setShowBeneficiaryService(false);
        setShowConfirmation(true);
        clearSearchStateIfNeeded();
        setWorkflowStep('confirmation');
    };

    const handleConfirmService = async () => {
        if (!serviceData || !selectedVoter) {
            toast({
                type: 'error',
                description: 'Service data is missing',
            });
            return;
        }

        try {
            const response = await fetch('/operator/api/create-beneficiary-service', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ...serviceData,
                    voterId: selectedVoter.epicNumber,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to create beneficiary service');
            }

            const result = await response.json();
            setCreatedService(result.service);
            setShowConfirmation(false);
            clearSearchStateIfNeeded();
            setWorkflowStep('completed');
            toast({
                type: 'success',
                description: 'Beneficiary service created successfully!',
            });
        } catch (error) {
            console.error('Error creating service:', error);
            toast({
                type: 'error',
                description: 'Failed to create beneficiary service. Please try again.',
            });
        }
    };

    const handleStartNew = () => {
        setSelectedVoter(null);
        setSearchResults([]);
        setSearchTerm('');
        setHasSearched(false);
        setIsSearching(false);
        setShowVoterProfiling(false);
        setShowBeneficiaryService(false);
        setShowConfirmation(false);
        setShowPhoneUpdate(false);
        setServiceData(null);
        setCreatedService(null);
        setWorkflowStep('search');
    };

    const handleCancel = () => {
        setShowVoterProfiling(false);
        setShowBeneficiaryService(false);
        setShowConfirmation(false);
        setShowPhoneUpdate(false);
        setServiceData(null);
        setWorkflowStep('search');
    };

    const handleCreateVoterProfile = () => {
        setShowVoterProfiling(true);
        clearSearchStateIfNeeded();
        setWorkflowStep('profile');
    };

    return (
        <div className="space-y-6">
            {/* Header with Sign Out */}
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <SidebarToggle />
                    <div>
                        <h1 className="text-3xl font-bold">Operator Dashboard</h1>
                        <p className="text-muted-foreground mt-2">
                            Voter management and beneficiary service creation
                        </p>
                    </div>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex space-x-1 bg-muted p-1 rounded-lg">
                <Button
                    variant={activeTab === 'create' ? 'default' : 'ghost'}
                    onClick={() => {
                        setActiveTab('create');
                        setWorkflowStep('search');
                    }}
                    className="flex-1 text-sm sm:text-base"
                >
                    <span className="hidden sm:inline">Create Service</span>
                    <span className="sm:hidden">Create</span>
                </Button>
                <Button
                    variant={activeTab === 'manage' ? 'default' : 'ghost'}
                    onClick={() => {
                        setActiveTab('manage');
                        setWorkflowStep('tasks');
                    }}
                    className="flex-1 text-sm sm:text-base"
                >
                    <span className="hidden sm:inline">Manage Tasks</span>
                    <span className="sm:hidden">Manage</span>
                </Button>
            </div>

            {/* Task Management Section */}
            {activeTab === 'manage' && (
                <TaskManagement />
            )}

            {/* Workflow Progress Indicator */}
            {activeTab === 'create' && workflowStep !== 'search' && (
                <Card>
                    <CardContent className="pt-6">
                        <div className="hidden sm:flex items-center space-x-4">
                            <div className={`flex items-center space-x-2 ${workflowStep === 'profile' ? 'text-blue-600' : workflowStep === 'phoneUpdate' || workflowStep === 'service' || workflowStep === 'confirmation' || workflowStep === 'completed' ? 'text-green-600' : 'text-gray-500'}`}>
                                <div className={`size-6 rounded-full flex items-center justify-center text-sm font-medium ${workflowStep === 'profile' ? 'bg-blue-100 text-blue-600' : workflowStep === 'phoneUpdate' || workflowStep === 'service' || workflowStep === 'confirmation' || workflowStep === 'completed' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                                    1
                                </div>
                                <span className="text-sm font-medium">Voter Profile</span>
                            </div>
                            <div className="flex-1 h-px bg-gray-200" />
                            <div className={`flex items-center space-x-2 ${workflowStep === 'phoneUpdate' ? 'text-blue-600' : workflowStep === 'service' || workflowStep === 'confirmation' || workflowStep === 'completed' ? 'text-green-600' : 'text-gray-500'}`}>
                                <div className={`size-6 rounded-full flex items-center justify-center text-sm font-medium ${workflowStep === 'phoneUpdate' ? 'bg-blue-100 text-blue-600' : workflowStep === 'service' || workflowStep === 'confirmation' || workflowStep === 'completed' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                                    2
                                </div>
                                <span className="text-sm font-medium">Phone Update</span>
                            </div>
                            <div className="flex-1 h-px bg-gray-200" />
                            <div className={`flex items-center space-x-2 ${workflowStep === 'service' ? 'text-blue-600' : workflowStep === 'confirmation' || workflowStep === 'completed' ? 'text-green-600' : 'text-gray-500'}`}>
                                <div className={`size-6 rounded-full flex items-center justify-center text-sm font-medium ${workflowStep === 'service' ? 'bg-blue-100 text-blue-600' : workflowStep === 'confirmation' || workflowStep === 'completed' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                                    3
                                </div>
                                <span className="text-sm font-medium">Service Details</span>
                            </div>
                            <div className="flex-1 h-px bg-gray-200" />
                            <div className={`flex items-center space-x-2 ${workflowStep === 'confirmation' ? 'text-blue-600' : workflowStep === 'completed' ? 'text-green-600' : 'text-gray-500'}`}>
                                <div className={`size-6 rounded-full flex items-center justify-center text-sm font-medium ${workflowStep === 'confirmation' ? 'bg-blue-100 text-blue-600' : workflowStep === 'completed' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                                    4
                                </div>
                                <span className="text-sm font-medium">Confirmation</span>
                            </div>
                            <div className="flex-1 h-px bg-gray-200" />
                            <div className={`flex items-center space-x-2 ${workflowStep === 'completed' ? 'text-green-600' : 'text-gray-500'}`}>
                                <div className={`size-6 rounded-full flex items-center justify-center text-sm font-medium ${workflowStep === 'completed' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                                    5
                                </div>
                                <span className="text-sm font-medium">Token Generated</span>
                            </div>
                        </div>

                        {/* Mobile Progress Indicator */}
                        <div className="sm:hidden space-y-2">
                            <div className="flex items-center justify-between text-xs">
                                <span>Step {workflowStep === 'profile' ? '1' : workflowStep === 'phoneUpdate' ? '2' : workflowStep === 'service' ? '3' : workflowStep === 'confirmation' ? '4' : '5'} of 5</span>
                                <span className="text-muted-foreground">
                                    {workflowStep === 'profile' ? 'Voter Profile' :
                                        workflowStep === 'phoneUpdate' ? 'Phone Update' :
                                            workflowStep === 'service' ? 'Service Details' :
                                                workflowStep === 'confirmation' ? 'Confirmation' : 'Token Generated'}
                                </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                    style={{
                                        width: `${workflowStep === 'profile' ? 20 :
                                            workflowStep === 'phoneUpdate' ? 40 :
                                                workflowStep === 'service' ? 60 :
                                                    workflowStep === 'confirmation' ? 80 : 100}%`
                                    }}
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Create Service Workflow */}
            {activeTab === 'create' && (
                <>
                    {/* Voter Profiling Form */}
                    {showVoterProfiling && (
                        <VoterProfilingForm
                            onVoterCreated={handleVoterCreated}
                            onCancel={handleCancel}
                        />
                    )}

                    {/* Phone Update Form */}
                    {showPhoneUpdate && selectedVoter && (
                        <PhoneUpdateForm
                            voter={selectedVoter}
                            onPhoneUpdate={handlePhoneUpdate}
                            onSkip={handleSkipPhoneUpdate}
                            onCancel={handleCancel}
                        />
                    )}

                    {/* Beneficiary Service Form */}
                    {showBeneficiaryService && selectedVoter && (
                        <BeneficiaryServiceForm
                            voter={selectedVoter}
                            onServiceCreated={() => { }} // Not used in confirmation flow
                            onServiceDataReady={handleServiceDataReady}
                            onCancel={handleCancel}
                        />
                    )}

                    {/* Confirmation Step */}
                    {showConfirmation && selectedVoter && serviceData && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Confirm Service Creation</CardTitle>
                                <CardDescription>
                                    Please review the service details before creating the beneficiary service
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {/* Voter Information */}
                                <div className="space-y-4">
                                    <h3 className="text-lg font-semibold">Voter Information</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                                        <div>
                                            <Label className="text-sm font-medium">Name</Label>
                                            <p>{selectedVoter.fullName}</p>
                                        </div>
                                        <div>
                                            <Label className="text-sm font-medium">EPIC Number</Label>
                                            <p>{selectedVoter.epicNumber}</p>
                                        </div>
                                        <div>
                                            <Label className="text-sm font-medium">Mobile Primary</Label>
                                            <p>{selectedVoter.mobileNoPrimary || 'Not set'}</p>
                                        </div>
                                        <div>
                                            <Label className="text-sm font-medium">Mobile Secondary</Label>
                                            <p>{selectedVoter.mobileNoSecondary || 'Not set'}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Service Information */}
                                <div className="space-y-4">
                                    <h3 className="text-lg font-semibold">Service Details</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                                        <div>
                                            <Label className="text-sm font-medium">Service Type</Label>
                                            <p className="capitalize">{serviceData.serviceType}</p>
                                        </div>
                                        <div>
                                            <Label className="text-sm font-medium">Service Name</Label>
                                            <p>{serviceData.serviceName}</p>
                                        </div>
                                        <div>
                                            <Label className="text-sm font-medium">Priority</Label>
                                            <p className="capitalize">{serviceData.priority || 'Medium'}</p>
                                        </div>
                                        {serviceData.description && (
                                            <div className="md:col-span-2">
                                                <Label className="text-sm font-medium">Description</Label>
                                                <p>{serviceData.description}</p>
                                            </div>
                                        )}
                                        {serviceData.notes && (
                                            <div className="md:col-span-2">
                                                <Label className="text-sm font-medium">Notes</Label>
                                                <p>{serviceData.notes}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex gap-4">
                                    <Button onClick={handleConfirmService} className="flex-1">
                                        Confirm & Create Service
                                    </Button>
                                    <Button variant="outline" onClick={handleCancel}>
                                        Cancel
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Completion Step */}
                    {workflowStep === 'completed' && createdService && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-green-600">Service Created Successfully!</CardTitle>
                                <CardDescription>
                                    Your beneficiary service has been created and a reference token has been generated
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {/* Token Display */}
                                <div className="text-center space-y-4">
                                    <div className="p-6 bg-green-50 border-2 border-green-200 rounded-lg">
                                        <Label className="text-sm font-medium text-green-800">Reference Token</Label>
                                        <p className="text-2xl font-bold text-green-900 mt-2">{createdService.token}</p>
                                        <p className="text-sm text-green-700 mt-2">
                                            Save this token for future reference and tracking
                                        </p>
                                    </div>
                                </div>

                                {/* Service Summary */}
                                <div className="space-y-4">
                                    <h3 className="text-lg font-semibold">Service Summary</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                                        <div>
                                            <Label className="text-sm font-medium">Service ID</Label>
                                            <p className="font-mono text-sm">{createdService.id}</p>
                                        </div>
                                        <div>
                                            <Label className="text-sm font-medium">Token</Label>
                                            <p className="font-mono text-sm">{createdService.token}</p>
                                        </div>
                                        <div>
                                            <Label className="text-sm font-medium">Service Type</Label>
                                            <p className="capitalize">{createdService.serviceType}</p>
                                        </div>
                                        <div>
                                            <Label className="text-sm font-medium">Service Name</Label>
                                            <p>{createdService.serviceName}</p>
                                        </div>
                                        <div>
                                            <Label className="text-sm font-medium">Status</Label>
                                            <p className="capitalize">{createdService.status}</p>
                                        </div>
                                        <div>
                                            <Label className="text-sm font-medium">Priority</Label>
                                            <p className="capitalize">{createdService.priority}</p>
                                        </div>
                                        <div>
                                            <Label className="text-sm font-medium">Created At</Label>
                                            <p>{new Date(createdService.createdAt).toLocaleString()}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex gap-4">
                                    <Button onClick={handleStartNew} className="flex-1">
                                        Create Another Service
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Search Section */}
                    {workflowStep === 'search' && (
                        <Card>
                            <CardHeader>
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                    <div>
                                        <CardTitle>Search Voter</CardTitle>
                                        <CardDescription className="text-sm">
                                            Search for voters by VoterId (EPIC Number), name, or phone number to create beneficiary services
                                        </CardDescription>
                                    </div>
                                    <Button
                                        variant="outline"
                                        onClick={handleCreateVoterProfile}
                                        className="shrink-0 w-full sm:w-auto"
                                    >
                                        Create Voter Profile
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {/* Search Type Selection */}
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                        <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                                            <input
                                                type="radio"
                                                id="details"
                                                name="searchType"
                                                value="details"
                                                checked={searchType === 'details'}
                                                onChange={(e) => handleSearchTypeChange(e.target.value as 'voterId' | 'phone' | 'details')}
                                                className="size-4"
                                            />
                                            <Label htmlFor="details" className="text-sm font-medium cursor-pointer flex-1">
                                                Detailed Search
                                            </Label>
                                        </div>
                                        <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                                            <input
                                                type="radio"
                                                id="phone"
                                                name="searchType"
                                                value="phone"
                                                checked={searchType === 'phone'}
                                                onChange={(e) => handleSearchTypeChange(e.target.value as 'voterId' | 'phone' | 'details')}
                                                className="size-4"
                                            />
                                            <Label htmlFor="phone" className="text-sm font-medium cursor-pointer flex-1">
                                                Phone Number
                                            </Label>
                                        </div>
                                        <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                                            <input
                                                type="radio"
                                                id="voterId"
                                                name="searchType"
                                                value="voterId"
                                                checked={searchType === 'voterId'}
                                                onChange={(e) => handleSearchTypeChange(e.target.value as 'voterId' | 'phone' | 'details')}
                                                className="size-4"
                                            />
                                            <Label htmlFor="voterId" className="text-sm font-medium cursor-pointer flex-1">
                                                VoterId (EPIC)
                                            </Label>
                                        </div>
                                    </div>

                                    {/* Search Input */}
                                    {searchType === 'details' ? (
                                        <div className="space-y-6">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <Label htmlFor="name">Name (Optional)</Label>
                                                    <Input
                                                        id="name"
                                                        value={name}
                                                        onChange={(e) => setName(e.target.value)}
                                                        placeholder="Enter voter name..."
                                                        type="text"
                                                    />
                                                </div>
                                                <div>
                                                    <Label htmlFor="gender">Gender (Optional)</Label>
                                                    <Select value={gender} onValueChange={setGender}>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select gender" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="any">Any Gender</SelectItem>
                                                            <SelectItem value="M">Male</SelectItem>
                                                            <SelectItem value="F">Female</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </div>

                                            <div className="space-y-4">
                                                <div>
                                                    <Label htmlFor="age">Age (years)</Label>
                                                    <Input
                                                        id="age"
                                                        type="number"
                                                        min={18}
                                                        max={100}
                                                        value={age}
                                                        onChange={(e) => setAge(Number.parseInt(e.target.value) || 25)}
                                                        placeholder="Enter age..."
                                                        className="w-full"
                                                    />
                                                </div>
                                                <div>
                                                    <Label htmlFor="ageRange">Age Range: ±{ageRange} years</Label>
                                                    <Slider
                                                        id="ageRange"
                                                        min={0}
                                                        max={20}
                                                        step={1}
                                                        value={[ageRange]}
                                                        onValueChange={(value: number[]) => setAgeRange(value[0])}
                                                        className="w-full"
                                                    />
                                                    <p className="text-sm text-muted-foreground mt-1">
                                                        Search range: {age - ageRange} to {age + ageRange} years
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex gap-2">
                                                <Button onClick={handleSearch} disabled={isSearching} className="flex-1">
                                                    {isSearching ? 'Searching...' : 'Search'}
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    onClick={() => {
                                                        setName('');
                                                        setGender('');
                                                        setAge(25);
                                                        setAgeRange(5);
                                                        setSearchResults([]);
                                                        setLastSearchType(null);
                                                        setHasSearched(false);
                                                        setIsSearching(false);
                                                    }}
                                                    className="px-4"
                                                >
                                                    Clear
                                                </Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            <div>
                                                <Label htmlFor="search">
                                                    {searchType === 'voterId' ? 'VoterId (EPIC Number)' : 'Phone Number'}
                                                </Label>
                                                <div className="relative">
                                                    <Input
                                                        id="search"
                                                        value={searchTerm}
                                                        onChange={(e) => setSearchTerm(e.target.value)}
                                                        placeholder={
                                                            searchType === 'voterId'
                                                                ? 'Enter VoterId (e.g., ABC1234567)...'
                                                                : 'Enter phone number (e.g., 9876543210)...'
                                                        }
                                                        type={searchType === 'phone' ? 'tel' : 'text'}
                                                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                                        className="pr-10"
                                                    />
                                                    {searchTerm && (
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setSearchTerm('');
                                                                setSearchResults([]);
                                                                setLastSearchType(null);
                                                                setHasSearched(false);
                                                                setIsSearching(false);
                                                            }}
                                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                                            aria-label="Clear search"
                                                        >
                                                            <svg
                                                                width="16"
                                                                height="16"
                                                                viewBox="0 0 24 24"
                                                                fill="none"
                                                                stroke="currentColor"
                                                                strokeWidth="2"
                                                                strokeLinecap="round"
                                                                strokeLinejoin="round"
                                                            >
                                                                <path d="M18 6 6 18" />
                                                                <path d="m6 6 12 12" />
                                                            </svg>
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <Button onClick={handleSearch} disabled={isSearching} className="flex-1">
                                                    {isSearching ? 'Searching...' : 'Search'}
                                                </Button>
                                                {searchTerm && (
                                                    <Button
                                                        variant="outline"
                                                        onClick={() => {
                                                            setSearchTerm('');
                                                            setSearchResults([]);
                                                            setLastSearchType(null);
                                                            setHasSearched(false);
                                                            setIsSearching(false);
                                                        }}
                                                        className="px-4"
                                                    >
                                                        Clear
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Search Results */}
                                {searchResults.length > 0 && (
                                    <div className="mt-4">
                                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                                            <h3 className="text-lg font-semibold">Search Results</h3>
                                            {lastSearchType && (
                                                <span className="text-sm text-muted-foreground">
                                                    Found by {lastSearchType === 'voterId' ? 'VoterId' :
                                                        lastSearchType === 'phone' ? 'Phone Number' : 'Details'}
                                                </span>
                                            )}
                                        </div>
                                        <div className="space-y-2 max-h-60 overflow-y-auto">
                                            {searchResults.map((voter) => (
                                                <button
                                                    key={voter.epicNumber}
                                                    type="button"
                                                    className="w-full p-4 border rounded-lg hover:bg-muted cursor-pointer text-left transition-colors"
                                                    onClick={() => router.push(`/modules/voter/${encodeURIComponent(voter.epicNumber)}`)}
                                                >
                                                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                                                        <div className="flex-1">
                                                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                                                                <div className="flex flex-col">
                                                                    <p className="font-medium text-lg">{voter.fullName}</p>
                                                                    {voter.relationName && voter.relationType && (
                                                                        <p className="text-sm text-muted-foreground">
                                                                            {voter.relationType}: {voter.relationName}
                                                                        </p>
                                                                    )}
                                                                </div>
                                                                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded w-fit">
                                                                    {voter.epicNumber}
                                                                </span>
                                                            </div>

                                                            {/* Key Details */}
                                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm mb-2">
                                                                <div className="flex items-center gap-1">
                                                                    <span className="font-medium text-muted-foreground">Age:</span>
                                                                    <span>{voter.age || 'N/A'}</span>
                                                                </div>
                                                                <div className="flex items-center gap-1">
                                                                    <span className="font-medium text-muted-foreground">Gender:</span>
                                                                    <span>{voter.gender || 'N/A'}</span>
                                                                </div>
                                                                <div className="flex items-center gap-1">
                                                                    <span className="font-medium text-muted-foreground">Part:</span>
                                                                    <span>{voter.partNo || 'N/A'}</span>
                                                                </div>
                                                            </div>

                                                            {/* Additional Info */}
                                                            <div className="text-xs text-muted-foreground">
                                                                {voter.acNo && `AC: ${voter.acNo}`}
                                                                {voter.wardNo && ` | Ward: ${voter.wardNo}`}
                                                                {voter.boothName && ` | Booth: ${voter.boothName}`}
                                                            </div>
                                                        </div>

                                                        {/* Mobile Numbers */}
                                                        <div className="text-right ml-4">
                                                            <div className="text-sm">
                                                                <span className="font-medium text-muted-foreground">Primary:</span>
                                                                <p className="text-sm">
                                                                    {voter.mobileNoPrimary || 'Not set'}
                                                                </p>
                                                            </div>
                                                            {voter.mobileNoSecondary && (
                                                                <div className="text-sm mt-1">
                                                                    <span className="font-medium text-muted-foreground">Secondary:</span>
                                                                    <p className="text-sm text-muted-foreground">
                                                                        {voter.mobileNoSecondary}
                                                                    </p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Loading State */}
                                {isSearching && (
                                    <div className="mt-4 p-6 border border-muted-foreground/25 rounded-lg bg-muted/10">
                                        <div className="flex items-center justify-center gap-3">
                                            <div className="animate-spin rounded-full size-5 border-b-2 border-primary" />
                                            <p className="text-sm text-muted-foreground">
                                                Searching voters...
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* No Results Message */}
                                {hasSearched && !isSearching && searchResults.length === 0 && (
                                    <div className="mt-4 p-4 border border-muted-foreground/25 rounded-lg bg-muted/20">
                                        <div className="flex items-center gap-3">
                                            <div className="text-muted-foreground">
                                                <svg
                                                    className="size-5"
                                                    fill="none"
                                                    viewBox="0 0 24 24"
                                                    stroke="currentColor"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={2}
                                                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                                    />
                                                </svg>
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-muted-foreground">
                                                    No voter found with the provided search criteria.
                                                </p>
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    Use the &quot;Create Voter Profile&quot; button above to add a new voter to the system.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}
                </>
            )}
        </div>
    );
}
