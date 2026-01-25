'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Search, User, CheckCircle, Clock, ChevronRight } from 'lucide-react';

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

interface FieldVoterListProps {
  voters: Voter[];
  loading: boolean;
  onVoterSelect: (voter: Voter) => void;
}

export function FieldVoterList({ voters, loading, onVoterSelect }: FieldVoterListProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredVoters = voters.filter(voter => {
    const search = searchTerm.toLowerCase();
    return (
      voter.fullName.toLowerCase().includes(search) ||
      voter.epicNumber.toLowerCase().includes(search) ||
      voter.srNo?.toLowerCase().includes(search) ||
      voter.houseNumber?.toLowerCase().includes(search)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Loading voters...</p>
        </div>
      </div>
    );
  }

  if (voters.length === 0) {
    return (
      <div className="text-center py-8">
        <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">No voters found</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, EPIC, serial no, or house no..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Voter List */}
      <div className="space-y-2 max-h-[500px] overflow-y-auto">
        {filteredVoters.map((voter) => (
          <button
            key={voter.epicNumber}
            type="button"
            onClick={() => onVoterSelect(voter)}
            className="w-full p-4 border rounded-lg hover:bg-muted/50 transition-colors text-left flex items-center justify-between group"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium truncate">{voter.fullName}</span>
                {voter.isProfiled ? (
                  <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-100">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Profiled
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                    <Clock className="h-3 w-3 mr-1" />
                    Pending
                  </Badge>
                )}
              </div>
              
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                {voter.srNo && (
                  <span>Sr: {voter.srNo}</span>
                )}
                <span className="font-mono text-xs">{voter.epicNumber}</span>
                {voter.age && voter.gender && (
                  <span>{voter.age}y, {voter.gender === 'M' ? 'Male' : voter.gender === 'F' ? 'Female' : voter.gender}</span>
                )}
                {voter.houseNumber && (
                  <span>H.No: {voter.houseNumber}</span>
                )}
              </div>

              {voter.relationType && voter.relationName && (
                <p className="text-xs text-muted-foreground mt-1">
                  {voter.relationType}: {voter.relationName}
                </p>
              )}

              {/* Show profile summary if profiled */}
              {voter.isProfiled && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {voter.education && (
                    <Badge variant="outline" className="text-xs">
                      {voter.education}
                    </Badge>
                  )}
                  {voter.occupationType && (
                    <Badge variant="outline" className="text-xs">
                      {voter.occupationType}
                    </Badge>
                  )}
                  {voter.isOurSupporter && (
                    <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700">
                      Supporter
                    </Badge>
                  )}
                  {voter.influencerType && (
                    <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700">
                      {voter.influencerType} influencer
                    </Badge>
                  )}
                  {voter.vehicleType && (
                    <Badge variant="outline" className="text-xs">
                      {voter.vehicleType === '2w' ? '2-Wheeler' : voter.vehicleType === '4w' ? '4-Wheeler' : 'Both'}
                    </Badge>
                  )}
                </div>
              )}
            </div>

            <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0 ml-2" />
          </button>
        ))}
      </div>

      {filteredVoters.length === 0 && searchTerm && (
        <div className="text-center py-4">
          <p className="text-muted-foreground">No voters match your search</p>
        </div>
      )}

      <div className="text-sm text-muted-foreground text-center pt-2">
        Showing {filteredVoters.length} of {voters.length} voters
      </div>
    </div>
  );
}
