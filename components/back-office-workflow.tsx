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
import type { Voter } from '@/lib/db/schema';
import { PhoneUpdateForm } from '@/components/phone-update-form';

export function BackOfficeWorkflow() {
    const router = useRouter();
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<Voter[]>([]);
    const [selectedVoter, setSelectedVoter] = useState<Voter | null>(null);
    const [isSearching, setIsSearching] = useState(false);
    const [searchType, setSearchType] = useState<'voterId' | 'details'>('details');
    const [lastSearchType, setLastSearchType] = useState<'voterId' | 'details' | null>(null);
    const [hasSearched, setHasSearched] = useState(false);
    const [showPhoneUpdate, setShowPhoneUpdate] = useState(false);
    const [relatedVoters, setRelatedVoters] = useState<Voter[]>([]);
    const [showRelatedVoters, setShowRelatedVoters] = useState(false);

    // Detailed search parameters
    const [name, setName] = useState('');
    const [gender, setGender] = useState('');
    const [age, setAge] = useState<number>(25);
    const [ageRange, setAgeRange] = useState<number>(5);

    const handleSearchTypeChange = (newSearchType: 'voterId' | 'details') => {
        setSearchType(newSearchType);
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
        setShowPhoneUpdate(false);
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
                    description: 'Please enter a VoterId or name to search',
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

            if ((data.voters || []).length === 0) {
                const searchTypeText = (data.searchType || searchType) === 'voterId' ? 'VoterId' : 'details';
                toast({ type: 'error', description: `No voters found with that ${searchTypeText}` });
            } else {
                const searchTypeText = (data.searchType || searchType) === 'voterId' ? 'VoterId' : 'details';
                toast({ type: 'success', description: `Found ${data.voters.length} voter(s) by ${searchTypeText}` });
            }
        } catch (_error) {
            toast({ type: 'error', description: 'Failed to search voters. Please try again.' });
        } finally {
            setIsSearching(false);
        }
    };

    const handleSelectVoter = (voter: Voter) => {
        // Navigate to voter profile page
        router.push(`/modules/voter/${encodeURIComponent(voter.epicNumber)}`);
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
            toast({ type: 'success', description: 'Phone number updated successfully' });
        } catch (_error) {
            toast({ type: 'error', description: 'Failed to update phone number. Please try again.' });
        }
    };

    const handleUpdateRelatedVoter = async (epicNumber: string, phoneData: { mobileNoPrimary: string; mobileNoSecondary?: string }) => {
        try {
            const response = await fetch('/operator/api/update-voter-phone', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    epicNumber,
                    ...phoneData,
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to update phone number');
            }

            const updatedVoter = await response.json();

            // Update the voter in the relatedVoters array
            setRelatedVoters(prev => prev.map(v => v.epicNumber === epicNumber ? updatedVoter : v));

            toast({ type: 'success', description: 'Related voter phone number updated successfully' });
        } catch (_error) {
            toast({ type: 'error', description: 'Failed to update phone number. Please try again.' });
        }
    };

    const handleDoneWithRelatedVoters = () => {
        setShowRelatedVoters(false);
        setRelatedVoters([]);
        setShowPhoneUpdate(false);
        setSelectedVoter(null);
    };

    const handleCancel = () => {
        setShowPhoneUpdate(false);
        setShowRelatedVoters(false);
        setRelatedVoters([]);
        setSelectedVoter(null);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <SidebarToggle />
                    <div>
                        <h1 className="text-3xl font-bold">Back Office</h1>
                        <p className="text-muted-foreground mt-2">Manage voter profiles and export data</p>
                    </div>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Search a benificiary</CardTitle>
                    <CardDescription className="text-sm">by</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                                <input type="radio" id="details" name="searchType" value="details" checked={searchType === 'details'} onChange={(e) => handleSearchTypeChange(e.target.value as 'voterId' | 'details')} className="size-4" />
                                <Label htmlFor="details" className="text-sm font-medium cursor-pointer flex-1">Detailed Search</Label>
                            </div>
                            <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                                <input type="radio" id="voterId" name="searchType" value="voterId" checked={searchType === 'voterId'} onChange={(e) => handleSearchTypeChange(e.target.value as 'voterId' | 'details')} className="size-4" />
                                <Label htmlFor="voterId" className="text-sm font-medium cursor-pointer flex-1">Voter Id</Label>
                            </div>
                        </div>

                        {searchType === 'details' ? (
                            <div className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <Label htmlFor="name">Name (Optional)</Label>
                                        <Input
                                            id="name"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
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
                                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
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
                                    <Label htmlFor="search">VoterId (EPIC Number)</Label>
                                    <div className="relative">
                                        <Input id="search" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Enter VoterId (e.g., ABC1234567)..." type={'text'} onKeyDown={(e) => e.key === 'Enter' && handleSearch()} className="pr-10" />
                                        {searchTerm && (
                                            <button type="button" onClick={() => { setSearchTerm(''); setSearchResults([]); setLastSearchType(null); setHasSearched(false); setIsSearching(false); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors" aria-label="Clear search">
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M18 6 6 18" />
                                                    <path d="m6 6 12 12" />
                                                </svg>
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <Button onClick={handleSearch} disabled={isSearching} className="flex-1">{isSearching ? 'Searching...' : 'Search'}</Button>
                                    {searchTerm && (
                                        <Button variant="outline" onClick={() => { setSearchTerm(''); setSearchResults([]); setLastSearchType(null); setHasSearched(false); setIsSearching(false); }} className="px-4">Clear</Button>
                                    )}
                                </div>
                            </div>
                        )}

                        {searchResults.length > 0 && (
                            <div className="mt-4">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                                    <h3 className="text-lg font-semibold">Search Results</h3>
                                    {lastSearchType && (
                                        <span className="text-sm text-muted-foreground">Found by {lastSearchType === 'voterId' ? 'VoterId' : 'Name'}</span>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    {searchResults.map((voter) => (
                                        <button key={voter.epicNumber} type="button" className="w-full p-4 border rounded-lg hover:bg-muted cursor-pointer text-left transition-colors" onClick={() => handleSelectVoter(voter)}>
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
                                                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded w-fit">{voter.epicNumber}</span>
                                                    </div>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm mb-2">
                                                        <div className="flex items-center gap-1"><span className="font-medium text-muted-foreground">Age:</span><span>{voter.age || 'N/A'}</span></div>
                                                        <div className="flex items-center gap-1"><span className="font-medium text-muted-foreground">Gender:</span><span>{voter.gender || 'N/A'}</span></div>
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {voter.acNo && `AC: ${voter.acNo}`}
                                                        {voter.wardNo && ` | Ward: ${voter.wardNo}`}
                                                        {voter.boothName && ` | Booth: ${voter.boothName}`}
                                                    </div>
                                                </div>
                                                <div className="text-right ml-4">
                                                    <div className="text-sm">
                                                        <span className="font-medium text-muted-foreground">Primary:</span>
                                                        <p className="text-sm">{voter.mobileNoPrimary || 'Not set'}</p>
                                                    </div>
                                                    {voter.mobileNoSecondary && (
                                                        <div className="text-sm mt-1">
                                                            <span className="font-medium text-muted-foreground">Secondary:</span>
                                                            <p className="text-sm text-muted-foreground">{voter.mobileNoSecondary}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {isSearching && (
                            <div className="mt-4 p-6 border border-muted-foreground/25 rounded-lg bg-muted/10">
                                <div className="flex items-center justify-center gap-3">
                                    <div className="animate-spin rounded-full size-5 border-b-2 border-primary" />
                                    <p className="text-sm text-muted-foreground">Searching voters...</p>
                                </div>
                            </div>
                        )}

                        {hasSearched && !isSearching && searchResults.length === 0 && (
                            <div className="mt-4 p-4 border border-muted-foreground/25 rounded-lg bg-muted/20">
                                <div className="flex items-center gap-3">
                                    <div className="text-muted-foreground">
                                        <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground">No voter found with the provided search criteria.</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {showPhoneUpdate && selectedVoter && (
                            <div className="mt-6">
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    <div>
                                        <PhoneUpdateForm
                                            voter={selectedVoter}
                                            onPhoneUpdate={handlePhoneUpdate}
                                            onSkip={() => setShowPhoneUpdate(false)}
                                            onCancel={handleCancel}
                                        />
                                    </div>

                                    {showRelatedVoters && relatedVoters.length > 0 && (
                                        <div>
                                            <Card className="border-blue-200 bg-blue-50/50">
                                                <CardHeader>
                                                    <CardTitle className="text-lg">Related Family Members</CardTitle>
                                                    <CardDescription>
                                                        Found {relatedVoters.length} family member(s) that can be updated
                                                    </CardDescription>
                                                </CardHeader>
                                                <CardContent>
                                                    <div className="space-y-4 max-h-96 overflow-y-auto">
                                                        {relatedVoters.map((voter) => (
                                                            <RelatedVoterUpdateItem
                                                                key={voter.epicNumber}
                                                                voter={voter}
                                                                onUpdate={handleUpdateRelatedVoter}
                                                            />
                                                        ))}
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        </div>
                                    )}
                                </div>

                                {showRelatedVoters && relatedVoters.length > 0 && (
                                    <div className="mt-4 flex justify-end">
                                        <Button
                                            onClick={handleDoneWithRelatedVoters}
                                            variant="outline"
                                        >
                                            Done
                                        </Button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

interface RelatedVoterUpdateItemProps {
    voter: Voter;
    onUpdate: (epicNumber: string, phoneData: { mobileNoPrimary: string; mobileNoSecondary?: string }) => void;
}

function RelatedVoterUpdateItem({ voter, onUpdate }: RelatedVoterUpdateItemProps) {
    const [mobileNoPrimary, setMobileNoPrimary] = useState(voter.mobileNoPrimary || '');
    const [mobileNoSecondary, setMobileNoSecondary] = useState(voter.mobileNoSecondary || '');
    const [isUpdating, setIsUpdating] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!mobileNoPrimary.trim()) {
            return;
        }

        setIsUpdating(true);
        try {
            await onUpdate(voter.epicNumber, {
                mobileNoPrimary: mobileNoPrimary.trim(),
                mobileNoSecondary: mobileNoSecondary.trim() || undefined,
            });
            const trimmedPrimary = mobileNoPrimary.trim();
            const trimmedSecondary = mobileNoSecondary.trim();
            setMobileNoPrimary(trimmedPrimary);
            setMobileNoSecondary(trimmedSecondary);
        } finally {
            setIsUpdating(false);
        }
    };

    return (
        <Card className="border">
            <CardContent className="p-4">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <div className="font-medium">{voter.fullName}</div>
                        <div className="text-sm text-muted-foreground">EPIC: {voter.epicNumber}</div>
                        {voter.age && voter.gender && (
                            <div className="text-sm text-muted-foreground">
                                {voter.age} years, {voter.gender}
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor={`mobileNoPrimary-${voter.epicNumber}`} className="text-sm">
                                Primary Mobile
                            </Label>
                            <Input
                                id={`mobileNoPrimary-${voter.epicNumber}`}
                                type="tel"
                                value={mobileNoPrimary}
                                onChange={(e) => setMobileNoPrimary(e.target.value)}
                                placeholder="Enter primary mobile"
                                className="font-mono text-sm"
                            />
                        </div>
                        <div>
                            <Label htmlFor={`mobileNoSecondary-${voter.epicNumber}`} className="text-sm">
                                Secondary Mobile
                            </Label>
                            <Input
                                id={`mobileNoSecondary-${voter.epicNumber}`}
                                type="tel"
                                value={mobileNoSecondary}
                                onChange={(e) => setMobileNoSecondary(e.target.value)}
                                placeholder="Enter secondary mobile (optional)"
                                className="font-mono text-sm"
                            />
                        </div>
                    </div>

                    <Button
                        type="submit"
                        size="sm"
                        disabled={isUpdating || !mobileNoPrimary.trim()}
                        className="w-full"
                    >
                        {isUpdating ? 'Updating...' : 'Update Phone'}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}


