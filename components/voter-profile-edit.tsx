'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, User, Phone, MapPin, Calendar, FileText, Save, X } from 'lucide-react';
import type { Voter } from '@/lib/db/schema';
import { toast } from '@/components/toast';

interface VoterProfileEditProps {
  epicNumber: string;
}

export function VoterProfileEdit({ epicNumber }: VoterProfileEditProps) {
  const router = useRouter();
  const [voter, setVoter] = useState<Voter | null>(null);
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
    mobileNoPrimary: '',
    mobileNoSecondary: '',
    houseNumber: '',
    relationType: '',
    relationName: '',
    isVoted2024: false,
  });

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
          setFormData({
            fullName: voterData.fullName || '',
            age: voterData.age?.toString() || '',
            gender: voterData.gender || '',
            familyGrouping: voterData.familyGrouping || '',
            religion: voterData.religion || '',
            mobileNoPrimary: voterData.mobileNoPrimary || '',
            mobileNoSecondary: voterData.mobileNoSecondary || '',
            houseNumber: voterData.houseNumber || '',
            relationType: voterData.relationType || '',
            relationName: voterData.relationName || '',
            isVoted2024: voterData.isVoted2024 || false,
          });
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
    if (formData.mobileNoPrimary && !phoneRegex.test(formData.mobileNoPrimary.trim())) {
      toast({
        type: 'error',
        description: 'Invalid primary mobile number format',
      });
      return;
    }

    if (formData.mobileNoSecondary && !phoneRegex.test(formData.mobileNoSecondary.trim())) {
      toast({
        type: 'error',
        description: 'Invalid secondary mobile number format',
      });
      return;
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
          mobileNoPrimary: formData.mobileNoPrimary.trim() || undefined,
          mobileNoSecondary: formData.mobileNoSecondary.trim() || undefined,
          houseNumber: formData.houseNumber.trim() || undefined,
          relationType: formData.relationType.trim() || undefined,
          relationName: formData.relationName.trim() || undefined,
          isVoted2024: formData.isVoted2024,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to update voter profile');
      }

      const data = await response.json();
      if (data.success) {
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
              </div>
            </div>

            {/* Editable Contact Information */}
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Contact Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="mobileNoPrimary">
                    Primary Mobile <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="mobileNoPrimary"
                    type="tel"
                    value={formData.mobileNoPrimary}
                    onChange={(e) => setFormData({ ...formData, mobileNoPrimary: e.target.value })}
                    placeholder="Enter primary mobile number"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mobileNoSecondary">Secondary Mobile</Label>
                  <Input
                    id="mobileNoSecondary"
                    type="tel"
                    value={formData.mobileNoSecondary}
                    onChange={(e) => setFormData({ ...formData, mobileNoSecondary: e.target.value })}
                    placeholder="Enter secondary mobile number"
                  />
                </div>
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="isVoted2024">Voted in 2024</Label>
                  <Select
                    value={formData.isVoted2024 ? 'yes' : 'no'}
                    onValueChange={(value) => setFormData({ ...formData, isVoted2024: value === 'yes' })}
                  >
                    <SelectTrigger id="isVoted2024">
                      <SelectValue placeholder="Select voting status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yes">Yes</SelectItem>
                      <SelectItem value="no">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
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

