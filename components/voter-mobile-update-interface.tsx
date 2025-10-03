'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/toast';
// API calls will be made directly in the component
import type { Voter } from '@/lib/db/schema';

export function VoterMobileUpdateInterface() {
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<Voter[]>([]);
    const [selectedVoter, setSelectedVoter] = useState<Voter | null>(null);
    const [mobileNoPrimary, setMobileNoPrimary] = useState('');
    const [mobileNoSecondary, setMobileNoSecondary] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    const [searchType, setSearchType] = useState<'voterId' | 'name'>('voterId');
    const [lastSearchType, setLastSearchType] = useState<'voterId' | 'name' | null>(null);

    const handleSearch = async () => {
        if (!searchTerm.trim()) {
            toast({
                type: 'error',
                description: 'Please enter a VoterId or name to search',
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
                const searchTypeText = data.searchType === 'voterId' ? 'VoterId' : 'name';
                toast({
                    type: 'error',
                    description: `No voters found with that ${searchTypeText}`,
                });
            } else {
                const searchTypeText = data.searchType === 'voterId' ? 'VoterId' : 'name';
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
        setMobileNoPrimary(voter.mobileNoPrimary || '');
        setMobileNoSecondary(voter.mobileNoSecondary || '');
        setSearchResults([]);
        setSearchTerm('');
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
            toast({
                type: 'success',
                description: 'Mobile numbers updated successfully',
            });
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
        setSearchType('voterId');
        setLastSearchType(null);
    };

    return (
        <div className="space-y-6">
            {/* Search Section */}
            <Card>
                <CardHeader>
                    <CardTitle>Search Voter</CardTitle>
                    <CardDescription>
                        Search for voters by VoterId (EPIC Number) or name to update their mobile numbers
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {/* Search Type Selection */}
                        <div className="flex gap-4">
                            <div className="flex items-center space-x-2">
                                <input
                                    type="radio"
                                    id="voterId"
                                    name="searchType"
                                    value="voterId"
                                    checked={searchType === 'voterId'}
                                    onChange={(e) => setSearchType(e.target.value as 'voterId' | 'name')}
                                    className="h-4 w-4"
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
                                    onChange={(e) => setSearchType(e.target.value as 'voterId' | 'name')}
                                    className="h-4 w-4"
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
                                    {searchType === 'voterId' ? 'VoterId (EPIC Number)' : 'Voter Name'}
                                </Label>
                                <Input
                                    id="search"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder={
                                        searchType === 'voterId'
                                            ? 'Enter VoterId (e.g., ABC1234567)...'
                                            : 'Enter voter name...'
                                    }
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
                                        Found by {lastSearchType === 'voterId' ? 'VoterId' : 'Name'}
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
                </CardContent>
            </Card>

            {/* Update Section */}
            {selectedVoter && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                            Update Mobile Numbers
                            <Button variant="outline" size="sm" onClick={handleClearSelection}>
                                Clear Selection
                            </Button>
                        </CardTitle>
                        <CardDescription>
                            Update mobile numbers for {selectedVoter.fullName}
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
