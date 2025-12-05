'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/toast';
import { VoterProfilingForm } from '@/components/voter-profiling-form';
import { BeneficiaryServiceForm } from '@/components/beneficiary-service-form';
// API calls will be made directly in the component
import type { VoterWithPartNo } from '@/lib/db/schema';

export function VoterMobileUpdateInterface() {
    const router = useRouter();
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<VoterWithPartNo[]>([]);
    const [selectedVoter, setSelectedVoter] = useState<VoterWithPartNo | null>(null);
    const [mobileNoPrimary, setMobileNoPrimary] = useState('');
    const [mobileNoSecondary, setMobileNoSecondary] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    const [searchType, setSearchType] = useState<'voterId' | 'name' | 'phone'>('phone');
    const [lastSearchType, setLastSearchType] = useState<'voterId' | 'name' | 'phone' | null>(null);
    const [showVoterProfiling, setShowVoterProfiling] = useState(false);
    const [showBeneficiaryService, setShowBeneficiaryService] = useState(false);
    const [workflowStep, setWorkflowStep] = useState<'search' | 'profile' | 'mobile_update' | 'service' | 'update'>('search');

    const handleSearch = async () => {
        if (!searchTerm.trim()) {
            toast({
                type: 'error',
                description: 'Please enter a VoterId, name, or phone number to search',
            });
            return;
        }

        setIsSearching(true);
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
                // Show voter profiling form for unidentified voters
                setShowVoterProfiling(true);
                setWorkflowStep('profile');
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

    const handleSelectVoter = (voter: VoterWithPartNo) => {
        setSelectedVoter(voter);
        setMobileNoPrimary(voter.mobileNoPrimary || '');
        setMobileNoSecondary(voter.mobileNoSecondary || '');
        setSearchResults([]);
        setSearchTerm('');
        // Always go to mobile update step first, then service creation
        setWorkflowStep('mobile_update');
    };

    const handleUpdateMobile = async () => {
        if (!selectedVoter) {
            toast({
                type: 'error',
                description: 'Please select a voter first',
            });
            return;
        }

        setIsUpdating(true);
        try {
            const response = await fetch('/operator/api/update-mobile', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    epicNumber: selectedVoter.epicNumber,
                    mobileNoPrimary: mobileNoPrimary || undefined,
                    mobileNoSecondary: mobileNoSecondary || undefined,
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to update mobile numbers');
            }

            const data = await response.json();
            setSelectedVoter(data.voter);

            if (workflowStep === 'mobile_update') {
                // After mobile update in mobile_update step, proceed to service creation
                handleMobileUpdateCompleted();
            } else {
                toast({
                    type: 'success',
                    description: 'Mobile numbers updated successfully',
                });
            }
        } catch (error) {
            toast({
                type: 'error',
                description: 'Failed to update mobile numbers. Please try again.',
            });
        } finally {
            setIsUpdating(false);
        }
    };

    const handleClearSelection = () => {
        setSelectedVoter(null);
        setMobileNoPrimary('');
        setMobileNoSecondary('');
        setSearchResults([]);
        setSearchTerm('');
        setSearchType('phone');
        setLastSearchType(null);
        setShowVoterProfiling(false);
        setShowBeneficiaryService(false);
        setWorkflowStep('search');
    };

    const handleVoterCreated = (voter: VoterWithPartNo) => {
        setSelectedVoter(voter);
        setShowVoterProfiling(false);

        // Check if mobile number is missing and needs to be updated first
        if (!voter.mobileNoPrimary && !voter.mobileNoSecondary) {
            setMobileNoPrimary('');
            setMobileNoSecondary('');
            setWorkflowStep('mobile_update');
            toast({
                type: 'success',
                description: 'Please update mobile number before creating service.',
            });
        } else {
            setMobileNoPrimary(voter.mobileNoPrimary || '');
            setMobileNoSecondary(voter.mobileNoSecondary || '');
            setShowBeneficiaryService(true);
            setWorkflowStep('service');
        }
    };

    const handleMobileUpdateRequired = (voter: VoterWithPartNo) => {
        setSelectedVoter(voter);
        setShowVoterProfiling(false);
        setMobileNoPrimary('');
        setMobileNoSecondary('');
        setWorkflowStep('mobile_update');
    };

    const handleServiceCreated = (serviceId: string) => {
        setShowBeneficiaryService(false);
        setSelectedVoter(null);
        setMobileNoPrimary('');
        setMobileNoSecondary('');
        setSearchResults([]);
        setSearchTerm('');
        setWorkflowStep('search');
        toast({
            type: 'success',
            description: 'Service created successfully. You can now search for another voter.',
        });
    };

    const handleSkipService = () => {
        setShowBeneficiaryService(false);
        setSelectedVoter(null);
        setMobileNoPrimary('');
        setMobileNoSecondary('');
        setSearchResults([]);
        setSearchTerm('');
        setWorkflowStep('search');
        toast({
            type: 'success',
            description: 'Service creation skipped. You can now search for another voter.',
        });
    };

    const handleMobileUpdateCompleted = () => {
        // After mobile update, proceed to service creation
        setShowBeneficiaryService(true);
        setWorkflowStep('service');
        toast({
            type: 'success',
            description: 'Mobile number updated. You can now create a service.',
        });
    };


    return (
        <div className="space-y-6">
            {/* Workflow Progress Indicator */}
            {workflowStep !== 'search' && (
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center space-x-4">
                            <div className={`flex items-center space-x-2 ${workflowStep === 'profile' ? 'text-blue-600' : 'text-gray-500'}`}>
                                <div className={`size-6 rounded-full flex items-center justify-center text-sm font-medium ${workflowStep === 'profile' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
                                    1
                                </div>
                                <span className="text-sm font-medium">Voter Profiling</span>
                            </div>
                            <div className="flex-1 h-px bg-gray-200" />
                            <div className={`flex items-center space-x-2 ${workflowStep === 'mobile_update' ? 'text-blue-600' : 'text-gray-500'}`}>
                                <div className={`size-6 rounded-full flex items-center justify-center text-sm font-medium ${workflowStep === 'mobile_update' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
                                    2
                                </div>
                                <span className="text-sm font-medium">Mobile Update</span>
                            </div>
                            <div className="flex-1 h-px bg-gray-200" />
                            <div className={`flex items-center space-x-2 ${workflowStep === 'service' ? 'text-blue-600' : workflowStep === 'update' ? 'text-green-600' : 'text-gray-500'}`}>
                                <div className={`size-6 rounded-full flex items-center justify-center text-sm font-medium ${workflowStep === 'service' ? 'bg-blue-100 text-blue-600' : workflowStep === 'update' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                                    3
                                </div>
                                <span className="text-sm font-medium">Service Creation</span>
                            </div>
                            <div className="flex-1 h-px bg-gray-200" />
                            <div className={`flex items-center space-x-2 ${workflowStep === 'update' ? 'text-blue-600' : 'text-gray-500'}`}>
                                <div className={`size-6 rounded-full flex items-center justify-center text-sm font-medium ${workflowStep === 'update' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
                                    4
                                </div>
                                <span className="text-sm font-medium">Complete</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Voter Profiling Form */}
            {showVoterProfiling && (
                <VoterProfilingForm
                    onVoterCreated={handleVoterCreated}
                    onMobileUpdateRequired={handleMobileUpdateRequired}
                    onCancel={() => {
                        setShowVoterProfiling(false);
                        setWorkflowStep('search');
                    }}
                />
            )}

            {/* Beneficiary Service Form */}
            {showBeneficiaryService && selectedVoter && (
                <BeneficiaryServiceForm
                    voter={selectedVoter}
                    onServiceCreated={handleServiceCreated}
                    onCancel={handleSkipService}
                />
            )}

            {/* Search Section */}
            {workflowStep === 'search' && (
                <Card>
                    <CardHeader>
                        <CardTitle>Search Voter</CardTitle>
                        <CardDescription>
                            Search for voters by VoterId (EPIC Number), name, or phone number to update their mobile numbers
                        </CardDescription>
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
                                        onChange={(e) => setSearchType(e.target.value as 'voterId' | 'name' | 'phone')}
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
                                        onChange={(e) => setSearchType(e.target.value as 'voterId' | 'name' | 'phone')}
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
                                        onChange={(e) => setSearchType(e.target.value as 'voterId' | 'name' | 'phone')}
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
                                    />
                                </div>
                                <div className="flex items-end">
                                    <Button onClick={handleSearch} disabled={isSearching}>
                                        {isSearching ? 'Searching...' : 'Search'}
                                    </Button>
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
                                <div className="space-y-2">
                                    {searchResults.map((voter) => (
                                        <button
                                            key={voter.epicNumber}
                                            type="button"
                                            className="w-full p-4 border rounded-lg hover:bg-muted cursor-pointer text-left transition-colors"
                                            onClick={() => router.push(`/modules/voter/${encodeURIComponent(voter.epicNumber)}`)}
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
                    </CardContent>
                </Card>
            )}

            {/* Mobile Update Section */}
            {selectedVoter && (workflowStep === 'mobile_update' || workflowStep === 'update') && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                            {workflowStep === 'mobile_update' ? 'Update Mobile Numbers (Required)' : 'Update Mobile Numbers'}
                            <Button variant="outline" size="sm" onClick={handleClearSelection}>
                                Clear Selection
                            </Button>
                        </CardTitle>
                        <CardDescription>
                            {workflowStep === 'mobile_update'
                                ? `Please update mobile numbers for ${selectedVoter.fullName} before proceeding to service creation.`
                                : `Update mobile numbers for ${selectedVoter.fullName}`
                            }
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {/* Voter Info */}
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
                                    <Label className="text-sm font-medium">AC Number</Label>
                                    <p>{selectedVoter.acNo || 'N/A'}</p>
                                </div>
                                <div>
                                    <Label className="text-sm font-medium">Ward Number</Label>
                                    <p>{selectedVoter.wardNo || 'N/A'}</p>
                                </div>
                                <div>
                                    <Label className="text-sm font-medium">Age</Label>
                                    <p>{selectedVoter.age || 'N/A'}</p>
                                </div>
                                <div>
                                    <Label className="text-sm font-medium">Gender</Label>
                                    <p>{selectedVoter.gender || 'N/A'}</p>
                                </div>
                            </div>

                            {/* Mobile Number Fields */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="primary-mobile">Primary Mobile Number</Label>
                                    <Input
                                        id="primary-mobile"
                                        value={mobileNoPrimary}
                                        onChange={(e) => setMobileNoPrimary(e.target.value)}
                                        placeholder="Enter primary mobile number"
                                        type="tel"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="secondary-mobile">Secondary Mobile Number</Label>
                                    <Input
                                        id="secondary-mobile"
                                        value={mobileNoSecondary}
                                        onChange={(e) => setMobileNoSecondary(e.target.value)}
                                        placeholder="Enter secondary mobile number (optional)"
                                        type="tel"
                                    />
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-4">
                                <Button onClick={handleUpdateMobile} disabled={isUpdating}>
                                    {isUpdating ? 'Updating...' : 'Update Mobile Numbers'}
                                </Button>
                                {workflowStep === 'mobile_update' && (
                                    <Button
                                        variant="outline"
                                        onClick={handleMobileUpdateCompleted}
                                        disabled={!mobileNoPrimary && !mobileNoSecondary}
                                    >
                                        Proceed to Service Creation
                                    </Button>
                                )}
                                {workflowStep === 'mobile_update' && (
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            setShowBeneficiaryService(true);
                                            setWorkflowStep('service');
                                        }}
                                        disabled={!mobileNoPrimary && !mobileNoSecondary}
                                    >
                                        Skip Update & Go to Service
                                    </Button>
                                )}
                                <Button variant="outline" onClick={handleClearSelection}>
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
