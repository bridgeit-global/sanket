'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/toast';
import { VoterProfilingForm } from '@/components/voter-profiling-form';
import { BeneficiaryServiceForm } from '@/components/beneficiary-service-form';
import { PhoneUpdateForm } from '@/components/phone-update-form';
import type { Voter, BeneficiaryService } from '@/lib/db/schema';

interface OperatorWorkflowProps {
    onSignOut: () => void;
}

export function OperatorWorkflow({ onSignOut }: OperatorWorkflowProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<Voter[]>([]);
    const [selectedVoter, setSelectedVoter] = useState<Voter | null>(null);
    const [isSearching, setIsSearching] = useState(false);
    const [searchType, setSearchType] = useState<'voterId' | 'name' | 'phone'>('phone');
    const [lastSearchType, setLastSearchType] = useState<'voterId' | 'name' | 'phone' | null>(null);
    const [hasSearched, setHasSearched] = useState(false);
    const [showVoterProfiling, setShowVoterProfiling] = useState(false);
    const [showBeneficiaryService, setShowBeneficiaryService] = useState(false);
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [showPhoneUpdate, setShowPhoneUpdate] = useState(false);
    const [serviceData, setServiceData] = useState<any>(null);
    const [createdService, setCreatedService] = useState<BeneficiaryService | null>(null);
    const [workflowStep, setWorkflowStep] = useState<'search' | 'profile' | 'phoneUpdate' | 'service' | 'confirmation' | 'completed'>('search');

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
    const handleSearchTypeChange = (newSearchType: 'voterId' | 'name' | 'phone') => {
        setSearchType(newSearchType);
        // Clear search input and any selected voter data
        setSearchTerm('');
        setSearchResults([]);
        setHasSearched(false);
        setIsSearching(false);
        setLastSearchType(null);
        setSelectedVoter(null);
    };

    const handleSearch = async () => {
        if (!searchTerm.trim()) {
            toast({
                type: 'error',
                description: 'Please enter a VoterId, name, or phone number to search',
            });
            return;
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
                    searchType: searchType
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
                    data.searchType === 'phone' ? 'phone number' : 'name';
                toast({
                    type: 'error',
                    description: `No voters found with that ${searchTypeText}`,
                });
            } else {
                const searchTypeText = data.searchType === 'voterId' ? 'VoterId' :
                    data.searchType === 'phone' ? 'phone number' : 'name';
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
                <div>
                    <h1 className="text-3xl font-bold">Operator Dashboard</h1>
                    <p className="text-muted-foreground mt-2">
                        Voter management and beneficiary service creation
                    </p>
                </div>
                <Button variant="outline" onClick={onSignOut}>
                    Sign Out
                </Button>
            </div>

            {/* Workflow Progress Indicator */}
            {workflowStep !== 'search' && (
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center space-x-4">
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
                    </CardContent>
                </Card>
            )}

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
                            <Button variant="outline" onClick={onSignOut}>
                                Sign Out
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Search Section */}
            {workflowStep === 'search' && (
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle>Search Voter</CardTitle>
                                <CardDescription>
                                    Search for voters by VoterId (EPIC Number), name, or phone number to create beneficiary services
                                </CardDescription>
                            </div>
                            <Button
                                variant="outline"
                                onClick={handleCreateVoterProfile}
                                className="shrink-0"
                            >
                                Create Voter Profile
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {/* Search Type Selection */}
                            <div className="flex gap-4 flex-wrap">
                                <div className="flex items-center space-x-2">
                                    <input
                                        type="radio"
                                        id="phone"
                                        name="searchType"
                                        value="phone"
                                        checked={searchType === 'phone'}
                                        onChange={(e) => handleSearchTypeChange(e.target.value as 'voterId' | 'name' | 'phone')}
                                        className="size-4"
                                    />
                                    <Label htmlFor="phone" className="text-sm font-medium">
                                        Phone Number
                                    </Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <input
                                        type="radio"
                                        id="voterId"
                                        name="searchType"
                                        value="voterId"
                                        checked={searchType === 'voterId'}
                                        onChange={(e) => handleSearchTypeChange(e.target.value as 'voterId' | 'name' | 'phone')}
                                        className="size-4"
                                    />
                                    <Label htmlFor="voterId" className="text-sm font-medium">
                                        VoterId (EPIC Number)
                                    </Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <input
                                        type="radio"
                                        id="name"
                                        name="searchType"
                                        value="name"
                                        checked={searchType === 'name'}
                                        onChange={(e) => handleSearchTypeChange(e.target.value as 'voterId' | 'name' | 'phone')}
                                        className="size-4"
                                    />
                                    <Label htmlFor="name" className="text-sm font-medium">
                                        Name
                                    </Label>
                                </div>
                            </div>

                            {/* Search Input */}
                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <Label htmlFor="search">
                                        {searchType === 'voterId' ? 'VoterId (EPIC Number)' :
                                            searchType === 'phone' ? 'Phone Number' : 'Voter Name'}
                                    </Label>
                                    <div className="relative">
                                        <Input
                                            id="search"
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            placeholder={
                                                searchType === 'voterId'
                                                    ? 'Enter VoterId (e.g., ABC1234567)...'
                                                    : searchType === 'phone'
                                                        ? 'Enter phone number (e.g., 9876543210)...'
                                                        : 'Enter voter name...'
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
                                <div className="flex items-end gap-2">
                                    <Button onClick={handleSearch} disabled={isSearching}>
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
                                        >
                                            Clear
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Search Results */}
                        {searchResults.length > 0 && (
                            <div className="mt-4">
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-lg font-semibold">Search Results</h3>
                                    {lastSearchType && (
                                        <span className="text-sm text-muted-foreground">
                                            Found by {lastSearchType === 'voterId' ? 'VoterId' :
                                                lastSearchType === 'phone' ? 'Phone Number' : 'Name'}
                                        </span>
                                    )}
                                </div>
                                <div className="space-y-2 max-h-60 overflow-y-auto">
                                    {searchResults.map((voter) => (
                                        <button
                                            key={voter.epicNumber}
                                            type="button"
                                            className="w-full p-4 border rounded-lg hover:bg-muted cursor-pointer text-left transition-colors"
                                            onClick={() => handleSelectVoter(voter)}
                                        >
                                            <div className="flex justify-between items-start">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <p className="font-medium text-lg">{voter.fullName}</p>
                                                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                                            {voter.epicNumber}
                                                        </span>
                                                    </div>

                                                    {/* Key Details */}
                                                    <div className="grid grid-cols-2 gap-2 text-sm mb-2">
                                                        <div className="flex items-center gap-1">
                                                            <span className="font-medium text-muted-foreground">Age:</span>
                                                            <span>{voter.age || 'N/A'}</span>
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                            <span className="font-medium text-muted-foreground">Gender:</span>
                                                            <span>{voter.gender || 'N/A'}</span>
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                            <span className="font-medium text-muted-foreground">Relation:</span>
                                                            <span>{voter.relationName || 'N/A'}</span>
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
        </div>
    );
}
