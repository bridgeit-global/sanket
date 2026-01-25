'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Users, CheckCircle, Clock, Save, X } from 'lucide-react';
import { toast } from '@/components/toast';

interface Voter {
  epicNumber: string;
  fullName: string;
  relationType: string | null;
  relationName: string | null;
  familyGrouping: string | null;
  religion: string | null;
  caste: string | null;
  age: number | null;
  gender: string | null;
}

interface FamilyMember {
  epicNumber: string;
  fullName: string;
  relationType: string | null;
  relationName: string | null;
  familyGrouping: string | null;
  religion: string | null;
  caste: string | null;
  age: number | null;
  gender: string | null;
  isProfiled: boolean | null;
  education: string | null;
  occupationType: string | null;
  isOurSupporter: boolean | null;
  influencerType: string | null;
  vehicleType: string | null;
}

interface FamilyProfilingDialogProps {
  voter: Voter;
  open: boolean;
  onClose: () => void;
  onProfilesUpdated: (count: number) => void;
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

const VEHICLE_TYPES = [
  { value: '2w', label: '2-Wheeler' },
  { value: '4w', label: '4-Wheeler' },
  { value: 'both', label: 'Both' },
];

export function FamilyProfilingDialog({
  voter,
  open,
  onClose,
  onProfilesUpdated,
}: FamilyProfilingDialogProps) {
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
  const [memberProfiles, setMemberProfiles] = useState<Record<string, {
    education: string;
    occupationType: string;
    isOurSupporter: boolean;
    vehicleType: string;
  }>>({});

  useEffect(() => {
    if (!open) return;

    const fetchFamilyMembers = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/field-visitor/family?epicNumber=${voter.epicNumber}`);
        if (!response.ok) throw new Error('Failed to fetch family members');

        const data = await response.json();
        const members = data.familyMembers || [];
        setFamilyMembers(members);

        // Initialize profiles for unprofiled members
        const profiles: Record<string, any> = {};
        const selected = new Set<string>();
        
        members.forEach((member: FamilyMember) => {
          if (!member.isProfiled) {
            selected.add(member.epicNumber);
            profiles[member.epicNumber] = {
              education: '',
              occupationType: '',
              isOurSupporter: false,
              vehicleType: '',
            };
          }
        });

        setSelectedMembers(selected);
        setMemberProfiles(profiles);
      } catch (error) {
        console.error('Error fetching family members:', error);
        toast({ type: 'error', description: 'Failed to load family members' });
      } finally {
        setLoading(false);
      }
    };

    fetchFamilyMembers();
  }, [open, voter.epicNumber]);

  const handleMemberToggle = (epicNumber: string) => {
    setSelectedMembers((prev) => {
      const next = new Set(prev);
      if (next.has(epicNumber)) {
        next.delete(epicNumber);
      } else {
        next.add(epicNumber);
        // Initialize profile if not exists
        if (!memberProfiles[epicNumber]) {
          setMemberProfiles((profiles) => ({
            ...profiles,
            [epicNumber]: {
              education: '',
              occupationType: '',
              isOurSupporter: false,
              vehicleType: '',
            },
          }));
        }
      }
      return next;
    });
  };

  const handleProfileChange = (
    epicNumber: string,
    field: string,
    value: string | boolean
  ) => {
    setMemberProfiles((prev) => ({
      ...prev,
      [epicNumber]: {
        ...prev[epicNumber],
        [field]: value,
      },
    }));
  };

  const handleSave = async () => {
    if (selectedMembers.size === 0) {
      onClose();
      return;
    }

    setSaving(true);
    try {
      const membersToUpdate = Array.from(selectedMembers).map((epicNumber) => ({
        epicNumber,
        ...memberProfiles[epicNumber],
      }));

      const response = await fetch('/api/field-visitor/family', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ familyMembers: membersToUpdate }),
      });

      if (!response.ok) throw new Error('Failed to update family profiles');

      const data = await response.json();
      onProfilesUpdated(data.updatedCount || 0);
    } catch (error) {
      console.error('Error updating family profiles:', error);
      toast({ type: 'error', description: 'Failed to update family profiles' });
    } finally {
      setSaving(false);
    }
  };

  const unprofiledCount = familyMembers.filter((m) => !m.isProfiled).length;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Family Members
          </DialogTitle>
          <DialogDescription>
            Profile saved for {voter.fullName}. Would you like to update profiles for family members?
            <br />
            <span className="text-xs">
              Common fields (Religion: {voter.religion || 'N/A'}, Caste: {voter.caste || 'N/A'}) are inherited.
            </span>
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
          </div>
        ) : familyMembers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No other family members found
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              {unprofiledCount} of {familyMembers.length} family members need profiling
            </div>

            {familyMembers.map((member) => (
              <Card
                key={member.epicNumber}
                className={`transition-colors ${
                  selectedMembers.has(member.epicNumber) ? 'border-primary' : ''
                }`}
              >
                <CardContent className="pt-4">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={selectedMembers.has(member.epicNumber)}
                      onChange={() => handleMemberToggle(member.epicNumber)}
                      disabled={member.isProfiled === true}
                    />
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-medium">{member.fullName}</span>
                          {member.isProfiled ? (
                            <Badge variant="default" className="ml-2 bg-green-100 text-green-800">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Profiled
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="ml-2 bg-orange-100 text-orange-800">
                              <Clock className="h-3 w-3 mr-1" />
                              Pending
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {member.age && `${member.age}y`}
                          {member.gender && `, ${member.gender === 'M' ? 'M' : 'F'}`}
                        </span>
                      </div>

                      {selectedMembers.has(member.epicNumber) && !member.isProfiled && (
                        <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                          <div>
                            <Label className="text-xs">Education</Label>
                            <Select
                              value={memberProfiles[member.epicNumber]?.education || ''}
                              onValueChange={(value) =>
                                handleProfileChange(member.epicNumber, 'education', value)
                              }
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue placeholder="Select" />
                              </SelectTrigger>
                              <SelectContent>
                                {EDUCATION_OPTIONS.map((opt) => (
                                  <SelectItem key={opt} value={opt} className="text-xs">
                                    {opt}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Label className="text-xs">Occupation</Label>
                            <Select
                              value={memberProfiles[member.epicNumber]?.occupationType || ''}
                              onValueChange={(value) =>
                                handleProfileChange(member.epicNumber, 'occupationType', value)
                              }
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue placeholder="Select" />
                              </SelectTrigger>
                              <SelectContent>
                                {OCCUPATION_TYPES.map((opt) => (
                                  <SelectItem key={opt.value} value={opt.value} className="text-xs">
                                    {opt.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Label className="text-xs">Vehicle</Label>
                            <Select
                              value={memberProfiles[member.epicNumber]?.vehicleType || 'none'}
                              onValueChange={(value) =>
                                handleProfileChange(member.epicNumber, 'vehicleType', value === 'none' ? '' : value)
                              }
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue placeholder="Select" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none" className="text-xs">None</SelectItem>
                                {VEHICLE_TYPES.map((opt) => (
                                  <SelectItem key={opt.value} value={opt.value} className="text-xs">
                                    {opt.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="flex items-center gap-2 pt-4">
                            <Checkbox
                              id={`supporter-${member.epicNumber}`}
                              checked={memberProfiles[member.epicNumber]?.isOurSupporter || false}
                              onChange={(e) =>
                                handleProfileChange(member.epicNumber, 'isOurSupporter', e.target.checked)
                              }
                            />
                            <Label htmlFor={`supporter-${member.epicNumber}`} className="text-xs cursor-pointer">
                              Supporter
                            </Label>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            <X className="h-4 w-4 mr-2" />
            Skip
          </Button>
          <Button onClick={handleSave} disabled={saving || selectedMembers.size === 0}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : `Update ${selectedMembers.size} Member(s)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
