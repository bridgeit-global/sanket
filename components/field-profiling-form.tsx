'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, Save, User, Briefcase, MapPin, Heart, Star, Car } from 'lucide-react';
import { toast } from '@/components/toast';

interface Voter {
  epicNumber: string;
  fullName: string;
  relationType: string | null;
  relationName: string | null;
  familyGrouping: string | null;
  houseNumber: string | null;
  religion: string | null;
  caste: string | null;
  age: number | null;
  gender: string | null;
  address: string | null;
  srNo: string | null;
  isProfiled: boolean | null;
  education: string | null;
  occupationType: string | null;
  isOurSupporter: boolean | null;
  influencerType: string | null;
  vehicleType: string | null;
}

interface FieldProfilingFormProps {
  voter: Voter;
  onSave: (voter: Voter) => void;
  onCancel: () => void;
}

const EDUCATION_OPTIONS = [
  'Illiterate',
  'Primary (1-5)',
  'Middle (6-8)',
  'Secondary (9-10)',
  'Higher Secondary (11-12)',
  'Graduate',
  'Post Graduate',
  'Professional Degree',
  'Doctorate',
];

const OCCUPATION_TYPES = [
  { value: 'business', label: 'Business' },
  { value: 'service', label: 'Service' },
];

const SERVICE_TYPES = [
  'Government',
  'Private',
  'Self-employed',
  'Retired',
  'Student',
  'Homemaker',
  'Unemployed',
  'Agriculture',
  'Daily Wage',
];

const INFLUENCER_TYPES = [
  { value: 'political', label: 'Political' },
  { value: 'local', label: 'Local' },
  { value: 'education', label: 'Education' },
  { value: 'religious', label: 'Religious' },
];

const VEHICLE_TYPES = [
  { value: '2w', label: '2-Wheeler' },
  { value: '4w', label: '4-Wheeler' },
  { value: 'both', label: 'Both' },
];

export function FieldProfilingForm({ voter, onSave, onCancel }: FieldProfilingFormProps) {
  const [formData, setFormData] = useState({
    education: voter.education || '',
    occupationType: voter.occupationType || '',
    occupationDetail: '',
    region: '',
    isOurSupporter: voter.isOurSupporter || false,
    influencerType: voter.influencerType || '',
    vehicleType: voter.vehicleType || '',
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const response = await fetch('/api/field-visitor/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          epicNumber: voter.epicNumber,
          ...formData,
          influencerType: formData.influencerType || null,
          vehicleType: formData.vehicleType || null,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save profile');
      }

      toast({ type: 'success', description: 'Profile saved successfully' });
      onSave({ ...voter, isProfiled: true });
    } catch (error) {
      console.error('Error saving profile:', error);
      toast({ type: 'error', description: 'Failed to save profile' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Voter Info Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                {voter.fullName}
              </CardTitle>
              <CardDescription>
                EPIC: {voter.epicNumber} | Sr: {voter.srNo}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Age:</span>
              <span className="ml-2 font-medium">{voter.age || 'N/A'}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Gender:</span>
              <span className="ml-2 font-medium">
                {voter.gender === 'M' ? 'Male' : voter.gender === 'F' ? 'Female' : voter.gender || 'N/A'}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Religion:</span>
              <span className="ml-2 font-medium">{voter.religion || 'N/A'}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Caste:</span>
              <span className="ml-2 font-medium">{voter.caste || 'N/A'}</span>
            </div>
            {voter.houseNumber && (
              <div className="col-span-2">
                <span className="text-muted-foreground">House No:</span>
                <span className="ml-2 font-medium">{voter.houseNumber}</span>
              </div>
            )}
            {voter.familyGrouping && (
              <div className="col-span-2">
                <span className="text-muted-foreground">Family Group:</span>
                <span className="ml-2 font-medium">{voter.familyGrouping}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Education */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Briefcase className="h-4 w-4" />
            Education
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Select
            value={formData.education}
            onValueChange={(value) => setFormData({ ...formData, education: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select education level" />
            </SelectTrigger>
            <SelectContent>
              {EDUCATION_OPTIONS.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Occupation */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Briefcase className="h-4 w-4" />
            Occupation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Occupation Type</Label>
            <Select
              value={formData.occupationType}
              onValueChange={(value) => setFormData({ ...formData, occupationType: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {OCCUPATION_TYPES.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {formData.occupationType === 'service' && (
            <div>
              <Label>Service Type</Label>
              <Select
                value={formData.occupationDetail}
                onValueChange={(value) => setFormData({ ...formData, occupationDetail: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select service type" />
                </SelectTrigger>
                <SelectContent>
                  {SERVICE_TYPES.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {formData.occupationType === 'business' && (
            <div>
              <Label>Business Details</Label>
              <Input
                value={formData.occupationDetail}
                onChange={(e) => setFormData({ ...formData, occupationDetail: e.target.value })}
                placeholder="Type of business"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Region */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Region / Locality
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            value={formData.region}
            onChange={(e) => setFormData({ ...formData, region: e.target.value })}
            placeholder="Enter region or locality name"
          />
        </CardContent>
      </Card>

      {/* Supporter Status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Heart className="h-4 w-4" />
            Supporter Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="isOurSupporter"
              checked={formData.isOurSupporter}
              onCheckedChange={(checked) => 
                setFormData({ ...formData, isOurSupporter: checked === true })
              }
            />
            <Label htmlFor="isOurSupporter" className="cursor-pointer">
              Is our supporter
            </Label>
          </div>
        </CardContent>
      </Card>

      {/* Influencer Type */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Star className="h-4 w-4" />
            Influencer Type
          </CardTitle>
          <CardDescription>
            Is this person an influencer in any domain?
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select
            value={formData.influencerType}
            onValueChange={(value) => setFormData({ ...formData, influencerType: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select if applicable" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Not an influencer</SelectItem>
              {INFLUENCER_TYPES.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Vehicle */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Car className="h-4 w-4" />
            Vehicle Present
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Select
            value={formData.vehicleType}
            onValueChange={(value) => setFormData({ ...formData, vehicleType: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select if applicable" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">No vehicle</SelectItem>
              {VEHICLE_TYPES.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-4 sticky bottom-0 bg-background py-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
        <Button type="submit" disabled={saving} className="flex-1">
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save Profile'}
        </Button>
      </div>
    </form>
  );
}
