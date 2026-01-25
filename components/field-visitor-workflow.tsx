'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { SidebarToggle } from '@/components/sidebar-toggle';
import { FieldVoterList } from '@/components/field-voter-list';
import { FieldProfilingForm } from '@/components/field-profiling-form';
import { FamilyProfilingDialog } from '@/components/family-profiling-dialog';
import { MapPin, Users, CheckCircle, Clock } from 'lucide-react';
import { toast } from '@/components/toast';

interface Assignment {
  id: string;
  boothNo: string;
  electionId: string;
  boothName: string | null;
  boothAddress: string | null;
}

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
  profiledAt: string | null;
}

interface Stats {
  total: number;
  profiled: number;
  pending: number;
}

export function FieldVisitorWorkflow() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedBooth, setSelectedBooth] = useState<string | null>(null);
  const [voters, setVoters] = useState<Voter[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, profiled: 0, pending: 0 });
  const [loading, setLoading] = useState(true);
  const [loadingVoters, setLoadingVoters] = useState(false);
  const [selectedVoter, setSelectedVoter] = useState<Voter | null>(null);
  const [showFamilyDialog, setShowFamilyDialog] = useState(false);
  const [profiledVoterForFamily, setProfiledVoterForFamily] = useState<Voter | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'profiled'>('all');
  const [electionId, setElectionId] = useState<string | null>(null);

  // Fetch user's assigned booths
  useEffect(() => {
    const fetchAssignments = async () => {
      try {
        const response = await fetch('/api/field-visitor/assignments');
        if (!response.ok) throw new Error('Failed to fetch assignments');
        
        const data = await response.json();
        setAssignments(data.assignments || []);
        setElectionId(data.electionId);
        
        if (data.assignments?.length > 0) {
          setSelectedBooth(data.assignments[0].boothNo);
        }
      } catch (error) {
        console.error('Error fetching assignments:', error);
        toast({ type: 'error', description: 'Failed to load booth assignments' });
      } finally {
        setLoading(false);
      }
    };

    fetchAssignments();
  }, []);

  // Fetch voters when booth is selected
  useEffect(() => {
    if (!selectedBooth || !electionId) return;

    const fetchVoters = async () => {
      setLoadingVoters(true);
      try {
        const profiledParam = filter === 'all' ? '' : `&profiled=${filter === 'profiled'}`;
        const response = await fetch(
          `/api/field-visitor/voters?boothNo=${selectedBooth}&electionId=${electionId}${profiledParam}`
        );
        if (!response.ok) throw new Error('Failed to fetch voters');
        
        const data = await response.json();
        setVoters(data.voters || []);
        setStats(data.stats || { total: 0, profiled: 0, pending: 0 });
      } catch (error) {
        console.error('Error fetching voters:', error);
        toast({ type: 'error', description: 'Failed to load voters' });
      } finally {
        setLoadingVoters(false);
      }
    };

    fetchVoters();
  }, [selectedBooth, electionId, filter]);

  const handleVoterSelect = (voter: Voter) => {
    setSelectedVoter(voter);
  };

  const handleProfileSaved = (voter: Voter) => {
    // Update voter in list
    setVoters(prev => prev.map(v => 
      v.epicNumber === voter.epicNumber 
        ? { ...v, isProfiled: true }
        : v
    ));
    
    // Update stats
    setStats(prev => ({
      ...prev,
      profiled: prev.profiled + 1,
      pending: prev.pending - 1,
    }));

    // Check if voter has family members
    if (voter.familyGrouping) {
      setProfiledVoterForFamily(voter);
      setShowFamilyDialog(true);
    }
    
    setSelectedVoter(null);
  };

  const handleFamilyDialogClose = () => {
    setShowFamilyDialog(false);
    setProfiledVoterForFamily(null);
  };

  const handleFamilyProfilesUpdated = (count: number) => {
    // Refresh voters list
    if (selectedBooth && electionId) {
      const profiledParam = filter === 'all' ? '' : `&profiled=${filter === 'profiled'}`;
      fetch(`/api/field-visitor/voters?boothNo=${selectedBooth}&electionId=${electionId}${profiledParam}`)
        .then(res => res.json())
        .then(data => {
          setVoters(data.voters || []);
          setStats(data.stats || { total: 0, profiled: 0, pending: 0 });
        });
    }
    
    toast({ type: 'success', description: `Updated ${count} family member profiles` });
    handleFamilyDialogClose();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading assignments...</p>
        </div>
      </div>
    );
  }

  if (assignments.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <SidebarToggle />
          <div>
            <h1 className="text-3xl font-bold">Field Visitor</h1>
            <p className="text-muted-foreground">Booth-level voter profiling</p>
          </div>
        </div>
        
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Booths Assigned</h3>
              <p className="text-muted-foreground">
                You have not been assigned any booth areas yet. Please contact your administrator.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If a voter is selected for profiling, show the form
  if (selectedVoter) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <SidebarToggle />
          <div>
            <h1 className="text-3xl font-bold">Voter Profiling</h1>
            <p className="text-muted-foreground">
              Booth {selectedBooth} - {selectedVoter.fullName}
            </p>
          </div>
        </div>
        
        <FieldProfilingForm
          voter={selectedVoter}
          onSave={handleProfileSaved}
          onCancel={() => setSelectedVoter(null)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <SidebarToggle />
          <div>
            <h1 className="text-3xl font-bold">Field Visitor</h1>
            <p className="text-muted-foreground">Booth-level voter profiling</p>
          </div>
        </div>
      </div>

      {/* Booth Selection and Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Select Booth</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedBooth || ''} onValueChange={setSelectedBooth}>
              <SelectTrigger>
                <SelectValue placeholder="Select booth" />
              </SelectTrigger>
              <SelectContent>
                {assignments.map((assignment) => (
                  <SelectItem key={assignment.id} value={assignment.boothNo}>
                    Part {assignment.boothNo}
                    {assignment.boothName && ` - ${assignment.boothName}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              Total Voters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Profiled
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.profiled}</div>
            <p className="text-xs text-muted-foreground">
              {stats.total > 0 ? Math.round((stats.profiled / stats.total) * 100) : 0}% complete
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-orange-500" />
              Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.pending}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Voter List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Voters</CardTitle>
              <CardDescription>
                {selectedBooth && `Part ${selectedBooth}`}
                {assignments.find(a => a.boothNo === selectedBooth)?.boothName && 
                  ` - ${assignments.find(a => a.boothNo === selectedBooth)?.boothName}`}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant={filter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('all')}
              >
                All
              </Button>
              <Button
                variant={filter === 'pending' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('pending')}
              >
                Pending
              </Button>
              <Button
                variant={filter === 'profiled' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('profiled')}
              >
                Profiled
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <FieldVoterList
            voters={voters}
            loading={loadingVoters}
            onVoterSelect={handleVoterSelect}
          />
        </CardContent>
      </Card>

      {/* Family Profiling Dialog */}
      {showFamilyDialog && profiledVoterForFamily && (
        <FamilyProfilingDialog
          voter={profiledVoterForFamily}
          open={showFamilyDialog}
          onClose={handleFamilyDialogClose}
          onProfilesUpdated={handleFamilyProfilesUpdated}
        />
      )}
    </div>
  );
}
