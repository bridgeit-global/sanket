'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Save, User, Briefcase, MapPin, Heart, Star, Car, Users, MessageSquare, CheckCircle2, Clock } from 'lucide-react';
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
  occupationDetail?: string | null;
  region?: string | null;
  profileReligion?: string | null;
  profileCaste?: string | null;
  isOurSupporter: boolean | null;
  feedback?: string | null;
  influencerType: string | null;
  vehicleType: string | null;
  profiledAt: string | null;
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

const REGION_OPTIONS = [
  'Maharashtra',
  'North Indian',
  'Bengal',
  'Rajasthan',
  'Gujarat',
  'SI',
];

const RELIGION_OPTIONS = [
  'Hindu',
  'Muslim',
  'Christian',
  'Buddhist',
  'Jain',
  'Sikh',
  'Other',
];

const CASTE_OPTIONS = [
  'General',
  'OBC',
  'SC',
  'ST',
  'NT',
  'VJ',
  'Other',
];

export function FieldProfilingForm({ voter, onSave, onCancel }: FieldProfilingFormProps) {
  const isAlreadyProfiled = voter.isProfiled === true;
  
  const [formData, setFormData] = useState({
    education: voter.education || '',
    occupationType: voter.occupationType || '',
    occupationDetail: voter.occupationDetail || '',
    region: voter.region || '',
    religion: voter.profileReligion || voter.religion || '',
    caste: voter.profileCaste || voter.caste || '',
    isOurSupporter: voter.isOurSupporter || false,
    feedback: voter.feedback || '',
    influencerType: voter.influencerType || '',
    vehicleType: voter.vehicleType || '',
  });
  const [saving, setSaving] = useState(false);
  const [showRelatedVotersPrompt, setShowRelatedVotersPrompt] = useState(false);
  const [relatedVoters, setRelatedVoters] = useState<Voter[]>([]);

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

      toast({ 
        type: 'success', 
        description: isAlreadyProfiled ? 'Profile updated successfully' : 'Profile saved successfully' 
      });
      
      // Fetch related voters from the same family (only for new profiles)
      if (!isAlreadyProfiled) {
        await fetchRelatedVoters();
      }
      
      onSave({ ...voter, isProfiled: true });
    } catch (error) {
      console.error('Error saving profile:', error);
      toast({ type: 'error', description: 'Failed to save profile' });
    } finally {
      setSaving(false);
    }
  };

  const fetchRelatedVoters = async () => {
    try {
      // Fetch voters from the same family grouping who haven't been profiled
      const response = await fetch(
        `/api/field-visitor/related-voters?familyGrouping=${encodeURIComponent(voter.familyGrouping || '')}&epicNumber=${voter.epicNumber}`
      );
      
      if (response.ok) {
        const data = await response.json();
        if (data.voters && data.voters.length > 0) {
          setRelatedVoters(data.voters);
          setShowRelatedVotersPrompt(true);
        }
      }
    } catch (error) {
      console.error('Error fetching related voters:', error);
    }
  };

  const handleProfileRelatedVoter = (relatedVoter: Voter) => {
    // Pre-fill some fields from current voter
    setFormData({
      ...formData,
      education: '',
      occupationType: '',
      occupationDetail: '',
      isOurSupporter: false,
      feedback: '',
      influencerType: '',
      vehicleType: '',
      // Keep these fields the same
      region: formData.region,
      religion: formData.religion,
      caste: formData.caste,
    });
    
    setShowRelatedVotersPrompt(false);
    setRelatedVoters([]);
    onSave(relatedVoter); // This will load the related voter into the form
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Voter Info Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
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
            {isAlreadyProfiled ? (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 text-green-600 dark:text-green-400 rounded-md border border-green-500/20">
                <CheckCircle2 className="h-4 w-4" />
                <span className="text-sm font-medium">Already Profiled</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-md border border-amber-500/20">
                <Clock className="h-4 w-4" />
                <span className="text-sm font-medium">Pending Profile</span>
              </div>
            )}
          </div>
          {isAlreadyProfiled && voter.profiledAt && (
            <div className="text-xs text-muted-foreground mt-2">
              Last updated: {new Date(voter.profiledAt).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </div>
          )}
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
          <Select
            value={formData.region}
            onValueChange={(value) => setFormData({ ...formData, region: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select region or locality" />
            </SelectTrigger>
            <SelectContent>
              {REGION_OPTIONS.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Religion */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Star className="h-4 w-4" />
            Religion
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Select
            value={formData.religion}
            onValueChange={(value) => setFormData({ ...formData, religion: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select religion" />
            </SelectTrigger>
            <SelectContent>
              {RELIGION_OPTIONS.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Caste */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <User className="h-4 w-4" />
            Caste
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Select
            value={formData.caste}
            onValueChange={(value) => setFormData({ ...formData, caste: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select caste category" />
            </SelectTrigger>
            <SelectContent>
              {CASTE_OPTIONS.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="isOurSupporter"
              checked={formData.isOurSupporter}
              onChange={(e) => 
                setFormData({ ...formData, isOurSupporter: e.target.checked })
              }
            />
            <Label htmlFor="isOurSupporter" className="cursor-pointer">
              Is our supporter
            </Label>
          </div>

          {/* Feedback field when not a supporter */}
          {!formData.isOurSupporter && (
            <div className="space-y-2 pt-2 border-t">
              <Label htmlFor="feedback" className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Feedback / Reason
              </Label>
              <Textarea
                id="feedback"
                value={formData.feedback}
                onChange={(e) => setFormData({ ...formData, feedback: e.target.value })}
                placeholder="Why are they not a supporter? Any feedback or concerns..."
                rows={3}
              />
            </div>
          )}
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
            value={formData.influencerType || 'none'}
            onValueChange={(value) => setFormData({ ...formData, influencerType: value === 'none' ? '' : value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select if applicable" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Not an influencer</SelectItem>
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
            value={formData.vehicleType || 'none'}
            onValueChange={(value) => setFormData({ ...formData, vehicleType: value === 'none' ? '' : value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select if applicable" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No vehicle</SelectItem>
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
          {saving ? (isAlreadyProfiled ? 'Updating...' : 'Saving...') : (isAlreadyProfiled ? 'Update Profile' : 'Save Profile')}
        </Button>
      </div>

      {/* Related Voters Prompt */}
      {showRelatedVotersPrompt && relatedVoters.length > 0 && (
        <Card className="border-2 border-primary">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5" />
              Profile Related Voters
            </CardTitle>
            <CardDescription>
              Found {relatedVoters.length} related voter(s) from the same family who haven't been profiled yet.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {relatedVoters.map((relatedVoter) => (
              <div
                key={relatedVoter.epicNumber}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1">
                  <p className="font-medium">{relatedVoter.fullName}</p>
                  <p className="text-sm text-muted-foreground">
                    EPIC: {relatedVoter.epicNumber} | {relatedVoter.relationType}: {relatedVoter.relationName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {relatedVoter.age ? `Age: ${relatedVoter.age}` : ''} 
                    {relatedVoter.gender ? ` | ${relatedVoter.gender === 'M' ? 'Male' : relatedVoter.gender === 'F' ? 'Female' : relatedVoter.gender}` : ''}
                  </p>
                </div>
                <Button
                  type="button"
                  onClick={() => handleProfileRelatedVoter(relatedVoter)}
                  size="sm"
                >
                  Profile Now
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowRelatedVotersPrompt(false)}
              className="w-full"
            >
              Skip for Now
            </Button>
          </CardContent>
        </Card>
      )}
    </form>
  );
}
