'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { BarChart3, Users, CheckCircle2, XCircle } from 'lucide-react';

interface VotingStats {
  totalVoters: number;
  voted: number;
  notVoted: number;
  votingPercentage: number;
}

export function VotingStatistics() {
  const [electionId, setElectionId] = useState('GE2024');
  const [acNo, setAcNo] = useState('');
  const [wardNo, setWardNo] = useState('');
  const [partNo, setPartNo] = useState('');
  const [stats, setStats] = useState<VotingStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchStats = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ electionId });
      if (acNo) params.append('acNo', acNo);
      if (wardNo) params.append('wardNo', wardNo);
      if (partNo) params.append('partNo', partNo);

      const response = await fetch(`/api/voting-participation/stats?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch statistics');
      }

      const data = await response.json();
      if (data.success) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error fetching statistics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [electionId, acNo, wardNo, partNo]);

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Select election and filters to view statistics</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="electionId">Election</Label>
            <Select value={electionId} onValueChange={setElectionId}>
              <SelectTrigger id="electionId">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="GE2024">General Election 2024</SelectItem>
                <SelectItem value="AE2024">Assembly Election 2024</SelectItem>
                <SelectItem value="LE2024">Local Election 2024</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="acNo">AC Number (Optional)</Label>
            <Input
              id="acNo"
              value={acNo}
              onChange={(e) => setAcNo(e.target.value)}
              placeholder="Filter by AC number"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="wardNo">Ward Number (Optional)</Label>
            <Input
              id="wardNo"
              value={wardNo}
              onChange={(e) => setWardNo(e.target.value)}
              placeholder="Filter by ward number"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="partNo">Part Number (Optional)</Label>
            <Input
              id="partNo"
              value={partNo}
              onChange={(e) => setPartNo(e.target.value)}
              placeholder="Filter by part number"
            />
          </div>

          <Button onClick={fetchStats} disabled={isLoading} className="w-full">
            Refresh Statistics
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Statistics</CardTitle>
          <CardDescription>Voting participation statistics</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading...</div>
          ) : stats ? (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="h-5 w-5 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Total Voters</span>
                  </div>
                  <p className="text-2xl font-bold">{stats.totalVoters.toLocaleString()}</p>
                </div>

                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <BarChart3 className="h-5 w-5 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Voting %</span>
                  </div>
                  <p className="text-2xl font-bold">{stats.votingPercentage.toFixed(2)}%</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg bg-green-50 dark:bg-green-950">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <span className="text-sm text-muted-foreground">Voted</span>
                  </div>
                  <p className="text-2xl font-bold text-green-600">{stats.voted.toLocaleString()}</p>
                </div>

                <div className="p-4 border rounded-lg bg-red-50 dark:bg-red-950">
                  <div className="flex items-center gap-2 mb-2">
                    <XCircle className="h-5 w-5 text-red-600" />
                    <span className="text-sm text-muted-foreground">Not Voted</span>
                  </div>
                  <p className="text-2xl font-bold text-red-600">{stats.notVoted.toLocaleString()}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No statistics available
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
