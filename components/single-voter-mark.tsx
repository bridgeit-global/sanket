'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/toast';
import { Search, CheckCircle2, XCircle } from 'lucide-react';
import type { VoterWithPartNo } from '@/lib/db/schema';

export function SingleVoterMark() {
  const [epicNumber, setEpicNumber] = useState('');
  const [electionId, setElectionId] = useState('172LS2024');
  const [hasVoted, setHasVoted] = useState<boolean | null>(null);
  const [notes, setNotes] = useState('');
  const [voter, setVoter] = useState<VoterWithPartNo | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isMarking, setIsMarking] = useState(false);

  const handleSearch = async () => {
    if (!epicNumber.trim()) {
      toast.error('Please enter an EPIC number');
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(`/api/voter/${encodeURIComponent(epicNumber)}`);
      if (!response.ok) {
        if (response.status === 404) {
          toast.error('Voter not found');
          setVoter(null);
        } else {
          throw new Error('Failed to fetch voter');
        }
        return;
      }

      const data = await response.json();
      if (data.success && data.voter) {
        setVoter(data.voter);
        // Check existing voting history
        const historyResponse = await fetch(
          `/api/voting-participation/history/${encodeURIComponent(epicNumber)}?electionId=${electionId}`
        );
        if (historyResponse.ok) {
          const historyData = await historyResponse.json();
          if (historyData.success && historyData.history.length > 0) {
            setHasVoted(historyData.history[0].hasVoted);
          }
        }
      }
    } catch (error) {
      console.error('Error searching voter:', error);
      toast.error('Failed to search voter');
    } finally {
      setIsSearching(false);
    }
  };

  const handleMarkVote = async () => {
    if (!voter || hasVoted === null) {
      toast.error('Please search for a voter and select voting status');
      return;
    }

    setIsMarking(true);
    try {
      const response = await fetch('/api/voting-participation/mark', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          epicNumber: voter.epicNumber,
          electionId,
          hasVoted,
          notes: notes.trim() || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to mark vote');
      }

      const data = await response.json();
      if (data.success) {
        toast.success(`Vote marked as ${hasVoted ? 'Voted' : 'Not Voted'}`);
        setNotes('');
      }
    } catch (error) {
      console.error('Error marking vote:', error);
      toast.error('Failed to mark vote');
    } finally {
      setIsMarking(false);
    }
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Search Voter</CardTitle>
          <CardDescription>Search by EPIC number to mark voting participation</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="epicNumber">EPIC Number</Label>
            <div className="flex gap-2">
              <Input
                id="epicNumber"
                value={epicNumber}
                onChange={(e) => setEpicNumber(e.target.value)}
                placeholder="Enter EPIC number"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSearch();
                  }
                }}
              />
              <Button onClick={handleSearch} disabled={isSearching}>
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="electionId">Election</Label>
            <Select value={electionId} onValueChange={setElectionId}>
              <SelectTrigger id="electionId">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="172LS2024">Lok Sabha 2024</SelectItem>
                <SelectItem value="AE2024">Assembly Election 2024</SelectItem>
                <SelectItem value="LE2024">Local Election 2024</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {voter && (
            <div className="p-4 border rounded-lg space-y-2">
              <p className="font-semibold">{voter.fullName}</p>
              <p className="text-sm text-muted-foreground">EPIC: {voter.epicNumber}</p>
              {voter.acNo && <p className="text-sm text-muted-foreground">AC: {voter.acNo}</p>}
              {voter.wardNo && <p className="text-sm text-muted-foreground">Ward: {voter.wardNo}</p>}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Mark Voting Status</CardTitle>
          <CardDescription>Mark whether the voter has voted or not</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Voting Status</Label>
            <div className="flex gap-2">
              <Button
                variant={hasVoted === true ? 'default' : 'outline'}
                onClick={() => setHasVoted(true)}
                className="flex-1"
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Voted
              </Button>
              <Button
                variant={hasVoted === false ? 'default' : 'outline'}
                onClick={() => setHasVoted(false)}
                className="flex-1"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Not Voted
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes about this voting record"
              rows={3}
            />
          </div>

          <Button
            onClick={handleMarkVote}
            disabled={!voter || hasVoted === null || isMarking}
            className="w-full"
          >
            {isMarking ? 'Marking...' : 'Mark Vote'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
