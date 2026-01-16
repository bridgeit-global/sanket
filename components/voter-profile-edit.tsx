'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, User, Phone, MapPin, Calendar, FileText, Save, X } from 'lucide-react';
import type { VoterWithPartNo } from '@/lib/db/schema';
import { toast } from '@/components/toast';

interface VoterProfileEditProps {
  epicNumber: string;
}

export function VoterProfileEdit({ epicNumber }: VoterProfileEditProps) {
  const router = useRouter();
  const [voter, setVoter] = useState<VoterWithPartNo | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    fullName: '',
    age: '',
    gender: '',
    familyGrouping: '',
    religion: '',
    caste: '',
    mobileNumbers: Array.from({ length: 5 }, () => ''),
    houseNumber: '',
    address: '',
    pincode: '',
    relationType: '',
    relationName: '',
  });

  // Voting history state - map electionId to voting record
  interface VotingRecord {
    electionId: string;
    hasVoted: boolean;
    electionYear: number | null;
    electionType: string | null;
  }
  const [votingHistory, setVotingHistory] = useState<VotingRecord[]>([]);

  useEffect(() => {
    const fetchVoterProfile = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/voter/${encodeURIComponent(epicNumber)}`);

        if (!response.ok) {
          if (response.status === 404) {
            setError('Voter not found');
          } else {
            setError('Failed to load voter profile');
          }
          return;
        }

        const data = await response.json();
        if (data.success) {
          const voterData = data.voter;
          setVoter(voterData);
          const mobileNumbersFromTable = Array.isArray(data.voterMobileNumbers)
            ? [...data.voterMobileNumbers]
                .sort((a, b) => a.sortOrder - b.sortOrder)
                .map((mobile) => mobile.mobileNumber)
                .filter((number) => number && number.trim())
            : [];
          const fallbackNumbers = mobileNumbersFromTable.length > 0
            ? mobileNumbersFromTable
            : [voterData.mobileNoPrimary, voterData.mobileNoSecondary].filter(
                (number) => number && number.trim()
              ) as string[];
          const limitedFallbackNumbers = fallbackNumbers.slice(0, 5);
          const filledMobileNumbers = [
            ...limitedFallbackNumbers,
            ...Array.from(
              { length: Math.max(0, 5 - limitedFallbackNumbers.length) },
              () => ''
            ),
          ];

          setFormData({
            fullName: voterData.fullName || '',
            age: voterData.age?.toString() || '',
            gender: voterData.gender || '',
            familyGrouping: voterData.familyGrouping || '',
            religion: voterData.religion || '',
            caste: voterData.caste || '',
            mobileNumbers: filledMobileNumbers,
            houseNumber: voterData.houseNumber || '',
            address: voterData.address || '',
            pincode: voterData.pincode || '',
            relationType: voterData.relationType || '',
            relationName: voterData.relationName || '',
          });

          // Fetch voting history separately
          try {
            const votingResponse = await fetch(`/api/voting-participation/history/${encodeURIComponent(epicNumber)}`);
            if (votingResponse.ok) {
              const votingData = await votingResponse.json();
              if (votingData.success && Array.isArray(votingData.history)) {
                const votingRecords: VotingRecord[] = votingData.history.map((record: { 
                  electionId: string; 
                  hasVoted: boolean;
                  electionYear?: number | null;
                  electionType?: string | null;
                }) => ({
                  electionId: record.electionId,
                  hasVoted: record.hasVoted || false,
                  electionYear: record.electionYear || null,
                  electionType: record.electionType || null,
                }));
                setVotingHistory(votingRecords);
              }
            }
          } catch (votingErr) {
            console.error('Error fetching voting history:', votingErr);
            // Don't fail the whole form load if voting history fails
          }
        } else {
          setError('Failed to load voter profile');
        }
      } catch (err) {
        console.error('Error fetching voter profile:', err);
        setError('Failed to load voter profile');
      } finally {
        setLoading(false);
      }
    };

    fetchVoterProfile();
  }, [epicNumber]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.fullName.trim()) {
      toast({
        type: 'error',
        description: 'Full name is required',
      });
      return;
    }

    // Validate phone number format if provided
    const phoneRegex = /^[\d\s\-\(\)]{7,15}$/;
    const trimmedMobileNumbers = formData.mobileNumbers
      .map((number) => number.trim())
      .filter((number) => number.length > 0);
    const uniqueMobileNumbers = new Set<string>();

    for (const number of trimmedMobileNumbers) {
      if (!phoneRegex.test(number)) {
        toast({
          type: 'error',
          description: `Invalid mobile number format: ${number}`,
        });
        return;
      }
      if (uniqueMobileNumbers.has(number)) {
        toast({
          type: 'error',
          description: 'Duplicate mobile numbers are not allowed',
        });
        return;
      }
      uniqueMobileNumbers.add(number);
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/voter/${encodeURIComponent(epicNumber)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fullName: formData.fullName.trim(),
          age: formData.age ? Number.parseInt(formData.age, 10) : undefined,
          gender: formData.gender || undefined,
          familyGrouping: formData.familyGrouping.trim() || undefined,
          religion: formData.religion.trim() || undefined,
          caste: formData.caste.trim() || undefined,
          mobileNumbers: trimmedMobileNumbers,
          houseNumber: formData.houseNumber.trim() || undefined,
          address: formData.address.trim() || undefined,
          pincode: formData.pincode.trim() || undefined,
          relationType: formData.relationType.trim() || undefined,
          relationName: formData.relationName.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to update voter profile');
      }

      const data = await response.json();
      if (data.success) {
        // Update voting history for all elections
        const votingUpdates = votingHistory.map((record) =>
          fetch('/api/voting-participation/mark', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              epicNumber,
              electionId: record.electionId,
              hasVoted: record.hasVoted,
            }),
          })
        );

        // Wait for all voting updates to complete
        await Promise.all(votingUpdates).catch((err) => {
          console.error('Error updating voting history:', err);
          // Don't fail the whole operation if voting updates fail
        });

        toast({
          type: 'success',
          description: 'Voter profile updated successfully',
        });
        router.push(`/modules/voter/${encodeURIComponent(epicNumber)}`);
      } else {
        throw new Error(data.error || 'Failed to update voter profile');
      }
    } catch (err) {
      console.error('Error updating voter profile:', err);
      toast({
        type: 'error',
        description: err instanceof Error ? err.message : 'Failed to update voter profile',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    router.push(`/modules/voter/${encodeURIComponent(epicNumber)}`);
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Loading voter profile...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !voter) {
    return (
      <div className="container mx-auto p-6">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">{error || 'Voter not found'}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Button
        variant="ghost"
        onClick={handleCancel}
        className="mb-4"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back
      </Button>

      {/* Voter Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Edit Voter Profile
          </CardTitle>
          <CardDescription>Update voter information and details</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Editable Basic Information */}
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Basic Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">
                    Full Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="fullName"
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    placeholder="Enter full name"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">EPIC Number</label>
                  <p className="text-base font-medium">{voter.epicNumber}</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="age">Age</Label>
                  <Input
                    id="age"
                    type="text"
                    value={formData.age}
                    onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                    placeholder="Enter age"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gender">Gender</Label>
                  <Select
                    value={formData.gender}
                    onValueChange={(value) => setFormData({ ...formData, gender: value })}
                  >
                    <SelectTrigger id="gender">
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="M">Male</SelectItem>
                      <SelectItem value="F">Female</SelectItem>
                      <SelectItem value="O">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="familyGrouping">Family Grouping</Label>
                  <Input
                    id="familyGrouping"
                    type="text"
                    value={formData.familyGrouping}
                    onChange={(e) => setFormData({ ...formData, familyGrouping: e.target.value })}
                    placeholder="Enter family grouping"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="religion">Religion</Label>
                  <Input
                    id="religion"
                    type="text"
                    value={formData.religion}
                    onChange={(e) => setFormData({ ...formData, religion: e.target.value })}
                    placeholder="Enter religion"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="caste">Caste</Label>
                  <Input
                    id="caste"
                    type="text"
                    value={formData.caste}
                    onChange={(e) => setFormData({ ...formData, caste: e.target.value })}
                    placeholder="Enter caste"
                  />
                </div>
              </div>
            </div>

            {/* Editable Contact Information */}
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Contact Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {formData.mobileNumbers.map((mobileNumber, index) => (
                  <div className="space-y-2" key={`mobile-number-${index}`}>
                    <Label htmlFor={`mobile-number-${index}`}>
                      {index === 0 ? 'Primary Mobile' : index === 1 ? 'Secondary Mobile' : `Mobile ${index + 1}`}
                    </Label>
                    <Input
                      id={`mobile-number-${index}`}
                      type="tel"
                      value={mobileNumber}
                      onChange={(e) => {
                        const updatedMobileNumbers = [...formData.mobileNumbers];
                        updatedMobileNumbers[index] = e.target.value;
                        setFormData({ ...formData, mobileNumbers: updatedMobileNumbers });
                      }}
                      placeholder="Enter mobile number"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Editable Relation Information */}
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Relation Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="relationType">Relation Type</Label>
                  <Input
                    id="relationType"
                    type="text"
                    value={formData.relationType}
                    onChange={(e) => setFormData({ ...formData, relationType: e.target.value })}
                    placeholder="e.g., HSBN, WIFE, SON"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="relationName">Relation Name</Label>
                  <Input
                    id="relationName"
                    type="text"
                    value={formData.relationName}
                    onChange={(e) => setFormData({ ...formData, relationName: e.target.value })}
                    placeholder="Enter relation name"
                  />
                </div>
              </div>
            </div>

            {/* Editable Location Information */}
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Location Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="houseNumber">House Number</Label>
                  <Input
                    id="houseNumber"
                    type="text"
                    value={formData.houseNumber}
                    onChange={(e) => setFormData({ ...formData, houseNumber: e.target.value })}
                    placeholder="Enter house number"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pincode">Pincode</Label>
                  <Input
                    id="pincode"
                    type="text"
                    value={formData.pincode}
                    onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                    placeholder="Enter pincode"
                    maxLength={10}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Enter address"
                  />
                </div>
                {voter.acNo && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">AC Number</label>
                    <p className="text-base">{voter.acNo}</p>
                  </div>
                )}
                {voter.wardNo && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Ward Number</label>
                    <p className="text-base">{voter.wardNo}</p>
                  </div>
                )}
                {voter.partNo && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Part Number</label>
                    <p className="text-base">{voter.partNo}</p>
                  </div>
                )}
                {voter.srNo && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Serial Number</label>
                    <p className="text-base">{voter.srNo}</p>
                  </div>
                )}
                {voter.boothName && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Booth Name</label>
                    <p className="text-base">{voter.boothName}</p>
                  </div>
                )}
                {voter.englishBoothAddress && (
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium text-muted-foreground">Booth Address</label>
                    <p className="text-base">{voter.englishBoothAddress}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Voting Information */}
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Voting Information
              </h3>
              {votingHistory.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {votingHistory.map((record) => {
                    const electionLabel = record.electionType && record.electionYear
                      ? `${record.electionType} Election ${record.electionYear}`
                      : record.electionId.includes('2024') 
                        ? `Voted in 2024`
                        : `Voted in ${record.electionId}`;
                    return (
                      <div className="space-y-2" key={record.electionId}>
                        <Label htmlFor={`voted-${record.electionId}`}>
                          {electionLabel}
                        </Label>
                        <Select
                          value={record.hasVoted ? 'yes' : 'no'}
                          onValueChange={(value) => {
                            const newVotingHistory = votingHistory.map((r) =>
                              r.electionId === record.electionId
                                ? { ...r, hasVoted: value === 'yes' }
                                : r
                            );
                            setVotingHistory(newVotingHistory);
                          }}
                        >
                          <SelectTrigger id={`voted-${record.electionId}`}>
                            <SelectValue placeholder="Select voting status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="yes">Yes</SelectItem>
                            <SelectItem value="no">No</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">No voting history available</div>
              )}
            </div>

            {/* Form Actions */}
            <div className="flex items-center justify-end gap-4 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={saving}
              >
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saving}
              >
                <Save className="mr-2 h-4 w-4" />
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

